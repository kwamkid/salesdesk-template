# แจ้งเตือนบนมือถือ + งานตั้งเวลา (ขั้น 2.7)

ทำไว้ในโค้ดแล้ว เหลือใส่กุญแจ 1 ชุด และตั้ง cron-job.org 2 งาน

## 1. สร้างกุญแจแจ้งเตือน (VAPID)

ใน terminal ของ VS Code รัน

    npx web-push generate-vapid-keys

ได้ Public Key กับ Private Key → ใส่ใน `.env.local` และใน Vercel (Settings > Environment Variables)

    NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key>
    VAPID_PRIVATE_KEY=<Private Key>
    VAPID_SUBJECT=mailto:<อีเมลของคุณ>
    CRON_SECRET=<ตัวอักษรสุ่มยาว 32 ตัวขึ้นไป>

แก้ Vercel แล้วต้องกด **Redeploy** ค่าใหม่ถึงจะใช้

## 2. ตั้งงานใน cron-job.org

เปิด https://console.cron-job.org/jobs/create สร้าง 2 งาน

| งาน | URL | ตั้งเวลา |
|---|---|---|
| SalesDesk ทุก 5 นาที | `https://<ชื่อ>.vercel.app/api/cron/tick` | Every 5 minutes |
| SalesDesk ทุกเช้า | `https://<ชื่อ>.vercel.app/api/cron/daily` | Every day 07:00 (Timezone: Asia/Bangkok) |

ทั้ง 2 งาน: แท็บ **Advanced** → Headers → Add
- Key: `Authorization`
- Value: `Bearer <CRON_SECRET เดียวกับใน Vercel>`

กด **Test run** ต้องได้ `200 OK` (ได้ `401` = CRON_SECRET ไม่ตรง)

งานทุก 5 นาทีทำ: ส่งแจ้งเตือนที่รออยู่ · เตือนนัดชมล่วงหน้า 1 ชั่วโมง · สรุปงานประจำวันตามเวลาที่แต่ละคนตั้ง · ส่ง event ที่ค้างไป Meta
งานทุกเช้าทำ: ส่ง event ที่ล้มเหลวไป Meta ซ้ำ แล้วแจ้งแอดมินถ้ายังไม่สำเร็จ

## 3. เปิดแจ้งเตือนบนมือถือ

- **iPhone**: ต้องติดตั้งแอปลงหน้าจอโฮมก่อน (Safari → ปุ่มแชร์ → เพิ่มไปยังหน้าจอโฮม) แล้วเปิดแอปจากไอคอน → เมนู **ฉัน** → **เปิดการแจ้งเตือน** (iOS 16.4 ขึ้นไป)
- **Android**: เมนู **ฉัน** → **เปิดการแจ้งเตือน** → อนุญาต
- กด **ส่งทดสอบ** ต้องเด้งภายในไม่กี่วินาที

ตัวเลขบนไอคอนแอป = งานที่ยังต้องทำ ไม่ใช่จำนวนข้อความ ทำงานเสร็จแล้วตัวเลขลดเอง
