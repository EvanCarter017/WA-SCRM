(() => {
  'use strict';

  const noteLimit = 8000;
  const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const routePattern = /^[a-z0-9_-]{1,40}$/i;

  function oneLine(value, limit) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
  }

  function normalize(record) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !idPattern.test(record.id)) {
      throw new TypeError('备注编号无效，请重新点选控件。');
    }
    const createdAt = new Date(record.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== record.createdAt) {
      throw new TypeError('备注时间无效，请重新点选控件。');
    }
    if (typeof record.route !== 'string' || !routePattern.test(record.route)) {
      throw new TypeError('页面位置无效，请重新点选控件。');
    }
    if (typeof record.note !== 'string' || !record.note.trim() || record.note.length > noteLimit) {
      throw new TypeError('请填写备注，最多 8000 字符。');
    }

    const selector = typeof record.selector === 'string' ? record.selector.trim() : '';
    if (!selector || selector.length > 2048 || /[\r\n]/.test(selector)) {
      throw new TypeError('找不到选中的控件，请重新点选。');
    }

    return {
      id: record.id.toLowerCase(),
      createdAt: record.createdAt,
      route: record.route.toLowerCase(),
      page: oneLine(record.page, 120),
      dialog: oneLine(record.dialog, 120),
      target: oneLine(record.target, 160),
      selector,
      perspective: oneLine(record.perspective, 80),
      viewport: oneLine(record.viewport, 40),
      version: oneLine(record.version, 60),
      note: record.note.replace(/\r\n?/g, '\n').trimEnd(),
    };
  }

  function localTimestamp(iso) {
    return new Date(Date.parse(iso) + 8 * 60 * 60 * 1000).toISOString().slice(0, 19);
  }

  function fileName(record) {
    const time = localTimestamp(record.createdAt).replace('T', '_').replaceAll(':', '-');
    const id = record.id.replaceAll('-', '').slice(0, 12);
    return `${time}_${record.route}_${id}.md`;
  }

  function inlineCode(value) {
    const longest = Math.max(0, ...Array.from(value.matchAll(/`+/g), match => match[0].length));
    const fence = '`'.repeat(longest + 1);
    return `${fence} ${value} ${fence}`;
  }

  function markdown(record) {
    return [
      '# WA Desk 原型修改',
      '',
      `- 页面：${record.page || record.route}（${inlineCode('#' + record.route)}）`,
      record.dialog ? `- 所在弹窗：${record.dialog}` : null,
      `- 选中控件：${record.target || '页面元素'}`,
      `- 元素定位：${inlineCode(record.selector)}`,
      record.perspective ? `- 评审视角：${record.perspective}` : null,
      record.viewport ? `- 视口：${record.viewport}` : null,
      record.version ? `- 原型版本：${record.version}` : null,
      `- 提交时间：${localTimestamp(record.createdAt).replace('T', ' ')}（UTC+8）`,
      '',
      '## 修改要求',
      '',
      record.note,
      '',
    ].filter(line => line !== null).join('\n');
  }

  const format = { noteLimit, normalize, fileName, markdown };
  if (typeof module === 'object' && module.exports) module.exports = format;
  else window.WAReviewPromptFormat = format;
})();
