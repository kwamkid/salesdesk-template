# ตั้งค่าล็อกอินด้วย Google (ขั้น 1.10b · ประมาณ 15 นาที)

SalesDesk ล็อกอินได้ทางเดียวคือบัญชี Google โค้ดทำไว้ให้แล้ว เหลือตั้งค่า 2 ที่: **Google Cloud** (สร้างกุญแจ) และ **Supabase** (ใส่กุญแจ)

ก่อนเริ่ม: เปิดไฟล์ `supabase/.temp/project-ref` หรือดูที่อยู่ Supabase ของคุณ `https://<ref>.supabase.co` — คำว่า `<ref>` ด้านล่างคือรหัสนี้

---

## ส่วนที่ 1 — Google Cloud

### 1. สร้างโปรเจกต์
เปิด https://console.cloud.google.com/projectcreate
- Project name: ชื่อบริษัท + SalesDesk (เช่น `Baan-A SalesDesk`)
- กด **Create** รอสักครู่ แล้วเช็กว่ามุมซ้ายบนเลือกโปรเจกต์นี้อยู่

### 2. ตั้งค่าหน้าขออนุญาต (ทำครั้งเดียว)
เปิด https://console.cloud.google.com/auth/overview แล้วกด **Get started**
1. **App Information** — App name: ชื่อแอปที่ผู้ใช้จะเห็น (เช่น `SalesDesk บ้านเอ`) · User support email: อีเมลของคุณ → Next
2. **Audience** — เลือก **External** → Next
3. **Contact Information** — อีเมลของคุณ → Next
4. ติ๊กยอมรับเงื่อนไข → **Create**

> ไม่ต้องใส่โลโก้ ถ้าใส่ Google จะขอตรวจแอปก่อน ใช้เวลาหลายวัน

### 3. สร้างกุญแจ (OAuth client)
เปิด https://console.cloud.google.com/auth/clients/create
- Application type: **Web application**
- Name: `SalesDesk`
- **Authorized redirect URIs** → กด Add URI แล้ววาง `https://<ref>.supabase.co/auth/v1/callback`
  (คัดลอกจากหน้า Supabase ในส่วนที่ 2 ข้อ 1 ได้ ตรงช่อง Callback URL)
- กด **Create** → หน้าต่างขึ้น **Client ID** และ **Client secret** → คัดลอกเก็บไว้ (กด Download JSON เก็บไว้ด้วยก็ได้)

### 4. เปิดให้ทุกคนล็อกอินได้
เปิด https://console.cloud.google.com/auth/audience
- ตอนนี้สถานะเป็น **Testing** = ล็อกอินได้เฉพาะอีเมลที่ใส่ไว้ใน Test users
- กด **Publish app** → Confirm · แอปที่ขอแค่ชื่อและอีเมล (ค่าเริ่มต้น) ไม่ต้องรอ Google ตรวจ

---

## ส่วนที่ 2 — Supabase

### 1. ใส่กุญแจ
เปิด https://supabase.com/dashboard/project/<ref>/auth/providers แล้วกด **Google**
- เปิดสวิตช์ **Enable Sign in with Google**
- Client IDs: วาง Client ID · Client Secret: วาง Client secret
- กด **Save**

### 2. บอก Supabase ว่าแอปอยู่ที่ไหน
เปิด https://supabase.com/dashboard/project/<ref>/auth/url-configuration
- **Site URL**: `http://localhost:3000` (หลังขึ้น Vercel แล้วเปลี่ยนเป็นที่อยู่ Vercel)
- **Redirect URLs** → Add URL ทีละบรรทัด:
  - `http://localhost:3000/**`
  - `https://<ชื่อแอป>.vercel.app/**` (ใส่ตอนขั้น deploy ได้)
- กด **Save**

---

## ตรวจผล

1. เปิด http://localhost:3000/setup → ข้อ "เปิดล็อกอินด้วย Google แล้ว" ต้องผ่าน
2. เปิด http://localhost:3000/login → กด **เข้าสู่ระบบด้วย Google** → เลือกบัญชี → เข้าระบบได้
3. คนแรกที่เข้าระบบจะเป็น **แอดมิน** อัตโนมัติ คนต่อไปรออนุมัติ หรือเข้าผ่านลิงก์เชิญ (เมนู ผู้ใช้ → เชิญผู้ใช้)

## เจอปัญหา

| อาการ | แก้ |
|---|---|
| `Error 400: redirect_uri_mismatch` | ข้อ 3 ของ Google ใส่ redirect URI ไม่ตรง ต้องเป็น `https://<ref>.supabase.co/auth/v1/callback` ทุกตัวอักษร |
| `Access blocked: … has not completed the Google verification process` | ยังไม่ได้กด Publish app (ส่วนที่ 1 ข้อ 4) |
| ล็อกอินแล้วเด้งไปหน้า `localhost` ทั้งที่เปิดจาก Vercel | ยังไม่ได้เพิ่มที่อยู่ Vercel ใน Redirect URLs (ส่วนที่ 2 ข้อ 2) |
| กลับมาหน้าเข้าสู่ระบบพร้อมข้อความ "ไม่สำเร็จ" | Client secret ใน Supabase ผิด หรือยังไม่ได้กด Save |
| เปิด localhost แล้วขึ้น `HTTP ERROR 431` | คุกกี้ของโปรเจกต์อื่นที่เคยรันบน localhost เยอะเกิน → เปิดผ่าน `http://127.0.0.1:3000` แทน และเพิ่ม `http://127.0.0.1:3000/**` ใน Redirect URLs (หรือลบคุกกี้ของ localhost ใน Chrome) |
