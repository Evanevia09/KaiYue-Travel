import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function jpegPath(width: number, height: number, quality: number, name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "kaiyue-offer-"));
  const out = join(dir, name);
  execFileSync("python3", [
    "-c",
    [
      "import os, sys",
      "from PIL import Image",
      "w, h, q, dest = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]",
      "tile = os.urandom(256 * 256 * 3)",
      'base = Image.frombytes("RGB", (256, 256), tile)',
      "img = base.resize((w, h), Image.Resampling.NEAREST)",
      'img.save(dest, "JPEG", quality=q, subsampling=0, optimize=False)',
    ].join("\n"),
    String(width),
    String(height),
    String(quality),
    out,
  ]);
  return out;
}

test("setInputFiles copies the live FileList before the input is cleared", async ({ page }) => {
  const file = jpegPath(64, 48, 80, "copy-before-clear.jpg");
  await page.setContent(`<!doctype html>
<input id="photo" type="file" accept="image/jpeg" />
<pre id="out"></pre>
<script>
  function takeInputFiles(input) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    return files;
  }
  const input = document.getElementById("photo");
  input.addEventListener("change", (event) => {
    const files = takeInputFiles(event.currentTarget);
    document.getElementById("out").textContent = JSON.stringify({
      copied: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      afterClear: event.currentTarget.files.length,
    });
  });
</script>`);
  await page.setInputFiles("#photo", file);
  const result = JSON.parse((await page.locator("#out").textContent()) ?? "{}") as {
    copied: Array<{ name: string; size: number; type: string }>;
    afterClear: number;
  };
  expect(result.copied).toHaveLength(1);
  expect(result.copied[0]?.name).toBe("copy-before-clear.jpg");
  expect(result.copied[0]?.size).toBeGreaterThan(0);
  expect(result.afterClear).toBe(0);
});

test("dropped files are read from the data transfer list", async ({ page }) => {
  const file = jpegPath(64, 48, 80, "drop.jpg");
  await page.setContent(`<!doctype html>
<div id="drop" style="width:200px;height:120px;border:1px dashed #000">drop</div>
<pre id="out"></pre>
<script>
  function filesFromDataTransfer(data) {
    return Array.from(data?.files ?? []);
  }
  const zone = document.getElementById("drop");
  zone.addEventListener("dragover", (event) => event.preventDefault());
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = filesFromDataTransfer(event.dataTransfer);
    document.getElementById("out").textContent = JSON.stringify({
      names: files.map((file) => file.name),
    });
  });
</script>`);
  const bytes = Array.from(readFileSync(file));
  await page.locator("#drop").evaluate(
    (zone, data) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(data.bytes)], data.name, { type: "image/jpeg" }));
      zone.dispatchEvent(
        new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
    },
    { bytes, name: "drop.jpg" },
  );
  await expect(page.locator("#out")).toHaveText('{"names":["drop.jpg"]}');
});

const preview = process.env.PREVIEW_URL ?? "";
const email = process.env.PREVIEW_ADMIN_EMAIL ?? "admin-test@kaiyue.test";
const password = process.env.PREVIEW_ADMIN_PASSWORD ?? "";

test.describe("admin offer photo UI", () => {
  test.skip(!preview || !password, "PREVIEW_URL and PREVIEW_ADMIN_PASSWORD are required");

  test("uploads a 4000px JPEG over 5 MB through the file input with progress", async ({ page }) => {
    const file = jpegPath(4000, 3000, 92, "phone-4000.jpg");
    const size = statSync(file).size;
    expect(size).toBeGreaterThan(5 * 1024 * 1024);
    expect(size).toBeLessThanOrEqual(25 * 1024 * 1024);

    const origin = preview.replace(/\/$/, "");
    await page.goto(`${origin}/login`);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin/);

    await page.goto(`${origin}/admin/offers`);
    await page.getByRole("button", { name: "+ New offer" }).click();
    await page.locator("label.field.field--full input").first().fill("TEST qa upload");
    await page.locator("textarea").first().fill("Car and driver for QA.");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByText("Draft offer created.")).toBeVisible();

    const posted = page.waitForRequest(
      (req) => req.url().includes("/photos") && req.method() === "POST",
    );
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByRole("progressbar", { name: "Photo upload progress" })).toBeVisible();
    await expect(page.getByText(/Optimising photo 1 of 1|Uploading photo 1 of 1/)).toBeVisible();
    const request = await posted;
    const body = request.postDataBuffer();
    expect(body?.byteLength ?? 0).toBeGreaterThan(0);
    expect(body?.byteLength ?? 0).toBeLessThanOrEqual(5 * 1024 * 1024 + 64_000);
    await expect(page.getByText("Photo uploaded.")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".admin-offer-photo-list img")).toHaveCount(1);

    await page.locator(".admin-editor-dialog__close").click();
    await page
      .getByRole("row", { name: /TEST qa upload/ })
      .getByRole("button", { name: "Delete" })
      .click();
    await page.getByRole("button", { name: "Delete offer" }).click();
    await expect(page.getByText("Offer deleted.")).toBeVisible();
  });
});
