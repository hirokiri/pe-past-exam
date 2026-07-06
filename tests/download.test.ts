import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loader } from "../app/routes/download";

/** loader は dist/export/<division>/output/ を読むため、テスト用部門を実際に作る */
const FIXTURE_DIVISION = "99-test-fixture";
const OUTPUT_DIR = join(
  process.cwd(),
  "dist",
  "export",
  FIXTURE_DIVISION,
  "output",
);

beforeAll(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, `${FIXTURE_DIVISION}.pdf`), "dummy-pdf");
  await writeFile(join(OUTPUT_DIR, `${FIXTURE_DIVISION}.epub`), "dummy-epub");
  await writeFile(
    join(OUTPUT_DIR, `${FIXTURE_DIVISION}-html.zip`),
    "dummy-zip",
  );
});

afterAll(async () => {
  await rm(join(process.cwd(), "dist", "export", FIXTURE_DIVISION), {
    recursive: true,
    force: true,
  });
});

function callLoader(division: string, format: string): Response {
  return loader({
    params: { division, format },
  } as unknown as Parameters<typeof loader>[0]);
}

function status404(division: string, format: string): number {
  try {
    callLoader(division, format);
  } catch (e) {
    if (e instanceof Response) return e.status;
    throw e;
  }
  return 200;
}

describe("download loader", () => {
  test("pdf を attachment で返す", async () => {
    const res = callLoader(FIXTURE_DIVISION, "pdf");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      `attachment; filename="${FIXTURE_DIVISION}.pdf"`,
    );
    expect(res.headers.get("Content-Length")).toBe("9");
    expect(await res.text()).toBe("dummy-pdf");
  });

  test("epub / html も対応する Content-Type で返す", async () => {
    expect(
      callLoader(FIXTURE_DIVISION, "epub").headers.get("Content-Type"),
    ).toBe("application/epub+zip");
    expect(
      callLoader(FIXTURE_DIVISION, "html").headers.get("Content-Type"),
    ).toBe("application/zip");
  });

  test("未知の format は 404", () => {
    expect(status404(FIXTURE_DIVISION, "docx")).toBe(404);
  });

  test("成果物が存在しない部門は 404", () => {
    expect(status404("98-no-such-division", "pdf")).toBe(404);
  });

  test("パストラバーサルを含む division は 404", () => {
    expect(status404("../../etc", "pdf")).toBe(404);
    expect(status404("..", "pdf")).toBe(404);
    expect(status404(`${FIXTURE_DIVISION}/..`, "pdf")).toBe(404);
  });
});
