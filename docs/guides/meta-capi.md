# ส่งข้อมูลลูกค้ากลับไป Meta (Conversions API · ขั้น 2.4)

ทุกครั้งที่ลูกค้าเลื่อนขั้น (ลีดใหม่ → ลีดคุณภาพ → นัดชม → มาชม → จอง → ทำสัญญา → โอน) ระบบส่ง event ไป Meta ให้เอง พร้อมเบอร์โทรและอีเมลแบบเข้ารหัส Meta ใช้จับคู่กับคนที่เห็นโฆษณา แล้วหาคนแบบเดียวกันให้

## ต้องมี

- สิทธิ์แอดมินใน Business Portfolio ของบริษัท และ Pixel (Dataset) ของโครงการ

## ขั้นตอน

1. เปิด https://business.facebook.com/events_manager2 → เลือก Pixel ของบริษัท
2. แท็บ **Settings** → คัดลอก **Pixel ID** (ตัวเลข)
3. หัวข้อ **Conversions API** → Set up direct integration → เลือก **Set up without Dataset Quality API** → **Generate access token** → คัดลอก token (เห็นครั้งเดียว)
   - ถ้าเลือกแบบ with Dataset Quality API แล้วขึ้น "Failed to generate access token" ให้เปลี่ยนมาเลือกแบบ without แล้วกดใหม่ ใช้ส่ง event ได้เหมือนกัน
4. แท็บ **Test events** → เลือกช่องทาง **Website** → เปิดหัวข้อ "Confirm your server's events…" → คัดลอก **test_event_code** (เช่น `TEST12345`) · **เปิดหน้านี้ค้างไว้**
5. ใน SalesDesk ล็อกอินเป็นแอดมิน → เมนู **ตั้งค่า** → หัวข้อ Meta → วาง Pixel ID, token และ Test event code → บันทึก
6. กด **ทดสอบส่ง** → กลับไปหน้า Test events ที่เปิดค้างไว้ ต้องเห็น **Lead** ขึ้นภายใน 1 นาที (หน้านี้แสดงเฉพาะ event ที่เข้ามาตอนเปิดหน้าอยู่ ไม่เห็นให้กดทดสอบอีกครั้ง)
7. ใช้จริง: ลบ Test event code ออกจากหน้าตั้งค่า (ถ้าไม่ลบ event จะไปอยู่แค่หน้าทดสอบ)

> ทำไม event จากการเลื่อนขั้นจริงไม่ขึ้นในหน้า Test events: ขั้นของลูกค้าเกิดในระบบหลังบ้าน จึงส่งเป็นแบบ `system_generated` ซึ่ง Meta รับแต่หน้า Test events ไม่แสดง ปุ่มทดสอบส่งจึงส่งแบบหน้าเว็บแทน เพื่อให้เห็นว่า Pixel ID และ token ใช้ได้ ส่วน event จริงดูตามหัวข้อ "ดูว่าส่งสำเร็จไหม" ด้านล่าง

## ผูก Pixel กับบัญชีโฆษณา (ให้ผลไปขึ้นใน Ads Manager)

1. เปิด https://business.facebook.com/settings/pixels → เลือก Pixel ของโครงการ
2. แท็บ **Connected assets** → **Add assets** → **Ad accounts** → ติ๊กบัญชีที่ใช้ยิงแอดโครงการ → บันทึก
3. ตอนสร้างแคมเปญ ระดับ ad set ให้เลือก Pixel นี้เป็นตัววัดผล

ในแท็บ **People** ของ Pixel จะมี **Conversions API System User** ที่ Meta สร้างให้เองตอนกด Generate access token — **ห้ามลบ** ถ้าลบ token จะใช้ไม่ได้และ SalesDesk ส่ง event ไม่ผ่าน

## ตั้งมูลค่าต่อขั้น

เมนู **โครงการ** → เลือกโครงการ → หัวข้อ "มูลค่าและ event ต่อขั้น"
- ใส่มูลค่าของแต่ละขั้น (เช่น นัดชม 5,000 บาท) Meta ใช้เลือกคนที่มีแนวโน้มสร้างมูลค่าสูง
- ขั้น จอง · ทำสัญญา · โอน ใช้ราคาแปลงที่ลูกค้าจองให้เอง
- ปิดการส่งขั้นที่ไม่ต้องการได้ · เปลี่ยนชื่อ event ได้
- ค่าเริ่มต้นเป็นชื่อมาตรฐานของ Meta ทุกขั้น จึงมีคอลัมน์ให้ดูใน Ads Manager (Columns → Customize columns):

