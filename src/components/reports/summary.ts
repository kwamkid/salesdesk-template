// Plain Thai text built from dashboard() for pasting into Claude, plus the ready-made prompt
// for the sales-team analysis pack.

import { stageOf } from "@/config/stages";
import { thDate } from "@/lib/format";
import type { Dashboard } from "./data";
import { pct } from "./params";

const n = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("th-TH");
const rate = (part: number, whole: number) => {
  const p = pct(part, whole);
  return p === null ? "-" : `${p}%`;
};

/** Funnel and per-campaign numbers as text. */
export function claudeSummary(d: Dashboard, projectName: string) {
  const lines: string[] = [];
  lines.push(`สรุปยอดขาย ${projectName} ช่วง ${thDate(d.from)} ถึง ${thDate(d.to)}`);
  lines.push("");
  lines.push("ตัวเลขหลัก");
  lines.push(`- ลีดใหม่ ${n(d.kpi.new_leads)} ราย`);
  lines.push(`- นัดชม ${n(d.kpi.appointments)} ครั้ง`);
  lines.push(`- จอง ${n(d.kpi.reservations)} ราย`);
  lines.push(`- โอน ${n(d.kpi.transfers)} ราย`);
  lines.push(`- งานตามที่เลยกำหนดทั้งทีม (ณ วันนี้) ${n(d.kpi.overdue)} ราย`);
  lines.push("");
  lines.push("Funnel (ลีดที่เข้ามาในช่วงนี้ ไปถึงแต่ละขั้น)");
  const funnel = d.funnel ?? [];
  funnel.forEach((f, i) => {
    const prev = i > 0 ? funnel[i - 1].count : null;
    const conv = prev === null ? "" : ` (${rate(f.count, prev)} จากขั้นก่อน)`;
    lines.push(`- ${stageOf(f.stage).label} ${n(f.count)} ราย${conv}`);
  });
  lines.push("");
  lines.push("รายแคมเปญ (ลีด / ลีดคุณภาพ / มาชม / จอง)");
  if (d.by_campaign.length === 0) lines.push("- ยังไม่มีลีดในช่วงนี้");
  for (const c of d.by_campaign) {
    lines.push(
      `- ${c.name}: ลีด ${n(c.leads)} · ลีดคุณภาพ ${n(c.qualified)} (${rate(c.qualified, c.leads)}) · มาชม ${n(
        c.visited,
      )} (${rate(c.visited, c.leads)}) · จอง ${n(c.reserved)} (${rate(c.reserved, c.leads)})`,
    );
  }
  if (d.lost_reasons.length > 0) {
    lines.push("");
    lines.push("เหตุผลที่ไม่ซื้อ (มากไปน้อย)");
    for (const r of d.lost_reasons) lines.push(`- ${r.label} ${n(r.count)} ราย`);
  }
  return lines.join("\n");
}

/** Ready-made prompt for the two team-pack files. */
export function teamPackPrompt(rangeText: string) {
  return [
    `แนบไฟล์ 2 ไฟล์จากระบบขายบ้าน ช่วง ${rangeText}`,
    "1) ชุดวิเคราะห์ทีม_กิจกรรม: กิจกรรมทุกครั้งของเซลส์ พร้อมโน้ต (ลูกค้าแสดงเป็นรหัส ไม่มีชื่อ เบอร์ หรืออีเมล)",
    "2) ชุดวิเคราะห์ทีม_สรุปรายเซลส์: ตัวเลขรวมของเซลส์แต่ละคน",
    "",
    "ช่วยวิเคราะห์การทำงานของทีมขายเป็นภาษาไทย ตามหัวข้อนี้",
    "1. ปริมาณงาน: ใครถือลีดมาก/น้อย ทำกิจกรรมต่อสัปดาห์เท่าไร มีงานค้างเลยกำหนดเท่าไร",
    "2. ความเร็ว: เวลาเฉลี่ยจากได้ลีดถึงติดต่อครั้งแรกของแต่ละคน ใครช้าเกินไป",
    "3. อัตราเปลี่ยน: จากลีดเป็นนัดชม มาชม และจอง ของแต่ละคน",
    "4. คนที่ทำผลงานดีทำอะไรต่างจากคนอื่น ดูจากโน้ตในไฟล์กิจกรรม (วิธีพูด จังหวะการตาม ช่องทางที่ใช้) ยกตัวอย่างโน้ตประกอบ",
    "5. เหตุผลที่เสียลูกค้าที่พบบ่อยของแต่ละคน",
    "6. คำแนะนำการโค้ชรายคน คนละ 2-3 ข้อ ที่ทำได้จริงในสัปดาห์หน้า",
    "",
    "ข้อควรระวัง: ตัวเลขบอกปริมาณงานและผลลัพธ์ แต่เซลส์ที่ถือโครงการขายยากหรือได้ลีดคุณภาพต่ำจะดูแย่กว่าความจริง",
    "ให้ระบุไว้ในผลวิเคราะห์ว่าส่วนไหนอาจเป็นผลจากโครงการหรือคุณภาพลีด และใช้ผลนี้ประกอบการคุยกับทีม ไม่ใช่ตัดสินแทน",
  ].join("\n");
}
