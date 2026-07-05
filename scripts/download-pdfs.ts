/**
 * 日本技術士会公式サイトから過去問題PDFをダウンロードする。
 * data/pdf/<exam>/<division>/sources.json に記載された一覧を取得し、
 * 既存ファイルはスキップする。
 *
 * 使い方: bun run scripts/download-pdfs.ts [sources.jsonのパス...]
 *   引数省略時は data/pdf 配下の全 sources.json を対象にする。
 */
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

interface SourceEntry {
  file: string;
  url: string;
  yearLabel: string;
  subject: string;
}

interface SourcesManifest {
  files: SourceEntry[];
}

const WAIT_MS = 1000;

async function findManifests(): Promise<string[]> {
  const root = join(process.cwd(), "data", "pdf");
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name === "sources.json")
    .map((e) => join(e.parentPath, e.name));
}

async function downloadManifest(manifestPath: string): Promise<void> {
  const manifest: SourcesManifest = JSON.parse(
    await readFile(manifestPath, "utf-8"),
  );
  const dir = dirname(manifestPath);
  for (const entry of manifest.files) {
    const dest = join(dir, entry.file);
    if (existsSync(dest)) {
      console.log(`skip (exists): ${entry.file}`);
      continue;
    }
    console.log(
      `download: ${entry.yearLabel} ${entry.subject} <- ${entry.url}`,
    );
    const res = await fetch(entry.url);
    if (!res.ok) {
      throw new Error(`${entry.url}: HTTP ${res.status}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 4 || String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") {
      throw new Error(`${entry.url}: PDFではないレスポンスを受信しました`);
    }
    await writeFile(dest, buf);
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
}

const targets = process.argv.slice(2);
const manifests = targets.length > 0 ? targets : await findManifests();
if (manifests.length === 0) {
  console.error("sources.json が見つかりません");
  process.exit(1);
}
for (const manifest of manifests) {
  await downloadManifest(manifest);
}
console.log("done");
