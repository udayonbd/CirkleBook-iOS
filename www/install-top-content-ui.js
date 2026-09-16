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
    'CIRKLEBOOK TOP CONTENT UI';


if (source.includes(marker)) {

    console.log(
        'Top Content UI already installed.'
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


const code =
`

    /* =====================================================
       CIRKLEBOOK TOP CONTENT UI
    ===================================================== */

    async function loadTopContent(
        days = 28
    ) {

        try {

            const response =
                await apiRequest(
                    \`/professional-dashboard/top-content?days=\${days}\`
                );


            const data =
                response?.data ||
                response ||
                {};


            const posts =
                Array.isArray(
                    data.posts
                )
                    ? data.posts
                    : [];


            return posts;

        } catch (error) {

            console.error(
                'TOP CONTENT LOAD ERROR:',
                error
            );

            return [];
        }
    }


    function renderTopContent(
        posts
    ) {

        if (
            !Array.isArray(posts) ||
            posts.length === 0
        ) {

            return \`

                <div
                    style="
                        border:1px solid #dfe3e8;
                        border-radius:12px;
                        padding:22px;
                        color:#65676b;
                        text-align:center;
                    "
                >
                    No top content data yet.
                </div>

            \`;
        }


        return posts
            .map(
                (post, index) => {

                    const preview =
                        post.bodyPreview ||
                        '(No text content)';


                    return \`

                        <div
                            style="
                                border:1px solid #dfe3e8;
                                border-radius:12px;
                                padding:16px;
                                margin-bottom:12px;
                                background:#fff;
                            "
                        >

                            <div
                                style="
                                    font-weight:700;
                                    font-size:16px;
                                    margin-bottom:8px;
                                "
                            >
                                #\${index + 1}
                                Top Post
                            </div>


                            <div
                                style="
                                    color:#3a3b3c;
                                    margin-bottom:14px;
                                    line-height:1.5;
                                "
                            >
                                \${escapeHtml(
                                    preview
                                )}
                            </div>


                            <div
                                style="
                                    display:grid;
                                    grid-template-columns:
                                        repeat(
                                            auto-fit,
                                            minmax(
                                                110px,
                                                1fr
                                            )
                                        );
                                    gap:8px;
                                "
                            >

                                <div>
                                    <strong>
                                        \${post.reach || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Reach
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        \${post.impressions || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Impressions
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        \${post.reactions || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Reactions
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        \${post.comments || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Comments
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        \${post.shares || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Shares
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        \${post.saves || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Saves
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        \${post.engagements || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Engagements
                                    </div>
                                </div>

                            </div>

                        </div>

                                        \`;
                }
            )
            .join('');
    }


    async function attachTopContentToDashboard(
        days = 28
    ) {

        const content =
            panelContent();


        if (!content) {
            return;
        }


        const existing =
            content.querySelector(
                '#cbTopContentSection'
            );


        if (existing) {
            existing.remove();
        }


        const posts =
            await loadTopContent(
                days
            );


        const section =
            document.createElement(
                'div'
            );


        section.id =
            'cbTopContentSection';


        section.style.marginTop =
            '22px';


        section.innerHTML =
            \`

            <div
                style="
                    font-size:20px;
                    font-weight:700;
                    margin-bottom:12px;
                "
            >
                Top Content
            </div>

            \${renderTopContent(posts)}

            \`;


        content.appendChild(
            section
        );
    }


    document.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-dashboard-days]'
                );


            if (!button) {
                return;
            }


            const days =
                Number(
                    button.dataset
                        .dashboardDays ||
                    28
                );


            setTimeout(
                () => {

                    attachTopContentToDashboard(
                        days
                    );

                },
                300
            );
        }
    );


    const originalOpenDashboardForTopContent =
        openDashboard;


    openDashboard =
        async function (
            days = 28
        ) {

            await originalOpenDashboardForTopContent(
                days
            );


            await attachTopContentToDashboard(
                days
            );
        };


    console.log(
        'CIRKLEBOOK TOP CONTENT UI READY'
    );


`;


fs.copyFileSync(
    file,
    file + '.before_top_content_ui'
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
    'SUCCESS: Top Content UI installed.'
);