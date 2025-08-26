**有一组 URL，又不想逐个打开控制台操作，最省心的是在 Node.js 里写个小脚本批量抓取。**

方案：Node + Playwright（动态页面，单依赖）

适用：页面需要执行 JS（SPA、滚动加载、反爬延迟渲染等）。

1、安装：
```
npm init -y
npm i playwright
npx playwright install chromium
```

2、脚本（自动渲染 + 选择器抓取 + 并发 Page）， 保存为 scrape_class_dynamic.js：
```

const { chromium } = require("playwright");

const SELECTOR = process.argv[2] || ".with-bookmark";
const urls = process.argv.slice(3);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 3);

// 可选：全局默认超时
const NAV_TIMEOUT = 20000;
const SELECTOR_TIMEOUT = 8000;

async function scrapeOne(page, url, selector) {
  try {
    // 1) 更换等待条件：不要用 networkidle
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

    // 2) 轻量滚动以触发懒加载（可选）
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight / 2); });
    await page.waitForTimeout(300);

    // 3) 明确等待你的目标选择器，而不是全站网络空闲
    await page.waitForSelector(selector, { timeout: SELECTOR_TIMEOUT }).catch(() => {});

    // 4) 提取
    const items = await page.$$eval(selector, els =>
      Array.from(els)
        .map(el => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "))
        .filter(Boolean)
    );

    const unique = [...new Set(items)];
    return { url, count: unique.length, items: unique };
  } catch (e) {
    return { url, error: String(e), count: 0, items: [] };
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  });

  // 可选：屏蔽大资源，减少长连接
  await ctx.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (t === 'image' || t === 'media' || t === 'font') return route.abort();
    route.continue();
  });

  const results = [];
  let i = 0;

  async function worker() {
    const page = await ctx.newPage();
    try {
      while (true) {
        const idx = i++;
        if (idx >= urls.length) break;
        const url = urls[idx];
        const res = await scrapeOne(page, url, SELECTOR);
        results[idx] = res;
        console.error(`[done] ${url} ${res.error ? "✗" : `✓ (${res.count})`}`);
      }
    } finally {
      await page.close();
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker);
  await Promise.all(workers);

  await ctx.close();
  await browser.close();

  console.log(JSON.stringify({ selector: SELECTOR, results }, null, 2));
})().catch(e => {
  console.error(e);
  process.exit(1);
});
```

3、用法示例：
- `node scrape_class_dynamic.js ".with-bookmark" https://www.w3schools.com/html/html_paragraphs.asp https://www.w3schools.com/html/html_tables.asp`
- `node scrape_class_dynamic.js ".BorderGrid-cell" https://github.com/yuyueMidea/Python_Study https://github.com/yuyueMidea/Learn-Practice`
