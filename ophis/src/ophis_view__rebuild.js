

// Need to call this stupid function as its called, cause otherwise, with enough iso events to cause a scroll,
// the overall panel/table layout can get messed up, with the filter panel overlapping the event panel.
function setOverflowOnScrollContainers(overflow) {
    var scrollableContainers = document.getElementsByClassName("scrollable_container");

    for ( var i = 0; i < scrollableContainers.length; i++ ) {
        if ( i == 0 ) {
            scrollableContainers[i].style.overflowY = overflow;
        } else {
            scrollableContainers[i].style.overflowY = "auto";
        }
    }

    setPanelMaxDimensions();
}

function setPanelMaxDimensions() {

    var windowHeight = document.body.clientHeight; // force layout again, I think.

    var isoEventFilterContainer = document.getElementById("iso-event-filter-container");
    var panelContainerTopRow = document.getElementById("panel-container-top-row");
    var sampleColHeaderBackground = document.getElementsByClassName("col_header_background")[0];
    var chartContainer = document.getElementsByClassName("chart_container")[0];
    var chartOptionsContainer = document.getElementsByClassName("chart_options_scrollable_container")[0];
    var scrollableContainers = document.getElementsByClassName("scrollable_container");

    var outputContainer = document.getElementById("output-container");
    var outputContainerWrapper = document.getElementById("scrollable-container-for-output-container");

    var isoEventFilterContainerHeight = isoEventFilterContainer.clientHeight;
    var colHeaderHeight = sampleColHeaderBackground.clientHeight;
    var borderSpacing = 1.5;

    var tDateScrollContainer = document.getElementsByClassName("t_date_scrollable_container")[0];

    if ( tDateScrollContainer ) {
        tDateScrollContainer.style.maxHeight = isoEventFilterContainerHeight + "px";
    }

    isoEventFilterContainer.parentElement.style.minHeight = isoEventFilterContainerHeight + "px";

    var xDateRowHeight = 0

    var xDateRows = document.getElementsByClassName("x_date_row");
    if ( xDateRows.length == 1 ) {
        xDateRowHeight = xDateRows[0].clientHeight;
    } else if ( xDateRows.length > 1 ) {
        xDateRowHeight = xDateRows[0].clientHeight*2;
    }

    if ( xDateRows.length > 0 ) {
        var xDateHeaderRowHeight = xDateRows[0].parentElement.firstChild.clientHeight;
        xDateHeaderRowHeight -= borderSpacing*2;
        xDateRowHeight += xDateHeaderRowHeight;
    }

    var maxHeightForTopScrollContainers = (windowHeight - (colHeaderHeight*3 + OPHIS_PANEL_BORDER_SPACING*3 + borderSpacing*2 + isoEventFilterContainerHeight));


    var biggestStartingMessageHeight = 0;

    for ( var i = 0; i < scrollableContainers.length; i++ ) {
        var ithScrollableContainer = scrollableContainers[i];
        var isTopRowScrollContainer = elementHasAncestor(ithScrollableContainer, panelContainerTopRow);

        if ( isTopRowScrollContainer === true ) {
            var ithScrollableContainerInnerStartingMessage = ithScrollableContainer.getElementsByClassName("inner_panel_table_starting_message")[0];
            var startingMessageHeight = ithScrollableContainerInnerStartingMessage ? ithScrollableContainerInnerStartingMessage.clientHeight : 0;

            if ( startingMessageHeight > biggestStartingMessageHeight ) {
                biggestStartingMessageHeight = startingMessageHeight;
            }
        }
    }

    for ( var i = 0; i < scrollableContainers.length; i++ ) {
        var ithScrollableContainer = scrollableContainers[i];
        var isTopRowScrollContainer = elementHasAncestor(ithScrollableContainer, panelContainerTopRow);

        if ( isTopRowScrollContainer === true ) {
            var ithScrollableContainerInner = ithScrollableContainer.getElementsByClassName("inner_panel_table")[0];
            var ithScrollableContainerInnerStartingMessage = ithScrollableContainer.getElementsByClassName("inner_panel_table_starting_message")[0];
            var isForXDates = ithScrollableContainer.classList.contains("x_date_scrollable_container");

            var ithScrollableContainerInner_clientHeight = ithScrollableContainerInner.clientHeight;
            var startingMessageHeight = biggestStartingMessageHeight;
            var maxHeightBetweenStartingMessageAndXDateRows = Math.max(xDateRowHeight, startingMessageHeight);


            // var finalMaxHeight = maxHeightForTopScrollContainers;
            // var finalMinHeight = Math.min(maxHeightForMessageOrInnerContainer, isoEventFilterContainerHeight);


            var finalMinHeight = 0;
            var finalMaxHeight = 0;

            if ( maxHeightForTopScrollContainers < maxHeightBetweenStartingMessageAndXDateRows ) {
                finalMinHeight = maxHeightBetweenStartingMessageAndXDateRows;
                finalMaxHeight = maxHeightBetweenStartingMessageAndXDateRows;
            } else {
                finalMinHeight = maxHeightBetweenStartingMessageAndXDateRows;
                finalMaxHeight = maxHeightForTopScrollContainers;
            }

            
            var maxHeightForMessageOrInnerContainer = Math.max(startingMessageHeight, ithScrollableContainerInner_clientHeight);

            if ( isForXDates === false ) {
                finalMaxHeight += (colHeaderHeight - borderSpacing);
                // finalMinHeight -= colHeaderHeight

                if ( finalMinHeight > ithScrollableContainerInner_clientHeight ) {
                    finalMinHeight = ithScrollableContainerInner_clientHeight;
                }
            }

            ithScrollableContainer.style.minHeight = finalMinHeight  + "px";
            ithScrollableContainer.style.maxHeight = finalMaxHeight + "px";
        }
    }

    // Not sure why the +1 is required on the end. It's just what I saw in web inspector.
    var bottomEmptySpace = windowHeight - (panelContainerTopRow.clientHeight + isoEventFilterContainerHeight + colHeaderHeight + OPHIS_PANEL_BORDER_SPACING*3 + 1);

    // console.log("bottom: " + bottomEmptySpace);

    // This way of aligning the cells gives more room to the bottom row panels, but things jump around
    // too much when toggling output filters.
    // if ( bottomEmptySpace > 0 ) {
    //     var chartOptionsContainerMaxHeight = (isoEventFilterContainerHeight + bottomEmptySpace);
    //     chartOptionsContainer.style.maxHeight = chartOptionsContainerMaxHeight + "px";
    //     chartContainer.style.maxHeight = (chartOptionsContainerMaxHeight + colHeaderHeight + borderSpacing) + "px";
    // } else {
    //     var chartContainerMaxHeight = isoEventFilterContainerHeight + colHeaderHeight;

    //     chartOptionsContainer.style.maxHeight = isoEventFilterContainerHeight + "px";
    //     chartContainer.style.maxHeight = chartContainerMaxHeight + "px";
    // }



    var chartContainerMaxHeight = isoEventFilterContainerHeight + colHeaderHeight + borderSpacing;

    chartOptionsContainer.style.maxHeight = isoEventFilterContainerHeight + "px";
    chartContainer.style.maxHeight = chartContainerMaxHeight + "px";


    var bottomRowPanelCells = document.getElementsByClassName("bottom_row_panel_cell");

    for ( var i = 0; i < bottomRowPanelCells.length; i++ ) {
        var ithPanel = bottomRowPanelCells[i];

        if ( bottomEmptySpace > 0 ) {
            ithPanel.style.paddingTop = bottomEmptySpace + "px";
        } else {
            ithPanel.style.paddingTop = "0px";
        }
    }

    var bottomRowTable = document.getElementById("panel-container-bottom-row-table");

    var colHeaderForOutputPanel = document.getElementById("col-header-inner-for-output-panel");

    var bottomRowPanelCellForChart = document.getElementById("bottom-row-panel-cell-for-chart");

    var expandMainOutputPanel = shouldExpandMainOutputPanel();

    if ( expandMainOutputPanel === true ) {
        // outputContainerWrapper.style.height = "100vh";
        var maxHeightWithoutChart = (windowHeight - (colHeaderHeight + OPHIS_PANEL_BORDER_SPACING*2));
        maxHeightWithoutChart -= borderSpacing*2;
        outputContainerWrapper.style.maxHeight = maxHeightWithoutChart + "px";


        var bottomOfOutputPanelActual = colHeaderHeight + outputContainer.clientHeight + OPHIS_PANEL_BORDER_SPACING*2;
        var bottomOfOutputPanelMax = maxHeightWithoutChart;
        var bottomOfOutputPanel = Math.min(bottomOfOutputPanelActual, bottomOfOutputPanelMax);

        var bottomRowTopOffset = chartContainerMaxHeight;

        // bottomRowTopOffset = Math.min(bottomRowTopOffset)

        // bottomRowTable.style.top = "-"+bottomRowTopOffset+"px";
        // bottomRowTable.style.position = "relative";d

        outputContainerWrapper.parentElement.style.position = "fixed";
        outputContainerWrapper.parentElement.style.zIndex = "3";

        var manualWidthOfContainer = colHeaderForOutputPanel.clientWidth;// - borderSpacing*2;
        outputContainerWrapper.parentElement.style.width = manualWidthOfContainer + "px";

        bottomRowPanelCellForChart.style.visibility = "hidden";

        updateOutputPanelScrollIfNeeded();
    } else {
        // outputContainerWrapper.style.height = "unset";

        // bottomRowTable.style.position = "unset";
        // bottomRowTable.style.top = "unset";

        outputContainerWrapper.parentElement.style.position = "unset";
        outputContainerWrapper.parentElement.style.zIndex = "unset";
        outputContainerWrapper.parentElement.style.width = "unset";
        outputContainerWrapper.parentElement.style.transform = "unset";

        bottomRowPanelCellForChart.style.visibility = "inherit";
    }


    // Don't think this actually does anything now, but doesn't seem to hurt.
    document.body.clientHeight; // force layout again, I think.
    recenterChartIfNeeded();
}

