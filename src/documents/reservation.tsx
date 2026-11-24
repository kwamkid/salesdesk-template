// SAMPLE reservation form (ใบจอง). The wording below is an example only, not a legal document.
//
// To use your company's own reservation form: open a new chat in Claude Code, attach your
// company's file (Word, PDF or a photo) and type:
//   "แปลงไฟล์นี้เป็นเอกสาร src/documents/reservation.tsx ตามรูปแบบเดิมของไฟล์นี้
//    ถ้อยคำต้องตรงต้นฉบับทุกตัวอักษร เติมเฉพาะช่องข้อมูล (ชื่อ เลขบัตร แปลง ราคา เงินจอง ...)"
// Claude keeps the text character for character and only puts <Slot> where a value goes.
// Keep key "reservation" and prefix "RS" unless you also change Settings > documents per stage.
// Have the company's legal adviser check the wording before using it with customers.

import { COMMON_FIELDS, DocHead, Line, Signature, Slot } from "./parts";
import type { DocTemplate } from "./types";

export const reservation: DocTemplate = {
  key: "reservation",
  title: "ใบจอง",
  prefix: "RS",
  paper: "A4",
  fields: [
    ...COMMON_FIELDS,
    { key: "national_id", label: "เลขบัตรประชาชน", source: "lead.national_id", required: true },
    { key: "reserve_money", label: "เงินจอง (บาท)", required: true },
    { key: "payment_method", label: "ชำระเงินจองโดย" },
    { key: "contract_money", label: "เงินทำสัญญา (บาท)" },
    { key: "contract_due", label: "นัดทำสัญญาภายในวันที่" },
  ],
  Body: function ReservationBody({ v }) {
    return (
      <div className="flex flex-col gap-4">
        <DocHead v={v} title="ใบจองบ้านพร้อมที่ดิน (ตัวอย่าง)" />

        <p>
          ข้าพเจ้า <Slot v={v} k="customer_name" w="lg" /> เลขประจำตัวประชาชน <Slot v={v} k="national_id" w="lg" />
        </p>
        <p>
          ที่อยู่ <Slot v={v} k="customer_address" w="xl" /> โทรศัพท์ <Slot v={v} k="customer_phone" />
        </p>
        <p>ซึ่งต่อไปนี้เรียกว่า &quot;ผู้จอง&quot; มีความประสงค์จะจองบ้านพร้อมที่ดินในโครงการตามรายละเอียดดังนี้</p>

        <section className="flex flex-col gap-1">
          <Line label="โครงการ">
            <Slot v={v} k="project_name" w="lg" />
          </Line>
          <Line label="แปลงเลขที่">
            <Slot v={v} k="plot_code" w="sm" /> <span className="text-ink-soft">โซน</span> <Slot v={v} k="zone" w="sm" />
          </Line>
          <Line label="แบบบ้าน">
            <Slot v={v} k="house_type" />
          </Line>
          <Line label="เนื้อที่ดินประมาณ">
            <Slot v={v} k="land_sqw" w="sm" /> ตารางวา · พื้นที่ใช้สอยประมาณ <Slot v={v} k="usable_sqm" w="sm" /> ตารางเมตร
          </Line>
          <Line label="ราคาบ้านพร้อมที่ดิน">
            <Slot v={v} k="price" /> บาท
          </Line>
        </section>

        <section className="flex flex-col gap-1">
          <p>
            ผู้จองได้ชำระเงินจองเป็นจำนวน <Slot v={v} k="reserve_money" /> บาท ชำระโดย <Slot v={v} k="payment_method" />
          </p>
          <p>
            และจะชำระเงินทำสัญญาจำนวน <Slot v={v} k="contract_money" /> บาท พร้อมทำสัญญาจะซื้อจะขายภายในวันที่{" "}
            <Slot v={v} k="contract_due" />
          </p>
        </section>

        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">เงื่อนไขการจอง</h3>
          <p>1. หากผู้จองไม่มาทำสัญญาภายในวันที่กำหนด บริษัทมีสิทธิ์ยกเลิกการจองและริบเงินจองทั้งหมด</p>
          <p>2. เงินจองเป็นส่วนหนึ่งของราคาบ้านพร้อมที่ดิน และไม่สามารถโอนสิทธิ์การจองให้ผู้อื่นได้ เว้นแต่บริษัทยินยอมเป็นลายลักษณ์อักษร</p>
          <p>3. ผู้จองได้อ่านและเข้าใจเงื่อนไขทั้งหมดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน</p>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <Signature name={v.customer_name} role="ผู้จอง" />
          <Signature name={v.sales_name} role="พนักงานขาย ผู้รับจอง" />
        </div>
      </div>
    );
  },
};
