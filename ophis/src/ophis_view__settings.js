
function newIsoEventDataTransferObject(elemId, readableName, applyToEvent) {
    return {
        elemId: elemId,
        readableName: readableName,
        applyToEvent: applyToEvent,
        checkboxEnabled: false
    };
}

function newIsoEventSetting(readableName, generateHtml, setUpListeners) {
    return {
        readableName: readableName,
        generateHtml: generateHtml,
        setUpListeners: setUpListeners
    };
}

var ISO_EVENT_DATA_TRANSFER__NAME = newIsoEventDataTransferObject("iso-event-source-name", "Name", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.name = sourceIsoEvent.name;
});
var ISO_EVENT_DATA_TRANSFER__SCOPE = newIsoEventDataTransferObject("iso-event-source-scope", "Scope", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.scope = sourceIsoEvent.scope;
});
var ISO_EVENT_DATA_TRANSFER__LOCATION = newIsoEventDataTransferObject("iso-event-source-location", "Location", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.lat = sourceIsoEvent.lat;
    targetIsoEvent.long = sourceIsoEvent.long;
});
var ISO_EVENT_DATA_TRANSFER__X_DATES = newIsoEventDataTransferObject("iso-event-source-x-dates", "X-Dates", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.x_dates = deepClone(sourceIsoEvent.x_dates);
});
var ISO_EVENT_DATA_TRANSFER__FILTERS = newIsoEventDataTransferObject("iso-event-source-filters", "Filters", function(sourceIsoEvent, targetIsoEvent) {
    for ( var i = 0; i < SERIALIZED_FILTER_FIELDS.length; i++ ) {
        var ithSerializedFilterField = SERIALIZED_FILTER_FIELDS[i];
        targetIsoEvent[ithSerializedFilterField.serializationKey] = sourceIsoEvent[ithSerializedFilterField.serializationKey];

        if ( ithSerializedFilterField.numericDefault != null ) {
            targetIsoEvent[ithSerializedFilterField.serializationKeyForValue] = sourceIsoEvent[ithSerializedFilterField.serializationKeyForValue];
        }
    }
});
var ISO_EVENT_DATA_TRANSFER__T_DATES = newIsoEventDataTransferObject("iso-event-source-t-dates", "T-Dates", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.t_dates = deepClone(sourceIsoEvent.t_dates);
});
var ISO_EVENT_DATA_TRANSFER__OPERATIONS = newIsoEventDataTransferObject("iso-event-source-operations", "Operations", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.operations = deepClone(sourceIsoEvent.operations);
});
var ISO_EVENT_DATA_TRANSFER__CHART_CONFIG = newIsoEventDataTransferObject("iso-event-source-chart-config", "Chart Config", function(sourceIsoEvent, targetIsoEvent) {
    for ( var i = 0; i < SERIALIZED_CHART_OPTION_FIELDS.length; i++ ) {
        var ithChartOptionField = SERIALIZED_CHART_OPTION_FIELDS[i];
        targetIsoEvent[ithChartOptionField.serializationKey] = sourceIsoEvent[ithChartOptionField.serializationKey];
    }
});

var ISO_EVENT_DATA_TRANSFER__NOTES = newIsoEventDataTransferObject("iso-event-source-notes", "Notes", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.notes = sourceIsoEvent.notes;
});

var ISO_EVENT_DATA_TRANSFER__DAY_SCOPE_START_TIME = newIsoEventDataTransferObject("iso-event-source-day-scope-start-time", getRowShortNameHtml("S", 1) + " Start Time", function(sourceIsoEvent, targetIsoEvent) {
    targetIsoEvent.day_scope_start_time_in_millis = sourceIsoEvent.day_scope_start_time_in_millis;
});

var ISO_EVENT_DATA_TRANSFERS = [
    ISO_EVENT_DATA_TRANSFER__NAME,
    ISO_EVENT_DATA_TRANSFER__SCOPE,
    ISO_EVENT_DATA_TRANSFER__LOCATION,
    ISO_EVENT_DATA_TRANSFER__X_DATES,
    ISO_EVENT_DATA_TRANSFER__FILTERS,
    ISO_EVENT_DATA_TRANSFER__T_DATES,
    ISO_EVENT_DATA_TRANSFER__OPERATIONS,
    ISO_EVENT_DATA_TRANSFER__CHART_CONFIG,
    ISO_EVENT_DATA_TRANSFER__NOTES,
    ISO_EVENT_DATA_TRANSFER__DAY_SCOPE_START_TIME
];

