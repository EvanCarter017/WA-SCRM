const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), vm=require('node:vm'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'), out=path.join(root,'outputs/wa-replica-prototype');
const read=p=>fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const qa=json(path.join(root,'replica/fidelity/interaction-validation.json'));
assert.equal(qa.version,'0.5-replica-fidelity'); assert(qa.results.every(x=>x.pass)); assert.equal(qa.passed,qa.results.length);
const before=json(path.join(__dirname,'fidelity-base/requirements.json')), after=json(path.join(out,'requirements.json'));
assert.equal(after.version,qa.version);
for(const key of ['confirmedRequirements','approvalGate'])assert.deepEqual(after[key],before[key]);
const unaffectedModules = ({modules}) => modules.filter(m=>!['P-AUTO','P-BROADCAST','P-MATERIALS','P-REPLY-MANAGEMENT','P-DASHBOARD','P-TEAM'].includes(m.id));
assert.deepEqual(unaffectedModules(after),unaffectedModules(before));
const auto = before.modules.find(m=>m.id==='P-AUTO');
const broadcast = after.modules.find(m=>m.id==='P-BROADCAST');
assert.equal(broadcast.decision,'本轮不展示');
assert.deepEqual(broadcast.originalIds,['ops-mass','D10']);
assert.deepEqual(broadcast.screens,[]);
assert.deepEqual(after.modules.find(m=>m.id==='P-AUTO'),{
  ...auto,
  name:'自动回复',
  decision:'本轮不展示',
  basis:'用户评审备注确认暂缓',
  originalIds:auto.originalIds.filter(id=>!broadcast.originalIds.includes(id)),
  features:auto.features.filter(feature=>feature!=='群发'),
  notes:'关键词回复和欢迎语回复暂缓。',
});
const materials = after.modules.find(m=>m.id==='P-MATERIALS');
assert.equal(materials.decision,'保留');
assert.deepEqual(materials.screens,['materials']);
const replyManagement = after.modules.find(m=>m.id==='P-REPLY-MANAGEMENT');
assert.equal(replyManagement.decision,'本轮不展示');
assert.deepEqual(replyManagement.screens,[]);
const dashboard = after.modules.find(m=>m.id==='P-DASHBOARD');
assert.equal(dashboard.decision,'首轮原型');
assert.deepEqual(dashboard.screens,['dashboard']);
const team = after.modules.find(m=>m.id==='P-TEAM');
assert.equal(team.decision,'本轮不展示');
assert.deepEqual(team.screens,[]);
assert.deepEqual(after.connectionDecision,{
  ...before.connectionDecision,
  status:'已确认',
  options:['OpenWA 桥接'],
  selected:'OpenWA 桥接',
  provider:'rmyndharis/OpenWA',
});
const baselineReview=structuredClone(before.review);
const connectionReview=after.review.items.find(item=>item.id==='CONNECTION');
assert.match(connectionReview.question,/OpenWA 桥接.*扫码绑定/);
baselineReview.items.find(item=>item.id==='CONNECTION').question=connectionReview.question;
assert.deepEqual(after.review,baselineReview);
const exported=json(qa.reviewExport);
assert.equal(exported.version,after.version);
for(const key of ['customers','messages','accounts','members'])assert(!Object.hasOwn(exported,key));
assert.deepEqual(exported.modules,before.modules);
const standalone=read(path.join(root,'outputs/whatsapp-replica-ui-fidelity.html'));
assert(!/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"|chm123\.com|reference-(tags|chat)\.png/i.test(standalone));
const scripts=[...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,5); for(const s of scripts)new vm.Script(s[1]);
const app = read(path.join(out,'app.js'));
assert(!/\b(fetch|WebSocket|XMLHttpRequest)\s*\(/.test(app));
assert(!/['"](?:quick-replies|keyword-replies|welcome-replies)['"]/.test(app));
const hashes=json(path.join(__dirname,'baseline.json'));
for(const [name,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'outputs',name))).digest('hex'),hash);
const result={version:after.version,status:'passed',prototypeOnly:true,browserChecks:qa.passed,browserFailures:qa.failed,referenceViewport:[1440,900],requirementsPreserved:true,originalAndHistoricalFilesVerified:Object.keys(hashes).length,reviewExportParsed:true,localStandalone:true,sourceAssetsIncluded:false,realWhatsAppIntegration:false};
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(result,null,2)+'\n');
const {reviewExport,...publicQA}=qa;
fs.writeFileSync(path.join(out,'interaction-validation.json'),JSON.stringify(publicQA,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
