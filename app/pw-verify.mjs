import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const outDir = 'C:\\Users\\hwi96\\AppData\\Local\\Temp\\pw-verify';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

// Step 1: home screen
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.screenshot({ path: join(outDir, '01-home.png') });
const homeHTML = await page.content();
console.log(`HOME buttons: 설정=${homeHTML.includes('설정')} 스트레칭시작=${homeHTML.includes('스트레칭 시작')} 리워드=${homeHTML.includes('리워드')}`);

// Step 2: 설정 → back
await page.click('button:has-text("설정")');
await page.waitForTimeout(500);
await page.screenshot({ path: join(outDir, '02-settings.png') });
const settingsHTML = await page.content();
console.log(`SETTINGS loaded: ${settingsHTML.includes('알림') || settingsHTML.includes('스트레칭') || settingsHTML.length > 2000}`);
const backSel = await page.$('button');
const buttons1 = await page.$$eval('button', bs => bs.map(b => b.textContent));
console.log(`Settings buttons: ${JSON.stringify(buttons1)}`);
const homeBtn1 = await page.$('button:has-text("홈")');
if (homeBtn1) await homeBtn1.click(); else await page.click('button:first-of-type');
await page.waitForTimeout(300);
console.log(`BACK home after settings: ${(await page.content()).includes('스트레칭 시작')}`);

// Step 3: 스트레칭 시작 → back
await page.click('button:has-text("스트레칭 시작")');
await page.waitForTimeout(500);
await page.screenshot({ path: join(outDir, '04-timer.png') });
const timerHTML = await page.content();
console.log(`TIMER loaded: ${timerHTML.length > 2000}`);
const buttons2 = await page.$$eval('button', bs => bs.map(b => b.textContent));
console.log(`Timer buttons: ${JSON.stringify(buttons2)}`);
const homeBtn2 = await page.$('button:has-text("홈")');
if (homeBtn2) await homeBtn2.click(); else { const b = await page.$('button'); if(b) await b.click(); }
await page.waitForTimeout(300);
console.log(`BACK home after timer: ${(await page.content()).includes('스트레칭 시작')}`);

// Step 4: 리워드 → back
await page.click('button:has-text("리워드")');
await page.waitForTimeout(500);
await page.screenshot({ path: join(outDir, '06-reward.png') });
const rewardHTML = await page.content();
console.log(`REWARD loaded: ${rewardHTML.includes('포인트') || rewardHTML.includes('점') || rewardHTML.length > 2000}`);
const buttons3 = await page.$$eval('button', bs => bs.map(b => b.textContent));
console.log(`Reward buttons: ${JSON.stringify(buttons3)}`);
const homeBtn3 = await page.$('button:has-text("홈")');
if (homeBtn3) await homeBtn3.click(); else { const b = await page.$('button'); if(b) await b.click(); }
await page.waitForTimeout(300);
console.log(`BACK home after reward: ${(await page.content()).includes('스트레칭 시작')}`);

await browser.close();
console.log('DONE screenshots at ' + outDir);
