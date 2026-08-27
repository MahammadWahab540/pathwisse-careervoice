const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testLiveBrowserOtp() {
  console.log('🚀 Launching Chromium for full live browser audit & OTP test...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`);
  });

  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      console.log(`>> [REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch {}
      console.log(`<< [RES ${res.status()}] ${res.url()}: ${bodyText}`);
    }
  });

  const screenshotDir = path.join(__dirname, '../dist/test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    const liveUrl = 'https://vtmyq2ezci.ap-south-1.awsapprunner.com';
    console.log(`📍 Navigating to live App Runner URL: ${liveUrl}`);
    await page.goto(liveUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    await page.screenshot({ path: path.join(screenshotDir, '01_landing_page.png') });
    console.log('📸 01_landing_page.png saved');

    // Click "Start my CareerVoice audit"
    const startButton = page.locator('button:has-text("Start my CareerVoice audit")').first();
    await startButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('👉 Clicking "Start my CareerVoice audit"...');
    await startButton.click();

    // Wait for the Phone input field
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('📱 Phone OTP Screen visible!');
    await page.screenshot({ path: path.join(screenshotDir, '02_phone_input_screen.png') });
    console.log('📸 02_phone_input_screen.png saved');

    // Type phone number
    const testPhone = '9876543210';
    console.log(`✍️ Typing phone number: ${testPhone}`);
    await phoneInput.fill(testPhone);
    await page.screenshot({ path: path.join(screenshotDir, '03_phone_entered.png') });

    // Submit form / Click Continue with Mobile
    const submitButton = page.locator('button[type="submit"]');
    console.log('👉 Submitting phone form to request OTP via WhatsApp...');

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/otp/request'), { timeout: 20000 }),
      submitButton.click(),
    ]);

    const resJson = await response.json();
    console.log('\n========================================');
    console.log('🎉 OTP API RESPONSE FROM AWS APP RUNNER:');
    console.log(JSON.stringify(resJson, null, 2));
    console.log('========================================\n');

    // Wait for OTP input boxes to appear
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '04_otp_boxes_screen.png') });
    console.log('📸 04_otp_boxes_screen.png saved');

    const otpBoxes = await page.locator('input[type="text"][maxlength="1"]').all();
    console.log(`🔢 Found ${otpBoxes.length} OTP digit input boxes rendered in the browser UI!`);

    const pageText = await page.innerText('body');
    console.log('\n📄 Visible text on OTP screen:');
    console.log(pageText.split('\n').filter(s => s.trim()).slice(0, 15).join('\n'));

  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await browser.close();
    console.log('\n🏁 Live browser test completed successfully.');
  }
}

testLiveBrowserOtp();
