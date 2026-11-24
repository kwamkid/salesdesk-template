// cron-job.org calls /api/cron/* with the header  Authorization: Bearer <CRON_SECRET>
export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  return secret.length >= 16 && request.headers.get("authorization") === `Bearer ${secret}`;
}
