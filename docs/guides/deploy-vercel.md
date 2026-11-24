# ขึ้นเว็บจริงด้วย Vercel (ขั้น 1.10 และ 1.15)

ทำครั้งแรกครั้งเดียว หลังจากนั้นแค่ `/push` แล้ว Vercel ขึ้นเว็บใหม่ให้เองทุกครั้ง

## ครั้งแรก

1. โค้ดต้องอยู่บน GitHub แล้ว (repo ของคุณแบบ **Private** ที่ให้ Claude สร้างจาก template ตอนเริ่มโปรเจกต์)
2. เปิด https://vercel.com/new → **Import** repo นั้น (ถ้าไม่เห็น กด Adjust GitHub App Permissions แล้วอนุญาต repo)
3. ก่อนกด Deploy เปิด **Environment Variables** แล้วใส่ทีละตัว (คัดลอกจากไฟล์ `.env.local` ในเครื่อง)

| ชื่อ | ได้จากไหน |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Project Settings > API Keys |
| `SUPABASE_SECRET_KEY` | Supabase > Project Settings > API Keys (Secret key) |
| `CRON_SECRET` | ตั้งเอง ตัวอักษรสุ่มยาว 32 ตัวขึ้นไป (ใช้ใน cron-job.org) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` | สำหรับแจ้งเตือน ดู `docs/guides/notifications.md` (ใส่ทีหลังได้) |
| `LEADS_API_KEY` | สำหรับรับลีดจากเว็บโครงการวันที่ 2 (ใส่ทีหลังได้) |

   > วางทั้งไฟล์ได้: เปิด `.env.local` คัดลอกทั้งหมด แล้ววางในช่องแรก Vercel แยกให้เอง

4. กด **Deploy** รอ 1–2 นาที ได้ที่อยู่ `https://<ชื่อ>.vercel.app`
5. กลับไป Supabase เพิ่มที่อยู่นี้: https://supabase.com/dashboard/project/<ref>/auth/url-configuration
   - Site URL = `https://<ชื่อ>.vercel.app`
   - Redirect URLs เพิ่ม `https://<ชื่อ>.vercel.app/**` (เก็บ `http://localhost:3000/**` ไว้ด้วย)
6. เปิด `https://<ชื่อ>.vercel.app/setup` → ต้องผ่านทุกข้อ แล้วลองล็อกอิน

## ครั้งต่อไป

พิมพ์ `/push` ใน VS Code → Claude เช็ก build แล้วส่งขึ้น GitHub → Vercel ขึ้นเว็บใหม่เองใน 1–2 นาที

## ติดตั้งลงมือถือ (ขั้น 1.15)

เปิดที่อยู่ Vercel บนมือถือ → ล็อกอิน → เมนู **ฉัน** → หัวข้อ "ติดตั้งแอปบนมือถือ" ทำตามที่เขียนไว้ (iPhone ต้องใช้ Safari)

## เจอปัญหา

| อาการ | แก้ |
|---|---|
| Vercel ขึ้น `Build failed` | รัน `npm run build` ในเครื่องให้ผ่านก่อน แล้ว `/push` ใหม่ |
| ขึ้นเว็บแล้วเปิดไปเจอหน้า "เช็กการติดตั้ง" | ยังไม่ได้ใส่ Environment Variables (ข้อ 3) ใส่แล้วกด Redeploy |
| แก้หน้าเว็บแล้ว แต่หน้าในเครื่องยังเหมือนเดิม / สีหรือระยะเพี้ยน | แอปติดตั้งตัวช่วยออฟไลน์ (service worker) ไว้ ถ้าเคยเปิดเว็บที่ deploy แล้วจากเครื่องเดียวกัน ให้กด F12 → Application → Service workers → Unregister แล้วรีโหลด |
| Vercel บอกว่า deploy ถูกบล็อกเพราะ commit author | อีเมล Git ในเครื่องไม่ตรงกับบัญชี GitHub รัน `/check-machine` |
