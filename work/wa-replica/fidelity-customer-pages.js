  // Customer history and tag usage share the same demo records as the other pages.
  const recordView = { translate: true };
  let statsTagId = '';

  function resetRecordFilters() {
    Object.assign(recordView, {
      platform: '',
      accountId: '', customerId: '', accountQuery: '', contactQuery: '',
      messageQuery: '', limit: 200, step: 'accounts',
    });
  }

  function resetCustomerPages() {
    resetRecordFilters();
    statsTagId = '';
  }
  resetCustomerPages();

  const recordsAccounts = () => myAccounts().filter(a =>
    !recordView.platform || recordView.platform === 'wa'
  );

  function recordListItem(label, detail, search, action, id, selected) {
    return `<button type="button" class="fid-record-item" data-record-search="${esc(search)}" data-action="${action}" ${fidActionID(id)} aria-label="${esc(label)}" aria-pressed="${selected}">
      <strong>${esc(label)}</strong><small>${esc(detail)}</small>
    </button>`;
  }

  function recordList(title, type, placeholder, query, rows, emptyLabel) {
    const searchId = `fid-record-${type}-search`;
    return `<section class="fid-record-column fid-record-${type}" aria-label="${title}">
      <div class="fid-record-heading"><h2>${title}</h2>${fidIcon('刷新'+title,'fidRecordsRefresh','RefreshCw')}</div>
      ${type==='contact'?fidButton('返回社交账号','fidRecordBack','ArrowLeft','fid-record-back',fidActionID('accounts')):''}
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

  function recordMessages(customer) {
    if (!customer) return empty(recordView.accountId ? '选择联系人查看聊天记录' : '选择账号查看聊天记录', '');
    const list = conversationMessages(customer).filter(message =>
      fidMatch([message.text, message.translated, message.attachment].filter(Boolean).join(' '), recordView.messageQuery)
    );
    if (!list.length && recordView.messageQuery) return empty('没有匹配的消息', '试试其他关键词。');
    const older = list.length > recordView.limit ? fidButton('加载更早消息','fidRecordsOlder','', 'fid-record-older') : '';
    return older + messagesHTML(customer, { list: list.slice(-recordView.limit), showTranslation: recordView.translate, emptyHint: '这个联系人还没有聊天记录。' });
  }

  function renderChatRecords() {
    const accounts = recordsAccounts();
    const selectedAccount = accounts.find(item => item.id === recordView.accountId);
    const contacts = selectedAccount ? myCustomers().filter(item => item.account === selectedAccount.id) : [];
    const selectedContact = contacts.find(item => item.id === recordView.customerId);
    if (!selectedAccount) Object.assign(recordView, {accountId:'', customerId:'', step:'accounts'});
    else if (!selectedContact) Object.assign(recordView, {customerId:'', step:'contacts'});
    const accountRows = accounts.map(item => recordListItem(item.name, item.number,
      [item.name,item.number].join(' '), 'fidRecordAccount', item.id, item === selectedAccount)).join('');
    const contactRows = contacts.map(item => recordListItem(item.name, item.phone,
      [item.name,item.phone,item.notes].join(' '), 'fidRecordContact', item.id, item === selectedContact)).join('');

    return `<section class="fid-page fid-history-page">
      ${fidHead('聊天记录','按社交账号和联系人查看 WhatsApp 演示消息。')}
      <form id="fid-record-filter-form" class="fid-filter-row fid-record-filters">
        <select class="fid-select" name="platform" aria-label="选择平台">${fidOption([['','请选择平台'],['wa','WhatsApp']], recordView.platform)}</select>
        <button type="submit" class="fid-btn gradient">${icon('Search')}搜索</button>${fidButton('重置','fidRecordsReset','RotateCw')}
      </form>
      <div class="fid-history-grid" data-record-step="${recordView.step}">
        ${recordList('社交账号','account','账号/昵称搜索',recordView.accountQuery,accountRows,'暂无匹配账号')}
        ${recordList('对话','contact','账号/昵称/备注搜索',recordView.contactQuery,contactRows,selectedAccount?'暂无匹配对话':'请先选择账号')}
        <section class="fid-record-column fid-record-thread" aria-label="历史消息">
          <div class="fid-record-heading"><h2>${esc(selectedContact?.name || (selectedAccount ? '未选择对话' : '未选择账号'))}</h2>${fidIcon('刷新消息','fidRecordsRefresh','RefreshCw')}</div>
          ${fidButton('返回对话','fidRecordBack','ArrowLeft','fid-record-back',fidActionID('contacts'))}
          <div class="fid-record-search"><input type="search" id="fid-record-message-search" class="fid-input" aria-label="搜索历史消息" placeholder="搜索消息" value="${esc(recordView.messageQuery)}" ${selectedContact?'':'disabled'}></div>
          <div class="messages fid-record-messages" id="fid-record-messages" tabindex="0">${recordMessages(selectedContact)}</div>
        </section>
        <aside class="fid-record-translate" aria-label="翻译设置">
          <h2>翻译设置</h2>
          <label class="fid-record-toggle" for="fid-record-translation">聊天翻译 <input type="checkbox" id="fid-record-translation" role="switch" ${recordView.translate?'checked':''}></label>
          <label for="fid-record-language">目标语言</label>
          <select id="fid-record-language" class="fid-select"><option>中文（简体）</option></select>
        </aside>
      </div>
    </section>`;
  }

  function selectRecordAccount(id) {
    if (!recordsAccounts().some(item => item.id === id)) return;
    Object.assign(recordView, { accountId:id, customerId:'', contactQuery:'', messageQuery:'', limit:200, step:'contacts' });
    render();
  }

  function selectRecordContact(id) {
    if (!myCustomers().some(item => item.id === id && item.account === recordView.accountId)) return;
    Object.assign(recordView, { customerId:id, messageQuery:'', limit:200, step:'messages' });
    render();
  }

  function applyRecordFilters(values, value) {
    Object.assign(recordView, { platform: value('platform') });
    render();
  }

  function refreshRecordMessages() {
    const container = $('#fid-record-messages');
    if (!container) return;
    const selected = myCustomers().find(item => item.id === recordView.customerId && item.account === recordView.accountId);
    container.innerHTML = recordMessages(selected);
    paintIcons(container);
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
    fidRecordAccount: selectRecordAccount,
    fidRecordContact: selectRecordContact,
    fidRecordBack: id => {
      if (id === 'accounts') Object.assign(recordView, { accountId:'', customerId:'' });
      if (id === 'contacts') recordView.customerId = '';
      recordView.step = id;
      render();
    },
    fidRecordsOlder: () => { recordView.limit += 200; refreshRecordMessages(); },
    fidRecordsReset: () => { resetRecordFilters(); render(); },
    fidRecordsRefresh: () => { render(); toast('聊天记录已刷新。'); },
    fidStatsTag: id => { statsTagId = id; render(); },
  });
  fidForms['fid-record-filter-form'] = applyRecordFilters;

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'fid-record-account-search') {
      recordView.accountQuery = input.value;
      filterRecordList('account', input.value);
    } else if (input.id === 'fid-record-contact-search') {
      recordView.contactQuery = input.value;
      filterRecordList('contact', input.value);
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
    renderCustomerPages();
    if (ui.view !== 'chat-records') return;
    filterRecordList('account', recordView.accountQuery);
    filterRecordList('contact', recordView.contactQuery);
  };