function focusOphisInput(inputElem) {
    // YES, have to call focus twice in a row, on these date elem things at least, at least in Brave.
    // The double-focus is to get rid of the date input pop-up, and otherwise shouldn't harm anything.
    inputElem.focus();
    inputElem.focus();
    inputElem.select();
}

function toggleIsoEventLocationEnabled(isoEvent, enabled) {
    isoEvent.location_enabled = enabled;

    // Always reset lat/long, regardless of whether we're enabling or disabling here.
    isoEvent.lat = 0;
    isoEvent.long = 0;
}

function rebuildIsoEventTableRows() {
    var isoEventContainer = getIsoEventContainer();

    setOverflowOnScrollContainers("hidden");

    clearRowsFromTableExceptTopRow(isoEventContainer);
    
    var currentIsoEventIndex = appState.globalOptions.current_iso_event_index;

    function onNameInputUpdate(event) {
        var rowIndex = getClickedRowIndex(event);
        var targetElem = getEventTargetElem(event);

        if ( appState.isoEvents[rowIndex].name != targetElem.value ) {
            appState.isoEvents[rowIndex].name = targetElem.value;
            targetElem.title = appState.isoEvents[rowIndex].name;

            flushChangesToDisk();

            refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__NO_CHANGE);
        }
    }

    for ( var i = 0; i < appState.isoEvents.length; i++ ) {
        var ithIsoEvent = appState.isoEvents[i];
        
        var minNameWidth = "188px";

        var radioButtonChecked = i == currentIsoEventIndex ? "checked" : "";
        var shortRowName = getRowShortNameHtml("E", i);
        var timezone = getTimezone(ithIsoEvent.lat, ithIsoEvent.long);

        var mapIcon = "<img class='open_map_icon' title='Open map...' src='./img/location.png' />";
        var locationCheckboxHtml = "<input type='checkbox' class='location_enabled_checkbox' title='Enable or disable location.' />";
        // var locationHtml = "<table><tr><td>"+LAT_INPUT_HTML+"</td><td>"+LONG_INPUT_HTML+"</td><td>"+mapIcon+"</td><td>"+locationCheckboxHtml+"</td></tr></table>";
        var locationHtml = "<table><tr><td>"+LAT_INPUT_HTML+"</td><td>"+LONG_INPUT_HTML+"</td><td>"+mapIcon+"</td></tr></table>";
        var timezoneHtml = "<div class='algo_output_in_col timezone_display'>" + timezone + "</div>";

        var scopeSelectHtml = "<select style='height:26px; margin-left: 4px; margin-right: 4px;' class='scope_display bordered small_border_radius'></select>";
        // var typeSelectHtml = "<select style='margin-left: 4px; margin-right: 4px; font-size:16px;' class='event_type_display bordered small_border_radius'></select>";
        var typeSelectHtml = "";

        var tabIndex = i+1;

        // NOTE: Now assigning the event name further down through object property to avoid any possible cross-browser quirks.
        // var eventNameEscaped = ithIsoEvent.name.replace(/'/g, "&apos;");
        var eventNameEscaped = "";
        var newRowHtml = "";
        newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'>"+shortRowName+"</div></td>";
        newRowHtml += "<td style='width:50%;' class='col_format col_with_input_left_right_padding'><input type='text' title='"+eventNameEscaped+"' value='"+eventNameEscaped+"' style='height:26px; min-width:"+minNameWidth+";' class='iso_event_name_input general_input'></input></td>";
        
        // newRowHtml += "<td style='width:50%; text-align:center;' class='col_format col_with_input_left_right_padding'><div class='x_date_count'>0</div></td>";

        // newRowHtml += "<td style='width:50%; text-align:center;' class='col_format col_with_input_left_right_padding'><div class='iso_event_filter'>Filter Here</div></td>";

        if ( isFlagEnabled(FEATURE_FLAG__SHOW_SCOPE) ) {
            newRowHtml += "<td style='width:0%; text-align:left;' class='col_format'>"+scopeSelectHtml+"</td>";
        }

        if ( isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ) {
            newRowHtml += "<td style='width:50%; padding-right:1px; text-align:center;' class='col_format col_with_input_left_right_padding'>"+locationHtml+"</td>";
            newRowHtml += "<td style='width:0%; text-align:left;' class='col_format'>"+timezoneHtml+"</td>";
        }

        if ( typeSelectHtml ) {
            newRowHtml += "<td style='width:0%; text-align:left;' class='col_format'>"+typeSelectHtml+"</td>";
        }
       
        // var cloneImageHtml = "&#x2398";
        var cloneImageHtml = "<img style='display:block;' src='./img/clone.png' />"
        var notesImageHtml = "<img style='display:block;' src='./img/notes_icon.png' />"
        
        newRowHtml += "<td style='width:0%;' class='error_color col_format'><div title='Delete This Iso-Event (and all its X-Dates)' class='row_delete_button'>&#10006;</div></td>";
        newRowHtml += "<td style='width:0%;' class='green_color col_format'><div title='Clone This Iso-Event (and all its X-Dates)' class='row_clone_button'>"+cloneImageHtml+"</div></td>";
        // newRowHtml += "<td style='width:0%;' class='green_color col_format'><div style='padding:5px;' title='Write optional notes about this Iso-Event' class='row_notes_button'>"+notesImageHtml+"</div></td>";
        newRowHtml += "<td style='width:0%;' class='col_format'><label class='row_radio_button_label'><input tabindex='-1' title='Select Event' "+radioButtonChecked+" name='selected_iso_event' class='row_radio_button' type='radio'/></label></td>";

        var newRow = isoEventContainer.insertRow(-1);
        newRow.classList.add("iso_event_row");
        newRow.innerHTML = newRowHtml;

        var inputNameElem = newRow.getElementsByClassName("iso_event_name_input")[0];
        var deleteButtonElem = newRow.getElementsByClassName("row_delete_button")[0];
        var cloneButtonElem = newRow.getElementsByClassName("row_clone_button")[0];
        var notesButtonElem = newRow.getElementsByClassName("row_notes_button")[0];
        var radioButtonElem = newRow.getElementsByClassName("row_radio_button")[0];
        var latInputElem = newRow.getElementsByClassName("lat_input")[0];
        var longInputElem = newRow.getElementsByClassName("long_input")[0];
        var openMapIcon = newRow.getElementsByClassName("open_map_icon")[0];
        var timezoneDisplay = newRow.getElementsByClassName("timezone_display")[0];
        var xDateCountElem = newRow.getElementsByClassName("x_date_count")[0];
        var locationEnabledCheckbox = newRow.getElementsByClassName("location_enabled_checkbox")[0];
        var scopeDropdown = newRow.getElementsByClassName("scope_display")[0];
        var eventTypeDropdown = newRow.getElementsByClassName("event_type_display")[0];

        if ( locationEnabledCheckbox && ithIsoEvent.location_enabled == true ) {
            locationEnabledCheckbox.checked = true;
        }

        if ( isFlagEnabled(FEATURE_FLAG__SHOW_SCOPE) ) {
            fillInSelectElem(scopeDropdown, EVENT_SCOPES, getEventScopeName);
            scopeDropdown.value = ithIsoEvent.scope;
        }

        if ( eventTypeDropdown ) {
            fillInSelectElem(eventTypeDropdown, EVENT_TYPES, getEventTypeName);
            eventTypeDropdown.value = ithIsoEvent.type;
        }

        inputNameElem.addEventListener("keydown", function(event) {
            removeAllDisplayedToolTips();
            
            if (event.key === 'Tab') {
                event.preventDefault();

                var thisNameInput = getEventTargetElem(event);
                var allNameInputs = document.getElementsByClassName("iso_event_name_input");

                for ( var i = 0; i < allNameInputs.length; i++ ) {
                    var ithNameInput = allNameInputs[i];

                    if ( thisNameInput == ithNameInput ) {
                        if ( i < allNameInputs.length-1 ) {
                            focusOphisInput(allNameInputs[i+1]);
                        } else {
                            var allDateInputs = document.getElementsByClassName("x_date_calendar_input");
                            focusOphisInput(allDateInputs[0]);
                        }
                    }
                }
            }
        });

        inputNameElem.addEventListener("focus", function(event) {
            removeAllDisplayedToolTips();
        });

        inputNameElem.title = ithIsoEvent.name;
        inputNameElem.value = ithIsoEvent.name;

        applyToolTip(timezoneDisplay);
        applyToolTip(openMapIcon);
        applyToolTip(inputNameElem);
        applyToolTip(deleteButtonElem);
        applyToolTip(cloneButtonElem);

        if ( notesButtonElem ) {
            applyToolTip(notesButtonElem);
        }
        
        applyToolTip(radioButtonElem);
        applyToolTip(xDateCountElem);
        applyToolTip(latInputElem);
        applyToolTip(longInputElem);

        if ( locationEnabledCheckbox ) {
            applyToolTip(locationEnabledCheckbox);
        }
        
        inputNameElem.setAttribute("row_index", i);
        deleteButtonElem.setAttribute("row_index", i);
        cloneButtonElem.setAttribute("row_index", i);
        if ( notesButtonElem ) {
            notesButtonElem.setAttribute("row_index", i);
        }
        radioButtonElem.setAttribute("row_index", i);
        
        if ( isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ) {
            latInputElem.setAttribute("row_index", i);
            longInputElem.setAttribute("row_index", i);
            openMapIcon.setAttribute("row_index", i);

            if ( locationEnabledCheckbox ) {
                locationEnabledCheckbox.setAttribute("row_index", i);
            }
            

            latInputElem.value = ithIsoEvent.lat;
            longInputElem.value = ithIsoEvent.long;

            addEventListenersToLatOrLongInput(latInputElem);
            addEventListenersToLatOrLongInput(longInputElem);

            openMapIcon.addEventListener("click", function(event) {
                var rowIndex = getClickedRowIndex(event);
                var isoEvent = appState.isoEvents[rowIndex];
    
                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    showMap(isoEvent);
                } else {
                    showToast("Location is only relevant to HH:MM Scope.")
                }
            });
    
            if ( locationEnabledCheckbox ) {
                locationEnabledCheckbox.addEventListener("change", function(event) {
                    var rowIndex = getClickedRowIndex(event);
                    var isoEvent = appState.isoEvents[rowIndex];

                    if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                        var isChecked = this.checked;

                        toggleIsoEventLocationEnabled(isoEvent, isChecked);
            
                        flushChangesToDisk();
            
                        refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
                    } else {
                        event.preventDefault();
                        this.checked = false;

                        showToast("Location is only applicable to HH:MM scope.");
                    }
                });
            }
        }
        
        if ( isFlagEnabled(FEATURE_FLAG__SHOW_SCOPE) ) {
            scopeDropdown.setAttribute("row_index", i);

            scopeDropdown.addEventListener("change", function(event) {
                var target = getEventTargetElem(event);
                var rowIndex = getClickedRowIndex(event);
                var isoEvent = appState.isoEvents[rowIndex];
    
                isoEvent.scope = target.value;

                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    toggleIsoEventLocationEnabled(isoEvent, true);
                } else {
                    toggleIsoEventLocationEnabled(isoEvent, false);
                }
                
                flushChangesToDisk();
                
                updateLatLongInputElemValues();
                selectIsoEvent(rowIndex);
            });
        }

        if ( eventTypeDropdown ) {
            eventTypeDropdown.setAttribute("row_index", i);

            eventTypeDropdown.addEventListener("change", function(event) {
                var target = getEventTargetElem(event);
                var rowIndex = getClickedRowIndex(event);
                var isoEvent = appState.isoEvents[rowIndex];

                isoEvent.type = target.value;

                setSkinModeBasedOnCurrentEventType();

                flushChangesToDisk();
                
                selectIsoEvent(rowIndex);
            });
        }

        inputNameElem.addEventListener("input", function(event) {
            // FOR NOW: Disable automatically updating on key stroke.
            // onNameInputUpdate(event);
        });

        inputNameElem.addEventListener('keydown',function(event) {
            if ( event.which == KEY_CODE__ENTER || isEscapeKey(event) ) {
                this.blur();
            }
        });

        inputNameElem.addEventListener('blur',function(event) {
            onNameInputUpdate(event);
        });

        enableRowButton(cloneButtonElem);
        cloneButtonElem.style.color = "green";

        if ( notesButtonElem ) {
            enableRowButton(notesButtonElem);
            notesButtonElem.style.color = "black";
        }

        if ( appState.isoEvents.length <= 1 ) {
            // disableRowButton(deleteButtonElem);
            disableRowButton(radioButtonElem);
        } else {
            // enableRowButton(deleteButtonElem);
            enableRowButton(radioButtonElem);
        }

        enableRowButton(deleteButtonElem);

        deleteButtonElem.addEventListener("click", function(jsEvent) {
            var rowIndex = getClickedRowIndex(jsEvent);
            var theEventToDelete = appState.isoEvents[rowIndex];
            var shortName = getRowShortNameHtml("E", rowIndex);
            var longName = theEventToDelete.name ? theEventToDelete.name : "(no name)";

            showDialog("Are you sure you want to delete event <span class='bold_dialog_text'>" + shortName + "</span> named <span class='bold_dialog_text'>" + longName + "</span>? It has <span class='bold_dialog_text'>"+theEventToDelete.x_dates.length+"</span> X-Dates.", "NO, don't delete", "YES, delete", function() {
                if ( appState.isoEvents.length > 1 ) {
                    appState.isoEvents.splice(rowIndex, 1);

                    if ( appState.globalOptions.current_iso_event_index >= appState.isoEvents.length ) {
                        appState.globalOptions.current_iso_event_index = appState.isoEvents.length - 1;
                    } else if ( rowIndex < appState.globalOptions.current_iso_event_index ) {
                        appState.globalOptions.current_iso_event_index = appState.globalOptions.current_iso_event_index - 1;
                    }

                    flushChangesToDisk();
                    refreshIsoEvents(REFRESH_TYPE__HARD, OPHIS_INPUT_CHANGE__FORCE);
                } else {
                    resetAllIsoEvents();
                }
            });
            
            
        });

        cloneButtonElem.addEventListener("click", function(jsEvent) {
            if ( appState.isoEvents.length > 0 ) {
                var rowIndex = getClickedRowIndex(jsEvent);
                var theEventToClone = appState.isoEvents[rowIndex];
                var longName = theEventToClone.name ? theEventToClone.name : "(no name)";
                var newLongName = longName + " copy";
                var newEvent = deepClone(theEventToClone);
                newEvent.name = newLongName;
                newEvent.checked_for_swap_source = false;
                newEvent.checked_for_swap_target = false;
                appState.isoEvents.push(newEvent);
                
                flushChangesToDisk();

                var autoSelectNewEvent = false; // hardcoded to false for now, but a reminder that OPHIS_INPUT_CHANGE__FORCE would need to be used if this is ever true again.
                refreshIsoEvents(REFRESH_TYPE__HARD, autoSelectNewEvent ? OPHIS_INPUT_CHANGE__FORCE : OPHIS_INPUT_CHANGE__NO_CHANGE);

                scrollPanelToBottom(getIsoEventContainer());

                showToast("Cloned '"+longName+"' to end of list, named '"+newLongName+"'");
            }
        });

        if ( notesButtonElem ) {
            notesButtonElem.addEventListener("click", function(jsEvent) {
                var rowIndex = getClickedRowIndex(jsEvent);

                var rowElems = document.getElementsByClassName("iso_event_row");
                
                // showNotesPopUp(rowElems[rowIndex]);
            });
        }

        radioButtonElem.addEventListener("click", function(jsEvent) {
            var rowIndex = getClickedRowIndex(jsEvent);

            if ( appState.globalOptions.current_iso_event_index != rowIndex && appState.isoEvents.length > 1 ) {
                selectIsoEvent(rowIndex);
            }
        });
    }

    refreshIsoEventRowBackgrounds(currentIsoEventIndex);
}