var ISO_EVENT_SETTING__X_DATE_OFFSET__DAY_SCOPE = newIsoEventSetting(
    "Day Scope Event Start Time",
    function() {
        var toReturn = "<input tabindex='-1' style='padding-right:5px; text-align:center; width:"+MIN_TIME_FIELD_WIDTH+";' id='event-day-scope-start-time' class='date_input_common general_input'></input>";
        toReturn += "<span>&nbsp;&nbsp;<u>Explanation</u>: Every Operation generates a Z-Value in axial rotations (Days). This Z-value is added to an X-Date to get the final Z-Date. For Day Scope, the default time to which the Z-Value is added, is the very start of the day, i.e. midnight. You can override that behavior with this setting to start at e.g. noon.</span>";
        return toReturn;
    },
    function() {
        var inputElem = document.getElementById("event-day-scope-start-time");
        var lat = 0;
        var long = 0;

        var currentIsoEvent = getCurrentIsoEvent();

        var dayScopeStartTimeInMillis = currentIsoEvent.day_scope_start_time_in_millis ? currentIsoEvent.day_scope_start_time_in_millis : 0;
        var nativeDate = utcMillisToNativeDate(dayScopeStartTimeInMillis);
        var readableTime = nativeDateToReadableString_timeOnly(nativeDate, lat, long);

        inputElem.value = readableTime;

        var flatPickrConfig = FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY();
        flatPickrConfig.defaultDate = readableTime;

        function fallbackDateString(inputElemForCallback) {

            var currentIsoEvent = getCurrentIsoEvent();
            var dayScopeStartTimeInMillis = currentIsoEvent.day_scope_start_time_in_millis ? currentIsoEvent.day_scope_start_time_in_millis : 0;
            var nativeDate = utcMillisToNativeDate(dayScopeStartTimeInMillis);
            var readableTime = nativeDateToReadableString_timeOnly(nativeDate, lat, long);

            return readableTime;
        }

        function onValidDateEntered(inputElemForCallback, parsedNativeDate, xDate) {

            var currentIsoEvent = getCurrentIsoEvent();

            // This value will be midnight of current browser's timezone.
            var parsedNativeDate_millis = nativeDateToUtcMillis(parsedNativeDate);

            currentIsoEvent.day_scope_start_time_in_millis = parsedNativeDate_millis;

            flushChangesToDisk();

            var preserveScrollPosition = false;
            refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
        }

        var nullTimeZone = null;
        var timeOnly = true;
        setUpDateInput(flatPickrConfig, inputElem, EVENT_SCOPE__HH_MM, nullTimeZone, fallbackDateString, onValidDateEntered, timeOnly);

        flatpickr(inputElem, flatPickrConfig);

        // Seems like a bug in flatpickr, that it's still showing the calendar and not just the time.
        // Configuration into flatpickr should result in just time based on examples but something's off.
        // So just manually hide the calendar-related elements.
        if ( inputElem._flatpickr ) {
            if ( inputElem._flatpickr.innerContainer ) {
                inputElem._flatpickr.innerContainer.style.display = "none";
            }

            if ( inputElem._flatpickr.monthNav ) {
                inputElem._flatpickr.monthNav.style.display = "none";
            }
        }
    }
);


var ISO_EVENT_SETTING__NOTES = newIsoEventSetting(
    "Misc. Notes",
    function() {
        return "<textarea class='text_area' style='resize:none;' rows=10 id='event-notes-text-area' placeholder='Write down anything about this event that may be relevant to the input or output. These notes are for personal use only and do not affect results.'></textarea>";
    },
    function() {
        var textAreaElem = document.getElementById("event-notes-text-area");

        var currentIsoEvent = getCurrentIsoEvent();

        textAreaElem.value = currentIsoEvent.notes;

        textAreaElem.addEventListener("change", function() {
            currentIsoEvent.notes = this.value;

            flushChangesToDisk();
        });
    }
);

var ISO_EVENT_SETTINGS = [
    ISO_EVENT_SETTING__NOTES,
    ISO_EVENT_SETTING__X_DATE_OFFSET__DAY_SCOPE
];


function refreshIsoEventSwapRows() {

    var isoEvents = appState.isoEvents;

    if ( isoEvents.length <= 1 ) {
        refreshIsoEventSwapApplyButton();

        return;
    }

    var operationRows = document.getElementsByClassName("iso_event_swap_row");
    var rowLimit = Math.max(operationRows.length, ISO_EVENT_DATA_TRANSFERS.length);

    var atLeastOneEventCheckedForSwapSource = isAtLeastOneEventCheckedForSwapSource();

    var allEventSourceElems = document.getElementsByClassName("event_name_source");
    var allEventTargetElems = document.getElementsByClassName("event_name_target");

    for ( var i = 0; i < rowLimit; i++ ) {

        var ithIsoEvent = isoEvents[i];
        var ithSetting = ISO_EVENT_DATA_TRANSFERS[i];
        var existingRow = operationRows[i];

        if ( ithIsoEvent ) {
            var ithSource = allEventSourceElems[i];
            var ithTarget = allEventTargetElems[i];

            ithSource.style.maxWidth = "1px";
            ithTarget.style.maxWidth = "1px";
            
            var swapCheckbox = existingRow.getElementsByClassName("iso_event_swap_checkbox")[0];
            var radioButton = existingRow.getElementsByClassName("row_radio_button_for_swap")[0];
            var eventSwapTargetCells = existingRow.getElementsByClassName("event_swap_target_cell");

            var checkTheRadioButton = ithIsoEvent.checked_for_swap_source === true || atLeastOneEventCheckedForSwapSource === false && i == 0;
            if ( checkTheRadioButton ) {
                radioButton.checked = true;
                ithIsoEvent.checked_for_swap_source = true;
            } else {
                radioButton.checked = false;
                ithIsoEvent.checked_for_swap_source = false;
            }

            if ( radioButton.checked ) {
                disableRowButton(swapCheckbox);
                swapCheckbox.checked = false;
                ithIsoEvent.checked_for_swap_target = false;

                for ( var k = 0; k < eventSwapTargetCells.length; k++ ) {
                    var kthTargetCell = eventSwapTargetCells[k];
                    kthTargetCell.style.opacity = OPACITY__DISABLED;
                }

                swapCheckbox.style.opacity = OPACITY__ENABLED; // Make it so opacity disabled doesn't double up.
                
            } else {
                enableRowButton(swapCheckbox);
                swapCheckbox.checked = ithIsoEvent.checked_for_swap_target;

                for ( var k = 0; k < eventSwapTargetCells.length; k++ ) {
                    var kthTargetCell = eventSwapTargetCells[k];
                    kthTargetCell.style.opacity = OPACITY__ENABLED;
                }
            }
        }
        
        if ( ithSetting ) {
            var swapSettingCheckbox = existingRow.getElementsByClassName("iso_event_swap_setting_checkbox")[0];
            swapSettingCheckbox.checked = ithSetting.checkboxEnabled;
        }
    }

    refreshIsoEventSwapApplyButton();

    refreshIsoEventSwapMaxWidths();
}

