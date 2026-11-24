// Where a customer came from (ช่องทาง). Keys are stored in leads.channel
// (supabase/migrations/0015_lead_channel.sql), so do not rename them. Labels are shown everywhere.

export type Channel = "call" | "ads" | "messenger" | "line" | "walkin";

/** tone = theme colour of the channel's button (classes in src/app/(app)/leads/new/new-lead-form.tsx). */
export type ChannelTone = "brand" | "purple" | "info" | "ok" | "warn";

export const CHANNELS: { key: Channel; label: string; tone: ChannelTone }[] = [
  { key: "call", label: "โทรเข้า", tone: "brand" },
  { key: "ads", label: "โฆษณา", tone: "purple" },
  { key: "messenger", label: "Messenger", tone: "info" },
  { key: "line", label: "LINE OA", tone: "ok" },
  { key: "walkin", label: "Walk-in", tone: "warn" },
];

export const isChannel = (v: unknown): v is Channel => CHANNELS.some((c) => c.key === v);
export const channelLabel = (key: string | null | undefined) => CHANNELS.find((c) => c.key === key)?.label ?? "-";
