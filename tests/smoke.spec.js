import { test, expect } from "@playwright/test";

test("opens the first sector, builds, refunds, and keeps the path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Relay Defense" })).toBeVisible();
  await expect(page.locator("#game canvas")).toBeVisible();
  await page.locator("#difficulty").selectOption("rookie", { force: true });
  await page.getByRole("button", { name: "Start Mission" }).click();
  await expect(page.locator("#baseText")).toHaveText("10");
  await expect(page.locator("#moneyText")).toHaveText("160");
  await expect(page.locator("#designText")).toHaveText("Switchback");
  await expect(page.locator("#bossText")).not.toHaveText("Standby");
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeEnabled();
  await tile(page, 1, 1);
  await expect(page.locator("#moneyText")).toHaveText("120");
  await expect(page.locator("#message")).toContainText("being built");
  await page.getByRole("button", { name: /Barrier/ }).click();
  await tile(page, 0, 4);
  await expect(page.locator("#moneyText")).toHaveText("85");
  await expect(page.locator(".app")).toHaveAttribute("data-built", "2");
  await page.waitForTimeout(7000);
  await expect(page.locator(".app")).toHaveAttribute("data-built", "2");
  await expect(page.locator(".app")).toHaveAttribute("data-spawning", "0");
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeEnabled();
  await page.getByRole("button", { name: /Remove/ }).click();
  await tile(page, 1, 1);
  await expect(page.locator("#moneyText")).toHaveText("105");
});

test("keeps setup collapsed until Start Mission and names tower jobs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Fast single/)).toBeVisible();
  await expect(page.getByText(/Area damage/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeDisabled();
  await page.getByRole("button", { name: "Start Mission" }).click();
  await expect(page.locator(".briefing")).toBeHidden();
  await expect(page.getByRole("button", { name: /Pulse turret/ })).toBeVisible();
});

async function tile(page, col, row) {
  const box = await page.locator("canvas").boundingBox();
  await page.locator("canvas").click({position:{x:box.width*(col+.5)/12,y:box.height*(row+.5)/8}});
}