// function showNotesPopUp(rowElem) {
//     var notesElem = document.getElementById("notes-pop-up-wrapper");
//     notesElem.style.display = "block";
//     notesElem.style.marginLeft = "10px";

//     var eventPanel = document.getElementById("panel-cell-with-table-output-for-events");
//     var eventPanelWidth = eventPanel.clientWidth;
//     notesElem.style.minWidth = eventPanelWidth + "px";
//     notesElem.style.maxWidth = eventPanelWidth + "px";

//     var rowElemRect = rowElem.getBoundingClientRect();

//     notesElem.style.top = rowElemRect.bottom + "px";
// }

// function hideNotesPopUp() {
//     var notesElem = document.getElementById("notes-pop-up-wrapper");
//     notesElem.style.display = "none";
// }

function refreshMasterCheckboxBasedOnChildChange(baseElemId, baseClassName) {
    var allChildCheckboxes = getAllChildCheckboxes(baseClassName);
    var masterCheckboxElem = document.getElementById(baseElemId + "-master");

    if ( masterCheckboxElem ) {
        var checkedCount = 0;

        var isForEventSwapTarget = baseElemId == MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.baseElemId;
        var indexOfDisabledRow = -1;

        if ( isForEventSwapTarget ) {
            var targetRadioButtons = document.getElementsByClassName("row_radio_button_for_swap");

            for ( var i = 0; i < targetRadioButtons.length; i++ ) {
                var ithRadioButton = targetRadioButtons[i];

                if ( ithRadioButton.checked == true ) {
                    indexOfDisabledRow = i;
                    break;
                }
            }
        }

        for ( var i = 0; i < allChildCheckboxes.length; i++ ) {
            var ithChild = allChildCheckboxes[i];

            if ( ithChild.checked ) {
                checkedCount += 1;
            }
        }

        if ( checkedCount == 0 ) {
            masterCheckboxElem.checked = false;
            masterCheckboxElem.indeterminate = false;
        } else if ( checkedCount > 0 && checkedCount < allChildCheckboxes.length )  {

            var effectiveLengthForCheckedOrNotLogic = isForEventSwapTarget ? allChildCheckboxes.length - 1 : allChildCheckboxes.length;

            if ( isForEventSwapTarget && checkedCount == allChildCheckboxes.length - 1 ) {
                masterCheckboxElem.checked = true;
                masterCheckboxElem.indeterminate = false;
            } else {
                masterCheckboxElem.checked = checkedCount > effectiveLengthForCheckedOrNotLogic/2;
                masterCheckboxElem.indeterminate = true;
            }
        } else {
            masterCheckboxElem.checked = true;
            masterCheckboxElem.indeterminate = false;
        }
    }
}

