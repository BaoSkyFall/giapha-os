import { NextRequest } from "next/server";

export const getRequestIp = (request: NextRequest) => {
  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("fly-client-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const first = candidate.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return "unknown";
};
