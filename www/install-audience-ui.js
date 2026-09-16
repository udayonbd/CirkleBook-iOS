'use strict';

const fs = require('fs');

const file =
    'C:\\CirkleBook\\frontend\\app.js';

let source =
    fs.readFileSync(file, 'utf8');

const marker =
    'CIRKLEBOOK AUDIENCE INSIGHTS UI';


if (source.includes(marker)) {

    console.log(
        'Audience Insights UI already installed.'
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
       CIRKLEBOOK AUDIENCE INSIGHTS UI
    ===================================================== */

    async function loadAudienceInsights(
        days = 28
    ) {

        try {

            const response =
                await apiRequest(
                    \`/professional-dashboard/audience?days=\${days}\`
                );


            return (
                response?.data ||
                response ||
                {}
            );

        } catch (error) {

            console.error(
                'AUDIENCE INSIGHTS LOAD ERROR:',
                error
            );

            return {
                totalAudience: 0,
                countries: [],
                languages: [],
                devices: []
            };
        }
    }


    function renderAudienceList(
        title,
        items
    ) {

        const safeItems =
            Array.isArray(items)
                ? items
                : [];


        let rows = '';


        if (safeItems.length === 0) {

            rows =
                '<div style="color:#65676b;padding:8px 0;">No data yet.</div>';

        } else {

            rows =
                safeItems
                    .map(
                        item => {

                            const value =
                                escapeHtml(
                                    item.value ||
                                    'Unknown'
                                );


                            const count =
                                Number(
                                    item.count ||
                                    0
                                );


                            return (
                                '<div style="' +
                                    'display:flex;' +
                                    'justify-content:space-between;' +
                                    'align-items:center;' +
                                    'padding:9px 0;' +
                                    'border-bottom:1px solid #f0f2f5;' +
                                '">' +

                                    '<span>' +
                                        value +
                                    '</span>' +

                                    '<strong>' +
                                        count +
                                    '</strong>' +

                                '</div>'
                            );
                        }
                    )
                    .join('');
        }


        return (
            '<div style="' +
                'border:1px solid #dfe3e8;' +
                'border-radius:12px;' +
                'padding:16px;' +
                'background:#fff;' +
            '">' +

                '<div style="' +
                    'font-size:17px;' +
                    'font-weight:700;' +
                    'margin-bottom:8px;' +
                '">' +
                    escapeHtml(title) +
                '</div>' +

                rows +

            '</div>'
        );
    }


    async function attachAudienceInsightsToDashboard(
        days = 28
    ) {

        const content =
            panelContent();


        if (!content) {
            return;
        }


        const oldSection =
            content.querySelector(
                '#cbAudienceInsightsSection'
            );


        if (oldSection) {
            oldSection.remove();
        }


        const data =
            await loadAudienceInsights(
                days
            );


        const section =
            document.createElement(
                'div'
            );


        section.id =
            'cbAudienceInsightsSection';


        section.style.marginTop =
            '22px';


        section.innerHTML =
            '<div style="' +
                'font-size:20px;' +
                'font-weight:700;' +
                'margin-bottom:12px;' +
            '">' +
                'Audience Insights' +
            '</div>' +

            '<div style="' +
                'border:1px solid #dfe3e8;' +
                'border-radius:12px;' +
                'padding:16px;' +
                'margin-bottom:12px;' +
                'background:#fff;' +
            '">' +

                '<div style="color:#65676b;">Unique Audience</div>' +

                '<div style="' +
                    'font-size:28px;' +
                    'font-weight:700;' +
                    'margin-top:4px;' +
                '">' +
                    Number(
                        data.totalAudience ||
                        0
                    ) +
                '</div>' +

            '</div>' +

            '<div style="' +
                'display:grid;' +
                'grid-template-columns:' +
                    'repeat(auto-fit,minmax(220px,1fr));' +
                'gap:12px;' +
            '">' +

                renderAudienceList(
                    'Countries',
                    data.countries
                ) +

                renderAudienceList(
                    'Languages',
                    data.languages
                ) +

                renderAudienceList(
                    'Devices',
                    data.devices
                ) +

            '</div>' +

            '<div style="' +
                'margin-top:12px;' +
                'color:#65676b;' +
                'font-size:13px;' +
            '">' +
                'Audience counts are privacy-safe analytics estimates based on valid post impressions.' +
            '</div>';


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
                    button.dataset.dashboardDays ||
                    28
                );


            setTimeout(
                () => {

                    attachAudienceInsightsToDashboard(
                        days
                    );

                },
                350
            );
        }
    );


    const originalOpenDashboardForAudience =
        openDashboard;


    openDashboard =
        async function (
            days = 28
        ) {

            await originalOpenDashboardForAudience(
                days
            );


            await attachAudienceInsightsToDashboard(
                days
            );
        };


    console.log(
        'CIRKLEBOOK AUDIENCE INSIGHTS UI READY'
    );


`;


fs.copyFileSync(
    file,
    file + '.before_audience_ui'
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
    'SUCCESS: Audience Insights UI installed.'
);