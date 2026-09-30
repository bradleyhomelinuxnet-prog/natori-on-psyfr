

function updateLocalTime() {
    var currentLocalTimeElemInner = document.getElementById("current-local-time");

    if ( currentLocalTimeElemInner ) {
        if ( document.activeElement == currentLocalTimeElemInner ) {
            // Don't update while operator is editing.
        } else {
            if ( GLOBAL_DATE_SCOPE == EVENT_SCOPE__HH_MM ) {
                currentLocalTimeElemInner.value = getLocalTimeAsPickrValue(appState.globalOptions.local_time_offset_in_millis);
            } else {
                currentLocalTimeElemInner.value = getLocalDateAsPickrValue(appState.globalOptions.local_time_offset_in_millis);
            }
        }
    }
    
    updateResetButton();
}

function isThereATimeOffset() {
    // var currentLocalTimeElem = document.getElementById("current-local-time");

    // if ( currentLocalTimeElem ) {
    //     if ( getLocalTimeAsPickrValue(0) == currentLocalTimeElem.value ) {
    //         return false;
    //     } else {
    //         return true;
    //     }
    // }

    return appState.globalOptions.local_time_offset_in_millis != 0;
}

function disableStandardButton(button) {
    button.style.opacity = OPACITY__DISABLED;
    button.style.cursor = "default";
    button.disabled = true;
}

function enableStandardButton(button) {
    button.style.opacity = OPACITY__ENABLED;
    button.style.cursor = "pointer";
    button.disabled = false;
}

function updateResetButton() {
    var resetTimeButton = document.getElementById("reset-time-button");
    
    if ( resetTimeButton ) {
        if ( isThereATimeOffset() == false ) {
            disableStandardButton(resetTimeButton);
        } else {
            enableStandardButton(resetTimeButton);
        }
    }
}

function clockRefreshLoop() {
    var clockRefreshRateInMillis = 500;

    setTimeout(function() {
        updateLocalTime();
        clockRefreshLoop();
    }, clockRefreshRateInMillis);
}

clockRefreshLoop();

function setUpCondensedOutputOptionsControls(results) {

    var someOtherHtmlThatCouldBeUsedForSomethingEventually = "";

    var errors = results.errors;

    var filterCheckboxHtml = "<div style='position:relative; cursor:pointer;"+SCREEN_SPECIFIC_HEADER_MARGIN_LEFT+"'>Current Time:</div>";

    // If location is enabled then it seems best to offer time-level scope for the user's current time.
    var minDateInputWidth = GLOBAL_DATE_SCOPE == EVENT_SCOPE__HH_MM ? MIN_DATE_AND_TIME_FIELD_WIDTH : MIN_DATE_FIELD_WIDTH;
    var resetButtonHtml = '<button id="reset-time-button" title="Reset to current date." style="margin-left:5px;" class="add_button large_font bordered small_border_radius">< Reset</button>';
    var currentTimeHelpButton = '<button style="margin-left:5px;" id="current-time-help-button" title="" class="square_button add_button large_font bordered small_border_radius">?</button>';
    var currentTimeHtml = "<table style='width:100%;'><tr><td>"+filterCheckboxHtml+"</td><td style='padding-left:5px;'><input tabindex='-1' style='padding-right:5px; width:"+minDateInputWidth+";' id='current-local-time' class='date_input_common general_input'></input></td><td>"+resetButtonHtml+currentTimeHelpButton+"</td><td style='width:100%; text-align:center;'>"+someOtherHtmlThatCouldBeUsedForSomethingEventually+"</td></tr></table>";

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = currentTimeHtml;

    // var blurCheckboxTitle = appState.globalOptions.blur_about_screen == true ? "Show About Screen" : "Blur About Screen";
    // var blurCheckboxHtml = "<input type='checkbox' style='position:relative;top:2px;' id='blur-about-screen-checkbox' class='blur_about_screen_checkbox' title='"+blurCheckboxTitle+"' />";//<label style='cursor:pointer;margin-left:5px;' id='blur-about-screen-checkbox-label' for='blur-about-screen-checkbox' title='"+blurCheckboxTitle+">Blur Screen</label>";
   
    var currentLocalTimeElem = document.getElementById("current-local-time");

    updateLocalTime();

    var flatPickrConfig = GLOBAL_DATE_SCOPE == EVENT_SCOPE__HH_MM ? FLATPICKR_BASE_DATE_CONFIG__HH_MM() : FLATPICKR_BASE_DATE_CONFIG__DAYS();
    flatPickrConfig.defaultDate = getLocalTimeAsPickrValue(appState.globalOptions.local_time_offset_in_millis);

    function fallbackDateString(inputElemForCallback) {
        var currentNativeDate = getCurrentNativeDate();
        var xDate = nativeDateToXDate(currentNativeDate);
        
        return xDateToInputElementValue(xDate, GLOBAL_DATE_SCOPE);
    }

    function onValidDateEntered(inputElemForCallback, parsedNativeDate, xDate) {

        // This value will be midnight of current browser's timezone.
        var parsedNativeDate_millis = parsedNativeDate.getTime();

        // This value will be the exact time of current browser's timezone.
        var currentLocalTimeInMillis = getCurrentLocalTime(0).getTime();
        var currentLocalTime_native = new Date(currentLocalTimeInMillis);

        if ( GLOBAL_DATE_SCOPE != EVENT_SCOPE__HH_MM ) {
            currentLocalTime_native.setHours(0, 0, 0, 0);
        }
        
        currentLocalTimeInMillis = currentLocalTime_native.getTime();

        var newOffset = 0;

        // var currentLocalTime_millisRemainder = currentLocalTimeInMillis % MILLIS_PER_MINUTE;

        // parsedNativeDate_millis = parsedNativeDate_millis - (parsedNativeDate_millis % MILLIS_PER_MINUTE);
        // parsedNativeDate_millis += currentLocalTime_millisRemainder;

        var newOffset = parsedNativeDate_millis - currentLocalTimeInMillis;
        setGlobalOption("local_time_offset_in_millis", newOffset);

        updateResetButton();

        var preserveScrollPosition = false;
        refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
    }

    setUpDateInput(flatPickrConfig, currentLocalTimeElem, EVENT_SCOPE__HH_MM, getBrowserTimezone(), fallbackDateString, onValidDateEntered);

    flatpickr(currentLocalTimeElem, flatPickrConfig);

    var resetTimeButton = document.getElementById("reset-time-button");
    resetTimeButton.addEventListener("click", function() {
        if ( isThereATimeOffset() ) {
            setGlobalOption("local_time_offset_in_millis", 0);
            
            var preserveScrollPosition = false;
            refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
        }
    });

    var currentTimeHelpButton = document.getElementById("current-time-help-button");
    currentTimeHelpButton.addEventListener("click", function() {
        var message = "";
        message += "Current Time is automatically set to reflect your current computer time and time zone. The time can be overridden but currently the time zone cannot.<br><br>";
        message += "Your time zone appears to be: <b>" + getBrowserTimezone() + "</b><br><br>";
        message += "Current Time is used for the F3 and F4 Output Filters. Please note that even if you override Current Time, it will keep incrementing. It won't stay fixed to the time you set.<br><br>";
        message += "This feature is intended as a convenience to automatically hide unactionable Output Dates. If doing backtesting however, then F3/F4 should probably both be turned off.";
        showOkDialog(message);
    });

    applyToolTip(resetTimeButton);
    // applyToolTip(checkBoxElem);
    applyToolTipToElemId("z-date-filter-checkbox-label");


    // var checkBoxElem = screenSpecificArea.getElementsByClassName("hide_operation_columns_checkbox")[0];
    // checkBoxElem.checked = appState.globalOptions[GLOBAL_OPTION__HIDE_OPERATION_COLUMNS];
    // checkBoxElem.addEventListener("change", function() {
    //     var shouldNowBeHidden = this.checked;
    //     setGlobalOption(GLOBAL_OPTION__HIDE_OPERATION_COLUMNS, shouldNowBeHidden);

    //     refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, results);
    // });

    // applyToolTip(checkBoxElem);
    // applyToolTipToElemId("hide-operation-columns-checkbox-label");
}

