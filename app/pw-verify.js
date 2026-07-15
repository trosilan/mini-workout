const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const outDir = 'C:\\Users\\hwi96\\AppData\\Local\\Temp\\pw-verify';
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  // Step 1: Load home screen
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01-home.png') });
  const homeText = await page.content();
  const hasSettings = homeText.includes('설정');
  const hasTimer = homeText.includes('스트레칭 시작');
  const hasReward = homeText.includes('리워드');
  console.log(`HOME: 설정=${hasSettings} 스트레칭시작=${hasTimer} 리워드=${hasReward}`);

  // Step 2: Click 설정 → verify SettingsPage → back
  await page.click('button:has-text("설정")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '02-settings.png') });
  const settingsContent = await page.content();
  console.log(`SETTINGS page loaded: ${settingsContent.includes('알림') || settingsContent.includes('설정')}`);
  await page.click('button:has-text("홈")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, '03-back-home.png') });
  console.log(`BACK to home after settings: ${(await page.content()).includes('스트레칭 시작')}`);

  // Step 3: Click 스트레칭 시작 → verify TimerPage → back
  await page.click('button:has-text("스트레칭 시작")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '04-timer.png') });
  const timerContent = await page.content();
  console.log(`TIMER page loaded: ${timerContent.includes('스트레칭') || timerContent.includes('타이머') || timerContent.includes('시작')}`);
  const backBtn = await page.$('button:has-text("홈")');
  if (backBtn) { await backBtn.click(); } else { await page.goBack(); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, '05-back-home2.png') });
  console.log(`BACK to home after timer: ${(await page.content()).includes('스트레칭 시작')}`);

  // Step 4: Click 리워드 → verify RewardPage → back
  await page.click('button:has-text("리워드")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '06-reward.png') });
  const rewardContent = await page.content();
  console.log(`REWARD page loaded: ${rewardContent.includes('포인트') || rewardContent.includes('리워드') || rewardContent.includes('점')}`);
  const backBtn2 = await page.$('button:has-text("홈")');
  if (backBtn2) { await backBtn2.click(); } else { await page.goBack(); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, '07-back-home3.png') });
  console.log(`BACK to home after reward: ${(await page.content()).includes('스트레칭 시작')}`);

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
