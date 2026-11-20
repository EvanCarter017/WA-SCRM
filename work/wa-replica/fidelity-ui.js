  // Presentation and demo interactions for the measured reference layout.
  const fid = { tagChecked:new Set(), accountChecked:new Set(), customerTags:[],
    customerCountry:'all', customerType:'all', customerField:'name', customerStart:'',customerEnd:'',customerPlatform:true,
    accountField:'name',accountPlatform:true,accountChannel:'all',
    orgOpen:true, operationsOpen:true, roleState:'all', memberFilter:{id:'',name:'',role:'all',status:'all'},
    waTab:new URLSearchParams(location.search).get('tab')==='numbers'?'numbers':'chat', chatOpen:false, followMode:'history',
    logFilter:{start:'',end:'',app:'all',field:'customer',query:''} };
  const oldFollowupView = renderFollowups;
  const customerMenu = ['customers','chat-records','tags','tag-stats','followups'];
  const operationsMenu = ['materials'];
  const fidDate = v => !v ? '—' : Number.isNaN(new Date(v).getTime()) ? String(v) : new Date(v).toLocaleString('sv-SE').slice(0,16);
  const fidDay = (offset=0) => new Date(Date.now()+offset*86400000).toISOString();
  const fidStages = ['新客户','跟进中','已报价','已成交','培育中'];
  const fidPerms = ['账号列表','WhatsApp API','客户列表','标签管理','跟进记录'];
  const fidMemberRole = m => m?.roleGroup || (m?.role==='manager'?'lead':'agent');
  const fidRole = id => data.roleGroups.find(r=>r.id===id);
  const fidGroupList = () => data.tagGroups.filter(g=>g.scope==='team'||g.owner===ui.persona||manager());
  const fidBaseTags=tagsHTML;
  tagsHTML=function(c,max=99,remove=false){const allowed=new Set(myTags().map(t=>t.id));return fidBaseTags({...c,tags:c.tags.filter(id=>allowed.has(id))},max,remove);};
  const fidLegacyTagLabels = {interest:['意向标记','multi'],source:['来源渠道','single'],preference:['沟通语言','single'],personal:['工作标记','multi']};
  function fidRemovePresetTags() {
    if (data.presetTagsRemoved) return;
    const seed = window.WA_DEMO;
    const legacyTags = new Map(seed.tags.map(t=>[t.id,t]));
    const legacyGroups = new Map(seed.tagGroups.map(g=>[g.id,g]));
    const legacyAssignments = new Map(seed.customers.map(c=>[c.id,new Set(c.tags)]));
    const presetGroups = new Set(data.tagGroups.filter(g=>{
      const original = legacyGroups.get(g.id);
      return original && g.name===original.name && g.scope===original.scope && g.owner===original.owner;
    }).map(g=>g.id));
    const retained = new Set(data.customers.flatMap(c=>c.tags.filter(id=>!legacyAssignments.get(c.id)?.has(id))));
    for (const d of data.tagDefs || []) {
      const label = fidLegacyTagLabels[d.group];
      const edited = !label || d.id!=='def-'+d.group || d.name!==label[0] || d.mode!==label[1] || d.values.some(id=>legacyTags.get(id)?.group!==d.group);
      if (edited) d.values.forEach(id=>retained.add(id));
    }
    const removed = new Set();
    for (const t of data.tags) {
      const original = legacyTags.get(t.id);
      const untouched = original && presetGroups.has(t.group) && t.name===original.name && t.group===original.group && t.color===original.color;
      if (untouched && !retained.has(t.id)) removed.add(t.id);
    }
    data.tags = data.tags.filter(t=>!removed.has(t.id));
    for (const c of data.customers) c.tags = c.tags.filter(id=>!removed.has(id));
    const groupsInUse = new Set(data.tags.map(t=>t.group));
    data.tagGroups = data.tagGroups.filter(g=>!presetGroups.has(g.id) || groupsInUse.has(g.id));
    const exampleHistory = seed.activities.c1.find(entry=>entry.text.startsWith('加入标签'));
    if ((removed.has('high') || removed.has('quote')) && exampleHistory && data.activities.c1) {
      data.activities.c1 = data.activities.c1.filter(item=>item.by!==exampleHistory.by || item.time!==exampleHistory.time || ![exampleHistory.text,'加入标签「待报价」'].includes(item.text));
    }
    data.presetTagsRemoved = true;
  }
  function fidMigrateTags() {
    fidRemovePresetTags();
    if (!Array.isArray(data.tagDefs)) return;

    // Older definitions already stored each value as a tag and assigned its ID to customers.
    const tagIds = new Map();
    const aliases = new Map();
    data.tags = data.tags.filter(t=>{
      const key = JSON.stringify([t.group,t.name.trim().toLowerCase()]);
      const existing = tagIds.get(key);
      if (existing) {
        aliases.set(t.id,existing);
        return false;
      }
      tagIds.set(key,t.id);
      return true;
    });
    if (aliases.size) {
      for (const c of data.customers) c.tags = [...new Set(c.tags.map(id=>aliases.get(id)??id))];
    }
    delete data.tagDefs;
  }
  function fidSeed() {
    fidMigrateTags();
    if (!Array.isArray(data.roleGroups)) data.roleGroups=[
      {id:'lead',name:'主管',enabled:true,view:[...fidPerms],write:[...fidPerms],created:fidDay(-7),builtIn:true},
      {id:'agent',name:'聊手',enabled:true,view:[...fidPerms],write:['WhatsApp API','客户列表','跟进记录'],created:fidDay(-7),builtIn:true},
    ];
    for (const [i,c] of data.customers.entries()) {
      c.createdAt ||= fidDay(-i-2);
      c.updatedAt ||= fidDay(-Math.min(i,3));
      c.clientType ||= i===4?'新增线索-补录':c.contactRefs?.length>1?'重复线索':'新增线索-实时';
    }
  }
  fidSeed();
  ui.pageSizes.customers=20; ui.pageSizes.followups=20;
  ui.tagGroup=(fidGroupList().find(canEditGroup)||fidGroupList()[0])?.id||'all';
  ui.openTabs=[...new Set(['dashboard','accounts','inbox',...customerMenu,...ui.openTabs])];

  function fidButton(label, action, glyph='', style='', attrs='') {
    return `<button type="button" class="fid-btn ${style}" ${action?`data-action="${action}"`:''} ${attrs}>${glyph?icon(glyph):''}${esc(label)}</button>`;
  }
  function fidIcon(label,action,glyph,id='',extra='') {
    return `<button class="icon-button ${extra}" data-action="${action}" data-id="${esc(id)}" aria-label="${esc(label)}">${icon(glyph)}</button>`;
  }
  const fidActionID = id => `data-id="${esc(id)}"`;
  const fidOption = (values,value) => values.map(x=>Array.isArray(x)?option(x[0],x[1],value):option(x,x,value)).join('');
  const fidHead = (title,description='') => `<div class="fid-heading"><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>`;
  function fidTable(cls,columns,rows,emptyLabel='暂无数据',large=false,emptyIcon='Inbox') {
    return `<div class="fid-table-scroll" tabindex="0" aria-label="${esc(views[ui.view])}表格"><table class="fid-table ${cls}"><colgroup>${columns.map(()=>'<col>').join('')}</colgroup><thead><tr>${columns.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows||fidEmptyRow(columns.length,emptyLabel,large,emptyIcon)}</tbody></table></div>`;
  }
  function fidEmptyRow(cols,label,large=false,glyph='Inbox') {
    return `<tr><td class="${large?'fid-large-empty':'fid-plain-empty'}" colspan="${cols}">${large?`<div class="fid-empty">${icon(glyph)}<span>${esc(label)}</span></div>`:esc(label)}</td></tr>`;
  }
  function fidPager(total,key,choices=[10,20,50,100]) {
    const size=ui.pageSizes[key]||10, max=Math.max(1,Math.ceil(total/size)), page=Math.min(max,(ui.pages[key]||0)+1), label=views[key]||'记录';
    return `<div class="fid-pager" id="${key}-pager"><span>共 ${total} 条</span><select class="fid-select" data-page-size="${key}" aria-label="${label}每页数量">${choices.map(n=>option(String(n),n+'条/页',String(size))).join('')}</select><button data-action="turnPage" data-id="-1" data-view="${key}" aria-label="上一页" ${page<=1?'disabled':''}>${icon('ChevronLeft')}</button><span class="fid-page-number" aria-current="page">${page}</span><button data-action="turnPage" data-id="1" data-view="${key}" aria-label="下一页" ${page>=max?'disabled':''}>${icon('ChevronRight')}</button><span class="fid-jump">前往</span><input class="fid-input fid-jump" type="number" min="1" max="${max}" value="${page}" data-page-jump="${key}" aria-label="${label}页码"><span class="fid-jump">页</span></div>`;
  }
  function fidDialog(title,body,footer='',wide=false) {
    modal(title,body,footer); $('#dialog').classList.add('fid-dialog'); if(wide)$('#dialog').classList.add('fid-wide');
  }
  function fidForm(title,id,body,submit='确 定',opts={}) {
    const save=`<button type="submit" class="fid-btn blue">${esc(submit)}</button>`, closeButton=fidButton('取 消','close');
    fidDialog(title,`<form id="${id}-form" novalidate><div class="modal-body">${body}<div id="form-error" class="form-error" role="alert"></div></div><div class="modal-footer">${opts.saveLast?closeButton+save:save+closeButton}</div></form>`,'',opts.wide);
    $('#dialog form input:not([type="hidden"]):not([disabled])')?.focus();
  }
  const fidFormRow = (label,content,field='',required=false) => `<div class="fid-form-row">${field?`<label for="${field}">`:'<span class="fid-form-label">'}${required?'<b class="fid-required">*</b>':''}${esc(label)}${field?'</label>':'</span>'}<div>${content}</div></div>`;
  function fidCountField(id,name,value,max,placeholder,required=false) {
    return `<span class="fid-count-field"><input class="fid-input" id="${id}" name="${name}" value="${esc(value)}" maxlength="${max}" placeholder="${esc(placeholder)}" ${required?'required':''} data-fid-count><span class="fid-count" aria-hidden="true">${String(value).length} / ${max}</span></span>`;
  }
  function fidConfirm(title,message,action,id='',style='blue') {
    fidDialog(title,`<div class="modal-body"><p>${esc(message)}</p></div>`,fidButton('确 定',action,'',style,fidActionID(id))+fidButton('取 消','close'));
  }

  viewIcon = id => ({dashboard:'LayoutDashboard',inbox:'MessageCircle',accounts:'Smartphone',customers:'ContactRound','chat-records':'MessagesSquare',tags:'Tags','tag-stats':'ChartColumn',followups:'ClipboardList',materials:'Images',team:'Network',members:'UsersRound',scope:'SlidersHorizontal'}[id]||'FileText');
  menuLink = function(id,label,child=false,mobile=false) {
    return `<a class="nav-item ${ui.view===id?'active':''} ${id==='scope'?'scope-link':''}" href="#${id}" data-nav="${id}" aria-label="${esc(label)}" title="${esc(label)}" ${ui.view===id?'aria-current="page"':''}>${icon(viewIcon(id))}<span class="nav-label">${esc(label)}</span>${id==='scope'&&!mobile?'<span class="nav-count" id="pending-count"></span>':''}</a>`;
  };
  menuHTML = function(mobile=false) {
    const navGroup=(title,glyph,action,opened,ids)=>`<button class="nav-group-button ${ids.includes(ui.view)?'group-active':''}" data-action="${action}" aria-expanded="${opened}">${icon(glyph)}<span class="nav-label">${title}</span>${icon(opened?'ChevronUp':'ChevronDown')}</button><div class="submenu" ${opened?'':'hidden'}>${ids.map(id=>menuLink(id,views[id],true)).join('')}</div>`;
    return menuLink('dashboard',views.dashboard)+menuLink('accounts',views.accounts)+menuLink('inbox',views.inbox)+'<div class="nav-caption">客户运营</div>'+navGroup('客户管理','ContactRound','fidNavCustomers',ui.customerNavOpen,customerMenu)+navGroup('运营管理','ChartColumn','fidNavOperations',fid.operationsOpen,operationsMenu)+(manager()?'<div class="nav-caption">账户与组织</div>'+navGroup('组织管理','Network','fidNavOrg',fid.orgOpen,['team','members']):'')+'<div class="nav-caption">工作台设置</div>'+menuLink('scope',views.scope,false,mobile);
  };

  const fidTagCount = (id, customers=myCustomers()) => customers.filter(c=>c.tags.includes(id)).length;
  const fidGroupForCreate = () => ui.tagGroup==='all' ? fidGroupList().find(canEditGroup) : group(ui.tagGroup);
  renderTags = function() {
    const groups=fidGroupList();
    if (!groups.length) {
      ui.tagGroup='all';
      return `<section class="fid-page"><div class="fid-panel">${fidHead('标签管理')}<div class="fid-tag-setup">
        ${icon('Tags')}<h2>还没有标签分组</h2><p>创建分组后可添加标签。</p>
        ${fidButton('添加分组','fidGroupAdd','Plus','blue')}
      </div></div></section>`;
    }
    if(ui.tagGroup!=='all'&&!groups.some(g=>g.id===ui.tagGroup))ui.tagGroup=groups[0].id;
    const tags=myTags(), customers=myCustomers();
    const list=tags.filter(t=>(ui.tagGroup==='all'||ui.tagGroup===t.group)&&fidMatch(t.name,ui.tagQuery));
    const selected=group(ui.tagGroup), candidate=fidGroupForCreate(), editable=candidate&&canEditGroup(candidate);
    const gRow=(id,label,g)=>`<div class="fid-group-row ${ui.tagGroup===id?'active':''}"><button data-action="fidGroupSelect" ${fidActionID(id)} aria-pressed="${ui.tagGroup===id}" title="${esc(label)}">${esc(label)}</button>${g&&canEditGroup(g)?fidIcon('编辑分组'+g.name,'fidGroupEdit','SquarePen',g.id)+fidIcon('删除分组'+g.name,'fidGroupDelete','Trash2',g.id,'fid-danger'):''}</div>`;
    const rows=paged(list,'tags').map(t=>{
      const g=group(t.group), canEdit=canEditGroup(g);
      return `<tr>
        <td><input type="checkbox" data-fid-tag-select="${esc(t.id)}" aria-label="选择标签${esc(t.name)}" ${fid.tagChecked.has(t.id)?'checked':''} ${canEdit?'':'disabled'}></td>
        <td><button class="tag ${esc(t.color)}" data-action="fidTagCustomers" ${fidActionID(t.id)}>${esc(t.name)}</button></td>
        <td>${esc(g.name)}</td>
        <td><button class="fid-link" data-action="fidTagCustomers" ${fidActionID(t.id)} aria-label="查看${esc(t.name)}客户">${fidTagCount(t.id,customers)}</button></td>
        <td><div class="fid-icon-actions">${canEdit?fidIcon('编辑标签'+t.name,'fidTagEdit','SquarePen',t.id)+fidIcon('删除标签'+t.name,'fidTagDelete','Trash2',t.id,'fid-danger'):'<span class="muted">仅查看</span>'}</div></td>
      </tr>`;
    }).join('');
    const columns=['<input id="fid-tag-all" type="checkbox" aria-label="全选可维护标签">','标签','分组','客户数','操作'];
    return `<section class="fid-page"><div class="fid-panel">
      ${fidHead('标签管理')}
      <div class="fid-filter-row fid-tag-query"><input class="fid-input" id="replica-tag-search" placeholder="搜索标签" aria-label="搜索标签" value="${esc(ui.tagQuery)}">${fidButton('搜索','queryTags','Search','blue')}${fidButton('重选','fidTagReset','RotateCw')}</div>
      <div class="fid-actions fid-tag-actions">${fidButton('添加标签','fidTagAdd','Plus','tint',editable?'':'disabled title="请选择可维护的分组"')}${fidButton('批量删除','fidTagBatchDelete','Trash2','',fid.tagChecked.size?'':'disabled')}${selected?.scope==='private'?'<span class="fid-small-note">个人分组</span>':''}</div>
      <div class="fid-tag-layout"><aside class="fid-tag-groups" aria-label="标签分组">
        ${gRow('all','全部分组',null)}${groups.map(g=>gRow(g.id,`${g.name} (${tags.filter(t=>t.group===g.id).length})`,g)).join('')}
        <button class="fid-btn fid-group-add" data-action="fidGroupAdd">${icon('Plus')}添加分组</button>
      </aside><div>${fidTable('fid-tag-table',columns,rows,ui.tagQuery?'没有匹配的标签':'此分组还没有标签')}${fidPager(list.length,'tags')}</div></div>
    </div></section>`;
  };
  function fidTagEdit(id) {
    const t=tag(id),g=id?group(t?.group):fidGroupForCreate();
    if(!g||!canEditGroup(g)) return toast('选择可维护的分组后再添加标签。');
    fidForm(t?'编辑标签':'添加标签','fid-tag',`<input type="hidden" name="id" value="${esc(t?.id||'')}"><input type="hidden" name="group" value="${esc(g.id)}">
      ${fidFormRow('所属分组',`<span class="fid-tag-group-label">${esc(g.name)}</span>`)}
      ${fidFormRow('标签',fidCountField('fid-tag-name','name',t?.name||'',30,'输入标签内容',true),'fid-tag-name',true)}`,'保存');
  }
  function fidGroupEdit(id) {
    const g=group(id);if(g&&!canEditGroup(g))return;
    fidForm(g?'编辑分组':'添加分组','fid-group',`<input name="id" type="hidden" value="${esc(id||'')}">${fidFormRow('分组名称',fidCountField('fid-group-name','name',g?.name||'',20,'请输入分组名称',true),'fid-group-name',true)}${manager()&&!g?fidFormRow('适用范围',`<select id="fid-group-scope" name="scope" class="fid-select">${fidOption([['team','公共分组'],['private','个人分组']],'team')}</select>`,'fid-group-scope'):''}`);
  }
  function fidRemoveTags(ids) {
    const selected=myTags().filter(t=>ids.includes(t.id)&&canEditGroup(group(t.group)));
    if (!selected.length) return;
    const originalTags=data.tags.slice();
    const removed=new Set(selected.map(t=>t.id));
    const assignments=new Map();
    for (const c of data.customers) {
      const assigned=c.tags.filter(id=>removed.has(id));
      if (!assigned.length) continue;
      assignments.set(c.id,assigned);
      c.tags=c.tags.filter(id=>!removed.has(id));
    }
    data.tags=data.tags.filter(t=>!removed.has(t.id));
    fid.customerTags=fid.customerTags.filter(id=>!removed.has(id));
    if (removed.has(ui.customerTag)) ui.customerTag='all';
    fid.tagChecked.clear();
    persist();close();render();
    toast('已删除 '+selected.length+' 个演示标签。',()=>{
      data.tags=originalTags;
      for (const [id,tags] of assignments) {
        const c=customer(id);
        if (c) c.tags=[...new Set([...c.tags,...tags])];
      }
      persist();render();
    });
  }
  function fidTagChoices(checked) {
    const tags=myTags();
    return fidGroupList().map(g=>{
      const values=tags.filter(t=>t.group===g.id).map(t=>`<label class="fid-choice" data-fid-tag-label="${esc(t.name.toLowerCase())}">
        <input type="checkbox" name="tags" value="${esc(t.id)}" ${checked.includes(t.id)?'checked':''}>
        <span class="tag ${esc(t.color)}">${esc(t.name)}</span>
      </label>`).join('');
      return values?`<section><h3>${esc(g.name)}</h3>${values}</section>`:'';
    }).join('');
  }
  function fidOpenTagPicker(title,formId,checked,{ids=[],submit}={}) {
    const choices=fidTagChoices(checked);
    const manage=`<a class="fid-btn ${choices?'':'blue'}" href="#tags" data-nav="tags">${icon('Settings2')}管理标签</a>`;
    if (!choices) {
      fidDialog(title,'<div class="modal-body"><p class="fid-empty">还没有标签</p></div>',fidButton('取消','close')+manage);
      return;
    }
    const targets=ids.length?`<input type="hidden" name="ids" value="${esc(ids.join(','))}">`:'';
    fidForm(title,formId,`${targets}<div class="fid-tag-picker-tools"><input class="fid-input" id="fid-choice-search" aria-label="搜索可用标签" placeholder="搜索标签">${manage}</div><div class="fid-tag-picker">${choices}<p class="fid-tag-no-match" role="status" hidden>没有匹配的标签</p></div>`,submit);
  }
  function fidOpenTagFilter() {
    fidOpenTagPicker('按标签筛选客户','fid-tag-filter',fid.customerTags,{submit:'筛选'});
  }
  openTagAssign = function(ids) {
    const records=ids.map(customer).filter(c=>c&&myCustomers().includes(c));if(!records.length)return toast('请先选择客户。');
    fidOpenTagPicker(records.length===1?'设置客户标签':'批量打标签','fid-tag-assign',records.length===1?records[0].tags:[],{ids:records.map(c=>c.id),submit:'保存'});
  };

  function fidViewCustomerTags(id) {
    const c=myCustomers().find(item=>item.id===id);
    if(!c)return;
    const assigned=myTags().filter(t=>c.tags.includes(t.id));
    const sections=fidGroupList().map(g=>{
      const tags=assigned.filter(t=>t.group===g.id);
      if(!tags.length)return '';
      const items=tags.map(t=>`<li class="tag ${esc(t.color)}">${esc(t.name)}</li>`).join('');
      return `<section><h3>${esc(g.name)}</h3><ul role="list">${items}</ul></section>`;
    }).join('');
    fidDialog('客户标签',`<div class="modal-body">
      <div class="fid-customer-tag-summary"><strong>${esc(c.name)}</strong><small>共 ${assigned.length} 个标签</small></div>
      ${sections?`<div class="fid-tag-picker fid-customer-tag-list">${sections}</div>`:'<p class="fid-customer-tag-empty">该客户还没有标签。</p>'}
    </div>`,fidButton('关闭','close'));
  }

  const fidInRange=(date,start,end)=>{const day=fidDate(date).slice(0,10);return (!start||day>=start)&&(!end||day<=end)};
  const fidMatch=(s,q)=>String(s??'').toLowerCase().includes(q.trim().toLowerCase());
  const fidPhoneDigits = value => String(value ?? '').replace(/\D/g, '');
  const fidCustomerHasTags=c=>fid.customerTags.every(id=>c.tags.includes(id));
  filteredCustomers = function() {
    return myCustomers().filter(c=>{
      if(!fid.customerPlatform || fid.customerCountry!=='all'&&c.country!==fid.customerCountry || fid.customerType!=='all'&&c.clientType!==fid.customerType)return false;
      if(ui.customerStage!=='all'&&c.stage!==ui.customerStage||manager()&&ui.customerOwner!=='all'&&c.owner!==ui.customerOwner)return false;
      if(!fidInRange(c.createdAt,fid.customerStart,fid.customerEnd)||!fidCustomerHasTags(c)||ui.customerTag!=='all'&&!c.tags.includes(ui.customerTag))return false;
      const fields={name:c.name,phone:c.phone,account:account(c.account)?.name,note:c.notes,source:c.source};
      return fidMatch(fields[fid.customerField],ui.customerQuery);
    });
  };
  customerRows = function() {
    const rows=paged(filteredCustomers(),'customers'), tags=myTags();
    return rows.map((c,i)=>{
      const a=account(c.account), assigned=tags.filter(t=>c.tags.includes(t.id)), first=assigned[0];
      const tagPreview=first?`<span class="tag ${esc(first.color)}">${esc(first.name)}</span>`:'<span>0 个</span>';
      const tagDetail=assigned.length>1?`<small>+${assigned.length-1}</small>`:icon('ChevronRight');
      return `<tr>
        <td><input type="checkbox" data-select-customer="${esc(c.id)}" aria-label="选择${esc(c.name)}" ${ui.selected.has(c.id)?'checked':''}></td>
        <td>${rowNumber('customers',i)}</td>
        <td>${esc(a?.name||'—')}<span class="fid-cell-detail">${esc(member(c.owner)?.name||'未分配')}</span></td>
        <td><button class="fid-link fid-note-link" data-action="profileNote" ${fidActionID(c.id)} title="${esc(c.notes||'')}" aria-label="查看${esc(c.name)}备注"><span class="fid-cell-note">${esc(c.notes||'—')}</span></button></td>
        <td><button class="fid-link" data-action="profile" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}资料">${esc(c.name)}</button><span class="fid-cell-detail">${esc(c.source)}</span></td>
        <td><button type="button" class="fid-link fid-tag-cell" data-action="fidViewCustomerTags" ${fidActionID(c.id)} aria-label="查看${esc(c.name)}的标签，共 ${assigned.length} 个">${tagPreview}${tagDetail}</button></td><td>${esc(c.phone)}</td>
        <td>${esc(c.clientType||'新增线索-实时')}<span class="fid-cell-detail">${esc(c.stage)}</span></td>
        <td>${esc(country(c))}</td><td>${esc(fidDate(c.createdAt))}</td><td>${esc(fidDate(c.updatedAt))}</td>
        <td><div class="fid-icon-actions">${fidIcon('打开'+c.name+'会话','openConversation','MessageCircle',c.id)}${fidIcon('客户画像：'+c.name,'profile','ContactRound',c.id)}${manager()?fidIcon('转交'+c.name,'transfer','ArrowRightLeft',c.id):''}</div></td>
      </tr>`;
    }).join('');
  };
  renderCustomers = function() {
    const list=filteredCustomers(),marked=fid.customerTags.map(tag).filter(Boolean),selected=ui.selected.size;
    const filters=`<form class="fid-customer-filter fid-rounded" id="fid-customer-search-form">
      <div class="fid-customer-platform"><span>平台:</span>${fidButton(fid.customerPlatform?'全选(1)':'全选(0)','fidCustomerPlatform','Check','fid-platform',`aria-pressed="${fid.customerPlatform}"`)}<span class="sr-only">WhatsApp</span></div>
      <div class="fid-filter-row fid-customer-fields">
        <input class="fid-input" id="fid-customer-start" aria-label="开始时间" placeholder="开始时间" value="${esc(fid.customerStart)}" data-fid-date><span> - </span>
        <input class="fid-input" id="fid-customer-end" aria-label="截止时间" placeholder="截止时间" value="${esc(fid.customerEnd)}" data-fid-date>
        <select class="fid-select" id="fid-customer-field" aria-label="客户查询字段">${fidOption([['name','联系人'],['phone','手机号'],['account','主账号'],['note','备注'],['source','来源']],fid.customerField)}</select>
        <input class="fid-input" id="customer-search" aria-label="搜索客户库" placeholder="请输入" value="${esc(ui.customerQuery)}">
        <select class="fid-select" id="fid-customer-country" aria-label="国家">${fidOption([['all','请选择国家'],['US','美国'],['PR','波多黎各'],['OTHER','其他地区']],fid.customerCountry)}</select>
        <select class="fid-select" id="fid-customer-type" aria-label="客户类型">${fidOption([['all','请选择客户类型'],'新增线索-实时','新增线索-补录','重复线索'],fid.customerType)}</select>
      </div>
      <div class="fid-actions fid-filter-submit"><button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置','fidCustomerReset','RotateCw')}</div>
      <div class="fid-actions fid-tag-filter"><span>标签查询</span><span class="fid-small-note" aria-live="polite">${marked.length?marked.map(t=>esc(t.name)).join('、'):'未选'}</span>${fidButton('选择标签','fidCustomerChooseTags','Tag')}${fidButton('重置标签','fidCustomerClearFilter','X')}</div>
    </form>`;
    const toolbar=`<div class="fid-actions fid-list-toolbar">${fidButton('批量打标签','batchTags','Tag','gradient',selected?'':'disabled')}${fidButton('清空标签','fidClearCustomerTags','Eraser','',selected?'':'disabled')}${fidButton('跟进记录','','ClipboardList','green','data-nav="followups"')}${fidButton('导出列表','fidExportCustomers','FileDown')}${fidButton('新增客户','addCustomer','Plus','slim')}${manager()&&selected?fidButton('转交客户','batchTransfer','ArrowRightLeft','slim'):''}<span class="fid-small-note">演示号码</span></div>`;
    const header=['<input type="checkbox" id="select-all-customers" aria-label="选择当前结果全部客户">','序号','主账号信息','备注','联系人信息','标签','手机号','客户类型','国家','添加时间','更新时间','操作 '+icon('Settings2')];
    const table=fidTable('fid-customer-table',header,customerRows(),'暂无数据',true).replace('<tbody>','<tbody id="customer-rows">');
    return `<section class="fid-page"><h1 class="sr-only">客户列表</h1>${filters}${toolbar}<div class="fid-batchbar" id="batchbar" hidden><span id="selected-count">${selected}</span></div><div class="fid-table-card">${table}${fidPager(list.length,'customers',[10,20,50])}</div></section>`;
  };
  updateCustomerRows = function() {if(ui.view==='customers') render();};
  function fidSyncCustomerSelection() {
    const checks=[...document.querySelectorAll('[data-select-customer]')],all=$('#select-all-customers'),n=ui.selected.size;
    if(all){all.checked=checks.length>0&&checks.every(e=>e.checked);all.indeterminate=checks.some(e=>e.checked)&&!all.checked;}
    for(const el of document.querySelectorAll('.fid-list-toolbar [data-action="batchTags"],.fid-list-toolbar [data-action="fidClearCustomerTags"]'))el.disabled=!n;
    const count=$('#selected-count');if(count)count.textContent=n;
  }
  function fidApplyCustomerSearch() {
    Object.assign(fid,{customerField:$('#fid-customer-field').value,customerCountry:$('#fid-customer-country').value,customerType:$('#fid-customer-type').value,customerStart:$('#fid-customer-start').value,customerEnd:$('#fid-customer-end').value});
    ui.customerQuery=$('#customer-search').value;ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;render();
  }
  function fidAccountList() {
    const query = ui.accountQuery.trim();
    const byPhone = fid.accountField === 'number';
    const digits = byPhone ? fidPhoneDigits(query) : '';
    return myAccounts().filter(a => {
      const matchesQuery = !query || (byPhone
        ? Boolean(digits) && fidPhoneDigits(a.number).includes(digits)
        : fidMatch(a.name, query));
      return fid.accountPlatform && matchesQuery && (ui.accountStatus === 'all' || ui.accountStatus === a.state);
    });
  }
  renderAccounts = function() {
    const list=fidAccountList(),n=fid.accountChecked.size;
    const top=`<div class="fid-account-platform fid-rounded"><b>平台 ${icon('Info')}</b><div class="fid-actions">${fidButton('全选','fidAccountPlatform','Check','fid-platform '+(fid.accountPlatform?'active':''),`aria-pressed="${fid.accountPlatform}"`)}${fidButton('WhatsApp','fidAccountPlatform',fid.accountPlatform?'Check':'','fid-platform',`aria-pressed="${fid.accountPlatform}"`)}</div></div>`;
    const filters=`<form class="fid-account-filter fid-filter-row fid-rounded" id="fid-account-search-form">
      <span class="fid-joined">
        <select class="fid-select" id="fid-account-field" aria-label="账号查询字段">${fidOption([['name','账号名'],['number','手机号']],fid.accountField)}</select>
        <input class="fid-input" id="account-query" aria-label="搜索账号" placeholder="请输入" value="${esc(ui.accountQuery)}">
      </span>
      <select class="fid-select" id="fid-account-channel" aria-label="平台">${fidOption([['all','全部平台'],['wa','WhatsApp']],fid.accountChannel)}</select>
      <select class="fid-select" id="account-state" aria-label="在线状态">${fidOption([['all','全部在线状态'],['online','在线'],['reconnect','离线'],['pending','待连接']],ui.accountStatus)}</select>
      <button class="fid-btn gradient" type="submit">${icon('Search')}搜索</button>${fidButton('重置','fidAccountReset','RotateCw')}
    </form>`;
    const toolbar=`<div class="fid-actions fid-account-actions">${fidButton('移除账号','fidAccountDelete','Trash2','danger',n?'':'disabled')}${fidButton('批量注释','fidAccountNote','SquarePen','warn',n?'':'disabled')}${fidButton('统计清零','fidAccountZero','Eraser','danger',n?'':'disabled')}${fidButton('添加账号','addAccount','Plus','slim')}</div>`;
    const rows=paged(list,'accounts').map((a,i)=>`<tr>
      <td><input type="checkbox" data-fid-account-select="${esc(a.id)}" aria-label="选择${esc(a.name)}" ${fid.accountChecked.has(a.id)?'checked':''}></td>
      <td>${rowNumber('accounts',i)}</td><td>${esc(member(a.owner)?.name||'未分配')}</td>
      <td><button class="fid-link" data-action="accountInbox" ${fidActionID(a.id)}>${esc(a.name)}</button></td>
      <td>${esc(a.number)}</td><td>${stateText(a)}</td>
      <td>${esc(a.annotation||'—')}</td><td>${esc(a.note||'—')}</td>
      <td>${esc(fidDate(a.createdAt||fidDay(-8)))} / ${esc(a.lastSync||'—')}</td>
      <td>${esc(country(a))}</td><td>演示</td><td>—</td><td>—</td>
      <td><div class="fid-icon-actions">${fidIcon('编辑'+a.name,'editAccount','SquarePen',a.id)}${a.state!=='online'?fidIcon('重连'+a.name,'connect','RefreshCw',a.id):fidIcon('打开'+a.name+'会话','accountInbox','MessageCircle',a.id)}</div></td>
    </tr>`).join('');
    const columns=['<input type="checkbox" id="fid-account-all" aria-label="全选账号">','序号','主账号详情','用户名/ID','手机号','在线状态','注释','备注','首登时间/最近活跃','地区','版本号','主页地址','二维码','操作'];
    return `<section class="fid-page fid-accounts"><h1 class="sr-only">账号列表</h1>${top}${filters}${toolbar}<div class="fid-table-card">${fidTable('fid-account-table',columns,rows,'暂无数据',true)}${fidPager(list.length,'accounts')}</div></section>`;
  };
  const fidSelectedAccounts=()=>myAccounts().filter(a=>fid.accountChecked.has(a.id));

  function fidLogs() {
    const f=fid.logFilter;
    return myCustomers().flatMap(c=>(data.activities[c.id]||[]).map((entry,i)=>({c,entry,at:entry.createdAt||fidDay(-i-1),kind:entry.text.includes('标签')?'标签修改':entry.text.includes('跟进')?'跟进记录':'资料更新'})))
      .filter(({c,entry,at})=>fidInRange(at,f.start,f.end)&&fidMatch({customer:[c.name,c.phone].join(' '),text:entry.text,actor:entry.by}[f.field],f.query)).sort((a,b)=>b.at.localeCompare(a.at));
  }
  renderFollowups = function() {
    if(fid.followMode==='todo')return oldFollowupView().replace('<section class="section-page">','<section class="section-page"><div class="fid-actions fid-return-tasks">'+fidButton('返回跟进记录','fidLogHistory','ArrowLeft')+'</div>').replace('跟进管理</h1>','跟进待办</h1>');
    const f=fid.logFilter,rows=fidLogs(),body=paged(rows,'followups').map(({c,entry,at,kind})=>`<tr><td>${esc(entry.by)}</td><td>${esc(kind)}</td><td>${esc(account(c.account)?.name||'—')}</td><td><button class="fid-link" data-action="profile" ${fidActionID(c.id)}>${esc(c.name)}</button></td><td>${esc(c.phone)}</td><td>${esc(fidDate(at))}</td><td>${esc(entry.text)}</td></tr>`).join('');
    return `<section class="fid-page"><div class="fid-panel fid-log">${fidHead('跟进记录','客户资料、标签与跟进操作会记录在这里。')}<form class="fid-filter-row fid-log-filter" id="fid-log-search-form"><div class="fid-range">${icon('Clock3')}<input id="fid-log-start" aria-label="开始时间" placeholder="开始时间" value="${esc(f.start)}" data-fid-date><span>~</span><input id="fid-log-end" aria-label="截止时间" placeholder="截止时间" value="${esc(f.end)}" data-fid-date></div><select class="fid-select" id="fid-log-app" aria-label="选择APP">${fidOption([['all','请选择APP'],['wa','WhatsApp']],f.app)}</select><div class="fid-joined"><select class="fid-select" id="fid-log-field" aria-label="跟进查询字段">${fidOption([['customer','线索账号'],['text','内容'],['actor','操作人']],f.field)}</select><input class="fid-input" id="fid-log-query" aria-label="搜索跟进记录" placeholder="请输入线索账号或内容" value="${esc(f.query)}"></div><button class="fid-btn blue" type="submit">${icon('Search')}搜索</button>${fidButton('重选','fidLogReset','RotateCw')}</form><div class="fid-log-line"><span class="fid-small-note">演示号码</span><button class="fid-link" data-action="fidTasks">跟进待办 (${pendingTasks().length})</button></div>${fidTable('fid-log-table',['操作人','操作类型','主账号','线索账号信息','线索账号','创建日期','内容'],body)}${fidPager(rows.length,'followups')}</div></section>`;
  };

  toolsRailHTML = function(c) {
    const t=(label,action,glyph,needs=false)=>`<button class="icon-button" data-action="${action}" ${fidActionID(c?.id||'')} aria-label="${label}" ${needs&&!c?'disabled':''}>${icon(glyph)}</button>`;
    return `<aside class="tool-rail" aria-label="会话工具">${t('会话筛选','fidChatFilters','Bot')}${t('查看客户资料','profile','ContactRound',true)}${t('安排客户跟进','followup','ListOrdered',true)}${t('客户标签','assignTags','Tags',true)}${t('查看客户备注','profileNote','StickyNote',true)}<span class="tool-separator"></span>${t('刷新演示视图','refreshUI','RefreshCw')}${t('权限说明','fidChatPermissions','ShieldCheck')}</aside>`;
  };
  const fidOldFillQuick=fillQuick;
  fillQuick = function(id) {
    fid.waTab='chat';fid.chatOpen=true;ui.mobileChat=true;if(ui.view==='inbox')render();fidOldFillQuick(id);
  };

  function fidOrgHead(title,desc,action,button,glyph) {
    return `<header class="fid-org-header"><div><h1>${icon(glyph)}${title}</h1><p>${desc}</p></div>${fidButton(button,action,'Plus','gradient')}</header>`;
  }
  renderTeam = function() {
    if(!manager())return '';
    fidSeed();const roles=data.roleGroups.filter(g=>fid.roleState==='all'||g.enabled===(fid.roleState==='enabled'));
    const rows=roles.map((g,i)=>`<tr><td>${i+1}</td><td>${esc(g.name)}</td><td><button class="fid-link" data-action="fidRoleDetails" ${fidActionID(g.id)}>查看 ${g.view.length} 页 · 操作 ${g.write.length} 页</button></td><td>${data.members.filter(m=>fidMemberRole(m)===g.id).length}</td><td><span class="tag ${g.enabled?'jade':'slate'}">${g.enabled?'正常':'禁用'}</span></td><td>${esc(fidDate(g.created))}</td><td><div class="fid-icon-actions">${fidIcon('编辑权限组'+g.name,'fidRoleEdit','SquarePen',g.id)}${!g.builtIn?fidIcon('删除权限组'+g.name,'fidRoleDelete','Trash2',g.id,'fid-danger'):''}</div></td></tr>`).join('');
    return `<section class="fid-page">${fidOrgHead('组织架构','权限组决定子账号能查看的页面和可用操作。先配置权限组，再到「账号管理」创建子账号。','fidRoleAdd','新增权限组','Network')}<div class="fid-filter-row fid-org-filter"><select class="fid-select" id="fid-role-state" aria-label="权限组状态">${fidOption([['all','全部状态'],['enabled','正常'],['disabled','禁用']],fid.roleState)}</select></div><div class="fid-table-card">${fidTable('fid-org-table fid-role-table',['序号','权限组名称','权限','子账号数','状态','创建时间','操作'],rows,'还没有权限组，点右上角创建',true,'ShieldCheck')}</div></section>`;
  };
  function renderMembers() {
    if(!manager())return '';
    fidSeed();const f=fid.memberFilter, list=data.members.filter(m=>fidMatch(m.login||m.id,f.id)&&fidMatch([m.name,m.team,m.note].join(' '),f.name)&&(f.role==='all'||fidMemberRole(m)===f.role)&&(f.status==='all'||(m.enabled!==false)===(f.status==='enabled')));
    const rows=paged(list,'members').map((m,i)=>`<tr><td>${rowNumber('members',i)}</td><td>${esc(m.login||m.id)}</td><td>${esc(m.name)}</td><td>${esc(fidRole(fidMemberRole(m))?.name||'—')}</td><td>${esc(m.note||m.team)}</td><td><span class="tag ${m.enabled!==false?'jade':'slate'}">${m.enabled!==false?'正常':'禁用'}</span></td><td>—</td><td>${esc(fidDate(m.created||fidDay(-7)))}</td><td><div class="fid-icon-actions">${fidIcon('编辑子账号'+m.name,'fidMemberEdit','SquarePen',m.id)}${fidIcon('分配账号给'+m.name,'memberAccounts','UsersRound',m.id)}</div></td></tr>`).join('');
    return `<section class="fid-page">${fidOrgHead('账号管理','为员工建立子账号，并用权限组管理可查看和可操作的页面。','fidMemberAdd','新增子账号','UsersRound')}<p class="fid-org-help">子账号的权限和备注都可以在这里评审。当前为本地演示。</p><form class="fid-filter-row fid-org-filter" id="fid-member-search-form"><input id="fid-member-id" class="fid-input" placeholder="账号" aria-label="筛选账号" value="${esc(f.id)}"><input id="fid-member-name" class="fid-input" placeholder="昵称 / 备注" aria-label="筛选昵称或备注" value="${esc(f.name)}"><select class="fid-select" id="fid-member-role" aria-label="筛选权限组">${fidOption([['all','全部权限组'],...data.roleGroups.map(g=>[g.id,g.name])],f.role)}</select><select class="fid-select" id="fid-member-status" aria-label="筛选子账号状态">${fidOption([['all','全部状态'],['enabled','正常'],['disabled','禁用']],f.status)}</select><button type="submit" class="fid-btn gradient">${icon('Search')}搜索</button>${fidButton('重置','fidMemberReset')}</form><div class="fid-table-card">${fidTable('fid-org-table fid-member-table',['序号','账号','昵称','权限组','备注','状态','最近登录','创建时间','操作'],rows,'暂无子账号',true,'UsersRound')}${fidPager(list.length,'members',[10,20,50])}</div></section>`;
  }
  function fidPermissionTree(g,readOnly=false) {
    return `<div class="fid-permission-box">${fidPerms.map((page,i)=>`<div class="fid-permission-row"><label><input type="checkbox" name="view" value="${esc(page)}" data-fid-perm="${i}" ${g?.view.includes(page)?'checked':''} ${readOnly?'disabled':''}>${esc(page)}</label><label><input type="checkbox" name="write" value="${esc(page)}" data-fid-perm="${i}" ${g?.write.includes(page)?'checked':''} ${readOnly?'disabled':''}>操作</label></div>`).join('')}</div>`;
  }
  function fidRoleEdit(id='') {
    if(!manager())return;const g=fidRole(id);
    fidForm(g?'编辑权限组':'新增权限组','fid-role',`<input type="hidden" name="id" value="${esc(id)}">${fidFormRow('权限组名称',fidCountField('fid-role-name','name',g?.name||'',30,'请输入权限组名称',true),'fid-role-name',true)}${fidFormRow('状态',`<select name="enabled" id="fid-role-enabled" class="fid-select" ${g?.builtIn?'disabled':''}>${fidOption([['1','正常'],['0','禁用']],g?.enabled===false?'0':'1')}</select>`,'fid-role-enabled')}${fidFormRow('页面权限',fidPermissionTree(g)+'<small class="fid-field-help">勾选操作会同时勾选查看。此处用于评审权限方案。</small>')}`,'保存',{wide:true,saveLast:true});
  }
  function fidMemberEdit(id='') {
    if(!manager())return;const m=member(id),roles=data.roleGroups.filter(g=>g.enabled||g.id===fidMemberRole(m));
    fidForm(m?'编辑子账号':'新增子账号','fid-member',`<input type="hidden" name="id" value="${esc(id)}">${fidFormRow('账号',fidCountField('fid-member-login','login',m?.login||m?.id||'',30,'输入演示账号',true),'fid-member-login',true)}${fidFormRow('昵称',fidCountField('fid-member-nick','name',m?.name||'',30,'输入成员昵称',true),'fid-member-nick',true)}${fidFormRow('权限组',`<select class="fid-select" id="fid-member-group" name="roleGroup">${roles.map(g=>option(g.id,g.name,fidMemberRole(m))).join('')}</select>`,'fid-member-group',true)}${fidFormRow('所属团队',fidCountField('fid-member-team','team',m?.team||'北美一组',30,'输入团队名称',true),'fid-member-team',true)}${fidFormRow('备注',fidCountField('fid-member-note','note',m?.note||'',80,'选填'),'fid-member-note')}${fidFormRow('状态',`<select class="fid-select" id="fid-member-enabled" name="enabled" ${m?.id===ui.persona?'disabled':''}>${fidOption([['1','正常'],['0','禁用']],m?.enabled===false?'0':'1')}</select>`,'fid-member-enabled')}`,'保存',{wide:true,saveLast:true});
  }

  function fidResetExtras() {
    fid.tagChecked.clear();fid.accountChecked.clear();fid.customerTags=[];fid.chatOpen=false;fid.waTab='chat';fid.followMode='history';resetCustomerPages();resetOperationsView();fidSeed();
  }
  function fidRenderNavInDialog() {
    renderNav();const mobile=$('#dialog .mobile-menu');if($('#dialog').open&&mobile)mobile.innerHTML=menuHTML(true);paintIcons();
  }
  function fidSyncCheck(which) {
    const isTag=which==='tag',set=isTag?fid.tagChecked:fid.accountChecked,box=$('#fid-'+which+'-all'),checks=[...document.querySelectorAll('[data-fid-'+which+'-select]:not(:disabled)')];
    if(box){box.disabled=!checks.length;box.checked=checks.length>0&&checks.every(e=>e.checked);box.indeterminate=checks.some(e=>e.checked)&&!box.checked;}
    for(const b of document.querySelectorAll(isTag?'[data-action="fidTagBatchDelete"]':'[data-action="fidAccountDelete"],[data-action="fidAccountNote"],[data-action="fidAccountZero"]'))b.disabled=!set.size;
  }
  function fidExportCustomers() {
    const safe=v=>'"'+( /^[=+\-@\t\r]/.test(String(v??'')) ? "'" : '' )+String(v??'').replaceAll('"','""')+'"';
    const rows=[['主账号','联系人','手机号','客户类型','国家','标签'],...filteredCustomers().map(c=>[account(c.account)?.name,c.name,c.phone,c.clientType,country(c),c.tags.map(tag).filter(t=>t&&myTags().includes(t)).map(t=>t.name).join('、')])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='whatsapp-演示客户列表.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出当前筛选的演示客户列表。');
  }
  const fidConversationFilters = {all:'全部',unread:'未读',reply:'待回复',star:'星标'};
  function fidResetCustomerFilters() {
    Object.assign(fid,{customerTags:[],customerCountry:'all',customerType:'all',customerField:'name',customerStart:'',customerEnd:'',customerPlatform:true});
    Object.assign(ui,{customerQuery:'',customerTag:'all',customerStage:'all',customerOwner:'all'});
    ui.pages.customers=0;
    ui.selected.clear();
  }
  const fidActions = {
    fidNavCustomers:()=>{ui.customerNavOpen=!ui.customerNavOpen;fidRenderNavInDialog();},
    fidNavOperations:()=>{fid.operationsOpen=!fid.operationsOpen;fidRenderNavInDialog();},
    fidNavOrg:()=>{fid.orgOpen=!fid.orgOpen;fidRenderNavInDialog();},
    fidGroupSelect:id=>{ui.tagGroup=id;fid.tagChecked.clear();ui.pages.tags=0;render();},
    queryTags:()=>{ui.tagQuery=$('#replica-tag-search').value;fid.tagChecked.clear();ui.pages.tags=0;render();},
    fidTagReset:()=>{ui.tagQuery='';fid.tagChecked.clear();ui.pages.tags=0;render();},
    fidTagAdd:()=>fidTagEdit(), fidTagEdit,
    fidTagDelete:id=>fidConfirm('删除标签','删除此标签并从客户资料中移除？','fidDoTagDelete',id),
    fidDoTagDelete:id=>fidRemoveTags([id]),
    fidTagBatchDelete:()=>fidConfirm('批量删除','删除选中的标签并从客户资料中移除？','fidDoTagBatchDelete'),
    fidDoTagBatchDelete:()=>fidRemoveTags([...fid.tagChecked]),
    fidGroupAdd:()=>fidGroupEdit(),fidGroupEdit,
    fidGroupDelete:id=>{if(!group(id)||!canEditGroup(group(id)))return;if(data.tags.some(t=>t.group===id))return toast('请先清空此分组的标签。');fidConfirm('删除分组','删除此空的演示分组？','fidDoGroupDelete',id);},
    fidDoGroupDelete:id=>{const g=group(id);if(!g||!canEditGroup(g)||data.tags.some(t=>t.group===id))return;data.tagGroups=data.tagGroups.filter(x=>x!==g);ui.tagGroup='all';persist();close();render();toast('分组已删除。');},
    fidTagCustomers:id=>{if(!myTags().some(t=>t.id===id))return;fid.customerTags=[id];ui.customerTag='all';ui.customerQuery='';ui.pages.customers=0;navigate('customers');},
    fidViewCustomerTags,
    fidCustomerChooseTags:fidOpenTagFilter,
    fidCustomerClearFilter:()=>{fid.customerTags=[];ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;render();},
    fidCustomerPlatform:()=>{fid.customerPlatform=!fid.customerPlatform;ui.selected.clear();ui.pages.customers=0;render();},
    fidCustomerReset:()=>{fidResetCustomerFilters();render();},
    fidClearCustomerTags:()=>{if(ui.selected.size)fidConfirm('清空标签','清空所选客户的可见演示标签？','fidDoClearCustomerTags');},
    fidDoClearCustomerTags:()=>{const scope=new Set(myTags().map(t=>t.id)),before=[];for(const c of myCustomers()){if(!ui.selected.has(c.id))continue;before.push([c,c.tags]);c.tags=c.tags.filter(id=>!scope.has(id));addActivity(c.id,'清空可见标签');}persist();close();render();toast('已清空所选客户的可见标签。',()=>{for(const [c,t] of before)c.tags=t;persist();render()});},
    fidExportCustomers,
    fidAccountPlatform:()=>{fid.accountPlatform=!fid.accountPlatform;fid.accountChecked.clear();ui.pages.accounts=0;render();},
    fidAccountReset:()=>{fid.accountChecked.clear();Object.assign(fid,{accountField:'name',accountPlatform:true,accountChannel:'all'});ui.accountQuery='';ui.accountStatus='all';ui.pages.accounts=0;render();},
    fidAccountNote:()=>fidForm('批量注释','fid-account-note',fidFormRow('注释',fidCountField('fid-annotation','note','',80,'输入选中账号的注释',true),'fid-annotation',true)),
    fidAccountDelete:()=>{const selected=fidSelectedAccounts();if(!selected.length)return;if(selected.some(a=>data.customers.some(c=>c.account===a.id)))return toast('选中的账号仍有关联客户，演示中不能移除。');fidConfirm('移除账号','移除选中的无客户演示账号？','fidDoAccountDelete');},
    fidDoAccountDelete:()=>{const selected=fidSelectedAccounts().filter(a=>!data.customers.some(c=>c.account===a.id));data.accounts=data.accounts.filter(a=>!selected.includes(a));fid.accountChecked.clear();persist();close();render();toast('已移除选中的演示账号。');},
    fidAccountZero:()=>fidConfirm('统计清零','将已选账号的演示未读统计清零？','fidDoAccountZero'),
    fidDoAccountZero:()=>{const selected=new Set(fidSelectedAccounts().map(a=>a.id));myCustomers().filter(c=>selected.has(c.account)).forEach(c=>c.unread=0);persist();close();render();toast('演示未读统计已清零。');},
    fidLogReset:()=>{fid.logFilter={start:'',end:'',app:'all',field:'customer',query:''};ui.pages.followups=0;render();},
    fidTasks:()=>{fid.followMode='todo';ui.pages.followups=0;navigate('followups');},
    fidLogHistory:()=>{fid.followMode='history';ui.pages.followups=0;render();},
    fidWaTab:id=>{fid.waTab=id==='numbers'?'numbers':'chat';render();},
    fidChatFilters:()=>fidDialog('会话筛选','<div class="modal-body fid-conversation-filters">'+Object.entries(fidConversationFilters).map(([id,label])=>fidButton(label,'fidChatFilter','',ui.conversationFilter===id?'blue':'',`${fidActionID(id)} aria-pressed="${ui.conversationFilter===id}"`)).join('')+'</div>'),
    fidChatFilter:id=>{ui.conversationFilter=id;close();render();},
    fidClearChatFilter:()=>{ui.conversationFilter='all';render();$('#conversation-search')?.focus({preventScroll:true});},
    fidChatPermissions:()=>fidDialog('会话权限','<div class="modal-body">'+(manager()?'主管可评审团队演示账号及其会话。':'聊手只查看分配给自己的演示账号及客户。')+'</div>',fidButton('关闭','close')),
    fidRoleAdd:()=>fidRoleEdit(),fidRoleEdit,
    fidRoleDetails:id=>{if(!manager())return;const g=fidRole(id);if(g)fidDialog('权限详情 · '+g.name,'<div class="modal-body">'+fidPermissionTree(g,true)+'</div>',fidButton('关闭','close'));},
    fidRoleDelete:id=>{if(!manager())return;const g=fidRole(id);if(!g||g.builtIn)return;if(data.members.some(m=>fidMemberRole(m)===id))return toast('请先迁移此权限组下的演示子账号。');fidConfirm('删除权限组','删除此演示权限组？','fidDoRoleDelete',id);},
    fidDoRoleDelete:id=>{const g=fidRole(id);if(!manager()||!g||g.builtIn||data.members.some(m=>fidMemberRole(m)===id))return;data.roleGroups=data.roleGroups.filter(r=>r!==g);persist();close();render();toast('权限组已删除。');},
    fidMemberAdd:()=>fidMemberEdit(),fidMemberEdit,
    fidMemberReset:()=>{fid.memberFilter={id:'',name:'',role:'all',status:'all'};ui.pages.members=0;render();},
  };
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]'),nav=e.target.closest('[data-nav]'),action=btn?.dataset.action;
    if(nav?.dataset.nav==='followups')fid.followMode='history';
    if(action==='openConversation'){fid.waTab='chat';fid.chatOpen=true;}
    if(action==='accountInbox'){fid.waTab='chat';fid.chatOpen=false;}
    if(action==='backList')fid.chatOpen=false;
    if(!Object.hasOwn(fidActions,action))return;
    e.preventDefault();e.stopImmediatePropagation();fidActions[action](btn.dataset.id,btn);
  },true);
  document.addEventListener('focusin',e=>{if(e.target.matches('[data-fid-date]'))e.target.type='date';});
  document.addEventListener('focusout',e=>{if(e.target.matches('[data-fid-date]')&&!e.target.value)e.target.type='text';});
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.hasAttribute('data-fid-count'))t.parentElement.querySelector('.fid-count').textContent=t.value.length+' / '+t.maxLength;
    if(t.id==='fid-choice-search'){
      const sections=[...t.form.querySelectorAll('.fid-tag-picker section')],q=t.value.trim().toLowerCase();
      for (const section of sections) {
        const choices=[...section.querySelectorAll('[data-fid-tag-label]')];
        for (const choice of choices) choice.hidden=!choice.dataset.fidTagLabel.includes(q);
        section.hidden=choices.every(choice=>choice.hidden);
      }
      t.form.querySelector('.fid-tag-no-match').hidden=sections.some(section=>!section.hidden);
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='replica-tag-search'){e.preventDefault();fidActions.queryTags();}});
  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.id==='account-filter'){fid.chatOpen=false;ui.mobileChat=false;}
    if(t.id==='fid-role-state'){fid.roleState=t.value;render();return;}
    if(t.dataset.fidPerm!==undefined){const matching=[...t.form.querySelectorAll('[data-fid-perm]')].find(x=>x!==t&&x.dataset.fidPerm===t.dataset.fidPerm);if(matching){if(t.name==='write'&&t.checked)matching.checked=true;if(t.name==='view'&&!t.checked)matching.checked=false;}}
    for(const key of ['tag','account']){
      const id=t.getAttribute('data-fid-'+key+'-select'),all=t.id==='fid-'+key+'-all',set=key==='tag'?fid.tagChecked:fid.accountChecked;
      if(all||id){for(const box of all?document.querySelectorAll('[data-fid-'+key+'-select]:not(:disabled)'):[t]){box.checked=t.checked;const v=box.getAttribute('data-fid-'+key+'-select');if(t.checked)set.add(v);else set.delete(v);}fidSyncCheck(key);return;}
    }
    if(t.id==='select-all-customers'||t.dataset.selectCustomer){
      e.stopImmediatePropagation();for(const box of t.id==='select-all-customers'?document.querySelectorAll('[data-select-customer]'):[t]){box.checked=t.checked;if(t.checked)ui.selected.add(box.dataset.selectCustomer);else ui.selected.delete(box.dataset.selectCustomer);}
      if(manager()&&t.id==='select-all-customers')render();else fidSyncCustomerSelection();
    }
  },true);

  const fidForms={
    'fid-tag-form':(f,v)=>{
      const id=v('id'),t=tag(id),g=group(v('group')),name=v('name');
      if(!g||!canEditGroup(g)||(id&&t?.group!==g.id))return error('没有维护此分组的权限。');
      if(!name)return error('请输入标签内容。');
      const groupTags=data.tags.filter(x=>x.group===g.id);
      if(groupTags.some(x=>x!==t&&x.name.trim().toLowerCase()===name.toLowerCase()))return error('同一分组已存在此标签。');
      if(t)t.name=name;
      else{
        const colors=['blue','jade','gold','purple','peach'];
        data.tags.push({id:nextId('tag'),name,group:g.id,color:colors[groupTags.length%colors.length]});
      }
      ui.tagGroup=g.id;ui.tagQuery='';fid.tagChecked.clear();persist();close();render();toast('标签已保存。');
    },
    'fid-group-form':(f,v)=>{
      const g=group(v('id')),name=v('name');if(!name)return error('请输入分组名称。');if(g&&!canEditGroup(g))return error('没有维护此分组的权限。');
      if(fidGroupList().some(x=>x!==g&&x.name===name))return error('已存在同名分组。');
      if(g){g.name=name;ui.tagGroup=g.id;}else{const scope=manager()&&v('scope')==='team'?'team':'private';const id=nextId('g');data.tagGroups.push({id,name,scope,owner:scope==='team'?null:ui.persona});ui.tagGroup=id;}
      ui.tagQuery='';fid.tagChecked.clear();persist();close();render();toast('分组已保存。');
    },
    'fid-tag-filter-form':f=>{fid.customerTags=f.getAll('tags').map(String).filter(id=>myTags().some(t=>t.id===id));ui.customerTag='all';ui.selected.clear();ui.pages.customers=0;close();render();},
    'fid-tag-assign-form':(f,v)=>{
      const ids=v('ids').split(','),allowed=new Set(myTags().map(t=>t.id)),chosen=f.getAll('tags').map(String).filter(t=>allowed.has(t));
      for (const id of ids) {
        const c=customer(id);
        if (!c||!myCustomers().includes(c)) continue;
        const retained=ids.length===1?c.tags.filter(t=>!allowed.has(t)):c.tags;
        c.tags=[...new Set([...retained,...chosen])];
        addActivity(c.id,'更新客户标签');
      }
      persist();close();render();toast('客户标签已更新。');
    },
    'fid-customer-search-form':fidApplyCustomerSearch,
    'fid-account-search-form':()=>{Object.assign(fid,{accountField:$('#fid-account-field').value,accountChannel:$('#fid-account-channel').value});ui.accountQuery=$('#account-query').value;ui.accountStatus=$('#account-state').value;fid.accountChecked.clear();ui.pages.accounts=0;render();},
    'fid-account-note-form':(f,v)=>{if(!v('note'))return error('请输入注释。');fidSelectedAccounts().forEach(a=>a.annotation=v('note'));persist();close();render();toast('所选演示账号已更新注释。');},
    'fid-log-search-form':()=>{fid.logFilter={start:$('#fid-log-start').value,end:$('#fid-log-end').value,app:$('#fid-log-app').value,field:$('#fid-log-field').value,query:$('#fid-log-query').value};ui.pages.followups=0;render();},
    'fid-role-form':(f,v)=>{
      if(!manager())return;if(!v('name'))return error('请输入权限组名称。');const g=fidRole(v('id')),view=f.getAll('view').filter(x=>fidPerms.includes(x)),write=f.getAll('write').filter(x=>view.includes(x));
      if(data.roleGroups.some(r=>r!==g&&r.name===v('name')))return error('已存在同名权限组。');
      const values={name:v('name'),enabled:g?.builtIn?g.enabled:v('enabled')==='1',view,write};if(g)Object.assign(g,values);else data.roleGroups.push({id:nextId('role'),...values,created:fidDay()});persist();close();render();toast('演示权限组已保存。');
    },
    'fid-member-form':(f,v)=>{
      if(!manager())return;const m=member(v('id')),g=fidRole(v('roleGroup'));
      if(!v('login')||!v('name')||!v('team')||!g)return error('请填写账号、昵称、权限组和团队。');
      if(data.members.some(x=>x!==m&&(x.login||x.id).toLowerCase()===v('login').toLowerCase()))return error('演示账号已存在。');
      if(m?.id===ui.persona&&g.id!=='lead')return error('请保留当前主管的主管权限。');
      const values={login:v('login'),name:v('name'),team:v('team'),note:v('note'),roleGroup:g.id,role:g.id==='lead'?'manager':'agent',enabled:m?.id===ui.persona?true:v('enabled')==='1'};
      if(m)Object.assign(m,values);else data.members.push({id:nextId('u'),...values,initial:initial(values.name),color:'blue',created:fidDay()});persist();close();render();toast('演示子账号已保存。');
    },
    'fid-member-search-form':()=>{fid.memberFilter={id:$('#fid-member-id').value,name:$('#fid-member-name').value,role:$('#fid-member-role').value,status:$('#fid-member-status').value};ui.pages.members=0;render();},
  };
  document.addEventListener('submit',e=>{
    const id=e.target.getAttribute('id'),handler=fidForms[id];if(!Object.hasOwn(fidForms,id)||typeof handler!=='function')return;
    e.preventDefault();e.stopImmediatePropagation();const form=e.target,values=new FormData(form);
    form.querySelectorAll('.field-error').forEach(x=>x.remove());form.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby');});
    const report=form.querySelector('#form-error');if(report)report.textContent='';handler(values,k=>String(values.get(k)||'').trim());
  },true);

  const fidOldRender=render;
  render=function(){
    fidOldRender();
    if(ui.view==='tags')fidSyncCheck('tag');
    if(ui.view==='accounts')fidSyncCheck('account');
    if(ui.view==='customers')fidSyncCustomerSelection();
  };
