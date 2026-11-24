// SAMPLE quotation (ใบเสนอราคา). The wording below is an example only.
//
// To use your company's own quotation: open a new chat in Claude Code, attach your company's
// file (Word, PDF or a photo) and type:
//   "แปลงไฟล์นี้เป็นเอกสาร src/documents/quotation.tsx ตามรูปแบบเดิมของไฟล์นี้
//    ถ้อยคำต้องตรงต้นฉบับทุกตัวอักษร เติมเฉพาะช่องข้อมูล (ชื่อ เบอร์ แปลง ราคา ...)"
// Claude keeps the text character for character and only puts <Slot> where a value goes.
// Keep key "quotation" and prefix "QT" unless you also change Settings > documents per stage.
// Have the company check the final wording before using it with customers.

import { COMMON_FIELDS, DocHead, Line, Signature, Slot } from "./parts";
import type { DocTemplate } from "./types";

export const quotation: DocTemplate = {
  key: "quotation",
  title: "ใบเสนอราคา",
  prefix: "QT",
  paper: "A4",
  fields: [
    ...COMMON_FIELDS,
    { key: "discount", label: "ส่วนลด (บาท)" },
    { key: "net_price", label: "ราคาสุทธิ (บาท)" },
    { key: "reserve_money", label: "เงินจอง (บาท)" },
    { key: "contract_money", label: "เงินทำสัญญา (บาท)" },
    { key: "remark", label: "หมายเหตุ" },
  ],
  Body: function QuotationBody({ v }) {
    return (
      <div className="flex flex-col gap-4">
        <DocHead v={v} title="ใบเสนอราคา (ตัวอย่าง)" />

        <section className="flex flex-col gap-1">
          <h3 className="font-semibold">ข้อมูลลูกค้า</h3>
          <Line label="ชื่อลูกค้า">
            <Slot v={v} k="customer_name" w="lg" />
          </Line>
          <Line label="โทรศัพท์">
            <Slot v={v} k="customer_phone" />
          </Line>
          <Line label="ที่อยู่">
            <Slot v={v} k="customer_address" w="xl" />
          </Line>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="font-semibold">รายละเอียดบ้านและที่ดิน</h3>
          <Line label="โครงการ">
            <Slot v={v} k="project_name" w="lg" />
          </Line>
          <Line label="แปลงเลขที่">
            <Slot v={v} k="plot_code" w="sm" /> <span className="text-ink-soft">โซน</span> <Slot v={v} k="zone" w="sm" />
          </Line>
          <Line label="แบบบ้าน">
            <Slot v={v} k="house_type" />
          </Line>
          <Line label="เนื้อที่ดิน">
            <Slot v={v} k="land_sqw" w="sm" /> ตารางวา · พื้นที่ใช้สอย <Slot v={v} k="usable_sqm" w="sm" /> ตารางเมตร
          </Line>
        </section>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-line">
              <td className="py-2">ราคาขาย</td>
              <td className="py-2 text-right">
                <Slot v={v} k="price" /> บาท
              </td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2">ส่วนลด</td>
              <td className="py-2 text-right">
                <Slot v={v} k="discount" /> บาท
              </td>
            </tr>
            <tr className="border-b border-ink font-semibold">
              <td className="py-2">ราคาสุทธิ</td>
              <td className="py-2 text-right">
                <Slot v={v} k="net_price" /> บาท
              </td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2">เงินจอง</td>
              <td className="py-2 text-right">
                <Slot v={v} k="reserve_money" /> บาท
              </td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2">เงินทำสัญญา</td>
              <td className="py-2 text-right">
                <Slot v={v} k="contract_money" /> บาท
              </td>
            </tr>
          </tbody>
        </table>

        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">เงื่อนไข</h3>
          <p>1. ราคานี้ยืนราคา 30 วันนับจากวันที่ในใบเสนอราคา</p>
          <p>2. ราคารวมค่าบ้านและที่ดินตามแบบมาตรฐานของโครงการ ไม่รวมค่าใช้จ่ายในการโอนกรรมสิทธิ์</p>
          <p>3. บริษัทขอสงวนสิทธิ์เปลี่ยนแปลงราคาและโปรโมชันโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>
          <p>
            หมายเหตุ <Slot v={v} k="remark" w="xl" />
          </p>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <Signature name={v.customer_name} role="ลูกค้า" />
          <Signature name={v.sales_name} role="พนักงานขาย" />
        </div>
      </div>
    );
  },
};
