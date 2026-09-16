'use strict';

const fs = require('fs');

const file =
    'C:\\CirkleBook\\frontend\\app.js';

let source =
    fs.readFileSync(file, 'utf8');

const marker =
    'CIRKLEBOOK FRIEND FOLLOW BUTTONS';


if (source.includes(marker)) {

    console.log(
        'Follow buttons already installed.'
    );

    process.exit(0);
}


const closing =
    source.lastIndexOf('})();');


if (closing === -1) {

    console.error(
        'ERROR: Final })(); not found.'
    );

    process.exit(1);
}


const code =
`

    /* =====================================================
       CIRKLEBOOK FRIEND FOLLOW BUTTONS
    ===================================================== */

    function setupFriendFollowButtons() {

        function getUserIdFromButton(button) {

            if (!button) {
                return null;
            }


            const direct =
                button.dataset?.userId ||
                button.dataset?.userid ||
                button.dataset?.id;


            if (direct) {
                return direct;
            }


            const row =
                button.closest(
                    '[data-user-id], [data-userid], [data-id]'
                );


            if (!row) {
                return null;
            }


            return (
                row.dataset?.userId ||
                row.dataset?.userid ||
                row.dataset?.id ||
                null
            );
        }


        async function refreshFollowButton(
            button,
            userId
        ) {

            try {

                const response =
                    await apiRequest(
                        \`/follows/\${userId}/status\`
                    );


                const data =
                    response?.data ||
                    response ||
                    {};


                const isFollowing =
                    Boolean(
                        data.isFollowing ||
                        data.following ||
                        data.is_following ||
                        data.status === 'accepted' ||
                        data.status === 'active' ||
                        data.status === 'following'
                    );


                button.dataset.following =
                    isFollowing
                        ? '1'
                        : '0';


                button.textContent =
                    isFollowing
                        ? 'Unfollow'
                        : 'Follow';


                button.style.background =
                    isFollowing
                        ? '#e4e6eb'
                        : '#1877f2';


                button.style.color =
                    isFollowing
                        ? '#050505'
                        : '#ffffff';

            } catch (error) {

                button.dataset.following =
                    '0';

                button.textContent =
                    'Follow';

                button.style.background =
                    '#1877f2';

                button.style.color =
                    '#ffffff';
            }
        }


        async function toggleFollow(
            button,
            userId
        ) {

            if (
                button.dataset.loading ===
                '1'
            ) {
                return;
            }


            button.dataset.loading =
                '1';

            button.disabled =
                true;


            try {

                const following =
                    button.dataset.following ===
                    '1';


                await apiRequest(
                    \`/follows/\${userId}\`,
                    {
                        method:
                            following
                                ? 'DELETE'
                                : 'POST'
                    }
                );


                button.dataset.following =
                    following
                        ? '0'
                        : '1';


                button.textContent =
                    following
                        ? 'Follow'
                        : 'Unfollow';


                button.style.background =
                    following
                        ? '#1877f2'
                        : '#e4e6eb';


                button.style.color =
                    following
                        ? '#ffffff'
                        : '#050505';


                showToast(
                    following
                        ? 'User unfollowed'
                        : 'User followed'
                );

            } catch (error) {

                console.error(
                    'FOLLOW ACTION ERROR:',
                    error
                );


                showToast(
                    error?.message ||
                    'Follow action failed'
                );

            } finally {

                button.disabled =
                    false;

                button.dataset.loading =
                    '0';
            }
        }


        function installButtons() {

            const allButtons =
                Array.from(
                    document.querySelectorAll(
                        'button'
                    )
                );


            const unfriendButtons =
                allButtons.filter(
                    button =>
                        button.textContent
                            ?.trim()
                            ?.toLowerCase() ===
                        'unfriend'
                );


            for (
                const unfriendButton
                of unfriendButtons
            ) {

                if (
                    unfriendButton.parentElement
                        ?.querySelector(
                            '.cb-follow-button'
                        )
                ) {
                    continue;
                }


                const userId =
                    getUserIdFromButton(
                        unfriendButton
                    );


                if (!userId) {

                    console.debug(
                        'Follow button skipped: user id not found'
                    );

                    continue;
                }


                const followButton =
                    document.createElement(
                        'button'
                    );


                followButton.type =
                    'button';


                followButton.className =
                    'cb-follow-button';


                followButton.textContent =
                    'Follow';


                followButton.style.marginRight =
                    '8px';


                followButton.style.padding =
                    '9px 14px';


                followButton.style.border =
                    '0';


                followButton.style.borderRadius =
                    '8px';


                followButton.style.fontWeight =
                    '700';


                followButton.style.cursor =
                    'pointer';


                followButton.style.background =
                    '#1877f2';


                followButton.style.color =
                    '#ffffff';


                followButton.addEventListener(
                    'click',
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        toggleFollow(
                            followButton,
                            userId
                        );
                    }
                );


                unfriendButton.parentElement
                    .insertBefore(
                        followButton,
                        unfriendButton
                    );


                refreshFollowButton(
                    followButton,
                    userId
                );
            }
        }


        const observer =
            new MutationObserver(
                installButtons
            );


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );


        installButtons();


        console.log(
            'CIRKLEBOOK FRIEND FOLLOW BUTTONS READY'
        );
    }


    setupFriendFollowButtons();


`;


fs.copyFileSync(
    file,
    file + '.before_follow_buttons'
);


source =
    source.slice(0, closing) +
    code +
    source.slice(closing);


fs.writeFileSync(
    file,
    source,
    'utf8'
);


console.log(
    'SUCCESS: Follow / Unfollow buttons installed.'
);