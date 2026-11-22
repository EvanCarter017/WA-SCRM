  // AI capabilities: the single integration point for every AI feature (translation today).
  // To add a capability: 1) list it in AI_CAPABILITIES; 2) call aiRun(id, input, meta) where the result is
  // needed and apply the result in .then(); 3) teach the provider to answer it.
  // Every provider call leaves one usage record in data.ai.usage and adds to the totals of its capability.
  const AI_CAPABILITIES = [
    { id: 'translate.inbound', name: '接收消息翻译', description: '把客户发来的消息译为所选的译文语言，显示在原文下方。' },
    { id: 'translate.outbound', name: '发送前翻译', description: '把你输入的回复和快捷回复译为客户的语言，发送前可预览。' },
    { id: 'voice.transcribe', name: '语音转文字', description: '点击语音消息下方的「转文字」，把语音转成文字显示在语音下方；客户发来的语音还会译为所选的译文语言。' },
  ];
  // The provider answers run(capabilityId, input) with a Promise of { text }: the page's own server relays the
  // request to the model service (ai-relay.cjs), so the service key never reaches the browser. Without a server
  // that has a model service configured there is no provider, and no capability runs.
  const AI_PROVIDERS = {
    server: { name: '服务器中转', run: (capabilityId, input) => capabilityId === 'voice.transcribe' ? aiRelayTranscribe(input) : capabilityId === 'translate.outbound' ? aiRelayReply(input) : aiRelayTranslate(input) },
  };
  // Languages offered for the translation shown below incoming messages.
  const AI_READ_LANGUAGES = ['中文', 'English', 'Español', 'Português', 'Français', 'Deutsch', 'Русский', 'العربية', '日本語', '한국어', 'Tiếng Việt', 'Bahasa Indonesia'];
  // How a reply should sound when it is translated: [value sent to the relay, label].
  const AI_TONES = [['casual', '轻松随意'], ['friendly', '亲切专业']];
  const AI_BUSINESS_MAX = 600;
  // Which provider this page uses: none until the page's own server reports that a model service is configured,
  // then the server relay. A page opened as a file has none.
  const aiRuntime = { provider: null, status: null };
  // Drafts waiting for their translation: customer id → a token of the newest request.
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

  // The single entry point for every AI call. Resolves to { ok, text }; it never rejects.
  // A capability that is switched off, and every capability while no model service is connected, is not run
  // and leaves no usage record.
  function aiRun(capabilityId, input, meta = {}) {
    const settings = aiSettings();
    if (!settings.enabled[capabilityId] || !aiRuntime.provider) return Promise.resolve({ ok: false, text: '', skipped: true });
    const providerId = aiRuntime.provider;
    return Promise.resolve()
      .then(() => AI_PROVIDERS[providerId].run(capabilityId, input))
      .then(output => String(output?.text || ''), () => '')
      .then(text => {
        const result = { ok: Boolean(text), text };
        aiRecordUsage(capabilityId, providerId, input, result, meta);
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
    }).then(response => response.json().then(body => response.ok ? { text: body.text } : Promise.reject(new Error('relay ' + body.error))));
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

  // Translate one incoming message into the reading language chosen on the AI page. The translation is stored
  // on the message when it arrives, and the open conversation is refreshed if it is the one on screen.
  // A message that is already in the reading language comes back unchanged and gets no translation.
  function aiTranslateInbound(c, message) {
    return aiRun('translate.inbound', { text: message.text, to: aiSettings().readLanguage }, { customerId: c.id }).then(result => {
      if (!result.ok || result.text.trim() === message.text.trim()) return;
      message.translated = result.text;
      if (c.preview === message.text) c.translation = result.text;
      persist();
      const box = $('#messages');
      if (ui.view !== 'inbox' || !box || box.dataset.customer !== c.id) return;
      const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
      openwaKeepPlaying(() => {
        box.innerHTML = messagesHTML(c);
      });
      paintIcons(box);
      if (atBottom) scrollMessages();
    });
  }

  // Redraw the translation preview above the composer and the language hint beside it.
  function aiRefreshDraftPreview(c) {
    const preview = $('#translation-preview');
    if (ui.view !== 'inbox' || !preview || $('#messages')?.dataset.customer !== c.id) return;
    preview.innerHTML = previewHTML(c);
    paintIcons(preview);
    const hint = $('.language-hint');
    if (!hint) return;
    hint.innerHTML = icon('Languages') + esc(c.language) + ' · ' + aiDraftHint(c);
    paintIcons(hint);
  }

  // What the relay gets for a reply: the text, the customer's language, the tone, the business description
  // and the last messages of the conversation as context.
  function aiOutboundInput(c, text) {
    const settings = aiSettings();
    const context = (data.messages[c.id] || []).slice(-6)
      .map(message => ({ from: message.side === 'out' ? 'me' : 'customer', text: String(message.text || '').slice(0, 300) }))
      .filter(message => message.text.trim());
    return { text, to: c.language, tone: settings.tone, business: settings.business, context };
  }

  // Send guard. While the relay is in use, a reply that is not in the customer's language is translated first
  // and sent only after a second Enter. A customer whose language is '其他' (other) is not guarded.
  // These helpers run while the page is drawn, so they read the saved settings without creating them.
  const aiGuardOn = () => data.ai?.sendGuard !== false;
  function aiGuardActive(c) {
    return aiRuntime.provider === 'server' && aiGuardOn() && data.ai?.enabled?.['translate.outbound'] !== false && c.language !== '其他';
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
    if (aiDraftPending.has(c.id)) return '翻译中…';
    const d = draft(c), text = d.text.trim();
    if (d.translated) return '发送译文';
    return aiGuardActive(c) && text && !aiGuardNeutral(text) ? '待翻译' : '发送原文';
  }
  // The line under the message box that explains the Enter key.
  function aiEnterHint(c) {
    return aiGuardActive(c) ? 'Enter 先翻译，再按一次发送；Shift + Enter 换行' : 'Enter 发送，Shift + Enter 换行';
  }
  // The switch of the send guard, beside the message box. Shown only while the relay is in use.
  function aiGuardHTML(c) {
    if (aiRuntime.provider !== 'server' || c.language === '其他') return '';
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
      const enter = $('.composer-foot span');
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
    // Without a model service, or for a customer whose language is '其他' (other), the original is sent.
    if (!aiRuntime.provider || c.language === '其他') return aiRefreshDraftPreview(c);
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
      <h2>能力清单</h2>
      ${fidTable('fid-ai-capabilities', ['能力', '说明', '状态', '调用次数', '输入字符', '输出字符'], capabilityRows)}
      <p class="fid-field-help">停用后该能力不再被调用，也不产生用量记录。</p>
      <h2>最近调用</h2>
      ${fidTable('fid-ai-usage', ['时间', '能力', '客户', '操作人', '输入字符', '输出字符', '结果'], usageRows, '暂无调用记录。收到客户消息或翻译回复后，这里会出现记录。')}
      <p class="fid-field-help">显示最近 ${AI_USAGE_SHOWN} 次调用，最多保留 ${AI_USAGE_KEPT} 条；累计数见上表。</p>
    </div></section>`;
  }

  document.addEventListener('change', event => {
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
    const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 40;
    openwaKeepPlaying(() => {
      box.innerHTML = messagesHTML(c);
    });
    paintIcons(box);
    if (atBottom) scrollMessages();
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
    const ask = event.target.closest?.('[data-ai-transcribe]');
    if (ask) aiTranscribe(ask.dataset.aiTranscribe);
  });

  aiDetectRelay();
