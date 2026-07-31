const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.fill('input[placeholder="your@company.com"]', 'hr@company.com');
  await page.fill('input[placeholder="••••••••"]', 'hr123');
  await page.click('button:has-text("เข้าสู่ระบบ")');
  await page.waitForTimeout(2000);
  const html = await page.content();
  require('fs').writeFileSync('dom.html', html);
  await browser.close();
})();