function refreshIsoEventSwapMaxWidths() {
    var headerElem = document.getElementById("event-source-header");
    var headerElemWidth = headerElem.clientWidth;
    headerElemWidth -= 15;
    var allEventSourceElems = document.getElementsByClassName("event_name_source");
    var allEventTargetElems = document.getElementsByClassName("event_name_target");

    for ( var i = 0; i < allEventSourceElems.length; i++ ) {
        var ithSource = allEventSourceElems[i];
        var ithTarget = allEventTargetElems[i];

        ithSource.style.maxWidth = headerElemWidth + "px";
        ithTarget.style.maxWidth = headerElemWidth + "px";
    }
}

function isAtLeastOneEventCheckedForSwapSource() {
    var isoEvents = appState.isoEvents;

    for ( var i = 0; i < isoEvents.length; i++ ) {
        var ithIsoEvent = isoEvents[i];

        if ( ithIsoEvent.checked_for_swap_source === true ) {
            return true;
        }
    }

    return false;
}

function refreshIsoEventSwapApplyButton() {
    var applySwapButton = document.getElementById("apply-event-swap-button");
    var isoEvents = appState.isoEvents;

    var atLeastOneEventChecked = false;

    if ( isoEvents.length >= 1 ) {
        for ( var i = 0; i < isoEvents.length; i++ ) {
            var ithIsoEvent = isoEvents[i];

            if ( ithIsoEvent.checked_for_swap_target === true ) {
                atLeastOneEventChecked = true;
                break;
            }
        }
    }

    var atLeastOneDataTypeChecked = false;

    for ( var k = 0; k < ISO_EVENT_DATA_TRANSFERS.length; k++ ) {
        var ithSetting = ISO_EVENT_DATA_TRANSFERS[k];

        if ( ithSetting.checkboxEnabled === true ) {
            atLeastOneDataTypeChecked = true;
            break;
        }
    }

    if ( atLeastOneEventChecked && atLeastOneDataTypeChecked ) {
        enableRowButton(applySwapButton);
    } else {
        disableRowButton(applySwapButton);
    }
}

