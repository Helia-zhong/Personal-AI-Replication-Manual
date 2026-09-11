const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
test.beforeEach(async ({ request }) => {
  await request.put('/api/settings', { data: {} });
});

test('new document, edit, reject fabricated quote, approve, persist and export', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('任务标题').fill('UI workflow ' + Date.now());
  await page.getByLabel('原始资料', { exact: true }).fill('# Delivery\nDecision: keep evidence.\nTODO: test the export.\nResult: review is required.');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('待审核');
  const runUrl = page.url();
  await page.reload();
  await expect(page.locator('.evidence-item')).toHaveCount(3);
  await page.getByLabel('第 1 条引用').fill('invented');
  await page.getByLabel('我已核对引用与分类').check();
  await page.getByRole('button', { name: '通过并生成报告' }).click();
  await expect(page.locator('#toast')).toContainText('引用必须');
  await page.getByLabel('第 1 条引用').fill('Decision: keep evidence.');
  await page.getByLabel('第 1 条分类').selectOption('finding');
  await page.getByRole('button', { name: '移除第 3 条' }).click();
  await page.getByRole('button', { name: '通过并生成报告' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('已完成');
  await expect(page.locator('.evidence-item')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.report-preview')).toContainText('TODO: test the export.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载报告', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  expect(fs.readFileSync(await download.path(), 'utf8')).toContain('Source SHA-256');
  await page.goto('/runs.html');
  await page.getByRole('searchbox').fill('UI workflow');
  await expect(page.locator('.run-row').first()).toBeVisible();
  await page.goto(runUrl);
  expect(errors).toEqual([]);
});

test('cancel, retry, reject and saved configuration', async ({ page }) => {
  await page.goto('/settings.html');
  await page.getByLabel('提取上限').fill('3');
  await page.getByRole('button', { name: '保存设置' }).click();
  await expect(page.locator('#toast')).toContainText('配置已保存');
  await page.reload();
  await expect(page.getByLabel('提取上限')).toHaveValue('3');
  await page.goto('/');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('待审核');
  await expect(page.locator('.evidence-item')).toHaveCount(3);
  await page.getByRole('button', { name: '取消运行' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('已取消');
  await page.getByRole('button', { name: '重新运行' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('待审核');
  await page.getByRole('button', { name: '退回', exact: true }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('已退回');
});

test('offline file preview operates without API or network assets', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(path.resolve(__dirname, '../../index.html')).href);
  await expect(page.locator('.runtime-chip')).toContainText('浏览器规则演示');
  await page.getByLabel('任务标题').fill('Offline record');
  await page.getByLabel('原始资料', { exact: true }).fill('待办：测试离线运行。\n决定：采用引用校验。');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('待审核');
  await page.getByLabel('我已核对引用与分类').check();
  await page.getByRole('button', { name: '通过并生成报告' }).click();
  await expect(page.locator('.report-preview')).toContainText('browser-rules');
  expect(requests).toEqual([]);
});

test('startup API failure displays a recoverable error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/settings', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Workspace temporarily unavailable' })
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '工作区暂时无法打开' })).toBeVisible();
  await expect(page.locator('.empty')).toContainText('Workspace temporarily unavailable');
  await page.unroute('**/api/settings');
  await page.getByRole('link', { name: '返回工作台' }).click();
  await expect(page.getByRole('button', { name: '开始处理' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile import rejects invalid files and escapes source HTML', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('导入文本', { exact: true }).setInputFiles({
    name: 'bad.md', mimeType: 'text/markdown', buffer: Buffer.from([0xff, 0xfe, 0xff])
  });
  await expect(page.locator('#toast')).toHaveClass('show');
  await page.getByLabel('导入文本', { exact: true }).setInputFiles({
    name: 'source.md', mimeType: 'text/markdown', buffer: Buffer.from('# Notes\nTODO: show <img src=x onerror=alert(1)> literally.')
  });
  await expect(page.getByLabel('任务标题')).toHaveValue('source');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('待审核');
  await expect(page.locator('.source-lines img')).toHaveCount(0);
  await expect(page.locator('.evidence-item')).toHaveCount(1);
  await page.getByLabel('我已核对引用与分类').check();
  await page.getByRole('button', { name: '通过并生成报告' }).click();
  await expect(page.locator('.run-meta .badge')).toHaveText('已完成');
});

for (const width of [1440, 390]) {
  test('all pages render without overflow at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const filename of ['index.html', 'runs.html', 'review.html', 'evals.html', 'prompts.html', 'settings.html']) {
      await page.goto('/' + filename);
      await expect(page.locator('h1')).toBeVisible();
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        icons: document.querySelectorAll('svg.lucide').length,
      }));
      expect(layout.overflow).toBe(false);
      expect(layout.icons).toBeGreaterThan(5);
      await page.screenshot({ path: testInfo.outputPath(width + '-' + filename + '.png'), fullPage: true });
    }
    await page.goto('/');
    await page.getByRole('button', { name: '开始处理' }).click();
    await expect(page.locator('.run-meta .badge')).toHaveText('待审核');
    await page.screenshot({ path: testInfo.outputPath(width + '-review-detail.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}
