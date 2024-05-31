/*
 * Script Name: Backtimes Planner
 * Version: v1.2.1
 * Last Updated: 2024-01-19
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2023-12-12
 * Mod: MKich
 */

/*--------------------------------------------------------------------------------------
 * This script can NOT be cloned and modified without permission from the script author.
 --------------------------------------------------------------------------------------*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;
if (typeof MAX_INCS === 'undefined') MAX_INCS = 500;
if (typeof HIDE_GREENS === 'undefined') HIDE_GREENS = false;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'backtimesPlanner',
        name: 'Backtimes Planner',
        version: 'v1.2.1',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/backtimes-planner.291673/',
    },
    translations: {
        en_DK: {
            'Backtimes Planner': 'Backtimes Planner',
            Help: 'Help',
            'Redirecting...': 'Redirecting...',
            'It seems like you have no incomings 馃榾':
                'It seems like you have no incomings 馃榾',
            Attack: 'Attack',
            Unit: 'Unit',
            Incoming: 'Incoming',
            Origin: 'Origin',
            Destination: 'Destination',
            'Sent Time': 'Sent Time',
            'Land Time': 'Land Time',
            'Return Time': 'Return Time',
            Actions: 'Actions',
            'Plan Backtimes': 'Plan Backtimes',
            'Export Selected': 'Export Selected',
            'Automatic Export': 'Automatic Export',
            'Nothing has been selected!': 'Nothing has been selected!',
            'No incoming could be selected!': 'No incoming could be selected!',
            'Copied on clipboard!': 'Copied on clipboard!',
            Status: 'Status',
            'There was an error fetching villages by group!':
                'There was an error fetching villages by group!',
            'An error occured while fetching troop counts!':
                'An error occured while fetching troop counts!',
            'combinations found': 'combinations found',
            'No possible backtime options found!':
                'No possible backtime options found!',
            From: 'From',
            To: 'To',
            Distance: 'Distance',
            'Launch Time': 'Launch Time',
            'Send in': 'Send in',
            Send: 'Send',
            'Add Return Time': 'Add Return Time',
            'Untagged incomings have been found!':
                'Untagged incomings have been found!',
            'Tag Incomings': 'Tag Incomings',
            'All incoming commands have been renamed!':
                'All incoming commands have been renamed!',
            'No unit survived the battle!': 'No unit survived the battle!',
            'Slowest Unit': 'Slowest Unit',
            'Travel Time': 'Travel Time',
            'Travel Time is always calculated based off the slowest unit that was sent, no matter if the unit survived or not!':
                'Travel Time is always calculated based off the slowest unit that was sent, no matter if the unit survived or not!',
            'Command has already returned home!':
                'Command has already returned home!',
        },
    },
    allowedMarkets: ['us', 'en'],
    allowedScreens: ['overview_villages'],
    allowedModes: ['incomings'],
    isDebug: DEBUG,
    enableCountApi: true,
};

$.getScript(
    `https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`,
    async function () {
        // Initialize Library
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();
        const isValidScreen = twSDK.checkValidLocation('screen');
        const isValidMode = twSDK.checkValidLocation('mode');
        const gameScreen = twSDK.getParameterByName('screen');
        const gameView = twSDK.getParameterByName('view');
        const gameSubType = twSDK.getParameterByName('subtype');
        const totalIncomingAttacks = parseInt(game_data.player.incomings);

        const DEFAULT_VALUES = {
            SELECTED_UNITS: ['axe', 'light', 'ram', 'catapult'],
        };

        const { worldUnitInfo } = await fetchWorldConfig();

        const units = {
            spear: 'spear',
            sword: 'sword',
            axe: 'axe',
            archer: 'archer',
            spy: 'spy',
            light: 'lcav',
            marcher: 'marcher',
            heavy: 'hcav',
            ram: 'ram',
            cat: 'cat',
            snob: 'noble',
        };

        const allowedScreens = {
            INCOMINGS_OVERVIEW:
                isValidScreen && isValidMode && gameSubType === 'attacks',
            SINGLE_REPORT: gameScreen === 'report' && gameView,
        };

        // Entry point
        (async function () {
            if (allowedScreens.INCOMINGS_OVERVIEW) {
                initializeIncomingsOverviewScreen();
            } else if (allowedScreens.SINGLE_REPORT) {
                initializeBacktimesPlannerReport();
            } else {
                UI.InfoMessage(twSDK.tt('Redirecting...'));
                twSDK.redirectTo(
                    'overview_villages&mode=incomings&subtype=attacks'
                );
            }
        })();

        // Entry point for incomings overview screen
        async function initializeIncomingsOverviewScreen() {
            if (!totalIncomingAttacks) {
                UI.InfoMessage(
                    twSDK.tt('It seems like you have no incomings 馃榾')
                );
                return;
            }

            const incomings = await collectIncomingsList();

            // build the user interface
            buildUI(incomings);

            // register user actions
            handleMasterSelectionToggle();
            handlePlanBackTimes(incomings);
            handleExportSelected(incomings);
            handleAutomaticExport(incomings);
            handleRenameCommands(incomings);
            handleTagIncomings(incomings);
        }

        // Entry point for reports screen
        function initializeBacktimesPlannerReport() {
            const {
                distance,
                slowestUnitType,
                battleTime,
                totalRemainingUnits,
            } = parseReportData();

            if (totalRemainingUnits === 0) {
                UI.InfoMessage(twSDK.tt('No unit survived the battle!'));
                return;
            }

            const { formattedReturnTime, formattedTravelTime, returnTime } =
                calculateReturnTime({
                    distance,
                    slowestUnitType,
                    battleTime,
                });

            if (returnTime.getTime() < new Date().getTime()) {
                UI.ErrorMessage(twSDK.tt('Command has already returned home!'));
            } else {
                const infoVillageLink = `/game.php?screen=info_village&id=${
                    game_data.village.id
                }${twSDK.sitterId}&landingTime=${returnTime.getTime()}`;

                const content = `
                    <div class="ra-mb15">
                        <table class="ra-table ra-table-v3" width="100%">
                            <tbody>
                                <tr>
                                    <td>
                                        <b>${twSDK.tt('Return Time')}</b>
                                    </td>
                                    <td>
                                        ${formattedReturnTime}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>${twSDK.tt('Slowest Unit')}</b>
                                    </td>
                                    <td>
                                        ${slowestUnitType.unit}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>${twSDK.tt('Travel Time')}</b>
                                    </td>
                                    <td>
                                        ${formattedTravelTime}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="ra-mb15">
                        <a class="btn" href="${infoVillageLink}" target="_blank" rel="noopener noreferrer">
                            ${twSDK.tt('Plan Backtimes')}
                        </a>
                    </div>
                    <div class="ra-mb15 info_box ra-info-box">
                        <p>
                            ${twSDK.tt(
                                'Travel Time is always calculated based off the slowest unit that was sent, no matter if the unit survived or not!'
                            )}
                        </p>
                    </div>
                `;

                const customStyle = `
                    .ra-info-box p { line-height: 1.3; margin-left: 8px; margin-bottom: 0; }
                `;

                twSDK.renderFixedWidget(
                    content,
                    scriptConfig.scriptData.prefix,
                    'ra-backtimes-planner-report',
                    customStyle
                );
            }
        }

        // Render: Build the user interface
        async function buildUI(incomings) {
            const { selectedUnits } = initDefaultValues();

            const unitPickerHtml = twSDK.buildUnitsPicker(selectedUnits, [
                'spy',
                'militia',
                'knight',
                'snob',
            ]);

            const incomingsTable = buildIncomingsTableHtml(incomings);

            // build UI
            const content = `
                <div class="ra-mb15">
                    ${unitPickerHtml}
                </div>
                <div class="ra-mb15 ra-table-container">
                    ${incomingsTable}
                </div>
                <div>
                    <a href="javascript:void(0);" class="btn" id="raPlanBacktimesBtn">
                        ${twSDK.tt('Plan Backtimes')}
                    </a>
                    <a href="javascript:void(0);" class="btn" id="raExportSelectedBtn">
                        ${twSDK.tt('Export Selected')}
                    </a>
                    <a href="javascript:void(0);" class="btn" id="raAutomaticExportBtn">
                        ${twSDK.tt('Automatic Export')}
                    </a>
                    <a href="javascript:void(0);" class="btn" id="raAddReturnTimeBtn">
                        ${twSDK.tt('Add Return Time')}
                    </a>
                    <a href="javascript:void(0);" class="btn" id="raTagIncomingsBtn">
                        ${twSDK.tt('Tag Incomings')}
                    </a>
                </div>
                <div id="raSnipes" class="ra-mt15" style="display:none;">
                    <label class="ra-label"><span id="raPossibleCombinationsCount">0</span> ${twSDK.tt(
                        'combinations found'
                    )}</label>
                    <div id="raPossibleCombinationsTable" class="ra-table-container"></div>
                </div>
            `;

            const customStyle = `
                .ra-table-container { max-height: 300px; }
                .ra-table-v3 th,
                .ra-table-v3 td { text-align: center; }

                .ra-table-v2 th { font-size: 12px; }
                .ra-table-v2 th, .ra-table-v2 td { text-align: center; border: 1px solid #c4a566; }
                .ra-table-v2 th label, .ra-table-v2 td input[type="checkbox"] { cursor: pointer; }
                .ra-label { display: block; font-weight: 600; margin-bottom: 5px; }
                .ra-input { display: block; width: 100%; height: auto; padding: 5px; font-size: 14px; }

                .ra-fw600 { font-weight: 600; }
            `;

            twSDK.renderBoxWidget(
                content,
                scriptConfig.scriptData.prefix,
                'ra-backtimes-planner',
                customStyle
            );
        }

        // Action Handler: Check/uncheck all checkboxes on the table
        function handleMasterSelectionToggle() {
            jQuery('#raMasterSelectionToggle').on('click', function (e) {
                const isChecked = jQuery('#raMasterSelectionToggle').is(
                    ':checked'
                );
                jQuery('.ra-select-toggle').prop('checked', isChecked);
            });
        }

        // Action Handler: Plan backtimes
        function handlePlanBackTimes(incomings) {
            jQuery('#raPlanBacktimesBtn').on('click', async function (e) {
                e.preventDefault();

                const { selectedUnits, selectedIncomings } = collectUserInput();

                if (selectedIncomings.length === 0) {
                    UI.ErrorMessage(twSDK.tt('Nothing has been selected!'));
                } else {
                    const filteredIncomingDetails = [];

                    incomings.forEach((incoming) => {
                        const { incomingId } = incoming;
                        selectedIncomings.forEach((id) => {
                            if (incomingId === id) {
                                filteredIncomingDetails.push(incoming);
                            }
                        });
                    });

                    const ownVillages = await fetchAllPlayerVillagesByGroup(
                        game_data.group_id
                    );
                    const troopCounts = await fetchTroopsForCurrentGroup(
                        game_data.group_id
                    );

                    let possibleSnipes = [];
                    let realSnipes = [];

                    ownVillages.forEach((village) => {
                        const { id, coords, name } = village;

                        filteredIncomingDetails.forEach((incoming) => {
                            const {
                                origin,
                                returnTimeDate,
                                returnTime,
                                label,
                                incomingId,
                            } = incoming;
                            const distance = twSDK.calculateDistance(
                                coords,
                                origin
                            );

                            selectedUnits.forEach((unit) => {
                                const launchTime = getLaunchTime(
                                    unit,
                                    returnTimeDate,
                                    distance
                                );
                                if (
                                    launchTime >
                                        twSDK
                                            .getServerDateTimeObject()
                                            .getTime() &&
                                    distance > 0
                                ) {
                                    const formattedLaunchTime =
                                        twSDK.formatDateTime(launchTime);
                                    possibleSnipes.push({
                                        id: id,
                                        name: name,
                                        unit: unit,
                                        fromCoord: coords,
                                        toCoord: origin,
                                        distance: distance,
                                        launchTime: launchTime,
                                        formattedLaunchTime:
                                            formattedLaunchTime,
                                        landingTime: returnTime,
                                        label: label,
                                        incomingId: incomingId,
                                        returnTime: returnTime,
                                    });
                                }
                            });
                        });
                    });

                    possibleSnipes.sort((a, b) => {
                        return a.launchTime - b.launchTime;
                    });

                    possibleSnipes.forEach((snipe) => {
                        const { id, unit } = snipe;
                        troopCounts.forEach((villageTroops) => {
                            if (
                                villageTroops.villageId === id &&
                                villageTroops[unit] > 0
                            ) {
                                snipe = {
                                    ...snipe,
                                    unitAmount: villageTroops[unit],
                                };
                                realSnipes.push(snipe);
                            }
                        });
                    });

                    realSnipes = realSnipes.slice(0, 500);

                    if (realSnipes.length) {
                        const snipesTableHtml =
                            buildCombinationsTableHtml(realSnipes);
                        jQuery('#raSnipes').show();
                        jQuery('#raPossibleCombinationsCount').text(
                            realSnipes.length
                        );
                        jQuery('#raPossibleCombinationsTable').html(
                            snipesTableHtml
                        );

                        localStorage.setItem(
                            `${scriptConfig.scriptData.prefix}_snipes`,
                            JSON.stringify(realSnipes)
                        );

                        jQuery(window.TribalWars)
                            .off()
                            .on('global_tick', function () {
                                const remainingTime = jQuery(
                                    '#raSnipes .ra-table tbody tr:eq(0) span[data-endtime]'
                                )
                                    .text()
                                    .trim();
                                if (remainingTime === '0:00:10') {
                                    TribalWars.playSound('chat');
                                }
                                document.title =
                                    twSDK.tt('Send in') + ' ' + remainingTime;
                            });

                        Timing.tickHandlers.timers.handleTimerEnd = function (
                            e
                        ) {
                            jQuery(this).closest('tr').remove();
                        };

                        Timing.tickHandlers.timers.init();
                    } else {
                        UI.ErrorMessage(
                            twSDK.tt('No possible backtime options found!')
                        );
                        jQuery('#raSnipes').hide();
                        jQuery('#raPossibleCombinationsCount').text(0);
                        jQuery('#raPossibleCombinationsTable').html('');
                    }
                }
            });
        }

        // Action Handler: Export selected incomings
        function handleExportSelected(incomings) {
            jQuery('#raExportSelectedBtn').on('click', function (e) {
                e.preventDefault();

                const selectedIncomings = [];
                jQuery('.ra-select-toggle').each(function () {
                    if (jQuery(this).is(':checked')) {
                        selectedIncomings.push(parseInt(jQuery(this).val()));
                    }
                });

                if (selectedIncomings.length === 0) {
                    UI.ErrorMessage(twSDK.tt('Nothing has been selected!'));
                } else {
                    const filteredIncomingDetails = [];

                    incomings.forEach((incoming) => {
                        const { incomingId } = incoming;
                        selectedIncomings.forEach((id) => {
                            if (incomingId === id) {
                                filteredIncomingDetails.push(incoming);
                            }
                        });
                    });

                    const bbCode = prepareBBCode(filteredIncomingDetails);
                    twSDK.copyToClipboard(bbCode);
                    UI.SuccessMessage(twSDK.tt('Copied on clipboard!'));
                }
            });
        }

        // Action Handler: Export selected incomings
        function handleAutomaticExport(incomings) {
            jQuery('#raAutomaticExportBtn').on('click', function (e) {
                e.preventDefault();

                const selectedIncomings = incomings
                    .filter((incoming) => {
                        const { attackType } = incoming;
                        return (
                            attackType !== 'attack_small.png' &&
                            attackType !== 'attack.png'
                        );
                    })
                    .map((incoming) => incoming.incomingId);

                if (selectedIncomings.length === 0) {
                    UI.ErrorMessage(twSDK.tt('No incoming could be selected!'));
                } else {
                    const filteredIncomingDetails = [];

                    incomings.forEach((incoming) => {
                        const { incomingId } = incoming;
                        selectedIncomings.forEach((id) => {
                            if (incomingId === id) {
                                filteredIncomingDetails.push(incoming);
                            }
                        });
                    });

                    const bbCode = prepareBBCode(filteredIncomingDetails);
                    twSDK.copyToClipboard(bbCode);
                    UI.SuccessMessage(twSDK.tt('Copied on clipboard!'));
                }
            });
        }

        // Action Handler: Add return time on label
        function handleRenameCommands(incomings) {
            jQuery('#raAddReturnTimeBtn').on('click', function (e) {
                e.preventDefault();

                const filteredIncomings = incomings.filter(
                    (incoming) => !incoming.label.includes('[R]:')
                );

                if (filteredIncomings.length === 0) {
                    UI.SuccessMessage(
                        twSDK.tt('All incoming commands have been renamed!')
                    );
                    return;
                }

                filteredIncomings.forEach((incomings, index) => {
                    setTimeout(() => {
                        index++;

                        const { incomingId, label, returnTime } = incomings;
                        const newLabel = `${label} [R]:${returnTime}`;

                        jQuery('span.quickedit[data-id="' + incomingId + '"]')
                            .find('.rename-icon')
                            .click();
                        jQuery('span.quickedit[data-id="' + incomingId + '"]')
                            .find('input[type=text]')
                            .val(newLabel);
                        jQuery('span.quickedit[data-id="' + incomingId + '"]')
                            .find('input[type=button]')
                            .click();

                        UI.InfoMessage(`${index}/${filteredIncomings.length}`);
                    }, index * 160);
                });
            });
        }

        // Action Handler: Tag incomings using game's built-in label tool
        function handleTagIncomings(incomings) {
            jQuery('#raTagIncomingsBtn').on('click', function (e) {
                e.preventDefault();

                jQuery('#select_all').click();
                jQuery('[name="label"]').click();
            });
        }

        // Helper: Parse report data
        function parseReportData() {
            let origin = jQuery('#attack_info_att .village_anchor a')[0]
                .innerText.trim()
                .match(twSDK.coordsRegex)[0];
            let destination = jQuery('#attack_info_def .village_anchor a')[0]
                .innerText.trim()
                .match(twSDK.coordsRegex)[0];

            let distance = twSDK.calculateDistance(origin, destination);
            let battleTime = jQuery('#content_value')
                .find('.small.grey')
                .parent()
                .text()
                .trim();

            let sentUnits = {};
            let lostUnits = [];

            game_data.units.forEach((unit) => {
                jQuery(`#attack_info_att .unit-item-${unit}`).each(function (
                    index
                ) {
                    const currentEl = parseInt(jQuery(this).text().trim());
                    if (index === 0) {
                        sentUnits = {
                            ...sentUnits,
                            [unit]: currentEl,
                        };
                    } else {
                        lostUnits = {
                            ...lostUnits,
                            [unit]: currentEl,
                        };
                    }
                });
            });

            const remainingUnits = {};
            for (const key in sentUnits) {
                if (sentUnits.hasOwnProperty(key)) {
                    remainingUnits[key] = sentUnits[key] - lostUnits[key];
                }
            }

            const totalRemainingUnits = Object.values(remainingUnits).reduce(
                (sum, value) => sum + value,
                0
            );

            let filteredUnits = filterEmptyUnits(sentUnits);
            let slowestUnitType = findSlowestUnit(filteredUnits);

            return {
                origin,
                destination,
                distance,
                slowestUnitType,
                battleTime,
                totalRemainingUnits,
            };
        }

        // Helper: Filter and remove units with amount as zero
        function filterEmptyUnits(units) {
            let filteredUnits = [];

            for (let [unit, value] of Object.entries(units)) {
                if (value > 0) {
                    filteredUnits.push(unit);
                }
            }

            return filteredUnits;
        }

        // Helper: Find the slowest unit in the attacking force
        function findSlowestUnit(units) {
            let sortedUnitSpeeds = sortObjectByKey(
                worldUnitInfo.config,
                'speed'
            );

            let slowestUnitsArray = [];

            units.forEach((unit) => {
                sortedUnitSpeeds.forEach((sortedUnit) => {
                    if (sortedUnit.unit === unit) {
                        slowestUnitsArray.push(sortedUnit);
                    }
                });
            });

            slowestUnitsArray.sort((a, b) => a.speed - b.speed);

            return slowestUnitsArray.pop();
        }

        // Helper: Sort unit types by key
        function sortObjectByKey(object, key) {
            let sortedObject = Object.fromEntries(
                Object.entries(object).sort(([i, a], [j, b]) => a[key] - b[key])
            );

            let sortedUnitsSpeed = [];
            for (let [key, value] of Object.entries(sortedObject)) {
                if (key !== 'militia') {
                    const { speed } = value;
                    sortedUnitsSpeed.push({
                        unit: key,
                        speed: parseFloat(speed),
                    });
                }
            }

            return sortedUnitsSpeed;
        }

        // Helper: Calculate return time of command from report
        function calculateReturnTime(reportData) {
            const { distance, slowestUnitType, battleTime } = reportData;

            const battleTimeUnix = new Date(battleTime).getTime();
            const travelTime = twSDK.getTravelTimeInSecond(
                distance,
                slowestUnitType.speed
            );
            const formattedTravelTime = twSDK.secondsToHms(
                parseInt(travelTime)
            );

            const returnTime = addSecondsToDate(travelTime, battleTimeUnix);
            const formattedReturnTime = twSDK.formatDateTime(returnTime);

            return { formattedReturnTime, formattedTravelTime, returnTime };
        }

        // Helper: Prepare BB Code for export
        function prepareBBCode(incomings) {
            let bbCode = `[table][**]${twSDK.tt('Unit')}[||]${twSDK.tt(
                'Incoming'
            )}[||]${twSDK.tt('Return Time')}[||]${twSDK.tt(
                'Actions'
            )}[||]${twSDK.tt('Status')}[/**]\n`;

            incomings.forEach((incoming) => {
                const { unit, label, returnTime, originId, returnTimeDate } =
                    incoming;

                const infoVillageLink = `/game.php?screen=info_village&id=${originId}${
                    twSDK.sitterId
                }&landingTime=${returnTimeDate.getTime()}`;

                bbCode += `[*][unit]${unit}[/unit][|] ${label} [|]${returnTime}[|][url=${
                    window.location.origin
                }${infoVillageLink}]${twSDK.tt('Plan Backtimes')}[/url][|]\n`;
            });

            bbCode += `[/table]`;

            return bbCode;
        }

        // Helper: Build a table of incomings
        function buildIncomingsTableHtml(incomings) {
            let tableHtml = `
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" id="raMasterSelectionToggle" />
                            </th>
                            <th>
                                ${twSDK.tt('Unit')}
                            </th>
                            <th width="35%">
                                ${twSDK.tt('Incoming')}
                            </th>
                            <th>
                                ${twSDK.tt('Land Time')}
                            </th>
                            <th>
                                ${twSDK.tt('Return Time')}
                            </th>
                            <th>
                                ${twSDK.tt('Actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            incomings.forEach((incoming) => {
                const {
                    incomingId,
                    unit,
                    attackType,
                    label,
                    landTime,
                    originId,
                    returnTime,
                    returnTimeDate,
                } = incoming;

                const infoVillageLink = `/game.php?screen=info_village&id=${originId}${
                    twSDK.sitterId
                }&landingTime=${returnTimeDate.getTime()}`;

                tableHtml += `
                    <tr>
                        <td>
                            <input type="checkbox" value="${incomingId}" class="ra-select-toggle" />
                        </td>
                        <td>
                            <img src="/graphic/unit/unit_${unit}.png" />
                            <img src="/graphic/command/${attackType}" />
                        </td>
                        <td width="35%" class="ra-tal">
                            <a href="${
                                game_data.link_base_pure
                            }info_command&id=${incomingId}" target="_blank" rel="noopener noreferrer">
                                ${label}
                            </a>
                        </td>
                        <td>
                            ${landTime}
                        </td>
                        <td>
                            <span class="ra-fw600">${returnTime}</span>:000
                        </td>
                        <td>
                            <a href="${infoVillageLink}" class="btn" target="_blank" rel="noopener noreferrer">
                                ${twSDK.tt('Plan Backtimes')}
                            </a>
                        </td>
                    </tr>
                `;
            });

            tableHtml += `</tbody></table>`;

            return tableHtml;
        }

        // Helper: Render Combinations Table
        function buildCombinationsTableHtml(snipes) {
            let combinationsTable = `
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        <tr>
                            <th>
                                #
                            </th>
                            <th class="ra-tal" width="30%">
                                ${twSDK.tt('Incoming')}
                            </th>
                            <th>
                                ${twSDK.tt('Unit')}
                            </th>
                            <th>
                                ${twSDK.tt('Return Time')}
                            </th>
                            <th>
                                ${twSDK.tt('Launch Time')}
                            </th>
                            <th>
                                ${twSDK.tt('Send in')}
                            </th>
                            <th>
                                ${twSDK.tt('Send')}
                            </th>
                        </tr>
                    </thead>
                <tbody>
            `;

            const serverTime = twSDK.getServerDateTimeObject().getTime();

            snipes.forEach((snipe, index) => {
                const {
                    id,
                    label,
                    toCoord,
                    unit,
                    launchTime,
                    formattedLaunchTime,
                    unitAmount,
                    incomingId,
                    returnTime,
                } = snipe;

                const [toX, toY] = toCoord.split('|');
                const timeTillLaunch = twSDK.secondsToHms(
                    (launchTime - serverTime) / 1000
                );

                let commandUrl = `/game.php?village=${id}&screen=place&x=${toX}&y=${toY}&y=${toY}&${unit}=${unitAmount}${twSDK.sitterId}`;

                combinationsTable += `
                    <tr>
                        <td>
                            ${index + 1}
                        </td>
                        <td class="ra-tal" width="30%">
                            <a href="${
                                game_data.link_base_pure
                            }info_command&id=${incomingId}" target="_blank" rel="noopener noreferrer">
                                ${label}
                            </a>
                        </td>
                        <td>
                            <img src="/graphic/unit/unit_${unit}.png" /> <span class="ra-unit-count">${twSDK.formatAsNumber(
                    unitAmount
                )}</span>
                        </td>
                        <td>
                            ${returnTime}
                        </td>
                        <td>
                            ${formattedLaunchTime}
                        </td>
                        <td>
                            <span class="timer" data-endtime>${timeTillLaunch}</span>
                        </td>
                        <td>
                            <a href="${commandUrl}" target="_blank" rel="noopener noreferrer" class="btn">
                                ${twSDK.tt('Send')}
                            </a>
                        </td>
                    </tr>
                `;
            });

            combinationsTable += `</tbody></table>`;

            return combinationsTable;
        }

        // Helper: Collect incomings
        async function collectIncomingsList() {
            let incomings = [];

            jQuery('#incomings_table tbody tr.nowrap').each((_, incoming) => {
                const label = jQuery(incoming)
                    .find('span.quickedit-label')
                    .text()
                    .trim();
                const unit = getUnitByLabel(label);

                if (label !== twSDK.tt('Attack') && unit) {
                    const incomingId = parseInt(
                        jQuery(incoming).find('span.quickedit').attr('data-id')
                    );
                    const destination = jQuery(incoming)
                        .find('td:eq(1)')
                        .text()
                        .match(twSDK.coordsRegex)
                        .pop();
                    const origin = jQuery(incoming)
                        .find('td:eq(2)')
                        .text()
                        .match(twSDK.coordsRegex)
                        .pop();
                    const originVillageId = parseInt(
                        jQuery(incoming)
                            .find('td:eq(2) a')
                            .attr('href')
                            .split('id=')[1]
                    );

                    const landingTime = twSDK.getTimeFromString(
                        jQuery(incoming).find('td:eq(5)').text().trim()
                    );
                    const distance = twSDK.calculateDistance(
                        origin,
                        destination
                    );
                    const attackType = jQuery(incoming)
                        .find('td:eq(0)')
                        .find('img')
                        .attr('src')
                        .split('/')
                        .pop()
                        .split('#')[0]
                        .split('?')[0];

                    const landingTimeObject = parseDateString(landingTime);
                    const travelTime = twSDK.getTravelTimeInSecond(
                        distance,
                        worldUnitInfo.config[unit].speed
                    );
                    const returnTime = addSecondsToDate(
                        travelTime,
                        landingTimeObject
                    );
                    const formattedReturnTime =
                        twSDK.formatDateTime(returnTime);

                    incomings.push({
                        incomingId: incomingId,
                        label: label,
                        attackType: attackType,
                        destination: destination,
                        originId: originVillageId,
                        origin: origin,
                        landTime: landingTime,
                        distance: distance,
                        returnTime: formattedReturnTime,
                        returnTimeDate: returnTime,
                        unit: unit,
                    });
                } else {
                    UI.ErrorMessage(
                        twSDK.tt('Untagged incomings have been found!')
                    );
                }
            });

            if (HIDE_GREENS) {
                incomings = incomings.filter(
                    (incoming) => incoming.attackType !== 'attack_small.png'
                );
            }

            if (DEBUG) {
                console.debug(`${scriptInfo} HIDE_GREENS:`, HIDE_GREENS);
                console.debug(`${scriptInfo} incomings:`, incomings);
            }

            return incomings.slice(0, MAX_INCS);
        }

        // Helper: Collect user input
        function collectUserInput() {
            const selectedUnits = [];
            jQuery('.ra-unit-selector').each(function () {
                if (jQuery(this).is(':checked')) {
                    selectedUnits.push(this.value);
                }
            });

            const selectedIncomings = [];
            jQuery('.ra-select-toggle').each(function () {
                if (jQuery(this).is(':checked')) {
                    selectedIncomings.push(parseInt(jQuery(this).val()));
                }
            });

            return { selectedUnits, selectedIncomings };
        }

        // Helper: Get the default field values on script load time
        function initDefaultValues() {
            const selectedUnits =
                JSON.parse(
                    localStorage.getItem(
                        `${scriptConfig.scriptData.prefix}_chosen_units`
                    )
                ) ?? DEFAULT_VALUES.SELECTED_UNITS;

            return { selectedUnits };
        }

        // Helper: Get unit type by incoming label
        function getUnitByLabel(attackName) {
            let unit = '';
            attackName = attackName.toLowerCase();

            if (
                attackName.includes(units.axe) ||
                attackName.includes(units.spear) ||
                attackName.includes(units.archer)
            ) {
                unit = 'topór';
            } else if (attackName.includes(units.sword)) {
                unit = 'miecz';
            } else if (attackName.includes(units.spy)) {
                unit = 'zwiad';
            } else if (
                attackName.includes(units.light) ||
                attackName.includes(units.marcher) ||
                attackName.includes('lcav')
            ) {
                unit = 'lk';
            } else if (
                attackName.includes(units.heavy) ||
                attackName.includes('hcav')
            ) {
                unit = 'ck';
            } else if (
                attackName.includes(units.ram) ||
                attackName.includes(units.cat)
            ) {
                unit = 'taran';
            } else if (attackName.includes(units.snob)) {
                unit = 'szlachcic';
            }


            return unit;
        }

        // Helper: Parse a date string as object
        function parseDateString(dateString) {
            const [datePart, timePart] = dateString.split(' ');
            const [day, month, year] = datePart.split('/');
            const [hour, minute, second, millisecond] = timePart.split(':');

            // JavaScript months start from 0 (January is 0)
            const parsedDate = new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                millisecond
            );

            return parsedDate;
        }

        // Helper: Calculate a new date based on a given amount of seconds and an initial date
        function addSecondsToDate(seconds, date) {
            let newDate = new Date(date);
            newDate.setSeconds(newDate.getSeconds() + seconds);
            return newDate;
        }

        // Helper: Get launch time of command
        function getLaunchTime(unit, landingTime, distance) {
            const msPerSec = 1000;
            const secsPerMin = 60;
            const msPerMin = msPerSec * secsPerMin;

            const unitSpeed = worldUnitInfo.config[unit].speed;
            const unitTime = distance * unitSpeed * msPerMin;

            const sentTime = new Date();
            sentTime.setTime(
                Math.round((landingTime - unitTime) / msPerSec) * msPerSec
            );

            return sentTime.getTime();
        }

        // Helper: Fetch home troop counts for current group
        async function fetchTroopsForCurrentGroup(groupId) {
            const mobileCheck = $('#mobileHeader').length > 0;
            const troopsForGroup = await jQuery
                .get(
                    game_data.link_base_pure +
                        `overview_villages&mode=combined&group=${groupId}&page=-1`
                )
                .then(async (response) => {
                    const htmlDoc = jQuery.parseHTML(response);
                    const homeTroops = [];

                    if (mobileCheck) {
                        let table = jQuery(htmlDoc).find(
                            '#combined_table tr.nowrap'
                        );
                        for (let i = 0; i < table.length; i++) {
                            let objTroops = {};
                            let villageId = parseInt(
                                table[i]
                                    .getElementsByClassName('quickedit-vn')[0]
                                    .getAttribute('data-id')
                            );
                            let listTroops = Array.from(
                                table[i].getElementsByTagName('img')
                            )
                                .filter((e) => e.src.includes('unit'))
                                .map((e) => ({
                                    name: e.src
                                        .split('unit_')[1]
                                        .replace('@2x.png', ''),
                                    value: parseInt(
                                        e.parentElement.nextElementSibling
                                            .innerText
                                    ),
                                }));
                            listTroops.forEach((item) => {
                                objTroops[item.name] = item.value;
                            });

                            objTroops.villageId = villageId;

                            homeTroops.push(objTroops);
                        }
                    } else {
                        const combinedTableRows = jQuery(htmlDoc).find(
                            '#combined_table tr.nowrap'
                        );
                        const combinedTableHead = jQuery(htmlDoc).find(
                            '#combined_table tr:eq(0) th'
                        );

                        const combinedTableHeader = [];

                        // collect possible buildings and troop types
                        jQuery(combinedTableHead).each(function () {
                            const thImage = jQuery(this)
                                .find('img')
                                .attr('src');
                            if (thImage) {
                                let thImageFilename = thImage.split('/').pop();
                                thImageFilename = thImageFilename.replace(
                                    '.png',
                                    ''
                                );
                                combinedTableHeader.push(thImageFilename);
                            } else {
                                combinedTableHeader.push(null);
                            }
                        });

                        // collect possible troop types
                        combinedTableRows.each(function () {
                            let rowTroops = {};

                            combinedTableHeader.forEach(
                                (tableHeader, index) => {
                                    if (tableHeader) {
                                        if (tableHeader.includes('unit_')) {
                                            const villageId = jQuery(this)
                                                .find(
                                                    'td:eq(1) span.quickedit-vn'
                                                )
                                                .attr('data-id');
                                            const unitType =
                                                tableHeader.replace(
                                                    'unit_',
                                                    ''
                                                );
                                            rowTroops = {
                                                ...rowTroops,
                                                villageId: parseInt(villageId),
                                                [unitType]: parseInt(
                                                    jQuery(this)
                                                        .find(`td:eq(${index})`)
                                                        .text()
                                                ),
                                            };
                                        }
                                    }
                                }
                            );

                            homeTroops.push(rowTroops);
                        });
                    }

                    return homeTroops;
                })
                .catch((error) => {
                    UI.ErrorMessage(
                        tt('An error occured while fetching troop counts!')
                    );
                    console.error(`${scriptInfo()} Error:`, error);
                });

            return troopsForGroup;
        }

        // Helper: Fetch player villages by group
        async function fetchAllPlayerVillagesByGroup(groupId) {
            try {
                let fetchVillagesUrl = '';
                if (game_data.player.sitter > 0) {
                    fetchVillagesUrl =
                        game_data.link_base_pure +
                        `groups&ajax=load_villages_from_group&t=${game_data.player.id}`;
                } else {
                    fetchVillagesUrl =
                        game_data.link_base_pure +
                        'groups&ajax=load_villages_from_group';
                }
                const villagesByGroup = await jQuery
                    .post({
                        url: fetchVillagesUrl,
                        data: { group_id: groupId },
                        dataType: 'json',
                        headers: { 'TribalWars-Ajax': 1 },
                    })
                    .then(({ response }) => {
                        const parser = new DOMParser();
                        const htmlDoc = parser.parseFromString(
                            response.html,
                            'text/html'
                        );
                        const tableRows = jQuery(htmlDoc)
                            .find('#group_table > tbody > tr')
                            .not(':eq(0)');

                        if (tableRows.length) {
                            let villagesList = [];

                            tableRows.each(function () {
                                const villageId =
                                    jQuery(this)
                                        .find('td:eq(0) a')
                                        .attr('data-village-id') ??
                                    jQuery(this)
                                        .find('td:eq(0) a')
                                        .attr('href')
                                        .match(/\d+/)[0];
                                const villageName = jQuery(this)
                                    .find('td:eq(0)')
                                    .text()
                                    .trim();
                                const villageCoords = jQuery(this)
                                    .find('td:eq(1)')
                                    .text()
                                    .trim();

                                villagesList.push({
                                    id: parseInt(villageId),
                                    name: villageName,
                                    coords: villageCoords,
                                });
                            });

                            return villagesList;
                        } else {
                            return [];
                        }
                    });

                return villagesByGroup;
            } catch (error) {
                UI.ErrorMessage(
                    twSDK.tt('There was an error fetching villages by group!')
                );
                console.error(`${scriptInfo} Error:`, error);
            }
        }

        // Helper: Fetch all required world data
        async function fetchWorldConfig() {
            try {
                const worldUnitInfo = await twSDK.getWorldUnitInfo();
                return { worldUnitInfo };
            } catch (error) {
                UI.ErrorMessage(error);
                console.error(`${scriptInfo} Error:`, error);
            }
        }
    }
);