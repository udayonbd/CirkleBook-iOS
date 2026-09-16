'use strict';

const fs = require('fs');

const file =
    'C:\\CirkleBook\\frontend\\app.js';

let source =
    fs.readFileSync(
        file,
        'utf8'
    );

const marker =
    'CIRKLEBOOK ACTIVE DEVICES UI';


if (source.includes(marker)) {

    console.log(
        'Active Devices UI already installed.'
    );

    process.exit(0);
}


const closing =
    source.lastIndexOf(
        '})();'
    );


if (closing === -1) {

    console.error(
        'ERROR: Final })(); not found.'
    );

    process.exit(1);
}


const code = `

    /* =====================================================
       CIRKLEBOOK ACTIVE DEVICES UI
    ===================================================== */

    function cbEscapeDeviceText(value) {

        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function cbDeviceName(userAgent) {

        const ua =
            String(userAgent || '');

        let browser =
            'Unknown browser';

        let os =
            'Unknown device';


        if (/Edg\\//i.test(ua)) {
            browser = 'Microsoft Edge';
        } else if (/Chrome\\//i.test(ua)) {
            browser = 'Google Chrome';
        } else if (/Firefox\\//i.test(ua)) {
            browser = 'Mozilla Firefox';
        } else if (/Safari\\//i.test(ua)) {
            browser = 'Safari';
        }


        if (/Windows/i.test(ua)) {
            os = 'Windows';
        } else if (/Android/i.test(ua)) {
            os = 'Android';
        } else if (/iPhone|iPad|iOS/i.test(ua)) {
            os = 'iPhone / iPad';
        } else if (/Mac OS|Macintosh/i.test(ua)) {
            os = 'Mac';
        } else if (/Linux/i.test(ua)) {
            os = 'Linux';
        }


        return browser + ' on ' + os;
    }


    function cbFormatSessionDate(value) {

        if (!value) {
            return 'Unknown';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return 'Unknown';
        }


        return date.toLocaleString();
    }


    async function cbLoadSessions() {

        try {

            const response =
                await apiRequest(
                    '/auth/sessions'
                );


            return (
                response?.data?.sessions ||
                response?.sessions ||
                []
            );

        } catch (error) {

            console.error(
                'ACTIVE DEVICES LOAD ERROR:',
                error
            );

            return [];
        }
    }


    async function cbRevokeSession(
        sessionId
    ) {

        await apiRequest(
            '/auth/sessions/' +
            encodeURIComponent(sessionId),
            {
                method: 'DELETE'
            }
        );
    }


    async function cbRevokeOtherSessions() {

        return apiRequest(
            '/auth/sessions/revoke-others',
            {
                method: 'POST'
            }
        );
    }


    function cbSessionCard(session) {

        const current =
            Boolean(
                session.current
            );


        const device =
            cbEscapeDeviceText(
                cbDeviceName(
                    session.userAgent
                )
            );


        const ip =
            cbEscapeDeviceText(
                session.ipAddress ||
                'Unknown'
            );


        const lastUsed =
            cbEscapeDeviceText(
                cbFormatSessionDate(
                    session.lastUsedAt
                )
            );


        let action = '';


        if (current) {

            action =
                '<span style="' +
                'display:inline-block;' +
                'padding:7px 11px;' +
                'border-radius:8px;' +
                'background:#e7f3ff;' +
                'color:#1877f2;' +
                'font-weight:700;' +
                'font-size:13px;' +
                '">' +
                'This device' +
                '</span>';

        } else {

            action =
                '<button ' +
                'type="button" ' +
                'data-cb-revoke-session="' +
                cbEscapeDeviceText(
                    session.id
                ) +
                '" ' +
                'style="' +
                'border:0;' +
                'border-radius:8px;' +
                'padding:8px 13px;' +
                'background:#fee2e2;' +
                'color:#b91c1c;' +
                'font-weight:700;' +
                'cursor:pointer;' +
                '">' +
                'Log out' +
                '</button>';
        }


        return (
            '<div style="' +
            'border:1px solid #dfe3e8;' +
            'border-radius:12px;' +
            'padding:15px;' +
            'margin-bottom:10px;' +
            'background:#fff;' +
            '">' +

                '<div style="' +
                'display:flex;' +
                'justify-content:space-between;' +
                'gap:16px;' +
                'align-items:flex-start;' +
                '">' +

                    '<div style="min-width:0;">' +

                        '<div style="' +
                        'font-weight:700;' +
                        'font-size:16px;' +
                        'margin-bottom:6px;' +
                        '">' +
                        device +
                        '</div>' +

                        '<div style="' +
                        'font-size:13px;' +
                        'color:#65676b;' +
                        'line-height:1.6;' +
                        '">' +
                        'IP: ' + ip +
                        '<br>' +
                        'Last active: ' +
                        lastUsed +
                        '</div>' +

                    '</div>' +

                    '<div>' +
                    action +
                    '</div>' +

                '</div>' +

            '</div>'
        );
    }


    async function cbRenderActiveDevices() {

        const content =
            panelContent();


        if (!content) {
            return;
        }


        const old =
            content.querySelector(
                '#cbActiveDevicesSection'
            );


        if (old) {
            old.remove();
        }


        const section =
            document.createElement(
                'div'
            );


        section.id =
            'cbActiveDevicesSection';


        section.style.marginTop =
            '22px';


        section.innerHTML =
            '<div style="' +
            'font-size:20px;' +
            'font-weight:700;' +
            'margin-bottom:5px;' +
            '">' +
            'Security and Login' +
            '</div>' +

            '<div style="' +
            'color:#65676b;' +
            'margin-bottom:16px;' +
            '">' +
            'Where you are logged in' +
            '</div>' +

            '<div id="cbActiveDevicesList">' +
            '<div style="' +
            'padding:20px;' +
            'color:#65676b;' +
            'text-align:center;' +
            '">' +
            'Loading active devices...' +
            '</div>' +
            '</div>';


        content.appendChild(
            section
        );


        const sessions =
            await cbLoadSessions();


        const list =
            section.querySelector(
                '#cbActiveDevicesList'
            );


        if (!list) {
            return;
        }


        if (
            !Array.isArray(sessions) ||
            sessions.length === 0
        ) {

            list.innerHTML =
                '<div style="' +
                'border:1px solid #dfe3e8;' +
                'border-radius:12px;' +
                'padding:18px;' +
                'color:#65676b;' +
                '">' +
                'No active session data available.' +
                '</div>';

            return;
        }


        list.innerHTML =
            sessions
                .map(cbSessionCard)
                .join('');


        const otherSessions =
            sessions.filter(
                session =>
                    !session.current
            );


        if (
            otherSessions.length > 0
        ) {

            const controls =
                document.createElement(
                    'div'
                );


            controls.style.marginTop =
                '14px';


            controls.innerHTML =
                '<button ' +
                'type="button" ' +
                'id="cbLogoutOtherDevices" ' +
                'style="' +
                'border:0;' +
                'border-radius:9px;' +
                'padding:11px 16px;' +
                'background:#dc2626;' +
                'color:white;' +
                'font-weight:700;' +
                'cursor:pointer;' +
                '">' +
                'Log out of all other devices' +
                '</button>';


            section.appendChild(
                controls
            );
        }
    }


    document.addEventListener(
        'click',
        async function(event) {

            const revokeButton =
                event.target.closest(
                    '[data-cb-revoke-session]'
                );


            if (revokeButton) {

                const sessionId =
                    revokeButton.getAttribute(
                        'data-cb-revoke-session'
                    );


                const confirmed =
                    window.confirm(
                        'Log out this device?'
                    );


                if (!confirmed) {
                    return;
                }


                revokeButton.disabled =
                    true;


                try {

                    await cbRevokeSession(
                        sessionId
                    );


                    showToast(
                        'Device logged out'
                    );


                    await cbRenderActiveDevices();

                } catch (error) {

                    console.error(
                        'SESSION REVOKE ERROR:',
                        error
                    );


                    showToast(
                        'Could not log out device'
                    );


                    revokeButton.disabled =
                        false;
                }


                return;
            }


            const logoutOthers =
                event.target.closest(
                    '#cbLogoutOtherDevices'
                );


            if (logoutOthers) {

                const confirmed =
                    window.confirm(
                        'Log out of all other devices?'
                    );


                if (!confirmed) {
                    return;
                }


                logoutOthers.disabled =
                    true;


                try {

                    const response =
                        await cbRevokeOtherSessions();


                    const count =
                        Number(
                            response?.data?.revoked ||
                            0
                        );


                    showToast(
                        count +
                        ' other session(s) logged out'
                    );


                    await cbRenderActiveDevices();

                } catch (error) {

                    console.error(
                        'REVOKE OTHER SESSIONS ERROR:',
                        error
                    );


                    showToast(
                        'Could not log out other devices'
                    );


                    logoutOthers.disabled =
                        false;
                }
            }
        }
    );


    const cbOriginalOpenSettings =
        openSettings;


    openSettings =
        async function() {

            await cbOriginalOpenSettings();


            setTimeout(
                function() {

                    cbRenderActiveDevices();

                },
                250
            );
        };


    console.log(
        'CIRKLEBOOK ACTIVE DEVICES UI READY'
    );


`;


fs.copyFileSync(
    file,
    file +
    '.before_active_devices_ui'
);


source =
    source.slice(
        0,
        closing
    ) +
    code +
    source.slice(
        closing
    );


fs.writeFileSync(
    file,
    source,
    'utf8'
);


console.log(
    'SUCCESS: Active Devices UI installed.'
);