function renderIsoEventDataTransfer() {

    var outputContainer = getOutputContainer();

    var helpButton = '<button id="event-swap-help-button" style="" title="" class="square_button add_button large_font bordered small_border_radius">?</button>';
    var applySwapButtonHtml = '<button tabindex="-1" id="apply-event-swap-button" title="Apply the choices below." style="margin-left:5px;" class="operation_click_element add_button large_font bordered small_border_radius">Apply</button>';
    // var resetOperationButtonHtml = '<button tabindex="-1" id="reset-operations-button" title="Clear all operations for this event and start fresh." style="margin-left:5px;" class="operation_click_element add_button large_font bordered small_border_radius">Reset</button>';

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = helpButton + applySwapButtonHtml;

    document.getElementById("event-swap-help-button").addEventListener("click", function() {
        var message = "";
        message += HELP_MESSAGE__EVENT_SWAP;

        showOkDialog(message);
    });

    var applySwapButton = document.getElementById("apply-event-swap-button");

    applyToolTip(applySwapButton);

    applySwapButton.addEventListener("click", function() {
        showDialog("Are you sure you want to apply the changes?", "NO, keep Iso-Events as they are", "YES, apply the changes", function() {

            var currentIsoEvent = getCurrentIsoEvent();

            var sourceEvent = null;
            var targetEvents = [];
            
            var isCurrentIsoEventOneOfTheTargets = false;

            for ( var k = 0; k < isoEvents.length; k++ ) {
                var kthIsoEvent = isoEvents[k];

                if ( kthIsoEvent.checked_for_swap_source === true ) {
                    sourceEvent = kthIsoEvent;
                } else {
                    if ( kthIsoEvent.checked_for_swap_target === true ) {
                        if ( kthIsoEvent == currentIsoEvent ) {
                            isCurrentIsoEventOneOfTheTargets = true;
                        }

                        targetEvents.push(kthIsoEvent);
                    }
                }
            }

            var selectedSettings = [];

            for ( var k = 0; k < ISO_EVENT_DATA_TRANSFERS.length; k++ ) {
                var ithSetting = ISO_EVENT_DATA_TRANSFERS[k];

                if ( ithSetting.checkboxEnabled === true ) {
                    selectedSettings.push(ithSetting);
                }
            }

            if( sourceEvent && targetEvents.length > 0 && selectedSettings.length > 0 ) {

                for ( var i = 0; i < targetEvents.length; i++ ) {
                    var ithTargetEvent = targetEvents[i];

                    for ( var k = 0; k < selectedSettings.length; k++ ) {
                        var ithSetting = selectedSettings[k];

                        ithSetting.applyToEvent(sourceEvent, ithTargetEvent);
                    }
                }

                // Clear out any lat/long that may have been applied to non-HH-MM events.
                for ( var i = 0; i < targetEvents.length; i++ ) {
                    var ithTargetEvent = targetEvents[i];
                    
                    if ( ithTargetEvent.scope != EVENT_SCOPE__HH_MM ) {
                        toggleIsoEventLocationEnabled(ithTargetEvent, false)
                    }
                }

                markChangesSaved();

                refreshIsoEvents(REFRESH_TYPE__HARD, isCurrentIsoEventOneOfTheTargets ? OPHIS_INPUT_CHANGE__CHANGED : OPHIS_INPUT_CHANGE__NO_CHANGE);

                flushChangesToDisk();
            } else {
                console.warn("Unselected source and/or target events and/or settings.");
            }
        }, function() {
            // Refresh screen just in case we clicked "Reset" while focused on an input element that needs re-validation.
            // TODO: Wouldn't that mean that all dialog actions would have to account for this? I forget exactly what the JavaScript event flow is here.
            refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
        });
    });

    var isoEvents = appState.isoEvents;

    var headerRow = addOutputRow();

    if ( appState.isoEvents.length == 1 ) {
        headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;">Error</td>';
    } else {
        var sourceEventTitle = "The Iso-Event to copy Settings from.";
        var settingTitle = "The individual Setting to copy.";
        var destinationEventsTitle = "The Iso-Events that receive the Settings from the select Iso-Event to the left.";

        var headerRowHtml = '';
        headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
        headerRowHtml += '<td id="event-source-header" title="'+sourceEventTitle+'" style="width:50%; white-space:nowrap;" class="event_source_header col_sub_header_format tool_tippable_cursor">Source Event</td>';
        headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';

        headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
        headerRowHtml += '<td title="'+settingTitle+'" style="width:0%; white-space:nowrap;" class="event_setting_header col_sub_header_format tool_tippable_cursor">Data</td>';
        headerRowHtml += '<td id="iso-event-swap-setting-checkbox-header" class="col_sub_header_format" title="" style="width:0%;"></td>';

        headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
        headerRowHtml += '<td title="'+destinationEventsTitle+'" style="width:50%; white-space:nowrap;" class="event_target_header col_sub_header_format tool_tippable_cursor">Target Events</td>';
        headerRowHtml += '<td id="iso-event-swap-checkbox-header" class="col_sub_header_format" title="" style="width:0%;"></td>';
        
        headerRow.innerHTML = headerRowHtml;
    }

    if ( isoEvents.length <= 1 ) {
        var newRow = outputContainer.insertRow(-1);
        newRow.classList.add("iso_event_swap_row");
        newRow.innerHTML = "<td class='col_format' colspan='1'><div class='col_output_text error_color panel_error_text'>This screen is for copying various Settings from one Iso-Event to others. Therefore at least two Iso-Events must be created for this screen to have a function.</div></td>";
    } else {
        var rowLimit = Math.max(isoEvents.length, ISO_EVENT_DATA_TRANSFERS.length);

        for ( var i = 0; i < rowLimit; i++ ) {
            var ithIsoEvent = isoEvents[i];
            var ithSetting = ISO_EVENT_DATA_TRANSFERS[i];

            var shortRowNameForEvent = getRowShortNameHtml("E", i);
            var shortRowNameForSetting = getRowShortNameHtml("D", i);

            var radioButtonChecked = i == 0 ? "checked" : "";

            var newRowHtml = "";

            if ( ithIsoEvent ) {
                newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'>"+shortRowNameForEvent+"</div></td>";
                newRowHtml += "<td style='width:50%; text-align:left;' class='col_format col_with_input_left_right_padding'><div class='event_name_source'>"+ithIsoEvent.name+"</div></td>";
                newRowHtml += "<td style='width:0%;' class='col_format'><label style='cursor:pointer;' class='row_radio_button_for_swap_label'><input style='cursor:pointer;' tabindex='-1' title='Select Event as Source' "+radioButtonChecked+" name='selected_iso_event_for_swap' class='row_radio_button_for_swap' type='radio'/></label></td>";
            } else {
                newRowHtml += "<td class='empty_event_swap_cell'></td><td class='empty_event_swap_cell'></td><td class='empty_event_swap_cell'></td>";
            }

            if ( ithSetting ) {
                newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'>"+shortRowNameForSetting+"</div></td>";
                newRowHtml += "<td style='width:0%; text-align:left;' class='col_format col_with_input_left_right_padding'><div style='white-space:nowrap;' class='event_name_destination'>"+ithSetting.readableName+"</div></td>";
                var checkboxHtml = '<input tabindex="-1" type="checkbox" style="" class="operation_click_element iso_event_swap_setting_checkbox" tabindex="-1" title="Enable/Disable this Setting">';
                newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'><div style='padding-left:5px;padding-right:5px;' class=''>"+checkboxHtml+"</div></td>";
            } else {
                newRowHtml += "<td class='empty_event_swap_cell'></td><td class='empty_event_swap_cell'></td><td class='empty_event_swap_cell'></td>";
            }
            
            if ( ithIsoEvent ) {
                newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name event_swap_target_cell'>"+shortRowNameForEvent+"</div></td>";
                newRowHtml += "<td style='width:50%; text-align:left;' class='col_format col_with_input_left_right_padding event_swap_target_cell'><div class='event_name_target'>"+ithIsoEvent.name+"</div></td>";
                var checkboxHtml = '<input tabindex="-1" type="checkbox" style="" class="operation_click_element iso_event_swap_checkbox " tabindex="-1" title="Enable/Disable this Iso-Event as a target for the changes.">';
                newRowHtml += "<td style='width:0%; text-align:center;' class='col_format event_swap_target_cell'><div style='padding-left:5px;padding-right:5px;' class=''>"+checkboxHtml+"</div></td>";
            } else {
                 newRowHtml += "<td class='empty_event_swap_cell'></td><td class='empty_event_swap_cell'></td><td class='empty_event_swap_cell'></td>";
            }

            var newRow = outputContainer.insertRow(-1);
            newRow.classList.add("iso_event_swap_row");
            newRow.innerHTML = newRowHtml;

            var swapCheckbox = newRow.getElementsByClassName("iso_event_swap_checkbox")[0];
            var swapSettingCheckbox = newRow.getElementsByClassName("iso_event_swap_setting_checkbox")[0];


            if ( swapCheckbox ) {

                var radioButtonElem = newRow.getElementsByClassName("row_radio_button_for_swap")[0];
                radioButtonElem.addEventListener("click", function(jsEvent) {

                    var isoEvents = appState.isoEvents;
                    var rowIndex = getClickedRowIndex(jsEvent);

                    var allOtherEventsWereChecked = true;
                    var previousIsoEventThatWasSource = null;

                    for ( var k = 0; k < isoEvents.length; k++ ) {
                        var kthIsoEvent = isoEvents[k];

                        if ( kthIsoEvent.checked_for_swap_source === true ) {
                            previousIsoEventThatWasSource = kthIsoEvent;
                        } else {
                            if ( kthIsoEvent.checked_for_swap_target === true ) {
                                // continue on.
                            } else {
                                allOtherEventsWereChecked = false;
                            }
                        }
                    }

                    if ( allOtherEventsWereChecked === true && previousIsoEventThatWasSource ) {
                        previousIsoEventThatWasSource.checked_for_swap_target = true;
                    }

                    for ( var k = 0; k < isoEvents.length; k++ ) {
                        var kthIsoEvent = isoEvents[k];

                        if ( k == rowIndex ) {
                            kthIsoEvent.checked_for_swap_source = true;
                        } else {
                            kthIsoEvent.checked_for_swap_source = false;
                        }
                    }

                    
                    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.onChildNowCheckedOrNot(rowIndex, false);
                    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.onMasterCheckboxChangeComplete();
                    refreshIsoEventSwapRows();
                });
                
                applyToolTip(swapCheckbox);

                swapCheckbox.setAttribute("row_index", i);
                radioButtonElem.setAttribute("row_index", i);

                swapCheckbox.addEventListener("change", function(jsEvent) {
                    var shouldNowBeEnabled = this.checked;

                    var rowIndex = getClickedRowIndex(jsEvent);
                    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.onChildNowCheckedOrNot(rowIndex, shouldNowBeEnabled);
                    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.onMasterCheckboxChangeComplete();
                });
            }

            if ( swapSettingCheckbox ) {
                applyToolTip(swapSettingCheckbox);

                swapSettingCheckbox.setAttribute("row_index", i);

                swapSettingCheckbox.addEventListener("change", function(jsEvent) {
                    var shouldNowBeEnabled = this.checked;

                    var rowIndex = getClickedRowIndex(jsEvent);
                    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING.onChildNowCheckedOrNot(rowIndex, shouldNowBeEnabled);
                    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING.onMasterCheckboxChangeComplete();
                });
            }

            // if ( currentIsoEvent.operations.length <= MINIMUM_OPERATIONS_REQUIRED && i < MINIMUM_OPERATIONS_REQUIRED ) {
            //     disableRowButton(deleteButtonElem);
            // } else {
            //     enableRowButton(deleteButtonElem);
            // }
        }
    }

    applyToolTipToCssClass("tool_tippable_cursor");

    setUpMasterCheckbox(MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP);
    setUpMasterCheckbox(MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING);

    refreshIsoEventSwapRows();
}

