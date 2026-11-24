"use client";

import { useState } from "react";
import { saveCompany } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, Notice, SectionTitle } from "@/components/ui/card";
import { CompanyIcon } from "@/lib/icons";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useSave } from "./use-save";

export type Company = { name: string; address: string; phone: string; tax_id: string };

/** Company details printed on the header of every document. */
export function CompanyForm({ initial }: { initial: Company }) {
  const [v, setV] = useState(initial);
  const { result, busy, run } = useSave();

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon={CompanyIcon}
        tone="brand"
        title="ข้อมูลบริษัท"
        sub="ใช้เป็นหัวกระดาษของใบเสนอราคา ใบจอง และเอกสารอื่น"
      />
      {result && <Notice tone={result.ok ? "ok" : "danger"}>{result.message}</Notice>}
      <Field label="ชื่อบริษัท">
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field label="ที่อยู่">
        <Textarea value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
      </Field>
      <Field label="โทรศัพท์">
        <Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      </Field>
      <Field label="เลขประจำตัวผู้เสียภาษี">
        <Input inputMode="numeric" value={v.tax_id} onChange={(e) => setV({ ...v, tax_id: e.target.value })} />
      </Field>
      <Button full disabled={busy} onClick={() => run(() => saveCompany(v))}>
        {busy ? "กำลังบันทึก" : "บันทึกข้อมูลบริษัท"}
      </Button>
    </Card>
  );
}
