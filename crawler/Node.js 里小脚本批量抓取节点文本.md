**有一组 URL，又不想逐个打开控制台操作，最省心的是在 Node.js 里写个小脚本批量抓取。**

方案：Node + Playwright（动态页面，单依赖）

适用：页面需要执行 JS（SPA、滚动加载、反爬延迟渲染等）。

1、安装：
```
npm init -y
npm i playwright
npx playwright install chromium
```
