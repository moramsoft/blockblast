import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const ARTIFACT_DIR = '/Users/seunghwanson/.gemini/antigravity/brain/1b36694b-f4b6-4de5-841f-60e3e63a8c56';

test.describe('Visual Aesthetic & Cross-Device Proportional Scaling Test (iPhone vs iPad)', () => {
  test('Aesthetic Verification: iPhone vs iPad Proportional Scaling & Zero-Clash Checks', async ({ browser }) => {
    // 1. iPhone 15 Pro Emulation
    const iphoneContext = await browser.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const iphonePage = await iphoneContext.newPage();
    await iphonePage.goto('/');
    await iphonePage.waitForTimeout(500);

    // Capture iPhone Title Screen
    const iphoneTitlePath = `${ARTIFACT_DIR}/title-iphone.png`;
    await iphonePage.screenshot({ path: iphoneTitlePath });
    expect(fs.existsSync(iphoneTitlePath)).toBe(true);

    const iphoneTitleMetrics = await iphonePage.evaluate(() => {
      const emblem = document.querySelector('.logo-emblem')!.getBoundingClientRect();
      const mascot = document.querySelector('.mascot')!.getBoundingClientRect();
      const playBtn = document.querySelector('#startRelaxedBtn')!.getBoundingClientRect();
      const titleScreen = document.getElementById('titleScreen')!;
      return {
        emblemW: emblem.width,
        mascotW: mascot.width,
        playBtnH: playBtn.height,
        scrollHeight: titleScreen.scrollHeight,
        clientHeight: titleScreen.clientHeight,
      };
    });

    // iPhone Title must not scroll
    expect(iphoneTitleMetrics.scrollHeight).toBe(iphoneTitleMetrics.clientHeight);

    // Enter in-game on iPhone
    await iphonePage.click('#startRelaxedBtn');
    await iphonePage.waitForTimeout(400);

    const iphoneIngamePath = `${ARTIFACT_DIR}/ingame-iphone.png`;
    await iphonePage.screenshot({ path: iphoneIngamePath });

    // Long-press Hammer to capture explanation tooltip on iPhone
    const iphoneHammer = await iphonePage.locator('#hammerBoosterBtn').boundingBox();
    if (iphoneHammer) {
      await iphonePage.mouse.move(iphoneHammer.x + iphoneHammer.width / 2, iphoneHammer.y + iphoneHammer.height / 2);
      await iphonePage.mouse.down();
      await iphonePage.waitForTimeout(550);
      await iphonePage.mouse.up();
      await iphonePage.waitForTimeout(250);
      await iphonePage.screenshot({ path: `${ARTIFACT_DIR}/tooltip-iphone.png` });
      await iphonePage.locator('#closeBoosterTooltipBtn').click();
    }

    const iphoneIngameMetrics = await iphonePage.evaluate(() => {
      const app = document.getElementById('app')!.getBoundingClientRect();
      const homeBtn = document.getElementById('homeBtn')!.getBoundingClientRect();
      const scoreCenter = document.querySelector('.score-center')!.getBoundingClientRect();
      const undoBtn = document.getElementById('undoBtn')!.getBoundingClientRect();
      const undoSvg = document.querySelector('#undoBtn .action-svg')!.getBoundingClientRect();
      const canvas = document.getElementById('gameCanvas')!.getBoundingClientRect();
      const boosterBtns = Array.from(document.querySelectorAll('.booster-bar .action-btn')).map((el) =>
        el.getBoundingClientRect()
      );
      const appMid = app.left + app.width / 2;
      const scoreMid = scoreCenter.left + scoreCenter.width / 2;
      return {
        topBtnW: homeBtn.width,
        boosterBtnW: undoBtn.width,
        boosterSvgW: undoSvg.width,
        canvasW: canvas.width,
        boosterBtns,
        appMid,
        scoreMid,
        scoreCenterOffset: Math.abs(scoreMid - appMid),
      };
    });

    // Score center must be dead-centered on iPhone (offset <= 2px)
    expect(iphoneIngameMetrics.scoreCenterOffset).toBeLessThanOrEqual(2);

    // Check booster buttons do not overlap horizontally on iPhone
    for (let i = 0; i < iphoneIngameMetrics.boosterBtns.length - 1; i++) {
      const cur = iphoneIngameMetrics.boosterBtns[i];
      const next = iphoneIngameMetrics.boosterBtns[i + 1];
      expect(next.left).toBeGreaterThan(cur.right);
    }

    // 2. iPad Pro 11-inch Emulation
    const ipadContext = await browser.newContext({
      viewport: { width: 834, height: 1194 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const ipadPage = await ipadContext.newPage();
    await ipadPage.goto('/');
    await ipadPage.waitForTimeout(500);

    // Capture iPad Title Screen
    const ipadTitlePath = `${ARTIFACT_DIR}/title-ipad.png`;
    await ipadPage.screenshot({ path: ipadTitlePath });

    const ipadTitleMetrics = await ipadPage.evaluate(() => {
      const emblem = document.querySelector('.logo-emblem')!.getBoundingClientRect();
      const mascot = document.querySelector('.mascot')!.getBoundingClientRect();
      const playBtn = document.querySelector('#startRelaxedBtn')!.getBoundingClientRect();
      const titleScreen = document.getElementById('titleScreen')!;
      return {
        emblemW: emblem.width,
        mascotW: mascot.width,
        playBtnH: playBtn.height,
        scrollHeight: titleScreen.scrollHeight,
        clientHeight: titleScreen.clientHeight,
      };
    });

    // iPad Title must not scroll
    expect(ipadTitleMetrics.scrollHeight).toBe(ipadTitleMetrics.clientHeight);

    // Enter in-game on iPad
    await ipadPage.click('#startRelaxedBtn');
    await ipadPage.waitForTimeout(400);

    const ipadIngamePath = `${ARTIFACT_DIR}/ingame-ipad.png`;
    await ipadPage.screenshot({ path: ipadIngamePath });

    // Long-press Hammer to capture explanation tooltip on iPad
    const ipadHammer = await ipadPage.locator('#hammerBoosterBtn').boundingBox();
    if (ipadHammer) {
      await ipadPage.mouse.move(ipadHammer.x + ipadHammer.width / 2, ipadHammer.y + ipadHammer.height / 2);
      await ipadPage.mouse.down();
      await ipadPage.waitForTimeout(550);
      await ipadPage.mouse.up();
      await ipadPage.waitForTimeout(250);
      await ipadPage.screenshot({ path: `${ARTIFACT_DIR}/tooltip-ipad.png` });
      await ipadPage.locator('#closeBoosterTooltipBtn').click();
    }

    const ipadIngameMetrics = await ipadPage.evaluate(() => {
      const app = document.getElementById('app')!.getBoundingClientRect();
      const homeBtn = document.getElementById('homeBtn')!.getBoundingClientRect();
      const scoreCenter = document.querySelector('.score-center')!.getBoundingClientRect();
      const undoBtn = document.getElementById('undoBtn')!.getBoundingClientRect();
      const undoSvg = document.querySelector('#undoBtn .action-svg')!.getBoundingClientRect();
      const canvas = document.getElementById('gameCanvas')!.getBoundingClientRect();
      const boosterBtns = Array.from(document.querySelectorAll('.booster-bar .action-btn')).map((el) =>
        el.getBoundingClientRect()
      );
      const appMid = app.left + app.width / 2;
      const scoreMid = scoreCenter.left + scoreCenter.width / 2;
      return {
        topBtnW: homeBtn.width,
        boosterBtnW: undoBtn.width,
        boosterSvgW: undoSvg.width,
        canvasW: canvas.width,
        boosterBtns,
        appMid,
        scoreMid,
        scoreCenterOffset: Math.abs(scoreMid - appMid),
      };
    });

    // Score center must be dead-centered on iPad (offset <= 2px)
    expect(ipadIngameMetrics.scoreCenterOffset).toBeLessThanOrEqual(2);

    // Check booster buttons do not overlap horizontally on iPad
    for (let i = 0; i < ipadIngameMetrics.boosterBtns.length - 1; i++) {
      const cur = ipadIngameMetrics.boosterBtns[i];
      const next = ipadIngameMetrics.boosterBtns[i + 1];
      expect(next.left).toBeGreaterThan(cur.right);
    }

    // 3. Proportional Scaling Validation: iPad vs iPhone
    console.log('--- Proportional Scaling Verification ---');
    console.log(`Top Button: iPhone ${iphoneIngameMetrics.topBtnW}px -> iPad ${ipadIngameMetrics.topBtnW}px (Ratio: ${(ipadIngameMetrics.topBtnW / iphoneIngameMetrics.topBtnW).toFixed(2)}x)`);
    console.log(`Booster Button: iPhone ${iphoneIngameMetrics.boosterBtnW}px -> iPad ${ipadIngameMetrics.boosterBtnW}px (Ratio: ${(ipadIngameMetrics.boosterBtnW / iphoneIngameMetrics.boosterBtnW).toFixed(2)}x)`);
    console.log(`Booster Icon SVG: iPhone ${iphoneIngameMetrics.boosterSvgW}px -> iPad ${ipadIngameMetrics.boosterSvgW}px (Ratio: ${(ipadIngameMetrics.boosterSvgW / iphoneIngameMetrics.boosterSvgW).toFixed(2)}x)`);
    console.log(`Title Emblem: iPhone ${iphoneTitleMetrics.emblemW}px -> iPad ${ipadTitleMetrics.emblemW}px (Ratio: ${(ipadTitleMetrics.emblemW / iphoneTitleMetrics.emblemW).toFixed(2)}x)`);
    console.log(`Title Mascot: iPhone ${iphoneTitleMetrics.mascotW}px -> iPad ${ipadTitleMetrics.mascotW}px (Ratio: ${(ipadTitleMetrics.mascotW / iphoneTitleMetrics.mascotW).toFixed(2)}x)`);

    // Verify proportional scaling ratios:
    // iPad elements MUST be at least 1.35x larger than iPhone elements
    expect(ipadIngameMetrics.boosterBtnW / iphoneIngameMetrics.boosterBtnW).toBeGreaterThanOrEqual(1.35);
    expect(ipadIngameMetrics.boosterSvgW / iphoneIngameMetrics.boosterSvgW).toBeGreaterThanOrEqual(1.35);
    expect(ipadIngameMetrics.topBtnW / iphoneIngameMetrics.topBtnW).toBeGreaterThanOrEqual(1.35);
    expect(ipadTitleMetrics.emblemW / iphoneTitleMetrics.emblemW).toBeGreaterThanOrEqual(1.35);
    expect(ipadTitleMetrics.mascotW / iphoneTitleMetrics.mascotW).toBeGreaterThanOrEqual(1.35);

    // Cleanup
    await iphoneContext.close();
    await ipadContext.close();
  });
});
