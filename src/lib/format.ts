// Number and date formats used on every page (Thai, Buddhist year, Bangkok time).

const TZ = "Asia/Bangkok";

export const baht = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === ""
    ? "-"
    : `${Number(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท`;

export const num = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === ""
    ? "-"
    : Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });

/** "23 พ.ย. 69" */
export const thDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("th-TH", {
        timeZone: TZ,
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : "-";

/** "พุธ 25 พ.ย." from a YYYY-MM-DD date (noon, so no time-zone slip) */
export const thDay = (iso: string) =>
  new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("th-TH", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  });

/** "14:05" (Thai time) */
export const thTime = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleTimeString("th-TH", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

/** "23 พ.ย. 69 14:05" */
export const thDateTime = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("th-TH", {
        timeZone: TZ,
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

/** Today's date in Thailand as YYYY-MM-DD (for date inputs and RPC parameters). */
export const todayISO = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

/** YYYY-MM-DD plus n days. */
export const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Phone for a tel: link. */
export const telHref = (phone: string) =>
  `tel:${phone.replace(/[^0-9+]/g, "")}`;
