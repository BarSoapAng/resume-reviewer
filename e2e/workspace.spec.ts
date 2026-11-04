import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/compile", async (route) => {
    await route.fulfill({ json: { diagnostics: [], cached: false } });
  });
});

test("imports, edits, checkpoints, and downloads a LaTeX resume", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /asks before it assumes/i })).toBeVisible();

  await page.getByLabel("LaTeX resume source").fill("\\documentclass{article}\\begin{document}Hello\\end{document}");
  await page.getByRole("button", { name: /review my resume/i }).click();

  await page.getByTitle("Rename document").click();
  await page.getByRole("textbox", { name: "Document filename" }).fill("Angela Resume Updated");
  await page.getByRole("textbox", { name: "Document filename" }).press("Enter");
  await expect(page.getByRole("button", { name: "Angela Resume Updated.tex" })).toBeVisible();
  await page.getByRole("button", { name: "Version history" }).click();
  await expect(page.getByText("Initial paste")).toBeVisible();

  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .tex source" }).click();
  await expect((await download).suggestedFilename()).toBe("Angela Resume Updated.tex");
});

test("switches the workspace panes on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("aria:resume-source", "\\documentclass{article}\\begin{document}Hi\\end{document}"));
  await page.goto("/");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Preview" })).toBeVisible();
});


test("can hide every panel and restore it from the permanent sidebar", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aria:resume-source", "\\documentclass{article}\\begin{document}Hi\\end{document}"));
  await page.goto("/");
  for (const name of ["Ario", "Source", "Preview"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await expect(page.getByRole("navigation", { name: "Workspace panels" })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toHaveCount(0);
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Source" })).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollHeight", await page.evaluate(() => window.innerHeight));
});



test("keeps upload names and derives PDF downloads from the edited title", async ({ page }) => {
  await page.route("**/api/compile", async (route) => {
    await route.fulfill({ json: { diagnostics: [], pdfBase64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64") } });
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "Angela Resume.tex", mimeType: "text/plain", buffer: Buffer.from("\\documentclass{article}\\begin{document}Hello\\end{document}"),
  });
  await expect(page.getByRole("button", { name: "Angela Resume.tex", exact: true })).toBeVisible();
  await page.getByTitle("Rename document").click();
  await page.getByRole("textbox", { name: "Document filename" }).fill("Angela Resume Updated");
  await page.getByRole("textbox", { name: "Document filename" }).press("Enter");
  await expect(page.getByRole("button", { name: "Download PDF", exact: true })).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await expect((await download).suggestedFilename()).toBe("Angela Resume Updated.pdf");
});
