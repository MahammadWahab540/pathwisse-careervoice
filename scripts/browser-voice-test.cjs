const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runBrowserVoiceTest() {
  console.log('🚀 Launching headless Chromium with fake audio stream and mic permissions...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
    ],
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => {
    const logStr = `[Browser ${msg.type()}]: ${msg.text()}`;
    consoleLogs.push(logStr);
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(logStr);
    }
  });

  page.on('pageerror', (err) => {
    console.error('❌ Page Unhandled Error:', err.message);
  });

  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      console.log(`🌐 [API Request]: ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      console.log(`📥 [API Response]: ${res.status()} ${res.url()}`);
    }
  });

  try {
    console.log('📍 Navigating to http://localhost:5000...');
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle', timeout: 15000 });
    
    const screenshotDir = path.join(__dirname, '../dist/test-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    await page.screenshot({ path: path.join(screenshotDir, '01_landing.png') });
    console.log('📸 Captured 01_landing.png');

    const title = await page.title();
    console.log(`ℹ️ Page Title: ${title}`);

    // Click Start/Begin button
    const startButton = page.locator('button').filter({ hasText: /Start|Begin|Audit|Launch|Discover/i }).first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      console.log(`👉 Clicking button: ${await startButton.innerText()}`);
      await startButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, '02_after_start.png') });
    }

    // Step through interactive onboarding steps
    for (let step = 0; step < 8; step++) {
      // If text input is visible (e.g. name, phone)
      const input = page.locator('input[type="text"], input[type="tel"]').first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        const val = await input.inputValue();
        if (!val) {
          console.log('📝 Filling input field...');
          await input.fill('Mahammad Wahab');
          await page.waitForTimeout(500);
        }
      }

      // If submit / continue button is enabled
      const continueBtn = page.locator('button').filter({ hasText: /Continue|Next|Confirm|Submit|Select/i }).first();
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        const isEnabled = await continueBtn.isEnabled();
        if (isEnabled) {
          console.log(`👉 Clicking continue: ${await continueBtn.innerText()}`);
          await continueBtn.click();
          await page.waitForTimeout(1000);
          continue;
        }
      }

      // If choice buttons exist
      const choiceBtn = page.locator('button').filter({ hasText: /B\.Tech|Computer Science|Tier|Year|Full Stack|Frontend|Backend|Developer/i }).first();
      if (await choiceBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`👉 Selecting choice: ${await choiceBtn.innerText()}`);
        await choiceBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: path.join(screenshotDir, '03_interview_flow.png') });
    console.log('📸 Captured 03_interview_flow.png');

    // Test API call to /api/voice/session directly within browser context
    console.log('🧪 Triggering /api/voice/session within browser fetch context...');
    const voiceSessionResult = await page.evaluate(async () => {
      const res = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: 'browser-test-' + Date.now(),
          targetRole: 'Full Stack Engineer',
          studentName: 'Browser Test User',
          transport: 'daily',
        }),
      });
      return {
        status: res.status,
        data: await res.json(),
      };
    });

    console.log('🎙️ In-Browser Voice Session Result:');
    console.log(JSON.stringify(voiceSessionResult, null, 2));

    await page.screenshot({ path: path.join(screenshotDir, '04_voice_state.png') });
    console.log('📸 Captured 04_voice_state.png');

    console.log('🎉 Browser automated testing completed successfully!');
  } catch (err) {
    console.error('❌ Browser testing error:', err);
  } finally {
    await browser.close();
  }
}

runBrowserVoiceTest();