| ขั้น | event | คอลัมน์ใน Ads Manager |
|---|---|---|
| ลีดใหม่ | Lead | Leads |
| ลีดคุณภาพ | SubmitApplication | Applications submitted |
| นัดชม | Schedule | Schedules |
| มาชมแล้ว | Contact | Contacts |
| จอง | InitiateCheckout | Checkouts initiated |
| ทำสัญญา | AddPaymentInfo | Payment info adds |
| โอน | Purchase | Purchases |

- ถ้าเปลี่ยนเป็นชื่อที่ตั้งเอง (เช่น SiteVisit) Meta ยังรับและใช้ทำ audience ได้ แต่จะไม่มีคอลัมน์ในแอด

## ดูว่าส่งสำเร็จไหม

- ใน SalesDesk: เลื่อนขั้นลูกค้าแล้ว ถ้า Meta ไม่รับ จะขึ้นที่เมนู **งานรอ** → หัวข้อ "ส่งข้อมูลไป Meta ไม่สำเร็จ" (กดส่งใหม่ได้) · ไม่มีรายการ = Meta รับครบ
- ใน Meta (หลังลบ Test event code แล้ว): Events Manager → Pixel → แท็บ **Overview** จะเห็นชื่อ event เช่น SubmitApplication ภายในราว 20 นาที ช่อง Received from = Server
- ระบบส่งซ้ำให้เองทุกเช้า (ถ้าตั้ง cron-job.org แล้ว ดู `docs/guides/notifications.md`)

## สร้าง custom audience จากแต่ละขั้น

1. SalesDesk → เมนู **รายงาน** → "รายชื่อสำหรับ Meta" → เลือกโครงการและกลุ่ม → ดาวน์โหลด (ได้ไฟล์ phone, email, fn, ln, country)
2. เปิด https://adsmanager.facebook.com/audiences → **Create audience** → **Custom audience** → **Customer list**
3. อัปโหลดไฟล์ → Meta จับคอลัมน์ให้เอง → ตั้งชื่อ เช่น "กรีนวิลล์ จองขึ้นไป 24 พ.ย." → Create
4. ใช้ตอนตั้ง ad set:

| กลุ่ม | ใช้ทำอะไร |
|---|---|
| จองขึ้นไป | สร้าง **Lookalike** จาก audience นี้ หาคนคล้ายคนที่ซื้อจริง |
| มาชมแล้ว | ยิงแอดซ้ำ เช่น โปรปิดการขาย |
| ไม่มีคุณภาพ · ไม่ซื้อ | **Exclude** ไม่ให้แอดไปเจอซ้ำ |
| ทั้งหมด | Exclude จากแอดหาลีดใหม่ (คนที่ทักมาแล้ว) |

- Meta ต้องจับคู่ได้ราว 100 คนขึ้นไปถึงใช้ยิงแอดได้ โครงการเล็กรวมหลายโครงการ (ไม่เลือกโครงการ)
- รายชื่อไม่อัปเดตเอง ดาวน์โหลดใหม่แล้วอัปโหลดทับเดือนละครั้ง (Audience → Edit → Replace customer list)

## ข้อควรรู้

- token เก็บที่ฐานข้อมูลฝั่งเซิร์ฟเวอร์ หน้าเว็บอ่านกลับไม่ได้ ถ้าลืมให้สร้างใหม่แล้ววางทับ
- ขั้น "ไม่ซื้อ" และ "ไม่มีคุณภาพ" ไม่ส่ง — ใช้ไฟล์ "รายชื่อสำหรับ Meta" (เมนู รายงาน) ทำ audience กันออกแทน
- Meta นับผลให้แอดในช่วงเวลาจำกัดหลังคลิก ขั้นต้น ๆ (ลีดคุณภาพ นัดชม มาชม) จึงสำคัญกับโฆษณามากกว่าขั้นโอนที่มาช้า
