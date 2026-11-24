"use client";

import { useState } from "react";
import { saveMetaIds, saveMetaToken, testMeta } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, SectionTitle } from "@/components/ui/card";
import { MetaIcon } from "@/lib/icons";
import { Field, Input } from "@/components/ui/field";
import { HelpHint } from "@/components/ui/help-hint";
import { useSave } from "./use-save";

/** Pixel ID, test code and the Conversions API token. The saved token never comes back to
 *  the browser; the page only knows whether one is saved. */
export function MetaForm({
  initial,
  tokenSaved,
}: {
  initial: { pixel_id: string; test_event_code: string };
  tokenSaved: boolean;
}) {
  const [ids, setIds] = useState(initial);
  const [token, setToken] = useState("");
  const idsSave = useSave();
  const tokenSave = useSave();
  const test = useSave();

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={MetaIcon}
        tone="info"
        title={
          <>
            Meta (Conversions API)
            <HelpHint>
              ช่องทางที่เซิร์ฟเวอร์ส่งเหตุการณ์ (เช่น ลีดคุณภาพ มาชม จอง) ไปให้ Meta โดยตรง ไม่ต้องพึ่ง Pixel บนเว็บ
              โฆษณาจึงเรียนรู้จากลูกค้าที่ซื้อจริง
            </HelpHint>
          </>
        }
        action={<Badge tone={tokenSaved ? "ok" : "neutral"}>{tokenSaved ? "บันทึก token แล้ว" : "ยังไม่มี token"}</Badge>}
      />
      <p className="text-sm text-ink-soft">
        ระบบส่งขั้นของลูกค้าไปให้ Meta เบื้องหลัง เพื่อให้โฆษณาหาคนแบบลูกค้าที่ซื้อจริง ส่งเบอร์และอีเมลแบบเข้ารหัส ไม่ส่งเลขบัตรประชาชน
      </p>

      {idsSave.result && <Notice tone={idsSave.result.ok ? "ok" : "danger"}>{idsSave.result.message}</Notice>}
      <Field label="Pixel ID (Dataset ID)" hint="Events Manager > เลือก Pixel ของบริษัท > ตัวเลขใต้ชื่อ Pixel">
        <Input inputMode="numeric" value={ids.pixel_id} onChange={(e) => setIds({ ...ids, pixel_id: e.target.value })} />
      </Field>
      <Field
        label="รหัสทดสอบ (Test event code)"
        hint="Events Manager > Test events > ทดสอบ server events จะเห็นรหัสเช่น TEST12345 · ใส่ไว้ระหว่างทดสอบ แล้วลบออกเมื่อใช้งานจริง (มีรหัสอยู่ event จะไปอยู่ใน Test events เท่านั้น)"
      >
        <Input value={ids.test_event_code} onChange={(e) => setIds({ ...ids, test_event_code: e.target.value })} />
      </Field>
      <Button full variant="secondary" disabled={idsSave.busy} onClick={() => idsSave.run(() => saveMetaIds(ids))}>
        {idsSave.busy ? "กำลังบันทึก" : "บันทึก Pixel ID และรหัสทดสอบ"}
      </Button>

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        {tokenSave.result && <Notice tone={tokenSave.result.ok ? "ok" : "danger"}>{tokenSave.result.message}</Notice>}
        <Field
          label="Access token ของ Conversions API"
          hint={tokenSaved ? "บันทึก token แล้ว ระบบไม่แสดง token เดิม ใส่ใหม่เฉพาะเมื่อต้องการเปลี่ยน" : "วาง token แล้วกดบันทึก"}
        >
          <Input
            type="password"
            autoComplete="off"
            value={token}
            placeholder={tokenSaved ? "••••••••••••" : ""}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        <Button
          full
          variant="secondary"
          disabled={!token.trim() || tokenSave.busy}
          onClick={() => tokenSave.run(() => saveMetaToken(token), (r) => r.ok && setToken(""))}
        >
          {tokenSave.busy ? "กำลังบันทึก" : tokenSaved ? "เปลี่ยน token" : "บันทึก token"}
        </Button>
        <p className="flex items-center text-sm text-ink-soft">
          token เก็บที่เซิร์ฟเวอร์เท่านั้น
          <HelpHint>หลังบันทึก ระบบจะไม่ส่ง token กลับมาที่เบราว์เซอร์อีก ใครเปิดหน้านี้ก็ไม่เห็น token เดิม</HelpHint>
        </p>
        <details className="text-sm text-ink-soft">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-ink">วิธีสร้าง token</summary>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li>
              เปิด{" "}
              <a className="link" href="https://business.facebook.com/events_manager2" target="_blank" rel="noreferrer">
                Events Manager
              </a>{" "}
              ด้วยบัญชีที่เป็นผู้ดูแล Business ของบริษัท
            </li>
            <li>เลือก Pixel (Dataset) ของบริษัททางซ้าย แล้วกดแท็บ Settings (การตั้งค่า)</li>
            <li>เลื่อนลงไปที่หัวข้อ Conversions API แล้วกด Generate access token (สร้างโทเค็นการเข้าถึง)</li>
            <li>คัดลอก token ทั้งชุดมาวางในช่องด้านบน แล้วกดบันทึก token (Meta แสดง token ครั้งเดียว)</li>
          </ol>
        </details>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        {test.result && <Notice tone={test.result.ok ? "ok" : "danger"}>{test.result.message}</Notice>}
        <Button full disabled={test.busy} onClick={() => test.run(() => testMeta())}>
          {test.busy ? "กำลังส่ง" : "ทดสอบส่ง"}
        </Button>
        <p className="text-sm text-ink-soft">
          เปิด Events Manager &gt; Test events (เลือก Website) ค้างไว้ก่อน แล้วกดปุ่มนี้ จะเห็น Lead ขึ้นในหน้านั้น
          <HelpHint align="end">event คือ &quot;เหตุการณ์&quot; ที่ส่งไปบอก Meta เช่น Lead · Schedule · Purchase (ชื่อมาตรฐานของ Meta มีคอลัมน์ให้ดูใน Ads Manager) ชื่อที่ใช้กับแต่ละขั้นตั้งได้ในหน้าโครงการ</HelpHint>
        </p>
      </div>
    </Card>
  );
}
