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
    'CIRKLEBOOK POST IMPRESSION TRACKING';


if (source.includes(marker)) {

    console.log(
        'Post analytics tracking already installed.'
    );

    process.exit(0);
}


/* =========================================================
   FIND FINAL IIFE CLOSING
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


/* =========================================================
   TRACKING CODE
========================================================= */

const trackingCode =
`

    /* =====================================================
       CIRKLEBOOK POST IMPRESSION TRACKING
    ===================================================== */

    function setupPostImpressionTracking() {

        if (
            !('IntersectionObserver' in window)
        ) {
            console.warn(
                'IntersectionObserver not supported.'
            );

            return;
        }


        const observedElements =
            new WeakSet();

        const sentPostIds =
            new Set();

        const visibilityTimers =
            new WeakMap();


        async function recordPostImpression(
            element
        ) {

            const postId =
                element?.dataset?.post;


            if (
                !postId ||
                sentPostIds.has(postId)
            ) {
                return;
            }


            sentPostIds.add(
                postId
            );


            try {

                await apiRequest(
                    '/analytics/events',
                    {
                        method: 'POST',

                        body:
                            JSON.stringify({
                                eventType:
                                    'post.impression',

                                targetId:
                                    postId
                            })
                    }
                );

            } catch (error) {

                /*
                 * Analytics must never break
                 * normal feed usage.
                 */

                console.debug(
                    'Post analytics skipped:',
                    error?.message ||
                    error
                );
            }
        }


        const observer =
            new IntersectionObserver(

                entries => {

                    for (
                        const entry
                        of entries
                    ) {

                        const element =
                            entry.target;


                        if (
                            entry.isIntersecting &&
                            entry.intersectionRatio >= 0.5
                        ) {

                            if (
                                visibilityTimers.has(
                                    element
                                )
                            ) {
                                continue;
                            }


                            const timer =
                                setTimeout(
                                    () => {

                                        visibilityTimers.delete(
                                            element
                                        );


                                        if (
                                            entry.isIntersecting
                                        ) {

                                            recordPostImpression(
                                                element
                                            );
                                        }

                                    },
                                    1000
                                );


                            visibilityTimers.set(
                                element,
                                timer
                            );

                        } else {

                            const timer =
                                visibilityTimers.get(
                                    element
                                );


                            if (timer) {

                                clearTimeout(
                                    timer
                                );

                                visibilityTimers.delete(
                                    element
                                );
                            }
                        }
                    }
                },

                {
                    threshold: [0.5]
                }
            );


        function observePosts() {

            document
                .querySelectorAll(
                    '.card.post[data-post]'
                )
                .forEach(
                    element => {

                        if (
                            observedElements.has(
                                element
                            )
                        ) {
                            return;
                        }


                        observedElements.add(
                            element
                        );

                        observer.observe(
                            element
                        );
                    }
                );
        }


        const mutationObserver =
            new MutationObserver(
                observePosts
            );


        function startTracking() {

            observePosts();


            mutationObserver.observe(
                document.body,
                {
                    childList: true,
                    subtree: true
                }
            );


            console.log(
                'CIRKLEBOOK POST ANALYTICS READY'
            );
        }


        if (
            document.readyState ===
            'loading'
        ) {

            document.addEventListener(
                'DOMContentLoaded',
                startTracking,
                {
                    once: true
                }
            );

        } else {

            startTracking();
        }
    }


    setupPostImpressionTracking();


`;


/* =========================================================
   BACKUP + INSERT
========================================================= */

fs.copyFileSync(
    file,
    file + '.before_impression_tracking'
);


source =
    source.slice(
        0,
        closing
    ) +
    trackingCode +
    source.slice(
        closing
    );


fs.writeFileSync(
    file,
    source,
    'utf8'
);


console.log(
    'SUCCESS: Post impression tracking installed.'
);