function refreshOperationRows() {
    var currentIsoEvent = getCurrentIsoEvent();
    var operations = currentIsoEvent.operations;

    var operationRows = document.getElementsByClassName("operation_row");
    
    for ( var i = 0; i < operations.length; i++ ) {
        var ithOperation = operations[i];

        var operationResult = "";
        var operationResultShortened = "";

        var operationValidationErrors = [];
        var operationFunction = validateOperationString(ithOperation.equation, i, operations, operationValidationErrors);
        var isOperationValid = operationValidationErrors.length <= 0;

        var resultClass = "";
        if ( isOperationValid === false ) {
            var firstError = operationValidationErrors[0];

            operationResult = "Error: " + firstError;
            operationResultShortened = "Error";

            resultClass = "error_color help_cursor";
        } else {
            var zValue = runOperationFunction(operationFunction, SAMPLE_Y_VALUE_FOR_VALIDATION);
            operationResult = operationResultShortened = "Z=" + zValue;

            resultClass = "green_color";
        }

        var shortRowName = getRowShortNameHtml("O", i);

        var newRow = operationRows[i];

        var inputRowName = newRow.getElementsByClassName("input_row_name")[0];
        var inputEquationElem = newRow.getElementsByClassName("operation_equation_input")[0];
        var inputWeightElem = newRow.getElementsByClassName("operation_weight_input")[0];
        var deleteButtonElem = newRow.getElementsByClassName("row_delete_button")[0];
        var insertButtonElem = newRow.getElementsByClassName("row_insert_button")[0];
        var operationCheckboxElem = newRow.getElementsByClassName("operation_checkbox")[0];
        var operationValidationResultElem = newRow.getElementsByClassName("operation_validation_result")[0];

        operationValidationResultElem.className = "operation_validation_result "+resultClass;

        inputRowName.innerHTML = shortRowName;

        inputEquationElem.title = ithOperation.equation;
        inputEquationElem.value = ithOperation.equation;

        inputWeightElem.value = ithOperation.weight;

        if ( isOperationValid === true ) {
            // No tooltip needed.
        } else {
            operationValidationResultElem.title = operationResult;
        }

        operationValidationResultElem.innerHTML = operationResultShortened;

        operationCheckboxElem.checked = ithOperation.enabled === true ? true : false;
    }
}

