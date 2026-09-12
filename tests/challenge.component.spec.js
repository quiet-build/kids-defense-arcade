import { test, expect } from '@playwright/test';
test.describe.configure({mode:'parallel'});

async function build(game, kind, col, row) {
  await game.locator(`[data-tool="${kind}"]`).click();
  const box = await game.locator('canvas').boundingBox();
  await game.locator('canvas').click({ position: { x: box.width * (col + .5) / 12, y: box.height * (row + .5) / 8 } });
}

for (const strategy of ['pulse', 'combined']) test(`siege balance: ${strategy}`, async ({ page }, info) => {
  test.setTimeout(300000);
  await page.goto('/');
  const game = page.locator('pma-defense-arcade');
  await game.getByRole('button', { name: 'Relay siege', exact: true }).click();
  await game.getByRole('button', { name: 'Start Mission', exact: true }).click();
  const opening = strategy === 'combined'
    ? [['fighter',2,3], ['rocket',4,4], ['frost',6,4], ['fighter',8,3]]
    : [['fighter',2,3], ['fighter',4,4], ['fighter',6,4], ['fighter',8,3], ['fighter',6,3], ['fighter',8,4]];
  for (const [kind,col,row] of opening) await build(game,kind,col,row);
  const budget = Number(await game.locator('#moneyText').textContent());
  expect(budget).toBe(strategy === 'combined' ? 25 : 0);
  await page.waitForTimeout(3000);
  const waves=[];
  for (let wave=1;wave<=5;wave++) {
    if (wave > 1) {
      if (strategy === 'combined') {
        if (wave === 2) await build(game,'rocket',6,6);
        if (wave === 3) await build(game,'fighter',9,3);
        if (wave === 4) await build(game,'frost',9,5);
        if (wave === 5) await build(game,'rocket',8,4);
      } else {
        const sites=[[4,3],[4,6],[8,5],[9,3],[9,5],[8,1],[2,1],[2,4]];
        for (const [col,row] of sites.splice((wave-2)*2,2)) if (Number(await game.locator('#moneyText').textContent())>=40) await build(game,'fighter',col,row);
      }
    }
    await game.getByRole('button',{name:'Start Wave',exact:true}).click();
    for(let tick=0;tick<110;tick++) {
      await page.waitForTimeout(1000);
      if (await game.locator('.app').getAttribute('data-phase') === 'ended' || await game.locator('.app').getAttribute('data-spawning') === '0') break;
    }
    console.log(`${strategy}: wave ${wave} finished`);
    waves.push({wave,core:await game.locator('#baseText').textContent(),credits:await game.locator('#moneyText').textContent()});
    if (await game.locator('.app').getAttribute('data-phase') === 'ended') break;
    await expect(game.locator('#waveButton')).toBeEnabled();
    const layout=await game.locator('#designText').textContent();
    await page.waitForTimeout(10000);
    await expect(game.locator('.app')).toHaveAttribute('data-spawning','0');
    await expect(game.locator('#designText')).toHaveText(layout);
  }
  const report={strategy,waves,result:await game.locator('#debriefTitle').textContent(),details:await game.locator('#debriefHint').textContent()};
  console.log(JSON.stringify(report));
  await info.attach('balance',{body:JSON.stringify(report,null,2),contentType:'application/json'});
  await expect(game.locator('#debrief')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.rounds.length)).toBe(1);
  if(strategy==='combined') await expect(game.locator('#debriefTitle')).toHaveText('Relay secured.');
  else expect(Number(waves.at(-1).core)).toBeLessThan(12);
  await game.getByRole('button',{name:'Retry Mission',exact:true}).click();
  await expect(game.locator('#moneyText')).toHaveText('240');
  await expect(game.locator('.app')).toHaveAttribute('data-built','0');
  await expect(game.locator('.app')).toHaveAttribute('data-enemies','0');
});