function rebuildXDateTableRowsInternal(inputDateArray, inputDateType, isDummyRow = false) {
    var currentIsoEvent = getCurrentIsoEvent();
    var isForXDates = inputDateType == INPUT_DATE_TYPE__X_DATE;
    var inputDateContainer = isForXDates ? getXDateContainer() : getTDateContainer();
    var resetAllXDatesButton = isForXDates ? document.getElementById("reset-x-dates-button") : document.getElementById("reset-t-dates-button");
    var xDateInputHeader = isForXDates ? document.getElementById("x-date-input-header") : document.getElementById("t-date-input-header");
    var headerRow = xDateInputHeader.parentElement;
    

    var rowClassName = isForXDates ? "x_date_row" : "t_date_row";
    var inputClassName = isForXDates ? "x_date_calendar_input" : "t_date_calendar_input";
    var rowClassNameDummy = rowClassName+"_dummy";
        
    var existingXDateRows = [];
    var existingXDateRowsContainer = inputDateContainer.getElementsByClassName(rowClassName);

    if ( isDummyRow === false && existingXDateRowsContainer.length > 0 ) {
        if ( existingXDateRowsContainer[0].classList.contains(rowClassNameDummy) ) {
            destroyFlatPickrInstances(inputClassName);
            clearRowsFromTableExceptTopRow(inputDateContainer);
        }
    }

    for ( var i = 0; i < existingXDateRowsContainer.length; i++ ) {
        existingXDateRows.push(existingXDateRowsContainer[i]);
    }

    var clearExistingRows = false;

    if ( existingXDateRows.length == 0 ) {
        // Means that the help message HELP_MESSAGE__X_DATES_PANEL or HELP_MESSAGE__T_DATES_PANEL is probably showing.
        clearExistingRows = true;
    } else {
        var firstRow = existingXDateRows[0];

        if ( firstRow.getAttribute("event_scope") != currentIsoEvent.scope ) {
            clearExistingRows = true;
        }
    }

    if ( clearExistingRows === true ) {
        existingXDateRows = [];
        destroyFlatPickrInstances(inputClassName);
        clearRowsFromTableExceptTopRow(inputDateContainer);
    }

    enableRowButton(resetAllXDatesButton);

    headerRow.style.display = "table-row";

    var readableName = isForXDates ? "X-Date" : "T-Date";
    var checkBoxClass = isForXDates ? "x_date_checkbox" : "t_date_checkbox"
    var masterCheckboxConfig = isForXDates ? MASTER_CHECKBOX_CONFIG__X_DATES : MASTER_CHECKBOX_CONFIG__T_DATES;

    for ( var i = 0; i < inputDateArray.length; i++ ) {
        var ithXDate = inputDateArray[i];

        if ( i < existingXDateRows.length ) {
            var existingRow = existingXDateRows[i];
            var dateInputElem = existingRow.getElementsByClassName("date_input_common")[0];
            var xDateCheckboxElem = existingRow.getElementsByClassName(checkBoxClass)[0];

            var xDateAsInputValue = xDateToInputElementValue(ithXDate, currentIsoEvent.scope);

            dateInputElem.value = xDateAsInputValue;
            xDateCheckboxElem.checked = ithXDate.enabled;

            if ( dateInputElem._flatpickr ) {
                dateInputElem._flatpickr.setDate(xDateAsInputValue);
            }

            continue;
        }

        var shortRowName = getRowShortNameHtml(isForXDates ? "X" : "T", i);

        var priorSunsetDisplayClassSpecific = isForXDates ? "prior_sunset_display_x_date" : "prior_sunset_display_t_date";
        var priorSunsetHtml = "<div style='margin:0px; margin-left:2px; width:100%;' class='algo_output_in_col prior_sunset_display "+priorSunsetDisplayClassSpecific+"'></div>";

        var minDateFieldWidth = "";

        if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
            minDateFieldWidth = MIN_DATE_AND_TIME_FIELD_WIDTH;
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__DAYS ) {
            minDateFieldWidth = MIN_DATE_FIELD_WIDTH;
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__MONTHS ) {
            minDateFieldWidth = "85px";
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__YEARS ) {
            minDateFieldWidth = "100px";
        }

        var isHHMMEvent = currentIsoEvent.scope == EVENT_SCOPE__HH_MM;
        var showInlineSunset = isHHMMEvent && isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE);

        var insertButtonTopOffset = showInlineSunset ? "top:-31px;" : "";
        var insertButtonHtml = "<img style='"+insertButtonTopOffset+"' class='row_insert_button' src='./img/left_arrow.png' title='Insert New X-Date here.'/>";

        var inlineSunsetHtml = showInlineSunset ? "<table style='display:inline-block; margin-top:2px;' class='prior_sunset_display_wrapper' title='The most recent sunset before the "+readableName+", which may be the day before the "+readableName+".<br>The time of the sunset is relative to the timezone of the location.'><tr><td><img style='opacity:.5; width:24px; height:24px;' src='./img/sunset.png'/></td><td>"+priorSunsetHtml+"</td></tr></table>" : "";
        var inputFieldMarginTop = inlineSunsetHtml ? "margin-top:4px;" : "";

        newRowHtml = "";
        newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'>" + shortRowName + "</div></td>";
        newRowHtml += "<td style='width:33.33%; text-align:center;' class='col_format col_with_input_left_right_padding'><input style='"+inputFieldMarginTop+"text-align:center; width:"+minDateFieldWidth+";' class='date_input_common "+inputClassName+" general_input'></input>"+inlineSunsetHtml+"</td>";

        if ( isHHMMEvent && isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL) ) {
            newRowHtml += "<td style='display:"+sunsetColDisplay+"; width:0%; text-align:left;' title='The most recent sunset for "+shortRowName+", calculated from lat/long of the Iso-Event.' class='col_format prior_sunset_cell'>"+priorSunsetHtml+"</td>";
        }
    
        // newRowHtml += "<td style='width:33.33%; text-align:center;' class='col_format col_with_input_left_right_padding'><input style='min-width:"+minTimeWidth+";' class='date_input_common x_date_time_input general_input'></input></td>";
        // newRowHtml += "<td style='width:33.33%;' class='col_format'><input style='min-width:"+minTimeWidth+";' class='date_input_common'></input></td>";
        var checkboxHtml = '<input type="checkbox" style="" class="'+checkBoxClass+'" tabindex="-1" title="Enable/Disable this '+readableName+'">';
        newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'><div style='padding-left:5px;padding-right:5px;' class=''>"+checkboxHtml+"</div></td>";
        newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'><div style='' title='Delete This "+readableName+"' class='row_delete_button'>&#10006;</div></td>";
        newRowHtml += "<td style='width:0%; text-align:center;' class='col_format'>"+insertButtonHtml+"</td>";

        var newRow = inputDateContainer.insertRow(-1);
        newRow.classList.add(rowClassName);

        if ( isDummyRow ) {
            newRow.classList.add(rowClassNameDummy);
        }

        newRow.setAttribute("event_scope", currentIsoEvent.scope);
        newRow.innerHTML = newRowHtml;

        var dateInputElem = newRow.getElementsByClassName("date_input_common")[0];
        var deleteButtonElem = newRow.getElementsByClassName("row_delete_button")[0];
        var insertButtonElem = newRow.getElementsByClassName("row_insert_button")[0];
        var xDateCheckboxElem = newRow.getElementsByClassName(checkBoxClass)[0];

        if ( isDummyRow === true ) {
            // Lessen the chance that these hidden elements are unintentionally interacted with somehow.
            dateInputElem.disabled = true;
            deleteButtonElem.disabled = true;
            insertButtonElem.disabled = true;
        }

        dateInputElem.addEventListener("keydown", function(event) {

            if (event.key === 'Tab') {
                event.preventDefault();
                event.stopPropagation();

                removeAllDisplayedToolTips();

                var thisDateInput = getEventTargetElem(event);
                var allDateInputs = document.getElementsByClassName(inputClassName);

                for ( var i = 0; i < allDateInputs.length; i++ ) {
                    var ithDateInput = allDateInputs[i];
                    
                    if ( thisDateInput == ithDateInput ) {
                        if ( i < allDateInputs.length-1 ) {
                            focusOphisInput(allDateInputs[i+1]);
                        } else {
                            var allOperationEquationInputs = document.getElementsByClassName("operation_equation_input");

                            if ( allOperationEquationInputs.length > 0 ) {
                                focusOphisInput(allOperationEquationInputs[0]);
                            } else {
                                var allNameInputs = document.getElementsByClassName("iso_event_name_input");
                                focusOphisInput(allNameInputs[0]);
                            }
                        }
                    }
                }
            }
        });

        applyToolTip(deleteButtonElem);
        applyToolTip(insertButtonElem);
        applyToolTip(xDateCheckboxElem);
        applyToolTipToCssClass("prior_sunset_cell");
        applyToolTipToCssClass("prior_sunset_display_wrapper");

        deleteButtonElem.setAttribute("row_index", i);
        dateInputElem.setAttribute("row_index", i);
        insertButtonElem.setAttribute("row_index", i);
        xDateCheckboxElem.setAttribute("row_index", i);

        xDateCheckboxElem.checked = ithXDate.enabled === true ? true : false;

        xDateCheckboxElem.addEventListener("change", function(event) {
            var shouldNowBeEnabled = this.checked;

            var rowIndex = getClickedRowIndex(event);

            masterCheckboxConfig.onChildNowCheckedOrNot(rowIndex, shouldNowBeEnabled);
            masterCheckboxConfig.onMasterCheckboxChangeComplete(rowIndex);
        });

        enableRowButton(deleteButtonElem);

        var flatPickrBaseConfig = null;
        
        if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
            flatPickrBaseConfig = FLATPICKR_BASE_DATE_CONFIG__HH_MM();
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__DAYS ) {
            flatPickrBaseConfig = FLATPICKR_BASE_DATE_CONFIG__DAYS();
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__MONTHS ) {
            flatPickrBaseConfig = FLATPICKR_BASE_DATE_CONFIG__MONTHS();
        } else if ( currentIsoEvent.scope == EVENT_SCOPE__YEARS ) {
            flatPickrBaseConfig = FLATPICKR_BASE_DATE_CONFIG__YEARS();
        }

        var flatPickrConfig = flatPickrBaseConfig;//deepClone(flatPickrBaseConfig);
        flatPickrConfig.inline = false;
        flatPickrConfig.position = "custom custom";
        // flatPickrBaseConfig.static = true;
        // flatPickrConfig.positionElement = deleteButtonElem;

        var xDateAsInputValue = xDateToInputElementValue(ithXDate, currentIsoEvent.scope);
        flatPickrConfig.defaultDate = xDateAsInputValue;
        dateInputElem.value = xDateAsInputValue;

        function fallbackDateString(inputElemForCallback) {
            var currentIsoEventInner = getCurrentIsoEvent();

            var rowIndex = getRowIndex(inputElemForCallback);
            var xDate = currentIsoEventInner.x_dates[rowIndex];

            return xDateToInputElementValue(xDate, currentIsoEventInner.scope);
        }

        function onValidDateEntered(inputElemForCallback, parsedNativeDate, xDate) {

            // console.log("onValidDateEntered: " + parsedNativeDate);

            var currentIsoEventInner = getCurrentIsoEvent();
            var inputDateArrayInner = isForXDates ? currentIsoEventInner.x_dates : currentIsoEventInner.t_dates;

            var rowIndex = getRowIndex(inputElemForCallback);

            inputDateArrayInner[rowIndex].date = xDate.date;
            inputDateArrayInner[rowIndex].time = xDate.time;

            flushChangesToDisk();
            var preserveScrollPositionInner = false;
            refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPositionInner, OPHIS_INPUT_CHANGE__CHANGED);
        }

        var nullTimeZone = null;
        setUpDateInput(flatPickrConfig, dateInputElem, currentIsoEvent.scope, nullTimeZone, fallbackDateString, onValidDateEntered);

        flatpickr(dateInputElem, flatPickrConfig);

        insertButtonElem.addEventListener("click", function(event) {
            var rowIndex = getClickedRowIndex(event);
            
            var refreshView = true;
            var flushChanges = true;

            addXDate(getCurrentIsoEvent(), rowIndex, refreshView, flushChanges, inputDateType);
        });

        deleteButtonElem.addEventListener("click", function(event) {
            var rowIndex = getClickedRowIndex(event);

            var currentIsoEventInner = getCurrentIsoEvent();
            var inputDateArrayInner = isForXDates ? currentIsoEventInner.x_dates : currentIsoEventInner.t_dates;

            inputDateArrayInner.splice(rowIndex, 1);

            flushChangesToDisk();
            var preserveScrollPosition = true;
            refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
        });
    }

    // Remove any rows that are beyond the number of X-Dates/T-Dates.
    for ( var k = inputDateArray.length; k < existingXDateRows.length; k++ ) {
        var existingRow = existingXDateRows[k];

        var ithInputElem = existingRow.getElementsByClassName(inputClassName)[0];
        destroyFlatPickrInstance(ithInputElem)

        existingRow.remove();
    }
}

