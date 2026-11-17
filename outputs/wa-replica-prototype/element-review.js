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

(() => {
  'use strict';

  const actionSelector = 'button, a, input:not([type="hidden"]), select, textarea, label, [role="button"], [role="tab"], [data-action], [data-nav]';
  const selectorAttributes = ['data-action', 'data-id', 'data-nav', 'data-view', 'name', 'aria-label'];
  const format = window.WAReviewPromptFormat;

  function inspectable(element) {
    if (!(element instanceof Element) || element.closest('#toast, #element-review-dialog')) return null;
    if (!element.closest('#app-shell, #dialog, .fid-float-review')) return null;
    return element.closest(actionSelector) || element.closest('svg')?.parentElement || element;
  }

  function labelFor(element) {
    const label = element.getAttribute('aria-label') || element.labels?.[0]?.innerText ||
      element.getAttribute('placeholder') || element.getAttribute('title') ||
      element.innerText || element.getAttribute('name') || element.localName;
    return label.replace(/\s+/g, ' ').trim().slice(0, 160) || element.localName;
  }

  function selectorPart(element) {
    if (element.id) return '#' + CSS.escape(element.id);
    const attributes = selectorAttributes.flatMap(name => {
      const value = element.getAttribute(name);
      return value && value.length <= 100 ? [`[${name}=${CSS.escape(value)}]`] : [];
    });
    if (attributes.length) return element.localName + attributes.join('');
    const className = Array.from(element.classList).find(name => name.startsWith('fid-'));
    return element.localName + (className ? '.' + CSS.escape(className) : '');
  }

  function locatorFor(element) {
    const path = [];
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const part = selectorPart(node);
      const candidate = [part, ...path].join(' > ');
      const matches = document.querySelectorAll(candidate);
      if (matches.length === 1 && matches[0] === element) return candidate;

      const siblings = Array.from(node.parentElement.children);
      const matchingSiblings = siblings.filter(sibling => sibling.matches(part));
      if (matchingSiblings.length === 1) {
        path.unshift(part);
      } else {
        const index = siblings.filter(sibling => sibling.localName === node.localName).indexOf(node) + 1;
        path.unshift(`${part}:nth-of-type(${index})`);
      }
    }
    return ['body', ...path].join(' > ');
  }

  function contextFor(element) {
    const main = document.querySelector('#view');
    const page = main?.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('#workspace-tabs [aria-current="page"]')?.textContent?.trim() || 'WA Desk';
    const parentDialog = element.closest('dialog[open]');
    return {
      route: location.hash.slice(1) || 'inbox',
      page,
      dialog: parentDialog?.getAttribute('aria-label') || '',
      target: labelFor(element),
      selector: locatorFor(element),
      perspective: document.getElementById('app-shell')?.dataset.reviewPerspective || '',
      viewport: `${innerWidth} × ${innerHeight} px`,
      version: window.WA_REQUIREMENTS?.version || '',
    };
  }

  function downloadPrompt(record) {
    const file = new Blob([format.markdown(record)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = format.fileName(record);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return link.download;
  }

  async function savePrompt(record) {
    const response = await fetch('/api/review-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(10000),
    }).catch(() => { throw new Error('无法连接本地预览服务。'); });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.filename !== 'string') {
      throw new Error(result?.error || '预览服务未能保存备注。');
    }
    return result.filename;
  }

  window.initWAElementReview = function initWAElementReview(toast) {
    const dialog = document.getElementById('element-review-dialog');
    const form = document.getElementById('element-review-entry');
    const textarea = document.getElementById('element-review-note');
    const contextText = document.getElementById('element-review-context');
    const saveHint = document.getElementById('element-review-destination');
    const submit = form.querySelector('button[type="submit"]');
    const fallback = form.querySelector('[data-element-review-download]');
    const feedback = document.getElementById('element-review-error');
    const dismissButtons = form.querySelectorAll('[data-element-review-dismiss]');
    const localServer = location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname);

    textarea.maxLength = format.noteLimit;
    saveHint.textContent = localServer ? '每条备注保存为一份 Markdown 文件' : '提交后下载 Markdown 文件';

    let armed = false;
    let outline = null;
    let selected = null;
    let lastPointer = null;
    let pressedTarget = null;
    let context = null;
    let pendingRecord = null;
    let saving = false;

    function mark(element) {
      if (outline === element) return;
      outline?.classList.remove('element-review-target');
      outline = element;
      outline?.classList.add('element-review-target');
    }

    function stopPick() {
      armed = false;
      pressedTarget = null;
      document.body.classList.remove('element-review-picking');
      if (!dialog.open) mark(null);
    }

    function showError(message = '') {
      feedback.textContent = message;
      feedback.hidden = !message;
    }

    function openNote(element) {
      if (dialog.open || !element.isConnected) return;
      stopPick();
      context = contextFor(element);
      selected = element;
      mark(element);
      contextText.textContent = [context.page, context.dialog, context.target].filter(Boolean).join(' › ');
      textarea.value = '';
      pendingRecord = null;
      fallback.hidden = true;
      showError();
      dialog.showModal();
      textarea.focus();
    }

    function isPicking(event) {
      return !dialog.open && (armed || event.altKey) && !event.ctrlKey && !event.metaKey;
    }

    window.addEventListener('pointermove', event => {
      lastPointer = { x: event.clientX, y: event.clientY };
      if (!dialog.open) mark(isPicking(event) ? inspectable(event.target) : null);
    }, { passive: true });
    document.addEventListener('pointerleave', () => {
      lastPointer = null;
      if (!dialog.open) mark(null);
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Alt' && lastPointer && !dialog.open) {
        mark(inspectable(document.elementFromPoint(lastPointer.x, lastPointer.y)));
      }
      if (event.key === 'Escape' && armed) {
        stopPick();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (event.key === 'Enter' && event.ctrlKey && dialog.open && !saving && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    }, true);
    window.addEventListener('keyup', event => {
      if (event.key === 'Alt' && !dialog.open && !armed) mark(null);
    });
    window.addEventListener('blur', () => {
      lastPointer = null;
      stopPick();
    });

    // Cancel native select popups and text focus before the modified click.
    window.addEventListener('pointerdown', event => {
      pressedTarget = event.button === 0 && isPicking(event) ? inspectable(event.target) : null;
      if (!pressedTarget) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    window.addEventListener('pointerup', event => {
      const target = pressedTarget;
      if (!target) return;
      // Disabled controls can emit pointer events without emitting click.
      if (event.button === 0 && target.matches(':disabled') && target === inspectable(event.target)) {
        event.preventDefault();
        setTimeout(() => openNote(target), 0);
      }
      setTimeout(() => { if (pressedTarget === target) pressedTarget = null; }, 0);
    }, true);
    window.addEventListener('pointercancel', () => { pressedTarget = null; });

    window.addEventListener('click', event => {
      if (!(event.target instanceof Element) || dialog.open || event.button !== 0) return;
      const element = inspectable(event.target);
      if (element && (isPicking(event) || pressedTarget === element)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openNote(element);
        return;
      }
      const start = event.target.closest('[data-element-review-start]');
      if (!start) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      start.closest('dialog')?.close();
      armed = true;
      document.body.classList.add('element-review-picking');
      toast('点一下要备注的元素，按 Esc 退出。');
    }, true);

    function setSaving(state) {
      saving = state;
      textarea.readOnly = state;
      submit.disabled = state;
      fallback.disabled = state;
      dismissButtons.forEach(button => { button.disabled = state; });
      submit.textContent = state ? '保存中…' : '提交备注';
      form.setAttribute('aria-busy', String(state));
    }

    function recordForInput() {
      const note = textarea.value;
      const normalizedNote = note.replace(/\r\n?/g, '\n').trimEnd();
      if (pendingRecord?.note === normalizedNote) return pendingRecord;
      pendingRecord = format.normalize({ ...context, id: crypto.randomUUID(), createdAt: new Date().toISOString(), note });
      return pendingRecord;
    }

    async function submitNote(download = false) {
      if (saving || !dialog.open) return;
      if (!textarea.value.trim()) {
        showError('请填写希望修改的内容。');
        textarea.focus();
        return;
      }
      setSaving(true);
      showError();
      const saveLocally = localServer && !download;
      try {
        const record = recordForInput();
        const filename = saveLocally ? await savePrompt(record) : downloadPrompt(record);
        dialog.close();
        toast(saveLocally ? `已保存 ${filename}` : `已发起下载 ${filename}`);
      } catch (error) {
        showError(saveLocally ? `${error.message} 备注仍在，可以重试或下载文件。` : error.message);
        fallback.hidden = !saveLocally;
        textarea.focus();
      } finally {
        setSaving(false);
      }
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      void submitNote();
    });
    textarea.addEventListener('input', () => {
      if (textarea.value.trim()) showError();
    });
    fallback.addEventListener('click', () => void submitNote(true));
    dismissButtons.forEach(button => button.addEventListener('click', () => {
      if (!saving) dialog.close();
    }));
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      if (dialog.open) return;
      mark(null);
      if (selected?.isConnected && selected.matches(actionSelector) && !selected.matches(':disabled')) {
        selected.focus?.({ preventScroll: true });
      }
      selected = null;
      context = null;
      pendingRecord = null;
    });
  };
})();
