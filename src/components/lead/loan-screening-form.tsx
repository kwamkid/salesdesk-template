"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { HelpHint } from "@/components/ui/help-hint";
import { LOAN_STATUS, type LoanStatus } from "@/config/activities";
import { baht, thDateTime } from "@/lib/format";

export type LoanRow = {
  status: LoanStatus;
  occupation: string;
  monthly_income: number | null;
  monthly_debt: number | null;
  wanted_amount: number | null;
  bank: string;
  approved_amount: number | null;
  fail_reason: string;
  updated_at: string;
  updated_by_name: string;
};

export type LoanInput = {
  status: LoanStatus;
  occupation: string;
  monthly_income: string;
  monthly_debt: string;
  wanted_amount: string;
  bank: string;
  approved_amount: string;
  fail_reason: string;
};

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const toNum = (s: string) => {
  const n = Number(s.replace(/,/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};

/** Debt-to-income in percent, or null when income is unknown. */
/** One-line explanation of DTI for the ⓘ next to it. */
const DTI_HINT = "หนี้ต่อรายได้ (DTI) = ภาระหนี้ต่อเดือน ÷ รายได้ต่อเดือน × 100 · ธนาคารส่วนใหญ่อยากเห็นไม่เกินประมาณ 40%";

const dti = (income: number | null, debt: number | null) => (income && income > 0 && debt !== null ? (debt / income) * 100 : null);

export function LoanScreeningForm({
  row,
  editable,
  save,
}: {
  row: LoanRow | null;
  editable: boolean;
  save: (input: LoanInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [v, setV] = useState<LoanInput>({
    status: row?.status ?? "not_screened",
    occupation: row?.occupation ?? "",
    monthly_income: str(row?.monthly_income),
    monthly_debt: str(row?.monthly_debt),
    wanted_amount: str(row?.wanted_amount),
    bank: row?.bank ?? "",
    approved_amount: str(row?.approved_amount),
    fail_reason: row?.fail_reason ?? "",
  });
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, start] = useTransition();

  const status = LOAN_STATUS.find((s) => s.key === (row?.status ?? "not_screened")) ?? LOAN_STATUS[0];
  const set = (k: keyof LoanInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const ratio = dti(toNum(v.monthly_income), toNum(v.monthly_debt));
  const needReason = v.status === "rejected" && !v.fail_reason.trim();

  const submit = () =>
    start(async () => {
      const res = await save(v);
      setMsg(res.ok ? { tone: "ok", text: "บันทึกผลคัดกรองแล้ว" } : { tone: "danger", text: res.error ?? "บันทึกไม่สำเร็จ" });
    });

  const updated = row ? `แก้ล่าสุด ${thDateTime(row.updated_at)}${row.updated_by_name ? ` โดย ${row.updated_by_name}` : ""}` : "ยังไม่เคยบันทึก";

  if (!editable) {
    const savedRatio = dti(row?.monthly_income ?? null, row?.monthly_debt ?? null);
    const items: [string, string][] = [
      ["อาชีพ", row?.occupation || "-"],
      ["รายได้ต่อเดือน", baht(row?.monthly_income)],
      ["ภาระหนี้ต่อเดือน", baht(row?.monthly_debt)],
      ["หนี้ต่อรายได้", savedRatio === null ? "-" : `${savedRatio.toFixed(0)}%`],
      ["วงเงินที่ต้องการ", baht(row?.wanted_amount)],
      ["ธนาคาร", row?.bank || "-"],
      ["วงเงินที่อนุมัติ", baht(row?.approved_amount)],
    ];
    if (row?.status === "rejected") items.push(["เหตุผลที่ไม่ผ่าน", row.fail_reason || "-"]);
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">คัดกรองสินเชื่อ</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <dl className="flex flex-col gap-2">
          {items.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="flex items-center text-ink-soft">
                {label}
                {label === "หนี้ต่อรายได้" && <HelpHint ariaLabel="หนี้ต่อรายได้คืออะไร">{DTI_HINT}</HelpHint>}
              </dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-ink-soft">{updated}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">คัดกรองสินเชื่อ</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Field label="สถานะ">
        <Select value={v.status} onChange={set("status")}>
          {LOAN_STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="อาชีพ">
        <Input value={v.occupation} onChange={set("occupation")} placeholder="เช่น พนักงานบริษัท ค้าขาย" />
      </Field>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <Field label="รายได้ต่อเดือน (บาท)">
          <Input inputMode="decimal" value={v.monthly_income} onChange={set("monthly_income")} />
        </Field>
        <div className="flex flex-col gap-1">
          <Field label="ภาระหนี้ต่อเดือน (บาท)">
            <Input inputMode="decimal" value={v.monthly_debt} onChange={set("monthly_debt")} />
          </Field>
          {/* Outside the Field label: a tap on the ⓘ must not focus the input */}
          <p className="flex items-center text-sm text-ink-soft">
            {ratio === null ? "ใส่รายได้และหนี้เพื่อดูสัดส่วนหนี้ต่อรายได้" : `หนี้ต่อรายได้ (DTI) ${ratio.toFixed(0)}%`}
            <HelpHint ariaLabel="หนี้ต่อรายได้คืออะไร">{DTI_HINT}</HelpHint>
          </p>
        </div>
        <Field label="วงเงินที่ต้องการกู้ (บาท)">
          <Input inputMode="decimal" value={v.wanted_amount} onChange={set("wanted_amount")} />
        </Field>
        <Field label="ธนาคาร">
          <Input value={v.bank} onChange={set("bank")} />
        </Field>
        <Field label="วงเงินที่อนุมัติ (บาท)">
          <Input inputMode="decimal" value={v.approved_amount} onChange={set("approved_amount")} />
        </Field>
      </div>
      {v.status === "rejected" && (
        <Field label="เหตุผลที่ไม่ผ่าน" required error={needReason ? "ต้องใส่เหตุผลเมื่อสถานะเป็นไม่ผ่าน" : undefined}>
          <Textarea value={v.fail_reason} onChange={set("fail_reason")} />
        </Field>
      )}
      <Button full disabled={busy || needReason} onClick={submit}>
        {busy ? "กำลังบันทึก" : "บันทึกผลคัดกรอง"}
      </Button>
      <p className="text-xs text-ink-soft">{updated}</p>
    </Card>
  );
}
