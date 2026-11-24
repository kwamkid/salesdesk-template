// The address the browser actually opened (http://127.0.0.1:3003, https://x.vercel.app ...).
// Next's request.nextUrl.origin turns 127.0.0.1 into localhost in development, which sends
// people to a different site (other cookies), so read the request headers instead.
export function originFrom(h: Headers) {
  const origin = h.get("origin");
  if (origin && origin !== "null") return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}
