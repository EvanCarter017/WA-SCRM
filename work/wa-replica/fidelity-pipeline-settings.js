  // ============================================================================
  // Page: #pipelines (生命周期流程配置)
  // Lets a reviewer reshape pipelines: add / rename / reorder / delete stages,
  // map automation landing points, and create, copy or delete whole pipelines.
  // Counts here use every customer, because a stage change affects the whole team.
  // ============================================================================
  const LC_DEFAULT_LOST_REASONS = ['价格不合适', '暂无需求', '已选择其他供应商', '长期失联未回复'];
  const lcStageCustomers = stageId => data.customers.filter(c => c.stage === stageId);
  const lcPipelineCustomers = pipelineId => data.customers.filter(c => c.pipelineId === pipelineId);

  function lcCfgPipeline() {
    const p = lcPipelines().find(x => x.id === lcState.cfgPipeline) || lcBoardPipeline();
    lcState.cfgPipeline = p.id;
    return p;
  }

  function lcClonePipeline(source, name) {
    const ids = new Map(source.stages.map(s => [s.id, lcNewId('st')]));
    return {
      id: lcNewId('pl'), name, isDefault: false,
      lostReasons: [...(source.lostReasons || [])],
      roles: Object.fromEntries(Object.keys(LC_ROLES).map(role => [role, ids.get(source.roles?.[role]) || ''])),
      stages: source.stages.map(s => ({ ...s, id: ids.get(s.id), next: ids.get(s.next) || '' })),
    };
  }

  function lcUniquePipelineName(base) {
    let name = base, n = 2;
    while (lcPipelines().some(p => p.name === name)) name = `${base} ${n++}`;
    return name;
  }

  // Move customers between stages (used when a stage or pipeline is removed).
  function lcMoveCustomers(customers, targetStage, reason) {
    const hit = lcStageLookup(targetStage);
    if (!hit) return;
    for (const c of customers) {
      const prev = lcStageName(c.stage);
      c.stage = targetStage;
      c.pipelineId = hit.pipeline.id;
      c.stageEnteredAt = new Date().toISOString();
      lcLog(c.id, 'stage', `${reason}：阶段由「${prev}」调整为「${hit.pipeline.name} · ${hit.stage.name}」`, { toStage: targetStage });
    }
  }

  function renderPipelines() {
    const pipeline = lcCfgPipeline();
    const stages = lcStages(pipeline);
    const issues = lcPipelineIssues(pipeline);
    const stageSelect = (selected, emptyLabel) =>
      option('', emptyLabel, selected || '') + stages.map(s => option(s.id, `${s.code} · ${s.name}`, selected || '')).join('');

    const rows = stages.map((st, i) => {
      const count = lcStageCustomers(st.id).length;
      const roleTags = Object.entries(LC_ROLES)
        .filter(([role]) => pipeline.roles?.[role] === st.id)
        .map(([, def]) => `<span class="lc-pill info">${esc(def.label)}</span>`).join('');
      return `<tr>
        <td><div class="lc-cfg-order">
          <button type="button" class="icon-button" data-action="lcStageMove" ${fidActionID(st.id)} data-dir="-1" aria-label="上移阶段 ${esc(st.name)}" ${i === 0 ? 'disabled' : ''}>${icon('ChevronUp')}</button>
          <span>${esc(st.code)}</span>
          <button type="button" class="icon-button" data-action="lcStageMove" ${fidActionID(st.id)} data-dir="1" aria-label="下移阶段 ${esc(st.name)}" ${i === stages.length - 1 ? 'disabled' : ''}>${icon('ChevronDown')}</button>
        </div></td>
        <td style="text-align:left"><span class="lc-stage-badge ${esc(st.tone)}">${icon(st.icon)}${esc(st.name)}</span>${roleTags ? `<div class="lc-cfg-roles">${roleTags}</div>` : ''}</td>
        <td>${esc(LC_CATEGORIES[st.category]?.label || '—')}</td>
        <td style="text-align:left">${esc(LC_CAPTURES[st.capture] || LC_CAPTURES.none)}</td>
        <td>${esc(LC_METRICS[st.metric] || LC_METRICS.unread)}</td>
        <td>${st.next && lcStageLookup(st.next) ? esc(lcStageName(st.next)) : '按顺序'}</td>
        <td style="text-align:left">${esc(st.defaultTask || '—')}<span class="fid-cell-detail">${Number(st.defaultHours) || 24} 小时内 · ${esc(st.taskType || '需求跟进')}</span></td>
        <td>${count}</td>
        <td><div class="fid-icon-actions">
          ${fidButton('编辑', 'lcStageEdit', 'Pencil', 'slim', fidActionID(st.id))}
          ${fidButton('删除', 'lcStageDelete', 'Trash2', 'slim', `${fidActionID(st.id)} ${stages.length <= 1 ? 'disabled' : ''}`)}
        </div></td>
      </tr>`;
    }).join('');

    const roleFields = Object.entries(LC_ROLES).map(([role, def]) => `<label class="lc-field lc-cfg-role">
      <span>${esc(def.label)}</span>
      <select class="fid-select" data-lc-role="${role}" data-pipeline="${esc(pipeline.id)}" aria-label="${esc(def.label)}">${stageSelect(lcRoleStage(pipeline, role), '不自动变更阶段')}</select>
      <small>${esc(def.help)}</small>
    </label>`).join('');

    return `<section class="lc-page" aria-labelledby="lc-cfg-title">
      <div class="lc-wrap">
        <header class="lc-hero">
          <div class="lc-hero-title">
            <h1 id="lc-cfg-title">${icon('GitBranch')}生命周期流程配置</h1>
            <p>不同客户类型可以走不同流程。阶段的名称、数量与顺序都能调整；系统按「阶段类型」「进入时采集」与「自动流转落点」运行，与阶段叫什么无关。</p>
          </div>
          <div class="lc-hero-actions">
            ${fidButton('恢复预设流程', 'lcPipelinesReset', 'RotateCcw', '')}
            ${fidButton('新建流程', 'lcPipelineNew', 'Plus', 'gradient')}
          </div>
        </header>

        <div class="lc-sop-strip" role="note">
          <strong>${icon('Info')}原型说明：</strong>
          <span class="lc-sop-item">正式版由主管在主站统一维护，聊手只读</span>
          <span class="lc-sop-item">此处开放编辑，便于评审流程是否贴合业务</span>
          <span class="lc-sop-item">修改即时生效，客户历史记录不受影响</span>
        </div>

        <div class="lc-pipeline-bar">
          ${lcPipelineTabs(pipeline, 'lcCfgPipeline', p => lcPipelineCustomers(p.id).length)}
        </div>

        <div class="lc-card-block lc-cfg-head">
          <div class="lc-block-head">
            <h3>${icon('GitBranch')}${esc(pipeline.name)}${pipeline.isDefault ? ' <span class="lc-pill ok">默认流程</span>' : ''}</h3>
            <div class="lc-deal-actions">
              ${fidButton('流程设置', 'lcPipelineEdit', 'Settings2', 'slim', fidActionID(pipeline.id))}
              ${fidButton('复制为新流程', 'lcPipelineCopy', 'Copy', 'slim', fidActionID(pipeline.id))}
              ${fidButton('在看板查看', 'lcPipelineView', 'Kanban', 'slim tint', fidActionID(pipeline.id))}
              ${fidButton('删除流程', 'lcPipelineDelete', 'Trash2', 'slim', `${fidActionID(pipeline.id)} ${lcPipelines().length <= 1 ? 'disabled' : ''}`)}
            </div>
          </div>
          <p class="lc-cfg-chain">${esc(lcChain(pipeline))}</p>
          <div class="info-row"><span>流失原因选项</span><span>${esc((pipeline.lostReasons || []).join('、') || '未设置')}</span></div>
          ${issues.length
            ? `<ul class="lc-cfg-issues">${issues.map(x => `<li>${icon('TriangleAlert')}${esc(x)}</li>`).join('')}</ul>`
            : `<p class="lc-cfg-ok">${icon('BadgeCheck')}流程配置完整。</p>`}
        </div>

        <div class="lc-card-block">
          <div class="lc-block-head">
            <h3>${icon('ListOrdered')}阶段（${stages.length}）</h3>
            ${fidButton('新增阶段', 'lcStageAdd', 'Plus', 'slim blue')}
          </div>
          <div class="fid-table-card">${fidTable('lc-cfg-table', ['顺序', '阶段', '类型', '进入时采集', '看板指标', '默认下一阶段', '默认跟进事项', '客户数', '操作'], rows, '还没有阶段', true, 'GitBranch')}</div>
        </div>

        <div class="lc-card-block">
          <div class="lc-block-head"><h3>${icon('Zap')}自动流转落点</h3></div>
          <p class="fid-field-help" style="margin:0 0 12px">进线、报价、订单与重激活发生时，客户自动进入这里指定的阶段。选择「不自动变更阶段」即关闭该项自动流转。</p>
          <div class="lc-cfg-role-grid">${roleFields}</div>
        </div>
      </div>
    </section>`;
  }

  function openStageForm(pipelineId, stageId = '') {
    const pipeline = lcPipelines().find(p => p.id === pipelineId);
    if (!pipeline) return;
    const st = pipeline.stages.find(s => s.id === stageId);
    const val = st || { name: '', category: 'open', tone: 'blue', icon: 'Compass', capture: 'none', metric: 'unread', next: '', defaultTask: '', defaultHours: 24, taskType: '需求跟进', goal: '', sop: '', exitRule: '' };
    const others = lcStages(pipeline).filter(s => s.id !== stageId);
    const row = (label, name, placeholder) => fidFormRow(label, `<input class="fid-input" style="width:100%" name="${name}" maxlength="80" value="${esc(val[name] || '')}" placeholder="${esc(placeholder)}">`);
    fidForm(
      st ? `编辑阶段 · ${st.name}` : `新增阶段 · ${pipeline.name}`,
      'lc-stage',
      `<input type="hidden" name="pipelineId" value="${esc(pipeline.id)}">
       <input type="hidden" name="stageId" value="${esc(st?.id || '')}">
       ${fidFormRow('阶段名称', `<input class="fid-input" style="width:100%" name="name" required maxlength="12" value="${esc(val.name)}" placeholder="如：样品试用">`, '', true)}
       ${fidFormRow('阶段类型', `<select class="fid-select" style="width:100%" name="category">${Object.entries(LC_CATEGORIES).map(([id, def]) => option(id, `${def.label}（${def.active ? '需持续跟进，无待办时提示断档' : '不计入断档，客户来信可重激活'}）`, val.category)).join('')}</select>`)}
       ${fidFormRow('进入时采集', `<select class="fid-select" style="width:100%" name="capture">${Object.entries(LC_CAPTURES).map(([id, label]) => option(id, label, val.capture)).join('')}</select>`)}
       ${fidFormRow('看板指标', `<select class="fid-select" style="width:100%" name="metric">${Object.entries(LC_METRICS).map(([id, label]) => option(id, label, val.metric)).join('')}</select>`)}
       ${fidFormRow('默认下一阶段', `<select class="fid-select" style="width:100%" name="next">${option('', '按顺序进入下一个阶段', val.next || '')}${others.map(s => option(s.id, `${s.code} · ${s.name}`, val.next || '')).join('')}</select>`)}
       ${st ? '' : fidFormRow('插入位置', `<select class="fid-select" style="width:100%" name="after">${option('', '排在最后', '')}${others.map(s => option(s.id, `排在「${s.name}」之后`, '')).join('')}</select>`)}
       ${row('默认跟进事项', 'defaultTask', '进入该阶段时自动带出的待办标题')}
       ${fidFormRow('跟进时限', `<span class="lc-cfg-inline"><input class="fid-input" type="number" min="1" max="2160" step="1" name="defaultHours" value="${esc(Number(val.defaultHours) || 24)}"><span>小时内</span><select class="fid-select" name="taskType" aria-label="待办类型">${LC_TASK_TYPES.map(t => option(t, t, val.taskType)).join('')}</select></span>`)}
       ${fidFormRow('图标与颜色', `<span class="lc-cfg-inline"><select class="fid-select" name="icon" aria-label="阶段图标">${LC_STAGE_ICONS.map(([id, label]) => option(id, label, val.icon)).join('')}</select><select class="fid-select" name="tone" aria-label="阶段颜色">${LC_TONES.map(([id, label]) => option(id, label, val.tone)).join('')}</select></span>`)}
       ${row('阶段目标', 'goal', '选填：这个阶段要达成什么')}
       ${row('标准动作', 'sop', '选填：聊手在这个阶段的标准动作')}
       ${row('出口条件', 'exitRule', '选填：满足什么条件进入下一阶段')}`,
      '保存阶段',
      { wide: true }
    );
  }

  function openStageDelete(stageId) {
    const hit = lcStageLookup(stageId);
    if (!hit) return;
    if (hit.pipeline.stages.length <= 1) return toast('流程至少保留一个阶段。');
    const affected = lcStageCustomers(stageId);
    const others = lcStages(hit.pipeline).filter(s => s.id !== stageId);
    fidForm(
      `删除阶段 · ${hit.stage.name}`,
      'lc-stage-delete',
      `<input type="hidden" name="stageId" value="${esc(stageId)}">
       <p class="fid-field-help" style="margin:0 0 12px">${affected.length
         ? `该阶段下有 ${affected.length} 位客户，删除前需迁移到其他阶段。客户的聊天、报价、订单与轨迹全部保留。`
         : '该阶段下没有客户，可直接删除。'}指向该阶段的自动流转落点与「默认下一阶段」会被清空。</p>
       ${affected.length ? fidFormRow('客户迁移至', `<select class="fid-select" style="width:100%" name="moveTo">${others.map(s => option(s.id, `${s.code} · ${s.name}`, others[0].id)).join('')}</select>`, '', true) : ''}`,
      '确认删除'
    );
  }

  function openPipelineForm(pipelineId = '') {
    const p = lcPipelines().find(x => x.id === pipelineId);
    fidForm(
      p ? `流程设置 · ${p.name}` : '新建客户流程',
      'lc-pipeline',
      `<input type="hidden" name="pipelineId" value="${esc(p?.id || '')}">
       ${fidFormRow('流程名称', `<input class="fid-input" style="width:100%" name="name" required maxlength="16" value="${esc(p?.name || '')}" placeholder="如：复购老客、代理商">`, '', true)}
       ${p ? '' : fidFormRow('起始模板', `<select class="fid-select" style="width:100%" name="template">${option('', '空白流程（新线索 → 已成交 / 已流失）', '')}${lcPipelines().map(x => option(x.id, `复制「${x.name}」的 ${x.stages.length} 个阶段`, '')).join('')}</select>`)}
       ${fidFormRow('流失原因', `<textarea class="fid-input lc-cfg-textarea" name="lostReasons" rows="5" placeholder="每行一个原因；新建时留空则沿用模板">${esc((p?.lostReasons || []).join('\n'))}</textarea>`)}
       <label class="lc-cfg-check"><input type="checkbox" name="isDefault" value="1" ${p?.isDefault ? 'checked disabled' : ''}> 设为默认流程（未指定流程的新客户进入此流程）</label>`,
      '保存流程',
      { wide: true }
    );
  }

  function openPipelineDelete(pipelineId) {
    const p = lcPipelines().find(x => x.id === pipelineId);
    if (!p) return;
    if (lcPipelines().length <= 1) return toast('至少保留一个客户流程。');
    const affected = lcPipelineCustomers(p.id);
    const others = lcPipelines().filter(x => x !== p);
    const preferred = lcIntakeStage(others.find(x => x.isDefault) || others[0]);
    fidForm(
      `删除流程 · ${p.name}`,
      'lc-pipeline-delete',
      `<input type="hidden" name="pipelineId" value="${esc(p.id)}">
       <p class="fid-field-help" style="margin:0 0 12px">${affected.length
         ? `该流程下有 ${affected.length} 位客户，需迁移到其他流程的指定阶段。历史记录全部保留。`
         : '该流程下没有客户，可直接删除。'}${p.isDefault ? '删除后，迁移目标所在流程将成为默认流程。' : ''}</p>
       ${affected.length ? fidFormRow('客户迁移至', `<select class="fid-select" style="width:100%" name="moveTo">${others.map(o => `<optgroup label="${esc(o.name)}">${lcStages(o).map(s => option(s.id, `${o.name} · ${s.code} · ${s.name}`, preferred)).join('')}</optgroup>`).join('')}</select>`, '', true) : ''}`,
      '确认删除'
    );
  }

  Object.assign(fidActions, {
    lcCfgPipeline: id => { lcState.cfgPipeline = id; render(); },
    lcPipelineView: id => { lcState.pipeline = id; lcState.stageFilter = 'all'; lcState.radar = 'all'; navigate('lifecycle'); },
    lcStageAdd: () => openStageForm(lcCfgPipeline().id),
    lcStageEdit: id => { const hit = lcStageLookup(id); if (hit) openStageForm(hit.pipeline.id, id); },
    lcStageDelete: id => openStageDelete(id),
    lcStageMove: (id, btn) => {
      const hit = lcStageLookup(id);
      const to = hit ? hit.index + Number(btn?.dataset?.dir || 0) : -1;
      if (!hit || to < 0 || to >= hit.pipeline.stages.length || to === hit.index) return;
      const list = hit.pipeline.stages;
      [list[hit.index], list[to]] = [list[to], list[hit.index]];
      persist();
      render();
      document.querySelector(`[data-action="lcStageMove"][data-id="${CSS.escape(id)}"][data-dir="${btn.dataset.dir}"]:not([disabled])`)?.focus();
    },
    lcPipelineNew: () => openPipelineForm(),
    lcPipelineEdit: id => openPipelineForm(id),
    lcPipelineDelete: id => openPipelineDelete(id),
    lcPipelineCopy: id => {
      const source = lcPipelines().find(p => p.id === id);
      if (!source) return;
      const copy = lcClonePipeline(source, lcUniquePipelineName(source.name + ' 副本'));
      data.pipelines.push(copy);
      lcState.cfgPipeline = copy.id;
      persist();
      render();
      toast(`已复制为「${copy.name}」，可在此基础上调整阶段。`);
    },
    lcPipelinesReset: () => fidForm(
      '恢复预设流程',
      'lc-pipelines-reset',
      `<p class="fid-field-help" style="margin:0">将流程恢复为预设的「零售客户」与「大B经销商」。自定义流程和阶段会被移除；不在预设阶段中的客户回到默认流程的进线阶段，历史记录保留。</p>`,
      '确认恢复'
    ),
  });

  Object.assign(fidForms, {
    'lc-stage-form': (f, v) => {
      const pipeline = lcPipelines().find(p => p.id === v('pipelineId'));
      if (!pipeline) return;
      const name = v('name');
      if (!name) return error('请填写阶段名称。');
      const existing = pipeline.stages.find(s => s.id === v('stageId'));
      if (pipeline.stages.some(s => s !== existing && s.name === name)) return error('该流程中已有同名阶段，请换一个名称。');
      const pick = (table, key, fallback) => Object.hasOwn(table, v(key)) ? v(key) : fallback;
      const values = {
        name,
        category: pick(LC_CATEGORIES, 'category', 'open'),
        capture: pick(LC_CAPTURES, 'capture', 'none'),
        metric: pick(LC_METRICS, 'metric', 'unread'),
        icon: LC_STAGE_ICONS.some(([id]) => id === v('icon')) ? v('icon') : 'Compass',
        tone: LC_TONES.some(([id]) => id === v('tone')) ? v('tone') : 'blue',
        next: pipeline.stages.some(s => s.id === v('next') && s !== existing) ? v('next') : '',
        defaultTask: v('defaultTask') || `跟进「${name}」阶段客户`,
        defaultHours: Math.min(2160, Math.max(1, Math.round(Number(v('defaultHours')) || 24))),
        taskType: LC_TASK_TYPES.includes(v('taskType')) ? v('taskType') : '需求跟进',
        goal: v('goal'), sop: v('sop'), exitRule: v('exitRule'),
      };
      if (existing) {
        Object.assign(existing, values);
      } else {
        const after = pipeline.stages.findIndex(s => s.id === v('after'));
        pipeline.stages.splice(after >= 0 ? after + 1 : pipeline.stages.length, 0, { id: lcNewId('st'), ...values });
      }
      persist();
      close();
      render();
      toast(existing ? `阶段「${name}」已更新。` : `已在「${pipeline.name}」新增阶段「${name}」。`);
    },

    'lc-stage-delete-form': (f, v) => {
      const hit = lcStageLookup(v('stageId'));
      if (!hit || hit.pipeline.stages.length <= 1) return;
      const affected = lcStageCustomers(hit.stage.id);
      if (affected.length) {
        const target = lcStageLookup(v('moveTo'));
        if (!target || target.pipeline !== hit.pipeline || target.stage === hit.stage) return error('请选择要迁移到的阶段。');
        lcMoveCustomers(affected, target.stage.id, `阶段「${hit.stage.name}」已删除`);
      }
      const { pipeline, stage } = hit;
      pipeline.stages.splice(hit.index, 1);
      for (const role of Object.keys(LC_ROLES)) if (pipeline.roles?.[role] === stage.id) pipeline.roles[role] = '';
      for (const s of pipeline.stages) if (s.next === stage.id) s.next = '';
      if (lcState.stageFilter === stage.id) lcState.stageFilter = 'all';
      persist();
      close();
      render();
      toast(`已删除阶段「${stage.name}」${affected.length ? `，${affected.length} 位客户已迁移` : ''}。`);
    },

    'lc-pipeline-form': (f, v) => {
      const name = v('name');
      if (!name) return error('请填写流程名称。');
      const existing = lcPipelines().find(p => p.id === v('pipelineId'));
      if (lcPipelines().some(p => p !== existing && p.name === name)) return error('已存在同名流程，请换一个名称。');
      const reasons = [...new Set(String(f.get('lostReasons') || '').split('\n').map(x => x.trim()).filter(Boolean))].slice(0, 20);
      let target = existing;
      if (!target) {
        const source = lcPipelines().find(p => p.id === v('template'));
        target = source
          ? lcClonePipeline(source, name)
          : { id: lcNewId('pl'), name, isDefault: false, lostReasons: [...LC_DEFAULT_LOST_REASONS], ...lcBlankPipelineStages(lcNewId) };
        data.pipelines.push(target);
      }
      target.name = name;
      if (reasons.length) target.lostReasons = reasons;
      else if (existing || !target.lostReasons?.length) target.lostReasons = [...LC_DEFAULT_LOST_REASONS];
      if (f.get('isDefault') === '1') for (const p of data.pipelines) p.isDefault = p === target;
      lcState.cfgPipeline = target.id;
      persist();
      close();
      render();
      toast(existing ? `流程「${name}」已更新。` : `已新建流程「${name}」。`);
    },

    'lc-pipeline-delete-form': (f, v) => {
      const p = lcPipelines().find(x => x.id === v('pipelineId'));
      if (!p || lcPipelines().length <= 1) return;
      const affected = lcPipelineCustomers(p.id);
      const target = lcStageLookup(v('moveTo'));
      if (affected.length) {
        if (!target || target.pipeline === p) return error('请选择要迁移到的流程阶段。');
        lcMoveCustomers(affected, target.stage.id, `流程「${p.name}」已删除`);
      }
      data.pipelines.splice(data.pipelines.indexOf(p), 1);
      if (p.isDefault) (target?.pipeline || data.pipelines[0]).isDefault = true;
      if (lcState.pipeline === p.id) lcState.pipeline = '';
      lcState.cfgPipeline = '';
      lcState.stageFilter = 'all';
      persist();
      close();
      render();
      toast(`已删除流程「${p.name}」${affected.length ? `，${affected.length} 位客户已迁移` : ''}。`);
    },

    'lc-pipelines-reset-form': () => {
      data.pipelines = lcPresetPipelines();
      Object.assign(lcState, { pipeline: '', cfgPipeline: '', stageFilter: 'all' });
      for (const c of data.customers) lcNormalizeCustomer(c);
      persist();
      close();
      render();
      toast('已恢复预设流程。');
    },
  });

  // Automation landing points save as soon as they are changed.
  document.addEventListener('change', e => {
    const t = e.target;
    const role = t.dataset?.lcRole;
    if (!role || !Object.hasOwn(LC_ROLES, role)) return;
    const p = lcPipelines().find(x => x.id === t.dataset.pipeline);
    if (!p) return;
    p.roles ||= {};
    p.roles[role] = p.stages.some(s => s.id === t.value) ? t.value : '';
    persist();
    render();
    toast(`「${LC_ROLES[role].label}」已更新为：${p.roles[role] ? lcStageName(p.roles[role]) : '不自动变更阶段'}。`);
  });
