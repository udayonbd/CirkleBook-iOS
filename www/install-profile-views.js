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
    'CIRKLEBOOK PROFILE VIEW TRACKING';


if (source.includes(marker)) {

    console.log(
        'Profile view tracking already installed.'
    );

    process.exit(0);
}


/* =========================================================
   ADD data-author-id TO POST ARTICLE
========================================================= */

const articleRegex =
    /(<article\b[\s\S]*?class=["'][^"']*\bpost\b[^"']*["'][\s\S]*?data-post=["'][^"']+["'])([\s\S]*?>)/;


const articleMatch =
    source.match(articleRegex);


if (!articleMatch) {

    console.error(
        'ERROR: Post article tag still not found.'
    );

    process.exit(1);
}


const replacement =
    articleMatch[1] +
    `
            data-author-id="\${escapeHtml(
                post?.author_user_id ||
                post?.user_id ||
                post?.author?.id ||
                ''
            )}"` +
    articleMatch[2];


source =
    source.replace(
        articleRegex,
        replacement
    );


/* =========================================================
   INSERT PROFILE VIEW TRACKING
========================================================= */

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


const tracking =
`

    /* =====================================================
       CIRKLEBOOK PROFILE VIEW TRACKING
    ===================================================== */

    function setupProfileViewTracking() {

        document.addEventListener(
            'click',
            async event => {

                const clicked =
                    event.target.closest(
                        '.card.post .avatar, .card.post strong'
                    );


                if (!clicked) {
                    return;
                }


                const postElement =
                    clicked.closest(
                        '.card.post[data-author-id]'
                    );


                if (!postElement) {
                    return;
                }


                const userId =
                    postElement.dataset.authorId;


                if (!userId) {
                    return;
                }


                const currentUserId =
                    state.currentUser?.id ||
                    state.currentUser?.user_id ||
                    null;


                if (
                    currentUserId &&
                    String(currentUserId) ===
                    String(userId)
                ) {
                    return;
                }


                try {

                    await apiRequest(
                        '/analytics/events',
                        {
                            method: 'POST',

                            body:
                                JSON.stringify({
                                    eventType:
                                        'profile.view',

                                    targetId:
                                        userId
                                })
                        }
                    );

                } catch (error) {

                    console.debug(
                        'Profile view analytics skipped:',
                        error?.message ||
                        error
                    );
                }
            }
        );


        console.log(
            'CIRKLEBOOK PROFILE VIEW TRACKING READY'
        );
    }


    setupProfileViewTracking();


`;


source =
    source.slice(
        0,
        closing
    ) +
    tracking +
    source.slice(
        closing
    );


/* =========================================================
   BACKUP + SAVE
========================================================= */

fs.copyFileSync(
    file,
    file + '.before_profile_views'
);


fs.writeFileSync(
    file,
    source,
    'utf8'
);


console.log(
    'SUCCESS: Profile view tracking installed.'
);