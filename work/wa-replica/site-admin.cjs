// Administration tool for the accounts and the data of a sub-site. Run it on the server, as the user that runs
// the service:
//   node site-admin.cjs user add <username> <agent|supervisor|admin> <display name>
//   node site-admin.cjs user reset <username>        a new temporary password; ends the account's sessions
//   node site-admin.cjs user disable <username>      user enable <username>
//   node site-admin.cjs user list
//   node site-admin.cjs data export <file>           data import <file>
// Environment: WA_SCRM_DATA_DIR (required), WA_SCRM_SITE_ID (the sub-site an agent is created for and whose
// data is exported or imported; default "default"). A temporary password is printed once and stored nowhere
// else; its owner has to change it at the first sign-in. Needs Node 22.13 or newer.
const fs = require('node:fs');
const path = require('node:path');

async function main([area, action, ...rest]) {
  const dir = process.env.WA_SCRM_DATA_DIR;
  const siteId = process.env.WA_SCRM_SITE_ID || 'default';
  if (!dir) throw new Error('WA_SCRM_DATA_DIR is not set');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (area === 'user') {
    const auth = require('./site-auth.cjs').openAuth(path.join(dir, 'auth.db'));
    try {
      if (action === 'add') {
        const [username, role, ...name] = rest;
        const { user, password } = await auth.createUser({ username, role, name: name.join(' '), site: role === 'agent' ? siteId : null });
        return console.log(`created ${user.username} (${user.role}${user.site ? ', sub-site ' + user.site : ''})\ntemporary password: ${password}`);
      }
      if (action === 'reset') {
        const { user, password } = await auth.resetPassword(rest[0]);
        return console.log(`password of ${user.username} was reset\ntemporary password: ${password}`);
      }
      if (action === 'disable' || action === 'enable') {
        const user = auth.setDisabled(rest[0], action === 'disable');
        return console.log(`${user.username} is ${user.disabled ? 'disabled' : 'enabled'}`);
      }
      if (action === 'list') {
        for (const user of auth.listUsers()) console.log([user.username, user.role, user.site || '-', user.disabled ? 'disabled' : 'active', user.mustChangePassword ? 'temporary password' : 'own password', user.name].join('\t'));
        return;
      }
    } finally {
      auth.close();
    }
  }
  if (area === 'data' && rest[0]) {
    const data = require('./site-data.cjs').openData(path.join(dir, `site-${siteId}.db`));
    try {
      if (action === 'export') {
        const saved = data.read();
        fs.writeFileSync(rest[0], JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });
        return console.log(`exported version ${saved.version} of sub-site ${siteId} to ${rest[0]}`);
      }
      if (action === 'import') {
        const loaded = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
        const { version } = data.replace(loaded.data || loaded, 'site-admin');
        return console.log(`imported ${rest[0]} into sub-site ${siteId} as version ${version}`);
      }
    } finally {
      data.close();
    }
  }
  throw new Error('usage: site-admin.cjs user add|reset|disable|enable|list … | data export|import <file>');
}

main(process.argv.slice(2)).catch(error => {
  console.error('site-admin: ' + (error.code || error.message));
  process.exitCode = 1;
});
