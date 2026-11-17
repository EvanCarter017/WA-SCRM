  // Chat history is an archive: conversations are moved here from the WhatsApp chat as frozen snapshots,
  // for performance review and auditing. It has no rating and no pass/fail classification.
  // Tag statistics share this file.
  const recordView = { translate: true };
  let statsTagId = '';

  const chatArchives = () => (data.chatArchives ??= []);
  const myArchives = () => chatArchives().filter(record => manager() || record.ownerId === ui.persona);

  function resetRecordFilters() {
    Object.assign(recordView, { recordId: '', listQuery: '', messageQuery: '', limit: 200, step: 'archives' });
  }

  function resetCustomerPages() {
    resetRecordFilters();
    statsTagId = '';
  }
  resetCustomerPages();

  // Freeze a conversation as it is now. The live conversation is not changed.
  function archiveConversation(c, reason) {
    const record = {
      id: nextId('ar'),
      customerId: c.id, customerName: c.name, customerPhone: c.phone, language: c.language,
      accountId: c.account, accountName: account(c.account)?.name || '',
      ownerId: c.owner, ownerName: member(c.owner)?.name || '',
      movedBy: me()?.name || '', movedAt: new Date().toISOString(), reason,
      messages: conversationMessages(c).map(message => ({ ...message })),
    };
    chatArchives().unshift(record);
    return record;
  }

  // Two demo snapshots, written once per browser so the page is not empty on first visit.
  function seedChatArchives() {
    if (data.chatArchiveSeeded) return;
    data.chatArchiveSeeded = true;
    if (chatArchives().length) return;
    const olivia = customer('c3');
    const mateo = customer('c2');
    if (olivia) Object.assign(archiveConversation(olivia, '老客户回访话术示例，供新人参考'), { movedAt: fidDay(-3) });
    if (mateo) Object.assign(archiveConversation(mateo, '波多黎各交付咨询，申请复盘首响时效'), { movedAt: fidDay(-1) });
  }

  function recordListItem(label, detail, search, action, id, selected) {
    return `<button type="button" class="fid-record-item" data-record-search="${esc(search)}" data-action="${action}" ${fidActionID(id)} aria-label="${esc(label)}" aria-pressed="${selected}">
      <strong>${esc(label)}</strong><small>${esc(detail)}</small>
    </button>`;
  }

  function recordList(title, type, placeholder, query, rows, emptyLabel) {
    const searchId = `fid-record-${type}-search`;
    return `<section class="fid-record-column fid-record-${type}" aria-label="${title}">
      <div class="fid-record-heading"><h2>${title}</h2>${fidIcon('刷新'+title,'fidRecordsRefresh','RefreshCw')}</div>
      <div class="fid-record-search"><input type="search" id="${searchId}" class="fid-input" value="${esc(query)}" placeholder="${placeholder}" aria-label="${title}搜索"></div>
      <div class="fid-record-list" data-record-list="${type}">${rows}<p class="fid-record-empty" data-record-empty>${esc(emptyLabel)}</p></div>
    </section>`;
  }

  function filterRecordList(type, query) {
    const list = document.querySelector(`[data-record-list="${type}"]`);
    if (!list) return;
    let matches = 0;
    for (const row of list.querySelectorAll('[data-record-search]')) {
      row.hidden = !fidMatch(row.dataset.recordSearch, query);
      if (!row.hidden) matches++;
    }
    list.querySelector('[data-record-empty]').hidden = matches > 0;
  }

  function recordMessages(record) {
    if (!record) {
      return myArchives().length
        ? empty('选择左侧的归档会话查看快照', '')
        : empty('还没有归档会话', '在 WhatsApp 会话中点击「移入聊天记录」，或使用上方的「从 WhatsApp 会话移入」。');
    }
    const list = record.messages.filter(message =>
      fidMatch([message.text, message.translated, message.attachment].filter(Boolean).join(' '), recordView.messageQuery)
    );
    if (!list.length && recordView.messageQuery) return empty('没有匹配的消息', '试试其他关键词。');
    const older = list.length > recordView.limit ? fidButton('加载更早消息','fidRecordsOlder','', 'fid-record-older') : '';
    return older + messagesHTML(record, { list: list.slice(-recordView.limit), showTranslation: recordView.translate, emptyHint: '这个快照没有消息。' });
  }

  // Right-hand panel: snapshot facts, actions, and the translation switch.
  function archiveAside(record) {
    const translate = `<h2>翻译设置</h2>
      <label class="fid-record-toggle" for="fid-record-translation">聊天翻译 <input type="checkbox" id="fid-record-translation" role="switch" ${recordView.translate?'checked':''}></label>`;
    if (!record) return `<aside class="fid-record-translate fid-archive-aside" aria-label="快照信息与设置">${translate}</aside>`;
    const live = myCustomers().find(c => c.id === record.customerId);
    const newer = live ? conversationMessages(live).length - record.messages.length : 0;
    return `<aside class="fid-record-translate fid-archive-aside" aria-label="快照信息与设置">
      <h2>快照信息</h2>
      <dl class="fid-archive-meta">
        <dt>客户</dt><dd>${esc(record.customerName)}<small>${esc(record.customerPhone || '')}</small></dd>
        <dt>负责聊手</dt><dd>${esc(record.ownerName || '—')} · ${esc(record.accountName || '—')}</dd>
        <dt>移入</dt><dd>${esc(record.movedBy || '—')} · ${esc(fidDate(record.movedAt))}</dd>
        <dt>移入原因</dt><dd>${esc(record.reason)}</dd>
        <dt>快照消息</dt><dd>${record.messages.length} 条${newer > 0 ? `<small>实时会话之后新增 ${newer} 条，未计入快照</small>` : ''}</dd>
      </dl>
      <div class="fid-archive-actions">
        ${live ? fidButton('打开实时会话', 'openConversation', 'MessageCircle', 'slim', fidActionID(live.id)) : ''}
        ${fidButton('移出聊天记录', 'fidArchiveRemove', 'Trash2', 'slim', fidActionID(record.id))}
      </div>
      ${translate}
    </aside>`;
  }

  function renderChatRecords() {
    const records = myArchives();
    const selected = records.find(record => record.id === recordView.recordId);
    if (!selected) Object.assign(recordView, { recordId: '', step: 'archives' });
    const rows = records.map(record => recordListItem(record.customerName,
      `${record.ownerName || '—'} · ${fidDate(record.movedAt).slice(0, 10)}`,
      [record.customerName, record.customerPhone, record.ownerName, record.reason].join(' '),
      'fidArchiveSelect', record.id, record === selected)).join('');
    return `<section class="fid-page fid-history-page">
      ${fidHead('聊天记录','从 WhatsApp 会话移入的快照，用于绩效复盘与审核。实时会话不受影响。')}
      <div class="fid-filter-row fid-record-filters">
        ${fidButton('从 WhatsApp 会话移入','fidArchivePick','Plus','blue')}
        <span class="fid-small-note">共 ${records.length} 条归档</span>
      </div>
      <div class="fid-history-grid fid-archive-grid" data-record-step="${recordView.step}">
        ${recordList('归档会话','archive','客户/聊手/原因搜索',recordView.listQuery,rows,records.length?'暂无匹配的归档会话':'还没有归档会话')}
        <section class="fid-record-column fid-record-thread" aria-label="会话快照">
          <div class="fid-record-heading"><h2>${esc(selected ? selected.customerName + ' · 快照' : '未选择归档会话')}</h2></div>
          ${fidButton('返回归档列表','fidRecordBack','ArrowLeft','fid-record-back',fidActionID('archives'))}
          <div class="fid-record-search"><input type="search" id="fid-record-message-search" class="fid-input" aria-label="搜索快照消息" placeholder="搜索消息" value="${esc(recordView.messageQuery)}" ${selected?'':'disabled'}></div>
          <div class="messages fid-record-messages" id="fid-record-messages" tabindex="0">${recordMessages(selected)}</div>
        </section>
        ${archiveAside(selected)}
      </div>
    </section>`;
  }

  function selectArchive(id) {
    if (!myArchives().some(record => record.id === id)) return;
    Object.assign(recordView, { recordId: id, messageQuery: '', limit: 200, step: 'messages' });
    render();
  }

  function refreshRecordMessages() {
    const container = $('#fid-record-messages');
    if (!container) return;
    container.innerHTML = recordMessages(myArchives().find(record => record.id === recordView.recordId));
    paintIcons(container);
  }

  // Move a conversation in. With an id the customer is fixed (called from the chat screen); without one the user picks.
  function openArchiveAdd(id = '') {
    const list = myCustomers();
    if (!list.length) return toast('还没有可移入的会话。');
    const fixed = list.find(c => c.id === id);
    const count = c => conversationMessages(c).length;
    const target = fixed
      ? `<input type="hidden" name="customerId" value="${esc(fixed.id)}">`
      : fidFormRow('选择会话', `<select class="fid-select" style="width:100%" name="customerId">${list.map(c => option(c.id, `${c.name}（${count(c)} 条消息 · ${account(c.account)?.name || '未绑号'}）`, list[0].id)).join('')}</select>`, '', true);
    fidForm(
      fixed ? `移入聊天记录 · ${fixed.name}` : '从 WhatsApp 会话移入',
      'fid-archive-add',
      `${target}
       <p class="fid-field-help" style="margin:0 0 12px">${fixed ? `将该会话当前的 ${count(fixed)} 条消息` : '将所选会话当前的全部消息'}作为快照移入「聊天记录」，用于绩效复盘与审核。实时会话不受影响，可继续沟通。</p>
       ${fidFormRow('移入原因', `<input class="fid-input" style="width:100%" name="reason" required maxlength="80" placeholder="如：首单成交过程复盘 / 客户投诉处理">`, '', true)}`,
      '确认移入',
      { wide: true }
    );
  }

  function tagStatCard(glyph, used, total, caption, tone) {
    return `<div class="fid-stat-card"><span class="fid-stat-symbol ${tone}">${icon(glyph)}</span>
      <div><strong>${used}/${total}</strong><span>${esc(caption)}</span></div></div>`;
  }

  function tagStatsDetail(item, customers) {
    if (!item) return '<p class="fid-stats-empty">还没有标签，请先到 <a class="fid-link" href="#tags" data-nav="tags">标签管理</a> 添加。</p>';
    const count = fidTagCount(item.id,customers);
    return `<div class="fid-stats-detail">
      <div class="fid-heading"><h2>${esc(item.name)}</h2><span class="fid-field-help">${esc(group(item.group)?.name)}</span></div>
      ${tagStatCard('UsersRound',count,customers.length,'打了此标签的客户数/客户总数','jade')}
      <p class="fid-stats-drill">${fidButton('查看客户','fidTagCustomers','UsersRound','tint',fidActionID(item.id))}</p>
    </div>`;
  }

  function renderTagStats() {
    const groups = fidGroupList();
    const tags = myTags();
    const customers = myCustomers();
    const usedIds = new Set(customers.flatMap(item => item.tags));
    const usedTags = tags.filter(t=>usedIds.has(t.id)).length;
    const visibleIds = new Set(tags.map(t=>t.id));
    const taggedCustomers = customers.filter(item => item.tags.some(id => visibleIds.has(id))).length;
    const current = tags.find(item => item.id === statsTagId) || tags[0];
    statsTagId = current?.id || '';
    const tree = groups.map(group => {
      const groupTags = tags.filter(item => item.group === group.id);
      if (!groupTags.length) return '';
      const buttons = groupTags.map(item => `<button type="button" class="fid-stats-tag" data-action="fidStatsTag" ${fidActionID(item.id)} aria-pressed="${item===current}">${esc(item.name)}</button>`).join('');
      return `<details open><summary>${esc(group.name)}</summary>${buttons}</details>`;
    }).join('');
    return `<section class="fid-page"><div class="fid-panel fid-stats-panel">
      ${fidHead('标签统计')}
      <div class="fid-stats-cards">${tagStatCard('Tag',usedTags,tags.length,'已使用标签数/标签总数','blue')}${tagStatCard('UsersRound',taggedCustomers,customers.length,'已打标签客户数/客户总数','jade')}</div>
      <div class="fid-stats-grid"><aside class="fid-stats-tree" aria-label="标签分组"><h2>全部标签</h2>${tree}</aside>${tagStatsDetail(current,customers)}</div>
    </div></section>`;
  }

  Object.assign(fidActions, {
    fidArchiveSelect: selectArchive,
    fidArchiveOpen: id => openArchiveAdd(id),
    fidArchivePick: () => openArchiveAdd(),
    fidArchiveRemove: id => {
      const record = myArchives().find(item => item.id === id);
      if (record) fidConfirm('移出聊天记录', `确认移出与 ${record.customerName} 的会话快照？快照将被删除，实时会话不受影响。`, 'fidArchiveRemoveConfirm', id);
    },
    fidArchiveRemoveConfirm: id => {
      const index = chatArchives().findIndex(item => item.id === id && (manager() || item.ownerId === ui.persona));
      if (index < 0) return;
      const [record] = chatArchives().splice(index, 1);
      if (recordView.recordId === id) Object.assign(recordView, { recordId: '', step: 'archives' });
      persist();
      close();
      render();
      toast(`已移出与 ${record.customerName} 的会话快照。`);
    },
    fidRecordBack: () => { Object.assign(recordView, { recordId: '', step: 'archives' }); render(); },
    fidRecordsOlder: () => { recordView.limit += 200; refreshRecordMessages(); },
    fidRecordsRefresh: () => { render(); toast('聊天记录已刷新。'); },
    fidStatsTag: id => { statsTagId = id; render(); },
  });

  fidForms['fid-archive-add-form'] = (f, v) => {
    const c = myCustomers().find(item => item.id === v('customerId'));
    if (!c) return error('请选择要移入的会话。');
    if (!v('reason')) return error('请填写移入原因。');
    const size = conversationMessages(c).length;
    if (!size) return error('该会话还没有消息，无法移入。');
    if (chatArchives().some(record => record.customerId === c.id && record.messages.length === size)) {
      return error('该会话的当前内容已在聊天记录中。');
    }
    const record = archiveConversation(c, v('reason'));
    lcLog(c.id, 'profile', `会话快照已移入聊天记录：${record.reason}`);
    Object.assign(recordView, { recordId: record.id, listQuery: '', messageQuery: '', limit: 200, step: 'messages' });
    persist();
    close();
    render();
    toast(`已将与 ${c.name} 的会话移入聊天记录（${size} 条消息）。`);
  };

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'fid-record-archive-search') {
      recordView.listQuery = input.value;
      filterRecordList('archive', input.value);
    } else if (input.id === 'fid-record-message-search') {
      recordView.messageQuery = input.value;
      refreshRecordMessages();
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id !== 'fid-record-translation') return;
    recordView.translate = event.target.checked;
    refreshRecordMessages();
  });

  const renderCustomerPages = render;
  render = function() {
    seedChatArchives();
    renderCustomerPages();
    if (ui.view !== 'chat-records') return;
    filterRecordList('archive', recordView.listQuery);
  };
