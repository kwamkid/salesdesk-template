# SalesDesk — ระบบงานขายบ้านจัดสรร (template สำหรับคอร์ส)

ระบบติดตามลูกค้าและงานขาย ใช้ได้หลายโครงการ: ลีดและการตามงาน · ผังโครงการและสถานะแปลงแบบเรียลไทม์ · ออกเอกสาร · ส่งข้อมูลกลับ Meta · dashboard และ Export · แจ้งเตือนบนมือถือ

ใช้ของฟรีทั้งหมด: Next.js บน Vercel · Supabase · cron-job.org — ไม่มีค่า AI ในตัวระบบ

## เริ่มใช้ (ทำตามลำดับ)

| ขั้น | ทำอะไร | คู่มือ |
|---|---|---|
| 1 | เปิด VS Code → แผง Claude Code → พิมพ์ "ดึง repo <ลิงก์ template นี้> มาไว้ที่ 10-Project/salesdesk แล้วสร้าง repo ของฉันบน GitHub แบบ Private" → เสร็จแล้ว File > Open Folder โฟลเดอร์นั้น แล้วเริ่มแชตใหม่ | — |
| 2 | สร้างฐานข้อมูล Supabase + ใส่กุญแจใน `.env.local` | [docs/guides/supabase.md](docs/guides/supabase.md) |
| 3 | รันในเครื่อง `npm install` แล้ว `npm run dev` → เปิด http://localhost:3000/setup | — |
| 4 | ตั้งค่าล็อกอินด้วย Google | [docs/guides/google-login.md](docs/guides/google-login.md) |
| 5 | ขึ้นเว็บจริงด้วย Vercel + ติดตั้งลงมือถือ | [docs/guides/deploy-vercel.md](docs/guides/deploy-vercel.md) |
| 6 | แจ้งเตือนบนมือถือ + cron-job.org | [docs/guides/notifications.md](docs/guides/notifications.md) |
| 7 | ส่งข้อมูลกลับ Meta | [docs/guides/meta-capi.md](docs/guides/meta-capi.md) |

## สร้างต่อเองในคลาส

พิมพ์ในแชตของ Claude Code ทีละขั้น (1 ขั้น = 1 แชตใหม่ จบแล้ว `/memo` `/clear`)

- `ทำขั้น 1.13 ตาม docs/steps/1.13-leads.md` — รายการลูกค้า · เพิ่มลีด · หน้าลูกค้า
- `ทำขั้น 1.14 ตาม docs/steps/1.14-today.md` — หน้า "งานของฉันวันนี้"
- `ทำขั้น 2.1 ตาม docs/steps/2.1-unit-import.md` — นำเข้ารายการแปลงจาก Excel

## เปลี่ยนเป็นแบรนด์ของบริษัท

- ชื่อแอป: `src/config/app.ts` · โลโก้: `public/logo.svg`
- สี ฟอนต์ ขนาด: `src/app/globals.css` → ดูผลที่ http://localhost:3000/theme
- เอกสาร (ใบจอง ใบเสนอราคา): `src/documents/` — ส่งไฟล์ต้นแบบของบริษัทให้ Claude แปลง

รายละเอียดระบบ: [docs/SPEC.md](docs/SPEC.md) · เมนูและธีม: [docs/DESIGN.md](docs/DESIGN.md)
