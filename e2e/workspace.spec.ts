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

  await expect(page.getByText("resume.tex")).toBeVisible();
  await page.getByRole("button", { name: "Version history" }).click();
  await expect(page.getByText("Initial paste")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .tex source" }).click();
  await expect((await download).suggestedFilename()).toBe("resume.tex");
});

test("switches the workspace panes on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("draftwise:resume-source", "\\documentclass{article}\\begin{document}Hi\\end{document}"));
  await page.goto("/");
  await page.getByRole("tab", { name: "preview" }).click();
  await expect(page.getByRole("tabpanel", { name: "preview" })).toBeVisible();
});
