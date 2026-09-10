import { test, expect } from "@playwright/test";

test("opens the first garden, builds, refunds, and keeps the path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Candy Garden" })).toBeVisible();
  await expect(page.locator("#game canvas")).toBeVisible();
  await page.locator("#difficulty").selectOption("rookie", { force: true });
  await page.getByRole("button", { name: "Start Mission" }).click();
  await expect(page.locator("#baseText")).toHaveText("10");
  await expect(page.locator("#moneyText")).toHaveText("160");
  await expect(page.locator("#designText")).toHaveText("Switchback");
  await expect(page.locator("#bossText")).not.toHaveText("Standby");
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeEnabled();
  await page.locator("#game canvas").click({ position: { x: 120, y: 120 } });
  await expect(page.locator("#moneyText")).toHaveText("120");
  await expect(page.locator("#message")).toContainText("being built");
  await page.getByRole("button", { name: /Cookie Wall/ }).click();
  await page.locator("#game canvas").click({ position: { x: 40, y: 360 } });
  await expect(page.locator("#moneyText")).toHaveText("85");
  await expect(page.locator(".app")).toHaveAttribute("data-built", "2");
  await page.waitForTimeout(7000);
  await expect(page.locator(".app")).toHaveAttribute("data-built", "2");
  await expect(page.locator(".app")).toHaveAttribute("data-spawning", "0");
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeEnabled();
  await page.getByRole("button", { name: /Remove/ }).click();
  await page.locator("#game canvas").click({ position: { x: 120, y: 120 } });
  await expect(page.locator("#moneyText")).toHaveText("105");
});

test("keeps setup collapsed until Start Mission and names tower jobs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fast single")).toBeVisible();
  await expect(page.getByText("Splash")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeDisabled();
  await page.getByRole("button", { name: "Start Mission" }).click();
  await expect(page.locator(".briefing")).toBeHidden();
  await expect(page.getByRole("button", { name: /Lollipop Tower/ })).toBeVisible();
});
