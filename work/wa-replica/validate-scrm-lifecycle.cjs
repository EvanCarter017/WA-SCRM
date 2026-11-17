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
assert.equal(req.version, '0.6-scrm-lifecycle');
assert(req.modules.some(m => m.id === 'P-LIFECYCLE' && m.screens.includes('lifecycle')));
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

const summary = {
  version: req.version,
  status: 'passed',
  checkedAt: new Date().toISOString(),
  projectRoot: path.basename(root),
  historicalBaselineVerified: verifiedBaseline,
  standaloneBundlesVerified: ['whatsapp-scrm-lifecycle.html', 'whatsapp-replica-ui-fidelity.html'],
  lifecycleStages: ['新进线', '需求澄明', '报价推进', '成交履约', '复购培育', '沉睡唤醒', '流失归档'],
  externalNetworkCalls: false,
};
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
