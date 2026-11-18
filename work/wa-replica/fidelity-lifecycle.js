  // ============================================================================
  // WhatsApp SCRM Customer Engagement Loop (v0.8)
  // Every customer being followed up must have a next follow-up. A customer leaves
  // the loop only when follow-up is explicitly ended, and resurfaces when they write
  // again. User-defined tags are the only classification.
  // Lifecycle stages, pipelines and quotes/orders were removed in v0.8 (deferred).
  // The file name and the `lc` prefix are kept from the lifecycle build on purpose.
  // ============================================================================

  const lcIsClosed = c => c?.engagement === 'closed';

  // Saved data from the stage-based builds (v0.6 / v0.7): a customer archived as lost becomes "已结束跟进".
  // This is the only place allowed to read the legacy stage fields.
  function lcMigrateEngagement(c) {
    if (c.engagement === 'open' || c.engagement === 'closed') return;
    const legacyStage = (data.pipelines || []).flatMap(p => p.stages || []).find(s => s.id === c.stage);
    const wasLost = legacyStage?.category === 'lost' || c.stage === '流失归档';
    c.engagement = wasLost ? 'closed' : 'open';
    if (wasLost) {
      c.closedReason ||= [c.lostReason, c.lostDetail].filter(Boolean).join(' · ') || '未记录原因';
      c.closedAt ||= c.stageEnteredAt || c.updatedAt || null;
    }
  }

  const LC_INTENT_LEVELS = ['高意向', '中意向', '了解中'];

  // Customer tier (set by hand; S is the highest). '' means not rated yet.
  const LC_TIERS = ['S', 'A', 'B', 'C', 'D'];
  const LC_TIER_TONES = { S: 'purple', A: 'blue', B: 'jade', C: 'gold', D: 'slate' };
  // Customer status (set by hand; one value). '' means not marked yet.
  const LC_CUSTOMER_STATUSES = [['converted', '已成交', 'ok'], ['abandoned', '弃单', 'warn'], ['organic', '自然线索', 'info']];
  const lcTier = c => LC_TIERS.includes(c?.tier) ? c.tier : '';
  const lcCustomerStatus = c => LC_CUSTOMER_STATUSES.some(([id]) => id === c?.customerStatus) ? c.customerStatus : '';
  const lcCustomerStatusLabel = c => LC_CUSTOMER_STATUSES.find(([id]) => id === lcCustomerStatus(c))?.[1] || '未标记';
  const lcTierBadge = c => lcTier(c)
    ? `<span class="lc-stage-badge lc-tier ${LC_TIER_TONES[lcTier(c)]}" title="客户等级：${lcTier(c)} 级">${lcTier(c)}</span>`
    : '<span class="lc-pill neutral">未评级</span>';
  const lcCustomerStatusPill = c => `<span class="lc-pill ${LC_CUSTOMER_STATUSES.find(([id]) => id === lcCustomerStatus(c))?.[2] || 'neutral'}">${esc(lcCustomerStatusLabel(c))}</span>`;
  // Two drop-downs that save as soon as they change (see the change listener at the end of this file).
  function lcGradeControls(c) {
    return `<label class="lc-inline-select"><span>等级</span><select class="fid-select" data-lc-tier="${esc(c.id)}" aria-label="客户等级">${option('', '未评级', lcTier(c))}${LC_TIERS.map(t => option(t, t + ' 级', lcTier(c))).join('')}</select></label>
      <label class="lc-inline-select"><span>客户状态</span><select class="fid-select" data-lc-status="${esc(c.id)}" aria-label="客户状态">${option('', '未标记', lcCustomerStatus(c))}${LC_CUSTOMER_STATUSES.map(([id, label]) => option(id, label, lcCustomerStatus(c))).join('')}</select></label>`;
  }

  const lcState = {
    followTab: 'todo',
    signal: 'all',
    followTags: [],
    followFocus: null,
    customerHealthFilter: 'all',
    customerTier: 'all',
    customerStatus: 'all',
    dossierTab: 'overview',
    timelineFilter: 'all',
  };

  function lcSeed() {
    // Seed extra demo customers once so every engagement signal has a realistic case
    if (!data.lcSeededV06) {
      const extraCustomers = [
        {
          id: 'c9', name: 'Brandon Miller', initials: 'BM', color: 'blue',
          phone: '+1 (737) 555-0162', country: 'US', city: 'Austin', timezone: 'America/Chicago',
          language: '英语', owner: 'lin', account: 'a1', tags: [],
          source: 'Facebook 广告', campaign: 'US · 目录直达广告 D', ad: '规格答疑 · 素材 04',
          unread: 2, star: true, last: '10 分钟前',
          preview: 'Hi! Just added your WhatsApp from the ad. Do you ship to Texas and have a price list?',
          translation: '你好！刚从广告加了你们 WhatsApp。请问支持发德州吗？有价目目录吗？',
          followup: fidDay(0), notes: '刚进线高意向咨询，需首响回复目录与德州时效。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(0), updatedAt: fidDay(0),
          clientType: '新增线索-实时', intentLevel: '高意向',
          qualification: {
            demand: '询问常规目录价目表与德州派送安排',
            volume: '待首响确认（预计首批测试）',
            deliveryRegion: 'US · TX Austin',
            objection: '关注发货地与签收时效',
            commWindow: '美中工作时间（文字沟通）',
          },
        },
        {
          id: 'c10', name: 'Harper Davis', initials: 'HD', color: 'gold',
          phone: '+1 (312) 555-0168', country: 'US', city: 'Chicago', timezone: 'America/Chicago',
          language: '英语', owner: 'lin', account: 'a1', tags: [],
          source: 'Facebook 广告', campaign: 'US · 咨询广告 A', ad: '目录介绍 · 素材 02',
          unread: 0, star: false, last: '2 天前',
          preview: 'Got the quote PDF, let me review the quantities with my partner.',
          translation: '收到报价了，我和合伙人核对一下采购数量。',
          followup: null, notes: '已发组合报价 $2,450，客户表示与合伙人商议，当前漏排下一步跟进（断档示例）。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(-6), updatedAt: fidDay(-2),
          clientType: '新增线索-实时', intentLevel: '高意向', tier: 'A',
          qualification: {
            demand: '双规格组合采购方案，要求分批包装说明',
            volume: '$2,000 - $3,000 / 批',
            deliveryRegion: 'US · IL Chicago（期望 5 日内达）',
            objection: '需合伙人确认首批数量与阶梯折扣',
            commWindow: '美中上午 9:00 - 12:00',
          },
        },
        {
          id: 'c11', name: 'Carlos Vega', initials: 'CV', color: 'purple',
          phone: '+1 (787) 555-0173', country: 'PR', city: 'Bayamón', timezone: 'America/Puerto_Rico',
          language: '西班牙语', owner: 'lin', account: 'a2', tags: [],
          source: 'Instagram 广告', campaign: 'PR · 西语私域引流', ad: '西语客服直连 · 03',
          unread: 0, star: true, last: '昨天',
          preview: '¡Perfecto! Quedo atento a la entrega del paquete esta semana.',
          translation: '太好了！我会留意这周包裹的派送签收。',
          followup: fidDay(1), notes: '首单已收款并发出 USPS Priority，预计明日签收，签收后回访。',
          contactRefs: [{ account: 'a2', owner: 'lin' }],
          createdAt: fidDay(-9), updatedAt: fidDay(-1),
          clientType: '新增线索-实时', intentLevel: '高意向', tier: 'A', customerStatus: 'converted',
          qualification: {
            demand: '首批标准规格订单履约中，后续有按月补货意向',
            volume: '$1,300 - $1,800 / 月',
            deliveryRegion: 'PR · Bayamón',
            objection: '重点关注波多黎各派送稳定性',
            commWindow: '西语优先 · 当地午后',
          },
        },
        {
          id: 'c12', name: 'Rachel Green', initials: 'RG', color: 'slate',
          phone: '+1 (602) 555-0184', country: 'US', city: 'Phoenix', timezone: 'America/Phoenix',
          language: '英语', owner: 'lin', account: 'a1', tags: [],
          source: 'Facebook 广告', campaign: 'US · 咨询广告 A', ad: '目录介绍 · 素材 01',
          unread: 0, star: false, last: '12 天前',
          preview: 'We need to pause purchasing until next month’s budget opens up.',
          translation: '我们需要暂停采购，等下个月预算开放后再推进。',
          followup: null, notes: '因季度预算排期暂缓，已结束跟进；预算开放后再联系。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(-22), updatedAt: fidDay(-12),
          clientType: '新增线索-实时', intentLevel: '中意向', tier: 'C', customerStatus: 'abandoned',
          engagement: 'closed', closedReason: '客户季度预算冻结，下一轮预算开放后再联系', closedAt: fidDay(-12),
          qualification: {
            demand: '季度常规采购询盘，曾索取整箱阶梯报价',
            volume: '$3,000+ / 季度',
            deliveryRegion: 'US · AZ Phoenix',
            objection: '内部预算节点延后，对产品本身无异议',
            commWindow: '英语沟通 · 工作日邮件/WA同步',
          },
        },
      ];
      for (const ec of extraCustomers) {
        if (!data.customers.some(x => x.id === ec.id)) data.customers.push(ec);
      }

      data.messages.c9 ??= [
        { id: 'm901', side: 'in', text: 'Hello, saw your post on Facebook.', translated: '你好，在 Facebook 上看到了你们的推广。', time: '09:45' },
        { id: 'm902', side: 'in', text: 'Hi! Just added your WhatsApp from the ad. Do you ship to Texas and have a price list?', translated: '你好！刚从广告加了你们 WhatsApp。请问支持发德州吗？有价目目录吗？', time: '09:48' },
      ];
      data.messages.c10 ??= [
        { id: 'm1001', side: 'in', text: 'Can you share a formal quote for two sets shipped to Chicago?', translated: '可以发一份两套发往芝加哥的正式报价吗？', time: '2天前 11:10' },
        { id: 'm1002', side: 'out', text: 'Sure Harper! I have prepared Quote #QT-202611-02 ($2,450 total including priority shipping).', attachment: 'Quote-QT-202611-02.pdf', time: '2天前 11:26', read: true },
        { id: 'm1003', side: 'in', text: 'Got the quote PDF, let me review the quantities with my partner.', translated: '收到报价了，我和合伙人核对一下采购数量。', time: '2天前 14:05' },
      ];
      data.messages.c11 ??= [
        { id: 'm1101', side: 'in', text: 'Pago enviado, ¿cuándo sale el envío para Bayamón?', translated: '款项已付，请问什么时候发往巴亚蒙？', time: '昨天 10:15' },
        { id: 'm1102', side: 'out', text: '¡Gracias Carlos! Tu pedido #ORD-202611-104 ya salió por USPS Priority. Te aviso al entregarse.', time: '昨天 15:40', read: true },
        { id: 'm1103', side: 'in', text: '¡Perfecto! Quedo atento a la entrega del paquete esta semana.', translated: '太好了！我会留意这周包裹的派送签收。', time: '昨天 16:02' },
      ];
      data.messages.c12 ??= [
        { id: 'm1201', side: 'out', text: 'Hi Rachel, checking in on Quote #QT-202610-19 ($3,100). Would you like to lock in this batch?', time: '12天前 10:30', read: true },
        { id: 'm1202', side: 'in', text: 'We need to pause purchasing until next month’s budget opens up.', translated: '我们需要暂停采购，等下个月预算开放后再推进。', time: '12天前 13:18' },
      ];

      // Enrich the base customers c1-c8 with requirement profiles
      const enrichMap = {
        c1: {
          intentLevel: '高意向', tier: 'B',
          qualification: {
            demand: '索取最新产品总目录，对比常规规格与批次交付周期',
            volume: '$1,200 - $2,000 / 首单',
            deliveryRegion: 'US · TX Austin',
            objection: '正在横向对比 2 家渠道的响应速度与交付稳定性',
            commWindow: '偏好文字消息 · 美中白天',
          },
        },
        c2: {
          intentLevel: '高意向', tier: 'C',
          qualification: {
            demand: '确认波多黎各（San Juan）是否支持稳定直发与时效',
            volume: '待确认具体采购量',
            deliveryRegion: 'PR · San Juan',
            objection: '担心海岛地区运费偏高或清关延误',
            commWindow: '西班牙语沟通优先',
          },
        },
        c3: {
          intentLevel: '高意向', tier: 'S', customerStatus: 'converted',
          reactivatedCount: 1,
          qualification: {
            demand: '长期稳定老客（已完成 2 单），按月固定补货常规组合',
            volume: '$1,500 - $2,200 / 月',
            deliveryRegion: 'US · FL Miami',
            objection: '无价格异议，重视批次稳定与邮件同步资料',
            commWindow: '英语沟通 · 偏好提前 3 天确认排期',
          },
        },
        c4: {
          intentLevel: '高意向', tier: 'A',
          qualification: {
            demand: '已发首批标准方案报价 $1,680，正在核实加州签收时效',
            volume: '$1,680（首单报价确认中）',
            deliveryRegion: 'US · CA San Francisco',
            objection: '希望确认付款后 48h 内发出并给追踪号',
            commWindow: '美西上午活跃',
          },
        },
        c5: {
          intentLevel: '中意向', tier: 'C', customerStatus: 'organic',
          qualification: {
            demand: '需要全套西语版说明手册与入门规格建议',
            volume: '$600 - $1,000 / 试单',
            deliveryRegion: 'PR · Ponce',
            objection: '首次接触，需阅读西语详细参数后再决定数量',
            commWindow: '西语文字沟通',
          },
        },
        c6: {
          intentLevel: '中意向', tier: 'B', customerStatus: 'converted',
          qualification: {
            demand: '老客转介绍试单客户（首单 $890 已签收 40 天），发新版目录后未回',
            volume: '$800 - $1,500',
            deliveryRegion: 'US · NY New York',
            objection: '上次回复看完目录再联系，超期 15 天未复购需关怀唤醒',
            commWindow: '美东工作时间',
          },
        },
        c7: { intentLevel: '高意向', tier: 'B' },
        c8: { intentLevel: '高意向', tier: 'C' },
      };
      for (const [cid, patch] of Object.entries(enrichMap)) {
        const target = customer(cid);
        if (target) Object.assign(target, patch);
      }

      // To-dos for the new customers (c10 deliberately has none, to demonstrate the 跟进断档 signal)
      if (!data.tasks.some(t => t.customer === 'c9')) {
        data.tasks.unshift(
          { id: 't9', customer: 'c9', owner: 'lin', title: '首响回复目录与德州发货时效说明', due: fidDay(0), priority: 'high', done: false },
          { id: 't11', customer: 'c11', owner: 'lin', title: '跟进波多黎各包裹签收并做首单满意度回访', due: fidDay(1), priority: 'normal', done: false }
        );
      }

      // Enrich the demo timeline activities
      data.activities.c3 = [
        { category: 'followup', text: '完成回访：客户确认第二批到货满意，约定下月初再确认补货需求', by: '林予', time: '23天前', createdAt: fidDay(-23) },
        { category: 'followup', text: '首次合作交付完成，已建立老客户回访节奏', by: '林予', time: '49天前', createdAt: fidDay(-49) },
      ];
      data.activities.c4 = [
        { category: 'followup', text: '已发送方案与价格说明，约定今日确认加州签收时效', by: '林予', time: '昨天 14:05', createdAt: fidDay(-1) },
      ];
      data.activities.c11 = [
        { category: 'followup', text: '已同步发货单号（USPS Priority），约定签收后回访', by: '林予', time: '昨天 15:40', createdAt: fidDay(-1) },
        { category: 'inbound', text: '客户确认付款并询问发货时间', by: '林予', time: '3天前', createdAt: fidDay(-3) },
      ];
      data.activities.c12 = [
        { category: 'followup', text: '结束跟进 · 客户季度预算冻结，下一轮预算开放后再联系', by: '林予', time: '12天前', createdAt: fidDay(-12) },
      ];

      data.lcSeededV06 = true;
    }

    // Sample orders (seeded once) for the demo customers whose story already mentions an order. The
    // first-contact time of c3 and c6 is moved back so that it precedes their orders.
    if (!data.lcSeededOrders) {
      const samples = {
        c3: { createdAt: fidDay(-58.2), orders: [
          { id: 'ord-c3-1', number: 'ORD-202609-031', placedAt: fidDay(-55.3), shipping: 'delivered' },
          { id: 'ord-c3-2', number: 'ORD-202610-077', placedAt: fidDay(-27.1), shipping: 'delivered' },
        ] },
        c6: { createdAt: fidDay(-47.4), orders: [
          { id: 'ord-c6-1', number: 'ORD-202610-012', placedAt: fidDay(-44.2), shipping: 'delivered' },
        ] },
        c11: { orders: [
          { id: 'ord-c11-1', number: 'ORD-202611-104', placedAt: fidDay(-3.1), shipping: 'shipped' },
        ] },
      };
      for (const [cid, sample] of Object.entries(samples)) {
        const target = customer(cid);
        if (target && !Array.isArray(target.orders)) Object.assign(target, sample);
      }
      data.lcSeededOrders = true;
    }

    // Ensure every customer has an engagement state and safe defaults
    for (const c of data.customers) {
      lcMigrateEngagement(c);
      c.intentLevel ||= '中意向';
      c.reactivatedCount ??= 0;
      c.qualification = {
        demand: '',
        volume: '',
        deliveryRegion: `${country(c)}${c.city && c.city !== '待补充' ? ' · ' + c.city : ''}`,
        objection: '',
        commWindow: `${c.language || '英语'}沟通`,
        ...(c.qualification || {}),
      };
      c.attribution ||= {
        platform: c.source || '未知来源',
        method: c.campaign ? '广告入口参数' : '人工核实',
        campaign: c.campaign || '',
        ad: c.ad || '',
      };
      const pending = data.tasks.filter(t => t.customer === c.id && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due));
      c.followup = pending[0]?.due || null;
    }
  }

  lcSeed();
  const lcOrigResetExtras = fidResetExtras;
  fidResetExtras = function() {
    lcOrigResetExtras();
    Object.assign(lcState, { followTab: 'todo', signal: 'all', followTags: [], followFocus: null, customerHealthFilter: 'all', customerTier: 'all', customerStatus: 'all' });
    lcSeed();
  };

  // Keep the engagement views in the workspace tabs; the base customer list's stage filter is no longer offered
  ui.openTabs = [...new Set(['dashboard', 'inbox', 'customers', 'followups', ...ui.openTabs.filter(id => Object.hasOwn(views, id))])];
  ui.customerStage = 'all';

  // ============================================================================
  // Engagement health signals
  // ============================================================================
  const lcNextTask = cid => data.tasks.filter(t => t.customer === cid && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due))[0] || null;

  function lcHealth(c) {
    const closed = lcIsClosed(c);
    const nextTask = lcNextTask(c.id);
    const awaitingReply = !closed && c.unread > 0;
    const recontact = closed && c.unread > 0;
    const overdue = !closed && Boolean(nextTask && beforeToday(nextTask.due));
    const noPlan = !closed && !nextTask;

    let primary = { key: 'healthy', label: '跟进正常', tone: 'ok', icon: 'BadgeCheck' };
    if (recontact) primary = { key: 'recontact', label: '复联待处理', tone: 'hot', icon: 'Flame' };
    else if (overdue) primary = { key: 'overdue', label: '跟进已逾期', tone: 'hot', icon: 'ClockAlert' };
    else if (awaitingReply) primary = { key: 'reply', label: '客户待回复', tone: 'warn', icon: 'Zap' };
    else if (noPlan) primary = { key: 'noplan', label: '跟进断档', tone: 'warn', icon: 'TriangleAlert' };
    else if (closed) primary = { key: 'closed', label: '已结束跟进', tone: 'neutral', icon: 'Archive' };

    return { primary, nextTask, closed, awaitingReply, recontact, overdue, noPlan };
  }

  // [id, label, icon] of the attention signals; 'all' means "any signal".
  const lcSignalDefs = [
    ['all', '全部信号', 'UsersRound'],
    ['reply', '客户待回复', 'Zap'],
    ['overdue', '跟进已逾期', 'ClockAlert'],
    ['noplan', '跟进断档', 'TriangleAlert'],
    ['recontact', '复联待处理', 'Flame'],
  ];
  const lcNeedsAttention = h => h.recontact || h.overdue || h.awaitingReply || h.noPlan;
  function lcMatchesSignal(c, signal) {
    const h = lcHealth(c);
    if (signal === 'reply') return h.awaitingReply;
    if (signal === 'overdue') return h.overdue;
    if (signal === 'noplan') return h.noPlan;
    if (signal === 'recontact') return h.recontact;
    return lcNeedsAttention(h);
  }
  const lcHasFollowTags = c => lcState.followTags.every(id => c.tags.includes(id));

  function lcLog(customerId, category, text, extra = {}) {
    const entry = {
      id: nextId('act'),
      category,
      text,
      by: me()?.name || '林予',
      time: '刚刚',
      createdAt: new Date().toISOString(),
      ...extra,
    };
    (data.activities[customerId] ??= []).unshift(entry);
    const c = customer(customerId);
    if (c) c.updatedAt = entry.createdAt;
  }

  function lcCreateTask({ customerId, title, dueIso, priority = 'normal' }) {
    const c = customer(customerId);
    if (!c || !title) return null;
    const due = dueIso || new Date(Date.now() + 86400000).toISOString();
    const t = {
      id: nextId('t'),
      customer: c.id,
      owner: c.owner || ui.persona,
      title,
      due,
      priority,
      done: false,
    };
    data.tasks.push(t);
    const next = lcNextTask(c.id);
    c.followup = next?.due || due;
    return t;
  }

  // End follow-up: the customer leaves the loop and pending to-dos are settled.
  // A later inbound message raises the "复联待处理" signal.
  function lcCloseEngagement(c, reason) {
    c.engagement = 'closed';
    c.closedReason = reason;
    c.closedAt = new Date().toISOString();
    for (const t of data.tasks) {
      if (t.customer === c.id && !t.done) {
        t.done = true;
        t.outcome = '随结束跟进自动结清';
        t.completedAt = c.closedAt;
      }
    }
    c.followup = null;
    c.unread = 0; // messages already seen when ending; anything unread afterwards is a real re-contact
    lcLog(c.id, 'followup', `结束跟进 · ${reason}`);
  }

  // Resume follow-up for a customer whose follow-up had ended; all history is kept.
  function lcReopenEngagement(c) {
    if (!lcIsClosed(c)) return;
    c.engagement = 'open';
    c.reactivatedCount = (c.reactivatedCount || 0) + 1;
    c.unread = 0;
    lcLog(c.id, 'followup', `重新跟进（第 ${c.reactivatedCount} 次）· 此前结束原因：${c.closedReason || '未记录'}`);
  }

  // Apply the tag checkboxes embedded in a follow-up dialog. Tags the current agent cannot see stay untouched.
  function lcApplyFormTags(c, f) {
    if (f.get('tagsTouched') !== '1') return;
    const allowed = new Set(myTags().map(t => t.id));
    const chosen = f.getAll('tags').map(String).filter(id => allowed.has(id));
    const next = [...new Set([...c.tags.filter(id => !allowed.has(id)), ...chosen])];
    if (next.length === c.tags.length && next.every(id => c.tags.includes(id))) return;
    c.tags = next;
    lcLog(c.id, 'profile', '同步更新客户标签');
  }

  // Collapsed tag picker for follow-up dialogs; '' when the agent has no tags yet.
  function lcTagDetails(c) {
    const choices = fidTagChoices(c.tags);
    return choices
      ? `<details class="lc-tag-details"><summary>同步更新客户标签（当前 ${c.tags.length} 个）</summary><input type="hidden" name="tagsTouched" value="1"><div class="fid-tag-picker">${choices}</div></details>`
      : '';
  }

  // ============================================================================
  // Navigation & Sidebar Integration
  // ============================================================================
  const lcCustomerMenu = ['customers', 'followups', 'chat-records', 'tags', 'tag-stats'];
  viewIcon = id => ({
    dashboard: 'LayoutDashboard',
    inbox: 'MessageCircle',
    accounts: 'Smartphone',
    customers: 'ContactRound',
    followups: 'ClipboardList',
    'chat-records': 'MessagesSquare',
    tags: 'Tags',
    'tag-stats': 'ChartColumn',
    materials: 'Images',
    team: 'Network',
    members: 'UsersRound',
    ai: 'Sparkles',
    scope: 'SlidersHorizontal',
  }[id] || 'FileText');

  menuHTML = function(mobile = false) {
    const attention = myCustomers().filter(c => lcNeedsAttention(lcHealth(c))).length;
    const renderItem = (id, label) => {
      const badge = id === 'followups' && attention && !mobile
        ? `<span class="nav-count" title="待处理信号">${attention}</span>`
        : id === 'scope' && !mobile
          ? '<span class="nav-count" id="pending-count"></span>'
          : '';
      return `<a class="nav-item ${ui.view === id ? 'active' : ''} ${id === 'scope' ? 'scope-link' : ''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view === id ? 'aria-current="page"' : ''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span>${badge}</a>`;
    };
    const navGroup = (title, glyph, action, opened, ids) =>
      `<button class="nav-group-button ${ids.includes(ui.view) ? 'group-active' : ''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened ? 'ChevronUp' : 'ChevronDown')}</button><div class="submenu" ${opened ? '' : 'hidden'}>${ids.map(id => renderItem(id, views[id])).join('')}</div>`;
    return (
      renderItem('dashboard', views.dashboard) +
      renderItem('inbox', views.inbox) +
      renderItem('accounts', views.accounts) +
      '<div class="nav-caption">客户与跟进</div>' +
      navGroup('客户与跟进闭环', 'ContactRound', 'fidNavCustomers', ui.customerNavOpen, lcCustomerMenu) +
      navGroup('运营管理', 'Images', 'fidNavOperations', fid.operationsOpen, operationsMenu) +
      (manager() ? '<div class="nav-caption">账户与组织</div>' + navGroup('组织管理', 'Network', 'fidNavOrg', fid.orgOpen, ['team', 'members']) : '') +
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('ai', views.ai) +
      renderItem('scope', views.scope)
    );
  };

  // ============================================================================
  // Customer 360° dossier drawer
  // ============================================================================
  // Order tracking (the 订单追踪 tab). Orders are typed in by hand — no shop or courier system is
  // connected — and live on the customer as c.orders: { id, number, placedAt, shipping }.
  // The top-level orders list that saved data of the removed deals centre may still hold has another
  // shape and is never read or written here.
  // Shipping status: [id, label, pill tone, icon].
  const LC_SHIPPING = [['pending', '待发货', 'warn', 'Clock3'], ['shipped', '已发货', 'info', 'Send'], ['delivered', '已签收', 'ok', 'CircleCheck'], ['problem', '异常（退回/丢件）', 'hot', 'TriangleAlert']];
  const lcShipping = id => LC_SHIPPING.find(s => s[0] === id) || LC_SHIPPING[0];
  // The customer's orders, newest first (a copy; write through c.orders).
  const lcOrders = c => (Array.isArray(c?.orders) ? c.orders : []).slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

  profileHTML = function(c) {
    const a = account(c.account);
    const m = member(c.owner);
    const h = lcHealth(c);
    const tab = ['overview', 'timeline', 'orders', 'notes'].includes(lcState.dossierTab) ? lcState.dossierTab : 'overview';
    const dirtyNote = Object.hasOwn(ui.noteDrafts, c.id);

    let tabBody = '';
    if (tab === 'overview') {
      const nextCard = h.nextTask
        ? `<div class="lc-card-block ${h.overdue ? 'hot-block' : ''}">
             <div class="lc-block-head">
               <h3>${icon(h.overdue ? 'ClockAlert' : 'CalendarClock')}当前待办跟进 ${h.overdue ? '<span class="lc-pill hot">已逾期</span>' : ''}</h3>
               <div class="lc-deal-actions">
                 ${fidButton('完成并闭环', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(h.nextTask.id))}
                 ${fidButton('新增待办', 'followup', 'Plus', 'slim', fidActionID(c.id))}
                 ${fidButton('结束跟进', 'lcCloseOpen', 'Archive', 'slim', fidActionID(c.id))}
               </div>
             </div>
             <p style="font-size:13px;font-weight:650">${esc(h.nextTask.title)}</p>
             <small style="color:var(--color-text-muted)">计划时间：${esc(dateLabel(h.nextTask.due))}</small>
           </div>`
        : !h.closed
          ? `<div class="lc-card-block warn-block">
               <div class="lc-block-head">
                 <h3>${icon('TriangleAlert')}跟进断档预警</h3>
                 <div class="lc-deal-actions">
                   ${fidButton('立即补排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
                   ${fidButton('结束跟进', 'lcCloseOpen', 'Archive', 'slim', fidActionID(c.id))}
                 </div>
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">该客户尚未安排下一次跟进，极易造成意向流失。请补排跟进，或明确结束跟进。</p>
             </div>`
          : `<div class="lc-card-block">
               <div class="lc-block-head">
                 <h3>${icon('Archive')}已结束跟进</h3>
                 ${fidButton('重新跟进', 'followup', 'RotateCcw', 'slim blue', fidActionID(c.id))}
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">结束原因：${esc(c.closedReason || '未记录')}${c.closedAt ? `（${esc(fidDate(c.closedAt).slice(0, 10))}）` : ''}。客户再次来信时会提示「复联待处理」。</p>
             </div>`;

      const duplicateNotice = (c.contactRefs?.length || 0) > 1
        ? `<button type="button" class="duplicate-note" style="margin-top:10px;width:100%" data-action="duplicate" ${fidActionID(c.id)}>${icon('Copy')}跨号撞单提示：该号码在 ${c.contactRefs.length} 个业务 WhatsApp 号下有接触记录${icon('ChevronRight')}</button>`
        : '';

      tabBody = `
        ${nextCard}
        <form id="lc-qual-form" class="lc-card-block">
          <input type="hidden" name="customerId" value="${esc(c.id)}">
          <div class="lc-block-head">
            <h3>${icon('Compass')}结构化客户需求画像（Qualification）</h3>
            <button type="submit" class="fid-btn slim blue">${icon('Check')}保存画像</button>
          </div>
          <div class="lc-qual-grid">
            <label class="lc-field"><span>意向等级</span><select class="fid-select" name="intentLevel">${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select></label>
            <label class="lc-field"><span>预计规模 / 预算区间</span><input class="fid-input" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如 $1,500 - $2,500 / 批"></label>
            <label class="lc-field full"><span>核心咨询需求与关注点</span><input class="fid-input" name="demand" value="${esc(c.qualification?.demand || '')}" placeholder="客户主要询问的品类方向、规格或合作诉求"></label>
            <label class="lc-field"><span>收件地区与时效要求</span><input class="fid-input" name="deliveryRegion" value="${esc(c.qualification?.deliveryRegion || '')}" placeholder="如 US · TX Austin"></label>
            <label class="lc-field"><span>沟通时段与偏好</span><input class="fid-input" name="commWindow" value="${esc(c.qualification?.commWindow || '')}" placeholder="如 英语文字 · 美中上午"></label>
            <label class="lc-field full"><span>当前异议 / 推进卡点</span><input class="fid-input" name="objection" value="${esc(c.qualification?.objection || '')}" placeholder="如 对比运费、等待合伙人拍板、关注清关"></label>
          </div>
        </form>
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('Tags')}客户标签与进线归因</h3>
            ${fidButton('设置标签', 'assignTags', 'Plus', 'slim', fidActionID(c.id))}
          </div>
          <div class="tag-row" style="margin-bottom:12px">${tagsHTML(c, 99, true) || '<span class="muted">暂未打标（可在标签管理自定义分组标签）</span>'}</div>
          <div class="info-row"><span>进线渠道</span><span><strong>${esc(c.source)}</strong>${c.campaign ? ' · ' + esc(c.campaign) : ''}</span></div>
          <div class="info-row"><span>广告素材 / 证据</span><span>${esc(c.ad || c.attribution?.method || '人工建档')}</span></div>
          <div class="info-row"><span>负责聊手 / 接待号</span><span>${esc(m?.name || '未分配')} · ${esc(a?.name || '—')}</span></div>
          ${duplicateNotice}
        </div>`;
    } else if (tab === 'timeline') {
      const raw = data.activities[c.id] || [];
      const catLabels = { all: '全部轨迹', followup: '跟进动作', inbound: '客户来信', order: '订单记录', profile: '资料与标签' };
      const filtered = raw.filter(item => {
        if (lcState.timelineFilter === 'all') return true;
        const cat = item.category || (item.text.includes('跟进') ? 'followup' : 'profile');
        return cat === lcState.timelineFilter;
      });
      tabBody = `
        <div class="lc-radar-chips">
          ${Object.entries(catLabels).map(([k, label]) =>
            `<button type="button" class="lc-radar-chip" data-action="lcTimelineFilter" ${fidActionID(k)} data-customer="${esc(c.id)}" aria-pressed="${lcState.timelineFilter === k}">${label}</button>`
          ).join('')}
        </div>
        <div class="lc-timeline">
          ${filtered.length
            ? filtered.map(item => {
                const cat = item.category || 'profile';
                return `<div class="lc-timeline-item cat-${esc(cat)}">
                  <div class="lc-timeline-top"><strong>${esc(item.by)}</strong><span>${esc(item.time || fidDate(item.createdAt))}</span></div>
                  <div class="lc-timeline-text">${esc(item.text)}</div>
                </div>`;
              }).join('')
            : '<p class="muted" style="padding:18px 0;text-align:center">该分类下暂无操作轨迹</p>'}
        </div>`;
    } else if (tab === 'orders') {
      const orders = lcOrders(c);
      const orderItems = orders.map(o => {
        const [status, label, tone, glyph] = lcShipping(o.shipping);
        return `<div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(o.number)} <span class="lc-pill ${tone}">${icon(glyph)}${esc(label)}</span></strong>
            <small>下单时间 ${esc(fidDate(o.placedAt))}</small>
          </div>
          <div class="lc-deal-actions">
            <label class="lc-inline-select"><span>更新状态</span><select class="fid-select" data-lc-order-shipping="${esc(o.id)}" data-customer="${esc(c.id)}" aria-label="订单 ${esc(o.number)} 的物流状态">${LC_SHIPPING.map(([id, text]) => option(id, text, status)).join('')}</select></label>
            <button type="button" class="icon-button" data-action="lcOrderRemove" ${fidActionID(o.id)} data-customer="${esc(c.id)}" aria-label="删除订单 ${esc(o.number)}">${icon('Trash2')}</button>
          </div>
        </div>`;
      }).join('');
      tabBody = `
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('MessageCircle')}首次联系</h3></div>
          <div class="info-row"><span>首次联系时间</span><span><strong>${esc(fidDate(c.createdAt))}</strong></span></div>
          <div class="info-row"><span>进线渠道</span><span>${esc(c.source || '—')}</span></div>
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('ClipboardList')}订单与物流（${orders.length}）</h3></div>
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无订单。客户下单后，在下方登记订单号、下单时间与物流状态。</p>'}
        </div>
        <form id="lc-order-form" class="lc-card-block">
          <input type="hidden" name="customerId" value="${esc(c.id)}">
          <div class="lc-block-head">
            <h3>${icon('SquarePen')}登记订单</h3>
            <button type="submit" class="fid-btn slim blue">${icon('Plus')}添加订单</button>
          </div>
          <div class="lc-qual-grid">
            <label class="lc-field"><span>订单号</span><input class="fid-input" name="number" required maxlength="40" placeholder="如 ORD-202611-105"></label>
            <label class="lc-field"><span>下单时间</span><input class="fid-input" type="datetime-local" name="placedAt" required value="${inputDate(new Date().toISOString())}"></label>
            <label class="lc-field full"><span>物流状态</span><select class="fid-select" name="shipping">${LC_SHIPPING.map(([id, text]) => option(id, text, 'pending')).join('')}</select></label>
          </div>
          <div id="form-error" class="form-error" role="alert"></div>
        </form>`;
    } else {
      tabBody = `
        <div class="lc-card-block customer-profile" style="border:1px solid var(--fid-frame)">
          <div class="lc-block-head"><h3>${icon('StickyNote')}客户沟通备忘与交接摘要</h3></div>
          <textarea class="profile-note" style="width:100%;min-height:140px" data-note-customer="${esc(c.id)}" id="customer-note-${esc(c.id)}-drawer" aria-label="客户备注" placeholder="记录客户性格偏好、关键决策人、特殊包装或历史约定…">${esc(dirtyNote ? ui.noteDrafts[c.id] : c.notes)}</textarea>
          <div class="note-save" style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span role="status" style="font-size:12px;color:var(--color-text-muted)">${dirtyNote ? '有未保存的修改' : '已实时同步至本地档案'}</span>
            <button type="button" class="fid-btn blue slim" data-action="saveNote" ${fidActionID(c.id)}>保存备注</button>
          </div>
        </div>`;
    }

    return `<aside class="lc-dossier customer-profile in-drawer" aria-label="${esc(c.name)}的客户档案">
      <div class="lc-dossier-head">
        <div class="lc-dossier-topbar">
          <span class="lc-dossier-eyebrow">${icon('Layers')}SCRM 客户 360° 档案</span>
          <div class="lc-dossier-actions">
            <button type="button" class="icon-button star-action ${c.star ? 'active' : ''}" data-action="star" ${fidActionID(c.id)} aria-label="${c.star ? '取消星标' : '星标客户'}">${icon('Star')}</button>
            <button type="button" class="icon-button" data-action="close" aria-label="关闭客户档案">${icon('X')}</button>
          </div>
        </div>
        <div class="lc-dossier-identity">
          <div class="lc-dossier-person">
            ${avatar(c, 'large')}
            <div>
              <h2>${esc(c.name)}</h2>
              <div class="lc-dossier-meta">
                <span>${esc(c.phone)}</span>
                <span>·</span>
                <span>${esc(country(c))} ${esc(c.city !== '待补充' ? c.city : '')}（当地 ${esc(localTime(c))}）</span>
                <span>·</span>
                <span>${esc(c.language)}</span>
              </div>
            </div>
          </div>
          <div class="lc-dossier-actions">
            ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', 'tint slim', fidActionID(c.id))}
            ${fidButton('打开会话', 'openConversation', 'MessageCircle', 'blue slim', fidActionID(c.id))}
          </div>
        </div>
        <div class="lc-dossier-grade">${lcGradeControls(c)}</div>
      </div>
      <div class="lc-dossier-kpis">
        <div class="lc-mini-kpi"><span>当前跟进状态</span><strong style="font-size:12px">${esc(h.primary.label)}</strong></div>
        <div class="lc-mini-kpi"><span>下次跟进</span><strong>${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '未安排'}</strong></div>
        <div class="lc-mini-kpi"><span>最近互动</span><strong>${esc(c.last || '—')}</strong></div>
        <div class="lc-mini-kpi"><span>重新跟进次数</span><strong>${c.reactivatedCount || 0} 次</strong></div>
      </div>
      <div class="lc-dossier-tabs" role="tablist" aria-label="客户档案分栏">
        ${[
          ['overview', '画像与跟进', ''],
          ['timeline', '互动轨迹', (data.activities[c.id] || []).length],
          ['orders', '订单追踪', lcOrders(c).length],
          ['notes', '沟通备注', ''],
        ].map(([id, label, count]) =>
          `<button type="button" role="tab" class="lc-dossier-tab ${tab === id ? 'active' : ''}" data-action="lcDossierTab" ${fidActionID(id)} data-customer="${esc(c.id)}" aria-selected="${tab === id}">${esc(label)}${count !== '' ? `<b>${count}</b>` : ''}</button>`
        ).join('')}
      </div>
      <div class="lc-dossier-body">${tabBody}</div>
    </aside>`;
  };

  openProfile = function(id, initialTab = '') {
    const c = customer(id);
    if (!c || !myCustomers().includes(c)) return;
    ui.customer = id;
    if (initialTab) lcState.dossierTab = initialTab;
    else if (ui.profileTab === 'notes') { lcState.dossierTab = 'notes'; ui.profileTab = 'details'; }
    modal('客户 360° 档案', '<div class="profile-dialog">' + profileHTML(c, true) + '</div>', '', { drawer: true });
    $('#dialog').classList.add('lc-dossier-drawer');
  };

  function lcRefreshOpenDossier(cid) {
    const dlg = $('#dialog');
    if (dlg?.open && dlg.classList.contains('lc-dossier-drawer') && ui.customer === cid) {
      const c = customer(cid);
      if (c) {
        $('#dialog .profile-dialog').innerHTML = profileHTML(c, true);
        paintIcons(dlg);
      }
    }
  }

  // ============================================================================
  // Page: #followups (跟进闭环中心 — 待办队列 + 待处理信号 + 已结束跟进 + 操作日志)
  // ============================================================================
  renderFollowups = function() {
    const inScope = c => Boolean(c) && lcHasFollowTags(c);
    const allTasks = myTasks().filter(t => inScope(customer(t.customer)));
    const pending = allTasks.filter(t => !t.done);
    const overdue = pending.filter(t => beforeToday(t.due));
    const today = pending.filter(t => sameDay(t.due));
    const done = allTasks.filter(t => t.done);
    const customers = myCustomers().filter(inScope);
    const attention = customers.filter(c => lcNeedsAttention(lcHealth(c)));
    const closedList = customers.filter(lcIsClosed);
    const marked = lcState.followTags.map(tag).filter(Boolean);
    const tab = ['todo', 'signals', 'closed', 'history'].includes(lcState.followTab) ? lcState.followTab : 'todo';
    // The row opened from the chat strip (lcTrackFollow): a to-do, or a customer when there is no to-do.
    const focus = lcState.followFocus;
    const focusCustomer = c => focus && !focus.task && focus.customer === c.id ? ' class="lc-row-focus"' : '';

    const subtab = (id, label, glyph, count) =>
      `<button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="${id}" aria-pressed="${tab === id}">${icon(glyph)}${label}<b>${count}</b></button>`;
    const headerTabs = `<div class="lc-radar-bar" style="margin-bottom:14px">
      <div class="lc-subtabs" role="tablist" aria-label="跟进闭环视图">
        ${subtab('todo', '跟进待办队列', 'ClipboardList', pending.length)}
        ${subtab('signals', '待处理信号', 'TriangleAlert', attention.length)}
        ${subtab('closed', '已结束跟进', 'Archive', closedList.length)}
        ${subtab('history', '跟进与操作日志', 'History', fidLogs().length)}
      </div>
      <div class="lc-radar-controls">
        ${fidButton('模拟新客进线', 'lcSimLeadOpen', 'Sparkles', 'tint')}
        ${fidButton('新建跟进任务', 'newTask', 'Plus', 'blue')}
      </div>
    </div>`;
    const tagBar = `<div class="fid-actions fid-tag-filter lc-follow-tags"><span>按标签筛选</span><span class="fid-small-note" aria-live="polite">${marked.length ? marked.map(t => esc(t.name)).join('、') : '未选'}</span>${fidButton('选择标签', 'lcFollowTagFilter', 'Tag')}${marked.length ? fidButton('清除标签', 'lcFollowTagClear', 'X') : ''}</div>`;
    const tagCell = c => `<div class="tag-row">${tagsHTML(c, 3) || '<span class="muted">未打标</span>'}</div>`;
    const nameCell = c => `<button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)}</span>`;
    const page = (description, body) => `<section class="fid-page"><div class="lc-wrap">
      ${fidHead('跟进闭环中心', description)}
      ${headerTabs}
      ${body}
    </div></section>`;

    if (tab === 'signals') {
      const counts = Object.fromEntries(lcSignalDefs.map(([id]) => [id, customers.filter(c => lcMatchesSignal(c, id)).length]));
      const rows = customers.filter(c => lcMatchesSignal(c, lcState.signal)).map(c => {
        const h = lcHealth(c);
        return `<tr${focusCustomer(c)}>
          <td style="text-align:left">${nameCell(c)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td style="text-align:left">${tagCell(c)}</td>
          <td>${esc(account(c.account)?.name || '—')}</td>
          <td style="text-align:left">${esc(c.preview || c.notes || '—')}<span class="fid-cell-detail">最后活跃：${esc(c.last || '—')}</span></td>
          <td><div class="fid-icon-actions">
            ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
            ${h.closed ? '' : fidButton('结束跟进', 'lcCloseOpen', 'Archive', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      const chips = lcSignalDefs.map(([id, label, glyph]) => {
        const tone = !counts[id] || id === 'all' ? '' : (id === 'overdue' || id === 'recontact') ? 'is-hot' : 'is-alert';
        return `<button type="button" class="lc-radar-chip ${tone}" data-action="lcSignal" ${fidActionID(id)} aria-pressed="${lcState.signal === id}">${icon(glyph)}${esc(label)}<b>${counts[id]}</b></button>`;
      }).join('');
      return page('集中处理客户待回复、跟进已逾期、跟进断档与复联待处理四类信号，确保没有客户悬空。', `${tagBar}
        <div class="lc-radar-chips" style="margin-bottom:14px" role="group" aria-label="信号筛选">${chips}</div>
        <div class="fid-table-card">${fidTable('lc-signals-table', ['客户', '信号', '标签', '接待 WhatsApp 号', '最近沟通上下文', '处理'], rows, '当前没有需要处理的信号，跟进闭环完整。', true, 'BadgeCheck')}</div>`);
    }

    if (tab === 'closed') {
      const rows = closedList.map(c => {
        const h = lcHealth(c);
        return `<tr${focusCustomer(c)}>
          <td style="text-align:left">${nameCell(c)}</td>
          <td style="text-align:left">${esc(c.closedReason || '未记录原因')}<span class="fid-cell-detail">结束于 ${esc(c.closedAt ? fidDate(c.closedAt).slice(0, 10) : '—')}</span></td>
          <td style="text-align:left">${tagCell(c)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td>${c.reactivatedCount || 0} 次</td>
          <td><div class="fid-icon-actions">
            ${fidButton('重新跟进', 'followup', 'RotateCcw', h.recontact ? 'slim blue' : 'slim tint', fidActionID(c.id))}
            ${fidButton('模拟客户复联', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id))}
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      return page('已结束跟进的客户不再产生提醒；客户再次来信时会提示「复联待处理」，可随时重新跟进并保留全部历史。', `${tagBar}
        <div class="fid-table-card">${fidTable('lc-closed-table', ['客户', '结束原因', '标签', '当前信号', '重新跟进次数', '操作'], rows, '暂无已结束跟进的客户', true, 'Archive')}</div>`);
    }

    if (tab === 'history') {
      const f = fid.logFilter;
      const rows = fidLogs();
      const body = paged(rows, 'followups').map(({ c, entry, at, kind }) => {
        const label = entry.category === 'inbound' ? '客户来信' : kind;
        return `<tr><td>${esc(entry.by)}</td><td><span class="lc-pill neutral">${esc(label)}</span></td><td>${esc(account(c.account)?.name || '—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td style="text-align:left">${esc(entry.text)}</td></tr>`;
      }).join('');
      return page('完整留存每一次跟进结果、结束与重新跟进、标签与资料修改记录。', `<div class="fid-panel fid-log">
          <form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all', '请选择APP'], ['wa', 'WhatsApp']], f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['customer', '线索账号'], ['text', '内容'], ['actor', '操作人']], f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选', 'fidLogReset', 'RotateCw')}</form>
          <div style="margin-top:14px">${fidTable('fid-log-table', ['操作人', '操作类型', '主账号', '线索账号信息', '线索账号', '创建日期', '内容'], body)}${fidPager(rows.length, 'followups')}</div>
        </div>`);
    }

    const filterKey = ui.taskFilter || 'pending';
    const list = (filterKey === 'done' ? done : filterKey === 'overdue' ? overdue : filterKey === 'today' ? today : pending)
      .slice().sort((a, b) => new Date(a.due) - new Date(b.due));
    if (focus?.task && !focus.placed) {
      const at = list.findIndex(t => t.id === focus.task);
      if (at >= 0) ui.pages.followups = Math.floor(at / (ui.pageSizes.followups || 10));
      focus.placed = true;
    }
    const taskRows = paged(list, 'followups').map(t => {
      const c = customer(t.customer);
      if (!c) return '';
      const isOverdue = !t.done && beforeToday(t.due);
      return `<tr${focus?.task === t.id ? ' class="lc-row-focus"' : ''}>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(account(c.account)?.name || '')} · ${esc(c.language)}</span></td>
        <td style="text-align:left">${tagCell(c)}</td>
        <td style="text-align:left"><span class="task-title ${t.done ? 'completed' : ''}"><strong>${esc(t.title)}</strong></span>${t.outcome ? `<span class="fid-cell-detail">结果：${esc(t.outcome)}</span>` : ''}</td>
        <td><span class="${isOverdue ? 'overdue' : ''}" style="font-weight:${isOverdue ? '700' : '400'}">${esc(dateLabel(t.due))}${isOverdue ? ' · 已逾期' : ''}</span></td>
        <td>${t.priority === 'high' ? '<span class="priority-badge">重点</span>' : '普通'}</td>
        <td><div class="fid-icon-actions">
          ${t.done
            ? fidButton('重开', 'taskDone', 'RotateCcw', 'slim', fidActionID(t.id))
            : fidButton('完成并闭环', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(t.id))}
          ${fidIcon('打开会话', 'openConversation', 'MessageCircle', c.id)}
          ${fidIcon('360° 档案', 'profile', 'ContactRound', c.id)}
        </div></td>
      </tr>`;
    }).join('');
    const taskChips = [
      ['pending', '全部待处理', pending.length, ''],
      ['overdue', '已逾期必处理', overdue.length, overdue.length ? 'is-hot' : ''],
      ['today', '今日到期', today.length, ''],
      ['done', '已完成', done.length, ''],
    ].map(([id, label, n, cls]) =>
      `<button type="button" class="lc-radar-chip ${cls}" data-action="taskFilter" ${fidActionID(id)} aria-pressed="${filterKey === id}">${esc(label)}<b>${n}</b></button>`
    ).join('');
    return page('完成一次跟进时，必须安排下一次跟进或明确结束跟进，确保每位客户都不会悬空。', `${tagBar}
      <div class="fid-panel">
        <div class="lc-radar-chips" style="margin-bottom:14px">${taskChips}</div>
        ${fidTable('lc-todo-table', ['客户 / 接待号', '标签', '跟进事项与结果', '计划跟进时间', '优先级', '闭环操作'], taskRows, '当前筛选下没有跟进任务', true, 'CalendarCheck')}
        ${fidPager(list.length, 'followups')}
      </div>`);
  };

  // ============================================================================
  // Page: #customers (客户列表 — 等级、客户状态、跟进状态与标签)
  // ============================================================================
  const lcOrigFilteredCustomers = filteredCustomers;
  // Customers after the search form and the follow-up filter, before the tier / status chips.
  const lcCustomerPool = () => lcOrigFilteredCustomers().filter(c => {
    if (lcState.customerHealthFilter === 'all') return true;
    const h = lcHealth(c);
    if (lcState.customerHealthFilter === 'reply') return h.awaitingReply;
    if (lcState.customerHealthFilter === 'overdue') return h.overdue;
    if (lcState.customerHealthFilter === 'noplan') return h.noPlan;
    if (lcState.customerHealthFilter === 'recontact') return h.recontact;
    if (lcState.customerHealthFilter === 'closed') return h.closed;
    return true;
  });
  filteredCustomers = function() {
    return lcCustomerPool().filter(c =>
      (lcState.customerTier === 'all' || (lcTier(c) || 'none') === lcState.customerTier) &&
      (lcState.customerStatus === 'all' || (lcCustomerStatus(c) || 'none') === lcState.customerStatus));
  };

  customerRows = function() {
    const rows = paged(filteredCustomers(), 'customers');
    const tags = myTags();
    return rows.map((c, i) => {
      const a = account(c.account);
      const h = lcHealth(c);
      const assigned = tags.filter(t => c.tags.includes(t.id));
      const first = assigned[0];
      const tagPreview = first ? `<span class="tag ${esc(first.color)}">${esc(first.name)}</span>` : '<span>0 个</span>';
      const tagDetail = assigned.length > 1 ? `<small>+${assigned.length - 1}</small>` : icon('ChevronRight');
      return `<tr>
        <td><input type="checkbox" data-select-customer="${esc(c.id)}" aria-label="选择${esc(c.name)}" ${ui.selected.has(c.id) ? 'checked' : ''}></td>
        <td>${rowNumber('customers', i)}</td>
        <td>${esc(a?.name || '—')}<span class="fid-cell-detail">${esc(member(c.owner)?.name || '未分配')}</span></td>
        <td><button class="fid-link fid-note-link" data-action="profileNote" ${fidActionID(c.id)} title="${esc(c.notes || '')}" aria-label="查看${esc(c.name)}备注"><span class="fid-cell-note">${esc(c.qualification?.demand || c.notes || '—')}</span></button></td>
        <td><button class="fid-link" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}资料"><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.source)}</span></td>
        <td>${lcTierBadge(c)}</td>
        <td>${lcCustomerStatusPill(c)}</td>
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td>
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(c.language)}</span></td>
        <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span></td>
        <td>${esc(c.last || '—')}${c.unread ? `<span class="fid-cell-detail">${c.unread} 条未读</span>` : ''}</td>
        <td>${esc(fidDate(c.createdAt))}<span class="fid-cell-detail">更新 ${esc(fidDate(c.updatedAt))}</span></td>
        <td><div class="fid-icon-actions">${fidIcon('打开' + c.name + '会话', 'openConversation', 'MessageCircle', c.id)}${fidIcon('360° 客户档案：' + c.name, 'profile', 'ContactRound', c.id)}${fidIcon('安排跟进：' + c.name, 'followup', 'CalendarPlus', c.id)}</div></td>
      </tr>`;
    }).join('');
  };

  renderCustomers = function() {
    const list = filteredCustomers();
    const pool = lcCustomerPool();
    const marked = fid.customerTags.map(tag).filter(Boolean);
    const selected = ui.selected.size;
    const filters = `<form class="fid-customer-filter fid-rounded" id="fid-customer-search-form">
      <div class="fid-customer-platform"><span>平台:</span>${fidButton(fid.customerPlatform ? '全选(1)' : '全选(0)', 'fidCustomerPlatform', 'Check', 'fid-platform', `aria-pressed="${fid.customerPlatform}"`)}<span class="sr-only">WhatsApp</span></div>
      <div class="fid-filter-row fid-customer-fields">
        <input class="fid-input" id="fid-customer-start" aria-label="开始时间" placeholder="开始时间" value="${esc(fid.customerStart)}" data-fid-date><span> - </span>
        <input class="fid-input" id="fid-customer-end" aria-label="截止时间" placeholder="截止时间" value="${esc(fid.customerEnd)}" data-fid-date>
        <select class="fid-select" id="fid-customer-field" aria-label="客户查询字段">${fidOption([['name', '联系人'], ['phone', '手机号'], ['account', '主账号'], ['note', '备注'], ['source', '来源']], fid.customerField)}</select>
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-health-select" aria-label="跟进状态">${fidOption([['all', '全部跟进状态'], ['reply', '客户待回复'], ['overdue', '跟进已逾期'], ['noplan', '跟进断档(无待办)'], ['recontact', '复联待处理'], ['closed', '已结束跟进']], lcState.customerHealthFilter)}</select>
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all', '请选择国家'], ['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], fid.customerCountry)}</select>
        <select class="fid-select" id="fid-customer-type" aria-label="客户类型">${fidOption([['all', '请选择客户类型'], '新增线索-实时', '新增线索-补录', '重复线索'], fid.customerType)}</select>
      </div>
      <div class="fid-actions fid-filter-submit"><button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置', 'fidCustomerReset', 'RotateCw')}</div>
      <div class="fid-actions fid-tag-filter"><span>标签查询</span><span class="fid-small-note" aria-live="polite">${marked.length ? marked.map(t => esc(t.name)).join('、') : '未选'}</span>${fidButton('选择标签', 'fidCustomerChooseTags', 'Tag')}${fidButton('重置标签', 'fidCustomerClearFilter', 'X')}</div>
    </form>`;
    const chip = (action, current, id, label, count) =>
      `<button type="button" class="lc-radar-chip" data-action="${action}" ${fidActionID(id)} aria-pressed="${current === id}">${esc(label)}<b>${count}</b></button>`;
    const tierCount = id => pool.filter(c => (lcTier(c) || 'none') === id).length;
    const statusCount = id => pool.filter(c => (lcCustomerStatus(c) || 'none') === id).length;
    const facets = `<div class="lc-customer-facets">
      <div class="lc-radar-chips" role="group" aria-label="按客户等级筛选"><span class="lc-facet-label">客户等级</span>${chip('lcCustomerTier', lcState.customerTier, 'all', '全部', pool.length)}${LC_TIERS.map(t => chip('lcCustomerTier', lcState.customerTier, t, t + ' 级', tierCount(t))).join('')}${chip('lcCustomerTier', lcState.customerTier, 'none', '未评级', tierCount('none'))}</div>
      <div class="lc-radar-chips" role="group" aria-label="按客户状态筛选"><span class="lc-facet-label">客户状态</span>${chip('lcCustomerStatusFilter', lcState.customerStatus, 'all', '全部', pool.length)}${LC_CUSTOMER_STATUSES.map(([id, label]) => chip('lcCustomerStatusFilter', lcState.customerStatus, id, label, statusCount(id))).join('')}${chip('lcCustomerStatusFilter', lcState.customerStatus, 'none', '未标记', statusCount('none'))}</div>
    </div>`;
    const toolbar = `<div class="fid-actions fid-list-toolbar">${fidButton('批量打标签', 'batchTags', 'Tag', 'gradient', selected ? '' : 'disabled')}${fidButton('清空标签', 'fidClearCustomerTags', 'Eraser', '', selected ? '' : 'disabled')}${fidButton('跟进闭环', '', 'ClipboardList', 'green', 'data-nav="followups"')}${fidButton('导出列表', 'fidExportCustomers', 'FileDown')}${fidButton('新增客户', 'addCustomer', 'Plus', 'slim')}<span class="fid-small-note">等级与客户状态在聊天界面或客户档案中调整</span></div>`;
    const header = ['<input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户">', '序号', '主账号信息', '需求画像 / 备注', '联系人 / 来源', '等级', '客户状态', '标签', '手机号 / 地区', '跟进状态 / 下次跟进', '最近互动', '添加 / 更新时间', '操作 ' + icon('Settings2')];
    const table = fidTable('fid-customer-table', header, customerRows(), '暂无匹配客户', true).replace('<tbody>', '<tbody id="customer-rows">');
    return `<section class="fid-page"><h1 class="sr-only">客户列表</h1>${filters}${facets}${toolbar}<div class="fid-batchbar" id="batchbar" hidden><span id="selected-count">${selected}</span></div><div class="fid-table-card">${table}${fidPager(list.length, 'customers', [10, 20, 50])}</div></section>`;
  };

  fidForms['fid-customer-search-form'] = () => {
    Object.assign(fid, {
      customerField: $('#fid-customer-field').value,
      customerCountry: $('#fid-customer-country').value,
      customerType: $('#fid-customer-type').value,
      customerStart: $('#fid-customer-start').value,
      customerEnd: $('#fid-customer-end').value,
    });
    lcState.customerHealthFilter = $('#fid-customer-health-select')?.value || 'all';
    ui.customerQuery = $('#customer-search').value;
    ui.customerTag = 'all';
    ui.selected.clear();
    ui.pages.customers = 0;
    render();
  };

  const lcOrigResetCustomerFilters = fidActions.fidCustomerReset;
  fidActions.fidCustomerReset = () => {
    Object.assign(lcState, { customerHealthFilter: 'all', customerTier: 'all', customerStatus: 'all' });
    lcOrigResetCustomerFilters();
  };

  // The export of the earlier module does not know about tier and status; this one replaces it.
  fidActions.fidExportCustomers = function() {
    const safe = v => '"' + (/^[=+\-@\t\r]/.test(String(v ?? '')) ? "'" : '') + String(v ?? '').replaceAll('"', '""') + '"';
    const rows = [['主账号', '联系人', '手机号', '客户等级', '客户状态', '跟进状态', '最近互动', '客户类型', '国家', '标签'],
      ...filteredCustomers().map(c => [account(c.account)?.name, c.name, c.phone, lcTier(c) || '未评级', lcCustomerStatusLabel(c), lcHealth(c).primary.label, c.last, c.clientType, country(c), c.tags.map(tag).filter(t => t && myTags().includes(t)).map(t => t.name).join('、')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp-演示客户列表.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('已导出当前筛选的演示客户列表。');
  };

  // ============================================================================
  // Page: #dashboard (经营概览 + 跟进闭环概览)
  // ============================================================================
  const lcBaseRenderDashboard = renderDashboard;
  renderDashboard = function() {
    const html = lcBaseRenderDashboard();
    const customers = myCustomers();
    const closedCount = customers.filter(lcIsClosed).length;
    const chip = (id, label, glyph, tone) => {
      const n = customers.filter(c => lcMatchesSignal(c, id)).length;
      return `<button type="button" class="lc-radar-chip ${n ? tone : ''}" data-action="lcJumpSignal" data-id="${id}">${icon(glyph)}${label} <b>${n}</b></button>`;
    };
    const lcPanel = `<section class="dash-lc-panel" aria-label="跟进闭环概览">
      <div class="dash-lc-head">
        <h2>${icon('ClipboardList')}跟进闭环概览</h2>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--color-text-muted)">跟进中：<b>${customers.length - closedCount}</b> · 已结束跟进：<b>${closedCount}</b></span>
          <a class="dash-link" href="#followups" data-nav="followups">进入跟进闭环中心${icon('ChevronRight')}</a>
        </div>
      </div>
      <div class="dash-lc-alerts">
        <span style="font-size:12px;color:var(--color-text-muted);font-weight:600">待处理信号：</span>
        ${chip('reply', '客户待回复', 'Zap', 'is-alert')}
        ${chip('overdue', '跟进已逾期', 'ClockAlert', 'is-hot')}
        ${chip('noplan', '跟进断档', 'TriangleAlert', 'is-alert')}
        ${chip('recontact', '复联待处理', 'Flame', 'is-hot')}
      </div>
    </section>`;
    return html.replace('<div class="dash-grid">', lcPanel + '<div class="dash-grid">');
  };

  // ============================================================================
  // Page: #inbox (WhatsApp 在线聊天与跟进闭环联动)
  // ============================================================================
  // Tags on a conversation card: the first three the viewer may see, then a count of the rest.
  // The row never wraps; the full list is in its tooltip. A customer without tags gets no row.
  const LC_CARD_TAGS = 3;
  function lcConversationTags(c) {
    const visible = new Set(myTags().map(t => t.id));
    const names = c.tags.filter(id => visible.has(id)).map(id => tag(id).name);
    if (!names.length) return '';
    const more = names.length - LC_CARD_TAGS;
    return `<span class="conversation-tags" title="${esc('标签：' + names.join('、'))}">${tagsHTML(c, LC_CARD_TAGS)}${more > 0 ? `<span class="conversation-tags-more">+${more}</span>` : ''}</span>`;
  }

  conversationRows = function() {
    return filteredConversations().map(c => {
      const a = account(c.account);
      const selected = fid.chatOpen && c.id === ui.customer ? 'selected' : '';
      return `<button type="button" class="conversation ${selected}" aria-label="打开${esc(c.name)}的会话" data-action="openConversation" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="conversation-main">
          <span class="conversation-line"><strong>${esc(c.name)}${lcTier(c) ? ' ' + lcTierBadge(c) : ''}</strong><time>${esc(c.last)}</time></span>
          <span class="conversation-preview"><span>${esc(c.preview)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span>
          <span class="conversation-account">
            <span><span class="state-dot ${a?.state === 'online' ? '' : a?.state === 'pending' ? 'offline' : 'warning'}"></span>${esc(ui.account === 'all' ? a?.name : c.language)}</span>
          </span>
          ${lcConversationTags(c)}
        </span>
      </button>`;
    }).join('') || empty('没有匹配会话', '切换筛选，或清空搜索后再试。');
  };

  const lcPrevChatHTML = chatHTML;
  chatHTML = function(c) {
    let html = lcPrevChatHTML(c);
    const h = lcHealth(c);
    const strip = `<div class="lc-chat-strip" aria-label="客户跟进协同栏">
      <button type="button" class="lc-pill lc-pill-link ${h.primary.tone}" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon(h.primary.icon)}${esc(h.primary.label)}</button>
      ${h.nextTask ? `<button type="button" class="lc-pill lc-pill-link info" data-action="lcTrackFollow" ${fidActionID(c.id)} title="在跟进闭环中查看此客户">${icon('CalendarClock')}下次跟进 ${esc(dateLabel(h.nextTask.due))}</button>` : ''}
      ${lcGradeControls(c)}
      <span class="tag-row">${tagsHTML(c, 3)}</span>
      <div class="lc-chat-strip-right">
        ${fidButton(h.closed ? '重新跟进' : '安排跟进', 'followup', 'CalendarPlus', h.closed ? 'slim blue' : 'slim tint', fidActionID(c.id))}
        ${fidButton('设置标签', 'assignTags', 'Tags', 'slim', fidActionID(c.id))}
        ${fidButton('移入聊天记录', 'fidArchiveOpen', 'Archive', 'slim', fidActionID(c.id))}
        ${fidButton('模拟对方回复', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id))}
        ${fidButton('360° 档案', 'profile', 'ContactRound', 'slim', fidActionID(c.id))}
      </div>
    </div>`;
    return html.replace('<div class="source-strip">', strip + '<div class="source-strip">');
  };

  toolsRailHTML = function(c) {
    const t = (label, action, glyph, needs = false, extra = '') =>
      `<button type="button" class="icon-button" data-action="${action}" ${fidActionID(c?.id || '')} ${extra} aria-label="${label}" ${needs && !c ? 'disabled' : ''}>${icon(glyph)}</button>`;
    return `<aside class="tool-rail" aria-label="会话工具">
      ${t('会话筛选', 'fidChatFilters', 'Filter')}
      ${t('客户 360° 档案', 'profile', 'ContactRound', true)}
      ${t('安排客户跟进', 'followup', 'CalendarPlus', true)}
      ${t('客户标签', 'assignTags', 'Tags', true)}
      ${t('客户沟通备注', 'profileNote', 'StickyNote', true)}
      ${t('翻译设置', 'translation', 'Languages')}
      <span class="tool-separator"></span>
      ${t('刷新视图', 'refreshUI', 'RefreshCw')}
      ${t('权限说明', 'fidChatPermissions', 'ShieldCheck')}
    </aside>`;
  };

  // ============================================================================
  // Dialogs: follow-up scheduling, closed-loop completion, ending follow-up, simulations
  // ============================================================================
  openFollowup = function(id = null) {
    const list = myCustomers();
    const c = id ? customer(id) : selectedCustomer();
    if (!list.length) return toast('请先新增客户。');
    const closed = lcIsClosed(c);
    fidForm(
      closed ? `重新跟进 · ${c.name}` : '安排客户下一步跟进',
      'lc-followup',
      `${fidFormRow('目标客户', `<select class="fid-select" style="width:100%" name="customer">${list.map(x => option(x.id, `${x.name}（${account(x.account)?.name || '未绑号'}${lcIsClosed(x) ? ' · 已结束跟进' : ''}）`, c?.id)).join('')}</select>`, '', true)}
       ${closed ? '<p class="fid-field-help" style="margin:0 0 12px">该客户已结束跟进。保存后重新纳入跟进闭环，历史记录全部保留。</p>' : ''}
       ${fidFormRow('跟进事项', `<input class="fid-input" style="width:100%" name="title" required maxlength="100" value="${esc(closed ? '重新联系并了解最新需求' : '跟进客户最新反馈')}" placeholder="写清本次跟进要达成的具体目标">`, '', true)}
       ${fidFormRow('提醒时间', `<input class="fid-input" style="width:100%" type="datetime-local" id="lc-due-input" name="due" required value="${inputDate(new Date(Date.now() + 24 * 3600000).toISOString())}">
         <div class="lc-quick-dates">
           <button type="button" data-action="lcQuickDue" data-id="2">2小时后</button>
           <button type="button" data-action="lcQuickDue" data-id="24">明天此时</button>
           <button type="button" data-action="lcQuickDue" data-id="72">3天后</button>
           <button type="button" data-action="lcQuickDue" data-id="168">7天后</button>
           <button type="button" data-action="lcQuickDue" data-id="720">30天后</button>
         </div>`, 'lc-due-input', true)}
       ${fidFormRow('优先级', `<select class="fid-select" style="width:100%" name="priority">${fidOption([['normal', '普通'], ['high', '重点优先']], 'normal')}</select>`)}`,
      '保存跟进计划',
      { wide: true }
    );
  };

  function openTaskCompleteModal(taskId) {
    const t = data.tasks.find(x => x.id === taskId);
    if (!t || (!manager() && t.owner !== ui.persona)) return;
    const c = customer(t.customer);
    if (!c) return;
    if (t.done) {
      if (lcIsClosed(c)) lcReopenEngagement(c);
      t.done = false;
      c.followup = lcNextTask(c.id)?.due || t.due;
      lcLog(c.id, 'followup', `重新打开跟进待办：${t.title}`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast('已重新打开该条跟进待办。');
      return;
    }
    fidForm(
      `完成跟进闭环 · ${c.name}`,
      'lc-complete-task',
      `<input type="hidden" name="taskId" value="${esc(t.id)}">
       <div class="lc-card-block" style="margin-bottom:14px;background:var(--color-surface-alt)">
         <strong style="font-size:13px">已完成事项：${esc(t.title)}</strong>
         <small style="display:block;margin-top:3px;color:var(--color-text-muted)">完成后必须二选一：安排下一次跟进，或明确结束跟进，客户不会悬空。</small>
       </div>
       ${fidFormRow('跟进结果', `<select class="fid-select" style="width:100%" name="outcome" required>
         ${fidOption(['客户已积极回复推进', '已发送资料/方案待看', '客户暂未回复需顺延追访', '客户提出价格/时效异议', '客户确认意向', '已确认下单', '明确无需求/暂缓'], '客户已积极回复推进')}
       </select>`, '', true)}
       ${fidFormRow('结果纪要', `<input class="fid-input" style="width:100%" name="outcomeNote" placeholder="选填：补充客户反馈细节，将自动写入互动轨迹">`)}
       ${lcTagDetails(c)}
       ${fidFormRow('后续安排', `<select class="fid-select" style="width:100%" name="nextAction" id="lc-complete-next">${fidOption([['next', '继续跟进：安排下一次提醒'], ['close', '结束跟进：不再提醒，客户再次来信时提示复联']], 'next')}</select>`, 'lc-complete-next', true)}
       <div class="lc-card-block" id="lc-complete-next-block" style="background:var(--color-surface-alt)">
         <div class="lc-qual-grid">
           <label class="lc-field full"><span>下次跟进事项</span><input class="fid-input" name="nextTitle" required value="跟进客户最新反馈"></label>
           <label class="lc-field"><span>下次提醒时间</span><input class="fid-input" type="datetime-local" id="lc-due-input" name="nextDue" value="${inputDate(new Date(Date.now() + 48 * 3600000).toISOString())}"></label>
           <label class="lc-field"><span>优先级</span><select class="fid-select" name="nextPriority">${fidOption([['normal', '普通'], ['high', '重点优先']], 'normal')}</select></label>
         </div>
       </div>
       <div class="lc-card-block" id="lc-complete-close-block" style="background:var(--color-surface-alt)" hidden>
         <label class="lc-field full"><span>结束原因</span><input class="fid-input" name="closeReason" maxlength="80" placeholder="如：预算暂缓，下季度再联系"></label>
       </div>`,
      '确认完成并闭环',
      { wide: true }
    );
  }

  function openCloseEngagement(id) {
    const c = customer(id);
    if (!c || !myCustomers().includes(c) || lcIsClosed(c)) return;
    const pendingCount = data.tasks.filter(t => t.customer === c.id && !t.done).length;
    fidForm(
      `结束跟进 · ${c.name}`,
      'lc-close-engagement',
      `<input type="hidden" name="customerId" value="${esc(c.id)}">
       <p class="fid-field-help" style="margin:0 0 12px">结束后不再提醒跟进${pendingCount ? `，该客户名下 ${pendingCount} 条未完成待办会自动结清` : ''}。聊天、备注与轨迹全部保留；客户再次来信时会提示「复联待处理」，可随时重新跟进。</p>
       ${fidFormRow('结束原因', `<input class="fid-input" style="width:100%" name="closeReason" required maxlength="80" placeholder="如：预算暂缓，下季度再联系">`, '', true)}
       ${lcTagDetails(c)}`,
      '确认结束跟进',
      { wide: true }
    );
  }

  function openSimLeadModal() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先在号码管理绑定至少一个 WhatsApp 号码。');
    fidForm(
      '模拟新客户进线',
      'lc-sim-lead',
      `<p class="fid-field-help" style="margin-bottom:12px">模拟一位潜在客户添加你的 WhatsApp 号码并发来首条咨询，系统自动建立首响待办并点亮「客户待回复」信号。</p>
       ${fidFormRow('进线号码', `<select class="fid-select" style="width:100%" name="accountId">${accounts.map(a => option(a.id, `${a.name} (${a.number})`, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" value=" Jordan Brooks" required>`, '', true)}
       ${fidFormRow('客户语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语'], '英语')}</select>`)}
       ${fidFormRow('来源归因', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('广告系列', `<input class="fid-input" style="width:100%" name="campaign" value="US · 咨询直连广告 E" placeholder="选填广告系列名称">`)}`,
      '生成进线会话并查看',
      { wide: true }
    );
  }

  function lcSimulateCustomerReply(customerId) {
    const c = customer(customerId);
    if (!c) return;
    const isEs = c.language === '西班牙语';
    const closed = lcIsClosed(c);
    const pair = closed
      ? (isEs
          ? ['Hola, retomamos las compras esta semana. ¿Podemos revisar la cotización actualizada?', '你好，我们这周恢复采购计划了，可以重新核对一下最新报价吗？']
          : ['Hi! Our budget is ready now—could we revisit the quote and check current lead time?', '你好！我们的采购预算已经批下来了，可以重新确认一下报价和当前发货时效吗？'])
      : (isEs
          ? ['Gracias por responder rápido, me interesa ver las opciones disponibles.', '谢谢你的快速回复，我想看看目前可选的规格方案。']
          : ['Thanks for the quick response! Could you share the recommended starter option?', '谢谢快速回复！可以推荐一下适合首批采购的方案吗？']);

    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const message = { id: nextId('m'), side: 'in', text: pair[0], time };
    (data.messages[c.id] ??= []).push(message);
    aiTranslateInbound(c, message, pair[1]);
    c.preview = pair[0];
    c.translation = '';
    c.last = '刚刚';
    c.unread = (Number(c.unread) || 0) + 1;
    lcLog(c.id, 'inbound', closed ? '已结束跟进的客户主动发来新消息（触发复联信号）' : '收到客户最新 WhatsApp 回复消息');
    persist();
    render();
    lcRefreshOpenDossier(c.id);
    toast(closed ? `收到 ${c.name} 的复联消息！已点亮「复联待处理」，可重新跟进。` : `已模拟收到 ${c.name} 的新回复。`);
  }

  // New customers join the engagement loop with a first follow-up to-do
  function openLifecycleCustomerForm() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先添加账号。');
    fidForm(
      '新增 WhatsApp 客户档案',
      'lc-new-customer',
      `${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" required maxlength="50" placeholder="客户姓名或备注称呼">`, '', true)}
       ${fidFormRow('WhatsApp号', `<input class="fid-input" style="width:100%" name="phone" required placeholder="含国家区号，如 +1 (512) 555-0192">`, '', true)}
       ${fidFormRow('归属接待号', `<select class="fid-select" style="width:100%" name="account">${accounts.map(a => option(a.id, a.name, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('沟通语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语', '其他'], '英语')}</select>`)}
       ${fidFormRow('国家地区', `<select class="fid-select" style="width:100%" name="country">${fidOption([['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], 'US')}</select>`)}
       ${fidFormRow('来源渠道', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询', '手动添加'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('初步需求', `<input class="fid-input" style="width:100%" name="demand" placeholder="记录客户首句来意或咨询重点">`)}`,
      '创建并纳入跟进闭环',
      { wide: true }
    );
  }

  // ============================================================================
  // Register engagement actions & form submissions
  // ============================================================================
  Object.assign(fidActions, {
    lcSimLeadOpen: openSimLeadModal,
    lcSimReply: lcSimulateCustomerReply,
    lcDossierTab: (id, btn) => {
      lcState.dossierTab = id;
      const cid = btn?.dataset?.customer || ui.customer;
      lcRefreshOpenDossier(cid);
    },
    lcTimelineFilter: (id, btn) => {
      lcState.timelineFilter = id;
      lcRefreshOpenDossier(btn?.dataset?.customer || ui.customer);
    },
    // Order tracking tab: remove an order at once; the toast offers to put it back.
    lcOrderRemove: (id, btn) => {
      const c = customer(btn?.dataset?.customer);
      const o = lcOrders(c).find(x => x.id === id);
      if (!o || !myCustomers().includes(c)) return;
      const apply = (orders, text) => {
        c.orders = orders;
        lcLog(c.id, 'order', text);
        persist();
        render();
        lcRefreshOpenDossier(c.id);
      };
      apply(lcOrders(c).filter(x => x !== o), `删除订单记录 ${o.number}`);
      toast(`已删除订单 ${o.number}。`, () => apply([...lcOrders(c), o], `恢复订单记录 ${o.number}`));
    },
    lcFollowTab: id => { lcState.followTab = id; ui.pages.followups = 0; render(); },
    fidTasks: () => { lcState.followTab = 'todo'; ui.taskFilter = 'pending'; ui.pages.followups = 0; navigate('followups'); },
    lcSignal: id => { lcState.signal = id; render(); },
    lcJumpSignal: id => { lcState.followTab = 'signals'; lcState.signal = id; ui.pages.followups = 0; navigate('followups'); },
    // Chat strip → follow-up centre, on this customer's row: the earliest unfinished to-do if the viewer
    // has one for the customer, otherwise the customer among the signals, or among the ended follow-ups.
    // The row stays highlighted until the follow-up centre is left (see the render wrapper).
    lcTrackFollow: id => {
      const c = customer(id);
      if (!c || !myCustomers().includes(c)) return;
      const h = lcHealth(c);
      const task = !h.closed && h.nextTask && myTasks().includes(h.nextTask) ? h.nextTask : null;
      if (!lcHasFollowTags(c)) lcState.followTags = [];
      lcState.followTab = h.closed ? 'closed' : task ? 'todo' : 'signals';
      if (task) ui.taskFilter = 'pending';
      else if (!h.closed) lcState.signal = 'all';
      lcState.followFocus = { customer: c.id, task: task ? task.id : null, placed: false };
      ui.pages.followups = 0;
      navigate('followups');
      $('#view .lc-row-focus')?.scrollIntoView({ block: 'center' });
    },
    lcCloseOpen: id => openCloseEngagement(id),
    lcFollowTagFilter: () => fidOpenTagPicker('按标签筛选跟进', 'lc-follow-tag-filter', lcState.followTags, { submit: '筛选' }),
    lcFollowTagClear: () => { lcState.followTags = []; ui.pages.followups = 0; render(); },
    lcCustomerTier: id => { lcState.customerTier = id; ui.selected.clear(); ui.pages.customers = 0; render(); },
    lcCustomerStatusFilter: id => { lcState.customerStatus = id; ui.selected.clear(); ui.pages.customers = 0; render(); },
    taskDone: id => openTaskCompleteModal(id),
    followup: id => openFollowup(id),
    newTask: () => openFollowup(),
    addCustomer: openLifecycleCustomerForm,
    profile: (id, btn) => openProfile(id, btn?.dataset?.tab || ''),
    profileNote: id => openProfile(id, 'notes'),
    star: id => {
      const c = customer(id);
      if (!c) return;
      c.star = !c.star;
      persist();
      render();
      lcRefreshOpenDossier(id);
    },
    lcQuickDue: hours => {
      const input = $('#lc-due-input');
      if (input) input.value = inputDate(new Date(Date.now() + Number(hours) * 3600000).toISOString());
    },
  });

  Object.assign(fidForms, {
    'lc-qual-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c) return;
      c.intentLevel = v('intentLevel') || c.intentLevel;
      Object.assign(c.qualification, {
        demand: v('demand'),
        volume: v('volume'),
        deliveryRegion: v('deliveryRegion'),
        commWindow: v('commWindow'),
        objection: v('objection'),
      });
      lcLog(c.id, 'profile', `更新客户需求画像（意向度：${c.intentLevel}${c.qualification.volume ? ' · 规模：' + c.qualification.volume : ''}）`);
      persist();
      render();
      openProfile(c.id, 'overview');
      toast('客户需求画像已保存并写入轨迹。');
    },

    'lc-order-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c || !myCustomers().includes(c)) return;
      const number = v('number');
      const placed = new Date(v('placedAt'));
      if (!number) return error('请填写订单号。');
      if (Number.isNaN(placed.getTime())) return error('请填写有效的下单时间。');
      if (placed.getTime() > Date.now()) return error('下单时间不能晚于当前时间。');
      if (lcOrders(c).some(o => o.number === number)) return error(`该客户已登记订单号 ${number}。`);
      const shipping = lcShipping(v('shipping'));
      c.orders = [{ id: nextId('ord'), number, placedAt: placed.toISOString(), shipping: shipping[0] }, ...lcOrders(c)];
      lcLog(c.id, 'order', `登记订单 ${number}（下单时间 ${fidDate(placed.toISOString())}，物流状态：${shipping[1]}）`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast(`订单 ${number} 已登记。`);
    },

    'lc-followup-form': (f, v) => {
      const c = customer(v('customer'));
      if (!c || !v('title') || !v('due')) return error('请填写完整的客户、事项和计划时间。');
      const due = new Date(v('due'));
      if (Number.isNaN(due.getTime())) return error('请填写有效的跟进时间。');
      if (lcIsClosed(c)) lcReopenEngagement(c);
      lcCreateTask({
        customerId: c.id,
        title: v('title'),
        dueIso: due.toISOString(),
        priority: v('priority') || 'normal',
      });
      lcLog(c.id, 'followup', `安排跟进待办：${v('title')}（${dateLabel(due.toISOString())}）`);
      persist();
      close();
      render();
      toast('跟进计划已建立，跟进状态已更新。');
    },

    'lc-complete-task-form': (f, v) => {
      const t = data.tasks.find(x => x.id === v('taskId'));
      if (!t) return;
      const c = customer(t.customer);
      if (!c) return;
      const closing = v('nextAction') === 'close';
      const due = new Date(v('nextDue'));
      if (closing && !v('closeReason')) return error('请填写结束跟进的原因。');
      if (!closing && (!v('nextTitle') || Number.isNaN(due.getTime()))) return error('请填写下次跟进事项和提醒时间，或选择结束跟进。');
      t.done = true;
      t.outcome = v('outcome') + (v('outcomeNote') ? ' — ' + v('outcomeNote') : '');
      t.completedAt = new Date().toISOString();
      lcLog(c.id, 'followup', `完成跟进「${t.title}」· 结果：${t.outcome}`);
      lcApplyFormTags(c, f);
      if (closing) lcCloseEngagement(c, v('closeReason'));
      else lcCreateTask({ customerId: c.id, title: v('nextTitle'), dueIso: due.toISOString(), priority: v('nextPriority') || 'normal' });
      persist();
      close();
      render();
      toast(closing ? `已结束对 ${c.name} 的跟进，待办已结清。` : '本次跟进已闭环，下一步计划已同步。');
    },

    'lc-close-engagement-form': (f, v) => {
      const c = customer(v('customerId'));
      if (!c || lcIsClosed(c)) return;
      if (!v('closeReason')) return error('请填写结束跟进的原因。');
      lcApplyFormTags(c, f);
      lcCloseEngagement(c, v('closeReason'));
      persist();
      close();
      render();
      toast(`已结束对 ${c.name} 的跟进；客户再次来信时会提示复联。`);
    },

    'lc-follow-tag-filter-form': f => {
      lcState.followTags = f.getAll('tags').map(String).filter(id => myTags().some(t => t.id === id));
      ui.pages.followups = 0;
      close();
      render();
    },

    'lc-sim-lead-form': (f, v) => {
      const a = account(v('accountId'));
      const name = v('name');
      if (!a || !name) return error('请填写客户称呼并选择接待号码。');
      const phone = openwaNextNumber() || '+1 (512) 555-0199';
      const isEs = v('language') === '西班牙语';
      const msg = isEs
        ? 'Hola, vi su anuncio y agregué su WhatsApp. ¿Me comparte el catálogo y tiempos de envío?'
        : 'Hi! Just added your WhatsApp from your ad. Could you share the catalog and shipping details?';
      const tr = isEs
        ? '你好，看到你们的广告加了 WhatsApp，能发一下目录和发货时效吗？'
        : '你好！刚从广告加了你们的 WhatsApp，可以发一下目录和发货说明吗？';
      const id = nextId('c');
      const nowIso = new Date().toISOString();
      const c = {
        id, name, initials: initial(name), color: 'blue', phone,
        country: a.country || 'US', city: a.country === 'PR' ? 'San Juan' : 'Dallas',
        timezone: a.country === 'PR' ? 'America/Puerto_Rico' : 'America/Chicago',
        language: v('language'), owner: a.owner || ui.persona, account: a.id,
        tags: [], engagement: 'open',
        source: v('source'), campaign: v('campaign'), ad: '模拟进线会话',
        unread: 1, star: false, last: '刚刚', preview: msg, translation: '',
        followup: null, notes: '', contactRefs: [{ account: a.id, owner: a.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-实时', intentLevel: '高意向',
        reactivatedCount: 0,
        qualification: { demand: '新加微咨询目录与发货安排', volume: '待首响确认', deliveryRegion: a.country === 'PR' ? 'PR · San Juan' : 'US · TX', objection: '', commWindow: v('language') + '沟通' },
      };
      data.customers.unshift(c);
      data.messages[id] = [{ id: nextId('m'), side: 'in', text: msg, time: '刚刚' }];
      aiTranslateInbound(c, data.messages[id][0], tr);
      lcCreateTask({
        customerId: id,
        title: `首响破冰回复 ${name} 并确认具体需求`,
        dueIso: new Date(Date.now() + 3600000).toISOString(),
        priority: 'high',
      });
      lcLog(id, 'inbound', `通过「${c.source}」首次进线，已自动建立首响待办`);
      persist();
      close();
      lcState.followTab = 'signals'; lcState.signal = 'all'; navigate('followups');
      toast(`新客户 ${name} 已进线，已建立首响待办。`);
    },

    'lc-new-customer-form': (f, v) => {
      if (!v('name') || !v('phone')) return error('请填写客户称呼与 WhatsApp 号码。');
      const digits = fidPhoneDigits(v('phone'));
      if (digits.length < 7) return error('请输入含国家区号的有效号码。');
      const dup = data.customers.find(x => fidPhoneDigits(x.phone) === digits);
      if (dup) return error(`该号码已存在于客户「${dup.name}」，请直接前往其档案跟进避免撞单。`);
      const a = account(v('account'));
      const nowIso = new Date().toISOString();
      const id = nextId('c');
      const c = {
        id, name: v('name'), initials: initial(v('name')), color: 'jade',
        phone: v('phone'), country: v('country'), city: '待补充',
        timezone: v('country') === 'PR' ? 'America/Puerto_Rico' : 'America/New_York',
        language: v('language'), owner: a?.owner || ui.persona, account: a?.id || myAccounts()[0]?.id,
        tags: [], engagement: 'open',
        source: v('source'), campaign: '', ad: '',
        unread: 0, star: false, last: '刚刚', preview: v('demand') || '新建客户档案', translation: '',
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-补录', intentLevel: '中意向',
        reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') + '沟通' },
      };
      data.customers.unshift(c);
      lcCreateTask({
        customerId: id,
        title: `首次主动触达 ${c.name} 确认需求`,
        dueIso: new Date(Date.now() + 4 * 3600000).toISOString(),
        priority: 'normal',
      });
      lcLog(id, 'profile', '手动建档并自动建立首次跟进待办');
      persist();
      close();
      render();
      toast(`客户 ${c.name} 已创建并纳入跟进闭环。`);
    },
  });

  // Customers added outside this module (OpenWA sample chats, legacy saves) join the loop on the next render
  function lcSyncRuntimeCustomers() {
    for (const c of data.customers) {
      lcMigrateEngagement(c);
      c.qualification ||= {
        demand: c.notes || c.preview || '',
        volume: '待确认',
        deliveryRegion: country(c),
        objection: '',
        commWindow: (c.language || '英语') + '沟通',
      };
      if (c.needsFirstReply) {
        delete c.needsFirstReply;
        lcCreateTask({
          customerId: c.id,
          title: `首响回复 ${c.name} 并确认咨询需求`,
          dueIso: new Date(Date.now() + 2 * 3600000).toISOString(),
          priority: 'high',
        });
        lcLog(c.id, 'inbound', 'OpenWA 扫码进线会话已自动建立首响待办');
      }
    }
  }
  const lcWrapRender = render;
  render = function() {
    lcSyncRuntimeCustomers();
    if (ui.view !== 'followups') lcState.followFocus = null;
    lcWrapRender();
  };

  // Field toggles of the completion dialog, the tier / status drop-downs, and the shipping-status drop-downs of the orders tab
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'lc-complete-next') {
      const closing = t.value === 'close';
      $('#lc-complete-next-block').hidden = closing;
      $('#lc-complete-close-block').hidden = !closing;
      $('#dialog [name="nextTitle"]').required = !closing;
      $('#dialog [name="closeReason"]').required = closing;
    }
    if (t.dataset.lcTier || t.dataset.lcStatus) {
      const c = customer(t.dataset.lcTier || t.dataset.lcStatus);
      if (!c || !myCustomers().includes(c)) return;
      if (t.dataset.lcTier) {
        const next = LC_TIERS.includes(t.value) ? t.value : '';
        if (next === lcTier(c)) return;
        const before = lcTier(c) ? lcTier(c) + ' 级' : '未评级';
        c.tier = next;
        lcLog(c.id, 'profile', `客户等级：${before} → ${next ? next + ' 级' : '未评级'}`);
        toast(`已将 ${c.name} 的客户等级设为${next ? ' ' + next + ' 级' : '未评级'}。`);
      } else {
        const next = LC_CUSTOMER_STATUSES.some(([id]) => id === t.value) ? t.value : '';
        if (next === lcCustomerStatus(c)) return;
        const before = lcCustomerStatusLabel(c);
        c.customerStatus = next;
        lcLog(c.id, 'profile', `客户状态：${before} → ${lcCustomerStatusLabel(c)}`);
        toast(`已将 ${c.name} 的客户状态设为「${lcCustomerStatusLabel(c)}」。`);
      }
      persist();
      render();
      lcRefreshOpenDossier(c.id);
    }
    if (t.dataset.lcOrderShipping) {
      const c = customer(t.dataset.customer);
      const o = lcOrders(c).find(x => x.id === t.dataset.lcOrderShipping);
      if (!o || !myCustomers().includes(c)) return;
      const next = lcShipping(t.value);
      const before = lcShipping(o.shipping);
      if (next[0] === before[0]) return;
      o.shipping = next[0];
      lcLog(c.id, 'order', `订单 ${o.number} 物流状态：${before[1]} → ${next[1]}`);
      toast(`订单 ${o.number} 的物流状态已更新为「${next[1]}」。`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
    }
  });
