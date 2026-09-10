import { test, expect } from "@playwright/test";

test("switches themes, starts with 600 credits, builds and removes units", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Monster Base Defense" })).toBeVisible();
  await expect(page.locator("#game canvas")).toBeVisible();

  await page.locator("#difficulty").selectOption("rookie");
  await page.locator("#endlessMode").check();
  await page.getByRole("button", { name: "Start Mission" }).click();

  await expect(page.locator("#baseText")).toHaveText("32");
  await expect(page.locator("#moneyText")).toHaveText("600");
  await expect(page.locator("#designText")).toHaveText("Switchback");
  await expect(page.locator("#bossText")).not.toHaveText("Standby");
  await expect(page.getByRole("button", { name: "Start Wave" })).toBeEnabled();

  await page.locator("#game canvas").click({ position: { x: 120, y: 120 } });
  await expect(page.locator("#moneyText")).toHaveText("545");
  await expect(page.locator("#message")).toContainText("being built");

  await page.getByRole("button", { name: /Steel Wall/ }).click();
  await page.locator("#game canvas").click({ position: { x: 40, y: 360 } });
  await expect(page.locator("#moneyText")).toHaveText("500");

  await page.getByRole("button", { name: /Remove/ }).click();
  await page.locator("#game canvas").click({ position: { x: 120, y: 120 } });
  await expect(page.locator("#moneyText")).toHaveText("528");

  await page.locator("#themeSelect").selectOption("candy");
  await expect(page.getByRole("heading", { name: "Candy Garden Defense" })).toBeVisible();
  await page.getByRole("button", { name: "Start Mission" }).click();
  await expect(page.locator("#moneyText")).toHaveText("600");
  await expect(page.getByRole("button", { name: /Lollipop Tower/ })).toBeVisible();
});
