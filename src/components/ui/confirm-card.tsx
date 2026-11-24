"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { Modal, type ModalSize } from "./modal";

/** Bottom sheet on phones, centred box from 768px. Built on <Modal> (Esc, backdrop tap, focus).
 *  Closing it from the page (open → false) never calls onClose, so a sheet that hides behind a
 *  ConfirmCard is not closed for good. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Width from 768px (default md). */
  size?: ModalSize;
  /** Buttons pinned to the bottom of the sheet. */
  footer?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={footer}
      mobileSheet
    >
      {children}
    </Modal>
  );
}

/** Confirmation for actions the user cannot undo alone (reserve a plot, disable a user,
 *  move all leads). Shows the full details, and the confirm button names the action,
 *  for example "ยืนยันจองแปลง A7". Never label it "ตกลง". */
export function ConfirmCard({
  open,
  onClose,
  onConfirm,
  title,
  rows,
  consequence,
  confirmLabel,
  danger,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  rows: { label: string; value: ReactNode }[];
  consequence?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      mobileSheet
      footer={
        <div className="flex flex-col gap-2">
          <Button
            variant={danger ? "danger" : "primary"}
            icon={/ลบ/.test(confirmLabel) ? "delete" : undefined}
            full
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "กำลังบันทึก" : confirmLabel}
          </Button>
          <Button variant="secondary" full onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      }
    >
      <dl className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex justify-between gap-4 border-b border-line pb-2 text-sm"
          >
            <dt className="text-ink-soft">{r.label}</dt>
            <dd className="text-right font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      {consequence && (
        <p className="mt-3 text-sm text-ink-soft">{consequence}</p>
      )}
    </Modal>
  );
}
