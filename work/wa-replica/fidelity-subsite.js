  const subsiteSignOutKey = KEY+'-subsite-signed-out';
  function subsiteExitWasSaved() {
    try { return localStorage.getItem(subsiteSignOutKey)==='1'; } catch { return false; }
  }
  let subsiteSignedOut = location.hash==='#login'||subsiteExitWasSaved();

  function renderSignInState() {
    const signedOut = subsiteSignedOut||location.hash==='#login';
    const shell = $('#app-shell');
    const login = $('#subsite-login');
    const enteringLogin = signedOut&&login.hidden;
    shell.hidden = signedOut;
    login.hidden = !signedOut;
    $('.skip-link').hidden = signedOut;
    $('.fid-float-review').hidden = signedOut;
    if (!signedOut) return true;

    if (location.hash!=='#login') history.replaceState(null,'','#login');
    if (enteringLogin) {
      if ($('#dialog').open) close();
      if ($('#element-review-dialog').open) $('#element-review-dialog').close();
      $('#view').replaceChildren();
      $('#toast').classList.remove('show');
      paintIcons(login);
      $('#subsite-login-title').focus();
    }
    return false;
  }

  Object.assign(fidActions, {
    subsiteLogout:()=>{
      subsiteSignedOut = true;
      try { localStorage.setItem(subsiteSignOutKey,'1'); } catch {}
      render();
    },
    subsiteEnterDemo:()=>{
      subsiteSignedOut = false;
      try { localStorage.removeItem(subsiteSignOutKey); } catch {}
      navigate('dashboard','replace');
      $('#view').focus({preventScroll:true});
    },
  });

  window.addEventListener('storage',event=>{
    if (event.key!==subsiteSignOutKey||event.newValue!=='1') return;
    subsiteSignedOut = true;
    render();
  });
  window.addEventListener('pageshow',event=>{
    if (!event.persisted||subsiteSignedOut||!subsiteExitWasSaved()) return;
    subsiteSignedOut = true;
    render();
  });
