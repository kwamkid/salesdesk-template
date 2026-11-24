"use client";

import Link from "next/link";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { getDocument } from "@/documents";
import { issueDocument } from "./actions";

/** Review screen: the filled document, an edit panel for this print only, and the print button. */
export function DocumentReview({
  leadId,
  docKey,
  initial,
  canIssue,
  blockedReason,
}: {
  leadId: string;
  docKey: string;
  initial: Record<string, string>;
  canIssue: boolean;
  blockedReason?: string;
}) {
  const doc = getDocument(docKey)!;
  const [values, setValues] = useState(initial);
  const [docNo, setDocNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const missing = doc.fields.filter((f) => f.required && !values[f.key]?.trim());
  const Body = doc.Body;

  const issueAndPrint = async () => {
    setBusy(true);
    setError("");
    const res = await issueDocument({ leadId, docKey, values });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Put the number on the paper before the print dialog takes its snapshot
    flushSync(() => setDocNo(res.docNo));
    window.print();
  };

  return (
    <div className="doc-print-root flex flex-col gap-4">
      <div className="no-print flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{doc.title}</h1>
          <Link href={`/leads/${leadId}`} className={buttonClass("secondary")}>
            กลับหน้าลูกค้า
          </Link>
        </div>
        {blockedReason && <Notice tone="warn">{blockedReason}</Notice>}
        {missing.length > 0 && (
          <Notice tone="warn">
            ยังว่าง {missing.length} ช่องที่ควรกรอก: {missing.map((f) => f.label).join(" · ")} (ช่องสีเหลืองในเอกสาร)
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
        {docNo && <Notice tone="ok">ออกเลขที่ {docNo} แล้ว ถ้าหน้าต่างพิมพ์ไม่ขึ้น กด &quot;พิมพ์อีกครั้ง&quot;</Notice>}
      </div>

      <article className="doc-paper rounded-card border border-line bg-surface p-4 text-ink md:p-8">
        <Body v={{ ...values, doc_no: docNo }} />
      </article>

      <div className="no-print flex flex-col gap-2">
        {!docNo ? (
          <Button full disabled={!canIssue || busy} onClick={issueAndPrint}>
            {busy ? "กำลังออกเลขเอกสาร" : "พิมพ์ / บันทึก PDF"}
          </Button>
        ) : (
          <>
            <Button full onClick={() => window.print()}>
              พิมพ์อีกครั้ง (เลข {docNo})
            </Button>
            <Button full variant="secondary" onClick={() => setDocNo("")}>
              แก้ข้อมูลแล้วออกฉบับใหม่
            </Button>
          </>
        )}
        <p className="text-sm text-ink-soft">
          กดแล้วระบบออกเลขเอกสารและเก็บประวัติ จากนั้นเลือกเครื่องพิมพ์ หรือเลือก &quot;บันทึกเป็น PDF&quot; ในหน้าต่างพิมพ์
        </p>
      </div>

      <Card className="no-print flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">แก้ข้อมูลก่อนพิมพ์</h2>
          <p className="text-sm text-ink-soft">แก้ที่นี่ใช้กับการพิมพ์ครั้งนี้เท่านั้น ไม่เปลี่ยนข้อมูลลูกค้าในระบบ</p>
        </div>
        {doc.fields.map((f) => (
          <Field key={f.key} label={f.label} required={f.required}>
            <Input
              value={values[f.key] ?? ""}
              disabled={!!docNo}
              className={f.required && !values[f.key]?.trim() ? "border-warn bg-warn-soft" : ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </Field>
        ))}
      </Card>
    </div>
  );
}
