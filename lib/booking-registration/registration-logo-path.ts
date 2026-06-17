import path from "node:path";

/** Server-side path for PDF rendering (app/favicon.ico is PNG data). */
export const REGISTRATION_LOGO_PATH = path.join(
  process.cwd(),
  "app",
  "favicon.ico"
);

/** Client/preview URL served by Next.js from app/favicon.ico */
export const REGISTRATION_LOGO_SRC = "/favicon.ico";
