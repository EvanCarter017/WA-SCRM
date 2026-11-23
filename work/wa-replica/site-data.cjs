// The data of one sub-site: one document, stored as rows so that a save rewrites only what changed.
// A key is the name of a top-level field ("customers"), or "<field>/<id>" for one entry of a field that is a
// map ("messages/c4"). Every save names the version it was based on; a save based on an older version is
// refused, so two open pages cannot silently overwrite each other.
// Needs Node 22.13 or newer (built-in SQLite).
const { DatabaseSync } = require('node:sqlite');

const KEY = /^[A-Za-z][A-Za-z0-9]{0,39}(\/[A-Za-z0-9_.-]{1,80})?$/;
const MAX_VALUE = 2 * 1024 * 1024;
const SAVES_KEPT = 10000;

const problem = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });
// Sets a property of an object's own, whatever it is called: a field or a part can have a name that every object
// has ("constructor") or one that is special ("__proto__"), and must touch nothing but the document.
const own = (target, name, value) => Object.defineProperty(target, name, { value, enumerable: true, writable: true, configurable: true });

// Opens (and creates) the database of one sub-site. now() is replaceable for tests.
function openData(file, { now = () => Date.now() } = {}) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS doc (key TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (version INTEGER PRIMARY KEY, at TEXT NOT NULL, by TEXT NOT NULL, keys TEXT NOT NULL);
  `);
  const version = () => db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM saves').get().v;

  // The whole document with its version, or only the named top-level fields of it. Split fields are put together again.
  function read(fields) {
    const data = {};
    for (const { key, json } of db.prepare('SELECT key, json FROM doc ORDER BY key').all()) {
      const [field, id] = key.split('/');
      if (fields && !fields.includes(field)) continue;
      if (id === undefined) own(data, field, JSON.parse(json));
      else {
        if (!Object.hasOwn(data, field)) own(data, field, {});
        if (data[field] && typeof data[field] === 'object') own(data[field], id, JSON.parse(json));
      }
    }
    return { version: version(), data };
  }

  function apply(set, remove, by) {
    const current = version();
    const put = db.prepare('INSERT INTO doc (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json');
    // A field is stored either whole or split into parts. Before a part is saved or removed, a field that is
    // still stored whole is split; it must be a map whose entry names can be keys.
    const split = field => {
      const whole = db.prepare('SELECT json FROM doc WHERE key = ?').get(field);
      if (!whole) return;
      const value = JSON.parse(whole.json);
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(id => !KEY.test(field + '/' + id))) throw problem('key-conflict');
      db.prepare('DELETE FROM doc WHERE key = ?').run(field);
      for (const [id, part] of Object.entries(value)) put.run(field + '/' + id, JSON.stringify(part));
    };
    for (const [key, json] of set) {
      const [field, id] = key.split('/');
      if (id === undefined) db.prepare('DELETE FROM doc WHERE key LIKE ?').run(field + '/%');
      else split(field);
      put.run(key, json);
    }
    for (const key of remove) {
      const [field, id] = key.split('/');
      if (id !== undefined) split(field);
      db.prepare('DELETE FROM doc WHERE key = ?').run(key);
      if (id === undefined) db.prepare('DELETE FROM doc WHERE key LIKE ?').run(key + '/%');
    }
    const keys = [...set.map(([key]) => key), ...remove];
    db.prepare('INSERT INTO saves (version, at, by, keys) VALUES (?, ?, ?, ?)').run(current + 1, new Date(now()).toISOString(), String(by), keys.join(' '));
    if ((current + 1) % 1000 === 0) db.prepare('DELETE FROM saves WHERE version <= ?').run(current + 1 - SAVES_KEPT);
    return current + 1;
  }

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  // Saves the named keys. baseVersion must be the version the caller last read.
  function write({ baseVersion, set = {}, remove = [], by }) {
    if (!set || typeof set !== 'object' || Array.isArray(set) || !Array.isArray(remove)) throw problem('invalid-request');
    const keys = [...Object.keys(set), ...remove];
    if (!Number.isInteger(baseVersion) || !keys.length || keys.some(key => typeof key !== 'string' || !KEY.test(key)) || new Set(keys).size !== keys.length) throw problem('invalid-request');
    const rows = Object.entries(set).map(([key, value]) => {
      const json = JSON.stringify(value);
      if (json === undefined) throw problem('invalid-request');
      if (json.length > MAX_VALUE) throw problem('too-long');
      return [key, json];
    });
    return transaction(() => {
      const current = version();
      if (baseVersion !== current) throw problem('version-conflict', { version: current });
      return { version: apply(rows, remove, by) };
    });
  }

  // Replaces the whole document (used by the administration tool to load a saved copy).
  function replace(data, by) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !KEY.test(key) || key.includes('/'))) throw problem('invalid-request');
    return transaction(() => {
      db.exec('DELETE FROM doc');
      return { version: apply(Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]), [], by) };
    });
  }

  // Takes a field out for good — for content that must leave no trace, such as a price list. Its rows go; its
  // name goes from the log of saves, and an entry that named nothing else goes entirely; one entry without a name
  // is added so that the version moves on. Then the file is written anew, which drops what the rows had left in
  // pages no longer in use, and the write-ahead log is emptied.
  function purge({ baseVersion, field, by }) {
    if (!Number.isInteger(baseVersion) || typeof field !== 'string' || !KEY.test(field) || field.includes('/')) throw problem('invalid-request');
    const saved = transaction(() => {
      const current = version();
      if (baseVersion !== current) throw problem('version-conflict', { version: current });
      db.prepare('DELETE FROM doc WHERE key = ? OR substr(key, 1, ?) = ?').run(field, field.length + 1, field + '/');
      for (const row of db.prepare('SELECT version, keys FROM saves').all()) {
        const keys = row.keys.split(' '), rest = keys.filter(key => key !== field && !key.startsWith(field + '/'));
        if (rest.length === keys.length) continue;
        if (rest.length) db.prepare('UPDATE saves SET keys = ? WHERE version = ?').run(rest.join(' '), row.version);
        else db.prepare('DELETE FROM saves WHERE version = ?').run(row.version);
      }
      db.prepare('INSERT INTO saves (version, at, by, keys) VALUES (?, ?, ?, ?)').run(current + 1, new Date(now()).toISOString(), String(by), '');
      return { version: current + 1 };
    });
    // Someone else who is reading the file at this moment (the administration tool, a copy being made) is waited for.
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('VACUUM');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    return saved;
  }

  const lastSaves = (count = 20) => db.prepare('SELECT version, at, by, keys FROM saves ORDER BY version DESC LIMIT ?').all(count);
  return { read, write, replace, purge, lastSaves, close: () => db.close() };
}

module.exports = { openData, KEY, MAX_VALUE };
