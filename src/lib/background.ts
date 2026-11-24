import { after } from "next/server";
import { flushMetaEvents } from "@/lib/meta";
import { flushNotifications } from "@/lib/push";

/** Call at the end of any Server Action that adds a lead, changes a stage, reserves a plot
 *  or checks in a visit. After the page has answered, it sends the waiting Meta events and
 *  push messages, so the sales person never waits. The cron job catches anything missed. */
export function afterLeadChange() {
  after(async () => {
    await Promise.allSettled([flushMetaEvents(), flushNotifications()]);
  });
}
