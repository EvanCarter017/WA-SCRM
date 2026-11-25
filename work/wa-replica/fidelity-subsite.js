  // Signing in happens before the app starts (fidelity-boot.js). The app shows itself and offers signing out,
  // which saves what is pending, ends the session on the server and returns to the sign-in screen.
  // The earlier layers ask this before they follow the address bar; the app only runs while someone is signed in.
  const subsiteSignedOut = false;
  function renderSignInState() {
    // A stopped page (the data changed elsewhere, the session ended, another page took over) keeps its notice:
    // drawing the app again would hide it, and nothing done there could be saved (plan 072).
    if (window.WA_SITE.halted()) return false;
    $('#app-shell').hidden = false;
    $('#subsite-login').hidden = true;
    $('.skip-link').hidden = false;
    return true;
  }

  Object.assign(fidActions, {
    subsiteLogout:()=>window.WA_SITE.signOut(),
  });
