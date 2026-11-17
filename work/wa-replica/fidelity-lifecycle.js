  // ============================================================================
  // WhatsApp SCRM Full Customer Lifecycle Closed-Loop Engine (v0.6)
  // Stages: 新进线 -> 需求澄明 -> 报价推进 -> 成交履约 -> 复购培育 <-> 沉睡唤醒 / 流失归档
  // ============================================================================

  const LC_STAGES = [
    {
      id: '新进线', name: '新进线', code: 'S1', short: '新进线', zone: 'funnel', tone: 'blue', icon: 'UserRoundPlus',
      goal: '黄金首响破冰，核实进线来源、语言偏好与初步咨询意图',
      sop: '15分钟内首响 · 确认英/西语与收件地区 · 建立首次跟进计划',
      exitRule: '客户回复并表达明确咨询方向 → 推进至「需求澄明」',
      next: '需求澄明', defaultTask: '首响破冰与确认客户来意', defaultHours: 4,
    },
    {
      id: '需求澄明', name: '需求澄明', code: 'S2', short: '需求澄明', zone: 'funnel', tone: 'jade', icon: 'Compass',
      goal: '补全客户需求画像（规格偏好、采购规模、时效要求），发送匹配目录资料',
      sop: '发送对应语种目录 · 记录预算/体量区间 · 识别潜在跨号撞单',
      exitRule: '客户确认具体需求并询价 → 推进至「报价推进」',
      next: '报价推进', defaultTask: '跟进目录查看反馈与具体需求', defaultHours: 24,
    },
    {
      id: '报价推进', name: '报价推进', code: 'S3', short: '报价推进', zone: 'funnel', tone: 'gold', icon: 'FileSpreadsheet',
      goal: '发出结构化报价方案，跟进价格、运费与时效异议，推动拍板成交',
      sop: '登记报价单金额与有效期 · 24-48h 内跟进反馈 · 消解核心顾虑',
      exitRule: '确认付款下单 → 「成交履约」；明确放弃 → 记录原因归入「流失归档」',
      next: '成交履约', defaultTask: '跟进报价单确认情况与异议解答', defaultHours: 24,
    },
    {
      id: '成交履约', name: '成交履约', code: 'S4', short: '成交履约', zone: 'value', tone: 'purple', icon: 'PackageCheck',
      goal: '登记成交订单与外部单号，主动同步发货与物流轨迹直至安心签收',
      sop: '核对收款与订单号 · WhatsApp 同步物流单号 · 签收后做满意度回访',
      exitRule: '客户确认签收且体验良好 → 自动计算复购周期并转入「复购培育」',
      next: '复购培育', defaultTask: '同步发货单号并跟进物流签收', defaultHours: 48,
    },
    {
      id: '复购培育', name: '复购培育', code: 'S5', short: '复购培育', zone: 'value', tone: 'jade', icon: 'Repeat',
      goal: '围绕老客消耗/补货周期持续维护关系，在复购窗口期精准触达促成连单',
      sop: '跟踪预计复购日期 · 窗口前 5 天主动关怀询单 · 新询盘直接创建复购报价',
      exitRule: '产生复购新单 → 循环履约累加 LTV；超期未互动 → 预警转入「沉睡唤醒」',
      next: '报价推进', defaultTask: '复购窗口期老客关怀与补货确认', defaultHours: 120,
    },
    {
      id: '沉睡唤醒', name: '沉睡唤醒', code: 'S6', short: '沉睡唤醒', zone: 'recovery', tone: 'peach', icon: 'BellRing',
      goal: '针对超期未复购老客或长期已读不回潜客，执行低打扰价值触达唤醒',
      sop: '区分老客断购与潜客静默 · 发送近况关怀或新版目录 · 避免高频骚扰',
      exitRule: '客户回复互动 → 一键重激活回流至活跃阶段；确认无需求 → 「流失归档」',
      next: '需求澄明', defaultTask: '执行沉睡客户关怀唤醒触达', defaultHours: 72,
    },
    {
      id: '流失归档', name: '流失归档', code: 'S7', short: '流失归档', zone: 'recovery', tone: 'slate', icon: 'Archive',
      goal: '沉淀结构化流失原因与竞品/价格反馈，对暂缓型客户保留观察期回流入口',
      sop: '必填真实未成交主因 · 自动清理无效日常待办 · 客户复联支持一键重激活',
      exitRule: 'WhatsApp 再次来信或观察期满重评 → 一键重激活回流（保留完整历史）',
      next: '需求澄明', defaultTask: '流失观察期满复盘回访', defaultHours: 720,
    },
  ];

  const LC_STAGE_MAP = new Map(LC_STAGES.map((s, idx) => [s.id, { ...s, index: idx }]));
  const LC_ACTIVE_STAGES = new Set(['新进线', '需求澄明', '报价推进', '成交履约', '复购培育']);
  const LC_RECOVERY_STAGES = new Set(['沉睡唤醒', '流失归档']);
  const LC_LEGACY_STAGE_ALIAS = {
    '新客户': '新进线',
    '跟进中': '需求澄明',
    '已报价': '报价推进',
    '已成交': '复购培育',
    '培育中': '沉睡唤醒',
  };
  const LC_LOST_REASONS = [
    '需求暂缓/预算延后',
    '价格敏感/超出预算',
    '交付时效或物流不符',
    '已选择其他供应商',
    '长期失联未回复',
    '非目标客群/无效咨询',
  ];
  const LC_INTENT_LEVELS = ['高意向', '中意向', '了解中'];
  const LC_TASK_TYPES = ['首响破冰', '需求跟进', '报价催单', '履约回访', '复购关怀', '沉睡唤醒'];

  const lcMoneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const lcMoney = n => lcMoneyFmt.format(Number(n) || 0);

  const lcState = {
    mode: 'board',
    stageFilter: 'all',
    radar: 'all',
    account: 'all',
    query: '',
    sopOpen: true,
    dealsTab: 'quotes',
    dealsQuery: '',
    followTab: 'todo',
    customerHealthFilter: 'all',
    dossierTab: 'overview',
    timelineFilter: 'all',
  };

  function lcNormalizeStage(stage) {
    if (LC_STAGE_MAP.has(stage)) return stage;
    return LC_LEGACY_STAGE_ALIAS[stage] || '新进线';
  }
  const lcStageMeta = stage => LC_STAGE_MAP.get(lcNormalizeStage(stage)) || LC_STAGES[0];
  function lcStageBadge(stage, clickableId = '') {
    const meta = lcStageMeta(stage);
    if (clickableId) {
      return `<button type="button" class="lc-stage-badge ${meta.tone}" data-action="lcAdvance" ${fidActionID(clickableId)} title="点击推进或变更阶段">${icon(meta.icon)}${esc(meta.name)}</button>`;
    }
    return `<span class="lc-stage-badge ${meta.tone}">${icon(meta.icon)}${esc(meta.name)}</span>`;
  }

  function lcDaysBetween(fromIso, toIso = new Date().toISOString()) {
    if (!fromIso) return 0;
    const diff = new Date(toIso).getTime() - new Date(fromIso).getTime();
    return Math.round(diff / 86400000);
  }
  function lcDwellDays(c) {
    return Math.max(0, lcDaysBetween(c.stageEnteredAt || c.createdAt));
  }
  function lcDaysUntil(iso) {
    if (!iso) return null;
    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dest = new Date(target);
    dest.setHours(0, 0, 0, 0);
    return Math.round((dest.getTime() - today.getTime()) / 86400000);
  }

  function lcSeed() {
    data.quotes ??= [];
    data.orders ??= [];

    // Seed additional lifecycle-complete demo customers once so all 7 stages have realistic cases
    if (!data.lcSeededV06) {
      const extraCustomers = [
        {
          id: 'c9', name: 'Brandon Miller', initials: 'BM', color: 'blue',
          phone: '+1 (737) 555-0162', country: 'US', city: 'Austin', timezone: 'America/Chicago',
          language: '英语', owner: 'lin', account: 'a1', tags: [], stage: '新进线',
          source: 'Facebook 广告', campaign: 'US · 目录直达广告 D', ad: '规格答疑 · 素材 04',
          unread: 2, star: true, last: '10 分钟前',
          preview: 'Hi! Just added your WhatsApp from the ad. Do you ship to Texas and have a price list?',
          translation: '你好！刚从广告加了你们 WhatsApp。请问支持发德州吗？有价目目录吗？',
          followup: fidDay(0), notes: '刚进线高意向咨询，需首响回复目录与德州时效。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(0), updatedAt: fidDay(0), stageEnteredAt: fidDay(0),
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
          language: '英语', owner: 'lin', account: 'a1', tags: [], stage: '报价推进',
          source: 'Facebook 广告', campaign: 'US · 咨询广告 A', ad: '目录介绍 · 素材 02',
          unread: 0, star: false, last: '2 天前',
          preview: 'Got the quote PDF, let me review the quantities with my partner.',
          translation: '收到报价单了，我和合伙人核对一下采购数量。',
          followup: null, notes: '已发组合报价 $2,450，客户表示与合伙人商议，当前漏排下一步跟进（断档示例）。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(-6), updatedAt: fidDay(-2), stageEnteredAt: fidDay(-2),
          clientType: '新增线索-实时', intentLevel: '高意向',
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
          language: '西班牙语', owner: 'lin', account: 'a2', tags: [], stage: '成交履约',
          source: 'Instagram 广告', campaign: 'PR · 西语私域引流', ad: '西语客服直连 · 03',
          unread: 0, star: true, last: '昨天',
          preview: '¡Perfecto! Quedo atento a la entrega del paquete esta semana.',
          translation: '太好了！我会留意这周包裹的派送签收。',
          followup: fidDay(1), notes: '首单 $1,320 已收款并发出 USPS Priority，预计明日签收后回访转入复购培育。',
          contactRefs: [{ account: 'a2', owner: 'lin' }],
          createdAt: fidDay(-9), updatedAt: fidDay(-1), stageEnteredAt: fidDay(-3),
          clientType: '新增线索-实时', intentLevel: '高意向', repurchaseCycleDays: 30,
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
          language: '英语', owner: 'lin', account: 'a1', tags: [], stage: '流失归档',
          source: 'Facebook 广告', campaign: 'US · 咨询广告 A', ad: '目录介绍 · 素材 01',
          unread: 0, star: false, last: '12 天前',
          preview: 'We need to pause purchasing until next month’s budget opens up.',
          translation: '我们需要暂停采购，等下个月预算开放后再推进。',
          followup: null, notes: '原报价 $3,100，因季度预算排期暂缓，设观察期可随时唤醒重激活。',
          contactRefs: [{ account: 'a1', owner: 'lin' }],
          createdAt: fidDay(-22), updatedAt: fidDay(-12), stageEnteredAt: fidDay(-12),
          clientType: '新增线索-实时', intentLevel: '中意向',
          lostReason: '需求暂缓/预算延后',
          lostDetail: '客户团队月度采购预算冻结，明确表示新一轮预算窗口可重新对接报价。',
          reactivateWatchAt: fidDay(2),
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
        { id: 'm1001', side: 'in', text: 'Can you share a formal quote for two sets shipped to Chicago?', translated: '可以发一份两套发往芝加哥的正式报价单吗？', time: '2天前 11:10' },
        { id: 'm1002', side: 'out', text: 'Sure Harper! I have prepared Quote #QT-202611-02 ($2,450 total including priority shipping).', attachment: 'Quote-QT-202611-02.pdf', time: '2天前 11:26', read: true },
        { id: 'm1003', side: 'in', text: 'Got the quote PDF, let me review the quantities with my partner.', translated: '收到报价单了，我和合伙人核对一下采购数量。', time: '2天前 14:05' },
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

      // Enrich existing c1-c8 stages & SCRM profiles
      const enrichMap = {
        c1: {
          stage: '需求澄明', stageEnteredAt: fidDay(-1), intentLevel: '高意向',
          qualification: {
            demand: '索取最新产品总目录，对比常规规格与批次交付周期',
            volume: '$1,200 - $2,000 / 首单',
            deliveryRegion: 'US · TX Austin',
            objection: '正在横向对比 2 家渠道的响应速度与交付稳定性',
            commWindow: '偏好文字消息 · 美中白天',
          },
        },
        c2: {
          stage: '新进线', stageEnteredAt: fidDay(-1), intentLevel: '高意向',
          qualification: {
            demand: '确认波多黎各（San Juan）是否支持稳定直发与时效',
            volume: '待确认具体采购量',
            deliveryRegion: 'PR · San Juan',
            objection: '担心海岛地区运费偏高或清关延误',
            commWindow: '西班牙语沟通优先',
          },
        },
        c3: {
          stage: '复购培育', stageEnteredAt: fidDay(-22), intentLevel: '高意向',
          repurchaseCycleDays: 25, nextRepurchaseAt: fidDay(2), reactivatedCount: 1,
          qualification: {
            demand: '长期稳定老客（已完成 2 单），按月固定补货常规组合',
            volume: '$1,500 - $2,200 / 月',
            deliveryRegion: 'US · FL Miami',
            objection: '无价格异议，重视批次稳定与邮件同步资料',
            commWindow: '英语沟通 · 偏好提前 3 天确认排期',
          },
        },
        c4: {
          stage: '报价推进', stageEnteredAt: fidDay(-1), intentLevel: '高意向',
          qualification: {
            demand: '已发首批标准方案报价 $1,680，正在核实加州签收时效',
            volume: '$1,680（首单报价确认中）',
            deliveryRegion: 'US · CA San Francisco',
            objection: '希望确认付款后 48h 内发出并给追踪号',
            commWindow: '美西上午活跃',
          },
        },
        c5: {
          stage: '需求澄明', stageEnteredAt: fidDay(-2), intentLevel: '中意向',
          qualification: {
            demand: '需要全套西语版说明手册与入门规格建议',
            volume: '$600 - $1,000 / 试单',
            deliveryRegion: 'PR · Ponce',
            objection: '首次接触，需阅读西语详细参数后再决定数量',
            commWindow: '西语文字沟通',
          },
        },
        c6: {
          stage: '沉睡唤醒', stageEnteredAt: fidDay(-10), intentLevel: '中意向',
          repurchaseCycleDays: 25, nextRepurchaseAt: fidDay(-15),
          qualification: {
            demand: '老客转介绍试单客户（首单 $890 已签收 40 天），发新版目录后未回',
            volume: '$800 - $1,500',
            deliveryRegion: 'US · NY New York',
            objection: '上次回复看完目录再联系，超期 15 天未复购需关怀唤醒',
            commWindow: '美东工作时间',
          },
        },
        c7: { stage: '需求澄明', stageEnteredAt: fidDay(-1), intentLevel: '高意向' },
        c8: { stage: '报价推进', stageEnteredAt: fidDay(-2), intentLevel: '高意向' },
      };
      for (const [cid, patch] of Object.entries(enrichMap)) {
        const target = customer(cid);
        if (target) Object.assign(target, patch);
      }

      if (!data.quotes.length) {
        data.quotes.push(
          {
            id: 'qte1', quoteNo: 'QT-202611-01', customerId: 'c4', accountId: 'a1', owner: 'lin',
            amount: 1680, currency: 'USD', summary: '加州首批标准规格组合方案（含特快专递）',
            validUntil: fidDay(4).slice(0, 10), status: '待确认',
            objectionNote: '客户追问具体派送天数，确认时效后即可成单',
            createdAt: fidDay(-1), updatedAt: fidDay(0),
          },
          {
            id: 'qte2', quoteNo: 'QT-202611-02', customerId: 'c10', accountId: 'a1', owner: 'lin',
            amount: 2450, currency: 'USD', summary: '芝加哥双规格阶梯报价单（2套组合折后价）',
            validUntil: fidDay(2).slice(0, 10), status: '待确认',
            objectionNote: '合伙人共同评估数量中，急需补排催单跟进',
            createdAt: fidDay(-2), updatedAt: fidDay(-2),
          },
          {
            id: 'qte3', quoteNo: 'QT-202611-03', customerId: 'c11', accountId: 'a2', owner: 'lin',
            amount: 1320, currency: 'USD', summary: '波多黎各首单直发方案',
            validUntil: fidDay(5).slice(0, 10), status: '已转单',
            objectionNote: '已确认付款转入订单履约',
            createdAt: fidDay(-4), updatedAt: fidDay(-3),
          },
          {
            id: 'qte4', quoteNo: 'QT-202610-19', customerId: 'c12', accountId: 'a1', owner: 'lin',
            amount: 3100, currency: 'USD', summary: '凤凰城季度整箱阶梯报价方案',
            validUntil: fidDay(-8).slice(0, 10), status: '已失效',
            objectionNote: '因客户月度预算延后归档，重激活时可一键恢复更新报价',
            createdAt: fidDay(-16), updatedAt: fidDay(-12),
          },
          {
            id: 'qte5', quoteNo: 'QT-202611-05', customerId: 'c8', accountId: 'a5', owner: 'su',
            amount: 1490, currency: 'USD', summary: 'Carolina 西语询盘标准报价',
            validUntil: fidDay(3).slice(0, 10), status: '待确认',
            objectionNote: '等待客户回复收件细节',
            createdAt: fidDay(-1), updatedAt: fidDay(-1),
          }
        );
      }

      if (!data.orders.length) {
        data.orders.push(
          {
            id: 'ord1', orderNo: 'ORD-202611-104', quoteId: 'qte3', customerId: 'c11', accountId: 'a2', owner: 'lin',
            amount: 1320, currency: 'USD', orderType: '首单', paymentStatus: '已收款',
            fulfillmentStatus: '运输中', carrierNote: 'USPS Priority · 预计明日投递 Bayamón',
            createdAt: fidDay(-3), deliveredAt: null,
          },
          {
            id: 'ord2', orderNo: 'ORD-202609-041', quoteId: '', customerId: 'c3', accountId: 'a2', owner: 'lin',
            amount: 1180, currency: 'USD', orderType: '首单', paymentStatus: '已收款',
            fulfillmentStatus: '已签收', carrierNote: 'FedEx 2Day · Miami 已本人签收',
            createdAt: fidDay(-52), deliveredAt: fidDay(-49),
          },
          {
            id: 'ord3', orderNo: 'ORD-202610-088', quoteId: '', customerId: 'c3', accountId: 'a2', owner: 'lin',
            amount: 1960, currency: 'USD', orderType: '复购', paymentStatus: '已收款',
            fulfillmentStatus: '已签收', carrierNote: 'FedEx 2Day · 第二次复购加量单已签收',
            createdAt: fidDay(-26), deliveredAt: fidDay(-23),
          },
          {
            id: 'ord4', orderNo: 'ORD-202610-052', quoteId: '', customerId: 'c6', accountId: 'a2', owner: 'lin',
            amount: 890, currency: 'USD', orderType: '首单', paymentStatus: '已收款',
            fulfillmentStatus: '已签收', carrierNote: 'UPS Ground · New York 已签收（超期未复购）',
            createdAt: fidDay(-44), deliveredAt: fidDay(-40),
          }
        );
      }

      // Add closed-loop tasks for new customers (intentionally leaving c10 without a task to showcase gap detection!)
      if (!data.tasks.some(t => t.customer === 'c9')) {
        data.tasks.unshift(
          { id: 't9', customer: 'c9', owner: 'lin', title: '首响回复目录与德州发货时效说明', due: fidDay(0), priority: 'high', taskType: '首响破冰', done: false },
          { id: 't11', customer: 'c11', owner: 'lin', title: '跟进波多黎各包裹签收并做首单满意度回访', due: fidDay(1), priority: 'normal', taskType: '履约回访', done: false }
        );
      }
      const taskTypePatch = { t1: '首响破冰', t2: '需求跟进', t3: '报价催单', t4: '复购关怀', t5: '需求跟进', t6: '沉睡唤醒' };
      for (const t of data.tasks) {
        if (taskTypePatch[t.id]) t.taskType ||= taskTypePatch[t.id];
        t.taskType ||= '需求跟进';
      }

      // Enrich lifecycle timeline activities
      data.activities.c3 = [
        { category: 'deal', text: '订单 ORD-202610-088（复购 $1,960）确认签收，转入「复购培育」（周期 25 天）', by: '林予', time: '23天前', createdAt: fidDay(-23) },
        { category: 'deal', text: '首单 ORD-202609-041（$1,180）完成交付建档', by: '林予', time: '49天前', createdAt: fidDay(-49) },
      ];
      data.activities.c4 = [
        { category: 'deal', text: '创建报价单 QT-202611-01（$1,680），阶段由「需求澄明」推进至「报价推进」', by: '林予', time: '昨天 14:05', createdAt: fidDay(-1) },
      ];
      data.activities.c11 = [
        { category: 'deal', text: '订单 ORD-202611-104 已发出（USPS Priority），同步单号给客户', by: '林予', time: '昨天 15:40', createdAt: fidDay(-1) },
        { category: 'stage', text: '报价单 QT-202611-03（$1,320）确认收款转单，阶段推进至「成交履约」', by: '林予', time: '3天前', createdAt: fidDay(-3) },
      ];
      data.activities.c12 = [
        { category: 'stage', text: '阶段归入「流失归档」· 原因：需求暂缓/预算延后（设观察期复盘）', by: '林予', time: '12天前', createdAt: fidDay(-12) },
      ];

      data.lcSeededV06 = true;
    }

    // Ensure every customer has normalized stage & safe defaults
    for (const c of data.customers) {
      c.stage = lcNormalizeStage(c.stage);
      c.stageEnteredAt ||= c.updatedAt || c.createdAt || fidDay(-2);
      c.intentLevel ||= '中意向';
      c.reactivatedCount ??= 0;
      c.repurchaseCycleDays ||= 30;
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
    Object.assign(lcState, {
      mode: 'board', stageFilter: 'all', radar: 'all', account: 'all', query: '',
      dealsTab: 'quotes', dealsQuery: '', followTab: 'todo', customerHealthFilter: 'all',
    });
    lcSeed();
  };

  // Ensure key SCRM lifecycle views appear in workspace tabs cleanly
  ui.openTabs = [...new Set(['dashboard', 'lifecycle', 'inbox', 'customers', 'followups', 'deals', ...ui.openTabs.filter(id => Object.hasOwn(views, id))])];

  // ============================================================================
  // Real-Time Customer Metrics, LTV & Anti-Leakage Health Signals
  // ============================================================================
  const lcCustomerQuotes = cid => (data.quotes || []).filter(q => q.customerId === cid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const lcCustomerOrders = cid => (data.orders || []).filter(o => o.customerId === cid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const lcCustomerLtv = cid => lcCustomerOrders(cid).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const lcOpenQuotesValue = cid => lcCustomerQuotes(cid).filter(q => q.status === '待确认').reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
  const lcNextTask = cid => data.tasks.filter(t => t.customer === cid && !t.done).sort((a, b) => new Date(a.due) - new Date(b.due))[0] || null;

  function lcHealth(c) {
    const stage = lcNormalizeStage(c.stage);
    const nextTask = lcNextTask(c.id);
    const openQuote = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
    const inTransitOrder = lcCustomerOrders(c.id).find(o => o.fulfillmentStatus !== '已签收');
    const repDays = lcDaysUntil(c.nextRepurchaseAt);
    const inboundReactivate = LC_RECOVERY_STAGES.has(stage) && c.unread > 0;
    const firstResponse = stage === '新进线' && (c.unread > 0 || (conversationMessages(c).at(-1)?.side === 'in'));
    const overdue = Boolean(nextTask && beforeToday(nextTask.due));
    const noPlan = LC_ACTIVE_STAGES.has(stage) && !nextTask;
    const repurchaseSoon = stage === '复购培育' && repDays !== null && repDays <= 5;
    const dormantWatch = stage === '沉睡唤醒' || (stage === '流失归档' && c.reactivateWatchAt && lcDaysUntil(c.reactivateWatchAt) <= 3);

    let primary = { key: 'healthy', label: '推进正常', tone: 'ok', icon: 'BadgeCheck' };
    if (inboundReactivate) primary = { key: 'reactivate', label: '复联待重激活', tone: 'hot', icon: 'Flame' };
    else if (overdue) primary = { key: 'overdue', label: '跟进已逾期', tone: 'hot', icon: 'ClockAlert' };
    else if (firstResponse) primary = { key: 'first', label: '首响待破冰', tone: 'warn', icon: 'Zap' };
    else if (noPlan) primary = { key: 'noplan', label: '跟进断档', tone: 'warn', icon: 'TriangleAlert' };
    else if (repurchaseSoon) primary = { key: 'repurchase', label: repDays < 0 ? `复购超期 ${Math.abs(repDays)}天` : `复购窗口 (${repDays === 0 ? '今天' : repDays + '天后'})`, tone: 'info', icon: 'Repeat' };
    else if (openQuote) primary = { key: 'quote', label: `报价待确认 ${lcMoney(openQuote.amount)}`, tone: 'info', icon: 'FileSpreadsheet' };
    else if (inTransitOrder) primary = { key: 'fulfill', label: `履约 · ${inTransitOrder.fulfillmentStatus}`, tone: 'info', icon: 'Truck' };
    else if (dormantWatch) primary = { key: 'dormant', label: stage === '沉睡唤醒' ? '待关怀唤醒' : '观察期可回访', tone: 'neutral', icon: 'BellRing' };
    else if (stage === '流失归档') primary = { key: 'archived', label: c.lostReason || '已流失归档', tone: 'neutral', icon: 'Archive' };

    return {
      primary,
      nextTask,
      openQuote,
      inTransitOrder,
      repDays,
      inboundReactivate,
      firstResponse,
      overdue,
      noPlan,
      quoteOpen: Boolean(openQuote),
      repurchaseSoon,
      dormantWatch,
    };
  }

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

  function lcCreateTask({ customerId, title, dueIso, priority = 'normal', taskType = '需求跟进' }) {
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
      taskType,
      done: false,
    };
    data.tasks.push(t);
    const next = lcNextTask(c.id);
    c.followup = next?.due || due;
    return t;
  }

  // ============================================================================
  // Navigation & Sidebar Integration
  // ============================================================================
  const lcCustomerMenu = ['lifecycle', 'customers', 'followups', 'deals', 'chat-records', 'tags', 'tag-stats'];
  viewIcon = id => ({
    dashboard: 'LayoutDashboard',
    lifecycle: 'Kanban',
    inbox: 'MessageCircle',
    accounts: 'Smartphone',
    customers: 'ContactRound',
    followups: 'ClipboardList',
    deals: 'Receipt',
    'chat-records': 'MessagesSquare',
    tags: 'Tags',
    'tag-stats': 'ChartColumn',
    materials: 'Images',
    team: 'Network',
    members: 'UsersRound',
    scope: 'SlidersHorizontal',
  }[id] || 'FileText');

  menuHTML = function(mobile = false) {
    const gapCount = myCustomers().filter(c => {
      const h = lcHealth(c);
      return h.inboundReactivate || h.overdue || h.noPlan;
    }).length;
    const renderItem = (id, label) => {
      const badge = id === 'lifecycle' && gapCount && !mobile
        ? `<span class="nav-count" title="需关注防漏信号">${gapCount}</span>`
        : id === 'scope' && !mobile
          ? '<span class="nav-count" id="pending-count"></span>'
          : '';
      return `<a class="nav-item ${ui.view === id ? 'active' : ''} ${id === 'scope' ? 'scope-link' : ''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view === id ? 'aria-current="page"' : ''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span>${badge}</a>`;
    };
    const navGroup = (title, glyph, action, opened, ids) =>
      `<button class="nav-group-button ${ids.includes(ui.view) ? 'group-active' : ''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened ? 'ChevronUp' : 'ChevronDown')}</button><div class="submenu" ${opened ? '' : 'hidden'}>${ids.map(id => renderItem(id, views[id])).join('')}</div>`;
    return (
      renderItem('dashboard', views.dashboard) +
      renderItem('lifecycle', views.lifecycle) +
      renderItem('inbox', views.inbox) +
      renderItem('accounts', views.accounts) +
      '<div class="nav-caption">客户全生命管理</div>' +
      navGroup('客户与跟进闭环', 'ContactRound', 'fidNavCustomers', ui.customerNavOpen, lcCustomerMenu.filter(id => id !== 'lifecycle')) +
      navGroup('运营管理', 'Images', 'fidNavOperations', fid.operationsOpen, operationsMenu) +
      (manager() ? '<div class="nav-caption">账户与组织</div>' + navGroup('组织管理', 'Network', 'fidNavOrg', fid.orgOpen, ['team', 'members']) : '') +
      '<div class="nav-caption">工作台设置</div>' +
      renderItem('scope', views.scope)
    );
  };

  // ============================================================================
  // Page 1: #lifecycle (客户全周期看板 — 漏斗 + 存量价值环 + 防漏雷达)
  // ============================================================================
  function lcMatchesRadar(c, radar) {
    if (radar === 'all') return true;
    const h = lcHealth(c);
    if (radar === 'reactivate') return h.inboundReactivate || LC_RECOVERY_STAGES.has(c.stage);
    if (radar === 'first') return h.firstResponse;
    if (radar === 'overdue') return h.overdue;
    if (radar === 'noplan') return h.noPlan;
    if (radar === 'quote') return h.quoteOpen;
    if (radar === 'repurchase') return h.repurchaseSoon || c.stage === '复购培育';
    return true;
  }

  function lcFilteredCustomers() {
    const q = lcState.query.trim().toLowerCase();
    return myCustomers().filter(c => {
      if (lcState.stageFilter !== 'all' && c.stage !== lcState.stageFilter) return false;
      if (lcState.account !== 'all' && c.account !== lcState.account) return false;
      if (!lcMatchesRadar(c, lcState.radar)) return false;
      if (!q) return true;
      return [c.name, c.phone, c.source, c.notes, c.qualification?.demand, account(c.account)?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }

  function lcCardHTML(c) {
    const a = account(c.account);
    const h = lcHealth(c);
    const ltv = lcCustomerLtv(c.id);
    const openQuoteVal = lcOpenQuotesValue(c.id);
    const dwell = lcDwellDays(c);
    const cardTone = h.primary.tone === 'hot' ? 'has-hot' : h.primary.tone === 'warn' ? 'has-warn' : ltv > 0 ? 'has-good' : '';
    const summaryText = c.stage === '流失归档'
      ? `流失原因：${c.lostReason || '未注明'}${c.lostDetail ? ' · ' + c.lostDetail : ''}`
      : (c.qualification?.demand || c.notes || c.preview || '待补充客户核心需求画像');

    const valuePill = openQuoteVal > 0 && h.primary.key !== 'quote'
      ? `<span class="lc-pill info">${icon('FileSpreadsheet')}报价 ${lcMoney(openQuoteVal)}</span>`
      : ltv > 0
        ? `<span class="lc-pill ok">${icon('DollarSign')}累计 ${lcMoney(ltv)}</span>`
        : `<span class="lc-pill neutral">${esc(c.intentLevel || '中意向')}</span>`;

    const nextLine = h.nextTask
      ? `${icon(h.overdue ? 'ClockAlert' : 'CalendarClock')}<span>${esc(dateLabel(h.nextTask.due))} · ${esc(h.nextTask.title)}</span>`
      : LC_ACTIVE_STAGES.has(c.stage)
        ? `${icon('TriangleAlert')}<span>未安排下一步跟进（点击补排防断档）</span>`
        : `${icon('RotateCcw')}<span>${c.reactivateWatchAt ? '观察复盘：' + esc(dateLabel(c.reactivateWatchAt, false)) : '收到新消息可随时一键重激活'}</span>`;

    const primaryBtn = LC_RECOVERY_STAGES.has(c.stage)
      ? fidButton(h.inboundReactivate ? '立即重激活' : '重激活回流', 'lcAdvance', 'RotateCcw', h.inboundReactivate ? 'blue' : 'tint', `${fidActionID(c.id)} data-target="需求澄明"`)
      : fidButton('推进阶段', 'lcAdvance', 'ArrowRight', 'tint', fidActionID(c.id));

    const extraRecoveryBtn = LC_RECOVERY_STAGES.has(c.stage) && !h.inboundReactivate
      ? `<button type="button" class="icon-button" data-action="lcSimReply" ${fidActionID(c.id)} aria-label="模拟${esc(c.name)}发来复联消息">${icon('MessageSquareReply')}</button>`
      : `<button type="button" class="icon-button" data-action="followup" ${fidActionID(c.id)} aria-label="为${esc(c.name)}安排跟进">${icon('CalendarPlus')}</button>`;

    return `<article class="lc-card ${cardTone}" data-customer-card="${esc(c.id)}">
      <div class="lc-card-head">
        ${avatar(c, 'small')}
        <div class="lc-card-person">
          <strong>
            <button type="button" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button>
            ${c.unread ? `<span class="unread" title="${c.unread} 条未读">${c.unread}</span>` : ''}
          </strong>
          <small>${esc(a?.name || '未绑号')} · ${esc(c.language)} · 当地 ${esc(localTime(c))}</small>
        </div>
        <span class="lc-dwell" title="当前阶段停留时长">${dwell === 0 ? '今日入场' : dwell + '天'}</span>
      </div>
      <div class="lc-card-summary">${esc(summaryText)}</div>
      <div class="lc-card-badges">
        <span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span>
        ${valuePill}
        ${c.reactivatedCount > 0 ? `<span class="lc-pill info">回流×${c.reactivatedCount}</span>` : ''}
      </div>
      <div class="lc-card-next">${nextLine}</div>
      <div class="lc-card-actions">
        ${primaryBtn}
        ${fidButton('去聊天', 'openConversation', 'MessageCircle', '', fidActionID(c.id))}
        ${extraRecoveryBtn}
        <button type="button" class="icon-button" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)} 360档案">${icon('ContactRound')}</button>
      </div>
    </article>`;
  }

  function renderLifecycleTable(list) {
    const cols = ['客户 / 来源', '归属 WhatsApp 号', '当前阶段 / 停留', '核心需求画像', '在途报价 / 累计成交', '防漏状态 / 下一步跟进', '操作'];
    const rows = list.map(c => {
      const a = account(c.account);
      const h = lcHealth(c);
      const ltv = lcCustomerLtv(c.id);
      const oq = lcOpenQuotesValue(c.id);
      return `<tr>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)} · ${esc(c.source)}</span></td>
        <td style="text-align:left">${esc(a?.name || '—')}<span class="fid-cell-detail">${esc(c.language)} · 当地 ${esc(localTime(c))}</span></td>
        <td>${lcStageBadge(c.stage, c.id)}<span class="fid-cell-detail">停留 ${lcDwellDays(c)} 天</span></td>
        <td style="text-align:left"><span class="fid-cell-note">${esc(c.qualification?.demand || c.notes || '—')}</span><span class="fid-cell-detail">${esc(c.qualification?.volume || '')}</span></td>
        <td>${oq ? `<strong style="color:var(--fid-royal)">报价 ${lcMoney(oq)}</strong>` : ''}${oq && ltv ? '<br>' : ''}${ltv ? `<strong style="color:var(--fid-mint)">成交 ${lcMoney(ltv)}</strong>` : (!oq ? '—' : '')}</td>
        <td style="text-align:left"><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due) + ' · ' + h.nextTask.title) : '暂无待办跟进'}</span></td>
        <td><div class="fid-icon-actions">
          ${fidButton(LC_RECOVERY_STAGES.has(c.stage) ? '重激活' : '推进', 'lcAdvance', 'ArrowRight', 'slim tint', fidActionID(c.id))}
          ${fidIcon('打开会话', 'openConversation', 'MessageCircle', c.id)}
          ${fidIcon('360° 客户档案', 'profile', 'ContactRound', c.id)}
        </div></td>
      </tr>`;
    }).join('');
    return `<div class="fid-table-card">${fidTable('lc-stage-table', cols, rows, '当前筛选条件下没有匹配的客户', true, 'Kanban')}</div>`;
  }

  function renderLifecycle() {
    const all = myCustomers();
    const list = lcFilteredCustomers();
    const funnelStages = LC_STAGES.slice(0, 5);
    const dormantCount = all.filter(c => c.stage === '沉睡唤醒').length;
    const lostCount = all.filter(c => c.stage === '流失归档').length;
    const reactivatedTotal = all.reduce((s, c) => s + (c.reactivatedCount || 0), 0);
    const totalQuotePool = all.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0);
    const totalLtv = all.reduce((s, c) => s + lcCustomerLtv(c.id), 0);

    const radarCounts = {
      all: all.length,
      reactivate: all.filter(c => lcHealth(c).inboundReactivate || LC_RECOVERY_STAGES.has(c.stage)).length,
      first: all.filter(c => lcHealth(c).firstResponse).length,
      overdue: all.filter(c => lcHealth(c).overdue).length,
      noplan: all.filter(c => lcHealth(c).noPlan).length,
      quote: all.filter(c => lcHealth(c).quoteOpen).length,
      repurchase: all.filter(c => lcHealth(c).repurchaseSoon || c.stage === '复购培育').length,
    };
    const hotReactivate = all.filter(c => lcHealth(c).inboundReactivate).length;

    const funnelHTML = funnelStages.map(st => {
      const stageCustomers = all.filter(c => c.stage === st.id);
      const val = st.id === '报价推进'
        ? lcMoney(stageCustomers.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0))
        : (st.id === '成交履约' || st.id === '复购培育')
          ? lcMoney(stageCustomers.reduce((s, c) => s + lcCustomerLtv(c.id), 0))
          : `${stageCustomers.filter(c => c.unread > 0).length} 未读`;
      const active = lcState.stageFilter === st.id;
      return `<button type="button" class="lc-step-card ${active ? 'active' : ''}" data-action="lcStageFilter" ${fidActionID(st.id)} aria-pressed="${active}">
        <span class="lc-step-top"><span class="lc-step-code">${st.code}</span>${icon(st.icon)}</span>
        <span class="lc-step-name">${esc(st.name)}</span>
        <span class="lc-step-metrics"><b>${stageCustomers.length}</b><small>${esc(val)}</small></span>
      </button>`;
    }).join('');

    const activeSopMeta = lcState.stageFilter !== 'all' ? lcStageMeta(lcState.stageFilter) : null;
    const sopHTML = lcState.sopOpen ? `<div class="lc-sop-strip" role="region" aria-label="阶段推进准则">
      ${activeSopMeta
        ? `<strong>${icon(activeSopMeta.icon)}${esc(activeSopMeta.code + ' · ' + activeSopMeta.name)} SOP：</strong>
           <span class="lc-sop-item">目标：${esc(activeSopMeta.goal)}</span>
           <span class="lc-sop-item">动作：${esc(activeSopMeta.sop)}</span>
           <span class="lc-sop-item">出口：${esc(activeSopMeta.exitRule)}</span>
           <button type="button" class="fid-link" data-action="lcStageFilter" data-id="all">显示全部 7 阶段</button>`
        : `<strong>${icon('Sparkles')}全生命周期闭环规则：</strong>
           <span class="lc-sop-item">1. 新客加微进线自动立首响待办</span>
           <span class="lc-sop-item">2. 每次完成跟进必衔接下一步计划（防断档）</span>
           <span class="lc-sop-item">3. 报价→订单→签收自动转入复购周期</span>
           <span class="lc-sop-item">4. 沉睡/流失客户来信即刻触发回流重激活</span>
           <button type="button" class="fid-link" data-action="lcToggleSop">收起提示</button>`}
    </div>` : '';

    const radarDefs = [
      ['all', '全部客户', 'UsersRound', ''],
      ['first', '首响待破冰', 'Zap', radarCounts.first ? 'is-alert' : ''],
      ['overdue', '跟进已逾期', 'ClockAlert', radarCounts.overdue ? 'is-hot' : ''],
      ['noplan', '跟进断档(无计划)', 'TriangleAlert', radarCounts.noplan ? 'is-alert' : ''],
      ['quote', '报价待催单', 'FileSpreadsheet', ''],
      ['repurchase', '复购培育池', 'Repeat', ''],
      ['reactivate', hotReactivate ? `复联待激活(${hotReactivate})` : '沉睡与回流池', 'RotateCcw', hotReactivate ? 'is-hot' : ''],
    ];

    const visibleStages = lcState.stageFilter === 'all' ? LC_STAGES : LC_STAGES.filter(s => s.id === lcState.stageFilter);
    const boardHTML = `<div class="lc-board" style="grid-template-columns:repeat(${visibleStages.length},minmax(240px,1fr))">
      ${visibleStages.map(st => {
        const cards = list.filter(c => c.stage === st.id);
        const stageVal = st.id === '报价推进'
          ? `在途 ${lcMoney(cards.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0))}`
          : ['成交履约', '复购培育'].includes(st.id)
            ? `LTV ${lcMoney(cards.reduce((s, c) => s + lcCustomerLtv(c.id), 0))}`
            : st.zone === 'recovery' ? '支持随时回流重激活' : '点击卡片可快速推进';
        return `<section class="lc-col ${st.zone === 'recovery' ? 'is-recovery' : ''}" aria-label="${esc(st.name)}阶段列">
          <header class="lc-col-head">
            <div class="lc-col-title">
              <strong>${icon(st.icon)}${esc(st.name)}</strong>
              <span class="lc-col-count">${cards.length}</span>
            </div>
            <div class="lc-col-sub"><span>${esc(st.code)}</span><span>${esc(stageVal)}</span></div>
          </header>
          <div class="lc-col-body">
            ${cards.length ? cards.map(lcCardHTML).join('') : '<div class="lc-col-empty">当前无匹配客户</div>'}
          </div>
        </section>`;
      }).join('')}
    </div>`;

    return `<section class="lc-page" aria-labelledby="lc-page-title">
      <div class="lc-wrap">
        <header class="lc-hero">
          <div class="lc-hero-title">
            <h1 id="lc-page-title">${icon('Kanban')}WhatsApp 客户全生命周期看板</h1>
            <p>围绕「加微进线 → 需求澄明 → 报价推进 → 成交履约 → 复购培育 ⇄ 沉睡唤醒/流失回流」构建无断点私域管理闭环。</p>
          </div>
          <div class="lc-hero-actions">
            ${fidButton('模拟新客加微进线', 'lcSimLeadOpen', 'Sparkles', 'tint')}
            ${fidButton('新增客户建档', 'addCustomer', 'UserRoundPlus', '')}
            ${fidButton('成交与复购台账', '', 'Receipt', 'gradient', 'data-nav="deals"')}
            <div class="lc-view-switch" role="group" aria-label="视图切换">
              <button type="button" data-action="lcMode" data-id="board" aria-pressed="${lcState.mode === 'board'}">${icon('LayoutGrid')}看板</button>
              <button type="button" data-action="lcMode" data-id="table" aria-pressed="${lcState.mode === 'table'}">${icon('Table2')}明细表</button>
            </div>
          </div>
        </header>

        <div class="lc-loop-banner">
          <div class="lc-loop-main">
            <div class="lc-loop-caption">
              <strong>${icon('TrendingUp')}前半程转化漏斗 & 存量复购价值链</strong>
              <span>在途报价池：<b>${lcMoney(totalQuotePool)}</b> · 历史累计成交 LTV：<b>${lcMoney(totalLtv)}</b></span>
            </div>
            <div class="lc-funnel-steps">${funnelHTML}</div>
          </div>
          <div class="lc-recovery-box">
            <div class="lc-recovery-head">
              <span>${icon('RotateCcw')}休眠唤醒与战败回流环</span>
              <small>闭环池</small>
            </div>
            <div class="lc-recovery-grid">
              <button type="button" class="lc-recovery-pill ${lcState.stageFilter === '沉睡唤醒' ? 'active' : ''}" data-action="lcStageFilter" data-id="沉睡唤醒">
                <span>S6 · 沉睡唤醒</span><strong>${dormantCount}</strong>
              </button>
              <button type="button" class="lc-recovery-pill ${lcState.stageFilter === '流失归档' ? 'active' : ''}" data-action="lcStageFilter" data-id="流失归档">
                <span>S7 · 流失归档</span><strong>${lostCount}</strong>
              </button>
            </div>
            <div class="lc-recovery-foot">
              <span>累计唤醒/回流激活：<b>${reactivatedTotal} 人次</b></span>
              ${lcState.stageFilter !== 'all' ? `<button type="button" class="fid-link" data-action="lcStageFilter" data-id="all">清除阶段筛选</button>` : ''}
            </div>
          </div>
        </div>

        ${sopHTML}

        <div class="lc-radar-bar">
          <div class="lc-radar-chips" role="group" aria-label="防漏健康度雷达">
            ${radarDefs.map(([id, label, glyph, cls]) =>
              `<button type="button" class="lc-radar-chip ${cls}" data-action="lcRadar" ${fidActionID(id)} aria-pressed="${lcState.radar === id}">${icon(glyph)}${esc(label)}<b>${radarCounts[id]}</b></button>`
            ).join('')}
          </div>
          <div class="lc-radar-controls">
            <select class="fid-select" id="lc-account-filter" aria-label="按号码筛选生命周期">
              ${option('all', '全部负责号码', lcState.account)}
              ${myAccounts().map(a => option(a.id, a.name, lcState.account)).join('')}
            </select>
            <input class="fid-input" id="lc-search-input" aria-label="搜索客户或需求" placeholder="搜索姓名、号码、需求…" value="${esc(lcState.query)}">
            ${(lcState.stageFilter !== 'all' || lcState.radar !== 'all' || lcState.account !== 'all' || lcState.query)
              ? fidButton('重置筛选', 'lcResetFilters', 'RotateCw', 'slim') : ''}
          </div>
        </div>

        ${lcState.mode === 'board' ? boardHTML : renderLifecycleTable(list)}
      </div>
    </section>`;
  }

  // ============================================================================
  // Smart Stage Transition Gateway Modal (阶段推进门禁与下一步待办自动衔接)
  // ============================================================================
  function lcTransitionDynamicFields(c, targetStage) {
    const meta = lcStageMeta(targetStage);
    const isReactivating = LC_RECOVERY_STAGES.has(c.stage) && LC_ACTIVE_STAGES.has(targetStage);
    const openQuote = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
    const dueDefault = inputDate(new Date(Date.now() + meta.defaultHours * 3600000).toISOString());

    let stageSpecific = '';
    if (targetStage === '需求澄明') {
      stageSpecific = `
        ${fidFormRow('意向度', `<select class="fid-select" name="intentLevel" style="width:100%">${LC_INTENT_LEVELS.map(x => option(x, x, c.intentLevel)).join('')}</select>`)}
        ${fidFormRow('核心需求', `<input class="fid-input" style="width:100%" name="demand" value="${esc(c.qualification?.demand || '')}" placeholder="如：常规规格咨询、目标数量、包装要求" required>`, '', true)}
        ${fidFormRow('预计体量', `<input class="fid-input" style="width:100%" name="volume" value="${esc(c.qualification?.volume || '')}" placeholder="如：$1,000 - $2,000 / 首批">`)}`;
    } else if (targetStage === '报价推进') {
      stageSpecific = `
        ${fidFormRow('报价金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="quoteAmount" value="${esc(openQuote?.amount || '')}" placeholder="输入 USD 金额（如 1680）" required>`, '', true)}
        ${fidFormRow('报价方案', `<input class="fid-input" style="width:100%" name="quoteSummary" value="${esc(openQuote?.summary || c.qualification?.demand || '')}" placeholder="如：首批标准组合含优先快递" required>`, '', true)}
        ${fidFormRow('客户顾虑', `<input class="fid-input" style="width:100%" name="objection" value="${esc(openQuote?.objectionNote || c.qualification?.objection || '')}" placeholder="选填：价格对比 / 时效确认 / 合伙人审批">`)}`;
    } else if (targetStage === '成交履约') {
      const priorOrders = lcCustomerOrders(c.id).length;
      stageSpecific = `
        ${fidFormRow('成交金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="orderAmount" value="${esc(openQuote?.amount || '')}" placeholder="输入实收 USD 金额" required>`, '', true)}
        ${fidFormRow('订单属性', `<select class="fid-select" name="orderType" style="width:100%">${fidOption(['首单', '复购'], priorOrders > 0 ? '复购' : '首单')}</select>`)}
        ${fidFormRow('履约状态', `<select class="fid-select" name="fulfillmentStatus" style="width:100%">${fidOption(['待发货', '运输中', '已签收'], '待发货')}</select>`)}
        ${fidFormRow('交付备注', `<input class="fid-input" style="width:100%" name="carrierNote" placeholder="外部订单号或物流说明（如 USPS / FedEx）">`)}`;
    } else if (targetStage === '复购培育') {
      stageSpecific = `
        ${fidFormRow('复购周期', `<select class="fid-select" name="repurchaseCycleDays" style="width:100%">${fidOption([['15', '15 天（高频补货）'], ['25', '25 天（标准周期）'], ['30', '30 天（月度复购）'], ['45', '45 天（中长周期）'], ['60', '60 天（季度补货）']], String(c.repurchaseCycleDays || 30))}</select>`)}
        ${fidFormRow('维护备注', `<input class="fid-input" style="width:100%" name="transitionNote" placeholder="记录签收反馈或下次预计补货偏好">`)}`;
    } else if (targetStage === '沉睡唤醒') {
      stageSpecific = `
        ${fidFormRow('沉睡原因', `<select class="fid-select" name="dormantReason" style="width:100%">${fidOption(['老客超复购期未下单', '发目录/报价后长期静默', '已读未回转低频培育'], '发目录/报价后长期静默')}</select>`)}
        ${fidFormRow('唤醒方向', `<input class="fid-input" style="width:100%" name="transitionNote" placeholder="如：下周发送新版资料或节日问候">`)}`;
    } else if (targetStage === '流失归档') {
      stageSpecific = `
        ${fidFormRow('流失主因', `<select class="fid-select" name="lostReason" style="width:100%" required>${LC_LOST_REASONS.map(r => option(r, r, c.lostReason || LC_LOST_REASONS[0])).join('')}</select>`, '', true)}
        ${fidFormRow('详细说明', `<input class="fid-input" style="width:100%" name="lostDetail" value="${esc(c.lostDetail || '')}" placeholder="记录具体异议或竞品情况，便于后续复盘" required>`, '', true)}
        ${fidFormRow('回流观察', `<select class="fid-select" name="watchDays" style="width:100%">${fidOption([['30', '30 天后提醒观察复盘（推荐暂缓型客户）'], ['14', '14 天后短期复盘'], ['0', '不设观察提醒（仅客户主动来信时唤醒）']], '30')}</select>`)}`;
    } else {
      stageSpecific = fidFormRow('阶段备注', `<input class="fid-input" style="width:100%" name="transitionNote" placeholder="选填：记录本次阶段调整说明">`);
    }

    const reactivateBanner = isReactivating
      ? `<div class="lc-card-block" style="margin-bottom:12px;background:var(--fid-mint-bg);border-color:color-mix(in srgb,var(--fid-mint) 35%,var(--fid-frame))">
           <strong style="color:var(--fid-mint);font-size:12px">${icon('RotateCcw')}闭环重激活回流：</strong>
           <small style="display:block;margin-top:3px;color:var(--fid-ink)">系统将保留该客户全部历史聊天、报价与订单档案，回流计数 +1，并重新纳入活跃跟进防漏保护。</small>
         </div>`
      : '';

    const followupBlock = targetStage === '流失归档'
      ? `<p class="fid-field-help">归入「流失归档」将自动结清该客户名下过期的日常待办，避免干扰每日活跃工作队列。</p>`
      : `<div class="lc-card-block" style="background:var(--color-surface-alt)">
           <label style="display:flex;align-items:center;gap:6px;font-weight:650;font-size:12px;margin-bottom:8px">
             <input type="checkbox" name="createNextTask" value="1" checked> 自动衔接本阶段下一步跟进待办（防断档）
           </label>
           <div class="lc-qual-grid">
             <label class="lc-field full"><span>跟进事项</span><input class="fid-input" name="nextTaskTitle" value="${esc(meta.defaultTask)}"></label>
             <label class="lc-field"><span>计划时间</span><input class="fid-input" type="datetime-local" name="nextTaskDue" value="${dueDefault}"></label>
             <label class="lc-field"><span>优先级</span><select class="fid-select" name="nextTaskPriority">${fidOption([['normal', '普通'], ['high', '重点优先']], targetStage === '报价推进' || isReactivating ? 'high' : 'normal')}</select></label>
           </div>
         </div>`;

    return `${reactivateBanner}
      <p class="fid-field-help" style="margin:0 0 12px">${icon('Info')} 阶段目标：${esc(meta.goal)}</p>
      ${stageSpecific}
      ${followupBlock}`;
  }

  function openLifecycleAdvance(id, explicitTarget = '') {
    const c = customer(id);
    if (!c || !myCustomers().includes(c)) return;
    const currentMeta = lcStageMeta(c.stage);
    const targetStage = explicitTarget && LC_STAGE_MAP.has(explicitTarget) ? explicitTarget : currentMeta.next;

    fidForm(
      LC_RECOVERY_STAGES.has(c.stage) && LC_ACTIVE_STAGES.has(targetStage) ? `重激活客户 · ${c.name}` : `推进客户生命周期 · ${c.name}`,
      'lc-transition',
      `<input type="hidden" name="customerId" value="${esc(c.id)}">
       <div class="lc-transition-banner">
         ${lcStageBadge(c.stage)}
         ${icon('ArrowRight')}
         <select class="fid-select" id="lc-target-stage" name="targetStage" aria-label="目标生命周期阶段" data-customer="${esc(c.id)}">
           ${LC_STAGES.map(s => option(s.id, `${s.code} · ${s.name}`, targetStage)).join('')}
         </select>
       </div>
       <div id="lc-transition-dynamic">${lcTransitionDynamicFields(c, targetStage)}</div>`,
      '确认变更并闭环保存',
      { wide: true }
    );
  }

  // ============================================================================
  // Upgraded Customer 360° Lifecycle Dossier Drawer
  // ============================================================================
  profileHTML = function(c) {
    const a = account(c.account);
    const m = member(c.owner);
    const h = lcHealth(c);
    const quotes = lcCustomerQuotes(c.id);
    const orders = lcCustomerOrders(c.id);
    const ltv = lcCustomerLtv(c.id);
    const openQuoteVal = lcOpenQuotesValue(c.id);
    const currentIdx = lcStageMeta(c.stage).index;
    const tab = lcState.dossierTab || 'overview';
    const dirtyNote = Object.hasOwn(ui.noteDrafts, c.id);

    const stepper = LC_STAGES.map((st, idx) => {
      const cls = st.id === c.stage ? 'current' : (idx < currentIdx && st.zone !== 'recovery' && !LC_RECOVERY_STAGES.has(c.stage) ? 'passed' : '');
      return `<button type="button" class="lc-stepper-btn ${cls}" data-action="lcAdvance" ${fidActionID(c.id)} data-target="${esc(st.id)}" title="切换到 ${esc(st.name)}">
        <span>${st.code}</span><small>${esc(st.short)}</small>
      </button>`;
    }).join('');

    let tabBody = '';
    if (tab === 'overview') {
      const nextCard = h.nextTask
        ? `<div class="lc-card-block ${h.overdue ? 'hot-block' : ''}">
             <div class="lc-block-head">
               <h3>${icon(h.overdue ? 'ClockAlert' : 'CalendarClock')}当前待办跟进 ${h.overdue ? '<span class="lc-pill hot">已逾期</span>' : ''}</h3>
               <div class="lc-deal-actions">
                 ${fidButton('完成并衔接下一步', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(h.nextTask.id))}
                 ${fidButton('新增待办', 'followup', 'Plus', 'slim', fidActionID(c.id))}
               </div>
             </div>
             <p style="font-size:13px;font-weight:650">${esc(h.nextTask.title)}</p>
             <small style="color:var(--color-text-muted)">计划时间：${esc(dateLabel(h.nextTask.due))} · 类型：${esc(h.nextTask.taskType || '需求跟进')}</small>
           </div>`
        : LC_ACTIVE_STAGES.has(c.stage)
          ? `<div class="lc-card-block warn-block">
               <div class="lc-block-head">
                 <h3>${icon('TriangleAlert')}漏跟进断档预警</h3>
                 ${fidButton('立即补排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">该客户处于活跃阶段「${esc(c.stage)}」，但尚未设置下一次跟进时间，极易造成意向流失。</p>
             </div>`
          : `<div class="lc-card-block">
               <div class="lc-block-head">
                 <h3>${icon('RotateCcw')}${c.stage === '流失归档' ? '流失归档与观察状态' : '沉睡唤醒状态'}</h3>
                 ${fidButton('一键重激活回流', 'lcAdvance', 'RotateCcw', 'slim blue', `${fidActionID(c.id)} data-target="需求澄明"`)}
               </div>
               <p style="font-size:12px;color:var(--fid-ink)">${c.stage === '流失归档' ? `归档原因：${esc(c.lostReason || '未记录')} — ${esc(c.lostDetail || '可随时重新激活')}` : '当前处于沉睡培育池，可发送关怀消息或等待客户复联后激活。'}</p>
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
    } else if (tab === 'deals') {
      const quoteItems = quotes.map(q => `
        <div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(q.quoteNo)} · ${lcMoney(q.amount)} <span class="lc-pill ${q.status === '待确认' ? 'info' : q.status === '已转单' ? 'ok' : 'neutral'}">${esc(q.status)}</span></strong>
            <small>${esc(q.summary)}${q.validUntil ? ` · 有效期至 ${esc(q.validUntil)}` : ''}</small>
            ${q.objectionNote ? `<small>备注：${esc(q.objectionNote)}</small>` : ''}
          </div>
          <div class="lc-deal-actions">
            ${q.status === '待确认' ? fidButton('转为成交订单', 'lcQuoteToOrder', 'CheckCircle2', 'slim blue', fidActionID(q.id)) : ''}
            ${q.status === '待确认' ? fidButton('发催单话术', 'lcChatDraft', 'SendHorizontal', 'slim', `${fidActionID(c.id)} data-draft-kind="quote"`) : ''}
            ${q.status === '待确认' ? fidButton('失效', 'lcQuoteExpire', 'X', 'slim', fidActionID(q.id)) : ''}
          </div>
        </div>`).join('');

      const orderItems = orders.map(o => {
        const nextShipLabel = o.fulfillmentStatus === '待发货' ? '标记已发货' : o.fulfillmentStatus === '运输中' ? '确认客户签收' : '';
        return `<div class="lc-deal-item">
          <div class="lc-deal-main">
            <strong>${esc(o.orderNo)} · ${lcMoney(o.amount)} <span class="lc-pill ${o.fulfillmentStatus === '已签收' ? 'ok' : 'info'}">${esc(o.orderType)} · ${esc(o.fulfillmentStatus)}</span></strong>
            <small>${esc(o.carrierNote || '暂无物流备注')} · 创建于 ${esc(fidDate(o.createdAt).slice(0, 10))}</small>
          </div>
          <div class="lc-deal-actions">
            ${nextShipLabel ? fidButton(nextShipLabel, 'lcOrderStep', 'Truck', 'slim blue', fidActionID(o.id)) : ''}
            ${fidButton('去聊天同步', 'lcChatDraft', 'MessageCircle', 'slim', `${fidActionID(c.id)} data-draft-kind="order"`)}
          </div>
        </div>`;
      }).join('');

      tabBody = `
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('FileSpreadsheet')}报价单记录 (${quotes.length})</h3>
            ${fidButton('新建报价单', 'lcQuoteOpen', 'Plus', 'slim tint', fidActionID(c.id))}
          </div>
          ${quoteItems ? `<div class="lc-deal-list">${quoteItems}</div>` : '<p class="muted" style="font-size:12px">暂无报价单。客户进入询价阶段时可登记报价金额并自动生成跟进提醒。</p>'}
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('PackageCheck')}成交订单与履约台账 (${orders.length})</h3>
            ${fidButton('登记成交订单', 'lcOrderOpen', 'Plus', 'slim blue', fidActionID(c.id))}
          </div>
          ${orderItems ? `<div class="lc-deal-list">${orderItems}</div>` : '<p class="muted" style="font-size:12px">暂无已成交订单。可从上方报价单一键转成交，或直接登记订单。</p>'}
        </div>
        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('Repeat')}老客复购节奏配置</h3>
            ${c.nextRepurchaseAt ? fidButton('发复购关怀话术', 'lcChatDraft', 'SendHorizontal', 'slim tint', `${fidActionID(c.id)} data-draft-kind="repurchase"`) : ''}
          </div>
          <div class="info-row"><span>预计复购补货周期</span><span>每 <strong>${c.repurchaseCycleDays || 30}</strong> 天</span></div>
          <div class="info-row"><span>下次预计复购窗口</span><span>${c.nextRepurchaseAt ? esc(fidDate(c.nextRepurchaseAt).slice(0, 10)) + `（${lcDaysUntil(c.nextRepurchaseAt) < 0 ? '已超期 ' + Math.abs(lcDaysUntil(c.nextRepurchaseAt)) + ' 天' : lcDaysUntil(c.nextRepurchaseAt) + ' 天后'}）` : '首单签收后自动开启复购窗口'}</span></div>
        </div>`;
    } else if (tab === 'timeline') {
      const raw = data.activities[c.id] || [];
      const catLabels = { all: '全部轨迹', stage: '阶段跃迁', deal: '报价成交', followup: '跟进动作', profile: '资料与标签' };
      const filtered = raw.filter(item => {
        if (lcState.timelineFilter === 'all') return true;
        const cat = item.category || (item.text.includes('阶段') ? 'stage' : item.text.includes('订单') || item.text.includes('报价') ? 'deal' : item.text.includes('跟进') ? 'followup' : 'profile');
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

    return `<aside class="lc-dossier customer-profile in-drawer" aria-label="${esc(c.name)}的360度全周期档案">
      <div class="lc-dossier-head">
        <div class="lc-dossier-topbar">
          <span class="lc-dossier-eyebrow">${icon('Layers')}SCRM 客户 360° 全生命档案</span>
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
            ${fidButton('推进阶段', 'lcAdvance', 'ArrowRight', 'tint slim', fidActionID(c.id))}
            ${fidButton('打开会话', 'openConversation', 'MessageCircle', 'blue slim', fidActionID(c.id))}
          </div>
        </div>
        <div class="lc-stepper" role="group" aria-label="生命周期阶段进度">${stepper}</div>
      </div>
      <div class="lc-dossier-kpis">
        <div class="lc-mini-kpi"><span>当前防漏状态</span><strong style="font-size:12px">${esc(h.primary.label)}</strong></div>
        <div class="lc-mini-kpi"><span>累计成交 LTV</span><strong>${lcMoney(ltv)} <small style="font-weight:400;color:var(--color-text-muted)">(${orders.length}单)</small></strong></div>
        <div class="lc-mini-kpi"><span>在途待确认报价</span><strong>${lcMoney(openQuoteVal)}</strong></div>
        <div class="lc-mini-kpi"><span>本阶段停留</span><strong>${lcDwellDays(c)} 天</strong></div>
      </div>
      <div class="lc-dossier-tabs" role="tablist" aria-label="客户档案分栏">
        ${[
          ['overview', '画像与跟进', ''],
          ['deals', '报价与订单', quotes.length + orders.length],
          ['timeline', '生命周期轨迹', (data.activities[c.id] || []).length],
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
  // Page 2: #deals (成交履约与复购唤醒闭环中心)
  // ============================================================================
  function renderDeals() {
    const visibleIds = new Set(myCustomers().map(c => c.id));
    const quotes = (data.quotes || []).filter(q => visibleIds.has(q.customerId));
    const orders = (data.orders || []).filter(o => visibleIds.has(o.customerId));
    const openQuotes = quotes.filter(q => q.status === '待确认');
    const inTransit = orders.filter(o => o.fulfillmentStatus !== '已签收');
    const totalLtv = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const retentionPool = myCustomers().filter(c => ['复购培育', '沉睡唤醒', '流失归档'].includes(c.stage));
    const q = lcState.dealsQuery.trim().toLowerCase();

    let tableCard = '';
    if (lcState.dealsTab === 'quotes') {
      const list = quotes.filter(item => {
        const c = customer(item.customerId);
        return !q || [item.quoteNo, item.summary, item.objectionNote, c?.name, c?.phone].filter(Boolean).join(' ').toLowerCase().includes(q);
      });
      const rows = list.map(item => {
        const c = customer(item.customerId);
        const h = c ? lcHealth(c) : null;
        return `<tr>
          <td><strong>${esc(item.quoteNo)}</strong><span class="fid-cell-detail">${esc(fidDate(item.createdAt).slice(0, 10))}</span></td>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c?.id || '')} data-tab="deals"><strong>${esc(c?.name || '—')}</strong></button><span class="fid-cell-detail">${esc(c?.phone || '')}</span></td>
          <td><strong>${lcMoney(item.amount)}</strong></td>
          <td style="text-align:left">${esc(item.summary)}<span class="fid-cell-detail">${esc(item.objectionNote || '暂无异议记录')}</span></td>
          <td><span class="lc-pill ${item.status === '待确认' ? 'info' : item.status === '已转单' ? 'ok' : 'neutral'}">${esc(item.status)}</span><span class="fid-cell-detail">有效期至 ${esc(item.validUntil || '—')}</span></td>
          <td style="text-align:left">${h?.nextTask ? esc(dateLabel(h.nextTask.due) + ' · ' + h.nextTask.title) : '<span class="lc-pill warn">未设催单待办</span>'}</td>
          <td><div class="fid-icon-actions">
            ${item.status === '待确认' ? fidButton('转成交单', 'lcQuoteToOrder', 'CheckCircle2', 'slim blue', fidActionID(item.id)) : ''}
            ${c ? fidButton('去催单', 'lcChatDraft', 'MessageCircle', 'slim', `${fidActionID(c.id)} data-draft-kind="quote"`) : ''}
          </div></td>
        </tr>`;
      }).join('');
      tableCard = `<div class="fid-table-card">${fidTable('lc-deals-table', ['报价单号', '客户', '报价金额', '方案摘要与顾虑', '状态 / 有效期', '下一步催单计划', '闭环操作'], rows, '暂无报价单记录', true, 'FileSpreadsheet')}</div>`;
    } else if (lcState.dealsTab === 'orders') {
      const list = orders.filter(item => {
        const c = customer(item.customerId);
        return !q || [item.orderNo, item.carrierNote, item.orderType, c?.name, c?.phone].filter(Boolean).join(' ').toLowerCase().includes(q);
      });
      const rows = list.map(item => {
        const c = customer(item.customerId);
        const stepLabel = item.fulfillmentStatus === '待发货' ? '标记发货' : item.fulfillmentStatus === '运输中' ? '确认签收转复购' : '';
        return `<tr>
          <td><strong>${esc(item.orderNo)}</strong><span class="fid-cell-detail">${esc(fidDate(item.createdAt).slice(0, 10))}</span></td>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c?.id || '')} data-tab="deals"><strong>${esc(c?.name || '—')}</strong></button><span class="fid-cell-detail">${esc(account(item.accountId)?.name || '')}</span></td>
          <td><strong>${lcMoney(item.amount)}</strong><span class="fid-cell-detail">${esc(item.paymentStatus)}</span></td>
          <td><span class="lc-pill ${item.orderType === '复购' ? 'ok' : 'info'}">${esc(item.orderType)}</span></td>
          <td><span class="lc-pill ${item.fulfillmentStatus === '已签收' ? 'ok' : 'warn'}">${esc(item.fulfillmentStatus)}</span></td>
          <td style="text-align:left">${esc(item.carrierNote || '—')}${item.deliveredAt ? `<span class="fid-cell-detail">签收于 ${esc(fidDate(item.deliveredAt).slice(0, 10))}</span>` : ''}</td>
          <td><div class="fid-icon-actions">
            ${stepLabel ? fidButton(stepLabel, 'lcOrderStep', 'Truck', 'slim blue', fidActionID(item.id)) : ''}
            ${c ? fidButton('同步物流', 'lcChatDraft', 'SendHorizontal', 'slim', `${fidActionID(c.id)} data-draft-kind="order"`) : ''}
          </div></td>
        </tr>`;
      }).join('');
      tableCard = `<div class="fid-table-card">${fidTable('lc-orders-table', ['订单编号', '客户 / 接待号', '成交金额', '首单/复购', '履约状态', '物流与交付说明', '履约闭环操作'], rows, '暂无订单记录', true, 'PackageCheck')}</div>`;
    } else {
      const list = retentionPool.filter(c => !q || [c.name, c.phone, c.lostReason, c.notes].filter(Boolean).join(' ').toLowerCase().includes(q));
      const rows = list.map(c => {
        const ltv = lcCustomerLtv(c.id);
        const ordCount = lcCustomerOrders(c.id).length;
        const repDays = lcDaysUntil(c.nextRepurchaseAt);
        const h = lcHealth(c);
        const windowDesc = c.stage === '流失归档'
          ? `流失原因：${c.lostReason || '未填'}${c.reactivateWatchAt ? ' · 观察日 ' + fidDate(c.reactivateWatchAt).slice(0, 10) : ''}`
          : c.nextRepurchaseAt
            ? `${fidDate(c.nextRepurchaseAt).slice(0, 10)}（${repDays < 0 ? '超期 ' + Math.abs(repDays) + ' 天' : repDays === 0 ? '今日到期' : '剩 ' + repDays + ' 天'}）`
            : `周期 ${c.repurchaseCycleDays || 30} 天`;
        return `<tr>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)} · ${esc(c.language)}</span></td>
          <td>${lcStageBadge(c.stage, c.id)}</td>
          <td><strong>${lcMoney(ltv)}</strong><span class="fid-cell-detail">已购 ${ordCount} 单</span></td>
          <td style="text-align:left">${esc(windowDesc)}</td>
          <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span></td>
          <td><div class="fid-icon-actions">
            ${c.stage === '复购培育'
              ? fidButton('复购触达', 'lcChatDraft', 'Repeat', 'slim blue', `${fidActionID(c.id)} data-draft-kind="repurchase"`)
              : fidButton('重激活回流', 'lcAdvance', 'RotateCcw', h.inboundReactivate ? 'slim blue' : 'slim tint', `${fidActionID(c.id)} data-target="需求澄明"`)}
            ${LC_RECOVERY_STAGES.has(c.stage) ? fidButton('模拟客户复联', 'lcSimReply', 'MessageSquareReply', 'slim', fidActionID(c.id)) : fidButton('排期跟进', 'followup', 'CalendarPlus', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      tableCard = `<div class="fid-table-card">${fidTable('lc-retention-table', ['客户信息', '当前所处阶段', '历史贡献 LTV', '复购窗口 / 归档说明', '信号状态', '唤醒与复购动作'], rows, '暂无复购或待唤醒客户', true, 'Repeat')}</div>`;
    }

    return `<section class="lc-page" aria-labelledby="deals-page-title">
      <div class="lc-wrap">
        <header class="lc-hero">
          <div class="lc-hero-title">
            <h1 id="deals-page-title">${icon('Receipt')}报价转化、订单履约与复购中心</h1>
            <p>打通「发出报价 → 拍板成单 → 物流签收 → 复购窗口提醒 → 沉睡唤醒/流失重激活」的交易价值后半程闭环。</p>
          </div>
          <div class="lc-hero-actions">
            ${fidButton('新建报价单', 'lcQuoteOpen', 'FileSpreadsheet', 'tint')}
            ${fidButton('登记成交订单', 'lcOrderOpen', 'Plus', 'gradient')}
          </div>
        </header>

        <div class="lc-kpis-4">
          <div class="lc-kpi-card"><span>${icon('FileSpreadsheet')}在途待确认报价</span><strong>${lcMoney(openQuotes.reduce((s, x) => s + Number(x.amount || 0), 0))}</strong><small>${openQuotes.length} 笔报价正在跟进推进</small></div>
          <div class="lc-kpi-card"><span>${icon('DollarSign')}累计已成交总额 (LTV)</span><strong>${lcMoney(totalLtv)}</strong><small>共 ${orders.length} 笔订单（复购 ${orders.filter(o => o.orderType === '复购').length} 笔）</small></div>
          <div class="lc-kpi-card"><span>${icon('Truck')}履约交付中订单</span><strong>${inTransit.length}</strong><small>签收确认后自动开启老客复购倒计时</small></div>
          <div class="lc-kpi-card"><span>${icon('Repeat')}复购培育与唤醒池</span><strong>${retentionPool.length}</strong><small>${retentionPool.filter(c => lcHealth(c).repurchaseSoon).length} 位临近复购窗口 · ${retentionPool.filter(c => LC_RECOVERY_STAGES.has(c.stage)).length} 位可唤醒</small></div>
        </div>

        <div class="lc-radar-bar">
          <div class="lc-subtabs" role="tablist">
            <button type="button" class="lc-subtab" data-action="lcDealsTab" data-id="quotes" aria-pressed="${lcState.dealsTab === 'quotes'}">${icon('FileSpreadsheet')}在途与历史报价<b>${quotes.length}</b></button>
            <button type="button" class="lc-subtab" data-action="lcDealsTab" data-id="orders" aria-pressed="${lcState.dealsTab === 'orders'}">${icon('PackageCheck')}订单与发货签收<b>${orders.length}</b></button>
            <button type="button" class="lc-subtab" data-action="lcDealsTab" data-id="retention" aria-pressed="${lcState.dealsTab === 'retention'}">${icon('Repeat')}复购窗口与流失唤醒池<b>${retentionPool.length}</b></button>
          </div>
          <div class="lc-radar-controls">
            <input class="fid-input" id="lc-deals-search" aria-label="搜索报价或订单" placeholder="搜索单号、客户、备注…" value="${esc(lcState.dealsQuery)}">
          </div>
        </div>

        ${tableCard}
      </div>
    </section>`;
  }

  // ============================================================================
  // Page 3: Upgraded #followups (跟进待办队列 + 断档扫描 + 历史操作审计记录)
  // ============================================================================
  renderFollowups = function() {
    const allTasks = myTasks();
    const pending = allTasks.filter(t => !t.done);
    const overdue = pending.filter(t => beforeToday(t.due));
    const today = pending.filter(t => sameDay(t.due));
    const done = allTasks.filter(t => t.done);
    const gapCustomers = myCustomers().filter(c => lcHealth(c).noPlan);

    const headerTabs = `<div class="lc-radar-bar" style="margin-bottom:14px">
      <div class="lc-subtabs" role="tablist" aria-label="跟进管理视图">
        <button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="todo" aria-pressed="${lcState.followTab === 'todo'}">${icon('ClipboardList')}跟进待办队列<b>${pending.length}</b></button>
        <button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="gaps" aria-pressed="${lcState.followTab === 'gaps'}">${icon('TriangleAlert')}漏跟进断档检测<b>${gapCustomers.length}</b></button>
        <button type="button" class="lc-subtab" data-action="lcFollowTab" data-id="history" aria-pressed="${lcState.followTab === 'history'}">${icon('History')}跟进与操作审计日志<b>${fidLogs().length}</b></button>
      </div>
      <div class="lc-radar-controls">
        ${fidButton('新建跟进任务', 'newTask', 'Plus', 'blue')}
      </div>
    </div>`;

    if (lcState.followTab === 'gaps') {
      const gapRows = gapCustomers.map(c => {
        const a = account(c.account);
        return `<tr>
          <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.phone)}</span></td>
          <td>${lcStageBadge(c.stage, c.id)}</td>
          <td>${esc(a?.name || '—')}</td>
          <td style="text-align:left">${esc(c.preview || c.notes || '—')}<span class="fid-cell-detail">最后活跃：${esc(c.last || '—')}</span></td>
          <td><span class="lc-pill warn">${icon('TriangleAlert')}活跃阶段无后续待办</span></td>
          <td><div class="fid-icon-actions">
            ${fidButton('立即补排跟进', 'followup', 'CalendarPlus', 'slim blue', fidActionID(c.id))}
            ${fidButton('去聊天', 'openConversation', 'MessageCircle', 'slim', fidActionID(c.id))}
          </div></td>
        </tr>`;
      }).join('');
      return `<section class="fid-page"><div class="lc-wrap">
        ${fidHead('跟进与防漏中心', '实时扫描处于活跃生命周期（S1–S5）却未安排下一步计划的断档客户，杜绝私域漏跟进。')}
        ${headerTabs}
        <div class="fid-table-card">${fidTable('lc-gaps-table', ['客户', '当前阶段', '接待 WhatsApp 号', '最近沟通上下文', '风险诊断', '补救操作'], gapRows, '太棒了！当前所有活跃阶段客户均已安排下一步跟进计划。', true, 'BadgeCheck')}</div>
      </div></section>`;
    }

    if (lcState.followTab === 'history') {
      const f = fid.logFilter;
      const rows = fidLogs();
      const body = paged(rows, 'followups').map(({ c, entry, at, kind }) => {
        const label = entry.category === 'stage' ? '阶段跃迁' : entry.category === 'deal' ? '报价与订单' : entry.category === 'inbound' ? '客户来信' : kind;
        return `<tr><td>${esc(fidInvite(account(c.account)))}</td><td>${esc(entry.by)}</td><td><span class="lc-pill neutral">${esc(label)}</span></td><td>${esc(account(c.account)?.name || '—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td style="text-align:left">${esc(entry.text)}</td></tr>`;
      }).join('');
      return `<section class="fid-page"><div class="lc-wrap">
        ${fidHead('跟进与防漏中心', '完整留存每一次跟进完成结果、阶段流转、报价成单与资料修改记录。')}
        ${headerTabs}
        <div class="fid-panel fid-log">
          <form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all', '请选择APP'], ['wa', 'WhatsApp']], f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['invite', '邀请码'], ['customer', '线索账号'], ['text', '内容'], ['actor', '操作人']], f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选', 'fidLogReset', 'RotateCw')}</form>
          <div style="margin-top:14px">${fidTable('fid-log-table', ['邀请码', '操作人', '操作类型', '主账号', '线索账号信息', '线索账号', '创建日期', '内容'], body)}${fidPager(rows.length, 'followups')}</div>
        </div>
      </div></section>`;
    }

    // Default: 'todo' actionable queue
    const filterKey = ui.taskFilter || 'pending';
    const list = (filterKey === 'done' ? done : filterKey === 'overdue' ? overdue : filterKey === 'today' ? today : pending)
      .slice().sort((a, b) => new Date(a.due) - new Date(b.due));
    const taskRows = paged(list, 'followups').map(t => {
      const c = customer(t.customer);
      if (!c) return '';
      const isOverdue = !t.done && beforeToday(t.due);
      return `<tr>
        <td style="text-align:left"><button type="button" class="fid-link" data-action="profile" ${fidActionID(c.id)}><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(account(c.account)?.name || '')} · ${esc(c.language)}</span></td>
        <td>${lcStageBadge(c.stage, c.id)}</td>
        <td><span class="lc-pill info">${esc(t.taskType || '需求跟进')}</span></td>
        <td style="text-align:left"><span class="task-title ${t.done ? 'completed' : ''}"><strong>${esc(t.title)}</strong></span>${t.outcome ? `<span class="fid-cell-detail">结果：${esc(t.outcome)}</span>` : ''}</td>
        <td><span class="${isOverdue ? 'overdue' : ''}" style="font-weight:${isOverdue ? '700' : '400'}">${esc(dateLabel(t.due))}${isOverdue ? ' · 已逾期' : ''}</span></td>
        <td>${t.priority === 'high' ? '<span class="priority-badge">重点</span>' : '普通'}</td>
        <td><div class="fid-icon-actions">
          ${t.done
            ? fidButton('重开', 'taskDone', 'RotateCcw', 'slim', fidActionID(t.id))
            : fidButton('完成并衔接下一步', 'taskDone', 'CheckCircle2', 'slim blue', fidActionID(t.id))}
          ${fidIcon('打开会话', 'openConversation', 'MessageCircle', c.id)}
          ${fidIcon('360° 档案', 'profile', 'ContactRound', c.id)}
        </div></td>
      </tr>`;
    }).join('');

    return `<section class="fid-page"><div class="lc-wrap">
      ${fidHead('跟进与防漏中心', '完成跟进时同步记录沟通结果并排定下一次触达，确保客户在全生命周期内不断线。')}
      ${headerTabs}
      <div class="fid-panel">
        <div class="lc-radar-chips" style="margin-bottom:14px">
          ${[
            ['pending', '全部待处理', pending.length, ''],
            ['overdue', '已逾期必处理', overdue.length, overdue.length ? 'is-hot' : ''],
            ['today', '今日到期', today.length, ''],
            ['done', '已完成归档', done.length, ''],
          ].map(([id, label, n, cls]) =>
            `<button type="button" class="lc-radar-chip ${cls}" data-action="taskFilter" ${fidActionID(id)} aria-pressed="${filterKey === id}">${esc(label)}<b>${n}</b></button>`
          ).join('')}
        </div>
        ${fidTable('lc-todo-table', ['客户 / 接待号', '当前生命周期', '任务类型', '跟进事项与结果', '计划跟进时间', '优先级', '闭环操作'], taskRows, '当前筛选下没有跟进任务', true, 'CalendarCheck')}
        ${fidPager(list.length, 'followups')}
      </div>
    </div></section>`;
  };

  // ============================================================================
  // Page 4: Upgraded #customers (原站筛选兼容 + 生命周期阶段与防漏健康度穿透)
  // ============================================================================
  const lcOrigFilteredCustomers = filteredCustomers;
  filteredCustomers = function() {
    return lcOrigFilteredCustomers().filter(c => {
      if (lcState.customerHealthFilter === 'all') return true;
      const h = lcHealth(c);
      if (lcState.customerHealthFilter === 'overdue') return h.overdue;
      if (lcState.customerHealthFilter === 'noplan') return h.noPlan;
      if (lcState.customerHealthFilter === 'quote') return h.quoteOpen;
      if (lcState.customerHealthFilter === 'repurchase') return h.repurchaseSoon;
      return true;
    });
  };

  customerRows = function() {
    const rows = paged(filteredCustomers(), 'customers');
    const tags = myTags();
    return rows.map((c, i) => {
      const a = account(c.account);
      const h = lcHealth(c);
      const ltv = lcCustomerLtv(c.id);
      const oq = lcOpenQuotesValue(c.id);
      const assigned = tags.filter(t => c.tags.includes(t.id));
      const first = assigned[0];
      const tagPreview = first ? `<span class="tag ${esc(first.color)}">${esc(first.name)}</span>` : '<span>0 个</span>';
      const tagDetail = assigned.length > 1 ? `<small>+${assigned.length - 1}</small>` : icon('ChevronRight');
      const valueText = ltv > 0 ? `LTV ${lcMoney(ltv)}` : oq > 0 ? `报价 ${lcMoney(oq)}` : (c.intentLevel || '—');
      return `<tr>
        <td><input type="checkbox" data-select-customer="${esc(c.id)}" aria-label="选择${esc(c.name)}" ${ui.selected.has(c.id) ? 'checked' : ''}></td>
        <td>${rowNumber('customers', i)}</td>
        <td>${esc(a?.name || '—')}<span class="fid-cell-detail">${esc(member(c.owner)?.name || '未分配')}</span></td>
        <td><button class="fid-link fid-note-link" data-action="profileNote" ${fidActionID(c.id)} title="${esc(c.notes || '')}" aria-label="查看${esc(c.name)}备注"><span class="fid-cell-note">${esc(c.qualification?.demand || c.notes || '—')}</span></button></td>
        <td><button class="fid-link" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}资料"><strong>${esc(c.name)}</strong></button><span class="fid-cell-detail">${esc(c.source)}</span></td>
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td>
        <td>${esc(c.phone)}<span class="fid-cell-detail">${esc(country(c))} · ${esc(c.language)}</span></td>
        <td>${lcStageBadge(c.stage, c.id)}<span class="fid-cell-detail">${esc(valueText)}</span></td>
        <td><span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span><span class="fid-cell-detail">${h.nextTask ? esc(dateLabel(h.nextTask.due)) : '无待办'}</span></td>
        <td>${esc(fidDate(c.createdAt))}</td>
        <td>${esc(fidDate(c.updatedAt))}</td>
        <td><div class="fid-icon-actions">${fidIcon('打开' + c.name + '会话', 'openConversation', 'MessageCircle', c.id)}${fidIcon('360° 客户档案：' + c.name, 'profile', 'ContactRound', c.id)}${fidIcon('推进阶段：' + c.name, 'lcAdvance', 'GitBranch', c.id)}</div></td>
      </tr>`;
    }).join('');
  };

  renderCustomers = function() {
    const list = filteredCustomers();
    const marked = fid.customerTags.map(tag).filter(Boolean);
    const selected = ui.selected.size;
    const filters = `<form class="fid-customer-filter fid-rounded" id="fid-customer-search-form">
      <div class="fid-customer-platform"><span>平台:</span>${fidButton(fid.customerPlatform ? '全选(1)' : '全选(0)', 'fidCustomerPlatform', 'Check', 'fid-platform', `aria-pressed="${fid.customerPlatform}"`)}<span class="sr-only">WhatsApp</span></div>
      <div class="fid-filter-row fid-customer-fields">
        <input class="fid-input" id="fid-customer-start" aria-label="开始时间" placeholder="开始时间" value="${esc(fid.customerStart)}" data-fid-date><span> - </span>
        <input class="fid-input" id="fid-customer-end" aria-label="截止时间" placeholder="截止时间" value="${esc(fid.customerEnd)}" data-fid-date>
        <select class="fid-select" id="fid-customer-field" aria-label="客户查询字段">${fidOption([['name', '联系人'], ['phone', '手机号'], ['account', '主账号'], ['note', '备注'], ['source', '来源']], fid.customerField)}</select>
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-stage-select" aria-label="生命周期阶段">${fidOption([['all', '全部生命周期'], ...LC_STAGES.map(s => [s.id, `${s.code} · ${s.name}`])], ui.customerStage)}</select>
        <select class="fid-select" id="fid-customer-health-select" aria-label="防漏状态">${fidOption([['all', '全部跟进状态'], ['overdue', '跟进已逾期'], ['noplan', '跟进断档(无待办)'], ['quote', '报价待确认'], ['repurchase', '复购窗口临近']], lcState.customerHealthFilter)}</select>
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all', '请选择国家'], ['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], fid.customerCountry)}</select>
        <select class="fid-select" id="fid-customer-type" aria-label="客户类型">${fidOption([['all', '请选择客户类型'], '新增线索-实时', '新增线索-补录', '重复线索'], fid.customerType)}</select>
      </div>
      <div class="fid-actions fid-filter-submit"><button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置', 'fidCustomerReset', 'RotateCw')}</div>
      <div class="fid-actions fid-tag-filter"><span>标签查询</span><span class="fid-small-note" aria-live="polite">${marked.length ? marked.map(t => esc(t.name)).join('、') : '未选'}</span>${fidButton('选择标签', 'fidCustomerChooseTags', 'Tag')}${fidButton('重置标签', 'fidCustomerClearFilter', 'X')}</div>
    </form>`;
    const toolbar = `<div class="fid-actions fid-list-toolbar">${fidButton('全周期看板', '', 'Kanban', 'tint', 'data-nav="lifecycle"')}${fidButton('批量打标签', 'batchTags', 'Tag', 'gradient', selected ? '' : 'disabled')}${fidButton('清空标签', 'fidClearCustomerTags', 'Eraser', '', selected ? '' : 'disabled')}${fidButton('跟进与防漏', '', 'ClipboardList', 'green', 'data-nav="followups"')}${fidButton('导出列表', 'fidExportCustomers', 'FileDown')}${fidButton('新增客户', 'addCustomer', 'Plus', 'slim')}<span class="fid-small-note">点击阶段胶囊可直接推进生命周期</span></div>`;
    const header = ['<input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户">', '序号', '主账号信息', '需求画像 / 备注', '联系人 / 来源', '标签', '手机号 / 地区', '生命周期 / 价值', '防漏状态 / 下次跟进', '添加时间', '更新时间', '操作 ' + icon('Settings2')];
    const table = fidTable('fid-customer-table', header, customerRows(), '暂无匹配客户', true).replace('<tbody>', '<tbody id="customer-rows">');
    return `<section class="fid-page"><h1 class="sr-only">客户列表</h1>${filters}${toolbar}<div class="fid-batchbar" id="batchbar" hidden><span id="selected-count">${selected}</span></div><div class="fid-table-card">${table}${fidPager(list.length, 'customers', [10, 20, 50])}</div></section>`;
  };

  fidForms['fid-customer-search-form'] = () => {
    Object.assign(fid, {
      customerField: $('#fid-customer-field').value,
      customerCountry: $('#fid-customer-country').value,
      customerType: $('#fid-customer-type').value,
      customerStart: $('#fid-customer-start').value,
      customerEnd: $('#fid-customer-end').value,
    });
    ui.customerStage = $('#fid-customer-stage-select')?.value || 'all';
    lcState.customerHealthFilter = $('#fid-customer-health-select')?.value || 'all';
    ui.customerQuery = $('#customer-search').value;
    ui.customerTag = 'all';
    ui.selected.clear();
    ui.pages.customers = 0;
    render();
  };

  const lcOrigResetCustomerFilters = fidActions.fidCustomerReset;
  fidActions.fidCustomerReset = () => {
    lcState.customerHealthFilter = 'all';
    lcOrigResetCustomerFilters();
  };

  // ============================================================================
  // Page 5: Upgraded #dashboard (经营概览 + 7阶段全周期闭环轨道)
  // ============================================================================
  const lcBaseRenderDashboard = renderDashboard;
  renderDashboard = function() {
    const html = lcBaseRenderDashboard();
    const customers = myCustomers();
    const openQuoteTotal = customers.reduce((s, c) => s + lcOpenQuotesValue(c.id), 0);
    const totalLtv = customers.reduce((s, c) => s + lcCustomerLtv(c.id), 0);
    const overdueCount = customers.filter(c => lcHealth(c).overdue).length;
    const gapCount = customers.filter(c => lcHealth(c).noPlan).length;
    const repCount = customers.filter(c => lcHealth(c).repurchaseSoon).length;
    const reactivateCount = customers.filter(c => lcHealth(c).inboundReactivate).length;

    const nodes = LC_STAGES.map(st => {
      const count = customers.filter(c => c.stage === st.id).length;
      return `<button type="button" class="dash-lc-node" data-action="lcJumpStage" ${fidActionID(st.id)}>
        <span>${esc(st.code)} · ${esc(st.name)}</span>
        <strong>${count}</strong>
        <small>${st.zone === 'funnel' ? '转化推进' : st.zone === 'value' ? '存量价值' : '唤醒回流'}</small>
      </button>`;
    }).join('');

    const lcPanel = `<section class="dash-lc-panel" aria-label="客户全生命周期总览">
      <div class="dash-lc-head">
        <h2>${icon('Kanban')}客户全生命周期闭环漏斗</h2>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--color-text-muted)">在途报价：<b>${lcMoney(openQuoteTotal)}</b> · 累计成交 LTV：<b>${lcMoney(totalLtv)}</b></span>
          <a class="dash-link" href="#lifecycle" data-nav="lifecycle">进入全周期看板${icon('ChevronRight')}</a>
        </div>
      </div>
      <div class="dash-lc-track">${nodes}</div>
      <div class="dash-lc-alerts">
        <span style="font-size:12px;color:var(--color-text-muted);font-weight:600">防漏雷达快达：</span>
        <button type="button" class="lc-radar-chip ${overdueCount ? 'is-hot' : ''}" data-action="lcJumpRadar" data-id="overdue">${icon('ClockAlert')}逾期未跟进 <b>${overdueCount}</b></button>
        <button type="button" class="lc-radar-chip ${gapCount ? 'is-alert' : ''}" data-action="lcJumpRadar" data-id="noplan">${icon('TriangleAlert')}跟进断档 <b>${gapCount}</b></button>
        <button type="button" class="lc-radar-chip" data-action="lcJumpRadar" data-id="quote">${icon('FileSpreadsheet')}在途报价催单 <b>${customers.filter(c => lcHealth(c).quoteOpen).length}</b></button>
        <button type="button" class="lc-radar-chip" data-action="lcJumpRadar" data-id="repurchase">${icon('Repeat')}复购窗口临近 <b>${repCount}</b></button>
        ${reactivateCount ? `<button type="button" class="lc-radar-chip is-hot" data-action="lcJumpRadar" data-id="reactivate">${icon('Flame')}老客来信待激活 <b>${reactivateCount}</b></button>` : ''}
      </div>
    </section>`;

    return html.replace('<div class="dash-grid">', lcPanel + '<div class="dash-grid">');
  };

  // ============================================================================
  // Page 6: Upgraded #inbox (WhatsApp 在线聊天与全生命周期实时联动)
  // ============================================================================
  conversationRows = function() {
    return filteredConversations().map(c => {
      const a = account(c.account);
      const h = lcHealth(c);
      const selected = fid.chatOpen && c.id === ui.customer ? 'selected' : '';
      return `<button type="button" class="conversation ${selected}" aria-label="打开${esc(c.name)}的会话" data-action="openConversation" data-id="${esc(c.id)}">
        ${avatar(c)}
        <span class="conversation-main">
          <span class="conversation-line"><strong>${esc(c.name)}</strong><time>${esc(c.last)}</time></span>
          <span class="conversation-preview"><span>${esc(c.preview)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span>
          <span class="conversation-account">
            <span><span class="state-dot ${a?.state === 'online' ? '' : a?.state === 'pending' ? 'offline' : 'warning'}"></span>${esc(ui.account === 'all' ? a?.name : c.language)}</span>
            <span class="mini-stage" title="生命周期阶段：${esc(c.stage)}">${esc(c.stage)}${h.overdue || h.noPlan || h.inboundReactivate ? ' · !' : ''}</span>
          </span>
        </span>
      </button>`;
    }).join('') || empty('没有匹配会话', '切换筛选，或清空搜索后再试。');
  };

  const lcPrevChatHTML = chatHTML;
  chatHTML = function(c) {
    let html = lcPrevChatHTML(c);
    const h = lcHealth(c);
    const ltv = lcCustomerLtv(c.id);
    const oq = lcOpenQuotesValue(c.id);
    const strip = `<div class="lc-chat-strip" aria-label="客户全周期协同栏">
      ${lcStageBadge(c.stage, c.id)}
      <span class="lc-pill ${h.primary.tone}">${icon(h.primary.icon)}${esc(h.primary.label)}</span>
      ${oq > 0 ? `<button type="button" class="lc-pill info" style="border:0" data-action="profile" ${fidActionID(c.id)} data-tab="deals">${icon('FileSpreadsheet')}在途报价 ${lcMoney(oq)}</button>` : ''}
      ${ltv > 0 ? `<button type="button" class="lc-pill ok" style="border:0" data-action="profile" ${fidActionID(c.id)} data-tab="deals">${icon('DollarSign')}累计成交 ${lcMoney(ltv)}</button>` : ''}
      <div class="lc-chat-strip-right">
        ${LC_RECOVERY_STAGES.has(c.stage)
          ? fidButton('一键重激活', 'lcAdvance', 'RotateCcw', 'slim blue', `${fidActionID(c.id)} data-target="需求澄明"`)
          : fidButton('推进阶段', 'lcAdvance', 'ArrowRight', 'slim tint', fidActionID(c.id))}
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
      ${t('客户 360° 全周期档案', 'profile', 'ContactRound', true)}
      ${t('推进生命周期阶段', 'lcAdvance', 'GitBranch', true)}
      ${t('报价与成交订单', 'profile', 'Receipt', true, 'data-tab="deals"')}
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
  // Modals: Follow-up Scheduling, Closed-Loop Task Completion, Quotes, Orders & Sim
  // ============================================================================
  openFollowup = function(id = null) {
    const list = myCustomers();
    const c = id ? customer(id) : selectedCustomer();
    if (!list.length) return toast('请先新增客户。');
    const meta = c ? lcStageMeta(c.stage) : LC_STAGES[0];
    fidForm(
      '安排客户下一步跟进',
      'lc-followup',
      `${fidFormRow('目标客户', `<select class="fid-select" style="width:100%" name="customer">${list.map(x => option(x.id, `${x.name}（${x.stage} · ${account(x.account)?.name || ''}）`, c?.id)).join('')}</select>`, '', true)}
       ${fidFormRow('任务类型', `<select class="fid-select" style="width:100%" name="taskType">${LC_TASK_TYPES.map(k => option(k, k, meta.id === '报价推进' ? '报价催单' : meta.id === '复购培育' ? '复购关怀' : '需求跟进')).join('')}</select>`)}
       ${fidFormRow('跟进事项', `<input class="fid-input" style="width:100%" name="title" required maxlength="100" value="${esc(meta.defaultTask)}" placeholder="写清本次跟进要达成的具体目标">`, '', true)}
       ${fidFormRow('提醒时间', `<input class="fid-input" style="width:100%" type="datetime-local" id="lc-due-input" name="due" required value="${inputDate(new Date(Date.now() + meta.defaultHours * 3600000).toISOString())}">
         <div class="lc-quick-dates">
           <button type="button" data-action="lcQuickDue" data-id="2">2小时后</button>
           <button type="button" data-action="lcQuickDue" data-id="24">明天此时</button>
           <button type="button" data-action="lcQuickDue" data-id="72">3天后</button>
           <button type="button" data-action="lcQuickDue" data-id="168">7天后</button>
           <button type="button" data-action="lcQuickDue" data-id="600">25天复购期</button>
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
      t.done = false;
      c.followup = lcNextTask(c.id)?.due || t.due;
      lcLog(c.id, 'followup', `重新打开跟进待办：${t.title}`);
      persist();
      render();
      lcRefreshOpenDossier(c.id);
      toast('已重新打开该条跟进待办。');
      return;
    }
    const meta = lcStageMeta(c.stage);
    fidForm(
      `完成跟进闭环 · ${c.name}`,
      'lc-complete-task',
      `<input type="hidden" name="taskId" value="${esc(t.id)}">
       <div class="lc-card-block" style="margin-bottom:14px;background:var(--color-surface-alt)">
         <strong style="font-size:13px">已完成事项：${esc(t.title)}</strong>
         <small style="display:block;margin-top:3px;color:var(--color-text-muted)">当前阶段：${esc(c.stage)} · 完成后请记录结果并衔接下一步动作，防止线索断档。</small>
       </div>
       ${fidFormRow('跟进结果', `<select class="fid-select" style="width:100%" name="outcome" required>
         ${fidOption(['客户已积极回复推进', '已发送资料/方案待看', '客户暂未回复需顺延追访', '客户提出价格/时效异议', '客户确认意向请求报价', '已确认下单成交', '明确无需求/暂缓归档'], '客户已积极回复推进')}
       </select>`, '', true)}
       ${fidFormRow('结果纪要', `<input class="fid-input" style="width:100%" name="outcomeNote" placeholder="选填：补充客户反馈细节，将自动写入 360° 轨迹">`)}
       ${fidFormRow('阶段联动', `<select class="fid-select" style="width:100%" name="nextStage" id="lc-complete-stage">
         ${option(c.stage, `保持当前阶段（${c.stage}）`, c.stage)}
         ${LC_STAGES.filter(s => s.id !== c.stage).map(s => option(s.id, `同步推进至 → ${s.code} · ${s.name}`, '')).join('')}
       </select>`)}
       <div class="lc-card-block" style="background:var(--color-surface-alt)">
         <label style="display:flex;align-items:center;gap:6px;font-weight:650;font-size:12px;margin-bottom:8px">
           <input type="checkbox" name="scheduleNext" value="1" checked> 立即衔接下一次跟进提醒（防漏闭环推荐）
         </label>
         <div class="lc-qual-grid">
           <label class="lc-field full"><span>下次跟进事项</span><input class="fid-input" name="nextTitle" value="${esc(lcStageMeta(meta.next).defaultTask)}"></label>
           <label class="lc-field"><span>下次提醒时间</span><input class="fid-input" type="datetime-local" id="lc-due-input" name="nextDue" value="${inputDate(new Date(Date.now() + 48 * 3600000).toISOString())}"></label>
           <label class="lc-field"><span>优先级</span><select class="fid-select" name="nextPriority">${fidOption([['normal', '普通'], ['high', '重点优先']], 'normal')}</select></label>
         </div>
       </div>`,
      '确认完成并闭环',
      { wide: true }
    );
  }

  function openQuoteModal(cid = '') {
    const list = myCustomers();
    const c = customer(cid) || selectedCustomer() || list[0];
    if (!c) return toast('请先添加客户。');
    fidForm(
      '新建客户报价单',
      'lc-quote',
      `${fidFormRow('选择客户', `<select class="fid-select" style="width:100%" name="customerId">${list.map(x => option(x.id, `${x.name}（${x.stage}）`, c.id)).join('')}</select>`, '', true)}
       ${fidFormRow('报价金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="amount" placeholder="USD 金额，如 1850" required>`, '', true)}
       ${fidFormRow('方案摘要', `<input class="fid-input" style="width:100%" name="summary" value="${esc(c.qualification?.demand || '')}" placeholder="如：常规规格组合 + 特快专递含税价" required>`, '', true)}
       ${fidFormRow('有效天数', `<select class="fid-select" style="width:100%" name="validDays">${fidOption([['3', '3 天'], ['5', '5 天'], ['7', '7 天'], ['15', '15 天']], '5')}</select>`)}
       ${fidFormRow('异议备注', `<input class="fid-input" style="width:100%" name="objectionNote" placeholder="选填：记录客户对价格或运费的关注点">`)}
       <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-left:92px">
         <input type="checkbox" name="autoFollow" value="1" checked> 自动推进客户至「报价推进」并生成 24h 催单跟进待办
       </label>`,
      '保存报价单',
      { wide: true }
    );
  }

  function openOrderModal(cid = '', fromQuote = null) {
    const list = myCustomers();
    const c = customer(fromQuote?.customerId || cid) || selectedCustomer() || list[0];
    if (!c) return toast('请先添加客户。');
    const priorOrders = lcCustomerOrders(c.id).length;
    fidForm(
      fromQuote ? `报价转成交订单 · ${fromQuote.quoteNo}` : '登记客户成交订单',
      'lc-order',
      `<input type="hidden" name="quoteId" value="${esc(fromQuote?.id || '')}">
       ${fidFormRow('成交客户', `<select class="fid-select" style="width:100%" name="customerId" ${fromQuote ? 'readonly' : ''}>${list.map(x => option(x.id, `${x.name}（${x.stage}）`, c.id)).join('')}</select>`, '', true)}
       ${fidFormRow('成交金额', `<input class="fid-input" style="width:100%" type="number" min="1" step="1" name="amount" value="${esc(fromQuote?.amount || '')}" placeholder="USD 实收金额" required>`, '', true)}
       ${fidFormRow('订单类型', `<select class="fid-select" style="width:100%" name="orderType">${fidOption(['首单', '复购'], priorOrders > 0 ? '复购' : '首单')}</select>`)}
       ${fidFormRow('履约状态', `<select class="fid-select" style="width:100%" name="fulfillmentStatus">${fidOption(['待发货', '运输中', '已签收'], '待发货')}</select>`)}
       ${fidFormRow('物流/单号', `<input class="fid-input" style="width:100%" name="carrierNote" value="${esc(fromQuote ? '关联报价 ' + fromQuote.quoteNo : '')}" placeholder="外部订单号、物流承运商或交付备注">`)}
       ${fidFormRow('复购周期', `<select class="fid-select" style="width:100%" name="repurchaseCycleDays">${fidOption([['15', '15 天'], ['25', '25 天'], ['30', '30 天'], ['45', '45 天']], String(c.repurchaseCycleDays || 30))}</select>`)}`,
      '确认登记成交',
      { wide: true }
    );
  }

  function openOrderStepModal(orderId) {
    const ord = (data.orders || []).find(o => o.id === orderId);
    if (!ord) return;
    const c = customer(ord.customerId);
    if (!c) return;
    const nextStatus = ord.fulfillmentStatus === '待发货' ? '运输中' : '已签收';
    fidForm(
      nextStatus === '运输中' ? `标记订单发货 · ${ord.orderNo}` : `确认客户签收并转入复购培育 · ${ord.orderNo}`,
      'lc-order-step',
      `<input type="hidden" name="orderId" value="${esc(ord.id)}">
       <input type="hidden" name="nextStatus" value="${esc(nextStatus)}">
       <div class="lc-transition-banner">
         <span class="lc-pill warn">${esc(ord.fulfillmentStatus)}</span>
         ${icon('ArrowRight')}
         <span class="lc-pill ok">${esc(nextStatus)}</span>
       </div>
       ${fidFormRow('物流说明', `<input class="fid-input" style="width:100%" name="carrierNote" value="${esc(ord.carrierNote || '')}" placeholder="${nextStatus === '运输中' ? '输入承运商与追踪单号（如 USPS 9405...）' : '记录签收情况与客户初步反馈'}" required>`, '', true)}
       ${nextStatus === '已签收'
         ? `${fidFormRow('复购周期', `<select class="fid-select" style="width:100%" name="repurchaseCycleDays">${fidOption([['15', '15 天后进入复购窗口'], ['25', '25 天后进入复购窗口'], ['30', '30 天后进入复购窗口'], ['45', '45 天后进入复购窗口']], String(c.repurchaseCycleDays || 30))}</select>`)}
            <p class="fid-field-help">确认签收后，客户将自动由「成交履约」流转至「复购培育」，并自动生成复购窗口关怀待办。</p>`
         : ''}
       <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:8px">
         <input type="checkbox" name="openChatDraft" value="1" checked> 同步生成对应语种（${esc(c.language)}）WhatsApp 通知草稿并打开聊天窗
       </label>`,
      nextStatus === '运输中' ? '确认发货' : '确认签收并开启复购周期',
      { wide: true }
    );
  }

  function openSimLeadModal() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先在号码管理绑定至少一个 WhatsApp 号码。');
    fidForm(
      '模拟新客户加微进线（体验 S1 进线闭环）',
      'lc-sim-lead',
      `<p class="fid-field-help" style="margin-bottom:12px">模拟一位潜在客户从广告或转介绍添加你的 WhatsApp 号码并发来首条咨询，自动进入「S1 · 新进线」并立首响破冰待办。</p>
       ${fidFormRow('进线号码', `<select class="fid-select" style="width:100%" name="accountId">${accounts.map(a => option(a.id, `${a.name} (${a.number})`, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" value=" Jordan Brooks" required>`, '', true)}
       ${fidFormRow('客户语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语'], '英语')}</select>`)}
       ${fidFormRow('来源归因', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('广告系列', `<input class="fid-input" style="width:100%" name="campaign" value="US · 咨询直连广告 E" placeholder="选填广告系列名称">`)}`,
      '生成进线会话并查看',
      { wide: true }
    );
  }

  function lcFillSmartDraft(customerId, kind = 'quote') {
    const c = customer(customerId);
    if (!c) return;
    const isEs = c.language === '西班牙语';
    const q = lcCustomerQuotes(c.id)[0];
    const o = lcCustomerOrders(c.id)[0];
    let zh = '', target = '';
    if (kind === 'quote') {
      zh = `你好 ${c.name}，跟进一下之前发给你的报价方案${q ? ' ' + q.quoteNo + ' ($' + q.amount + ')' : ''}，请问对规格或交付时效还有需要调整的地方吗？`;
      target = isEs
        ? `Hola ${c.name}, quería dar seguimiento a la cotización${q ? ' ' + q.quoteNo + ' ($' + q.amount + ')' : ''}. ¿Tienes alguna duda sobre los detalles o el tiempo de envío?`
        : `Hi ${c.name}, just following up on the quote${q ? ' ' + q.quoteNo + ' ($' + q.amount + ')' : ''} I shared. Let me know if you have any questions on specs or delivery timing!`;
    } else if (kind === 'order') {
      zh = `你好 ${c.name}，同步一下你的订单${o ? ' ' + o.orderNo : ''}最新进度：${o?.carrierNote || '已安排优先派送'}，收到包裹后请随时告诉我！`;
      target = isEs
        ? `Hola ${c.name}, te comparto la actualización de tu pedido${o ? ' ' + o.orderNo : ''}: ${o?.carrierNote || 'en tránsito prioritario'}. ¡Avísame cuando lo recibas!`
        : `Hi ${c.name}, quick update on your order${o ? ' ' + o.orderNo : ''}: ${o?.carrierNote || 'shipped via priority carrier'}. Please let me know once it arrives safely!`;
    } else {
      zh = `你好 ${c.name}，距离上次交付已经一段时间了，想问问之前批次使用体验如何？近期是否需要为你预留新一轮补货排期？`;
      target = isEs
        ? `Hola ${c.name}, ¿cómo te ha ido con el pedido anterior? Quería saber si necesitas programar reposición para esta semana.`
        : `Hi ${c.name}, hope everything went great with your previous order! Just checking in to see if you’d like to line up your next restock batch this week.`;
    }
    ui.drafts[c.id] = { text: zh, translated: target, source: zh };
    ui.customer = c.id;
    ui.account = 'all';
    fid.waTab = 'chat';
    fid.chatOpen = true;
    ui.mobileChat = true;
    if ($('#dialog').open) close();
    persist();
    navigate('inbox');
    toast(`已根据「${c.language}」生成沟通草稿，核对后可一键发送。`);
  }

  function lcSimulateCustomerReply(customerId) {
    const c = customer(customerId);
    if (!c) return;
    const isEs = c.language === '西班牙语';
    const inRecovery = LC_RECOVERY_STAGES.has(c.stage);
    const pair = inRecovery
      ? (isEs
          ? ['Hola, retomamos las compras esta semana. ¿Podemos revisar la cotización actualizada?', '你好，我们这周恢复采购计划了，可以重新核对一下最新报价吗？']
          : ['Hi! Our budget is ready now—could we revisit the quote and check current lead time?', '你好！我们的采购预算已经批下来了，可以重新确认一下报价和当前发货时效吗？'])
      : c.stage === '报价推进'
        ? (isEs
            ? ['El precio nos parece bien. ¿Aceptan pago hoy para enviarlo mañana?', '价格我们觉得合适。今天付款的话明天能安排发出吗？']
            : ['The quote looks good to us! If we confirm today, how soon can it ship out?', '这份报价我们认可！如果今天确认付款，最快多久能发出？'])
        : (isEs
            ? ['Gracias por responder rápido, me interesa ver las opciones disponibles.', '谢谢你的快速回复，我想看看目前可选的规格方案。']
            : ['Thanks for the quick response! Could you share the recommended starter option?', '谢谢快速回复！可以推荐一下适合首批采购的方案吗？']);

    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    (data.messages[c.id] ??= []).push({ id: nextId('m'), side: 'in', text: pair[0], translated: pair[1], time });
    c.preview = pair[0];
    c.translation = pair[1];
    c.last = '刚刚';
    c.unread = (Number(c.unread) || 0) + 1;
    lcLog(c.id, 'inbound', inRecovery ? '沉睡/归档老客主动发来新消息（触发复联重激活信号）' : '收到客户最新 WhatsApp 回复消息');
    persist();
    render();
    lcRefreshOpenDossier(c.id);
    toast(inRecovery ? `收到 ${c.name} 复联消息！已点亮「复联待重激活」信号，可一键重激活回流。` : `已模拟收到 ${c.name} 的新回复。`);
  }

  // Override addCustomer so newly created customers enter S1 新进线 with initial SLA task
  function openLifecycleCustomerForm() {
    const accounts = myAccounts();
    if (!accounts.length) return toast('请先添加账号。');
    fidForm(
      '新增 WhatsApp 客户档案（自动入轨 S1 新进线）',
      'lc-new-customer',
      `${fidFormRow('客户称呼', `<input class="fid-input" style="width:100%" name="name" required maxlength="50" placeholder="客户姓名或备注称呼">`, '', true)}
       ${fidFormRow('WhatsApp号', `<input class="fid-input" style="width:100%" name="phone" required placeholder="含国家区号，如 +1 (512) 555-0192">`, '', true)}
       ${fidFormRow('归属接待号', `<select class="fid-select" style="width:100%" name="account">${accounts.map(a => option(a.id, a.name, accounts[0].id)).join('')}</select>`)}
       ${fidFormRow('沟通语言', `<select class="fid-select" style="width:100%" name="language">${fidOption(['英语', '西班牙语', '其他'], '英语')}</select>`)}
       ${fidFormRow('国家地区', `<select class="fid-select" style="width:100%" name="country">${fidOption([['US', '美国'], ['PR', '波多黎各'], ['OTHER', '其他地区']], 'US')}</select>`)}
       ${fidFormRow('来源渠道', `<select class="fid-select" style="width:100%" name="source">${fidOption(['Facebook 广告', 'Instagram 广告', '客户转介绍', '网站咨询', '手动添加'], 'Facebook 广告')}</select>`)}
       ${fidFormRow('初步需求', `<input class="fid-input" style="width:100%" name="demand" placeholder="记录客户首句来意或咨询重点">`)}`,
      '创建并纳入全周期管理',
      { wide: true }
    );
  }

  // ============================================================================
  // Register All SCRM Lifecycle Actions & Form Submissions
  // ============================================================================
  Object.assign(fidActions, {
    lcMode: id => { lcState.mode = id === 'table' ? 'table' : 'board'; render(); },
    lcStageFilter: id => { lcState.stageFilter = lcState.stageFilter === id ? 'all' : id; render(); },
    lcRadar: id => { lcState.radar = lcState.radar === id && id !== 'all' ? 'all' : id; render(); },
    lcResetFilters: () => { Object.assign(lcState, { stageFilter: 'all', radar: 'all', account: 'all', query: '' }); render(); },
    lcToggleSop: () => { lcState.sopOpen = !lcState.sopOpen; render(); },
    lcJumpStage: id => { lcState.stageFilter = id; lcState.radar = 'all'; navigate('lifecycle'); },
    lcJumpRadar: id => { lcState.stageFilter = 'all'; lcState.radar = id; navigate('lifecycle'); },
    lcAdvance: (id, btn) => openLifecycleAdvance(id, btn?.dataset?.target || ''),
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
    lcDealsTab: id => { lcState.dealsTab = id; render(); },
    lcFollowTab: id => { lcState.followTab = id; ui.pages.followups = 0; render(); },
    fidTasks: () => { lcState.followTab = 'todo'; ui.taskFilter = 'pending'; ui.pages.followups = 0; navigate('followups'); },
    lcQuoteOpen: id => openQuoteModal(id),
    lcQuoteToOrder: id => {
      const q = (data.quotes || []).find(x => x.id === id);
      if (q) openOrderModal(q.customerId, q);
    },
    lcQuoteExpire: id => {
      const q = (data.quotes || []).find(x => x.id === id);
      if (!q) return;
      q.status = '已失效';
      q.updatedAt = new Date().toISOString();
      lcLog(q.customerId, 'deal', `报价单 ${q.quoteNo}（${lcMoney(q.amount)}）标记为已失效`);
      persist();
      render();
      lcRefreshOpenDossier(q.customerId);
      toast(`已将报价单 ${q.quoteNo} 标记为失效。`);
    },
    lcOrderOpen: id => openOrderModal(id),
    lcOrderStep: id => openOrderStepModal(id),
    lcChatDraft: (id, btn) => lcFillSmartDraft(id, btn?.dataset?.draftKind || 'quote'),
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
    'lc-transition-form': (f, v) => {
      const c = customer(v('customerId'));
      const targetStage = v('targetStage');
      if (!c || !LC_STAGE_MAP.has(targetStage)) return error('请选择有效的生命周期阶段。');
      const prevStage = c.stage;
      const wasRecovery = LC_RECOVERY_STAGES.has(prevStage);

      if (targetStage === '需求澄明') {
        if (!v('demand')) return error('请填写客户核心咨询需求，以便后续精准跟进。');
        c.intentLevel = v('intentLevel') || c.intentLevel;
        c.qualification.demand = v('demand');
        if (v('volume')) c.qualification.volume = v('volume');
      } else if (targetStage === '报价推进') {
        const amt = Number(v('quoteAmount'));
        if (!amt || amt <= 0 || !v('quoteSummary')) return error('请填写有效的报价金额和方案摘要。');
        let openQ = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
        if (openQ) {
          Object.assign(openQ, { amount: amt, summary: v('quoteSummary'), objectionNote: v('objection'), updatedAt: new Date().toISOString() });
        } else {
          openQ = {
            id: nextId('qte'),
            quoteNo: 'QT-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String((data.quotes?.length || 0) + 1).padStart(2, '0'),
            customerId: c.id, accountId: c.account, owner: c.owner,
            amount: amt, currency: 'USD', summary: v('quoteSummary'),
            validUntil: fidDay(5).slice(0, 10), status: '待确认',
            objectionNote: v('objection'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          };
          data.quotes.unshift(openQ);
        }
        if (v('objection')) c.qualification.objection = v('objection');
      } else if (targetStage === '成交履约') {
        const amt = Number(v('orderAmount'));
        if (!amt || amt <= 0) return error('请填写有效的成交金额。');
        const openQ = lcCustomerQuotes(c.id).find(q => q.status === '待确认');
        if (openQ) openQ.status = '已转单';
        const fStatus = v('fulfillmentStatus') || '待发货';
        const ord = {
          id: nextId('ord'),
          orderNo: 'ORD-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String(101 + (data.orders?.length || 0)),
          quoteId: openQ?.id || '', customerId: c.id, accountId: c.account, owner: c.owner,
          amount: amt, currency: 'USD', orderType: v('orderType') || '首单',
          paymentStatus: '已收款', fulfillmentStatus: fStatus,
          carrierNote: v('carrierNote') || '待录入物流单号',
          createdAt: new Date().toISOString(),
          deliveredAt: fStatus === '已签收' ? new Date().toISOString() : null,
        };
        data.orders.unshift(ord);
      } else if (targetStage === '复购培育') {
        const days = Number(v('repurchaseCycleDays')) || 30;
        c.repurchaseCycleDays = days;
        c.nextRepurchaseAt = fidDay(days);
      } else if (targetStage === '流失归档') {
        if (!v('lostReason') || !v('lostDetail')) return error('请选择流失主因并填写简要说明。');
        c.lostReason = v('lostReason');
        c.lostDetail = v('lostDetail');
        const watch = Number(v('watchDays') || 0);
        c.reactivateWatchAt = watch > 0 ? fidDay(watch) : null;
        // Close obsolete active tasks so lost leads don't pollute daily active queues
        for (const t of data.tasks) {
          if (t.customer === c.id && !t.done) {
            t.done = true;
            t.outcome = '随客户流失归档自动结清';
          }
        }
        c.followup = null;
      }

      c.stage = targetStage;
      c.stageEnteredAt = new Date().toISOString();
      if (wasRecovery && LC_ACTIVE_STAGES.has(targetStage)) {
        c.reactivatedCount = (c.reactivatedCount || 0) + 1;
        c.unread = 0;
      }

      if (targetStage !== '流失归档' && f.get('createNextTask') === '1' && v('nextTaskTitle')) {
        lcCreateTask({
          customerId: c.id,
          title: v('nextTaskTitle'),
          dueIso: v('nextTaskDue') ? new Date(v('nextTaskDue')).toISOString() : fidDay(1),
          priority: v('nextTaskPriority') || 'normal',
          taskType: targetStage === '报价推进' ? '报价催单' : targetStage === '成交履约' ? '履约回访' : targetStage === '复购培育' ? '复购关怀' : targetStage === '沉睡唤醒' ? '沉睡唤醒' : '需求跟进',
        });
      }

      const noteExtra = v('transitionNote') || v('dormantReason') || (targetStage === '流失归档' ? `${c.lostReason}（${c.lostDetail}）` : '');
      lcLog(
        c.id,
        'stage',
        `${wasRecovery && LC_ACTIVE_STAGES.has(targetStage) ? '【重激活回流】' : ''}阶段由「${prevStage}」变更为「${targetStage}」${noteExtra ? ' · ' + noteExtra : ''}`,
        { fromStage: prevStage, toStage: targetStage }
      );

      persist();
      close();
      render();
      toast(`已将 ${c.name} 更新至「${targetStage}」并完成闭环同步。`);
    },

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

    'lc-followup-form': (f, v) => {
      const c = customer(v('customer'));
      if (!c || !v('title') || !v('due')) return error('请填写完整的客户、事项和计划时间。');
      const due = new Date(v('due'));
      if (Number.isNaN(due.getTime())) return error('请填写有效的跟进时间。');
      lcCreateTask({
        customerId: c.id,
        title: v('title'),
        dueIso: due.toISOString(),
        priority: v('priority') || 'normal',
        taskType: v('taskType') || '需求跟进',
      });
      lcLog(c.id, 'followup', `安排${v('taskType') || '跟进'}待办：${v('title')}（${dateLabel(due.toISOString())}）`);
      persist();
      close();
      render();
      toast('跟进计划已建立，防漏状态已更新。');
    },

    'lc-complete-task-form': (f, v) => {
      const t = data.tasks.find(x => x.id === v('taskId'));
      if (!t) return;
      const c = customer(t.customer);
      if (!c) return;
      t.done = true;
      t.outcome = v('outcome') + (v('outcomeNote') ? ' — ' + v('outcomeNote') : '');
      t.completedAt = new Date().toISOString();
      lcLog(c.id, 'followup', `完成跟进「${t.title}」· 结果：${t.outcome}`);

      const nextStage = v('nextStage');
      if (nextStage && LC_STAGE_MAP.has(nextStage) && nextStage !== c.stage) {
        const prev = c.stage;
        c.stage = nextStage;
        c.stageEnteredAt = new Date().toISOString();
        if (nextStage === '流失归档') c.lostReason ||= '明确无需求/暂缓归档';
        lcLog(c.id, 'stage', `随跟进完成同步推进阶段：「${prev}」→「${nextStage}」`);
      }

      if (c.stage !== '流失归档' && f.get('scheduleNext') === '1' && v('nextTitle') && v('nextDue')) {
        const due = new Date(v('nextDue'));
        if (!Number.isNaN(due.getTime())) {
          lcCreateTask({
            customerId: c.id,
            title: v('nextTitle'),
            dueIso: due.toISOString(),
            priority: v('nextPriority') || 'normal',
            taskType: c.stage === '报价推进' ? '报价催单' : c.stage === '复购培育' ? '复购关怀' : '需求跟进',
          });
        }
      } else {
        c.followup = lcNextTask(c.id)?.due || null;
      }

      persist();
      close();
      render();
      toast('本次跟进已闭环归档，下一步计划已同步。');
    },

    'lc-quote-form': (f, v) => {
      const c = customer(v('customerId'));
      const amount = Number(v('amount'));
      if (!c || !amount || amount <= 0 || !v('summary')) return error('请填写有效的报价金额和方案摘要。');
      const days = Number(v('validDays')) || 5;
      const q = {
        id: nextId('qte'),
        quoteNo: 'QT-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String((data.quotes?.length || 0) + 1).padStart(2, '0'),
        customerId: c.id, accountId: c.account, owner: c.owner,
        amount, currency: 'USD', summary: v('summary'),
        validUntil: fidDay(days).slice(0, 10), status: '待确认',
        objectionNote: v('objectionNote'),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      data.quotes.unshift(q);
      if (f.get('autoFollow') === '1') {
        if (['新进线', '需求澄明', '沉睡唤醒', '流失归档'].includes(c.stage)) {
          const prev = c.stage;
          c.stage = '报价推进';
          c.stageEnteredAt = new Date().toISOString();
          lcLog(c.id, 'stage', `新建报价单 ${q.quoteNo}，阶段由「${prev}」推进至「报价推进」`);
        }
        lcCreateTask({
          customerId: c.id,
          title: `跟进报价单 ${q.quoteNo}（${lcMoney(amount)}）客户反馈`,
          dueIso: new Date(Date.now() + 24 * 3600000).toISOString(),
          priority: 'high',
          taskType: '报价催单',
        });
      }
      lcLog(c.id, 'deal', `创建报价单 ${q.quoteNo} · 金额 ${lcMoney(amount)}（${q.summary}）`);
      persist();
      close();
      render();
      toast(`报价单 ${q.quoteNo} 已创建并关联跟进计划。`);
    },

    'lc-order-form': (f, v) => {
      const c = customer(v('customerId'));
      const amount = Number(v('amount'));
      if (!c || !amount || amount <= 0) return error('请填写有效的成交金额。');
      const qid = v('quoteId');
      const linkedQ = qid ? (data.quotes || []).find(q => q.id === qid) : lcCustomerQuotes(c.id).find(q => q.status === '待确认');
      if (linkedQ) linkedQ.status = '已转单';
      const fStatus = v('fulfillmentStatus') || '待发货';
      const cycle = Number(v('repurchaseCycleDays')) || 30;
      c.repurchaseCycleDays = cycle;
      const ord = {
        id: nextId('ord'),
        orderNo: 'ORD-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String(101 + (data.orders?.length || 0)),
        quoteId: linkedQ?.id || '', customerId: c.id, accountId: c.account, owner: c.owner,
        amount, currency: 'USD', orderType: v('orderType') || '首单',
        paymentStatus: '已收款', fulfillmentStatus: fStatus,
        carrierNote: v('carrierNote') || '待安排仓库发货',
        createdAt: new Date().toISOString(),
        deliveredAt: fStatus === '已签收' ? new Date().toISOString() : null,
      };
      data.orders.unshift(ord);
      const prev = c.stage;
      if (fStatus === '已签收') {
        c.stage = '复购培育';
        c.nextRepurchaseAt = fidDay(cycle);
        lcCreateTask({
          customerId: c.id,
          title: `复购窗口关怀（订单 ${ord.orderNo} 签收后周期维护）`,
          dueIso: fidDay(Math.max(3, cycle - 5)),
          priority: 'normal',
          taskType: '复购关怀',
        });
      } else {
        c.stage = '成交履约';
        lcCreateTask({
          customerId: c.id,
          title: `跟进订单 ${ord.orderNo} 发货单号与客户签收`,
          dueIso: new Date(Date.now() + 24 * 3600000).toISOString(),
          priority: 'high',
          taskType: '履约回访',
        });
      }
      c.stageEnteredAt = new Date().toISOString();
      lcLog(c.id, 'deal', `登记${ord.orderType}成交 ${ord.orderNo}（${lcMoney(amount)}），阶段由「${prev}」进入「${c.stage}」`);
      persist();
      close();
      render();
      toast(`订单 ${ord.orderNo} 已登记，客户已进入「${c.stage}」阶段。`);
    },

    'lc-order-step-form': (f, v) => {
      const ord = (data.orders || []).find(o => o.id === v('orderId'));
      if (!ord) return;
      const c = customer(ord.customerId);
      if (!c || !v('carrierNote')) return error('请填写物流单号或签收说明。');
      const nextStatus = v('nextStatus');
      ord.fulfillmentStatus = nextStatus;
      ord.carrierNote = v('carrierNote');
      if (nextStatus === '已签收') {
        ord.deliveredAt = new Date().toISOString();
        const cycle = Number(v('repurchaseCycleDays')) || c.repurchaseCycleDays || 30;
        c.repurchaseCycleDays = cycle;
        c.nextRepurchaseAt = fidDay(cycle);
        const prev = c.stage;
        c.stage = '复购培育';
        c.stageEnteredAt = new Date().toISOString();
        lcCreateTask({
          customerId: c.id,
          title: `老客复购窗口触达（预计 ${cycle} 天补货周期）`,
          dueIso: fidDay(Math.max(2, cycle - 4)),
          priority: 'normal',
          taskType: '复购关怀',
        });
        lcLog(c.id, 'deal', `订单 ${ord.orderNo} 确认签收，自动由「${prev}」转入「复购培育」（下次复购窗口 ${fidDate(c.nextRepurchaseAt).slice(0, 10)}）`);
      } else {
        lcLog(c.id, 'deal', `订单 ${ord.orderNo} 更新为「运输中」· ${ord.carrierNote}`);
      }
      persist();
      close();
      if (f.get('openChatDraft') === '1') {
        lcFillSmartDraft(c.id, 'order');
      } else {
        render();
        toast(`订单 ${ord.orderNo} 已更新为「${nextStatus}」。`);
      }
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
        tags: [], stage: '新进线', stageEnteredAt: nowIso,
        source: v('source'), campaign: v('campaign'), ad: '模拟进线会话',
        unread: 1, star: false, last: '刚刚', preview: msg, translation: tr,
        followup: null, notes: '', contactRefs: [{ account: a.id, owner: a.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-实时', intentLevel: '高意向',
        repurchaseCycleDays: 30, reactivatedCount: 0,
        qualification: { demand: '新加微咨询目录与发货安排', volume: '待首响确认', deliveryRegion: a.country === 'PR' ? 'PR · San Juan' : 'US · TX', objection: '', commWindow: v('language') + '沟通' },
      };
      data.customers.unshift(c);
      data.messages[id] = [{ id: nextId('m'), side: 'in', text: msg, translated: tr, time: '刚刚' }];
      lcCreateTask({
        customerId: id,
        title: `首响破冰回复 ${name} 并确认具体需求`,
        dueIso: new Date(Date.now() + 3600000).toISOString(),
        priority: 'high',
        taskType: '首响破冰',
      });
      lcLog(id, 'inbound', `通过「${c.source}」首次加微进线，自动进入「S1 · 新进线」并生成首响待办`);
      persist();
      close();
      lcState.stageFilter = 'all';
      lcState.radar = 'all';
      navigate('lifecycle');
      toast(`新客户 ${name} 已加微进线！已自动归入「S1 · 新进线」并建立首响待办。`);
    },

    'lc-new-customer-form': (f, v) => {
      if (!v('name') || !v('phone')) return error('请填写客户称呼与 WhatsApp 号码。');
      const digits = fidPhoneDigits(v('phone'));
      if (digits.length < 7) return error('请输入含国家区号的有效号码。');
      const dup = data.customers.find(x => fidPhoneDigits(x.phone) === digits);
      if (dup) return error(`该号码已存在于客户「${dup.name}」（当前阶段：${dup.stage}），请直接前往其档案跟进避免撞单。`);
      const a = account(v('account'));
      const nowIso = new Date().toISOString();
      const id = nextId('c');
      const c = {
        id, name: v('name'), initials: initial(v('name')), color: 'jade',
        phone: v('phone'), country: v('country'), city: '待补充',
        timezone: v('country') === 'PR' ? 'America/Puerto_Rico' : 'America/New_York',
        language: v('language'), owner: a?.owner || ui.persona, account: a?.id || myAccounts()[0]?.id,
        tags: [], stage: '新进线', stageEnteredAt: nowIso,
        source: v('source'), campaign: '', ad: '',
        unread: 0, star: false, last: '刚刚', preview: v('demand') || '新建客户档案', translation: '',
        followup: null, notes: v('demand'), contactRefs: [{ account: a?.id, owner: a?.owner || ui.persona }],
        createdAt: nowIso, updatedAt: nowIso, clientType: '新增线索-补录', intentLevel: '中意向',
        repurchaseCycleDays: 30, reactivatedCount: 0,
        qualification: { demand: v('demand'), volume: '', deliveryRegion: country({ country: v('country') }), objection: '', commWindow: v('language') + '沟通' },
      };
      data.customers.unshift(c);
      lcCreateTask({
        customerId: id,
        title: `首次主动触达 ${c.name} 确认需求`,
        dueIso: new Date(Date.now() + 4 * 3600000).toISOString(),
        priority: 'normal',
        taskType: '首响破冰',
      });
      lcLog(id, 'stage', '手动建档纳入「S1 · 新进线」并自动创建首次跟进待办');
      persist();
      close();
      render();
      toast(`客户 ${c.name} 已创建并纳入全周期管理。`);
    },
  });

  // Keep any newly bound OpenWA sample chats or external additions normalized into S1 新进线
  function lcSyncRuntimeCustomers() {
    for (const c of data.customers) {
      const normalized = lcNormalizeStage(c.stage);
      if (c.stage !== normalized) {
        c.stage = normalized;
        c.stageEnteredAt ||= new Date().toISOString();
      }
      c.qualification ||= {
        demand: c.notes || c.preview || '',
        volume: '待确认',
        deliveryRegion: country(c),
        objection: '',
        commWindow: (c.language || '英语') + '沟通',
      };
      if (c.stage === '新进线' && !data.tasks.some(t => t.customer === c.id) && !(data.activities[c.id] || []).length) {
        lcCreateTask({
          customerId: c.id,
          title: `首响破冰回复 ${c.name} 并确认咨询需求`,
          dueIso: new Date(Date.now() + 2 * 3600000).toISOString(),
          priority: 'high',
          taskType: '首响破冰',
        });
        lcLog(c.id, 'inbound', 'OpenWA 扫码进线会话自动归入「S1 · 新进线」并建立首响待办');
      }
    }
  }
  const lcWrapRender = render;
  render = function() {
    lcSyncRuntimeCustomers();
    lcWrapRender();
  };

  // Dynamic input/change listeners for Lifecycle controls & Transition modal
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'lc-target-stage') {
      const c = customer(t.dataset.customer);
      const host = $('#lc-transition-dynamic');
      if (c && host) {
        host.innerHTML = lcTransitionDynamicFields(c, t.value);
        paintIcons(host);
      }
    }
    if (t.id === 'lc-account-filter') {
      lcState.account = t.value;
      render();
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'lc-search-input') {
      lcState.query = t.value;
      const pos = t.selectionStart;
      render();
      const next = $('#lc-search-input');
      if (next) { next.focus({ preventScroll: true }); next.setSelectionRange(pos, pos); }
    }
    if (t.id === 'lc-deals-search') {
      lcState.dealsQuery = t.value;
      const pos = t.selectionStart;
      render();
      const next = $('#lc-deals-search');
      if (next) { next.focus({ preventScroll: true }); next.setSelectionRange(pos, pos); }
    }
  });