function renderCondensedOutputElseErrors(results) {
    var errors = results.errors;

    // Defensive measure. Should be superfluous but calling just in case of upstream weirdness.
    clearOutputContainer();

    if ( errors.length > 0 ) {
        renderErrors(errors);
    } else {
        renderCondensedOutput(results);
    }
}

function renderCondensedOutput(results) {

    // debugger;

    // console.log("renderCondensedOutput")

    var zStructsDict = results.z_structs;

    function hideColHeaderHtml(hideColGlobalOption) {

        var generalTitle = "Show/Hide the output in this column.";

        // if ( hideColGlobalOption == Z_DATE_SORT_TYPE__DATE ) {
        //     generalTitle = "Click to sort by Z-Date, soonest to furthest. Z-Dates are future dates on which the event may reoccur.";
        // } else if ( hideColGlobalOption == Z_DATE_SORT_TYPE__SCORE ) {
        //     generalTitle = "Click to sort by Score, highest to lowest. See About page for more info on this calculation.";
        // } else if ( hideColGlobalOption == Z_DATE_SORT_TYPE__MSRF ) {
        //     generalTitle = "Click to sort by MSRF importance, determined based on the MSRF number(s) that matched the day count from an X-Date to a Z-Date. Hover over each pill to display more details.";
        // } else if ( hideColGlobalOption == Z_DATE_SORT_TYPE__HIT_COUNT ) {
        //     generalTitle = "Click to sort by number of Hits, highest to lowest, determined by adding number of Operations plus number of MSRF matches.";
        // }

        // var sortTypeOfEvent = getCurrentIsoEvent().z_date_sort_type ? getCurrentIsoEvent().z_date_sort_type : DEFAULT_Z_DATE_SORT_TYPE;
        // var boxShadowForSortButton = sortTypeOfEvent == sortType ? "top:1px; left:1px; box-shadow: none;" : "";

        var toReturn = "";

        var titleForHidingCol = "";

        var actualCheckbox = "<input type='checkbox' style='margin-left:10px; position:relative;top:2px;' id='"+hideColGlobalOption+"' class='hide_col_checkbox' title='"+titleForHidingCol+"' />";

        var hideCheckbox = "<label style='display:block; cursor:pointer;margin-left:5px;' id='' for='"+hideColGlobalOption+"' title='"+titleForHidingCol+"'>Show"+actualCheckbox+"</label>";
        
        toReturn += "<table id='' title='"+generalTitle+"' class='tool_tippable_cursor condensed_output_tool_tippable_header' style='width:100%; cursor:pointer;'><tr>";
        // toReturn += "<td style='width:33%;'></td>";

        toReturn += "<td class='col_sub_header_format' style='text-align:right; border:none; width:100%; padding:0px; padding-right:5px; padding-left:5px;'>"+hideCheckbox+"</td>";
        // toReturn += "<td style='text-align:right; vertical-align:middle; width:33%;'></td>";
        toReturn += "</tr></table>";

        return toReturn;
    }

    function sortableHeaderHtml(headerName, sortType) {

        var generalTitle = "";

        if ( sortType == Z_DATE_SORT_TYPE__DATE ) {
            generalTitle = "Click to sort by Z-Date, soonest to furthest. Z-Dates are future dates on which the event may reoccur.";
        } else if ( sortType == Z_DATE_SORT_TYPE__SCORE ) {
            generalTitle = "Click to sort by Score, highest to lowest. See About page for more info on this calculation.";
        } else if ( sortType == Z_DATE_SORT_TYPE__MSRF ) {
            generalTitle = "Click to sort by MSRF importance, determined based on the MSRF number(s) that matched the day count from an X-Date to a Z-Date. Hover over each pill to display more details.";
        } else if ( sortType == Z_DATE_SORT_TYPE__HIT_COUNT ) {
            generalTitle = "Click to sort by number of Hits, highest to lowest, determined by adding number of Operations plus number of MSRF matches.";
        } else if ( sortType == Z_DATE_SORT_TYPE__OPERATIONS ) {
            generalTitle = "Click to sort by number of Operations, highest to lowest, determined by how much the Operations contribtued to the overall Score.";
        }

        var sortTypeOfEvent = getCurrentIsoEvent().z_date_sort_type ? getCurrentIsoEvent().z_date_sort_type : DEFAULT_Z_DATE_SORT_TYPE;
        var boxShadowForSortButton = sortTypeOfEvent == sortType ? "top:1px; left:1px; box-shadow: none;" : "";

        var toReturn = "";

        var titleForHidingCol = "TODO";

        var iconImg = "<table style='width:100%;'><tr><td style='width:100%;' ></td><td style='vertical-align:middle;' ><img style='"+boxShadowForSortButton+"' src='./img/sort_icon.png' class='sort_icon'/></td></tr></table>";
        toReturn += "<table id='"+sortType+"' title='"+generalTitle+"' class='tool_tippable_cursor condensed_output_tool_tippable_header' style='width:100%; cursor:pointer;'><tr>";
        toReturn += "<td style='width:33%;'></td>";

        toReturn += "<td class='col_sub_header_format' style='border:none; width:33%; padding:0px; padding-right:5px; padding-left:5px;'>"+headerName+"</td>";
        toReturn += "<td style='text-align:right; vertical-align:middle; width:33%;'>"+iconImg+"</td>";
        toReturn += "</tr></table>";

        return toReturn;
    }

    var currentIsoEvent = getCurrentIsoEvent();
    var scoringSystem = getScoringSystem(currentIsoEvent);
    var sortedAndFilteredZDates = results.processed_z_dates;

    if ( sortedAndFilteredZDates.length == 0 ) {
        var softErrors = [];
        softErrors.push(NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT);
        var clearDatesHidden = false;
        renderErrors(softErrors, clearDatesHidden);
        return;
    }

    var resultCountString = sortedAndFilteredZDates.length + (sortedAndFilteredZDates.length > 1 ? " results" : " result");
    // var windowHeaderHtml = sortableHeaderHtml("Z-Dates (" + resultCountString + ")", Z_DATE_SORT_TYPE__DATE);
    var windowHeaderHtml = sortableHeaderHtml("Z-Dates (" + sortedAndFilteredZDates.length + ")", Z_DATE_SORT_TYPE__DATE);
    var hitCountHeaderHtml = sortableHeaderHtml("Hits", Z_DATE_SORT_TYPE__HIT_COUNT);
    var scoreHeaderHtml = sortableHeaderHtml("Score", Z_DATE_SORT_TYPE__SCORE);
    // var scoreHeaderHtml = sortableHeaderHtml("<img style='position:relative; top:2px;height:30px;' src='./img/fire.webp'/> ", Z_DATE_SORT_TYPE__SCORE, GLOBAL_OPTION__HIDE_COL__SCORE);
    var msrfHeaderHtml = sortableHeaderHtml("MSRF", Z_DATE_SORT_TYPE__MSRF);
    var operationsHeaderHtml = sortableHeaderHtml("Operations", Z_DATE_SORT_TYPE__OPERATIONS);


    if ( isFlagEnabled(FEATURE_FLAG__ALL_OPERATOR_HIDE_OUTPUT_COLS) ) {
        var hideDatesHtml = hideColHeaderHtml(GLOBAL_OPTION__HIDE_COL__DATES);
        var hideHitsHtml = hideColHeaderHtml(GLOBAL_OPTION__HIDE_COL__HITS);
        var hideScoreHtml = hideColHeaderHtml(GLOBAL_OPTION__HIDE_COL__SCORE);
        var hideMsrfHtml = hideColHeaderHtml(GLOBAL_OPTION__HIDE_COL__MSRF);
        var hideOperationsHtml = hideColHeaderHtml(GLOBAL_OPTION__HIDE_COL__OPERATIONS);

        var headerRowHtmlForHiding = '';
        headerRowHtmlForHiding += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
        headerRowHtmlForHiding += '<td style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format">'+hideDatesHtml+'</td>';
        headerRowHtmlForHiding += '<td style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format">'+hideHitsHtml+'</td>';
        headerRowHtmlForHiding += '<td style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format">'+hideScoreHtml+'</td>';
        headerRowHtmlForHiding += '<td title="" style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format tool_tippable_cursor condensed_output_tool_tippable_header">'+hideMsrfHtml+'</td>';

        if ( appState.globalOptions[GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY] === false ) {
            headerRowHtmlForHiding += '<td title="" style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format tool_tippable_cursor condensed_output_tool_tippable_header">'+hideOperationsHtml+'</td>';
        }
        
        var headerRow = addOutputRow();
        headerRow.innerHTML = headerRowHtmlForHiding;
    }


    var headerRowHtml = '';
    headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
    headerRowHtml += '<td style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format">'+windowHeaderHtml+'</td>';
    headerRowHtml += '<td style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format">'+hitCountHeaderHtml+'</td>';
    headerRowHtml += '<td style="width:0%; white-space:nowrap; padding:0px;" class="col_sub_header_format">'+scoreHeaderHtml+'</td>';
    headerRowHtml += '<td title="" style="width:50%; white-space:nowrap; padding:0px;" class="col_sub_header_format tool_tippable_cursor condensed_output_tool_tippable_header">'+msrfHeaderHtml+'</td>';

    if ( appState.globalOptions[GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY] === false ) {
        headerRowHtml += '<td title="" style="width:100%; white-space:nowrap;" class="col_sub_header_format tool_tippable_cursor condensed_output_tool_tippable_header">'+operationsHeaderHtml+'</td>';
    }
    
    headerRow = addOutputRow();
    headerRow.innerHTML = headerRowHtml;

    applyToolTipToCssClass("condensed_output_tool_tippable_header");

    function generateZDatePillAttributes(operationResult) {
        return "operation_result_hash='"+operationResult.hash+"'";
        // return "x_date_native_start='"+operationResult.x_date_native_start.getTime()+"' z_date_native_end='"+operationResult.z_date_native_end.getTime()+"'" ;
    }

    var operationHeaderElem = document.getElementById(Z_DATE_SORT_TYPE__OPERATIONS);
    var operationHeaderElemWidth = operationHeaderElem ? operationHeaderElem.clientWidth : 0;
    var operationPillsPerRow = Math.floor(operationHeaderElemWidth / PILL_WIDTH_IN_PX); //OPERATION_PILLS_PER_ROW;

    if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
        operationPillsPerRow--;

        if ( operationPillsPerRow == 0 ) {
            operationPillsPerRow = 1;
        }
    }

    // Can be zero if operation col is hidden completely.
    operationPillsPerRow = operationPillsPerRow > 0 ? operationPillsPerRow : 1;

    var replaceMultiplicationSymbolFalse = false;

    for ( var i = 0; i < sortedAndFilteredZDates.length; i++ ) {
        var ithZDateDictKey = sortedAndFilteredZDates[i];
        var ithZDateTags = zStructsDict[ithZDateDictKey];

        var ithScore = ithZDateTags.score;
        var ithBaseScorePreMultiply = ithZDateTags.base_score_pre_multiply;
        var ithHitCount = ithZDateTags.hit_count;
        var ithDateRangeInnerHtml = "";
        
        if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
            var ithSunsetBefore = ithZDateTags.z_date_readable_start;
            var ithSunsetAfter = ithZDateTags.z_date_readable_end;

            // ithDateRangeInnerHtml = "<div class='z_date_sunset_pill'>" + ithSunsetBefore + "</div></td><td style='vertical-align:middle;'><span style='position:relative; top:-3px; margin:5px;' class='date_range_arrow'>"+RIGHT_ARROW_HTML+"</span></td><td style='vertical-align:middle;'><div class='z_date_sunset_pill'>" + ithSunsetAfter + "</div>";
            ithDateRangeInnerHtml = "<table><tr><td style='text-align:right; padding-right:2px;'>from: </td><td><div style='margin-bottom:4px;' class='z_date_sunset_pill'>" + ithSunsetBefore + "</div></td>";
            ithDateRangeInnerHtml += "<tr><td style='text-align:right;  padding-right:2px;'>to:</td><td><div class='z_date_sunset_pill'>" + ithSunsetAfter + "</div></td></tr></table>";
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__DAYS ) {
            var zDateReadableStart = ithZDateTags.z_date_readable_start;
            ithDateRangeInnerHtml = "<div class='z_date_sunset_pill'>" + zDateReadableStart + "</div>";
        }

        var ithDateRangeHtml = "<table style='white-space:nowrap; margin-left: auto; margin-right:auto; height:100%;'><tr><td style='vertical-align:middle;'>"+ithDateRangeInnerHtml+"</td></tr></table>";
        var ithOperationMatchStructs = ithZDateTags.operation_match_structs;

        var xToZStringToShowIfNoMsrfMatches = "";

        var pillContainerMaxHeight = "max-height: 60px;";

        if ( shouldExpandMainOutputPanel() ) {
            pillContainerMaxHeight = "max-height: 108px;";
        }

        var operationMatchString = "<div class='pill_results_table_wrapper' style='"+pillContainerMaxHeight+"overflow-y: scroll;'><table class='pill_results_table'><tr>";
        var useSubscriptInShortNamesInToolTip = true;
        var pillResultsTableColWidth = 100/operationPillsPerRow;
        var k = 0;
        for ( k = 0; k < ithOperationMatchStructs.length; k++ ) {
            if ( k > 0 && k % operationPillsPerRow == 0 ) {
                operationMatchString += "</tr><tr>";
            }

            operationMatchString += "<td style='width:"+pillResultsTableColWidth+"%;' class='pill_results_table_col'>";

            var kthOperationMatchStruct = ithOperationMatchStructs[k];
            var kthOperationResult = kthOperationMatchStruct.operation_result;
            var kthOperationOrdinal = kthOperationResult.operation_ordinal;
            var kthOperation = currentIsoEvent.effective_operations[kthOperationOrdinal];
            var operationEquation = normalizeOperationEquationString(kthOperation.equation, replaceMultiplicationSymbolFalse);


            var oShortName = getRowShortNameHtml(OPERATION_SHORTHAND, kthOperationOrdinal);
            var zShortName = getRowShortNameHtml(Z_DATE_SHORTHAND, kthOperationOrdinal);

            var cssClassName = isAlphaOperation(kthOperation) ? "operation_alpha" : "operation_beta";

            
            var yStruct = kthOperationMatchStruct.y_struct;
            var yOrdinal = yStruct.y_ordinal;
            var x1Ordinal = yStruct.x_1_ordinal;
            var x2Ordinal = yStruct.x_2_ordinal;

            var yShortName = getRowShortNameHtml("Y", yOrdinal, useSubscriptInShortNamesInToolTip);
            var x1ShortName = getRowShortNameHtml("X", x1Ordinal, useSubscriptInShortNamesInToolTip);
            var x2ShortName = getRowShortNameHtml("X", x2Ordinal, useSubscriptInShortNamesInToolTip);
            
            var startingXShortName = "";
            var xStringToReplaceInEquation = "";
            var startingX = getStartingX(kthOperation.equation);
            if ( startingX == STARTING_X1 ) {
                startingXShortName = x1ShortName;
                xStringToReplaceInEquation = "X1";
            } else {
                startingXShortName = x2ShortName;
                xStringToReplaceInEquation = "X2";
            }

            operationEquation = operationEquation.replace(xStringToReplaceInEquation, startingXShortName);

            var operationEquationWithoutXPart = operationEquation;
            operationEquationWithoutXPart = operationEquationWithoutXPart.replace(startingXShortName + "+", "");
            operationEquationWithoutXPart = replaceOperationConstants(operationEquationWithoutXPart);
            operationEquationWithoutXPart = operationEquationWithoutXPart.replace("Y", intToDecimalString(yStruct.rotation_count_y));

            var x1Tox2StringWithArrow = x1ShortName + RIGHT_ARROW_HTML + x2ShortName;
            var x1Tox2StringWithArrowAndSunset = x1ShortName + " " + RIGHT_ARROW_HTML + " " + x2ShortName + "";
            // var xToZStringWithArrow = startingXShortName + RIGHT_ARROW_HTML + zShortName;
            var xToZStringWithArrow = startingXShortName + RIGHT_ARROW_HTML + "Z-Date";

            var zValue = kthOperationResult.z_value;
            var zValueReadable = getZValueReadable(zValue, kthOperationOrdinal);

            var originalEquationWithSubscriptsForX = normalizeOperationEquationString(kthOperation.equation, replaceMultiplicationSymbolFalse);
            originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X1", startingXShortName);
            originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X2", startingXShortName);

            var rotationCountZ = kthOperationMatchStruct.operation_result.rotation_count_z;

            var points = kthOperationMatchStruct.points;

            var operationNameForTooltip = "<span class=\""+cssClassName+"\">"+(isAlphaOperation(kthOperation) ? "Alpha Operation" : "Beta Operation")+"</span>";

            

            var msrfClassName = "";
            var readableType = "";
            var msrfString = "";
            var filterMatch = getMsrfMatch(rotationCountZ);

            if ( filterMatch != null ) {
                msrfClassName = filterMatch.css_class;

                msrfString = readableMsrfMatchString(rotationCountZ, filterMatch);
            } else {
                msrfString = rotationCountZ + " = No Match";
            }

            var finalMsrfHtml = "<span class=\""+msrfClassName+"\">"+msrfString+"</span>";

            var isWhite = true;
            var toolTipTableTitles = ["Type", "Label", "X-Range", "Equation", getRotationLabelHtml("Y", isWhite), "Z-Value", getRotationLabelHtml(Z_DATE_SHORTHAND, isWhite), "Score", "MSRF"];
            var toolTipTableValues = [
                operationNameForTooltip,
                oShortName,
                x1Tox2StringWithArrowAndSunset,
                "Z-Date = " + originalEquationWithSubscriptsForX,
                x1Tox2StringWithArrow + " = " + readableAxialRotations(yStruct.rotation_count_y),
                operationEquationWithoutXPart + " = " + zValueReadable,
                xToZStringWithArrow + " = " + readableAxialRotations(rotationCountZ),
                "Contributes " + points + " to the base score of "+ithBaseScorePreMultiply,
                finalMsrfHtml
            ];

            var title = generateTableToolTip(toolTipTableTitles, toolTipTableValues);

            var opTypeAttr = isAlphaOperation(kthOperation) ? "alpha" : "beta";

            var zPillLabel = oShortName+"<span class=\"parenthetical_equation\">(" + x1Tox2StringWithArrow + ")</span>";

            var zMatchPill = "<div "+generateZDatePillAttributes(kthOperationResult)+" operation_type='"+opTypeAttr+"' title='"+title+"' style='cursor:help;' onmouseover='onMouseOverPill(this);' onmouseout='onMouseOutPill();' class='"+cssClassName+" z_match_with_tool_tip'><div style='text-align:center;'>"+zPillLabel+"</div></div>";

            operationMatchString += zMatchPill;

            operationMatchString += "</td>";

            if ( xToZStringToShowIfNoMsrfMatches != "" ) {
                xToZStringToShowIfNoMsrfMatches += ", ";
            }

            xToZStringToShowIfNoMsrfMatches += zPillLabel + " = <span style=\"font-weight:600;\">" + rotationCountZ + "</span>";
        }

        // if ( ithOperationMatchStructs.length > 1 && ithOperationMatchStructs.length % colsPerRowForOperationMatches != 0 ) {
        // if ( ithOperationMatchStructs.length % colsPerRowForOperationMatches != 0 ) {
        while ( k % operationPillsPerRow != 0 ) {
            var dummyMatchPill = "<div operation_type='"+""+"' style='visibility:visible; cursor:help;' class='"+cssClassName+"><div style='text-align:center;'>"+""+"</div></div>";
            operationMatchString += "<td style='width:"+pillResultsTableColWidth+"%;' class='pill_results_table_col'>"+dummyMatchPill+"</td>";
            k++;
        }

        operationMatchString += "</tr></table></div>";

        var shortRowName = getRowShortNameHtml(Z_DATE_SHORTHAND, ithZDateTags.z_ordinal);

        var ithMsrfMatchStructs = ithZDateTags.msrf_match_structs;
        var msrfMatchString = "";

        if ( ithMsrfMatchStructs.length == 0 ) {
            msrfMatchString = "<table class='msrf_no_matches' onmouseover='onMouseOverPill(this);' onmouseout='onMouseOutPill();' title='There were no matches against the MSRF filter for the day count:<br>"+xToZStringToShowIfNoMsrfMatches+"'><tr><td>none</td></tr></table>";
        } else {
            msrfMatchString = "<div class='pill_results_table_wrapper' style='"+pillContainerMaxHeight+"overflow-y: auto;'><table class='pill_results_table'><tr>";

            var multiplyingMsrfMatchStruct = null;

            var overallMsrfMultiplier = getMsrfScoreMultiplier(ithMsrfMatchStructs);

            for ( var k = 0; k < ithMsrfMatchStructs.length; k++ ) {
                var kthMsrfMatchStruct = ithMsrfMatchStructs[k];

                var kthMultiplier = getMsrfScoreMultiplierForFilter(kthMsrfMatchStruct.msrf_filter);
                
                if ( kthMultiplier == overallMsrfMultiplier ) {
                    multiplyingMsrfMatchStruct = kthMsrfMatchStruct;
                    break;
                }
            }

            var MSRF_PILLS_PER_ROW = 1;
            for ( var k = 0; k < ithMsrfMatchStructs.length; k++ ) {
                if ( k > 0 && k % MSRF_PILLS_PER_ROW == 0 ) {
                    msrfMatchString += "</tr><tr>";
                }

                msrfMatchString += "<td class='pill_results_table_col'>";

                var kthMsrfMatchStruct = ithMsrfMatchStructs[k];
                var kthOperationResult = kthMsrfMatchStruct.operation_result;
                var kthOperationOrdinal = kthOperationResult.operation_ordinal;
                var kthOperation = currentIsoEvent.effective_operations[kthOperationOrdinal];
                var operationEquation = normalizeOperationEquationString(kthOperation.equation, replaceMultiplicationSymbolFalse);

                var rotationCountZ = kthOperationResult.rotation_count_z;


                var oShortName = getRowShortNameHtml(OPERATION_SHORTHAND, kthOperationOrdinal);
                var zShortName = getRowShortNameHtml(Z_DATE_SHORTHAND, kthOperationOrdinal);

                
                var yStruct = kthMsrfMatchStruct.y_struct;
                var yOrdinal = yStruct.y_ordinal;
                var x1Ordinal = yStruct.x_1_ordinal;
                var x2Ordinal = yStruct.x_2_ordinal;

                var yShortName = getRowShortNameHtml("Y", yOrdinal, useSubscriptInShortNamesInToolTip);
                var x1ShortName = getRowShortNameHtml("X", x1Ordinal, useSubscriptInShortNamesInToolTip);
                var x2ShortName = getRowShortNameHtml("X", x2Ordinal, useSubscriptInShortNamesInToolTip);
                
                var startingXShortName = "";
                var xStringToReplaceInEquation = "";
                var startingX = getStartingX(kthOperation.equation);
                if ( startingX == STARTING_X1 ) {
                    startingXShortName = x1ShortName;
                    xStringToReplaceInEquation = "X1";
                } else {
                    startingXShortName = x2ShortName;
                    xStringToReplaceInEquation = "X2";
                }

                operationEquation = operationEquation.replace(xStringToReplaceInEquation, startingXShortName);

                var operationEquationWithoutXPart = operationEquation;
                operationEquationWithoutXPart = operationEquationWithoutXPart.replace(startingXShortName + "+", "");
                operationEquationWithoutXPart = replaceOperationConstants(operationEquationWithoutXPart);
                operationEquationWithoutXPart = operationEquationWithoutXPart.replace("Y", yStruct.rotation_count_y);

                var x1Tox2StringWithArrow = x1ShortName + RIGHT_ARROW_HTML + x2ShortName;
                var x1Tox2StringWithArrowAndSunset = x1ShortName + "  Sunset " + RIGHT_ARROW_HTML + " " + x2ShortName + " Sunset";
                var xToZStringWithArrow = startingXShortName + RIGHT_ARROW_HTML + zShortName;

                var originalEquationWithSubscriptsForX = normalizeOperationEquationString(kthOperation.equation, replaceMultiplicationSymbolFalse);
                originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X1", startingXShortName);
                originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X2", startingXShortName);

                var points = kthMsrfMatchStruct.points;

                var opTypeAttr = kthMsrfMatchStruct.css_class; // purposely same as css class, just to keep it simple.
                var cssClassName = kthMsrfMatchStruct.css_class;
                var readableType = readableMsrfMatchString(rotationCountZ, kthMsrfMatchStruct);

                var thirdRow = "";

                if ( scoringSystem == SCORING_SYSTEM__GTE_V8 && multiplyingMsrfMatchStruct == kthMsrfMatchStruct ) {
                    thirdRow = "Multiplies base score of " + ithBaseScorePreMultiply + " by "+overallMsrfMultiplier;
                } else {
                    thirdRow = "Contributes " + points + " to the base score of "+ithBaseScorePreMultiply;
                }
                    
                var toolTipTableTitles = ["Type", "Source", "Score"];
                var toolTipTableValues = [
                    "<span class=\""+cssClassName+"\">" + readableType + "</span>",
                    oShortName+"<span class=\"parenthetical_equation\">(" + x1Tox2StringWithArrow + ")",
                    thirdRow
                ];

                var title = generateTableToolTip(toolTipTableTitles, toolTipTableValues);

                var msrfFilterNumber = kthMsrfMatchStruct.msrf_number;

                var msrfPill = "<div "+generateZDatePillAttributes(kthOperationResult)+" msrf_type='"+opTypeAttr+"' title='"+title+"' onmouseover='onMouseOverPill(this);' onmouseout='onMouseOutPill();' style='cursor:help;' class='"+cssClassName+" z_match_with_tool_tip'><div style='text-align:center;'>"+msrfFilterNumber + "</div></span></div>";

                msrfMatchString += msrfPill;

                msrfMatchString += "</td>";
            }

            if ( ithMsrfMatchStructs.length > 1 && ithMsrfMatchStructs.length % MSRF_PILLS_PER_ROW != 0 ) {
                msrfMatchString += "<td class='pill_results_table_col'></td>";
            }

            msrfMatchString += "</tr></table></div>";
        }

        // Transparent pixel by default.
        var hitCountSymbolSrc = getHitCountSymbolImage(ithHitCount, /*srcOnly=*/true);
        
        var hitCountSymbolImg = "<img style='margin-top:5px; width:24px;height:24px;' src='"+hitCountSymbolSrc+"' />&nbsp;";

        var hitCountHtml = "<table style='margin-left:auto; margin-right:auto;' ><tr><td style='vertical-align:middle;'>"+hitCountSymbolImg+"</td><td style='vertical-align:middle;'>"+ithHitCount+"</td></tr></table>"
        
        var blurClass = "blurred_output_column";
        var dateStyleBlur = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__DATES] === true ? blurClass : "";
        var hitStyleBlur = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__HITS] === true ? blurClass : "";
        var scoreStyleBlur = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__SCORE] === true ? blurClass : "";
        var msrfStyleBlur = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__MSRF] === true ? blurClass : "";
        var operationsStyleBlur = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__OPERATIONS] === true ? blurClass : "";
        
        var ithRowHtml = '';
        ithRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'>"+shortRowName+"</div></td>";
        ithRowHtml += '<td style="text-align:center; padding:5px;" class="'+dateStyleBlur+' col_format algo_output_in_col">'+ithDateRangeHtml+'</td>';
        ithRowHtml += '<td style="text-align:center;" class="'+hitStyleBlur+' col_format algo_output_in_col"><div class="algo_output_in_col condensed_score">'+hitCountHtml+'</div></td>';
        ithRowHtml += '<td style="text-align:center;" class="'+scoreStyleBlur+' col_format algo_output_in_col"><div class="algo_output_in_col condensed_score">'+ithScore+'</div></td>';
        ithRowHtml += '<td style="text-align:center; padding:5px;" class="'+msrfStyleBlur+' col_format algo_output_in_col">'+msrfMatchString+'</td>';

        if ( appState.globalOptions[GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY] === false ) {
            ithRowHtml += '<td style="text-align:right; padding:5px;" class="'+operationsStyleBlur+' col_format algo_output_in_col">'+operationMatchString+'</td>';
        }
        
        var ithNewRow = addOutputRow();
        ithNewRow.classList.add("z_date_output_row")
        ithNewRow.innerHTML = ithRowHtml;
        ithNewRow.setAttribute("z_date_key", ithZDateDictKey);

        ithNewRow.addEventListener("mouseenter", function() {
            appState.latestResults.highlighted_z_date_row = this.getAttribute("z_date_key");
            var callUpdateChartDatasets = false;
            clearChartHovers(callUpdateChartDatasets); // just in case somehow the "chart mouse leave" logic didn't get triggered or do its job.
            updateChartDatasetsFromRowHighlightingChange();
        });

        ithNewRow.addEventListener("mouseleave", function() {
            appState.latestResults.highlighted_z_date_row = null;
            updateChartDatasetsFromRowHighlightingChange();
        });
    }

    Z_DATES_SORT_TYPES.forEach(function(ith) {
        if ( document.getElementById(ith) ) {
            document.getElementById(ith).addEventListener("click", function() {
                getCurrentIsoEvent().z_date_sort_type = ith;
                flushChangesToDisk();

                /*re*/sortAndFilterResults(getCurrentIsoEvent(), appState.latestResults);
        
                refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, results);
            });
        }
    });

    GLOBAL_HIDE_COL_OPTIONS.forEach(function(ith) {
        if ( document.getElementById(ith) ) {
            document.getElementById(ith).checked = appState.globalOptions[ith] === false;
            document.getElementById(ith).addEventListener("change", function(e) {
                var shouldNowBeHidden = this.checked == false;
                setGlobalOption(ith, shouldNowBeHidden);
        
                refreshCurrentPage(REFRESH_TYPE__SOFT, results);
            });
        }
    });
}

