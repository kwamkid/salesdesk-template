"""Writes supabase/demo/seed_demo.sql: two sample projects, a sales team and ~60 customers
with a realistic history (activities, stage moves, reservations, loan screening).

  python3 scripts/make-demo-seed.py
  then run supabase/demo/seed_demo.sql once in the SQL Editor (or `supabase db query --linked -f`).

Fake staff are auth users with @example.com emails: they cannot sign in, they only own data.
Re-running the seed removes the previous demo data first (projects named in PROJECTS).
"""
import json
import random
from datetime import date, datetime, timedelta, timezone

random.seed(2569)
TODAY = date.today()
TZ = timezone(timedelta(hours=7))

STAFF = [  # (uuid, email, name, role)
    ("d0000000-0000-4000-8000-000000000001", "somying.demo@example.com", "สมหญิง ใจดี", "sales"),
    ("d0000000-0000-4000-8000-000000000002", "anan.demo@example.com", "อนันต์ ขายเก่ง", "sales"),
    ("d0000000-0000-4000-8000-000000000003", "pim.demo@example.com", "พิมพ์ชนก ศรีสุข", "sales"),
    ("d0000000-0000-4000-8000-000000000004", "kong.demo@example.com", "ก้องภพ มั่นคง", "sales"),
    ("d0000000-0000-4000-8000-000000000005", "boss.demo@example.com", "วิทยา ผู้บริหาร", "executive"),
]
P1 = "e0000000-0000-4000-8000-000000000001"
P2 = "e0000000-0000-4000-8000-000000000002"
PLAN1 = "e1000000-0000-4000-8000-000000000001"
PROJECTS = [
    (P1, "เดอะ กรีนวิลล์ บางนา", "บางนา-ตราด กม.12", "https://facebook.com/greenville.demo", "project-1.jpg"),
    (P2, "ทาวน์ พาร์ค รามอินทรา", "รามอินทรา กม.8", "https://facebook.com/townpark.demo", "project-2.jpg"),
]
SALES_BY_PROJECT = {P1: STAFF[0:3], P2: STAFF[2:4]}
CAMPAIGNS = [
    ("e2000000-0000-4000-8000-000000000001", "Facebook แอด บ้านเดี่ยว พ.ย.", P1),
    ("e2000000-0000-4000-8000-000000000002", "Facebook แอด ทาวน์โฮม", P2),
    ("e2000000-0000-4000-8000-000000000003", "ฟอร์มเว็บไซต์", None),
    ("e2000000-0000-4000-8000-000000000004", "Walk-in หน้าโครงการ", None),
    ("e2000000-0000-4000-8000-000000000005", "ป้ายบิลบอร์ด", None),
]

FIRST = ["สมชาย", "วิไล", "ธนพล", "กาญจนา", "ประเสริฐ", "นภา", "ศักดิ์ชัย", "อรอุมา", "วีระ", "ปิยะนุช", "ชาญวิทย์",
         "สุภาพร", "ธีรพงษ์", "จันทร์เพ็ญ", "อภิชาติ", "รัตนา", "เกียรติศักดิ์", "มาลี", "ณัฐวุฒิ", "ศิริพร", "พงศกร",
         "อัญชลี", "ภานุวัฒน์", "ดวงใจ", "สุรเชษฐ์", "พรทิพย์", "ชัยวัฒน์", "กมลชนก", "ณรงค์", "เบญจวรรณ", "ปกรณ์",
         "ลัดดา", "วรเชษฐ์", "สุนิสา", "อนุชา", "ทิพวรรณ", "ยุทธนา", "เพ็ญศรี", "ธวัชชัย", "ปวีณา"]
LAST = ["ทองดี", "ศรีสวัสดิ์", "แสงทอง", "บุญมา", "วงศ์ใหญ่", "จันทร์หอม", "สุขเจริญ", "พึ่งบุญ", "รุ่งเรือง", "มีสุข",
        "ชัยมงคล", "ประเสริฐศรี", "เพชรรัตน์", "นาคสวัสดิ์", "ทรัพย์มาก"]
