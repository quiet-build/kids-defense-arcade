import { test, expect } from "@playwright/test";
test.use({ browserName: "webkit", launchOptions: {} });
test("tower controls stay playable after board focus and resume", async ({ page }) => {
  await page.goto("/");
  const game = page.locator("pma-defense-arcade");
  await game.getByRole("button", { name: "Start Mission", exact: true }).click();
  await expect(game.locator(".app")).toHaveAttribute("data-phase", "play");
  for (let round = 0; round < 2; round++) {
    await game.locator("canvas").click({ position: { x: 8, y: 8 } });
    await game.getByRole("button", { name: /Pulse turret/ }).click();
    await expect(game.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(game.getByRole("button", { name: /Pulse turret/ })).toHaveClass(/active/);
    await page.getByLabel("Host text").click();
    await game.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(game.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  }
});

test("expanded setup can close, reopen and deploy at every layout width", async ({ page }) => {
  await page.goto("/");
  const game = page.locator("pma-defense-arcade");
  for (const width of [900, 600, 390, 320]) {
    await game.evaluate((element, width) => { element.style.width = `${width}px`; }, width);
    const briefing = game.locator("#briefing");
    await game.locator(".setup").evaluate(element => { element.open = true; });
    const stage = await game.locator(".stage").boundingBox();
    const sheet = await briefing.boundingBox();
    expect(sheet.y).toBeGreaterThanOrEqual(stage.y);
    expect(sheet.y + sheet.height).toBeLessThanOrEqual(stage.y + stage.height);
    await game.getByRole("button", { name: "Close setup" }).click();
    await expect(briefing).toBeHidden();
    await expect(game.locator("#startButton")).toBeFocused();
    await game.getByRole("button", { name: "Sectors", exact: true }).click();
    await expect(briefing).toBeVisible();
    await briefing.getByRole("button", { name: "Deploy sector" }).click();
    await expect(briefing).toBeHidden();
    await expect(game.locator(".app")).toHaveAttribute("data-phase", "play");
    await expect(game.locator("#game")).toBeFocused();
    await game.getByRole("button", { name: "Start Wave", exact: true }).click();
    await expect(game.locator("#pressure")).toContainText("inbound");
    await game.getByRole("button", { name: "Sectors", exact: true }).click();
  }
});
