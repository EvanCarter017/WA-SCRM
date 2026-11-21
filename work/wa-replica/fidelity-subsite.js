  // Signing in happens before the app starts (fidelity-boot.js). The app shows itself and offers signing out,
  // which saves what is pending, ends the session on the server and returns to the sign-in screen.
  // The earlier layers ask this before they follow the address bar; the app only runs while someone is signed in.
  const subsiteSignedOut = false;
  function renderSignInState() {
    $('#app-shell').hidden = false;
    $('#subsite-login').hidden = true;
    $('.skip-link').hidden = false;
    return true;
  }

  Object.assign(fidActions, {
    subsiteLogout:()=>window.WA_SITE.signOut(),
  });
