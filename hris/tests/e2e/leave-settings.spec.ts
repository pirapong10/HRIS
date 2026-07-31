import { test, expect } from '@playwright/test';

test.describe('Leave Policy Settings UAT', () => {
  // Before each test, navigate to the Settings page
  test.beforeEach(async ({ page }) => {
    // 1. Navigate to the login page first
    await page.goto('/login');

    // 2. Perform Login with the admin credentials
    await page.getByPlaceholder('your@company.com').fill('admin@company.com');
    await page.getByPlaceholder('••••••••').fill('Admin@123!');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();

    // 3. Wait for the URL to change to the authenticated state (e.g., dashboard)
    await page.waitForURL('**/dashboard');

    // 4. Navigate to the settings route
    await page.goto('/settings');

    // 5. Click on the "การลา" (Leave) tab to reveal the Leave Policy settings components
    await page.getByRole('button', { name: 'การลา' }).click();
  });

  test('Test Case 1 - Probation Policy Update', async ({ page }) => {
    // 1. Locate the "Probation Policy" card and click "แก้ไข" (Edit)
    // We scope to the Probation card by finding the header text and selecting the Edit button within its context.
    const probationCard = page.locator('div').filter({ hasText: /^นโยบายช่วงทดลองงาน \(Probation Policy\)/ }).first();
    await probationCard.getByRole('button', { name: 'แก้ไข' }).click();

    // 2. Fill the probation days input with a new value
    const probationDaysInput = page.getByRole('spinbutton');
    await expect(probationDaysInput).toBeVisible();
    await probationDaysInput.fill('90');

    // 3. Intercept the PUT request to the probation-policy endpoint
    // The endpoint based on the controller is PUT /api/leave-policies/probation/:id
    const savePromise = page.waitForResponse(
      (response) => response.url().includes('/leave-policies/probation/') && response.request().method() === 'PUT'
    );

    // 4. Click "Save/บันทึก" inside the modal
    // We use the button role matching 'บันทึก' (Save)
    await page.getByRole('button', { name: 'บันทึก' }).click();

    // 5. Assert the network request was successful (200 OK)
    const response = await savePromise;
    expect(response.status()).toBe(200);

    // 6. Assert a success Toast is visible
    const toast = page.locator('text=บันทึกสำเร็จ');
    await expect(toast).toBeVisible();
  });

  test('Test Case 2 - Leave Entitlement Rules (Array State stability)', async ({ page }) => {
    // 1. Locate a leave policy row (e.g., Annual Leave) and click "View / Edit Rules"
    await page.getByRole('button', { name: 'View / Edit Rules' }).first().click();

    // Wait for the policy modal to become fully visible by checking for the modal's specific heading
    await expect(page.getByText('ตั้งค่านโยบายการลา')).toBeVisible();

    // 2. Click "Add Tier / เพิ่มเงื่อนไข"
    await page.getByRole('button', { name: '+ เพิ่มเงื่อนไข' }).click();

    // 3. Fill the dynamically created inputs
    // The page has multiple tables (background and modal). The modal's table is the last one in the DOM.
    const modalTable = page.getByRole('table').last();
    const newRow = modalTable.getByRole('row').last(); 

    // Fill minYearsOfService (1st spinbutton), maxYearsOfService (2nd), entitledDays (3rd)
    await newRow.getByRole('spinbutton').nth(0).fill('1');
    await newRow.getByRole('spinbutton').nth(1).fill('5');
    await newRow.getByRole('spinbutton').nth(2).fill('12');

    // 4. Intercept the PUT /api/leave-policies/:id request to capture the payload
    let requestPayload: any = null;
    await page.route('**/leave-policies/*', async (route) => {
      if (route.request().method() === 'PUT') {
        requestPayload = route.request().postDataJSON();
        await route.continue();
      } else {
        await route.fallback();
      }
    });

    const savePromise = page.waitForResponse(
      (response) => response.url().includes('/leave-policies/') && !response.url().includes('/probation') && response.request().method() === 'PUT'
    );

    // 5. Click "Save"
    await page.getByRole('button', { name: 'บันทึก' }).click();
    
    // 6. Assert the network response is 200
    const response = await savePromise;
    expect(response.status()).toBe(200);

    // Assert the network payload contains the newly added tier
    expect(requestPayload).not.toBeNull();
    const rules = requestPayload.rules || [];
    
    // Check if our dynamically added rules exist in the payload accurately
    const addedTier = rules.find((r: any) => 
      r.minYearsOfService === 1 && r.maxYearsOfService === 5 && r.entitledDays === 12
    );
    expect(addedTier).toBeDefined();

    // Assert a success Toast appears
    await expect(page.locator('text=บันทึกสำเร็จ')).toBeVisible();
  });

  test('Test Case 3 - Recalculate Balances (Dialog handling)', async ({ page }) => {
    // 2. Handle the window.confirm dialog automatically
    // We register the dialog listener before triggering the action
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('การคำนวณใหม่จะตรวจสอบและสร้างโควต้าสำหรับพนักงานทุกคนในปีนี้');
      await dialog.accept();
    });

    // 3. Intercept the POST /api/leave-policies/recalculate request
    const recalculatePromise = page.waitForResponse(
      (response) => response.url().includes('/leave-policies/recalculate') && response.request().method() === 'POST'
    );

    // 1. Click the "Recalculate All Balances" button
    await page.getByRole('button', { name: 'Recalculate All Balances' }).click();

    // 4. Assert the network response is 200
    const response = await recalculatePromise;
    expect(response.status()).toBe(200);

    // 5. Assert the success Toast appears
    const toast = page.locator('text=คำนวณโควต้าวันลาใหม่สำเร็จ');
    await expect(toast).toBeVisible();
  });
});