function rebuildXDateTableRows(preserveScrollPosition, inputDateType) {
    var isForXDates = inputDateType == INPUT_DATE_TYPE__X_DATE;

    var currentIsoEvent = getCurrentIsoEvent();
    var inputDateContainer = isForXDates ? getXDateContainer() : getTDateContainer();
    var startingMessageElem = isForXDates ? document.getElementById("x-date-container-starting-message") : document.getElementById("t-date-container-starting-message");
    var inputClassName = isForXDates ? "x_date_calendar_input" : "t_date_calendar_input";

    var scrollTop = 0;

    if ( preserveScrollPosition === true ) {
        scrollTop = inputDateContainer.parentElement.scrollTop;
    }

    var xDateInputHeader = isForXDates ? document.getElementById("x-date-input-header") : document.getElementById("t-date-input-header");

    if ( isForXDates ) {
        if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
            xDateInputHeader.title = "When an individual instance of an Iso-Event ENDED.<br>This time must be LOCAL to the timezone. e.g. for an NFL game this would be the end time of the game as a spectator in the stands would see on his watch, when the score is final. The hour:minute is used as the starting point for adding a Z-Value to an X-Date in order to find a Z-Date.";
        } else {
            xDateInputHeader.title = "The calendar date of an event, e.g. one of several dates when Bitcoin reached an all time high. ";
        }
    } else {
        xDateInputHeader.title = "A specific date in the future that you're interested in.";
    }
    
    var priorSunsetTableHeader = document.getElementById("prior-sunset-header");
    var priorSunsetTableHeaderTDates = document.getElementById("prior-sunset-header-t-dates");

    if ( priorSunsetTableHeader ) {
        var sunsetColDisplay = "";

        if ( isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL) ) {
            sunsetColDisplay = "table-cell";
        } else {
            sunsetColDisplay = "none";
        }
    
        priorSunsetTableHeader.style.display = sunsetColDisplay;
        priorSunsetTableHeaderTDates.style.display = sunsetColDisplay;
    }

    var headerRow = xDateInputHeader.parentElement;
    var resetAllXDatesButton = isForXDates ? document.getElementById("reset-x-dates-button") : document.getElementById("reset-t-dates-button");

    var inputDateArray = isForXDates ? currentIsoEvent.x_dates : currentIsoEvent.t_dates;

    if ( inputDateArray.length == 0 ) {

        startingMessageElem.style.display = "block";
        inputDateContainer.style.display = "block";
        inputDateContainer.style.maxHeight = "0px";
        inputDateContainer.style.visibility = "hidden";
        
        destroyFlatPickrInstances(inputClassName);
        clearRowsFromTableExceptTopRow(inputDateContainer);

        disableRowButton(resetAllXDatesButton);

        var isForDummyRow = true;
        var dummyXDate = nativeDateToXDate(new Date());
        dummyXDate.enabled = true;
        var dummyInputDateArray = [dummyXDate];
        rebuildXDateTableRowsInternal(dummyInputDateArray, inputDateType, isForDummyRow);

        // var newRow = inputDateContainer.insertRow(-1);

        // var helpMessage = isForXDates ? HELP_MESSAGE__X_DATES_PANEL : HELP_MESSAGE__T_DATES_PANEL;
        // newRow.innerHTML = "<td colspan='5' style='padding:5px; border-top:0px;'><div style='color: black;' class='col_output_text error_color'>"+helpMessage+"</div></td>";

    } else {
        startingMessageElem.style.display = "none";
        inputDateContainer.style.display = "table";
        inputDateContainer.style.maxHeight = "unset";
        inputDateContainer.style.visibility = "unset";

        var isForDummyRow = false;
        rebuildXDateTableRowsInternal(inputDateArray, inputDateType, isForDummyRow);
    }

    if ( preserveScrollPosition === true ) {
        inputDateContainer.parentElement.scrollTop = scrollTop;
    }
}