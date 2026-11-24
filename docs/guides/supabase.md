# ตั้งฐานข้อมูล Supabase (ขั้น 1.10 · ประมาณ 10 นาที)

## 1. สร้างโปรเจกต์
เปิด https://supabase.com/dashboard/new
- Name: `salesdesk` · Database Password: กด Generate แล้วเก็บไว้ · Region: **Southeast Asia (Singapore)**
- กด **Create new project** รอ 1–2 นาที

## 2. สร้างตารางทั้งหมด (วางครั้งเดียว)
1. ใน VS Code เปิดไฟล์ `supabase/setup.sql` → กด Ctrl+A (Mac: Cmd+A) → คัดลอก
2. เปิด https://supabase.com/dashboard/project/<ref>/sql/new → วาง → กด **Run**
3. ต้องขึ้น `Success. No rows returned` — ถ้าขึ้น error ให้แคปจอส่ง Claude อย่าแก้ไฟล์เอง

> `<ref>` คือรหัสโปรเจกต์ที่อยู่ใน URL ของหน้า Supabase หลัง `/project/`

## 3. ใส่กุญแจในเครื่อง
1. คัดลอกไฟล์ `.env.example` เป็น `.env.local` (หรือสั่ง Claude: "สร้าง .env.local จาก .env.example")
2. เปิด https://supabase.com/dashboard/project/<ref>/settings/api-keys
   - **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (กด Reveal) → `SUPABASE_SECRET_KEY` — ห้ามส่งให้ใคร ห้ามวางในแชต
3. ที่อยู่โปรเจกต์ `https://<ref>.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`
4. หยุดเว็บในเครื่อง (Ctrl+C ใน terminal) แล้ว `npm run dev` ใหม่

## 4. ตรวจผล
เปิด http://localhost:3000/setup → ผ่านทุกข้อ ยกเว้น "ล็อกอินด้วย Google" (ทำต่อใน `docs/guides/google-login.md`)

## ภายหลัง: มีไฟล์ฐานข้อมูลใหม่
ไฟล์ใหม่จะเป็นเลขถัดไปใน `supabase/migrations/` (เช่น `0007_...sql`) → รันเฉพาะไฟล์ใหม่ใน SQL Editor ห้ามรัน `setup.sql` ซ้ำ
