  // AI capabilities: the single integration point for every AI feature (translation today).
  // To add a capability: 1) list it in AI_CAPABILITIES; 2) call aiRun(id, input, meta) where the result is
  // needed and apply the result in .then(); 3) teach the provider to answer it.
  // Every provider call leaves one usage record in data.ai.usage and adds to the totals of its capability.
  const AI_CAPABILITIES = [
    { id: 'translate.inbound', name: '会话消息翻译', description: '把会话里的消息译为所选的译文语言，显示在原文下方。每条消息只翻译一次，译文保存后不再重复翻译；打开会话时补译还没有译文的消息。' },
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
    { id: 'voice.transcribe', name: '语音转文字', description: '点击语音消息下方的「转文字」，把语音转成文字显示在语音下方；客户发来的语音还会译为所选的译文语言。' },
    { id: 'reply.rewrite', name: '改写回复', description: '点击消息框上方的「改写」，按你的要求、以所选人设的身份和口吻改写输入的回复，并写成客户的语言；改写结果和它的意思显示在消息框上方，确认后再发送。' },
  ];
  // The provider answers run(capabilityId, input) with a Promise of { text } (a rewrite also with its preview): the
  // page's own server relays the request to the model service (ai-relay.cjs), so the service key never reaches the
  // browser. Without a server that has a model service configured there is no provider, and no capability runs.
  const AI_PROVIDERS = {
    server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'voice.transcribe' ? aiRelayTranscribe(input) : capabilityId === 'reply.rewrite' ? aiRelayRewrite(input) : capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },
  };
  // Languages offered for a customer: the language replies are put into. Any other language can be typed in.
  const AI_CUSTOMER_LANGUAGES = ['英语', '西班牙语', '葡萄牙语', '法语', '德语', '意大利语', '荷兰语', '波兰语', '俄语', '土耳其语', '阿拉伯语', '印地语', '印尼语', '马来语', '越南语', '泰语', '菲律宾语', '日语', '韩语', '中文'];
  // A language name as the relay accepts it: letters of any script, spaces and a few separators.
  const AI_LANGUAGE_NAME = /^[\p{L}\p{M} ()·-]{1,40}$/u;
  // The customer's language, or '' while none is chosen. Nothing presets it: a customer made from a WhatsApp
  // chat has none until someone chooses one in the conversation. ('其他' is how older records say "none".)
  // Function declarations, because the follow-up module, which comes first in the page, reads a language while
  // it starts up.
  function aiCustomerLanguage(c) {
    return c?.language && c.language !== '其他' ? c.language : '';
  }
  function aiLanguageLabel(c) {
    return aiCustomerLanguage(c) || '未选语言';
  }
  // Languages offered for the translation shown below incoming messages.
  const AI_READ_LANGUAGES = ['中文', 'English', 'Español', 'Português', 'Français', 'Deutsch', 'Русский', 'العربية', '日本語', '한국어', 'Tiếng Việt', 'Bahasa Indonesia'];
  // How a reply should sound when it is translated: [value sent to the relay, label].
  const AI_TONES = [['casual', '轻松随意'], ['friendly', '亲切专业']];
  const AI_BUSINESS_MAX = 600;
  // Personas for 改写 (plan 092): at most this many, a name and a text of at most this length each, and the template a
  // new one starts from (the headings of the wa-translation plugin's template). An instruction for a rewrite is at
  // most AI_INSTRUCTION_MAX long. The relay allows the same lengths (ai-relay.cjs).
  const AI_PERSONAS_MAX = 20;
  const AI_PERSONA_NAME_MAX = 30;
  const AI_PERSONA_MAX = 4000;
  const AI_INSTRUCTION_MAX = 300;
  const AI_PERSONA_TEMPLATE = ['我是谁：', '我提供什么：', '产品详情与政策（具体报价请用「报价」选择）：', '优势与案例：', '沟通目标（例如：弄清需求、给出报价、约电话）：', '语气：', '需要避免的说法或承诺：', '参考回复（可选）：'].join('\n');
  // Which provider this page uses: none until the page's own server reports that a model service is configured,
  // then the server relay. A page opened as a file has none.
  const aiRuntime = { provider: null, status: null };
  // Drafts waiting for their translation, or for a rewrite (plan 092; its token then says rewrite): customer id → a
  // token of the newest request.
  const aiDraftPending = new Map();
  const AI_USAGE_KEPT = 200;
  const AI_USAGE_SHOWN = 20;

  // The translation settings dialog held the only switch for showing translations below incoming messages
  // and was removed on 2026-11-20. A translation a message carries is now always shown; whether new
  // messages get one is decided by the switch of the capability translate.inbound on the AI page.
  ui.receiveTranslation = true;

  function aiSettings() {
    const settings = (data.ai ??= { enabled: {}, totals: {}, usage: [] });
    for (const { id } of AI_CAPABILITIES) {
      settings.enabled[id] ??= true;
      settings.totals[id] ??= { calls: 0, inputChars: 0, outputChars: 0 };
    }
    if (!AI_READ_LANGUAGES.includes(settings.readLanguage)) settings.readLanguage = AI_READ_LANGUAGES[0];
    if (!AI_TONES.some(tone => tone[0] === settings.tone)) settings.tone = AI_TONES[0][0];
    if (typeof settings.business !== 'string') settings.business = '';
    if (typeof settings.sendGuard !== 'boolean') settings.sendGuard = true;
    // Personas (plan 092): [{ id, name, text }]; while there are any, the default is one of them.
    if (!Array.isArray(settings.personas)) settings.personas = [];
    if (!settings.personas.some(persona => persona.id === settings.defaultPersona)) settings.defaultPersona = settings.personas[0]?.id || '';
    return settings;
  }

  // One neutral record per provider call, plus running totals per capability.
  function aiRecordUsage(capabilityId, providerId, input, result, meta) {
    const settings = aiSettings();
    const inputChars = String(input.text || '').length;
    const outputChars = result.text.length;
    settings.usage.unshift({
      id: nextId('ai'), at: new Date().toISOString(), capability: capabilityId, provider: providerId,
      by: ui.persona, customerId: meta.customerId || '', inputChars, outputChars, ok: result.ok,
    });
    settings.usage.length = Math.min(settings.usage.length, AI_USAGE_KEPT);
    const total = settings.totals[capabilityId];
    total.calls += 1;
    total.inputChars += inputChars;
    total.outputChars += outputChars;
    persist();
  }

  // The single entry point for every AI call. Resolves to { ok, text } (a rewrite also with preview); it never rejects.
  // A capability that is switched off, and every capability while no model service is connected, is not run
  // and leaves no usage record.
  function aiRun(capabilityId, input, meta = {}) {
    const settings = aiSettings();
    if (!settings.enabled[capabilityId] || !aiRuntime.provider) return Promise.resolve({ ok: false, text: '', skipped: true });
    const providerId = aiRuntime.provider;
    return Promise.resolve()
      .then(() => AI_PROVIDERS[providerId].run(capabilityId, input))
      .then(output => ({ text: String(output?.text || ''), kept: output?.cached === true, preview: String(output?.preview || '') }), () => ({ text: '', kept: false, preview: '' }))
      .then(({ text, kept, preview }) => {
        const result = { ok: Boolean(text), text };
        // A translation the server had kept was not made again: it is no call to the model service.
        if (!kept) aiRecordUsage(capabilityId, providerId, input, result, meta);
        if (preview) result.preview = preview;
        return result;
      });
  }

  // The server relay: one translation per call. The relay detects the language of the text itself.
  // Rejects when the relay answers with an error, which aiRun turns into a call without result.
  function aiRelayTranslate(input) {
    return fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text, cached: body.cached === true } : Promise.reject(new Error('relay ' + body.error))));
  }

  // The server relay for a reply: the text is put into the customer's language with the chosen tone, with the
  // business description and the recent chat as context. A text already in that language comes back unchanged.
  function aiRelayReply(input) {
    return fetch('/api/ai/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to, tone: input.tone, business: input.business, context: input.context }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('relay ' + body.error))));
  }

  // The server relay for a rewrite (plan 092): the text is edited on the instruction, as the persona, in the
  // customer's language; the answer brings the same message in the reading language as its preview.
  function aiRelayRewrite(input) {
    return fetch('/api/ai/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.text, to: input.to, instruction: input.instruction, persona: input.persona, previewLanguage: input.previewLanguage }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text, preview: body.preview } : Promise.reject(new Error('relay ' + body.error))));
  }

  // The server turns the voice note of a message into text: it holds the file and calls the speech service.
  function aiRelayTranscribe(input) {
    return fetch('/api/wa/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: input.account, chat: input.chat, id: input.id }),
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('transcribe ' + body.error))));
  }

  // Ask the page's own server whether a model service is configured, and use the relay if it is.
  function aiDetectRelay() {
    if (!/^https?:$/.test(location.protocol)) return;
    fetch('/api/ai/status').then(response => response.ok ? response.json() : null).then(status => {
      aiRuntime.status = status;
      aiRuntime.provider = status?.configured ? 'server' : null;
      if (ui.view === 'ai' || ui.view === 'inbox') render();
    }).catch(() => {});
  }

  // ---- translation of the messages of a conversation ----
  // A message is translated at most once for a reading language. Its translation is kept on the message with
  // the language it was made for (translatedTo) and saved with the conversation; a message that is already in
  // the reading language is marked the same way and carries no translation. What is marked is never asked for
  // again: opening a conversation asks only for its messages that are not marked yet, the newest first, and a
  // message that arrives is asked for once. (A translation made before this marking existed carries no
  // language; it is left as it is.) The server keeps every translation too, so equal texts cost one request.
  const AI_TRANSLATE_AT_ONCE = 2;        // requests on their way at the same time
  const AI_TRANSLATE_GIVE_UP = 3;        // failures in a row after which the waiting messages are let go …
  const AI_TRANSLATE_PAUSE_MS = 60000;   // … and nothing more is asked for this long
  const aiWaiting = [];                  // [customer, message] pairs waiting for their turn
  const aiAsked = new Set();             // ids of the messages that wait or are on their way
  let aiOnTheWay = 0, aiFailuresInARow = 0, aiPausedUntil = 0;

  // Whether a message has words to translate: not the note that stands for a picture or a file, not a
  // withdrawn message, not a text without letters.
  function aiTranslatable(message) {
    const text = String(message.text || '').trim();
    return Boolean(text) && !message.revoked && text !== openwaMediaText[message.type] && text !== '[消息]' && !aiGuardNeutral(text);
  }
  const aiWantsTranslation = (message, language) => aiTranslatable(message) && !aiAsked.has(message.id)
    && (message.translatedTo ? message.translatedTo !== language : !message.translated);

  // Puts messages of a customer in the line. `first` puts them in front of what waits already: the conversation
  // on screen comes before messages that arrive elsewhere.
  function aiTranslateSoon(c, messages, first = false) {
    const settings = aiSettings();
    if (!settings.enabled['translate.inbound'] || !aiRuntime.provider || Date.now() < aiPausedUntil) return;
    const pairs = messages.filter(message => aiWantsTranslation(message, settings.readLanguage)).map(message => [c, message]);
    for (const [, message] of pairs) aiAsked.add(message.id);
    if (first) aiWaiting.unshift(...pairs);
    else aiWaiting.push(...pairs);
    aiTranslateNext();
  }
  function aiTranslateNext() {
    while (aiOnTheWay < AI_TRANSLATE_AT_ONCE && aiWaiting.length) {
      const [c, message] = aiWaiting.shift(), text = message.text, language = aiSettings().readLanguage;
      aiOnTheWay += 1;
      aiRun('translate.inbound', { text, to: language }, { customerId: c.id }).then(result => {
        aiOnTheWay -= 1;
        aiAsked.delete(message.id);
        if (result.ok && message.text === text) {
          aiFailuresInARow = 0;
          message.translatedTo = language;
          if (result.text.trim() === text.trim()) delete message.translated;
          else message.translated = result.text;
          if (message.translated && c.preview === text) c.translation = message.translated;
          persist();
          aiRedraw(c);
        } else if (!result.ok && !result.skipped && ++aiFailuresInARow >= AI_TRANSLATE_GIVE_UP) {
          // The service does not answer: what waits is let go, and asked for again when its conversation is
          // drawn after the pause.
          for (const [, waiting] of aiWaiting.splice(0)) aiAsked.delete(waiting.id);
          aiFailuresInARow = 0;
          aiPausedUntil = Date.now() + AI_TRANSLATE_PAUSE_MS;
        }
        aiTranslateNext();
      });
    }
  }
  // One message that has just arrived or was changed.
  function aiTranslateInbound(c, message) {
    aiTranslateSoon(c, [message]);
  }
  // The conversation on screen: its messages that carry no translation yet, the newest first.
  function aiTranslateConversation(c) {
    aiTranslateSoon(c, (data.messages[c.id] || []).slice().reverse(), true);
  }

  // Redraw the translation preview above the composer and the language hint beside it.
  function aiRefreshDraftPreview(c) {
    const preview = $('#translation-preview');
    if (ui.view !== 'inbox' || !preview || $('#messages')?.dataset.customer !== c.id) return;
    preview.innerHTML = previewHTML(c);
    paintIcons(preview);
    const hint = $('.language-hint');
    if (!hint) return;
    hint.innerHTML = icon('Languages') + esc(aiLanguageLabel(c)) + ' · ' + aiDraftHint(c);
    paintIcons(hint);
  }

  // What the relay gets for a reply: the text, the customer's language, the tone, the business description
  // and the last messages of the conversation as context.
  function aiOutboundInput(c, text) {
    const settings = aiSettings();
    const context = (data.messages[c.id] || []).slice(-6)
      .map(message => ({ from: message.side === 'out' ? 'me' : 'customer', text: String(message.text || '').slice(0, 300) }))
      .filter(message => message.text.trim());
    return { text, to: aiCustomerLanguage(c), tone: settings.tone, business: settings.business, context };
  }

  // Send guard. While the relay is in use, a reply that is not in the customer's language is translated first
  // and sent only after a second Enter. A customer without a chosen language is not guarded.
  // These helpers run while the page is drawn, so they read the saved settings without creating them.
  const aiGuardOn = () => data.ai?.sendGuard !== false;
  function aiGuardActive(c) {
    return aiRuntime.provider === 'server' && aiGuardOn() && data.ai?.enabled?.['translate.outbound'] !== false && Boolean(aiCustomerLanguage(c));
  }
  // Text that needs no translation in any language: no letters at all (numbers, emoji, links), or ok / no.
  function aiGuardNeutral(text) {
    const bare = text.replace(/https?:\/\/\S+|\S+@\S+/g, ' ');
    return !/\p{L}/u.test(bare) || /^(ok|okay|no)[.!?]*$/i.test(bare.trim());
  }
  // The same words, whatever the spacing, punctuation and capitals.
  const aiSameText = (a, b) => a.replace(/[\s\p{P}]/gu, '').toLowerCase() === b.replace(/[\s\p{P}]/gu, '').toLowerCase();

  // The words beside the message box: what Enter will do with the draft.
  function aiDraftHint(c) {
    if (aiDraftPending.has(c.id)) return aiDraftPending.get(c.id).rewrite ? '改写中…' : '翻译中…';
    const d = draft(c), text = d.text.trim();
    if (d.translated) return d.rewritten === d.translated ? '发送改写' : '发送译文';
    return aiGuardActive(c) && text && !aiGuardNeutral(text) ? '待翻译' : '发送原文';
  }
  // The line under the message box that explains the Enter key, and the translation shortcut where it works. A
  // shortcut that is Enter or Shift + Enter takes that key's place: then the send button sends, or no key makes a
  // new line.
  function aiEnterHint(c) {
    const enter = aiGuardActive(c) ? 'Enter 先翻译，再按一次发送' : 'Enter 发送';
    const keys = aiGuardActive(c) ? `${enter}；Shift + Enter 换行` : `${enter}，Shift + Enter 换行`;
    if (!aiShortcutReady(c)) return keys;
    const shortcut = aiShortcut(), named = `${esc(aiShortcutLabel(shortcut))} 翻译`;
    if (shortcut === 'Enter') return `${named}，点击「发送」发出；Shift + Enter 换行`;
    if (shortcut === 'Shift+Enter') return `${enter}；${named}`;
    return `${keys}；${named}`;
  }
  // The switch of the send guard, beside the message box. Shown only while the relay is in use.
  function aiGuardHTML(c) {
    if (aiRuntime.provider !== 'server' || !aiCustomerLanguage(c)) return '';
    const on = aiGuardOn();
    return `<button class="ai-guard${on ? ' on' : ''}" type="button" data-ai-guard aria-pressed="${on}" title="${on ? '发送保护已开启：不是客户语言的回复先翻译，确认后再发送' : '发送保护已关闭：回复按原文直接发送'}">${icon('ShieldCheck')}发送保护${on ? '开' : '关'}</button>`;
  }
  function aiSetGuard(on) {
    aiSettings().sendGuard = on;
    persist();
    if (ui.view === 'ai') render();
    const c = selectedCustomer(), button = $('[data-ai-guard]');
    if (c && button) {
      button.outerHTML = aiGuardHTML(c);
      paintIcons($('.composer-tools'));
      aiRefreshDraftPreview(c);
      const enter = $('.composer-keys');
      if (enter) { enter.innerHTML = icon('Keyboard') + aiEnterHint(c); paintIcons(enter); }
    }
    toast(on ? '发送保护已开启。' : '发送保护已关闭，回复按原文直接发送。');
  }

  // Quick replies: the earlier layers fill the draft together with a prepared translation from the stored
  // quick-reply data. Take it off the draft and ask the integration point for a real translation instead, so
  // that translating before sending can be switched off and is recorded like every other AI call.
  const aiOldFillQuick = fillQuick;
  fillQuick = function(id) {
    const q = data.quickReplies.find(item => item.id === id), c = selectedCustomer();
    aiOldFillQuick(id);
    const filled = c && ui.drafts[c.id];
    if (!q || !filled || filled.source !== q.zh) return;
    filled.translated = '';
    persist();
    // Without a model service, or for a customer without a chosen language, the original is sent.
    if (!aiRuntime.provider || !aiCustomerLanguage(c)) return aiRefreshDraftPreview(c);
    const request = {};
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', aiOutboundInput(c, q.zh), { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      if (result.ok && current && current.source === q.zh && current.text === q.zh) {
        current.translated = result.text;
        persist();
      } else if (!result.ok && !result.skipped) {
        toast('未能取得译文，草稿保持原文。');
      }
      aiRefreshDraftPreview(c);
    });
  };

  // A reply typed into the message box. With the send guard active, Enter does not send a text that is not
  // in the customer's language: it asks for the translation, shows it above the box, and the next Enter sends
  // it. A text the relay returns unchanged already is in the customer's language and is sent as typed.
  function aiTranslateDraft(c, text) {
    const request = {};
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      const unchanged = current && current.text.trim() === text;
      if (!result.ok) {
        if (!result.skipped) toast('未能取得译文，消息未发送。可再按 Enter 重试，或关闭发送保护后按原文发送。');
      } else if (unchanged && aiSameText(result.text, text)) {
        const box = $('#composer-text');
        if (ui.view === 'inbox' && selectedCustomer() === c && box && box.value.trim() === text) return aiOldSend();
      } else if (unchanged) {
        current.translated = result.text;
        current.source = text;
        persist();
        toast(`已译为${c.language}，确认后再按 Enter 发送。`);
      }
      aiRefreshDraftPreview(c);
    });
  }
  const aiOldSend = send;
  send = function() {
    const c = selectedCustomer(), box = $('#composer-text');
    const text = box ? box.value.trim() : '';
    if (!c || !text || account(c.account)?.state !== 'online' || !aiGuardActive(c)) return aiOldSend();
    const d = draft(c);
    if ((d.translated && d.source === text) || aiGuardNeutral(text)) return aiOldSend();
    if (aiDraftPending.has(c.id)) return toast('正在翻译，请稍候。');
    aiTranslateDraft(c, text);
  };

  // ---- the translation shortcut (plans 060 and 062) ----
  // A key, or a combination of keys, set under the gear beside the customer's language. Pressed in the message
  // box it translates what was typed into the customer's language and shows the translation above the box,
  // whether or not the send guard is on; Enter (or the send button) then sends the translation, and what was typed
  // stays in the box. Any key can be the shortcut, with or without modifier keys, and so can modifier keys pressed
  // on their own (plan 062: the owner asked for any key). It is kept in the AI settings as e.g. "Ctrl+Enter", "F2",
  // "Backquote", "Alt+Shift+T" or "Ctrl": the modifier keys in the order Ctrl, Alt, Shift, Meta (on a Mac ⌘ counts
  // as Ctrl), then the key by its place on the keyboard (event.code; letters and digits as they are).
  const AI_SHORTCUT_DEFAULT = 'Ctrl+Enter';
  const AI_SHORTCUT_FORM = /^((Ctrl|Alt|Shift|Meta)\+){0,4}[A-Za-z0-9]{1,24}$/;
  const aiOnMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const AI_MODIFIERS = { Control: 'Ctrl', Alt: 'Alt', AltGraph: 'Alt', Shift: 'Shift', Meta: aiOnMac ? 'Ctrl' : 'Meta', OS: 'Meta' };
  const AI_MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];
  const AI_KEY_SIGNS = { Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Space: '空格', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', NumpadAdd: '小键盘 +', NumpadSubtract: '小键盘 -', NumpadMultiply: '小键盘 *', NumpadDivide: '小键盘 /', NumpadDecimal: '小键盘 .', Meta: 'Win' };
  // How a shortcut is shown: "Ctrl + Enter", "F2", "`", "小键盘 5".
  const aiShortcutLabel = combo => combo.split('+').map(part => AI_KEY_SIGNS[part] || part.replace(/^Numpad(\d)$/, '小键盘 $1')).join(' + ');
  // Why a stored value cannot be the shortcut (it names no key), or '' when it can.
  const aiShortcutProblem = combo => (AI_SHORTCUT_FORM.test(combo || '') ? '' : '没有读到按键：请点击上面的框，再按一次想用的键。');
  // The shortcut in use: the one set under the gear, read without creating the settings, or the default.
  const aiShortcut = () => (aiShortcutProblem(data.ai?.translateKey) ? AI_SHORTCUT_DEFAULT : data.ai.translateKey);
  // The combination a key press makes, e.g. "Ctrl+Shift+K" or "F2"; '' for a modifier key, which counts only when
  // it is pressed on its own (below). The key is told by its place on the keyboard (event.code), so that Alt on a
  // Mac, which changes the character, still gives the letter.
  function aiShortcutOf(event) {
    if (AI_MODIFIERS[event.key]) return '';
    const code = event.code || '';
    const key = /^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : code === 'NumpadEnter' ? 'Enter' : /^[A-Za-z0-9]{1,24}$/.test(code) ? code : String(event.key || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
    if (!key) return '';
    const held = [event.ctrlKey || (aiOnMac && event.metaKey) ? 'Ctrl' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : '', !aiOnMac && event.metaKey ? 'Meta' : ''];
    return [...held.filter(Boolean), key].join('+');
  }
  // Modifier keys pressed on their own (e.g. Ctrl pressed and let go): the ones held since every key was up, and
  // whether another key came in between, which makes them part of an ordinary combination instead.
  const aiLone = { held: new Set(), spoiled: false };
  const aiLoneReset = () => { aiLone.held.clear(); aiLone.spoiled = false; };
  function aiLoneDown(event) {
    if (AI_MODIFIERS[event.key]) aiLone.held.add(AI_MODIFIERS[event.key]);
    else aiLone.spoiled = true;
  }
  // At a key's release: once every modifier key is up, the ones pressed on their own ("Ctrl", "Ctrl+Shift"), or ''.
  function aiLoneUp(event) {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return '';
    const combo = aiLone.spoiled ? '' : AI_MODIFIER_ORDER.filter(name => aiLone.held.has(name)).join('+');
    aiLoneReset();
    return combo;
  }
  // Whether Enter itself is the shortcut: then the send button sends the translation.
  const aiEnterTaken = () => aiShortcut() === 'Enter';
  // Whether the shortcut can translate for this customer: the relay is in use, translating replies is switched
  // on, and the customer has a language.
  const aiShortcutReady = c => aiRuntime.provider === 'server' && data.ai?.enabled?.['translate.outbound'] !== false && Boolean(aiCustomerLanguage(c));
  // The gear beside the customer's language. Shown only while the relay is in use, like the send guard's switch.
  function aiShortcutGear() {
    if (aiRuntime.provider !== 'server') return '';
    return `<button type="button" class="icon-button ai-shortcut-gear" data-ai-shortcut aria-label="翻译快捷键设置" title="翻译快捷键：${esc(aiShortcutLabel(aiShortcut()))}">${icon('Settings')}</button>`;
  }
  // The panel under the gear. Its field records the next key press once it is clicked (or Enter or Space is pressed
  // on it): any key, with or without modifier keys, or modifier keys on their own. Until then Tab and Escape keep
  // their use there, so that the panel can be left with the keyboard.
  let aiRecording = false;
  function aiShortcutOpen() {
    const combo = aiShortcut();
    aiRecording = false;
    fidForm('翻译快捷键', 'ai-shortcut', `<p class="fid-field-help ai-shortcut-about">在消息框中按下快捷键，输入的内容会译为客户语言，显示在消息框上方；再按 Enter 或点击「发送」发送译文。</p>
      ${fidFormRow('快捷键', `<input class="fid-input ai-shortcut-key" id="ai-shortcut-key" value="${esc(aiShortcutLabel(combo))}" readonly aria-describedby="ai-shortcut-help"><input type="hidden" name="combo" value="${esc(combo)}"><span class="fid-field-help" id="ai-shortcut-help">点击上面的框，再按下想用的键：任意一个键或组合键都可以，例如 F2、\`、Tab 或 Ctrl + Enter，也可以单独按 Ctrl、Alt 等键。设为单独的字母、数字、空格、Enter 或 Shift 等键后，在消息框里按它就会翻译，不再输入、发送或换行。浏览器自己的快捷键（如 Ctrl + W）网页收不到。Mac 上 ⌘ 等同于 Ctrl。</span>${fidButton(`恢复默认（${aiShortcutLabel(AI_SHORTCUT_DEFAULT)}）`, '', '', 'slim', 'data-ai-shortcut-default')}`, 'ai-shortcut-key')}`, '保 存');
  }
  // Starts or stops recording in the panel's field; stopped, the field shows the shortcut kept in the form.
  function aiShortcutRecord(on) {
    const field = $('#ai-shortcut-key'), kept = $('#dialog [name="combo"]');
    aiRecording = Boolean(on && field && kept);
    aiLoneReset();
    if (field && kept) field.value = aiRecording ? '请按下新的快捷键…' : aiShortcutLabel(kept.value);
  }
  // Puts a combination into the panel's field and stops recording; a message shown before goes away.
  function aiShortcutShow(combo) {
    const field = $('#ai-shortcut-key'), kept = $('#dialog [name="combo"]');
    if (!field || !kept) return;
    kept.value = combo;
    aiShortcutRecord(false);
    $('#form-error').textContent = '';
    $('#dialog .field-error')?.remove();
    field.removeAttribute('aria-invalid');
    field.setAttribute('aria-describedby', 'ai-shortcut-help');
  }
  fidForms['ai-shortcut-form'] = (f, v) => {
    const combo = v('combo'), problem = aiShortcutProblem(combo);
    if (problem) return error(problem);
    aiSettings().translateKey = combo;
    persist();
    close();
    render();
    toast(`翻译快捷键已设为 ${aiShortcutLabel(combo)}。`);
  };
  // Translates what is typed, when the shortcut is pressed. Nothing is sent.
  function aiTranslateByShortcut() {
    const c = selectedCustomer(), box = $('#composer-text'), text = box ? box.value.trim() : '';
    if (!c || !text) return;
    if (aiRuntime.provider !== 'server') return toast('没有可用的翻译服务，无法翻译。');
    if (data.ai?.enabled?.['translate.outbound'] === false) return toast('「发送前翻译」已在 AI 能力页面停用。');
    if (!aiCustomerLanguage(c)) return toast('请先在上方选择客户语言。');
    if (aiDraftPending.has(c.id)) return toast('正在翻译，请稍候。');
    const d = draft(c);
    if (d.translated && d.source === text) return toast(aiEnterTaken() ? '译文已在消息框上方，点击「发送」即可发出。' : '译文已在消息框上方，按 Enter 发送。');
    const request = {};
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('translate.outbound', aiOutboundInput(c, text), { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      const unchanged = current && current.text.trim() === text;
      if (!result.ok) {
        if (!result.skipped) toast('未能取得译文，请稍后再试。');
      } else if (unchanged && aiSameText(result.text, text)) {
        toast(`这段内容已是${c.language}，${aiEnterTaken() ? '点击「发送」直接发出' : '按 Enter 直接发送'}。`);
      } else if (unchanged) {
        current.translated = result.text;
        current.source = text;
        persist();
        toast(`已译为${c.language}，${aiEnterTaken() ? '点击「发送」发出译文' : '按 Enter 发送译文'}。`);
      }
      aiRefreshDraftPreview(c);
    });
  }
  // Key presses. In the message box the shortcut translates — these listeners come before the page's own one,
  // which sends on Enter, so a shortcut with Enter does not send; nothing counts while an input method composes.
  // In the panel's field, while it records, any press is the new shortcut; otherwise Enter or Space starts
  // recording there.
  document.addEventListener('keydown', event => {
    const id = event.target.id;
    if (id === 'composer-text') {
      if (event.isComposing || event.keyCode === 229) return void (aiLone.spoiled = true);
      aiLoneDown(event);
      if (aiShortcutOf(event) !== aiShortcut()) return;
      event.preventDefault();
      event.stopPropagation();
      return aiTranslateByShortcut();
    }
    if (id !== 'ai-shortcut-key') return;
    if (!aiRecording) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      return aiShortcutRecord(true);
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.isComposing || event.keyCode === 229) return;
    aiLoneDown(event);
    const combo = aiShortcutOf(event);
    if (combo) aiShortcutShow(combo);
  }, true);
  // Modifier keys pressed on their own count when the last of them is let go.
  document.addEventListener('keyup', event => {
    const id = event.target.id;
    if (id !== 'composer-text' && id !== 'ai-shortcut-key') return aiLoneReset();
    const lone = aiLoneUp(event);
    if (lone && id === 'composer-text' && lone === aiShortcut()) aiTranslateByShortcut();
    else if (lone && id === 'ai-shortcut-key' && aiRecording) aiShortcutShow(lone);
  }, true);
  // Leaving the field stops recording; the shortcut kept so far stays.
  document.addEventListener('focusout', event => {
    if (event.target.id === 'ai-shortcut-key' && aiRecording) aiShortcutRecord(false);
  });

  // ---- 改写: a reply rewritten as a persona (plan 092) ----
  // As in the wa-translation browser plugin: personas, each a name and a text written to a template, one of them the
  // default. A chat writes as the persona chosen for it (aiPersona on the customer: the id of a persona, or 'none'),
  // otherwise as the default. The 改写 chip above the message box asks for an instruction ("更热情一点", "更简短")
  // and has what was typed rewritten on it, as the chat's persona, in the customer's language. The result goes into
  // the draft like a translation — translated, with what was typed as its source —, so that Enter sends it and what
  // was typed stays in the box; rewritten marks it as a rewrite and meaning holds what it means in the reading
  // language, shown below it above the box. Translating replies does not use personas.
  // The persona a chat writes as, or null for none.
  function aiChatPersona(c) {
    const settings = aiSettings();
    if (c.aiPersona === 'none') return null;
    return settings.personas.find(persona => persona.id === c.aiPersona) || settings.personas.find(persona => persona.id === settings.defaultPersona) || null;
  }
  // The chip in the toolbar of the message box. Shown while the relay is in use and 改写回复 is switched on.
  function aiRewriteButton() {
    if (aiRuntime.provider !== 'server' || data.ai?.enabled?.['reply.rewrite'] === false) return '';
    return `<button type="button" class="composer-chip" data-ai-rewrite aria-label="改写回复" title="按你的要求和人设改写输入的回复">${icon('Sparkles')}<span>改写</span></button>`;
  }
  // The dialog of the chip: the persona, which starts on the chat's own, and the instruction.
  function aiRewriteOpen() {
    const c = selectedCustomer(), box = $('#composer-text'), text = box ? box.value.trim() : '';
    if (!c) return;
    if (aiRuntime.provider !== 'server') return toast('没有可用的 AI 服务，无法改写。');
    if (!aiCustomerLanguage(c)) return toast('请先在上方选择客户语言。');
    if (!text) return toast('请先在消息框输入要改写的回复。');
    if (aiDraftPending.has(c.id)) return toast('正在处理上一个请求，请稍候。');
    const settings = aiSettings(), chosen = aiChatPersona(c)?.id || 'none';
    const personas = settings.personas.map(persona => option(persona.id, persona.id === settings.defaultPersona ? `${persona.name}（默认）` : persona.name, chosen)).join('');
    fidForm('改写回复', 'ai-rewrite', `<input type="hidden" name="customer" value="${esc(c.id)}">
      ${fidFormRow('人设', `<select class="fid-select" id="ai-rewrite-persona" name="persona" style="width:100%">${personas}${option('none', '不使用人设', chosen)}</select><span class="fid-field-help">${settings.personas.length ? '按所选人设的身份和口吻来写；这个会话会记住你的选择。' : '还没有人设，可在「AI 能力」页面添加。'}</span>`, 'ai-rewrite-persona')}
      ${fidFormRow('改写要求', `<input class="fid-input" style="width:100%" id="ai-rewrite-instruction" name="instruction" maxlength="${AI_INSTRUCTION_MAX}" placeholder="例如：更热情一点、更简短、语气更正式">`, 'ai-rewrite-instruction', true)}
      <p class="fid-field-help">改写结果会写成${esc(aiCustomerLanguage(c))}，连同它的意思显示在消息框上方，确认后再发送；消息框里输入的内容保持不变。</p>`, '改 写');
  }
  fidForms['ai-rewrite-form'] = (f, v) => {
    const c = customer(v('customer')), instruction = v('instruction').replace(/\s+/g, ' ');
    if (!c) return;
    if (!instruction) return error('请填写改写要求，例如：更热情一点。');
    const persona = aiSettings().personas.find(item => item.id === v('persona')) || null;
    // The chat remembers a persona chosen here; the one it writes as already (the default too) is not written down.
    if ((persona?.id || 'none') !== (aiChatPersona(c)?.id || 'none')) {
      c.aiPersona = persona?.id || 'none';
      persist();
    }
    close();
    aiRewriteDraft(c, instruction, persona);
  };
  // Has what was typed rewritten. A result that comes back after the box was changed is not used.
  function aiRewriteDraft(c, instruction, persona) {
    const text = draft(c).text.trim();
    if (!text) return;
    const request = { rewrite: true };
    aiDraftPending.set(c.id, request);
    aiRefreshDraftPreview(c);
    aiRun('reply.rewrite', { text, to: aiCustomerLanguage(c), instruction, persona: persona?.text || '', previewLanguage: aiSettings().readLanguage }, { customerId: c.id }).then(result => {
      if (aiDraftPending.get(c.id) === request) aiDraftPending.delete(c.id);
      const current = ui.drafts[c.id];
      if (!result.ok) {
        if (!result.skipped) toast('未能改写，消息框的内容保持不变。请稍后再试。');
      } else if (current && current.text.trim() === text) {
        Object.assign(current, { translated: result.text, source: text, rewritten: result.text, meaning: result.preview || '' });
        persist();
        toast(`已改写为${aiCustomerLanguage(c)}，${aiEnterTaken() ? '确认后点击「发送」发出' : '确认后按 Enter 发送'}。`);
      } else toast('消息框的内容已改动，改写结果没有使用。');
      aiRefreshDraftPreview(c);
    });
  }
  // Above the message box a rewrite shows as such, with what it means below it.
  const aiBasePreview = previewHTML;
  previewHTML = function(c) {
    const d = draft(c), html = aiBasePreview(c);
    if (!d.translated || d.rewritten !== d.translated) return html;
    return html.replace(`<small>发送前预览 · ${esc(c.language)}译文</small>${esc(d.translated)}</div>`,
      `<small>改写后 · ${esc(c.language)}</small>${esc(d.translated)}${d.meaning ? `<span class="ai-rewrite-meaning"><b>意思</b>${esc(d.meaning)}</span>` : ''}</div>`);
  };

  // The personas on the AI page: a table that names the default, and the dialog that adds or edits one. The first
  // persona becomes the default; when the default is deleted the first of the others takes its place, and a chat
  // that had chosen a deleted persona writes as the default.
  function aiPersonaRows(settings) {
    return settings.personas.map(persona => `<tr>
        <td><strong>${esc(persona.name)}</strong></td>
        <td><span class="fid-ai-persona-text">${esc(persona.text.replace(/\s+/g, ' ').slice(0, 120))}</span></td>
        <td>${persona.id === settings.defaultPersona ? '<span class="lc-pill ok">默认</span>' : fidButton('设为默认', 'aiPersonaDefault', '', 'slim', fidActionID(persona.id))}</td>
        <td><div class="fid-icon-actions">${fidIcon('编辑人设' + persona.name, 'aiPersonaEdit', 'SquarePen', persona.id)}${fidIcon('删除人设' + persona.name, 'aiPersonaDelete', 'Trash2', persona.id, 'fid-danger')}</div></td>
      </tr>`).join('');
  }
  function aiPersonaEdit(id) {
    const settings = aiSettings(), persona = settings.personas.find(item => item.id === id);
    if (!persona && settings.personas.length >= AI_PERSONAS_MAX) return toast(`最多可以建 ${AI_PERSONAS_MAX} 个人设。`);
    fidForm(persona ? '编辑人设' : '添加人设', 'ai-persona', `<input type="hidden" name="id" value="${esc(persona?.id || '')}">
      ${fidFormRow('名称', fidCountField('ai-persona-name', 'name', persona?.name || '', AI_PERSONA_NAME_MAX, '例如：外贸销售小王', true), 'ai-persona-name', true)}
      ${fidFormRow('人设内容', `<textarea class="fid-input ai-persona-text" id="ai-persona-text" name="text" rows="12" maxlength="${AI_PERSONA_MAX}" style="width:100%">${esc(persona ? persona.text : AI_PERSONA_TEMPLATE)}</textarea><span class="fid-field-help">按每一项填写，用不到的项可以删掉，最多 ${AI_PERSONA_MAX} 字。改写时 AI 以这个身份和口吻来写，不会自行报价：报价请用「报价」选择。</span>`, 'ai-persona-text', true)}`, '保 存', { wide: true });
  }
  fidForms['ai-persona-form'] = (f, v) => {
    const settings = aiSettings(), id = v('id'), persona = settings.personas.find(item => item.id === id), name = v('name'), text = v('text');
    if (id && !persona) return close();
    if (!name) return error('请填写人设名称。');
    if (settings.personas.some(item => item !== persona && item.name.toLowerCase() === name.toLowerCase())) return error('已有同名的人设，请换一个名称。');
    if (!text) return error('请填写人设内容。');
    if (!persona && settings.personas.length >= AI_PERSONAS_MAX) return error(`最多可以建 ${AI_PERSONAS_MAX} 个人设。`);
    const values = { name: name.slice(0, AI_PERSONA_NAME_MAX), text: text.slice(0, AI_PERSONA_MAX) };
    if (persona) Object.assign(persona, values);
    else settings.personas.push({ id: nextId('persona'), ...values });
    if (!settings.defaultPersona) settings.defaultPersona = settings.personas[0].id;
    persist();
    close();
    render();
    toast(persona ? '人设已保存。' : `人设「${values.name}」已添加。`);
  };
  Object.assign(fidActions, {
    aiPersonaAdd: () => aiPersonaEdit(''),
    aiPersonaEdit,
    aiPersonaDefault: id => {
      const settings = aiSettings(), persona = settings.personas.find(item => item.id === id);
      if (!persona) return;
      settings.defaultPersona = persona.id;
      persist();
      render();
      toast(`「${persona.name}」已设为默认人设。`);
    },
    aiPersonaDelete: id => {
      const persona = aiSettings().personas.find(item => item.id === id);
      if (persona) fidConfirm('删除人设', `删除人设「${persona.name}」？选择了它的会话改用默认人设。`, 'aiPersonaDeleteDo', persona.id, 'danger');
    },
    aiPersonaDeleteDo: id => {
      const settings = aiSettings(), persona = settings.personas.find(item => item.id === id);
      close();
      if (!persona) return;
      settings.personas = settings.personas.filter(item => item !== persona);
      if (settings.defaultPersona === persona.id) settings.defaultPersona = settings.personas[0]?.id || '';
      persist();
      render();
      toast(`人设「${persona.name}」已删除。`);
    },
  });

  function renderAiPage() {
    const settings = aiSettings();
    const capabilityName = id => AI_CAPABILITIES.find(item => item.id === id)?.name || id;
    const relay = aiRuntime.provider === 'server';
    const voice = Boolean(aiRuntime.status?.voice?.configured);
    const providerNote = relay
      ? '由本站服务器中转调用模型服务，密钥只保存在服务器，不进入浏览器。'
      : aiRuntime.status
        ? '服务器尚未配置可用的模型服务，翻译暂不可用。'
        : '当前页面没有连接服务器，翻译不可用。';
    const capabilityRows = AI_CAPABILITIES.map(({ id, name, description }) => {
      const total = settings.totals[id], on = settings.enabled[id];
      return `<tr>
        <td><strong>${esc(name)}</strong><small>${esc(id)}</small></td>
        <td>${esc(description)}</td>
        <td><label class="fid-ai-switch"><input type="checkbox" role="switch" id="fid-ai-${esc(id.replace('.', '-'))}" data-ai-capability="${esc(id)}" ${on ? 'checked' : ''} aria-label="${esc(name)}">${on ? '已启用' : '已停用'}</label></td>
        <td>${total.calls}</td><td>${total.inputChars}</td><td>${total.outputChars}</td>
      </tr>`;
    }).join('');
    const usageRows = settings.usage.filter(entry => manager() || entry.by === ui.persona).slice(0, AI_USAGE_SHOWN).map(entry => `<tr>
        <td>${esc(fidDate(entry.at))}</td><td>${esc(capabilityName(entry.capability))}</td>
        <td>${esc(customer(entry.customerId)?.name || '—')}</td><td>${esc(member(entry.by)?.name || '—')}</td>
        <td>${entry.inputChars}</td><td>${entry.outputChars}</td>
        <td><span class="lc-pill ${entry.ok ? 'ok' : 'warn'}">${entry.ok ? '成功' : '无结果'}</span></td>
      </tr>`).join('');
    return `<section class="fid-page"><div class="fid-panel fid-ai">
      ${fidHead('AI 能力', '翻译等 AI 功能都经由同一个接入点调用，每次调用记录一条用量。')}
      <div class="fid-ai-provider"><strong>当前接入</strong><span class="lc-pill ${relay ? 'ok' : 'warn'}">${esc(relay ? `${aiRuntime.status.provider} · ${aiRuntime.status.model}` : '未连接')}</span><span>${providerNote}</span></div>
      <div class="fid-ai-provider"><strong>语音服务</strong><span class="lc-pill ${voice ? 'ok' : 'warn'}">${esc(voice ? `${aiRuntime.status.voice.provider} · ${aiRuntime.status.voice.model}` : '未连接')}</span><span>${voice ? '语音消息由本站服务器交给语音服务转成文字，每条语音只转一次。' : '服务器尚未配置语音服务，语音转文字暂不可用。'}</span></div>
      <div class="fid-ai-provider"><strong>译文语言</strong><select class="fid-select" data-ai-setting="readLanguage" aria-label="译文语言">${AI_READ_LANGUAGES.map(language => option(language, language, settings.readLanguage)).join('')}</select><span>客户发来的消息译为这种语言，显示在原文下方；只对之后收到的消息生效。</span></div>
      <div class="fid-ai-provider"><strong>回复语气</strong><select class="fid-select" data-ai-setting="tone" aria-label="回复语气">${AI_TONES.map(([value, label]) => option(value, label, settings.tone)).join('')}</select><span>把你的回复译给客户时采用的语气。</span></div>
      <div class="fid-ai-provider fid-ai-business"><strong>业务说明</strong><textarea class="fid-input" data-ai-setting="business" aria-label="业务说明" maxlength="${AI_BUSINESS_MAX}" rows="2" placeholder="选填，例如：我们向美国和波多黎各的小型餐饮企业销售厨房设备。">${esc(settings.business)}</textarea><span>选填。翻译回复时一并提供给模型，让用词贴合你的业务；同时提供的还有该会话最近 6 条消息。</span></div>
      <div class="fid-ai-provider"><strong>发送保护</strong><label class="fid-ai-switch"><input type="checkbox" role="switch" data-ai-setting="sendGuard" ${settings.sendGuard ? 'checked' : ''} aria-label="发送保护">${settings.sendGuard ? '已开启' : '已关闭'}</label><span>开启后，不是客户语言的回复不会直接发出：第一次按 Enter 先翻译，确认译文后再按一次发送。也可在输入框旁切换。</span></div>
      <h2>人设</h2>
      <p class="fid-field-help">点击消息框上方的「改写」，AI 以人设的身份和口吻改写你输入的回复。可以建多个人设，改写时为会话选择；没有选择过的会话使用默认人设。翻译回复不使用人设。</p>
      ${fidTable('fid-ai-personas', ['名称', '内容', '默认', '操作'], aiPersonaRows(settings), '还没有人设。点击「添加人设」，按模板写下你是谁、提供什么、怎样沟通。')}
      <div class="fid-actions">${fidButton('添加人设', 'aiPersonaAdd', 'Plus', 'tint', settings.personas.length >= AI_PERSONAS_MAX ? 'disabled' : '')}</div>
      <h2>能力清单</h2>
      ${fidTable('fid-ai-capabilities', ['能力', '说明', '状态', '调用次数', '输入字符', '输出字符'], capabilityRows)}
      <p class="fid-field-help">停用后该能力不再被调用，也不产生用量记录。</p>
      <h2>最近调用</h2>
      ${fidTable('fid-ai-usage', ['时间', '能力', '客户', '操作人', '输入字符', '输出字符', '结果'], usageRows, '暂无调用记录。收到客户消息或翻译回复后，这里会出现记录。')}
      <p class="fid-field-help">显示最近 ${AI_USAGE_SHOWN} 次调用，最多保留 ${AI_USAGE_KEPT} 条；累计数见上表。</p>
    </div></section>`;
  }

  // ---- the customer's language ----
  // The choice in the strip above a conversation: none, one of the listed languages, or any other by name.
  function aiLanguagePicker(c) {
    const current = aiCustomerLanguage(c);
    const listed = !current || AI_CUSTOMER_LANGUAGES.includes(current) ? AI_CUSTOMER_LANGUAGES : [current, ...AI_CUSTOMER_LANGUAGES];
    return `<label class="ai-language-pick">${icon('Languages')}<span>客户语言</span><select class="fid-select" data-ai-language="${esc(c.id)}" aria-label="客户语言">${option('', '未选择（发送原文）', current)}${listed.map(language => option(language, language, current)).join('')}${option('__other', '其他语言…', current)}</select></label>${aiShortcutGear()}`;
  }
  // Sets the customer's language ('' for none). A translation made for another language no longer fits the
  // draft, so the draft goes back to what was typed.
  function aiSetLanguage(c, language) {
    if (aiCustomerLanguage(c) === language) return;
    c.language = language;
    const d = ui.drafts[c.id];
    if (d) Object.assign(d, { translated: '', source: '' });
    aiDraftPending.delete(c.id);
    lcLog(c.id, 'profile', language ? `客户语言设为${language}` : '取消客户语言');
    persist();
    render();
    toast(language ? `客户语言已设为${language}，回复会先译为${language}。` : '已取消客户语言，回复按原文发送。');
  }
  fidForms['ai-language-form'] = (f, v) => {
    const c = customer(v('customer')), language = v('language').replace(/\s+/g, ' ').trim();
    if (!c) return;
    if (!AI_LANGUAGE_NAME.test(language) || language === '其他') return error('请填写语言的名称，例如 希腊语；只能包含文字、空格和括号。');
    close();
    aiSetLanguage(c, language);
  };

  document.addEventListener('change', event => {
    if (event.target.dataset?.aiLanguage) {
      const c = customer(event.target.dataset.aiLanguage), value = event.target.value;
      if (!c) return;
      if (value !== '__other') return aiSetLanguage(c, value);
      // Another language: asked for by name; the choice shows the current language again until it is given.
      event.target.value = aiCustomerLanguage(c);
      fidForm('其他语言', 'ai-language', `<input type="hidden" name="customer" value="${esc(c.id)}">${fidFormRow('语言名称', `<input class="fid-input" style="width:100%" name="language" maxlength="40" placeholder="例如 希腊语">`)}<p class="fid-field-help">回复会先译为这种语言，确认后再发送。</p>`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'readLanguage') {
      aiSettings().readLanguage = event.target.value;
      persist();
      render();
      toast(`译文语言已设为 ${aiSettings().readLanguage}。`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'tone') {
      aiSettings().tone = event.target.value;
      persist();
      render();
      toast(`回复语气已设为「${AI_TONES.find(tone => tone[0] === aiSettings().tone)[1]}」。`);
      return;
    }
    if (event.target.dataset?.aiSetting === 'business') {
      aiSettings().business = event.target.value.trim().slice(0, AI_BUSINESS_MAX);
      persist();
      render();
      toast('业务说明已保存。');
      return;
    }
    if (event.target.dataset?.aiSetting === 'sendGuard') return aiSetGuard(event.target.checked);
    const id = event.target.dataset?.aiCapability;
    const capability = AI_CAPABILITIES.find(item => item.id === id);
    if (!capability) return;
    const on = event.target.checked;
    aiSettings().enabled[id] = on;
    persist();
    render();
    toast(`${capability.name}已${on ? '启用' : '停用'}。`);
  });

  // ---- voice notes into text ----
  // Messages whose words are being asked for right now.
  const aiTranscribing = new Set();
  // Under a voice note or sound file: its words once they are known, otherwise a button that asks for them.
  // c is the customer, or a record of the chat archive, which only shows words that were known when it was made.
  function aiTranscriptHTML(c, m) {
    if (m.transcript) return `<div class="message-translation ai-transcript"><span class="translation-label">${icon('FileText')}转写</span><div>${esc(m.transcript)}</div></div>`;
    if (!c.waChat || !aiSettings().enabled['voice.transcribe'] || !aiRuntime.provider || !aiRuntime.status?.voice?.configured) return '';
    const busy = aiTranscribing.has(m.id);
    return `<button type="button" class="fid-link ai-transcribe" data-ai-transcribe="${esc(m.id)}" ${busy ? 'disabled' : ''}>${icon('FileText')}${busy ? '正在转文字…' : '转文字'}</button>`;
  }
  // Draws the open conversation again when it is this customer's.
  function aiRedraw(c) {
    const box = $('#messages');
    if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
    const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40, fromEnd = box.scrollHeight - box.scrollTop;
    openwaKeepPlaying(() => {
      box.innerHTML = messagesHTML(c);
    });
    paintIcons(box);
    // At its end the conversation stays at its end: scrolled there now and noted as the page's own move (plan 071),
    // so that a picture that takes its height a moment later keeps it there instead of reading as someone scrolling
    // away. Further up, what is being read stays where it is while translations come in above it.
    if (atBottom) openwaShowEnd();
    else box.scrollTop = box.scrollHeight - fromEnd;
  }
  // Turns a voice note of the open conversation into text and keeps the text on the message. The words of a
  // voice note the customer sent are then translated like an incoming text.
  function aiTranscribe(messageId) {
    const c = selectedCustomer(), message = c && (data.messages[c.id] || []).find(m => m.id === messageId);
    if (!message || !message.wa || !c.waChat || aiTranscribing.has(messageId)) return;
    aiTranscribing.add(messageId);
    aiRedraw(c);
    aiRun('voice.transcribe', { account: c.account, chat: c.waChat, id: message.wa }, { customerId: c.id }).then(result => {
      aiTranscribing.delete(messageId);
      if (result.ok) {
        message.transcript = result.text;
        persist();
      } else if (!result.skipped) toast('这条语音未能转成文字，请稍后再试。');
      aiRedraw(c);
      if (!result.ok || message.side !== 'in') return;
      aiRun('translate.inbound', { text: result.text, to: aiSettings().readLanguage }, { customerId: c.id }).then(translated => {
        if (!translated.ok || translated.text.trim() === result.text.trim()) return;
        message.translated = translated.text;
        persist();
        aiRedraw(c);
      });
    });
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-ai-guard]')) aiSetGuard(!aiGuardOn());
    if (event.target.closest?.('[data-ai-shortcut]')) aiShortcutOpen();
    if (event.target.closest?.('[data-ai-rewrite]')) aiRewriteOpen();
    if (event.target.closest?.('[data-ai-shortcut-default]')) aiShortcutShow(AI_SHORTCUT_DEFAULT);
    if (event.target.id === 'ai-shortcut-key') aiShortcutRecord(true);
    const ask = event.target.closest?.('[data-ai-transcribe]');
    if (ask) aiTranscribe(ask.dataset.aiTranscribe);
  });

  // Every time the page is drawn with a conversation on screen, the messages of that conversation that carry no
  // translation yet are put in the line. What is marked or already in the line is passed over, so a redraw
  // costs nothing.
  const aiDraw = render;
  render = function() {
    aiDraw();
    const box = $('#messages'), c = ui.view === 'inbox' && box ? customer(box.dataset.customer) : null;
    if (c) aiTranslateConversation(c);
  };

  aiDetectRelay();
