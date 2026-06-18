import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

function resolveFontPath(filename: string): string {
  const filePath = path.join(process.cwd(), "public", "fonts", filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Không tìm thấy font PDF: ${filePath}. Kiểm tra outputFileTracingIncludes trên Vercel.`
    );
  }
  return filePath;
}

export function registerPdfFonts(): void {
  if (registered) return;

  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: resolveFontPath("NotoSans-Regular.woff"),
        fontWeight: 400,
      },
      {
        src: resolveFontPath("NotoSans-Bold.woff"),
        fontWeight: 700,
      },
    ],
  });

  registered = true;
}