LOST_REASONS = ["งบไม่พอ", "กู้ไม่ผ่าน", "ทำเลไม่ตรงความต้องการ", "ซื้อโครงการอื่น", "ยังไม่พร้อมซื้อ", "ติดต่อไม่ได้"]
NOTES = {
    "call": ["โทรแล้ว ลูกค้าสนใจแบบ {h} ขอดูโปรผ่อนดาวน์", "โทรไม่รับสาย ส่ง LINE ทิ้งไว้", "คุยแล้ว งบประมาณ {b} ลบ. อยากได้แปลงมุม",
             "โทรติดตาม ลูกค้าขอปรึกษาแฟนก่อน", "ลูกค้าถามเรื่องค่าส่วนกลางและวันโอน", "โทรแจ้งโปรสิ้นเดือน ลูกค้าสนใจ"],
    "chat": ["ทักแชตจากเพจ ส่งโบรชัวร์และผังให้แล้ว", "ส่งตารางผ่อนเบื้องต้นทาง LINE", "ลูกค้าส่งสลิปเงินเดือนมาให้ประเมินกู้",
             "ตอบคำถามเรื่องระยะทางไปรถไฟฟ้า"],
    "meeting": ["นัดคุยที่สำนักงานขาย เทียบแบบ {h} กับแบบอื่น", "คุยกับลูกค้าและคุณแม่ ตัดสินใจร่วมกัน"],
    "visit": ["พาชมบ้านตัวอย่างแบบ {h} ลูกค้าชอบห้องนั่งเล่น", "พาชมโครงการ ดูแปลงที่สนใจ 2 แปลง", "ลูกค้ามาชมพร้อมครอบครัว ถามเรื่องโรงเรียนใกล้ ๆ"],
    "other": ["ลูกค้าขอเลื่อนนัดเป็นสัปดาห์หน้า", "ส่งเอกสารประกอบการกู้ให้ธนาคารแล้ว"],
}
HOUSES = {P1: ["บ้านเดี่ยว แบบ Ivy", "บ้านเดี่ยว แบบ Oak", "บ้านเดี่ยว แบบ Fern"], P2: ["ทาวน์โฮม แบบ Lotus", "ทาวน์โฮม แบบ Lily"]}
# House models (0010_house_models.sql). Fixed ids: scripts/upload-demo-media.mjs uploads each picture to
# project-images/<project_id>/models/<model_id>-demo.jpg and sets image_path.
# (id, project, name, category, bed, bath, parking, usable m², land from ตร.ว., price from, description)
MODELS = [
    ("e4000000-0000-4000-8000-000000000001", P1, "Ivy", "detached", 3, 3, 2, 145, 50, 3_290_000 + 50 * 25_000,
     "บ้านเดี่ยว 2 ชั้น ห้องนั่งเล่นเพดานสูง ห้องนอนใหญ่ชั้นบนพร้อมห้องน้ำในตัว เหมาะกับครอบครัวขนาดกลาง"),
    ("e4000000-0000-4000-8000-000000000002", P1, "Oak", "detached", 4, 3, 2, 180, 50, 3_890_000 + 50 * 25_000,
     "บ้านเดี่ยว 2 ชั้นหลังใหญ่ 4 ห้องนอน มีห้องนอนชั้นล่างสำหรับผู้สูงอายุ ครัวแยกเป็นสัดส่วน"),
    ("e4000000-0000-4000-8000-000000000003", P1, "Fern", "detached", 3, 2, 2, 120, 50, 2_790_000 + 50 * 25_000,
     "บ้านเดี่ยวขนาดกะทัดรัด ราคาเริ่มต้นเข้าถึงง่าย พื้นที่สวนรอบบ้าน เหมาะกับคู่แต่งงานใหม่"),
    ("e4000000-0000-4000-8000-000000000004", P2, "Lotus", "townhome", 3, 2, 1, 110, 18, 2_190_000 + 5_000,
     "ทาวน์โฮม 2 ชั้น หน้ากว้าง จอดรถได้ 1 คัน ใกล้ทางด่วนและห้างสรรพสินค้า"),
    ("e4000000-0000-4000-8000-000000000005", P2, "Lily", "townhome", 3, 3, 2, 130, 18, 2_590_000 + 5_000,
     "ทาวน์โฮม 2 ชั้นหน้ากว้างพิเศษ จอดรถได้ 2 คัน ห้องนอนใหญ่ทุกห้อง มีห้องน้ำ 3 ห้อง"),
]
MODEL_OF = {(m[1], f"{'บ้านเดี่ยว' if m[3] == 'detached' else 'ทาวน์โฮม'} แบบ {m[2]}"): m for m in MODELS}
BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงไทย", "ธอส.", "กรุงเทพ"]
OCCUPATIONS = ["พนักงานบริษัท", "รับราชการ", "เจ้าของกิจการ", "ฟรีแลนซ์", "พยาบาล"]
STAGES = ["new", "qualified", "appointment", "visited", "reserved", "contracted", "transferred"]


