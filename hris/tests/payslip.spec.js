import { test, expect } from '@playwright/test';

test.describe('Payslip Flow', () => {
  test('should login as HR, navigate to payroll, run payroll and view payslip', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

    // 1. Navigate to login
    await page.goto('/');

    // 2. Login as HR
    await page.fill('input[placeholder="your@company.com"]', 'hr@company.com');
    await page.fill('input[placeholder="••••••••"]', 'hr123');
    await page.click('button:has-text("เข้าสู่ระบบ")');

    // 3. Wait for dashboard and navigate to Payroll
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'before-assertion.png' });
    
    await expect(page.getByRole('button', { name: 'เงินเดือน' })).toBeVisible({ timeout: 5000 });
    
    // Find the Payroll link precisely by looking for the anchor or button that contains 'เงินเดือน'
    await page.getByRole('button', { name: 'เงินเดือน' }).click();
    // 4. Go to Run Payroll tab
    await page.waitForTimeout(1000); // Wait for transition
    await page.screenshot({ path: 'before-run-payroll.png' });
    await page.click('text=รัน Payroll');

    // 5. Click the run payroll button (mock alert handled)
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("ยืนยันรัน Payroll")');

    // 6. Go to slip tab or summary
    await page.click('text=สรุปเงินเดือน');
    
    // Wait for the payroll data to appear
    await expect(page.locator('text=ดูสลิป').first()).toBeVisible();

    // 7. Click on the first "ดูสลิป" button
    await page.click('text=ดูสลิป >> nth=0');

    // 8. Verify slip content contains YTD and Employer SSO 
    await expect(page.locator('text=ข้อมูลสะสมรายปี (YTD) & เงินสมทบ')).toBeVisible();
    await expect(page.locator('text=เงินสมทบนายจ้าง (ประกันสังคม)')).toBeVisible();

    // 9. Click Preview
    // Setup a new page promise for the window.open call
    const [previewPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button:has-text("Preview")')
    ]);

    await previewPage.waitForLoadState();
    await expect(previewPage.locator('text=เงินสมทบนายจ้าง (ประกันสังคม)')).toBeVisible();
  });
});
