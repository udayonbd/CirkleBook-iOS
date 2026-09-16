'use strict';

const fs = require('fs');

const file =
    'C:\\CirkleBook\\frontend\\app.js';

let source =
    fs.readFileSync(
        file,
        'utf8'
    );

const startMarker =
    '    async function openDashboard()';

const endMarker =
    '    /* =====================================================\r\n       SETTINGS & PRIVACY';

let start =
    source.indexOf(
        startMarker
    );

let end =
    source.indexOf(
        endMarker,
        start
    );

if (start === -1) {
    console.error(
        'ERROR: openDashboard start not found'
    );
    process.exit(1);
}

if (end === -1) {

    const altEndMarker =
        '    /* =====================================================\n       SETTINGS & PRIVACY';

    end =
        source.indexOf(
            altEndMarker,
            start
        );
}

if (end === -1) {
    console.error(
        'ERROR: SETTINGS marker not found'
    );
    process.exit(1);
}


const newDashboard =
`    async function openDashboard(days = 28) {

        openSimpleModal(
            'Professional Dashboard',
            \`
            <div class="cb-empty">
                Loading Professional Dashboard...
            </div>
            \`
        );

        try {

            const response =
                await apiRequest(
                    \`/professional-dashboard/overview?days=\${days}\`
                );

            if (
                !response ||
                response.success !== true
            ) {
                throw new Error(
                    response?.error?.message ||
                    response?.message ||
                    'Unable to load dashboard.'
                );
            }

            const data =
                response.data || {};

            const overview =
                data.overview || {};

            const insights =
                data.creatorInsights || {};

            const username =
                state.currentUser?.username ||
                'user';

            let displayName =
                username;

            if (
                typeof getDisplayName ===
                'function'
            ) {
                displayName =
                    getDisplayName(
                        state.currentUser
                    ) ||
                    username;
            }

            const engagementRate =
                insights.engagementRate === null ||
                insights.engagementRate === undefined
                    ? '—'
                    : \`\${insights.engagementRate}%\`;

            openSimpleModal(
                'Professional Dashboard',
                \`

                <div style="margin-bottom:18px;">

                    <div
                        style="
                            font-size:20px;
                            font-weight:700;
                        "
                    >
                        \${escapeHtml(displayName)}
                    </div>

                    <div
                        style="
                            color:#65676b;
                            margin-top:4px;
                        "
                    >
                        @\${escapeHtml(username)}
                    </div>

                </div>


                <div class="cb-tabs">

                    <button
                        type="button"
                        class="cb-tab \${days === 7 ? 'active' : ''}"
                        data-dashboard-days="7"
                    >
                        7 Days
                    </button>

                    <button
                        type="button"
                        class="cb-tab \${days === 28 ? 'active' : ''}"
                        data-dashboard-days="28"
                    >
                        28 Days
                    </button>

                    <button
                        type="button"
                        class="cb-tab \${days === 90 ? 'active' : ''}"
                        data-dashboard-days="90"
                    >
                        90 Days
                    </button>

                </div>


                <h3>Account Overview</h3>

                <div class="dashboard-grid">

                    \${dashboardCard(
                        'Posts',
                        overview.posts
                    )}

                    \${dashboardCard(
                        'Friends',
                        overview.friends
                    )}

                    \${dashboardCard(
                        'Followers',
                        overview.followers
                    )}

                    \${dashboardCard(
                        'Following',
                        overview.following
                    )}

                    \${dashboardCard(
                        'Groups',
                        overview.groups
                    )}

                    \${dashboardCard(
                        'Pages',
                        overview.pages
                    )}

                </div>


                <h3 style="margin-top:25px;">
                    Creator Insights
                </h3>

                <div class="dashboard-grid">

                    \${dashboardCard(
                        'Reach',
                        insights.reach
                    )}

                    \${dashboardCard(
                        'Impressions',
                        insights.impressions
                    )}

                    \${dashboardCard(
                        'Profile Views',
                        insights.profileViews
                    )}

                    \${dashboardCard(
                        'Engagements',
                        insights.totalEngagement
                    )}

                    \${dashboardCard(
                        'Engagement Rate',
                        engagementRate,
                        false
                    )}

                </div>


                <h3 style="margin-top:25px;">
                    Engagement
                </h3>

                <div class="dashboard-grid">

                    \${dashboardCard(
                        'Reactions',
                        insights.reactions
                    )}

                    \${dashboardCard(
                        'Comments',
                        insights.comments
                    )}

                    \${dashboardCard(
                        'Shares',
                        insights.shares
                    )}

                    \${dashboardCard(
                        'Saves',
                        insights.saves
                    )}

                </div>


                <h3 style="margin-top:25px;">
                    Follower Growth
                </h3>

                <div class="dashboard-grid">

                    \${dashboardCard(
                        'Gained',
                        insights.followersGained
                    )}

                    \${dashboardCard(
                        'Lost',
                        insights.followersLost
                    )}

                    \${dashboardCard(
                        'Net Growth',
                        insights.netFollowerGrowth
                    )}

                </div>


                <div
                    class="cb-card"
                    style="
                        margin-top:22px;
                        color:#65676b;
                    "
                >
                    Reach and Impressions show actual
                    analytics data. If no tracking data
                    has been collected yet, they will
                    show 0.
                </div>

                \`
            );


            const content =
                panelContent();

            content
                ?.querySelectorAll(
                    '[data-dashboard-days]'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            () => {

                                const nextDays =
                                    Number(
                                        button.dataset
                                            .dashboardDays
                                    );

                                openDashboard(
                                    nextDays
                                );
                            }
                        );
                    }
                );


        } catch (error) {

            console.error(
                'Professional Dashboard error:',
                error
            );

            openSimpleModal(
                'Professional Dashboard',
                \`
                <div class="cb-empty">
                    \${escapeHtml(
                        error.message ||
                        'Unable to load dashboard.'
                    )}
                </div>
                \`
            );
        }
    }


    function dashboardCard(
        label,
        value,
        numeric = true
    ) {

        const safeValue =
            numeric
                ? Number(value || 0)
                : (
                    value === undefined ||
                    value === null
                        ? '—'
                        : value
                );

        return \`
            <div class="dashboard-stat">

                <div>
                    \${escapeHtml(label)}
                </div>

                <div class="dashboard-number">
                    \${escapeHtml(
                        String(safeValue)
                    )}
                </div>

            </div>
        \`;
    }


`;


source =
    source.slice(
        0,
        start
    ) +
    newDashboard +
    source.slice(
        end
    );


fs.copyFileSync(
    file,
    file + '.before_creator_insights'
);

fs.writeFileSync(
    file,
    source,
    'utf8'
);

console.log(
    'SUCCESS: Professional Dashboard updated.'
);