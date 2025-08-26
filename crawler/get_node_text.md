**在浏览器里用原生 JavaScript 抓“可见节点 + 文本”**
- 适用：你能打开该 URL（同源/CORS 无关），只想快速导出页面上可见元素的选择器、文本与关键属性。
- 用法：打开目标页面 → F12 → Console 粘贴运行；数据会打印并复制到剪贴板（Chrome 的 copy()）。
- 
```
(() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const isVisible = el => {
    const rect = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && st.display !== 'none' && st.visibility !== 'hidden';
  };
  const cssPath = el => {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      let seg = el.localName;
      if (!seg) break;
      if (el.classList.length) seg += '.' + [...el.classList].map(CSS.escape).join('.');
      const siblings = el.parentElement ? [...el.parentElement.children].filter(n => n.localName === el.localName) : [];
      if (siblings.length > 1) seg += `:nth-of-type(${siblings.indexOf(el) + 1})`;
      parts.unshift(seg);
      if (el.id) { parts[0] = `${el.localName}#${CSS.escape(el.id)}`; break; }
      el = el.parentElement;
    }
    return parts.join(' > ');
  };

  const data = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (SKIP.has(node.tagName)) continue;
    const text = (node.innerText || '').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    if (!isVisible(node)) continue;

    const item = {
      tag: node.tagName.toLowerCase(),
      selector: cssPath(node),
      text,
      attrs: {}
    };
    if (node.id) item.attrs.id = node.id;
    if (node.className) item.attrs.class = node.className;
    if ('href' in node && node.href) item.attrs.href = node.href;
    if ('src' in node && node.src) item.attrs.src = node.src;
    const aria = node.getAttribute && node.getAttribute('aria-label');
    if (aria) item.attrs['aria-label'] = aria;
    data.push(item);
  }
  console.log(data);
  if (typeof copy === 'function') copy(data); // Chrome DevTools: 复制到剪贴板
  return data;
})();
```







