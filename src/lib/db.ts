import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
// next.js HMR (hot module reload) will re-run the following if the file has changed
// prevents too many prisma client instances being created
// global is not affected by HMR
