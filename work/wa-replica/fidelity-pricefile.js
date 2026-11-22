// Reads a price list from an .xlsx or .csv file. Standalone: the page loads it as pricefile.js and calls
// window.WA_PRICE_FILE.read(bytes); its tests load the same file in Node. Nothing in a file is run — it is read
// as text and numbers only — and a price is kept exactly as the file gives it.
//
// What a file must look like: one table with a header line. Lines above the header that fill a single cell (a
// title) are passed over. A column whose cells are numbers is a price column — there may be several; the other
// columns are, from the left, the product's code, its name and its specification (a list may do without the last
// two). A name left empty takes the name of the line above, which is how a name that spans several lines of a
// sheet arrives.
//
// read(bytes) resolves to { columns: { code, name, spec, prices: [..] }, rows: [{ code, name, spec, prices }],
// skipped } — columns carry the header texts, '' for a column the list does not have — or rejects with an Error
// whose code is one of: too-large, too-long, old-excel, unreadable, no-table, no-prices, too-many-rows.
(function (root) {
  // A file of at most `bytes`; a part of a workbook unpacks to at most `part`; a list of at most `rows` products
  // whose texts, as they are kept, take at most `text` characters; a cell is cut at `cell` characters.
  const LIMITS = { bytes: 5 * 1024 * 1024, part: 20 * 1024 * 1024, rows: 5000, text: 1000000, cell: 200 };
  const fail = code => Object.assign(new Error(code), { code });
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.cell);
  const text = bytes => new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');

  // ---- .xlsx: a zip archive of XML parts ----
  // Unpacks one part of the archive. The size an archive states for a part need not be true, so the unpacking
  // itself stops at the limit.
  async function inflate(bytes) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > LIMITS.part) {
        await reader.cancel().catch(() => {});
        throw fail('unreadable');
      }
      chunks.push(value);
    }
    const plain = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      plain.set(chunk, at);
      at += chunk.length;
    }
    return plain;
  }
  // The parts of the archive by name; a part is read when it is asked for.
  function archive(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) throw fail('unreadable');
    const count = view.getUint16(end + 10, true);
    let at = view.getUint32(end + 16, true);
    const parts = new Map();
    for (let n = 0; n < count; n++) {
      if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw fail('unreadable');
      const method = view.getUint16(at + 10, true), packed = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true);
      const nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
      const local = view.getUint32(at + 42, true);
      parts.set(text(bytes.subarray(at + 46, at + 46 + nameLength)), { method, packed, size, local });
      at += 46 + nameLength + extra + comment;
    }
    return async name => {
      const part = parts.get(name);
      if (!part) return null;
      if (part.size > LIMITS.part || part.local + 30 > bytes.length || view.getUint32(part.local, true) !== 0x04034b50) throw fail('unreadable');
      const start = part.local + 30 + view.getUint16(part.local + 26, true) + view.getUint16(part.local + 28, true);
      const packed = bytes.subarray(start, start + part.packed);
      if (part.method === 0) return text(packed);
      if (part.method !== 8) throw fail('unreadable');
      return text(await inflate(packed).catch(() => { throw fail('unreadable'); }));
    };
  }
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const plain = xml => xml.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (all, name) =>
    name[0] === '#' ? String.fromCodePoint(name[1] === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))) : entities[name] ?? all);
  // The texts inside <t> elements of a piece of XML, without phonetic guides.
  const texts = xml => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => plain(m[1])).join('');
  const column = letters => [...letters].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  // A number as a sheet stores it: the tail a binary fraction leaves (100.90000000000001) is taken off.
  const number = value => (/^-?\d+\.\d{7,}$/.test(value) || /e/i.test(value) ? String(Number(Number(value).toFixed(6))) : value);

  async function sheetTable(bytes) {
    const part = archive(bytes);
    const book = await part('xl/workbook.xml');
    if (!book) throw fail('unreadable');
    const links = await part('xl/_rels/workbook.xml.rels') || '';
    const targets = new Map([...links.matchAll(/<Relationship\b[^>]*>/g)].map(m => [/\bId="([^"]*)"/.exec(m[0])?.[1], /\bTarget="([^"]*)"/.exec(m[0])?.[1]]));
    const sheets = [...book.matchAll(/<sheet\b[^>]*>/g)].map(m => targets.get(/\br:id="([^"]*)"/.exec(m[0])?.[1])).filter(Boolean)
      .map(target => (target[0] === '/' ? target.slice(1) : 'xl/' + target));
    const shared = [...(await part('xl/sharedStrings.xml') || '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => texts(m[1]));
    for (const name of sheets.length ? sheets : ['xl/worksheets/sheet1.xml']) {
      const xml = await part(name);
      if (!xml) continue;
      const table = [];
      for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = [];
        let next = 0;
        for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const ref = /\br="([A-Z]+)\d+"/.exec(cell[1]), kind = /\bt="(\w+)"/.exec(cell[1])?.[1] || 'n';
          const at = ref ? column(ref[1]) : next;
          next = at + 1;
          const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cell[2] || '')?.[1];
          if (kind === 's') cells[at] = shared[Number(value)] ?? '';
          else if (kind === 'inlineStr') cells[at] = texts(cell[2] || '');
          else if (value !== undefined) cells[at] = kind === 'n' ? number(plain(value)) : plain(value);
        }
        if (cells.length) table.push(cells);
        if (table.length > LIMITS.rows + 50) throw fail('too-many-rows');
      }
      if (table.length >= 2) return table;
    }
    throw fail('no-table');
  }

  // ---- .csv: text with one line per row; commas, semicolons or tabs between cells ----
  function csvTable(source) {
    const first = source.split(/\r?\n/).find(line => line.trim()) || '';
    const mark = ['\t', ';', ','].map(m => [m, first.split(m).length]).sort((a, b) => b[1] - a[1])[0][0];
    const table = [];
    let row = [], cell = '', quoted = false;
    const endRow = () => {
      row.push(cell);
      cell = '';
      if (row.some(value => value.trim())) table.push(row);
      row = [];
      if (table.length > LIMITS.rows + 50) throw fail('too-many-rows');
    };
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (quoted) {
        if (c === '"' && source[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"' && !cell) quoted = true;
      else if (c === mark) {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && source[i + 1] === '\n') i++;
        endRow();
      } else cell += c;
    }
    if (cell || row.length) endRow();
    return table;
  }

  // ---- a table of texts → the price list ----
  // A price as a cell may hold it: digits, with or without commas for the thousands, a fraction, and a currency
  // sign before or after ("$40", "1,200.50", "40 €").
  const NUMBER = /^[-+]?(?:[$€£¥]\s?)?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?(?:\s?[$€£¥])?$/;
  const PRICE_WORD = /price|cost|amount|价|金额|费用|usd|eur|gbp|cny|rmb|hkd|[$¥€£]/i;
  const CODE_WORD = /sku|code|model|item|short|abbr|编号|型号|货号|简称|代码|缩写/i;
  function priceList(table) {
    const rows = table.map(row => Array.from(row, clean));
    const filled = row => row.filter(Boolean).length;
    const head = rows.findIndex(row => filled(row) >= 2);
    if (head < 0) throw fail('no-table');
    const body = rows.slice(head + 1).filter(filled);
    const width = Math.max(...rows.slice(head).map(row => row.length));
    const columns = [];
    for (let i = 0; i < width; i++) {
      const label = rows[head][i] || '', values = body.map(row => row[i] || '').filter(Boolean);
      if (!label && !values.length) continue;
      const numbers = values.length > 0 && values.filter(value => NUMBER.test(value)).length >= values.length * 0.8;
      // The leftmost column and a column called a code are never prices, even when the codes are numbers.
      columns.push({ i, label, price: !CODE_WORD.test(label) && (PRICE_WORD.test(label) ? numbers || !values.length : numbers && columns.length > 0) });
    }
    const words = columns.filter(c => !c.price), prices = columns.filter(c => c.price);
    if (!words.length || !prices.length) throw fail('no-prices');
    const [code, name, spec] = words;
    const list = [];
    let skipped = 0, above = '';
    for (const row of body) {
      const own = name ? row[name.i] || '' : '';
      const entry = { code: row[code.i] || '', name: own || above, spec: spec ? row[spec.i] || '' : '', prices: prices.map(p => row[p.i] || '') };
      if (own) above = own;
      if ((entry.code || entry.name) && entry.prices.some(Boolean)) list.push(entry);
      else skipped += 1;
    }
    if (!list.length) throw fail('no-prices');
    if (list.length > LIMITS.rows) throw fail('too-many-rows');
    if (JSON.stringify(list).length > LIMITS.text) throw fail('too-long');
    return { columns: { code: code.label, name: name ? name.label : '', spec: spec ? spec.label : '', prices: prices.map(p => p.label) }, rows: list, skipped };
  }

  async function read(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length > LIMITS.bytes) throw fail('too-large');
    if (bytes.length < 4) throw fail('no-table');
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) throw fail('old-excel');
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return priceList(await sheetTable(bytes));
    if (bytes.includes(0)) throw fail('unreadable');
    return priceList(csvTable(text(bytes)));
  }

  const api = { read, LIMITS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WA_PRICE_FILE = api;
})(typeof window === 'undefined' ? globalThis : window);