function renderOperations() {

    var currentIsoEvent = getCurrentIsoEvent();
    var outputContainer = getOutputContainer();

    var currentIsoEventShortName = getRowShortNameHtml("E", appState.globalOptions.current_iso_event_index);

    var addOperationButtonHtml = '<button tabindex="-1" id="add-operation-button" title="Add new operation to end of list." style="margin-left:5px;" class="operation_click_element add_button large_font bordered small_border_radius">Add</button>';
    var resetOperationButtonHtml = '<button tabindex="-1" id="reset-operations-button" title="Clear all operations for this event and start fresh." style="margin-left:5px;" class="operation_click_element add_button large_font bordered small_border_radius">Reset</button>';

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = currentIsoEventShortName + " Operations" + addOperationButtonHtml + resetOperationButtonHtml;

    var resetOperationsButton = document.getElementById("reset-operations-button");

    resetOperationsButton.addEventListener("click", function() {
        showDialog("Are you sure you want to reset all Operations to the default for this Iso-Event?", "NO, keep existing Operations", "YES, reset Operations to default", function() {
            var currentIsoEvent = getCurrentIsoEvent();

            currentIsoEvent.operations = cloneDefaultOperationsForAppVersionGte10();

            markChangesSaved();

            var preserveScrollPosition = false;
            refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);

            recenterChart();

            flushChangesToDisk();
        }, function() {
            var preserveScrollPosition = false;
            
            // Refresh screen just in case we clicked "Reset" while focused on an input element that needs re-validation.
            // TODO: Wouldn't that mean that all dialog actions would have to account for this? I forget exactly what the JavaScript event flow is here.
            refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
        });
    });

    var addOperationButton = document.getElementById("add-operation-button");

    if ( addOperationButton ) {
        addOperationButton.addEventListener("click", function(event) {
            addOperation(getCurrentIsoEvent());
            scrollPanelToBottom(getOutputContainer());
        });
    }

    var specialConstantsAndFunctions = "";

    
    for ( var i = 0; i < ALL_OPH_CONSTANTS.length; i++ ) {
        var ithOphConstant = ALL_OPH_CONSTANTS[i];
        specialConstantsAndFunctions += ithOphConstant + ", ";
    }

    for ( var i = 0; i < ALL_OPH_FUNCTIONS.length; i++ ) {
        var ithOphFunction = ALL_OPH_FUNCTIONS[i];

        specialConstantsAndFunctions += ithOphFunction.name + "(x)";

        if ( i < ALL_OPH_FUNCTIONS.length-1 ) {
            specialConstantsAndFunctions += ", ";
        }
    }


     var headerRow = addOutputRow();

    if ( currentIsoEvent.operations.length == 0 ) {
        headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;">Error</td>';
    } else {
        var equationTitle = "Equation must start with \'X1 +\' or \'X2 +\' and must resolve to a positive number. It should also include the variable \'Y\' which represents the number of days between two X-Dates. Special constants and functions are allowed:<br>" + specialConstantsAndFunctions;
        var weightTitle = "This is how many points an individual Operation will contribute to the overall Score. Weight >= 1 is considered an Alpha Operation, otherwise Beta.";

        var headerRowHtml = '';
        headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
        headerRowHtml += '<td title="'+equationTitle+'" style="width:100%; white-space:nowrap; padding:0px;" class="equation_header col_sub_header_format tool_tippable_cursor">Equation</td>';
        headerRowHtml += '<td style="width:0%; white-space:nowrap;" class="col_sub_header_format">If Y='+SAMPLE_Y_VALUE_FOR_VALIDATION+'&hellip;</td>';
        headerRowHtml += '<td title="'+weightTitle+'" style="width:0%; white-space:nowrap;" class="col_sub_header_format tool_tippable_cursor">Weight</td>';
        headerRowHtml += '<td id="operation-checkbox-header" class="col_sub_header_format" title="" style="width:0%;"></td>';
        headerRowHtml += "<td id='delete-all-operations-button-header' class='col_sub_header_format' title='' style='width:0%;'><div id='delete-all-operations-button' title='Delete all Operations' style='padding:0px;' class='row_delete_button_master'>&#10006;</div></td>";
        headerRowHtml += '<td style="width:0%; white-space:nowrap; padding:0px; background-color:white;" colspan="1" class="col_sub_header_format"></td>';
        
        headerRow.innerHTML = headerRowHtml;

        var deleteAllOperationsButton = document.getElementById("delete-all-operations-button");

        enableRowButton(deleteAllOperationsButton);

        deleteAllOperationsButton.addEventListener("click", function() {
            showDialog("Are you sure you want to delete all Operations for this Iso-Event?", "NO, keep existing Operations", "YES, delete all Operations", function() {
                var currentIsoEvent = getCurrentIsoEvent();

                currentIsoEvent.operations = [];

                markChangesSaved();

                var preserveScrollPosition = false;
                refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);

                recenterChart();

                flushChangesToDisk();
            }, function() {
                var preserveScrollPosition = false;
                
                // Refresh screen just in case we clicked "Reset" while focused on an input element that needs re-validation.
                // TODO: Wouldn't that mean that all dialog actions would have to account for this? I forget exactly what the JavaScript event flow is here.
                refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
            });
        });
    }

    function onEquationInputUpdate(event) {
        // This used to be an input element, presumably to prevent a double-screen refresh if 
        // e.g. focused on an Operation Equation, then clicking "Add" a new Operation. The "Add"
        // would be enough and would refresh the screen just once. However upon auditing and testing
        // this much later, that doesn't seem like a robust approach, and appears to be a bug even.
        // Much safer to just swallow the occasional double-refresh. Especially since now it won't run
        // all the Ophis operations again, since that optimization is now in place, if not on the Z-Date screen.
        var flushChanges = true;
        // console.log("flushChanges=" + flushChanges);

        var rowIndex = getClickedRowIndex(event);
        var targetElem = getEventTargetElem(event);

        if ( currentIsoEvent.operations[rowIndex].equation != targetElem.value ) {
            currentIsoEvent.operations[rowIndex].equation = targetElem.value;
            targetElem.title = targetElem.value;

            if ( flushChanges === true ) {
                flushChangesToDisk();

                var preserveScrollPosition = false;
                refreshXDates(REFRESH_TYPE__RIGHT_PANEL_ONLY, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
            }
        }
    }

    function onWeightInputUpdate(event, flushChanges = true) {
        var rowIndex = getClickedRowIndex(event);
        var targetElem = getEventTargetElem(event);

        var parsedFloat = parseFloatString(targetElem.value, 0, "");

        if ( parsedFloat == null || parsedFloat <= 0 ) {
            parsedFloat = POINTS__BETA_OPERATION_MATCH;
        }

        if ( currentIsoEvent.operations[rowIndex].weight != parsedFloat ) {
            currentIsoEvent.operations[rowIndex].weight = parsedFloat;
            // targetElem.title = parsedFloat

            if ( flushChanges === true ) {
                flushChangesToDisk();

                var preserveScrollPosition = false;
                refreshXDates(REFRESH_TYPE__RIGHT_PANEL_ONLY, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
            }
        }
    }

    var operations = currentIsoEvent.operations;

    if ( operations.length == 0 ) {
        var newRow = outputContainer.insertRow(-1);
        newRow.classList.add("operation_row");
        newRow.innerHTML = "<td class='col_format' colspan='1'><div class='col_output_text error_color panel_error_text'>An Iso-Event requires at least one Operation. Click the Add Button above to remedy that.</div></td>";
    } else {
        for ( var i = 0; i < operations.length; i++ ) {
            var ithOperation = operations[i];

            var insertButtonTopOffset = "";
            var insertButtonHtml = "<img tabindex='-1' style='"+insertButtonTopOffset+"' class='operation_click_element row_insert_button' src='./img/left_arrow.png' title='Insert New Operation here.'/>";

            var newRowHtml = "";
            newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'></div></td>";
            newRowHtml += "<td style='width:33.33%; text-align:left;' class='col_format col_with_input_left_right_padding'><input id='equation-input-"+i+"' tabindex='-1' type='text' value='' style='width:100%; text-align:left;' class='operation_text_input operation_equation_input general_input'></input></td>";
            newRowHtml += "<td style='width:0%; text-align:left;' class='col_format col_with_input_left_right_padding'><div class='operation_validation_result'></div></td>";
            
            newRowHtml += "<td style='width:0%; text-align:left;' class='col_format col_with_input_left_right_padding'><input id='weight-input-"+i+"' tabindex='-1' value='' style='text-align:left; width:100%;' class='operation_text_input operation_weight_input general_input'></input></td>";
        
            var checkboxHtml = '<input tabindex="-1" type="checkbox" style="" class="operation_click_element operation_checkbox" tabindex="-1" title="Enable/Disable this Operation">';
            newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'><div style='padding-left:5px;padding-right:5px;' class=''>"+checkboxHtml+"</div></td>";
            newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'><div tabindex='-1' style='padding-left:5px;padding-right:5px;' title='Delete This Operation' class='operation_click_element row_delete_button'>&#10006;</div></td>";
            newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'>"+insertButtonHtml+"</td>";

            var newRow = outputContainer.insertRow(-1);
            newRow.classList.add("operation_row");
            newRow.innerHTML = newRowHtml;

            var inputEquationElem = newRow.getElementsByClassName("operation_equation_input")[0];
            var inputWeightElem = newRow.getElementsByClassName("operation_weight_input")[0];
            var deleteButtonElem = newRow.getElementsByClassName("row_delete_button")[0];
            var insertButtonElem = newRow.getElementsByClassName("row_insert_button")[0];
            var operationCheckboxElem = newRow.getElementsByClassName("operation_checkbox")[0];
            var operationValidationResultElem = newRow.getElementsByClassName("operation_validation_result")[0];

            inputEquationElem.addEventListener("keydown", function(event) {
                removeAllDisplayedToolTips();

                if ( event.which == KEY_CODE__ENTER || isEscapeKey(event) ) {
                    this.blur();
                } else if (event.key === 'Tab') {
                    event.preventDefault();
                    event.stopPropagation();

                    var thisOperationInput = getEventTargetElem(event);
                    var allOperationInputs = document.getElementsByClassName("operation_equation_input");

                    for ( var i = 0; i < allOperationInputs.length; i++ ) {
                        var ithOperationInput = allOperationInputs[i];
                        
                        if ( thisOperationInput == ithOperationInput ) {
                            if ( i < allOperationInputs.length-1 ) {
                                focusOphisInput(allOperationInputs[i+1]);
                            } else {
                                var allWeightInputs = document.getElementsByClassName("operation_weight_input");
                                focusOphisInput(allWeightInputs[0]);
                            }
                        }
                    }
                }
            });

            inputEquationElem.addEventListener("focus", function(event) {
                removeAllDisplayedToolTips();
            });

            function getFollowOnFlusher(event) {
                var followOnFlusher = null;

                if ( event.relatedTarget ) {
                    if ( event.relatedTarget.classList.contains("operation_click_element") ) {
                        // The subsequent click() will take care of flushing changes.
                        followOnFlusher = event.relatedTarget;
                    } else if ( event.relatedTarget.classList.contains("operation_equation_input") ) {
                        followOnFlusher = event.relatedTarget;
                    }
                }

                return followOnFlusher;
            }

            inputEquationElem.addEventListener('blur',function(event) {

                // See comment in onEquationInputUpdate() for why this isn't used anymore.
                var followOnFlusher = getFollowOnFlusher(event);
                var flushChanges = followOnFlusher == null;

                onEquationInputUpdate(event, );
            });


            inputWeightElem.addEventListener("focus", function(event) {
                removeAllDisplayedToolTips();
            });

            inputWeightElem.addEventListener("keydown", function(event) {
                removeAllDisplayedToolTips();

                if ( event.which == KEY_CODE__ENTER || isEscapeKey(event) ) {
                    this.blur();
                } else if (event.key === 'Tab') {
                    event.preventDefault();
                    event.stopPropagation();

                    var thisWeightInput = getEventTargetElem(event);
                    var allWeightInputs = document.getElementsByClassName("operation_weight_input");

                    for ( var i = 0; i < allWeightInputs.length; i++ ) {
                        var ithWeightInput = allWeightInputs[i];
                        
                        if ( thisWeightInput == ithWeightInput ) {
                            if ( i < allWeightInputs.length-1 ) {
                                focusOphisInput(allWeightInputs[i+1]);
                            } else {
                                var allNameInputs = document.getElementsByClassName("iso_event_name_input");
                                focusOphisInput(allNameInputs[0]);
                            }
                        }
                    }
                }
            });

            inputWeightElem.addEventListener('blur',function(event) {
                var followOnFlusher = getFollowOnFlusher(event);

                onWeightInputUpdate(event, followOnFlusher == null);
            });

            applyToolTip(inputEquationElem);
            applyToolTip(deleteButtonElem);
            applyToolTip(insertButtonElem);
            applyToolTip(operationCheckboxElem);
            applyToolTip(operationValidationResultElem);

            deleteButtonElem.setAttribute("row_index", i);
            inputEquationElem.setAttribute("row_index", i);
            inputWeightElem.setAttribute("row_index", i);
            insertButtonElem.setAttribute("row_index", i);
            operationCheckboxElem.setAttribute("row_index", i);

            operationCheckboxElem.addEventListener("change", function(event) {
                var shouldNowBeEnabled = this.checked;

                var rowIndex = getClickedRowIndex(event);
                MASTER_CHECKBOX_CONFIG__OPERATIONS.onChildNowCheckedOrNot(rowIndex, shouldNowBeEnabled);
                MASTER_CHECKBOX_CONFIG__OPERATIONS.onMasterCheckboxChangeComplete();
            });

            // if ( currentIsoEvent.operations.length <= MINIMUM_OPERATIONS_REQUIRED && i < MINIMUM_OPERATIONS_REQUIRED ) {
            //     disableRowButton(deleteButtonElem);
            // } else {
            //     enableRowButton(deleteButtonElem);
            // }

            enableRowButton(deleteButtonElem);

            insertButtonElem.addEventListener("click", function(event) {
                var rowIndex = getClickedRowIndex(event);
                
                addOperation(getCurrentIsoEvent(), rowIndex);
            });

            deleteButtonElem.addEventListener("click", function(event) {
                var rowIndex = getClickedRowIndex(event);

                currentIsoEvent.operations.splice(rowIndex, 1);

                flushChangesToDisk();

                var preserveScrollPosition = false;
                refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
            });
        }
    }

    applyToolTipToCssClass("tool_tippable_cursor");

    setUpMasterCheckbox(MASTER_CHECKBOX_CONFIG__OPERATIONS);

    refreshOperationRows();
}