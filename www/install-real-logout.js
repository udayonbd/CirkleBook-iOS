'use strict';

const fs = require('fs');

const APP_FILE =
  'C:\\CirkleBook\\frontend\\app.js';

if (!fs.existsSync(APP_FILE)) {
  throw new Error('frontend app.js not found');
}

const MARKER =
  'CIRKLEBOOK REAL BACKEND LOGOUT V1';

let source =
  fs.readFileSync(APP_FILE, 'utf8');

if (source.includes(MARKER)) {
  console.log('Real logout handler already installed.');
  process.exit(0);
}

const backup =
  APP_FILE + '.before_real_backend_logout';

if (!fs.existsSync(backup)) {
  fs.copyFileSync(APP_FILE, backup);
  console.log('Backup:', backup);
}

const code = `


/* =========================================================
   ${MARKER}
   Real Logout -> Backend Session Revocation
========================================================= */

(function () {

  let logoutRunning = false;


  function isExactLogoutElement(element) {

    if (!element) {
      return false;
    }

    const clickable =
      element.closest(
        'button, a, [role="button"], [data-action]'
      );

    if (!clickable) {
      return false;
    }

    const action =
      String(
        clickable.dataset?.action || ''
      )
        .trim()
        .toLowerCase();


    if (
      action === 'logout' ||
      action === 'log-out'
    ) {
      return clickable;
    }


    const text =
      String(
        clickable.textContent || ''
      )
        .replace(/\\s+/g, ' ')
        .trim()
        .toLowerCase();


    /*
     * Exact logout only.
     *
     * This deliberately DOES NOT match:
     * "Log out this device"
     * "Log out all other devices"
     */
    if (
      text === 'logout' ||
      text === 'log out'
    ) {
      return clickable;
    }


    return false;
  }


  async function performRealLogout() {

    if (logoutRunning) {
      return;
    }

    logoutRunning = true;


    try {

      const response =
        await fetch(
          'http://localhost:5000/api/v1/auth/logout',
          {
            method: 'POST',

            credentials: 'include',

            headers: {
              'Accept': 'application/json'
            }
          }
        );


      /*
       * Logout should still finish locally if the
       * session was already expired/revoked.
       */
      if (
        !response.ok &&
        response.status !== 401
      ) {

        let message =
          'Logout request failed';


        try {

          const body =
            await response.json();

          message =
            body?.error?.message ||
            body?.message ||
            message;

        } catch {
          // Ignore invalid JSON.
        }


        console.error(
          'CIRKLEBOOK LOGOUT ERROR:',
          response.status,
          message
        );
      }

    } catch (error) {

      /*
       * Do not trap the user inside the application
       * just because the network is unavailable.
       */
      console.error(
        'CIRKLEBOOK LOGOUT NETWORK ERROR:',
        error
      );

    } finally {

      /*
       * Clear only client-side auth/session state.
       * HttpOnly refresh cookie is cleared by backend.
       */

      try {

        sessionStorage.removeItem(
          'cirklebook_access_token'
        );

        sessionStorage.removeItem(
          'accessToken'
        );

        sessionStorage.removeItem(
          'access_token'
        );

        localStorage.removeItem(
          'cirklebook_access_token'
        );

        localStorage.removeItem(
          'accessToken'
        );

        localStorage.removeItem(
          'access_token'
        );

      } catch (error) {

        console.error(
          'Logout local cleanup warning:',
          error
        );
      }


      window.location.href = '/';
    }
  }


  /*
   * Capture phase is intentional.
   *
   * It runs before an older logout handler that may
   * immediately redirect without calling backend.
   */
  document.addEventListener(
    'click',
    function (event) {

      const logoutElement =
        isExactLogoutElement(
          event.target
        );


      if (!logoutElement) {
        return;
      }


      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      performRealLogout();

    },
    true
  );


  /*
   * Also expose it for future UI code.
   */
  window.cbLogout =
    performRealLogout;

})();
`;

source += code;

fs.writeFileSync(
  APP_FILE,
  source,
  'utf8'
);

console.log(
  'SUCCESS: Real backend Logout installed.'
);

console.log(
  'Frontend now calls POST /api/v1/auth/logout.'
);

console.log(
  'credentials: include enabled.'
);