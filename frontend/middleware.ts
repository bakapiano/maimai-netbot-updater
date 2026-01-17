import { rewrite } from "@vercel/edge";

export const config = {
  matcher: ["/api/:path*"],
};

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const rawHost = process.env.API_HOST;

  if (!rawHost) {
    return new Response("API_HOST is required", { status: 500 });
  }

  let host = rawHost.trim();

  if (host.includes("//")) {
    try {
      host = new URL(host).host;
    } catch {
      host = host.replace(/^https?:\/\//, "").split("/")[0];
    }
  } else if (host.includes("/")) {
    host = host.split("/")[0];
  }

  if (!host || host.startsWith(":")) {
    return new Response("API_HOST is invalid", { status: 500 });
  }

  url.host = host;
  url.protocol = "https:";

  return rewrite(url);
}