function updateChartDatasetsFromRowHighlightingChange() {
    /**
     * Have to update the datasets from scratch since it looks like dataset z-order is not scriptable.
     * If it were scriptable, then could call {@link updateChart()}
     */
    updateChartDatasets(appState.latestResults);
}

function getOperationResultFromHash(results, operationResultHash) {
    var zStructsDict = results.z_structs;

    for (var ithSunsetBeforeMillisString in zStructsDict) {
        // check if the property/key is defined in the object itself, not in parent
        if (zStructsDict.hasOwnProperty(ithSunsetBeforeMillisString)) {
            var ithZDateTags = zStructsDict[ithSunsetBeforeMillisString];

            var ithOperationMatchStructs = ithZDateTags.operation_match_structs;

            for ( var k = 0; k < ithOperationMatchStructs.length; k++ ) {
                var kthOperationMatchStruct = ithOperationMatchStructs[k];
                var kthOperationResult = kthOperationMatchStruct.operation_result;

                if ( operationResultHash == kthOperationResult.hash ) {
                    return kthOperationResult;
                }
            }
        }
    }

    return null;
}

function onMouseOutPill() {
    appState.latestResults.highlighted_operation_result_pill = null;

    updateChartDatasetsFromRowHighlightingChange();
}

function onMouseOverPill(element) {

    if ( FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS === true ) {
        applyToolTip(element);

        setTimeout(function() {
            if ( element.isConnected && element.matches(':hover') ) {
                $(element).tipsy('show');
            }
        }, TOOL_TIP_DELAY_IN_MILLISECONDS);
    }

    var operationResultHash = element.getAttribute("operation_result_hash");
    
    if ( appState.latestResults && operationResultHash ) {
        var operationResult = getOperationResultFromHash(appState.latestResults, operationResultHash);

        appState.latestResults.highlighted_operation_result_pill = operationResult;
    } else {
        appState.latestResults.highlighted_operation_result_pill = null;
    }

    updateChartDatasetsFromRowHighlightingChange();
}

