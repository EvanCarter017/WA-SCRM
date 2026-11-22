// Tests of the reader of price lists (fidelity-pricefile.js), which the page loads as pricefile.js.
// Run with Node 22.13 or newer:  node --test work/wa-replica/price-file.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { read, LIMITS } = require('./fidelity-pricefile.js');

// ---- making files: a zip archive, and the parts of a workbook ----
// packed: true deflates a part, false stores it; lie makes the archive state a wrong unpacked size.
function zip(parts, { packed = true, lie = null } = {}) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(parts)) {
    const raw = Buffer.from(content), body = packed ? zlib.deflateRawSync(raw) : raw, label = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(packed ? 8 : 0, 8);
    head.writeUInt32LE(zlib.crc32(raw), 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(lie ?? raw.length, 22);
    head.writeUInt16LE(label.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(packed ? 8 : 0, 10);
    entry.writeUInt32LE(zlib.crc32(raw), 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(lie ?? raw.length, 24);
    entry.writeUInt16LE(label.length, 28);
    entry.writeUInt32LE(offset, 42);
    local.push(head, label, body);
    central.push(entry, label);
    offset += 30 + label.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(parts).length, 8);
  end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, directory, end]));
}
const xml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const letters = n => (n >= 26 ? letters(Math.floor(n / 26) - 1) : '') + String.fromCharCode(65 + (n % 26));
// One sheet from rows of cells: a number is stored as a number, a text among the shared texts, an empty cell is
// left out — as a spreadsheet program writes them.
function sheetParts(rows) {
  const shared = [];
  const cell = (value, r, c) => {
    if (value === '' || value === null || value === undefined) return '';
    const ref = letters(c) + (r + 1);
    if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
    if (typeof value === 'object') return `<c r="${ref}"${value.attrs || ''}>${value.body}</c>`;
    return `<c r="${ref}" t="s"><v>${shared.push(value) - 1}</v></c>`;
  };
  const data = rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(value, r, c)).join('')}</row>`).join('');
  return {
    sheet: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data}</sheetData></worksheet>`,
    strings: `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${shared.map(s => `<si><t>${xml(s)}</t></si>`).join('')}</sst>`,
  };
}
function workbook(rows, options = {}) {
  const { sheet, strings } = sheetParts(rows);
  return zip({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
    'xl/sharedStrings.xml': strings,
  }, options);
}
const csv = text => new TextEncoder().encode(text);
const refused = async (bytes, code) => assert.equal(await read(bytes).then(() => 'read', e => e.code || 'thrown: ' + e.message), code);

// The shape of the owner's list: a title above the header, a name written once for several lines (cells that span
// the lines of a product), one column of prices.
const OWN = [
  ['product quotation'],
  ['short', 'full', 'specification', 'Price ($)'],
  ['PRDA01', 'Product Alpha', '100*10 Units', 40],
  ['PRDA02', '', '200*10 Units', 50],
  ['PRDA03', '', '150*10 Units', 55.5],
  ['PRDB01', 'Product Beta', '120*10 Units', 72],
  ['PRDB02', '', '60*10 Units', 290.1],
];

test('a workbook: the title above the header is passed over, a name written once is carried down, prices stay as the file gives them', async () => {
  const list = await read(workbook(OWN));
  assert.deepEqual(list.columns, { code: 'short', name: 'full', spec: 'specification', prices: ['Price ($)'] });
  assert.deepEqual(list.rows, [
    { code: 'PRDA01', name: 'Product Alpha', spec: '100*10 Units', prices: ['40'] },
    { code: 'PRDA02', name: 'Product Alpha', spec: '200*10 Units', prices: ['50'] },
    { code: 'PRDA03', name: 'Product Alpha', spec: '150*10 Units', prices: ['55.5'] },
    { code: 'PRDB01', name: 'Product Beta', spec: '120*10 Units', prices: ['72'] },
    { code: 'PRDB02', name: 'Product Beta', spec: '60*10 Units', prices: ['290.1'] },
  ]);
  assert.equal(list.skipped, 0);
});

test('a workbook whose parts are stored, not deflated, reads the same; so does an ArrayBuffer', async () => {
  const stored = workbook(OWN, { packed: false });
  assert.deepEqual((await read(stored)).rows, (await read(workbook(OWN))).rows);
  assert.equal((await read(stored.buffer.slice(stored.byteOffset, stored.byteOffset + stored.byteLength))).rows.length, 5);
});

