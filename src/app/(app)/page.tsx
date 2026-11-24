import { redirect } from "next/navigation";
import { HOME } from "@/config/roles";
import { requireMe } from "@/lib/auth";

// Each role lands on its own first page.
export default async function Home() {
  const me = await requireMe();
  redirect(HOME[me.role]);
}