function renderDebugOutput(results) {

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = "For validation purposes, may be removed.";

    var yStructs = results.y_structs;

    var currentIsoEvent = getCurrentIsoEvent();

    var shortNameOfCurrentSelectedY = getRowShortNameHtml("Y", results.selected_y_struct_for_details);

    
    var headerRowHtml = '';
    headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"></td>';
    headerRowHtml += '<td style="width:0%; white-space:nowrap;" title="All the permutations of past X-Date to a future X-Date." class="detail_col_header col_sub_header_format">X-Range</td>';
    headerRowHtml += '<td style="width:0%; white-space:nowrap;" title="The number of days between the X-Date range." class="detail_col_header col_sub_header_format">'+getRotationLabelHtml("Y")+'</td>';
    headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"></td>';

    // Shortened to without the e.g. "... on Y<sub>3</sub>" cause the <sub> was stretching the col height a little.
    // headerRowHtml += '<td style="width:50%;" class="col_sub_header_format">Z-Operations on '+shortNameOfCurrentSelectedY+'</td>';
    headerRowHtml += '<td style="width:50%;" class="col_sub_header_format">Z-Operations</td>';

    var headerRow = addOutputRow();
    headerRow.innerHTML = headerRowHtml;

    applyToolTipToCssClass("detail_col_header");

    for ( var i = 0; i < yStructs.length; i++ ) {
        var ithYStruct = yStructs[i];
        var ithShortName = getRowShortNameHtml("Y", i);
        var ithRotationCountY = ithYStruct.rotation_count_y;
        var ithRange = getRowShortNameHtml("X", ithYStruct.x_1_ordinal) + "<span class='date_range_arrow'>"+RIGHT_ARROW_HTML+"</span>" + getRowShortNameHtml("X", ithYStruct.x_2_ordinal);
        // var ithRangeInnerTable = '<table style="width:100%;"><tr><td style="border:none;" class="col_format"><div style="margin-left:8px; white-space:nowrap;" class="col_output_text">'+ithRange+'</div></td><td class="col_format" style="border:none; text-align:center;"><div class="col_output_text">=</div></td><td class="col_format" style="border:none; text-align:right;"><div class="col_output_text" style="font-weight:600; margin-right:8px;">'+ithReadableYValue+'</div></td></tr></table>';
        var ithRangeInner = '<div style="margin:5px; white-space:nowrap;" class="col_output_text">'+ithRange+'</div>';

        var readableRotationCount = intToDecimalString(ithRotationCountY);

        var ithRowHtml = '';
        ithRowHtml += '<td style="" class="col_sub_header_format_for_row"><div class="input_row_name">'+ithShortName+'</div></td>';
        ithRowHtml += '<td style="text-align:center;" class="col_format">'+ithRangeInner+'</td>';
        ithRowHtml += '<td style="text-align:center;" class="col_format"><div style="font-weight:600;" class="col_output_text algo_output_in_col">'+readableRotationCount+'</div></td>';
        

        var isCurrentYStruct = i == results.selected_y_struct_for_details;
        var borderRightForRadioCell = isCurrentYStruct ? "border-right:none;" : "border-right:1.5px solid black;";
        var extraClassForRadioCell = isCurrentYStruct ? "selected_detailed_output_cell" : "";
        var radioButtonChecked = isCurrentYStruct ? "checked" : "";
        var radioButtonHtml = "<label class='row_radio_button_label'><input title='Select Range' "+radioButtonChecked+" name='selected_y_for_detail' class='row_radio_button y_detail_radio_button' type='radio'/></label>";
        ithRowHtml += '<td style="'+borderRightForRadioCell+'text-align:center;" class="'+extraClassForRadioCell+' col_format">'+radioButtonHtml+'</td>';

        if ( i == 0 ) {
            var rotationZLabelHtml = getRotationLabelHtml(Z_DATE_SHORTHAND, /*isWhite=*/false, /*centered=*/true);
            
            var cellBorder = "border-right: 1px solid black";
            var rowBorder = "border-bottom: 1px solid black";
            var zOperationsTableHtml = "<div style='display:inline-block;'><table style='height:500px;margin:10px;'>";
            zOperationsTableHtml += "<tr style='"+rowBorder+"'>";
            zOperationsTableHtml += "<td style='"+cellBorder+"' title='Shorthand label for the operation.' class='tool_tippable_cursor z_op_detail_header_cell'>Label</td>";
            zOperationsTableHtml += "<td style='"+cellBorder+"' title='Operation Type, which affects importance and number of points.' class='tool_tippable_cursor z_op_detail_header_cell'>Type</td>";
            zOperationsTableHtml += "<td style='"+cellBorder+"' title='The starting X-Date. The Z-Value (in days) is added to this X-Date to determine the Z-Date.' class='tool_tippable_cursor z_op_detail_header_cell'>&nbsp;"+getRowShortNameHtml("X", "<i>i</i>&nbsp;")+"</td>";
            zOperationsTableHtml += "<td style='"+cellBorder+"' title='Equation without constants replaced.' class='tool_tippable_cursor z_op_detail_header_cell'>Z-Equation</td>";
            // zOperationsTableHtml += "<td style='"+cellBorder+"' title='The value calculated from the portion of the equation without the starting X-Date.' class='tool_tippable_cursor z_op_detail_header_cell'>Z-Value</td>";
            zOperationsTableHtml += "<td style='"+cellBorder+"' title='The number of Axial Rotation from the starting X-Date to the Z-Date, calculated from the Z-Equation.' class='tool_tippable_cursor z_op_detail_header_cell'>"+rotationZLabelHtml+"</td>";
            zOperationsTableHtml += "<td style='"+""+"' title='The MSRF match, if any, of the days between X and Z.' class='z_op_detail_header_cell'>MSRF</td>";
            zOperationsTableHtml += "</tr>";

            var selectedYStruct = yStructs[results.selected_y_struct_for_details];

            for ( var k = 0; k < selectedYStruct.operation_results.length; k++ ) {
                var kthComputedResult = selectedYStruct.operation_results[k];

                var oShortName = getRowShortNameHtml(OPERATION_SHORTHAND, k);
                var zValueRaw = kthComputedResult.z_value;
                var axialRotationCountZ = kthComputedResult.rotation_count_z;
                // var axialRotationCountZReadable = getZValueReadable(axialRotationCountZ);

                var axialRotationCountZReadable = intToDecimalString(axialRotationCountZ);
                var operationStruct = currentIsoEvent.effective_operations[k];

                var filterMatch = getMsrfMatch(axialRotationCountZ);

                var msrfCssClassName = "";
                var readableMsrfType = "";
                var opTypeAttr = "";

                if ( filterMatch != null ) {
                    msrfCssClassName = filterMatch.css_class;
                    readableMsrfType = filterMatch.readable_name;
                    opTypeAttr = filterMatch.css_class;
                } else {
                    readableMsrfType = "none";
                }

                var x1Ordinal = selectedYStruct.x_1_ordinal;
                var x2Ordinal = selectedYStruct.x_2_ordinal;

                var x1ShortName = getRowShortNameHtml("X", x1Ordinal);
                var x2ShortName = getRowShortNameHtml("X", x2Ordinal);
                
                var startingXShortName = "";
                var xStringToReplaceInEquation = "";
                var startingX = getStartingX(operationStruct);
                if ( startingX == STARTING_X1 ) {
                    startingXShortName = x1ShortName;
                    xStringToReplaceInEquation = "X1";
                } else {
                    startingXShortName = x2ShortName;
                    xStringToReplaceInEquation = "X2";
                }

                var originalEquationWithSubscriptsForX = normalizeOperationEquationString(operationStruct.equation);
                originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X1+", "");
                originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replace("X2+ ", "");
                originalEquationWithSubscriptsForX = originalEquationWithSubscriptsForX.replaceAll(" ", "&nbsp;");

                var cssOperationClassName = isAlphaOperation(operationStruct) ? "operation_alpha" : "operation_beta";
                var operationTypeReadable = isAlphaOperation(operationStruct) ? "Alpha" : "Beta";

                var ithRowBorder = k == ithYStruct.operation_results.length -1 ? "" : rowBorder;
                zOperationsTableHtml += "<tr style='"+ithRowBorder+"'>";
                zOperationsTableHtml += "<td class='z_op_detail_cell z_op_details_label_cell' style='"+cellBorder+"'>"+oShortName+"</td>";
                zOperationsTableHtml += "<td class='z_op_detail_cell "+cssOperationClassName+"' style='"+cellBorder+"'>"+operationTypeReadable+"</td>";
                zOperationsTableHtml += "<td class='z_op_detail_cell z_op_details_label_cell' style='"+cellBorder+"'>"+startingXShortName+"</td>";
                zOperationsTableHtml += "<td class='z_op_detail_cell' style='text-align:left;"+cellBorder+"'>"+originalEquationWithSubscriptsForX+"</td>";
                // zOperationsTableHtml += "<td class='z_op_detail_cell' style='text-align:right;"+cellBorder+"'>"+zResultReadable+"</td>";
                zOperationsTableHtml += "<td class='z_op_detail_cell "+msrfCssClassName+"' style='"+cellBorder+"'>"+axialRotationCountZReadable+"</td>";
                zOperationsTableHtml += "<td class='z_op_detail_cell "+msrfCssClassName+"' >"+readableMsrfType+"</td>";
                zOperationsTableHtml += "</tr>";
            }

            zOperationsTableHtml += "</tr></table></div>";

            ithRowHtml += '<td rowspan="'+yStructs.length+'" style="border-bottom:none; border-left:none; text-align:center;" class="selected_detailed_output_cell col_format">'+zOperationsTableHtml+'</td>';
        }


        var ithNewRow = addOutputRow();
        ithNewRow.innerHTML = ithRowHtml;

        applyToolTipToCssClass("z_op_detail_header_cell");
        applyToolTipToCssClass("y_detail_radio_button");

        var radioButtonElem = ithNewRow.getElementsByClassName("row_radio_button")[0];

        if ( yStructs.length <= 1 ) {
            disableRowButton(radioButtonElem);
        } else {
            enableRowButton(radioButtonElem);
        }

        radioButtonElem.setAttribute("row_index", i);

        radioButtonElem.addEventListener("click", function(jsEvent) {
            var rowIndex = getClickedRowIndex(jsEvent);

            results.selected_y_struct_for_details = rowIndex;

            refreshCurrentPage(REFRESH_TYPE__SOFT, results);
        });
    }
}