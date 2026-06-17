import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;

  const fontsDir = path.join(process.cwd(), "public", "fonts");

  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: path.join(fontsDir, "NotoSans-Regular.woff"),
        fontWeight: 400,
      },
      {
        src: path.join(fontsDir, "NotoSans-Bold.woff"),
        fontWeight: 700,
      },
    ],
  });

  registered = true;
}
