import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { Route } from "./+types/download";

/**
 * `make export` で事前生成した成果物（dist/export/<division>/output/）を
 * ダウンロード配信するリソースルート。
 * HTML(webpub) は export 時に ZIP 化されたものを返す。
 */

const EXPORT_DIR = join(process.cwd(), "dist", "export");

const FORMATS: Record<string, { suffix: string; contentType: string }> = {
  pdf: { suffix: ".pdf", contentType: "application/pdf" },
  epub: { suffix: ".epub", contentType: "application/epub+zip" },
  html: { suffix: "-html.zip", contentType: "application/zip" },
};

export function loader({ params }: Route.LoaderArgs) {
  const { division, format } = params;
  const spec = FORMATS[format];
  // division はディレクトリ名に使うため英数字とハイフンのみ許可（パストラバーサル対策）
  if (!spec || !/^[a-z0-9-]+$/.test(division)) {
    throw new Response("Not Found", { status: 404 });
  }

  const filename = `${division}${spec.suffix}`;
  const filePath = join(EXPORT_DIR, division, "output", filename);
  let size: number;
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) throw new Error("not a file");
    size = stat.size;
  } catch {
    throw new Response("Not Found", { status: 404 });
  }

  // 成果物は数十MBになりうるためストリーミングで返す
  const stream = Readable.toWeb(
    createReadStream(filePath),
  ) as unknown as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": spec.contentType,
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