def q(v):
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def ts(dt):
    return q(dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00"))


def at(d, hour=None):
    return datetime(d.year, d.month, d.day, hour if hour is not None else random.randint(9, 19), random.randint(0, 59), tzinfo=TZ)


out = ["-- Demo data for SalesDesk. Generated by scripts/make-demo-seed.py — edit the script, not this file.",
       "-- Run once in the Supabase SQL Editor AFTER all migrations. Safe to re-run: it removes the old demo first.",
       "begin;", ""]

# --- clean previous demo ---------------------------------------------------
ids = ",".join(q(p[0]) for p in PROJECTS)
out += [f"delete from public.leads where project_id in ({ids});",
        f"delete from public.projects where id in ({ids});",
        "delete from public.campaigns where id in (" + ",".join(q(c[0]) for c in CAMPAIGNS) + ");",
        "delete from auth.users where id in (" + ",".join(q(s[0]) for s in STAFF) + ");", ""]

# --- staff ------------------------------------------------------------------
for uid, email, name, role in STAFF:
    out.append("insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) "
               f"values ({q(uid)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', {q(email)}, "
               f"{q(json.dumps({'full_name': name}, ensure_ascii=False))}::jsonb, '{{}}'::jsonb, now() - interval '60 days', now());")
    pic = f"/samples/avatars/staff-{STAFF.index((uid, email, name, role)) + 1}.jpg"
    out.append(f"update public.profiles set role = {q(role)}, status = 'active', full_name = {q(name)}, avatar_url = {q(pic)} where id = {q(uid)};")
out.append("delete from public.notifications where dedupe_key like 'pending:d0000000-%';")
out.append("")

# --- projects, plan, campaigns ---------------------------------------------
for pid, name, loc, fb, cover in PROJECTS:
    out.append(f"insert into public.projects (id, name, location, fb_page, is_open, created_at) values "
               f"({q(pid)}, {q(name)}, {q(loc)}, {q(fb)}, true, now() - interval '90 days');")
    out.append(f"-- cover picture uploaded separately to project-images/{pid}/cover-demo.jpg (scripts/upload-demo-media.mjs)")
    for s in SALES_BY_PROJECT[pid]:
        out.append(f"insert into public.project_members (project_id, user_id) values ({q(pid)}, {q(s[0])});")
out.append(f"insert into public.site_plans (id, project_id, name, image_w, image_h) values ({q(PLAN1)}, {q(P1)}, 'ผังโครงการ', 1024, 725);")
for cid, name, pid in CAMPAIGNS:
    out.append(f"insert into public.campaigns (id, name, project_id) values ({q(cid)}, {q(name)}, {q(pid)});")
# values per stage, so Meta values and dashboards look real
for pid in (P1, P2):
    for st, val in (("qualified", 2000), ("appointment", 5000), ("visited", 10000)):
        out.append(f"insert into public.stage_settings (project_id, stage, value) values ({q(pid)}, {q(st)}, {val});")
out.append("")

# --- house models (before units, so each plot links to its model) ------------
for i, (mid, pid, name, cat, bed, bath, park, sqm, land, price, desc) in enumerate(MODELS):
    out.append("insert into public.house_models (id, project_id, name, category, bedrooms, bathrooms, parking, usable_sqm, "
               "land_from_sqw, price_from, description, sort) values "
               f"({q(mid)}, {q(pid)}, {q(name)}, {q(cat)}, {bed}, {bath}, {park}, {sqm}, {land}, {price}, {q(desc)}, {i});")
out.append("")

# --- units --------------------------------------------------------------------
pins = {p["plot"]: p for p in json.load(open("docs/samples/site-plan-pins.json"))["pins"]}
units = {P1: [], P2: []}
for code in sorted(pins):
    house = random.choice(HOUSES[P1])
    land = random.choice([50, 52, 55, 58, 60, 65, 72])
    base = {"บ้านเดี่ยว แบบ Ivy": 3_290_000, "บ้านเดี่ยว แบบ Oak": 3_890_000, "บ้านเดี่ยว แบบ Fern": 2_790_000}[house]
    units[P1].append(dict(code=code, zone=code[0], house=house, land=land, sqm=[random.choice([120, 145, 180]), MODEL_OF[(P1, house)][7]][1],
                          price=base + land * 25_000, x=pins[code]["x"], y=pins[code]["y"]))
for i in range(1, 41):
    house = random.choice(HOUSES[P2])
    code = f"T{i:02d}"
    units[P2].append(dict(code=code, zone="T", house=house, land=random.choice([18, 20, 22, 25]), sqm=[random.choice([110, 130]), MODEL_OF[(P2, house)][7]][1],
                          price=(2_190_000 if "Lotus" in house else 2_590_000) + i * 5_000, x=None, y=None))
for pid in (P1, P2):
    for u in units[pid]:
        model = MODEL_OF[(pid, u["house"])][0]
        out.append("insert into public.units (project_id, code, zone, house_type, house_model_id, land_sqw, usable_sqm, price, plan_id, pos_x, pos_y) values "
                   f"({q(pid)}, {q(u['code'])}, {q(u['zone'])}, {q(u['house'])}, {q(model)}, {u['land']}, {u['sqm']}, {u['price']}, "
                   f"{q(PLAN1) if pid == P1 else 'null'}, {q(u['x']) if u['x'] is not None else 'null'}, {q(u['y']) if u['y'] is not None else 'null'});")
out.append("")

# --- leads -------------------------------------------------------------------
free = {pid: [u["code"] for u in units[pid]] for pid in units}
for pid in free:
    random.shuffle(free[pid])
used_phones = set()
lead_no = 0
for pid, count in ((P1, 38), (P2, 24)):
    for _ in range(count):
        lead_no += 1
        lid = f"e3000000-0000-4000-8000-{lead_no:012d}"
        owner = random.choice(SALES_BY_PROJECT[pid])[0]
        name = f"คุณ{random.choice(FIRST)} {random.choice(LAST)}"
        while True:
            phone = "08" + str(random.randint(10_000_000, 99_999_999))
            if phone not in used_phones:
                used_phones.add(phone)
                break
        email = random.choice(["", "", f"demo{lead_no}@example.com"])
        camp = random.choice([c for c in CAMPAIGNS if c[2] in (None, pid)])[0]
        created = TODAY - timedelta(days=random.randint(1, 45))
        # how far this lead got
        r = random.random()
        if r < 0.12:
            final = "lost"
        elif r < 0.18:
            final = "unqualified"
        else:
            final = random.choices(STAGES, weights=[14, 22, 16, 18, 12, 6, 4])[0]
        reach = STAGES.index(final) if final in STAGES else random.randint(1, 3)
        path = STAGES[: reach + 1] if final in STAGES else STAGES[: reach + 1] + [final]

        # activities spread from created to today
        acts = []
        d = created
        created_at = at(created, 9)
        n_acts = 0 if final == "new" and random.random() < 0.6 else random.randint(1, 3 + reach)
        h = random.choice(HOUSES[pid])
        for _ in range(n_acts):
            d = min(TODAY, d + timedelta(days=random.randint(0, 4)))
            kind = random.choices(["call", "chat", "meeting", "visit", "other"], weights=[45, 25, 8, 12, 10])[0]
            if kind == "visit" and reach < 3:
                kind = "call"
            note = random.choice(NOTES[kind]).format(h=h, b=random.choice(["3", "3.5", "4", "4.5"]))
            acts.append((kind, note, max(created_at + timedelta(minutes=30), at(d))))
        if reach >= 3 and not any(a[0] == "visit" for a in acts):
            acts.append(("visit", random.choice(NOTES["visit"]).format(h=h), at(min(TODAY, created + timedelta(days=random.randint(2, 10))))))
        acts.sort(key=lambda a: a[2])

        open_stage = final not in ("transferred", "lost", "unqualified")
        if open_stage:
            follow = TODAY + timedelta(days=random.choice([-6, -3, -1, 0, 0, 1, 2, 3, 5, 7, 10]))
        else:
            follow = None
        lost_reason = random.choice(LOST_REASONS) if final == "lost" else None
        appt = at(TODAY + timedelta(days=random.randint(0, 4)), random.choice([10, 13, 15])) if final == "appointment" else None
        visited = next((a[2] for a in acts if a[0] == "visit"), None) if reach >= 3 else None

        out.append("insert into public.leads (id, project_id, owner_id, full_name, phone, email, campaign_id, stage, next_follow_up, "
                   "appointment_at, lost_reason_id, created_by, created_at, visited_at, source) values "
                   f"({q(lid)}, {q(pid)}, {q(owner)}, {q(name)}, {q(phone)}, {q(email)}, {q(camp)}, 'new', {q(str(TODAY))}, "
                   f"null, null, {q(owner)}, {ts(created_at)}, {ts(visited) if visited else 'null'}, "
                   f"{q('web' if camp.endswith('3') else 'app')});")
        for kind, note, when in acts:
            out.append(f"insert into public.activities (lead_id, type, note, created_by, created_at) values "
                       f"({q(lid)}, {q(kind)}, {q(note)}, {q(owner)}, {ts(when)});")
        # final state (one update = one history row; then the history gets realistic dates below)
        lr = f"(select id from public.lost_reasons where label = {q(lost_reason)} limit 1)" if lost_reason else "null"
        out.append(f"update public.leads set stage = {q(final)}, next_follow_up = {q(str(follow)) if follow else 'null'}, "
                   f"appointment_at = {ts(appt) if appt else 'null'}, lost_reason_id = {lr} where id = {q(lid)};")
        # rebuild the stage history with one row per step, dated along the activities
        out.append(f"delete from public.stage_history where lead_id = {q(lid)};")
        # first row = the day the lead came in; later steps spread up to today
        span = max(1, (TODAY - created).days)
        step_days = [0] + sorted(random.randint(1, span) for _ in path[1:])
        prev = None
        for i, st in enumerate(path):
            when = created_at if i == 0 else max(created_at + timedelta(hours=1), at(created + timedelta(days=step_days[i])))
            out.append(f"insert into public.stage_history (lead_id, from_stage, to_stage, changed_by, changed_at) values "
                       f"({q(lid)}, {q(prev)}, {q(st)}, {q(owner)}, {ts(when)});")
            prev = st
        # plots
        if final in ("reserved", "contracted", "transferred") and free[pid]:
            code = free[pid].pop()
            out.append(f"update public.units set status = {q(final)}, lead_id = {q(lid)} where project_id = {q(pid)} and code = {q(code)};")
        elif reach >= 2 and free[pid] and random.random() < 0.6:
            for code in random.sample(free[pid][:15], 2):
                out.append(f"insert into public.unit_interests (unit_id, lead_id, created_by) select id, {q(lid)}, {q(owner)} "
                           f"from public.units where project_id = {q(pid)} and code = {q(code)};")
        # loan screening for serious buyers
        if reach >= 3 or final == "lost" and lost_reason == "กู้ไม่ผ่าน":
            income = random.choice([35000, 45000, 55000, 70000, 90000])
            debt = random.choice([0, 5000, 8000, 15000])
            status = ("approved" if final in ("contracted", "transferred") else
                      "rejected" if lost_reason == "กู้ไม่ผ่าน" else random.choice(["waiting_docs", "submitted", "approved"]))
            want = random.choice([2_800_000, 3_200_000, 3_800_000, 4_200_000])
            out.append("insert into public.loan_screenings (lead_id, status, occupation, monthly_income, monthly_debt, wanted_amount, bank, approved_amount, fail_reason) values "
                       f"({q(lid)}, {q(status)}, {q(random.choice(OCCUPATIONS))}, {income}, {debt}, {want}, {q(random.choice(BANKS))}, "
                       f"{want if status == 'approved' else 'null'}, {q('ภาระหนี้บัตรเครดิตสูง' if status == 'rejected' else '')});")
        out.append("")

out += ["-- demo notifications and Meta queue rows created by the triggers are not useful here",
        "delete from public.notifications where user_id in (" + ",".join(q(s[0]) for s in STAFF) + ");",
        f"delete from public.meta_events where project_id in ({ids});",
        "commit;"]
open("supabase/demo/seed_demo.sql", "w").write("\n".join(out) + "\n")

# --- clear file: removes the demo only (2 sample projects, their leads, fake staff, demo campaigns) --
clear = ["-- Removes the SalesDesk demo data. Generated by scripts/make-demo-seed.py.",
         "-- Only the 2 sample projects, their customers and plots, the fake @example.com staff and demo campaigns.",
         "-- Your own projects, customers and staff are not touched. Safe to run twice.",
         "begin;",
         f"delete from public.meta_events where project_id in ({ids});",
         f"delete from public.leads where project_id in ({ids});",
         f"delete from public.projects where id in ({ids});",
         "delete from public.campaigns where id in (" + ",".join(q(c[0]) for c in CAMPAIGNS) + ");",
         "delete from public.notifications where user_id in (" + ",".join(q(s[0]) for s in STAFF) + ");",
         "delete from auth.users where id in (" + ",".join(q(s[0]) for s in STAFF) + ");",
         "commit;"]
open("supabase/demo/clear_demo.sql", "w").write("\n".join(clear) + "\n")
print(f"supabase/demo/seed_demo.sql + clear_demo.sql written: {lead_no} leads, {sum(len(v) for v in units.values())} plots")
