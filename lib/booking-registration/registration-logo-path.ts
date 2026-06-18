import path from "node:path";

/** Server-side path for PDF rendering */
export const REGISTRATION_LOGO_PATH = path.join(
  process.cwd(),
  "public",
  "logn.png"
);

/** Client/preview URL served from public/logn.png */
export const REGISTRATION_LOGO_SRC = "/logn.png";
