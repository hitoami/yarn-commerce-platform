#!/usr/bin/env node
// 把线上页面按手机 390 宽原样送进 Figma，作为现状稿（#218）。不需要手动开 DevTools 手机模拟。
//
// 用法：node scripts/figma-capture.cjs <页面 URL> <captureId> [--desktop]
// captureId 来自 Figma MCP 的 generate_figma_design。送进去之后用同一个 captureId 查询结果。

const config = require('./proof.config.cjs');

const [url, captureId, flag] = process.argv.slice(2);
if (!url || !captureId) {
  console.error('用法：node scripts/figma-capture.cjs <页面 URL> <captureId> [--desktop]');
  process.exit(2);
}
const viewport = config.viewports.find(item => item.key === (flag === '--desktop' ? 'desktop' : 'mobile'));

(async () => {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ channel: process.env.PROOF_BROWSER_CHANNEL || 'chrome' });
  const { key, width, height, ...device } = viewport;
  const page = await browser.newPage({ viewport: { width, height }, ...device });
  // 去掉 CSP 头，否则页面拒绝执行 Figma 的捕获脚本。
  await page.route('**/*', async route => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers['content-security-policy'];
    delete headers['content-security-policy-report-only'];
    await route.fulfill({ response, headers });
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // 懒加载图片改为立即加载，滚到底再回顶，确保整页图片都已出现。
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      window.scrollTo(0, 0);
      const pending = [...document.images].filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }));
      await Promise.race([Promise.all(pending), new Promise(resolve => setTimeout(resolve, 8000))]);
    });
    const capture = await page.context().request.get('https://mcp.figma.com/mcp/html-to-design/capture.js');
    await page.addScriptTag({ content: await capture.text() });
    await page.waitForTimeout(500);
    // captureForDesign 送完后不会返回，所以以提交请求的响应为准。
    const submitted = page.waitForResponse(response => response.url().includes(`/capture/${captureId}/submit`), { timeout: 120000 });
    await page.evaluate(id => {
      window.figma.captureForDesign({
        captureId: id,
        endpoint: `https://mcp.figma.com/mcp/capture/${id}/submit?bindVariables=true`,
        selector: 'body',
      });
    }, captureId);
    const response = await submitted;
    if (!response.ok()) throw new Error(`Figma 拒收：HTTP ${response.status()}`);
    console.log(`已送出 ${url}（${width}px）。`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
