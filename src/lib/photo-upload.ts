"use client";
// Client only. Shrinks a photo in the browser and uploads it in the background.
// Pending uploads are kept in IndexedDB, so a photo taken just before the phone is locked
// is uploaded the next time the app opens (iPhone stops web apps in the background).
//
//   enqueueVisitPhoto({ leadId, activityId, blob })  -> saved, then uploaded with retries
//   runUploadQueue()                                  -> called on app start, when back online, on a timer
//   usePendingUploads()                               -> activity ids still uploading (for "กำลังอัปโหลดรูป")

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "visit-photos";
const MAX_SIDE = 1600;
const TARGET_BYTES = 300 * 1024;

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Older Safari: fall back to an <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
  );

/** Long side at most 1600px, JPEG, quality lowered step by step until about 300KB. */
export async function resizePhoto(file: Blob): Promise<Blob> {
  const img = await decode(file);
  const w0 = "naturalWidth" in img ? img.naturalWidth : img.width;
  const h0 = "naturalHeight" in img ? img.naturalHeight : img.height;
  let scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  let out: Blob | null = null;

  for (let round = 0; round < 4; round++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas not available");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
      out = await toJpeg(canvas, q);
      if (out.size <= TARGET_BYTES) break;
    }
    if (out && out.size <= TARGET_BYTES) break;
    scale *= 0.8; // still too big at the lowest quality: make it smaller
  }
  if ("close" in img) img.close();
  return out!;
}

// ---------------------------------------------------------------------------
// Queue storage (IndexedDB, with an in-memory fallback for private browsing)
// ---------------------------------------------------------------------------
export type QueuedPhoto = {
  activityId: string;
  leadId: string;
  blob: Blob;
  attempts: number;
  nextTryAt: number;
};

const DB_NAME = "salesdesk-uploads";
const STORE = "photos";
const memory = new Map<string, QueuedPhoto>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "activityId" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const r = run(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function saveItem(item: QueuedPhoto) {
  memory.set(item.activityId, item);
  try {
    await tx("readwrite", (s) => s.put(item));
  } catch {
    // Storage full or blocked: the in-memory copy still uploads while the app is open.
  }
}

async function removeItem(activityId: string) {
  memory.delete(activityId);
  try {
    await tx("readwrite", (s) => s.delete(activityId));
  } catch {}
}

async function allItems(): Promise<QueuedPhoto[]> {
  try {
    const stored = (await tx<QueuedPhoto[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedPhoto[]>)) ?? [];
    for (const item of stored) if (!memory.has(item.activityId)) memory.set(item.activityId, item);
  } catch {}
  return [...memory.values()];
}

// ---------------------------------------------------------------------------
// Pending list for the UI
// ---------------------------------------------------------------------------
let pending: string[] = [];
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

function publish() {
  pending = [...memory.keys()].sort();
  listeners.forEach((l) => l());
}

/** Activity ids whose photo is still uploading. */
export function usePendingUploads(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pending,
    () => EMPTY,
  );
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
const backoff = (attempts: number) => Math.min(15 * 60_000, 5_000 * 2 ** attempts); // 10s, 20s, 40s ... 15 min
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(items: QueuedPhoto[]) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!items.length) return;
  const wait = Math.max(1_000, Math.min(...items.map((i) => i.nextTryAt)) - Date.now());
  timer = setTimeout(() => void runUploadQueue(), wait);
}

async function uploadOne(item: QueuedPhoto) {
  const supabase = createClient();
  const path = `${item.leadId}/${item.activityId}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, item.blob, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
  // A retry after a lost answer finds the file already there: that is fine, attach it.
  if (upErr && !/exists|duplicate|409/i.test(`${upErr.message} ${(upErr as { statusCode?: string }).statusCode ?? ""}`)) {
    throw upErr;
  }
  const { error: rpcErr } = await supabase.rpc("attach_activity_photo", { p_activity: item.activityId, p_path: path });
  if (rpcErr) throw rpcErr;
}

/** Upload everything that is due. Safe to call often: only one run at a time. */
export async function runUploadQueue() {
  if (running || typeof window === "undefined") return;
  running = true;
  try {
    const items = await allItems();
    publish();
    if (typeof navigator !== "undefined" && navigator.onLine === false) return schedule(items);

    for (const item of items.filter((i) => i.nextTryAt <= Date.now())) {
      try {
        await uploadOne(item);
        await removeItem(item.activityId);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (/not allowed|row-level security|unauthorized/i.test(message) && item.attempts >= 3) {
          // The lead was moved to someone else: retrying will never work.
          console.error("[photo-upload] giving up", item.activityId, message);
          await removeItem(item.activityId);
        } else {
          await saveItem({ ...item, attempts: item.attempts + 1, nextTryAt: Date.now() + backoff(item.attempts + 1) });
        }
      }
      publish();
    }
    schedule([...memory.values()]);
  } finally {
    running = false;
  }
}

/** Keep the photo on this phone and start uploading it. Returns at once. */
export async function enqueueVisitPhoto(input: { leadId: string; activityId: string; blob: Blob }) {
  await saveItem({ ...input, attempts: 0, nextTryAt: 0 });
  publish();
  void runUploadQueue();
}
