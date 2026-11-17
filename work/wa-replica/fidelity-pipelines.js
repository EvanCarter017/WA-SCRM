  // ============================================================================
  // Configurable lifecycle pipelines (v0.7)
  // Stages are data, not code. Behaviour is driven by each stage's category,
  // entry capture and the pipeline's automation roles — never by stage names.
  // This file is pure (no app state) so build/validation tooling can evaluate it.
  // ============================================================================

  // Stage category drives health rules, board grouping and reactivation.
  const LC_CATEGORIES = {
    open: { label: '转化推进', tone: 'blue', active: true, recovery: false },
    won: { label: '成交与存量', tone: 'purple', active: true, recovery: false },
    dormant: { label: '沉睡唤醒', tone: 'peach', active: false, recovery: true },
    lost: { label: '流失归档', tone: 'slate', active: false, recovery: true },
  };

  // What the transition dialog collects when a customer enters the stage.
  const LC_CAPTURES = {
    none: '仅记录备注',
    qualify: '需求画像（意向度 / 核心需求 / 预计体量）',
    quote: '报价单（金额 / 方案 / 顾虑）',
    order: '成交订单（金额 / 履约状态）',
    repurchase: '复购周期',
    dormant: '沉睡原因',
    lost: '流失原因（必填）与观察期，并结清待办',
  };

  // Figure shown under the stage on the board and funnel.
  const LC_METRICS = {
    unread: '未读会话数',
    quotes: '在途报价金额',
    ltv: '累计成交金额',
  };

  // Automation landing points. Each maps to a stage id or '' (automation does not move the stage).
  const LC_ROLES = {
    intake: { label: '新客进线落点', help: '模拟进线、手动建档、OpenWA 扫码会话进入此阶段，并触发「首响待破冰」提醒。' },
    quoting: { label: '新建报价落点', help: '新建报价单时，处于更早阶段或沉睡/流失阶段的客户自动推进到此阶段。' },
    fulfillment: { label: '订单履约落点', help: '登记尚未签收的成交订单时，客户进入此阶段。' },
    nurture: { label: '签收复购落点', help: '订单确认签收后进入此阶段并开启复购窗口提醒。' },
    reactivate: { label: '重激活回流落点', help: '沉睡/流失客户点击「重激活」时默认回到此阶段。' },
  };

  const LC_TASK_TYPES = ['首响破冰', '需求跟进', '报价催单', '履约回访', '复购关怀', '沉睡唤醒'];
  // [value, label] pairs offered in the stage editor. Icons are limited to the bundled set.
  const LC_TONES = [['blue', '蓝色'], ['jade', '青绿'], ['gold', '金色'], ['purple', '紫色'], ['peach', '橙色'], ['slate', '灰色']];
  const LC_STAGE_ICONS = [
    ['UserRoundPlus', '新客'], ['Compass', '需求'], ['Target', '目标'], ['ShieldCheck', '核验'], ['FileSpreadsheet', '报价单'],
    ['PackageCheck', '包裹'], ['BadgeCheck', '签约'], ['Truck', '物流'], ['Repeat', '复购'], ['Star', '重点'],
    ['Flame', '高热'], ['MessageCircle', '沟通'], ['BellRing', '唤醒'], ['Archive', '归档'],
  ];

  // Stage names stored by v0.6 and earlier builds, mapped to the retail preset's stable ids.
  const LC_LEGACY_STAGE_IDS = {
    '新进线': 'rt_new', '需求澄明': 'rt_qualify', '报价推进': 'rt_quote', '成交履约': 'rt_fulfill',
    '复购培育': 'rt_nurture', '沉睡唤醒': 'rt_dormant', '流失归档': 'rt_lost',
    '新客户': 'rt_new', '跟进中': 'rt_qualify', '已报价': 'rt_quote', '已成交': 'rt_nurture', '培育中': 'rt_dormant',
  };

  function lcPresetPipelines() {
    return [
      {
        id: 'retail', name: '零售客户', isDefault: true,
        lostReasons: ['需求暂缓/预算延后', '价格敏感/超出预算', '交付时效或物流不符', '已选择其他供应商', '长期失联未回复', '非目标客群/无效咨询'],
        roles: { intake: 'rt_new', quoting: 'rt_quote', fulfillment: 'rt_fulfill', nurture: 'rt_nurture', reactivate: 'rt_qualify' },
        stages: [
          {
            id: 'rt_new', name: '新进线', category: 'open', tone: 'blue', icon: 'UserRoundPlus', capture: 'none', metric: 'unread',
            goal: '黄金首响破冰，核实进线来源、语言偏好与初步咨询意图',
            sop: '15分钟内首响 · 确认英/西语与收件地区 · 建立首次跟进计划',
            exitRule: '客户回复并表达明确咨询方向 → 推进至下一阶段',
            next: 'rt_qualify', defaultTask: '首响破冰与确认客户来意', defaultHours: 4, taskType: '首响破冰',
          },
          {
            id: 'rt_qualify', name: '需求澄明', category: 'open', tone: 'jade', icon: 'Compass', capture: 'qualify', metric: 'unread',
            goal: '补全客户需求画像（规格偏好、采购规模、时效要求），发送匹配目录资料',
            sop: '发送对应语种目录 · 记录预算/体量区间 · 识别潜在跨号撞单',
            exitRule: '客户确认具体需求并询价 → 推进至报价',
            next: 'rt_quote', defaultTask: '跟进目录查看反馈与具体需求', defaultHours: 24, taskType: '需求跟进',
          },
          {
            id: 'rt_quote', name: '报价推进', category: 'open', tone: 'gold', icon: 'FileSpreadsheet', capture: 'quote', metric: 'quotes',
            goal: '发出结构化报价方案，跟进价格、运费与时效异议，推动拍板成交',
            sop: '登记报价单金额与有效期 · 24-48h 内跟进反馈 · 消解核心顾虑',
            exitRule: '确认付款下单 → 成交；明确放弃 → 记录原因归档',
            next: 'rt_fulfill', defaultTask: '跟进报价单确认情况与异议解答', defaultHours: 24, taskType: '报价催单',
          },
          {
            id: 'rt_fulfill', name: '成交履约', category: 'won', tone: 'purple', icon: 'PackageCheck', capture: 'order', metric: 'ltv',
            goal: '登记成交订单与外部单号，主动同步发货与物流轨迹直至安心签收',
            sop: '核对收款与订单号 · WhatsApp 同步物流单号 · 签收后做满意度回访',
            exitRule: '客户确认签收且体验良好 → 自动计算复购周期并转入复购阶段',
            next: 'rt_nurture', defaultTask: '同步发货单号并跟进物流签收', defaultHours: 48, taskType: '履约回访',
          },
          {
            id: 'rt_nurture', name: '复购培育', category: 'won', tone: 'jade', icon: 'Repeat', capture: 'repurchase', metric: 'ltv',
            goal: '围绕老客消耗/补货周期持续维护关系，在复购窗口期精准触达促成连单',
            sop: '跟踪预计复购日期 · 窗口前 5 天主动关怀询单 · 新询盘直接创建复购报价',
            exitRule: '产生复购新单 → 循环履约累加 LTV；超期未互动 → 转入沉睡唤醒',
            next: 'rt_quote', defaultTask: '复购窗口期老客关怀与补货确认', defaultHours: 120, taskType: '复购关怀',
          },
          {
            id: 'rt_dormant', name: '沉睡唤醒', category: 'dormant', tone: 'peach', icon: 'BellRing', capture: 'dormant', metric: 'unread',
            goal: '针对超期未复购老客或长期已读不回潜客，执行低打扰价值触达唤醒',
            sop: '区分老客断购与潜客静默 · 发送近况关怀或新版目录 · 避免高频骚扰',
            exitRule: '客户回复互动 → 一键重激活回流；确认无需求 → 流失归档',
            next: 'rt_qualify', defaultTask: '执行沉睡客户关怀唤醒触达', defaultHours: 72, taskType: '沉睡唤醒',
          },
          {
            id: 'rt_lost', name: '流失归档', category: 'lost', tone: 'slate', icon: 'Archive', capture: 'lost', metric: 'unread',
            goal: '沉淀结构化流失原因与竞品/价格反馈，对暂缓型客户保留观察期回流入口',
            sop: '必填真实未成交主因 · 自动清理无效日常待办 · 客户复联支持一键重激活',
            exitRule: 'WhatsApp 再次来信或观察期满重评 → 一键重激活回流（保留完整历史）',
            next: 'rt_qualify', defaultTask: '流失观察期满复盘回访', defaultHours: 720, taskType: '沉睡唤醒',
          },
        ],
      },
      {
        id: 'b2b', name: '大B经销商', isDefault: false,
        lostReasons: ['价格/账期条款未谈拢', '资质或合规不符', '最低起订量不匹配', '已签约其他供应商', '渠道冲突/区域重叠', '长期失联未回复'],
        roles: { intake: 'b2b_inquiry', quoting: 'b2b_quote', fulfillment: 'b2b_supply', nurture: 'b2b_replenish', reactivate: 'b2b_quote' },
        stages: [
          {
            id: 'b2b_inquiry', name: '批发询盘', category: 'open', tone: 'blue', icon: 'Target', capture: 'qualify', metric: 'unread',
            goal: '识别批发/经销询盘，确认公司主体、销售区域与预计采购规模',
            sop: '当日首响 · 记录公司名称与渠道类型 · 确认预计月采购额',
            exitRule: '对方提供公司资料 → 进入资质核验',
            next: 'b2b_verify', defaultTask: '核实经销商身份与采购规模', defaultHours: 8, taskType: '首响破冰',
          },
          {
            id: 'b2b_verify', name: '资质核验', category: 'open', tone: 'jade', icon: 'ShieldCheck', capture: 'none', metric: 'unread',
            goal: '核验经销商主体、渠道与合规资质，确认可合作范围与区域',
            sop: '收集营业资料 · 核对销售区域是否冲突 · 主管确认合作资格',
            exitRule: '资质通过 → 样品试单；不符合 → 归档并注明原因',
            next: 'b2b_sample', defaultTask: '收集并核验经销商资质资料', defaultHours: 48, taskType: '需求跟进',
          },
          {
            id: 'b2b_sample', name: '样品试单', category: 'open', tone: 'gold', icon: 'PackageCheck', capture: 'none', metric: 'unread',
            goal: '寄送样品或小批量试单，收集品质与包装反馈',
            sop: '确认样品规格与寄送地址 · 同步物流单号 · 到货 3 天内回访',
            exitRule: '试用反馈良好 → 批量报价谈判',
            next: 'b2b_quote', defaultTask: '寄送样品并跟进试用反馈', defaultHours: 120, taskType: '履约回访',
          },
          {
            id: 'b2b_quote', name: '批量报价谈判', category: 'open', tone: 'gold', icon: 'FileSpreadsheet', capture: 'quote', metric: 'quotes',
            goal: '按阶梯价、起订量与账期出具批量报价，推进条款确认',
            sop: '登记阶梯报价 · 明确起订量与付款节点 · 48h 内跟进决策人反馈',
            exitRule: '条款确认并首付款到账 → 签约供货',
            next: 'b2b_supply', defaultTask: '跟进批量报价与条款确认', defaultHours: 48, taskType: '报价催单',
          },
          {
            id: 'b2b_supply', name: '签约供货', category: 'won', tone: 'purple', icon: 'BadgeCheck', capture: 'order', metric: 'ltv',
            goal: '执行首批供货，确认排期、付款与到货验收',
            sop: '登记供货订单 · 同步排期与物流 · 到货验收后确认补货节奏',
            exitRule: '首批验收完成 → 进入周期补货',
            next: 'b2b_replenish', defaultTask: '确认首批供货排期与付款节点', defaultHours: 48, taskType: '履约回访',
          },
          {
            id: 'b2b_replenish', name: '周期补货', category: 'won', tone: 'jade', icon: 'Repeat', capture: 'repurchase', metric: 'ltv',
            goal: '按经销商动销节奏维护补货周期，提前锁定下一批采购',
            sop: '补货窗口前 7 天确认库存 · 同步新品与价格调整 · 记录动销反馈',
            exitRule: '持续补货循环；长期无补货 → 暂停合作',
            next: 'b2b_quote', defaultTask: '按补货周期确认下一批采购计划', defaultHours: 240, taskType: '复购关怀',
          },
          {
            id: 'b2b_paused', name: '暂停合作', category: 'dormant', tone: 'peach', icon: 'BellRing', capture: 'dormant', metric: 'unread',
            goal: '经销商暂停进货时保持低频联系，了解原因与恢复时机',
            sop: '记录暂停原因 · 每两周低频关怀 · 新品或价格调整时主动告知',
            exitRule: '恢复采购意向 → 重激活至批量报价',
            next: 'b2b_quote', defaultTask: '了解暂停原因并约定回访时间', defaultHours: 336, taskType: '沉睡唤醒',
          },
          {
            id: 'b2b_lost', name: '合作终止', category: 'lost', tone: 'slate', icon: 'Archive', capture: 'lost', metric: 'unread',
            goal: '记录终止原因与竞品条件，保留重新合作入口',
            sop: '必填终止原因 · 结清待办 · 设观察期复盘',
            exitRule: '对方重新来询 → 重激活回流（保留历史）',
            next: 'b2b_quote', defaultTask: '合作终止观察期满复盘', defaultHours: 720, taskType: '沉睡唤醒',
          },
        ],
      },
    ];
  }

  // A minimal starting point for a brand-new pipeline.
  function lcBlankPipelineStages(makeId) {
    const lead = makeId('st'), won = makeId('st'), lost = makeId('st');
    return {
      roles: { intake: lead, quoting: '', fulfillment: won, nurture: won, reactivate: lead },
      stages: [
        { id: lead, name: '新线索', category: 'open', tone: 'blue', icon: 'UserRoundPlus', capture: 'none', metric: 'unread', goal: '', sop: '', exitRule: '', next: won, defaultTask: '首次联系并确认需求', defaultHours: 24, taskType: '首响破冰' },
        { id: won, name: '已成交', category: 'won', tone: 'purple', icon: 'BadgeCheck', capture: 'order', metric: 'ltv', goal: '', sop: '', exitRule: '', next: '', defaultTask: '成交后回访', defaultHours: 72, taskType: '履约回访' },
        { id: lost, name: '已流失', category: 'lost', tone: 'slate', icon: 'Archive', capture: 'lost', metric: 'unread', goal: '', sop: '', exitRule: '', next: lead, defaultTask: '观察期满复盘', defaultHours: 720, taskType: '沉睡唤醒' },
      ],
    };
  }

  // Structural problems an admin should see before relying on a pipeline.
  function lcPipelineIssues(pipeline) {
    const ids = new Set(pipeline.stages.map(s => s.id));
    const issues = [];
    if (!pipeline.stages.length) issues.push('流程至少需要一个阶段。');
    if (!pipeline.stages.some(s => LC_CATEGORIES[s.category]?.active)) issues.push('没有转化或成交类阶段，防漏提醒不会生效。');
    for (const [role, def] of Object.entries(LC_ROLES)) {
      const target = pipeline.roles?.[role];
      if (target && !ids.has(target)) issues.push(`「${def.label}」指向的阶段已不存在。`);
    }
    if (!pipeline.roles?.intake) issues.push('未设置「新客进线落点」，新客户将进入第一个阶段。');
    for (const s of pipeline.stages) {
      if (s.next && !ids.has(s.next)) issues.push(`阶段「${s.name}」的默认下一阶段已不存在。`);
    }
    return issues;
  }
