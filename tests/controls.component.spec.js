import { test, expect } from "@playwright/test";
test.use({ browserName: "webkit", launchOptions: {} });
test("tower controls stay playable after board focus and resume", async ({ page }) => {
  await page.goto("/");
  const game = page.locator("pma-defense-arcade");
  await game.getByRole("button", { name: "Start Mission", exact: true }).click();
  for (let round = 0; round < 2; round++) {
    await game.locator("canvas").click({ position: { x: 8, y: 8 } });
    await game.getByRole("button", { name: /Rocket Squad/ }).click();
    await expect(game.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(game.getByRole("button", { name: /Rocket Squad/ })).toHaveClass(/active/);
    await page.getByLabel("Host text").click();
    await game.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(game.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  }
});