test('a number keeps its digits; the tail a binary fraction leaves is taken off; a price in the thousands keeps its comma', async () => {
  const list = await read(workbook([
    ['code', 'name', 'price'],
    ['A1', 'One', { body: '<v>100.90000000000001</v>' }],
    ['A2', 'Two', { body: '<v>1.5E3</v>' }],
    ['A3', 'Three', { body: '<v>0.30000000000000004</v>' }],
    ['A4', 'Four', 1200],
    ['A5', 'Five', '1,200.50'],
  ]));
  assert.deepEqual(list.rows.map(r => r.prices[0]), ['100.9', '1500', '0.3', '1200', '1,200.50']);
});

test('a price written with its currency sign is a price and stays as it is written', async () => {
  const list = await read(csv('code,name,price,note\nA,One,$40,x\nB,Two,"$1,200.50",y\nC,Three,40 €,z\n'));
  assert.deepEqual(list.columns, { code: 'code', name: 'name', spec: 'note', prices: ['price'] });
  assert.deepEqual(list.rows.map(r => r.prices[0]), ['$40', '$1,200.50', '40 €']);
});

test('several columns of prices are all kept, each under its header', async () => {
  const list = await read(workbook([
    ['SKU', 'Product', 'Pack', '1-99 ($)', '100+ ($)', 'Note'],
    ['K-1', 'Kit one', '10 pcs', 12, 10.5, 'new'],
    ['K-2', 'Kit two', '20 pcs', 20, '', 'old'],
  ]));
  assert.deepEqual(list.columns.prices, ['1-99 ($)', '100+ ($)']);
  assert.deepEqual(list.rows, [
    { code: 'K-1', name: 'Kit one', spec: '10 pcs', prices: ['12', '10.5'] },
    { code: 'K-2', name: 'Kit two', spec: '20 pcs', prices: ['20', ''] },
  ]);
});

test('codes that are numbers are codes: the leftmost column and a column called a code are never prices', async () => {
  const left = await read(workbook([['item', 'name', 'price'], [1001, 'One', 5], [1002, 'Two', 6]]));
  assert.deepEqual(left.rows.map(r => [r.code, r.prices]), [['1001', ['5']], ['1002', ['6']]]);
  const named = await read(workbook([['name', 'SKU', 'price'], ['One', 1001, 5], ['Two', 1002, 6]]));
  assert.deepEqual(named.columns, { code: 'name', name: 'SKU', spec: '', prices: ['price'] });
});

test('two columns are enough: a code and a price', async () => {
  const list = await read(workbook([['code', 'USD'], ['A', 1], ['B', 2]]));
  assert.deepEqual(list.columns, { code: 'code', name: '', spec: '', prices: ['USD'] });
  assert.deepEqual(list.rows, [{ code: 'A', name: '', spec: '', prices: ['1'] }, { code: 'B', name: '', spec: '', prices: ['2'] }]);
});

test('a line without a price is left out and counted; an empty line is not counted', async () => {
  const list = await read(workbook([
    ['code', 'name', 'price'],
    ['A', 'One', 1],
    ['', '', ''],
    ['B', 'Two', ''],
    ['Discontinued'],
    ['C', 'Three', 3],
  ]));
  assert.deepEqual(list.rows.map(r => r.code), ['A', 'C']);
  assert.equal(list.skipped, 2);
});

test('texts are read as texts: runs of rich text are joined, phonetic guides left out, entities decoded, markup kept as it is written', async () => {
  const list = await read(workbook([
    ['code', 'name', 'price'],
    ['R1', { attrs: ' t="inlineStr"', body: '<is><r><t>Rich </t></r><r><t xml:space="preserve">text</t></r><rPh><t>guide</t></rPh></is>' }, 1],
    ['R2', 'Salt & <b>pepper</b>', 2],
    ['R3', { attrs: ' t="str"', body: '<f>CONCATENATE("a","b")</f><v>ab</v>' }, 3],
  ]));
  assert.deepEqual(list.rows.map(r => r.name), ['Rich text', 'Salt & <b>pepper</b>', 'ab']);
});

test('a cell is cut at the limit and its white space made single', async () => {
  const list = await read(workbook([['code', 'name', 'price'], ['L', 'a  b\n c' + 'x'.repeat(400), 1]]));
  assert.equal(list.rows[0].name.length, LIMITS.cell);
  assert(list.rows[0].name.startsWith('a b cx'));
});

