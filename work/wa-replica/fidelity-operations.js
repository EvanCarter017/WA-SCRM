  const assetTypes = { text:'文本', image:'图片', contact:'名片', rich:'图文', audio:'音频', video:'视频' };
  function operationsData() {
    return data.operations ??= {
      assetGroups: [{id:'ops-text',type:'text',name:'常用文本',note:''}],
      assets: [],
    };
  }

  const operationsView = {};
  function resetOperationsView() {
    Object.assign(operationsView, {
      assetType:'text', assetGroup:'', assetQuery:'', assetSelection:new Set(),
    });
    operationsData();
  }
  resetOperationsView();
  ui.pageSizes.materials ||= 20;

  const opsInput = (name, value='', placeholder='', attrs='') =>
    `<input class="fid-input" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>`;
  const opsSelect = (name, values, value, attrs='') =>
    `<select class="fid-select" name="${name}" ${attrs}>${fidOption(values,value)}</select>`;
  const opsArea = (name, value='', placeholder='请输入内容') =>
    `<textarea name="${name}" rows="4" maxlength="4000" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  const opsField = (label, control) => `<label class="field"><span>${esc(label)}</span>${control}</label>`;
  const opsHidden = (name, value) => `<input type="hidden" name="${name}" value="${esc(value)}">`;
  const opsSubmit = label => `<button type="submit" class="fid-btn blue">${esc(label)}</button>`;
  const opsReadOnly = () => manager() ? '' : '<span class="fid-ops-hint">子站可查看和导出素材。</span>';
  const opsAssetGroups = () => operationsData().assetGroups.filter(item => item.type===operationsView.assetType);

  function saveOperation(message) {
    persist();
    if ($('#dialog').open) close();
    render();
    toast(message);
  }

  function openMaterialGroup(id='') {
    if (!manager()) return;
    const group = opsAssetGroups().find(item => item.id===id);
    fidForm(group?'编辑分组':'新建分组','fid-ops-group',opsHidden('id',id)+
      opsField('分组名称',opsInput('name',group?.name,'请输入分组名称','maxlength="20" required'))+
      opsField('备注',opsInput('note',group?.note,'选填','maxlength="100"')));
  }

  function saveMaterialGroup(values, value) {
    if (!manager()) return;
    const id=value('id'), name=value('name'), type=operationsView.assetType;
    const groups=opsAssetGroups();
    const existing=groups.find(item=>item.id===id);
    if(!name)return error('请输入分组名称。');
    if(groups.some(item=>item.id!==id&&item.name===name))return error('已有同名分组。');
    const group={id:existing?.id||nextId('ops-group'),type,name,note:value('note')};
    if(existing)Object.assign(existing,group);else operationsData().assetGroups.push(group);
    operationsView.assetGroup=group.id;
    saveOperation('分组已保存。');
  }

  function matchingAssets() {
    const { assetType, assetGroup, assetQuery } = operationsView;
    return operationsData().assets.filter(item=>item.type===assetType&&(!assetGroup||item.groupId===assetGroup)&&
      fidMatch([item.title,item.body,item.file,item.contact,item.nickname].join(' '),assetQuery));
  }

  function renderMaterials() {
    const state=operationsData(), groups=opsAssetGroups(), list=matchingAssets();
    const page=paged(list,'materials'), canEdit=manager(), selected=operationsView.assetSelection;
    const selectedOnPage=page.filter(item=>selected.has(item.id));
    const type=assetTypes[operationsView.assetType];
    const groupButtons=[{id:'',name:'全部'},...groups].map(item=>{
      const count=state.assets.filter(asset=>asset.type===operationsView.assetType&&(!item.id||item.id===asset.groupId)).length;
      const edit=item.id&&canEdit?fidIcon('编辑分组'+item.name,'opsMaterialGroupEdit','Pencil',item.id)+fidIcon('删除分组'+item.name,'opsMaterialGroupDelete','Trash2',item.id):'';
      return `<div class="fid-ops-group-row"><button type="button" data-action="opsMaterialGroup" ${fidActionID(item.id)} aria-pressed="${operationsView.assetGroup===item.id}"><span>${esc(item.name)}</span><small>${count}</small></button>${edit}</div>`;
    }).join('');
    const typeButtons=Object.entries(assetTypes).map(([id,name])=>{
      const count=state.assets.filter(item=>item.type===id).length;
      return `<button type="button" data-action="opsMaterialType" ${fidActionID(id)} aria-label="${name}" aria-pressed="${id===operationsView.assetType}">${name}<small>${count}</small></button>`;
    }).join('');
    const rows=page.map(item=>{
      const group=groups.find(g=>g.id===item.groupId);
      const check=`<input type="checkbox" data-ops-asset-check="${esc(item.id)}" aria-label="选择${esc(item.title)}" ${selected.has(item.id)?'checked':''} ${canEdit?'':'disabled'}>`;
      const actions=fidButton('预览','opsAssetPreview','','slim',fidActionID(item.id))+(canEdit?fidButton('编辑','opsAssetEdit','','slim',fidActionID(item.id)):'');
      return `<tr><td>${check}</td><td>${esc(item.title)}</td><td>${esc(group?.name||'—')}</td><td><span class="fid-ops-excerpt">${esc(item.body||item.file||item.contact)}</span></td><td>${actions}</td></tr>`;
    }).join('');
    return `<section class="fid-page fid-ops-materials"><h1 class="sr-only">素材管理</h1>
      <form id="fid-ops-material-search-form" class="fid-filter-row">${opsInput('query',operationsView.assetQuery,'请输入素材名称或内容','aria-label="搜索素材"')}${opsSubmit('搜索')}${fidButton('重置','opsMaterialReset')}</form>
      <div class="fid-ops-type-tabs" aria-label="素材类型">${typeButtons}</div>
      <div class="fid-ops-groups"><div class="fid-ops-section-head"><strong>全部分组</strong>${fidButton('新建分组','opsMaterialGroupAdd','Plus','slim',canEdit?'':'disabled')}</div>${groupButtons}${groups.length?'':'<p class="fid-ops-hint">新建分组后可以添加'+type+'素材。</p>'}</div>
      <div class="fid-actions fid-ops-toolbar"><label class="fid-ops-check"><input type="checkbox" id="fid-ops-asset-all" ${page.length&&selectedOnPage.length===page.length?'checked':''} ${page.length&&canEdit?'':'disabled'}>全选本页</label>
        <div class="fid-actions">${fidButton('新增'+type,'opsAssetAdd','Plus','gradient',canEdit&&groups.length?'':'disabled')}${fidButton('导入素材','opsMaterialImport','','',canEdit&&groups.length&&operationsView.assetType==='text'?'':'disabled')}${fidButton('导出素材','opsMaterialExport','','',list.length?'':'disabled')}${fidButton('移动分组','opsAssetMove','','',selectedOnPage.length&&groups.length>1?'':'disabled')}${fidButton('批量删除','opsAssetDelete','','',selectedOnPage.length?'':'disabled')}</div>
      </div>${opsReadOnly()}
      ${rows?fidTable('fid-ops-table',['','素材名称','分组','内容','操作'],rows):'<div class="fid-ops-empty">'+(groups.length?'暂无匹配素材':'先新建分组，再添加'+type+'素材')+'</div>'}
      ${fidPager(list.length,'materials')}
    </section>`;
  }

  function openAsset(id='') {
    if(!manager())return;
    const item=operationsData().assets.find(asset=>asset.id===id), groups=opsAssetGroups();
    if(!groups.length)return;
    const type=operationsView.assetType;
    const currentGroup=item?.groupId||operationsView.assetGroup||groups[0].id;
    const body=type==='text'||type==='rich'?opsField('素材内容',opsArea('body',item?.body)):'';
    const contact=type==='contact'?opsField('昵称',opsInput('nickname',item?.nickname,'选填','maxlength="30"'))+
      opsField('联系方式',opsInput('contact',item?.contact,'含国家区号的 WhatsApp 号码','type="tel" maxlength="24" required')):'';
    const media=type==='text'||type==='contact'?'':opsField('本地文件',`<input type="file" name="file" accept="${type==='rich'?'image':type}/*"><small class="fid-ops-hint">${item?.file?esc(item.file)+' · ':''}仅保留文件名。</small>`);
    fidForm(item?'编辑素材':'新增'+assetTypes[type],'fid-ops-asset',opsHidden('id',id)+
      opsField('分组',opsSelect('groupId',groups.map(group=>[group.id,group.name]),currentGroup))+
      opsField('素材名称',opsInput('title',item?.title,'请输入素材名称','maxlength="50" required'))+body+contact+media);
  }

  function saveAsset(values,value) {
    if(!manager())return;
    const state=operationsData(), id=value('id'), type=operationsView.assetType;
    const existing=state.assets.find(item=>item.id===id), title=value('title'), groupId=value('groupId');
    if(!title||!opsAssetGroups().some(group=>group.id===groupId))return error('请填写名称并选择分组。');
    const file=values.get('file');
    const fileName=file?.name||existing?.file||'';
    const body=value('body'), contact=value('contact'), nickname=value('nickname');
    if((type==='text'||type==='rich')&&!body)return error('请填写素材内容。');
    if(type==='contact'&&contact.replace(/\D/g,'').length<6)return error('请填写完整的联系方式。');
    if(type!=='text'&&type!=='contact'&&!fileName)return error('请选择一个文件。');
    if(file?.size>(type==='image'||type==='rich'?10:16)*1024*1024)return error('所选文件超过该类型的大小限制。');
    const asset={id:id||nextId('ops-asset'),type,groupId,title,body,contact,nickname,file:fileName};
    if(existing)Object.assign(existing,asset);else state.assets.push(asset);
    operationsView.assetSelection.clear();
    saveOperation('素材已保存。');
  }

  function previewAsset(id) {
    const item=operationsData().assets.find(asset=>asset.id===id);
    if(!item)return;
    fidDialog(item.title,`<div class="modal-body fid-ops-preview"><p>${esc(assetTypes[item.type])}</p><pre>${esc([item.body,item.nickname,item.contact,item.file].filter(Boolean).join('\n'))}</pre></div>`,fidButton('关闭','close'));
  }

  function deleteMaterialGroup(id) {
    if(!manager())return;
    if(operationsData().assets.some(item=>item.groupId===id))return toast('请先移动或删除该分组里的素材。');
    fidConfirm('删除素材分组','确定删除这个空分组？','opsMaterialGroupDeleteConfirmed',id);
  }

  function moveAssets() {
    const groups=opsAssetGroups();
    if(!manager()||!operationsView.assetSelection.size||groups.length<2)return;
    fidForm('移动分组','fid-ops-move',opsField('目标分组',opsSelect('groupId',groups.map(item=>[item.id,item.name]),groups[0].id)));
  }

  function saveAssetMove(values,value) {
    const groupId=value('groupId');
    if(!manager()||!opsAssetGroups().some(group=>group.id===groupId))return;
    for(const asset of operationsData().assets)if(operationsView.assetSelection.has(asset.id))asset.groupId=groupId;
    operationsView.assetSelection.clear();
    saveOperation('素材已移动。');
  }

  function downloadOperationsCsv(filename,rows) {
    const cell=value=>{
      const text=String(value??'');
      const safe=/^[=+\-@\t\r]/.test(text)?"'"+text:text;
      return '"'+safe.replaceAll('"','""')+'"';
    };
    const body='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download=filename;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function parseOperationsCsv(text) {
    const rows=[];
    let row=[],cell='',quoted=false;
    const source=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')+'\n';
    for(let i=0;i<source.length;i++){
      const char=source[i];
      if(char==='"'){
        if(quoted&&source[i+1]==='"'){cell+='"';i++;}
        else quoted=!quoted;
      }else if(!quoted&&(char===','||char==='\n')){
        row.push(cell.trim());cell='';
        if(char==='\n'){if(row.some(Boolean))rows.push(row);row=[];}
      }else cell+=char;
    }
    return quoted ? null : rows;
  }

  function openMaterialImport() {
    if(!manager())return;
    const groups=opsAssetGroups();
    if(operationsView.assetType!=='text'||!groups.length)return;
    const columns='素材名称,素材内容';
    fidForm('导入素材','fid-ops-import',opsField('导入到分组',opsSelect('groupId',groups.map(item=>[item.id,item.name]),operationsView.assetGroup||groups[0].id))+
      `<p class="fid-ops-hint">粘贴 CSV 文本，首行为「${columns}」。每次最多导入 100 条。</p>`+
      opsField('CSV 内容',opsArea('csv','',columns)),'导入');
  }

  function saveMaterialImport(values,value) {
    if(!manager())return;
    const groupId=value('groupId'), parsed=parseOperationsCsv(value('csv'));
    if(!parsed)return error('CSV 引号没有配对。');
    const columns=['素材名称','素材内容'];
    const header=parsed.shift();
    if(!header||header.length!==columns.length||header.some((label,index)=>label!==columns[index]))return error('请按提示填写 CSV 表头。');
    if(!parsed.length||parsed.length>100||parsed.some(row=>row.length!==columns.length||row.some(cell=>!cell)))return error('请填写 1 至 100 条完整记录。');
    const state=operationsData();
    if(!state.assetGroups.some(item=>item.id===groupId&&item.type==='text'))return error('请选择文本分组。');
    if(parsed.some(([title,body])=>title.length>50||body.length>4000))return error('素材名称最多 50 字，内容最多 4000 字。');
    for(const [title,body] of parsed)state.assets.push({id:nextId('ops-asset'),type:'text',groupId,title,body,file:'',contact:'',nickname:''});
    operationsView.assetGroup=groupId;
    saveOperation('已导入 '+parsed.length+' 条记录。');
  }

  function updateMaterialFilter(changes) {
    Object.assign(operationsView,changes);
    operationsView.assetSelection.clear();
    ui.pages.materials=0;
    render();
  }

  Object.assign(fidActions,{
    opsMaterialType:id=>{if(Object.hasOwn(assetTypes,id))updateMaterialFilter({assetType:id,assetGroup:'',assetQuery:''});},
    opsMaterialGroup:id=>updateMaterialFilter({assetGroup:id}),
    opsMaterialReset:()=>updateMaterialFilter({assetGroup:'',assetQuery:''}),
    opsMaterialGroupAdd:()=>openMaterialGroup(),
    opsMaterialGroupEdit:openMaterialGroup,
    opsMaterialGroupDelete:deleteMaterialGroup,
    opsMaterialGroupDeleteConfirmed:id=>{
      if(!manager()||operationsData().assets.some(item=>item.groupId===id))return;
      operationsData().assetGroups=operationsData().assetGroups.filter(item=>item.id!==id);
      if(operationsView.assetGroup===id)operationsView.assetGroup='';
      saveOperation('分组已删除。');
    },
    opsAssetAdd:()=>openAsset(),opsAssetEdit:openAsset,opsAssetPreview:previewAsset,
    opsAssetMove:moveAssets,
    opsAssetDelete:()=>{
      if(manager()&&operationsView.assetSelection.size)fidConfirm('批量删除素材','确定删除所选的素材？','opsAssetDeleteConfirmed');
    },
    opsAssetDeleteConfirmed:()=>{
      if(!manager())return;
      operationsData().assets=operationsData().assets.filter(item=>!operationsView.assetSelection.has(item.id));
      operationsView.assetSelection.clear();saveOperation('素材已删除。');
    },
    opsMaterialImport:openMaterialImport,
    opsMaterialExport:()=>downloadOperationsCsv('素材-'+assetTypes[operationsView.assetType]+'.csv',[
      ['素材名称','素材内容'],...matchingAssets().map(item=>[item.title,[item.body,item.file,item.nickname,item.contact].filter(Boolean).join('\n')]),
    ]),
  });

  Object.assign(fidForms,{
    'fid-ops-group-form':saveMaterialGroup,'fid-ops-asset-form':saveAsset,'fid-ops-move-form':saveAssetMove,
    'fid-ops-import-form':saveMaterialImport,
    'fid-ops-material-search-form':(values,value)=>updateMaterialFilter({assetQuery:value('query')}),
  });

  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-action="turnPage"][data-view="materials"]');
    if(target)operationsView.assetSelection.clear();
  },true);

  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.dataset.pageSize==='materials'||input.dataset.pageJump==='materials')operationsView.assetSelection.clear();
    if(input.id==='fid-ops-asset-all'&&manager()){
      const current=paged(matchingAssets(),'materials');
      operationsView.assetSelection=new Set(input.checked?current.map(item=>item.id):[]);render();
    }
    if(input.hasAttribute('data-ops-asset-check')&&manager()){
      const id=input.dataset.opsAssetCheck;
      if(input.checked)operationsView.assetSelection.add(id);else operationsView.assetSelection.delete(id);
      render();
    }
  },true);
