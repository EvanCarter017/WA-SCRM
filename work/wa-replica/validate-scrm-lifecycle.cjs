const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'outputs/wa-replica-prototype');
const read = p => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const json = p => JSON.parse(read(p));

// 1. Verify historical baseline files remain untouched when present locally
const hashes = json(path.join(__dirname, 'baseline.json'));
let verifiedBaseline = 0;
for (const [name, hash] of Object.entries(hashes)) {
  const target = path.join(root, 'outputs', name);
  if (fs.existsSync(target)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    assert.equal(actual, hash, `Baseline file changed: ${name}`);
    verifiedBaseline++;
  }
}

// 2. Verify requirements.json integrity and lifecycle scope modules
const req = json(path.join(out, 'requirements.json'));
assert.equal(req.version, '0.7-scrm-pipelines');
assert(req.modules.some(m => m.id === 'P-LIFECYCLE' && m.screens.includes('lifecycle')));
assert(req.modules.some(m => m.id === 'P-PIPELINES' && m.screens.includes('pipelines')));
assert(req.modules.some(m => m.id === 'P-DEALS' && m.screens.includes('deals')));
assert(req.review.items.some(i => i.id === 'LIFECYCLE'));
assert.equal(req.modules.find(m => m.id === 'P-BROADCAST')?.decision, '本轮不展示');
assert.equal(req.modules.find(m => m.id === 'P-MATERIALS')?.decision, '保留');

// 3. Verify app.js & standalone HTML bundles have zero external network dependencies and valid JS syntax
const appJs = read(path.join(out, 'app.js'));
assert(!/\b(fetch|WebSocket|XMLHttpRequest)\s*\(/.test(appJs), 'app.js must not issue network requests');
assert(!/S1\s*·\s*undefined/.test(appJs));
new vm.Script(appJs, { filename: 'app.js' });

for (const bundleName of ['whatsapp-scrm-lifecycle.html', 'whatsapp-replica-ui-fidelity.html']) {
  const standalone = read(path.join(root, 'outputs', bundleName));
  assert(!/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"|chm123\.com/i.test(standalone), `External asset found in ${bundleName}`);
  const scripts = [...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 5, `Expected 5 inline script blocks in ${bundleName}`);
  for (const s of scripts) new vm.Script(s[1]);
}

// 4. Verify the preset pipelines are structurally sound
const pipelineSource = read(path.join(__dirname, 'fidelity-pipelines.js'));
const defs = vm.runInNewContext(
  pipelineSource + '\n;({ pipelines: lcPresetPipelines(), LC_CATEGORIES, LC_CAPTURES, LC_METRICS, LC_ROLES, LC_TASK_TYPES, LC_LEGACY_STAGE_IDS, issues: lcPresetPipelines().map(lcPipelineIssues) })',
  {}, { filename: 'fidelity-pipelines.js' }
);
assert(defs.pipelines.length >= 2, 'Expected at least two preset pipelines');
assert.equal(defs.pipelines.filter(p => p.isDefault).length, 1, 'Exactly one preset pipeline must be the default');
const allStageIds = defs.pipelines.flatMap(p => p.stages.map(s => s.id));
assert.equal(new Set(allStageIds).size, allStageIds.length, 'Stage ids must be unique across pipelines');
defs.pipelines.forEach((p, i) => {
  assert.deepEqual([...defs.issues[i]], [], `Preset pipeline "${p.name}" has configuration issues`);
  const ids = new Set(p.stages.map(s => s.id));
  assert(p.lostReasons.length > 0, `${p.name}: lost reasons required`);
  for (const s of p.stages) {
    assert(Object.hasOwn(defs.LC_CATEGORIES, s.category), `${p.name}/${s.name}: unknown category`);
    assert(Object.hasOwn(defs.LC_CAPTURES, s.capture), `${p.name}/${s.name}: unknown capture`);
    assert(Object.hasOwn(defs.LC_METRICS, s.metric), `${p.name}/${s.name}: unknown metric`);
    assert(defs.LC_TASK_TYPES.includes(s.taskType), `${p.name}/${s.name}: unknown task type`);
    assert(!s.next || ids.has(s.next), `${p.name}/${s.name}: next stage missing`);
  }
  for (const role of Object.keys(defs.LC_ROLES)) assert(ids.has(p.roles[role]), `${p.name}: role ${role} must map to a stage`);
});
for (const id of Object.values(defs.LC_LEGACY_STAGE_IDS)) assert(allStageIds.includes(id), `Legacy stage alias points at missing id ${id}`);

// 5. Guard against hardcoding: page logic must not branch on, or assign, a stage by its display name.
// A stage name may appear inside descriptive text; what is forbidden is using it as a value:
//   x === '报价推进'   stage: '新进线'   data-target="需求澄明"   ['新进线', ...].includes(c.stage)
const stageNames = [...new Set([...defs.pipelines.flatMap(p => p.stages.map(s => s.name)), ...Object.keys(defs.LC_LEGACY_STAGE_IDS)])];
const asValue = name => [`'${name}'`, `"${name}"`, '`' + name + '`'];
const guardedFiles = ['fidelity-lifecycle.js', 'fidelity-pipeline-settings.js', 'fidelity-dashboard.js', 'fidelity-ui.js', 'fidelity-customer-pages.js', 'fidelity-openwa.js', 'fidelity-operations.js', 'fidelity-subsite.js'];
function stageNameDependency(line) {
  for (const name of stageNames) {
    if (line.includes(`data-target="${name}"`)) return name;
    for (const literal of asValue(name)) {
      let at = line.indexOf(literal);
      while (at >= 0) {
        const before = line.slice(0, at).trimEnd();
        const after = line.slice(at + literal.length).trimStart();
        const compared = /[=!]==?$/.test(before) || /^[=!]==?/.test(after);
        const assigned = /\bstage\s*[:=]$/.test(before);
        const listed = /\.includes\(\s*[\w.?]*\.?stage\b/.test(after.slice(after.indexOf(']') + 1)) && before.lastIndexOf('[') > before.lastIndexOf(']');
        if (compared || assigned || listed) return name;
        at = line.indexOf(literal, at + literal.length);
      }
    }
  }
  return '';
}
// The guard itself must catch the patterns the v0.6 build used.
for (const sample of ["if (targetStage === '报价推进') {", "tags: [], stage: '新进线', stageEnteredAt: nowIso,", 'data-target="需求澄明"', "if (['新进线', '需求澄明'].includes(c.stage)) {", "c.stage = '复购培育';"]) {
  assert(stageNameDependency(sample), `Stage-name guard failed to flag: ${sample}`);
}
assert.equal(stageNameDependency("taskType: '沉睡唤醒', title: '跟进「报价推进」客户'"), '', 'Stage-name guard must allow task types and descriptive text');
for (const file of guardedFiles) {
  read(path.join(__dirname, file)).split('\n').forEach((line, index) => {
    const name = stageNameDependency(line);
    assert(!name, `${file}:${index + 1} depends on the stage name "${name}"; use stage ids, categories or pipeline roles`);
  });
}

const summary = {
  version: req.version,
  status: 'passed',
  checkedAt: new Date().toISOString(),
  projectRoot: path.basename(root),
  historicalBaselineVerified: verifiedBaseline,
  standaloneBundlesVerified: ['whatsapp-scrm-lifecycle.html', 'whatsapp-replica-ui-fidelity.html'],
  lifecyclePipelines: defs.pipelines.map(p => ({ id: p.id, name: p.name, default: p.isDefault, stages: p.stages.map(s => s.name) })),
  stageNameHardcoding: 'none',
  externalNetworkCalls: false,
};
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