test('the first sheet that holds a table is used; a part named from the root of the archive is found', async () => {
  const first = sheetParts([['only a title']]), second = sheetParts([['code', 'price'], ['Z', 9]]);
  const book = zip({
    'xl/workbook.xml': '<workbook xmlns:r="x"><sheets><sheet name="Cover" sheetId="1" r:id="rId1"/><sheet name="Prices" sheetId="2" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId2" Target="/xl/worksheets/prices.xml"/><Relationship Id="rId1" Target="worksheets/cover.xml"/></Relationships>',
    'xl/worksheets/cover.xml': first.sheet,
    'xl/worksheets/prices.xml': second.sheet.replace(/t="s"><v>(\d+)<\/v>/g, (all, n) => `t="inlineStr"><is><t>${['code', 'price', 'Z'][n]}</t></is>`),
  });
  assert.deepEqual((await read(book)).rows, [{ code: 'Z', name: '', spec: '', prices: ['9'] }]);
});

test('a text file: commas, semicolons or tabs between the cells; quoted cells; either kind of line end; a mark at the start', async () => {
  const want = [
    { code: 'A1', name: 'Bolt, steel', spec: '10 "long"', prices: ['1.50'] },
    { code: 'A2', name: 'Nut', spec: '', prices: ['0.25'] },
  ];
  for (const mark of [',', ';', '\t']) {
    for (const end of ['\n', '\r\n']) {
      const lines = [['code', 'name', 'spec', 'price'], ['A1', '"Bolt, steel"', '"10 ""long"""', '1.50'], ['A2', 'Nut', '', '0.25']].map(l => l.join(mark)).join(end);
      const list = await read(csv('﻿' + lines + end));
      assert.deepEqual(list.rows, want, JSON.stringify(mark) + ' ' + JSON.stringify(end));
      assert.deepEqual(list.columns, { code: 'code', name: 'name', spec: 'spec', prices: ['price'] });
    }
  }
});

test('a text file in Chinese with a currency in the header', async () => {
  const list = await read(csv('简称,全称,规格,单价（美元 $）\nA1,阿尔法,10 件,40\nA2,,20 件,50\n'));
  assert.deepEqual(list.columns, { code: '简称', name: '全称', spec: '规格', prices: ['单价（美元 $）'] });
  assert.deepEqual(list.rows[1], { code: 'A2', name: '阿尔法', spec: '20 件', prices: ['50'] });
});

test('files that are not a price list are refused with a reason', async () => {
  await refused(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]), 'old-excel');
  await refused(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]), 'unreadable');
  await refused(zip({ 'word/document.xml': '<w:document/>' }), 'unreadable');
  await refused(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 13]), 'unreadable');
  await refused(csv('just one line of words'), 'no-table');
  await refused(new Uint8Array(2), 'no-table');
  await refused(csv('code,name\nA,One\nB,Two\n'), 'no-prices');
  await refused(csv('code,name,price\n'), 'no-prices');
  await refused(workbook([['only a title']]), 'no-table');
  await refused(new Uint8Array(LIMITS.bytes + 1), 'too-large');
});

test('a list longer than the limit is refused, in a text file and in a workbook', async () => {
  const lines = ['code,price'];
  for (let i = 0; i <= LIMITS.rows; i++) lines.push(`C${i},${i + 1}`);
  await refused(csv(lines.join('\n')), 'too-many-rows');
  assert.equal((await read(csv(lines.slice(0, -1).join('\n')))).rows.length, LIMITS.rows);
  const rows = [['code', 'price']];
  for (let i = 0; i <= LIMITS.rows + 60; i++) rows.push(['C' + i, i + 1]);
  await refused(workbook(rows), 'too-many-rows');
});

test('a list whose texts take more room than the limit is refused', async () => {
  const lines = ['code,name,spec,price'];
  for (let i = 0; i < 2500; i++) lines.push(`C${i},${'n'.repeat(190)},${'s'.repeat(190)},${i + 1}`);
  await refused(csv(lines.join('\n')), 'too-long');
  assert.equal((await read(csv(lines.slice(0, 2001).join('\n')))).rows.length, 2000);
});

test('a part that unpacks to more than the limit is refused, whatever size the archive states for it', async () => {
  const huge = Buffer.alloc(LIMITS.part + 1024, 0x20);
  const honest = zip({ 'xl/workbook.xml': '<workbook/>', 'xl/worksheets/sheet1.xml': huge });
  assert(honest.length < LIMITS.bytes, 'the archive itself is small: ' + honest.length);
  await refused(honest, 'unreadable');
  await refused(zip({ 'xl/workbook.xml': '<workbook/>', 'xl/worksheets/sheet1.xml': huge }, { lie: 1000 }), 'unreadable');
});
