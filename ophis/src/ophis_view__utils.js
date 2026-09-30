
function scrollPanelToBottom(elem) {
    elem.parentElement.scrollTo(0, elem.parentElement.scrollHeight);
}

var SUBSCRIPT_UNICODE_DIGITS = [
    "\u{2080}",
    "\u{2081}",
    "\u{2082}",
    "\u{2083}",
    "\u{2084}",
    "\u{2085}",
    "\u{2086}",
    "\u{2087}",
    "\u{2088}",
    "\u{2089}",
];

function updateOutputPanelScrollIfNeeded() {
    var expandMainOutputPanel = shouldExpandMainOutputPanel();

    if ( expandMainOutputPanel ) {
        var outputContainerWrapper = document.getElementById("scrollable-container-for-output-container");
        if ( outputContainerWrapper ) {
            var scrollX = -window.scrollX;
            var scrollY = -window.scrollY;
            outputContainerWrapper.parentElement.style.transform = "translateY("+scrollY+"px) translateX("+scrollX+"px)"

            // console.log("scrollY: " + scrollY);
        }
    }
}

function shouldExpandMainOutputPanel() {
    var currentIsoEvent = getCurrentIsoEvent();
    var showChartField = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART");
    var hideChartCompletely = currentIsoEvent ? currentIsoEvent[showChartField.serializationKey] === false : false;

    if ( hideChartCompletely ) {
        return true;
    } else {
        var currentScreen = getCurrentScreen();

        var isScreenThatHasRoomForChart = currentScreen == OPHIS_SCREEN__IMPORT_X_DATES || currentScreen == OPHIS_SCREEN__Z_DATES || currentScreen == OPHIS_SCREEN__EXPORT_Z_DATES;

        return isScreenThatHasRoomForChart == false;
    }
}
    

function elementHasAncestor(element, ancestor) {
    let currentNode = element.parentNode;
    while (currentNode) {
        if (currentNode === ancestor) {
            return true;
        }
        currentNode = currentNode.parentNode;
    }
    return false;
}

function setUpDateInput(flatPickrConfig, dateInputElem, eventScope, timeZoneOrNull, fallbackDateString, onValidDateEntered, timeOnly = false) {
    
    var onValidDateEntered_calling = false;

    function onDateChangeInner(dateString) {
        // print("DATESTRING: " + dateString);
        // debugger;

        function call_onValidDateEntered(parsedNativeDate, possibleXDate) {
            if ( parsedNativeDate != null && onValidDateEntered_calling === false ) {
                onValidDateEntered_calling = true;
                try {
                    onValidDateEntered(dateInputElem, parsedNativeDate, possibleXDate);
                    onValidDateEntered_calling = false;
                } catch (err) {
                    onValidDateEntered_calling = false;

                    throw err;
                }
            }
        }

        if ( document.contains(dateInputElem) ) {
            var nullLat = null;
            var nullLong = null;
            var ignoredErrors = [];
            // var eventScope = EVENT_SCOPE__DAYS;

            if ( timeOnly === true ) {
                var errors_out_unused = [];
                var timeComponents = validateXDateTime(dateString, errors_out_unused);

                if ( timeComponents != null ) {
                    var parsedNativeDate = utcMillisToNativeDate(0);
                    parsedNativeDate.setUTCHours(timeComponents.hours, timeComponents.minutes);
                    var lat = 0;
                    var long = 0;
                    var possibleXDate = nativeDateToXDate(parsedNativeDate, lat, long);

                    call_onValidDateEntered(parsedNativeDate, possibleXDate);
                }
            } else {
                var possibleXDate = flatPickrStringToXDate(eventScope, dateString);

                var parsedNativeDate = xDateToNativeDate(eventScope, possibleXDate, nullLat, nullLong, ignoredErrors, timeZoneOrNull);

                call_onValidDateEntered(parsedNativeDate, possibleXDate);
            }
        }
    }

    function onNativeDateInputEvent(event) {
        var dateString = dateInputElem.value;
        var rowIndex = getRowIndex(dateInputElem);

        if ( event.type == "blur" || isEnterKey(event) || isEscapeKey(event) ) {
            if ( timeOnly === true ) {
                var errors_out_unused = [];
                var timeComponents = validateXDateTime(dateString, errors_out_unused);

                if ( timeComponents ) {
                    dateString += " " + timeComponents.hours + ":" + timeComponents.minutes;
                } else {
                    dateString += " " + "00:00";
                }
            } else {
                var possibleXDate = flatPickrStringToXDate(eventScope, dateString);
                var errors_out = [];
                var calendarComponents = validateXDateCalendarDate(possibleXDate.date, errors_out, DATE_DELIMITER);

                calendarComponents = calendarComponents ? calendarComponents : validateXDateCalendarDate(possibleXDate.date, errors_out, STANDARD_DATE_DELIMITER);

                if ( calendarComponents ) {
                    // Able to validate as a standard X-Date
                } else {
                    // See if it appears to be a standard YYYY-MM-DD type of date timestamp, and coerce back to informal.
                    var calendarDateSplit = dateString.split(STANDARD_DATE_DELIMITER);
                    if ( calendarDateSplit.length == 3 && calendarDateSplit[0].length == 4 ) {
                        dateString = calendarDateSplit[1] + DATE_DELIMITER + calendarDateSplit[2] + DATE_DELIMITER + calendarDateSplit[0];

                        calendarComponents = calendarComponents ? calendarComponents : validateXDateCalendarDate(dateString, errors_out, DATE_DELIMITER);
                    }
                }

                if ( calendarComponents ) {

                    var year = "" + calendarComponents.year_orig;

                    if ( year.length == 1 ) {
                        year = "000" + year;
                    } else if ( year.length == 2 ) {
                        year = "20" + year;
                    } else if ( year.length == 3 ) {
                        year = "0" + year;
                    }

                    dateString = dateComponentsToReadableString(year, calendarComponents.month, calendarComponents.day);

                    if ( eventScope == EVENT_SCOPE__HH_MM ) {
                        var timeComponents = validateXDateTime(possibleXDate.time, errors_out);

                        if ( timeComponents ) {
                            dateString += " " + timeComponents.hours + ":" + timeComponents.minutes;
                        } else {
                            dateString += " " + "00:00";
                        }
                    }
                    
                    possibleXDate = flatPickrStringToXDate(eventScope, dateString);

                    var parsedNativeDate = xDateToNativeDate(eventScope, possibleXDate);

                    if ( parsedNativeDate == null ) {
                        dateString = fallbackDateString(dateInputElem);
                    }
                } else {
                    dateString = fallbackDateString(dateInputElem);
                }
            }
        }

        dateInputElem.value = dateString;

        // onDateChangeInner(dateString);
    }

    flatPickrConfig.onChange = function(selectedDates, dateString, instance) {
        var inputElem = instance.input;
        
        onDateChangeInner(dateString);
    };

    dateInputElem.addEventListener('keydown', function(event) {
        if ( isEnterKey(event) ) {
            event.preventDefault();
            event.stopPropagation();

            // console.log("enter pressed");
            onNativeDateInputEvent(event);


            var thisDateInput = getEventTargetElem(event);
            var isForXDates = thisDateInput.classList.contains("x_date_calendar_input");
            var inputClassName = isForXDates ? "x_date_calendar_input" : "t_date_calendar_input"
            var allDateInputs = document.getElementsByClassName(inputClassName);

            for ( var i = 0; i < allDateInputs.length; i++ ) {
                var ithNameInput = allDateInputs[i];

                if ( thisDateInput == ithNameInput ) {
                    if ( i < allDateInputs.length-1 ) {
                        focusOphisInput(allDateInputs[i+1]);
                    }
                }
            }
        } else if (isEscapeKey(event) ) {
            var inputElem = getEventTargetElem(event);
            inputElem.blur();
            inputElem._flatpickr.close();
        }
    });

    dateInputElem.addEventListener("input", function(event) {
        // event.preventDefault();
        // event.stopPropagation();
    });

    dateInputElem.addEventListener('blur', function(event) {
        event.preventDefault();
        event.stopPropagation();

        // console.log("blur");
        onNativeDateInputEvent(event);
    });
}

function getHitCountSymbolImage(hitCount, srcOnly) {

    var toReturn = srcOnly ? TRANSPARENT_PIXEL_DATA_URI : null;

    if ( hitCount == 2 ) {
        toReturn = srcOnly ? CHART_SYMBOL_IMAGE_SRC__GEMINI : CHART_SYMBOL_IMAGE__GEMINI;
    } else if ( hitCount == 3 ) {
        toReturn = srcOnly ? CHART_SYMBOL_IMAGE_SRC__TRIANGLE : CHART_SYMBOL_IMAGE__TRIANGLE;
    } else if ( hitCount == 4 ) {
        toReturn = srcOnly ? CHART_SYMBOL_IMAGE_SRC__DIAMOND : CHART_SYMBOL_IMAGE__DIAMOND;
    } else if ( hitCount >= 5 ) {
        toReturn = srcOnly ? CHART_SYMBOL_IMAGE_SRC__CIRCLE : CHART_SYMBOL_IMAGE__CIRCLE;
    }

    return toReturn;
}

function convertIntToSubscriptUnicode(nonNegInt) {
    // \u{2080}

    if ( isNonNegIntOrStringThereof(nonNegInt) ) {
        var nonNegIntString = nonNegInt + "";
        var toReturn = "";

        for ( var i = 0; i < nonNegIntString.length; i++ ) {
            var ithChar = nonNegIntString.charAt(i);
            var ithCharInt = parseInt(ithChar);
            var ithCharUnicode = SUBSCRIPT_UNICODE_DIGITS[ithCharInt];

            toReturn += ithCharUnicode;
        }

        return toReturn;
    } else {
        return "";
    }
}

function addOutputRow() {
    var outputContainer = getOutputContainer();

    var toReturn = outputContainer.insertRow(-1);

    return toReturn;
}

function isEnterKey(evt) {
    if (evt.key === 'Enter' || evt.keyCode === 13) {
        return true;
    } else {
        return false;
    }
}

function isEscapeKey(evt) {
    var isEscape = false;

    if ("key" in evt) {
        isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
        isEscape = (evt.keyCode === 27);
    }

    return isEscape;
}

function getXDateContainer() {
    var toReturn = document.getElementById("x-date-container");

    return toReturn;
}

function getTDateContainer() {
    var toReturn = document.getElementById("t-date-container");

    return toReturn;
}

function intToDecimalString(integer) {
    return isNonNegIntOrStringThereof(integer) ? integer + ".0" : integer;
}

function getIsoEventContainer() {
    var toReturn = document.getElementById("iso-event-container");

    return toReturn;
}

function getOutputContainer() {
    var toReturn = document.getElementById("output-container");

    return toReturn;
}

function destroyFlatPickrInstance(inputElem) {
    if ( inputElem && inputElem._flatpickr ) {
        inputElem._flatpickr.destroy();
        inputElem._flatpickr = null; // destroy may do this anyway, just being safe.
    }
}

function destroyFlatPickrInstances(className) {
    var inputElems = document.getElementsByClassName(className);

    for ( var i = 0; i < inputElems.length; i++ ) {
        var ithInputElem = inputElems[i];

        destroyFlatPickrInstance(ithInputElem);
    }
}

function clearRowsFromTableExceptTopRow(tableElem) {
    while (tableElem.rows.length > 1) {
        tableElem.deleteRow(1);
    }
}

function getClickedRowIndex(event) {
    var target = getEventTargetElem(event);
    var rowIndex = getRowIndex(target);

    return rowIndex;
}

function getRowIndex(elem) {
    var rowIndex = parseInt(elem.getAttribute("row_index"));

    if ( rowIndex >= 0 ) {
        return rowIndex;
    } else {
        // Obviously a little clumsy, but racing through updates here.
        rowIndex = parseInt(elem.parentElement.getAttribute("row_index"));

        return rowIndex;
    }
}

function getRotationLabelHtml(letter, isWhite = false, centered = false) {
    var imgSrc = isWhite ? "./img/spinning_globe_white.png" : "./img/spinning_globe.png";
    var globeHtml = "<img style=\"margin-left:-2px;display:block;width:30px;\" src=\""+imgSrc+"\" />"; //&Delta;

    var styleString = centered ? 'style=\"margin-left: auto; margin-right:auto;\"' : "";
    return "<table "+styleString+"><tr><td style=\"vertical-align:middle;\">"+letter+"</td><td style=\"padding-left:2px; vertical-align:middle;\">"+globeHtml+"</td></tr></table>";
}

function getEventTargetElem(event) {
    event = event ? event : window.event;
    var target = event.target ? event.target : event.srcElement;

    return target;
}

function showToast(message) {
    var newElemWrapper = document.createElement("div");
    document.body.appendChild(newElemWrapper);
    newElemWrapper.className = "toast_wrapper";

    var newElem = document.createElement("div");
    newElem.innerHTML = message;
    newElemWrapper.appendChild(newElem);
    newElem.className = "toast show";

    // After 3 seconds, remove the show class from DIV
    setTimeout(function() {
        // newElem.className = x.className.replace("show", "");
        document.body.removeChild(newElemWrapper);
    }, 2900); // little less than 3 seconds, to avoid a weird CSS animation flicker, in Brave at least.
}

function hideMap() {
    document.getElementById("map-container").style.visibility = "hidden";
}

function showMap(isoEvent) {
    var index = appState.isoEvents.indexOf(isoEvent);
    
    if ( index >= 0 ) {
        document.getElementById("map-container").style.visibility = "visible";
        appState.mostRecentIsoEventMapClick = index;

        var coords = new L.LatLng(isoEvent.lat, isoEvent.long);
        appState.map.setView(coords, DEFAULT_MAP_SELECTION_ZOOM);

        if (appState.map.hasLayer(appState.mapMarkerLayer)) {
            appState.mapMarkerLayer.clearLayers();
        }

        var marker = L.marker(coords);
        appState.mapMarkerLayer.addLayer(marker);
        appState.map.addLayer(appState.mapMarkerLayer);

        updateMapLatLongHud(isoEvent.lat, isoEvent.long);
    }
}

function updateMapLatLongHud(lat, long) {
    var latLongDisplay = document.getElementById("map-current-lat-long");
    lat = constrainLatOrLongValue(lat, COORD_LAT);
    long = constrainLatOrLongValue(long, COORD_LONG);
    latLongDisplay.innerHTML = readableLatLong(lat, long);
}

function showMinifyWarningDialog(continuation) {
    var message = "";
    message += "WARNING: Minifying means that all settings, operations, and other configuration which match current program defaults will be removed from the file. ";
    message += "If defaults ever change in a future version and you open your file in that version, it will use the newer defaults, which can result in different output. ";
    message += "Are you sure you want to enable minifying?"

    showDialog(message, "NO, do not enable minifying", "YES, enable minifying", function() {
        continuation();
    });
}

function hideDialog(dialogElem) {
    if ( dialogElem && dialogElem.parentElement ) {
        dialogElem.parentElement.removeChild(dialogElem);
    }
}

function showOkDialog(message) {
    showDialog(message, "OK");
}

function showDialog(message, noOrOkButtonText, yesButtonText = null, onYes = null, onNo = null, onPreNo = null, cancelable = true) {
    
    var dialogElemScrollContainer = document.createElement("div");

    dialogElemScrollContainer.style.width = "100vw";
    dialogElemScrollContainer.style.height = "100vh";
    dialogElemScrollContainer.style.overflow = "auto";
    dialogElemScrollContainer.style.position = "fixed";
    dialogElemScrollContainer.style.top = "0px";
    dialogElemScrollContainer.style.left = "0px";
    dialogElemScrollContainer.style.zIndex = "100";

    var dialogBackgroundElem = document.createElement("div");
    dialogBackgroundElem.style.position = "absolute";
    dialogBackgroundElem.style.top = "0px";
    dialogBackgroundElem.style.left = "0px";
    dialogBackgroundElem.style.width = "100vw";
    dialogBackgroundElem.style.height = "100vh";
    dialogBackgroundElem.id = "yes-no-dialog-background";
    dialogBackgroundElem.style.backgroundColor = "rgba(0, 0, 0, .7)";

    var dialogElem = document.createElement("table");

    dialogElem.id = "yes-no-dialog-wrapper";

    var row = dialogElem.insertRow(-1);

    var dialogInnerHtml = '<td style="vertical-align:middle; text-align:center;"><div id="yes-no-dialog" style="position:relative;">';
    dialogInnerHtml += '        <label>';
    dialogInnerHtml += '            ' + message;
    dialogInnerHtml += '        </label>';
    dialogInnerHtml += '        <div style="margin-top:15px;">';
    dialogInnerHtml += '            <button class="large_font small_border_radius bordered general_button" style="margin:5px;" id="dialog-no-button" >'+noOrOkButtonText+'</button>';
    if ( yesButtonText ) {
        dialogInnerHtml += '            <button class="large_font small_border_radius bordered general_button" style="margin:5px;" id="dialog-yes-button">'+yesButtonText+'</button>';
    }
    dialogInnerHtml += '        </div>';
    dialogInnerHtml += '  </div></td>';

    row.innerHTML = dialogInnerHtml;

    dialogElemScrollContainer.appendChild(dialogElem);

    document.body.appendChild(dialogElemScrollContainer);

    document.getElementById("yes-no-dialog").parentElement.insertBefore(dialogBackgroundElem, document.getElementById("yes-no-dialog"));

    if ( cancelable ) {
        dialogBackgroundElem.addEventListener("click", function() {
            hideDialog(dialogElemScrollContainer);
        });
    }
    
    document.getElementById("dialog-no-button").addEventListener("click", function() {
        if ( onPreNo ) {
            onPreNo();
        }

        hideDialog(dialogElemScrollContainer);

        if ( onNo ) {
            onNo();
        }
    });
    
    if ( yesButtonText ) {
        document.getElementById("dialog-yes-button").addEventListener("click", function() {
            hideDialog(dialogElemScrollContainer);
    
            if ( onYes ) {
                onYes();
            }
        });
    }
}

function refreshUnsavedChangesReminder(showSaveStatus = true) {
    var unsavedChangesReminderElem = document.getElementById("unsaved-changes-reminder");
    
    if ( unsavedChangesReminderElem ) {
        showSaveStatus = showSaveStatus === true && appState.initialized === true;

        if ( showSaveStatus === true ) {
            unsavedChangesReminderElem.style.display = "inline-block";

            if ( appState.hasUnsavedChanges == true ) {
                unsavedChangesReminderElem.innerHTML = FILE_NOT_SAVED_TEXT;
                unsavedChangesReminderElem.className = "error_color";
                
            } else {
                unsavedChangesReminderElem.innerHTML = FILE_SAVED_TEXT;
                unsavedChangesReminderElem.className = "green_color";
            }
        } else {
            unsavedChangesReminderElem.style.display = "none";
        }
    }

    refreshWindowTitle(showSaveStatus);
}

function getLatOrLongFromElem(latOrLongInputElem) {
    var latOrLong = "";
    
    if ( latOrLongInputElem.classList.contains("lat_input") ) {
        latOrLong = COORD_LAT;
    } else {
        latOrLong = COORD_LONG;
    }

    return latOrLong;
}

function refreshFromLatOrLongInputEvent(latOrLongInputElem, rowIndex) {
    var latOrLong = getLatOrLongFromElem(latOrLongInputElem);
    
    var floatValue = parseLatOrLongString(latOrLongInputElem.value, rowIndex, latOrLong);
    
    if ( floatValue != null ) {
        bubbleOutLatLongInputEventRefresh(floatValue, latOrLong, rowIndex);
        
        return true;
    } else {
        return false;
    }
}

function bubbleOutLatLongInputEventRefresh(floatValue, latOrLong, rowIndex) {
    appState.isoEvents[rowIndex][latOrLong] = floatValue;
    flushChangesToDisk();

    if ( appState.globalOptions.current_iso_event_index == rowIndex ) {
        refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
    } else {
        selectIsoEvent(rowIndex);
    }
}

function addEventListenersToLatOrLongInput(latOrLongInputElem) {

    function finalizeLatLongInput(event) {
        var rowIndex = getClickedRowIndex(event);
        var targetElem = getEventTargetElem(event);

        if ( refreshFromLatOrLongInputEvent(targetElem, rowIndex) ) {
            // Just one last refresh to be sure.
        } else {
            var latOrLong = getLatOrLongFromElem(latOrLongInputElem);

            var errors_out_unused = [];
            var checkLimits = false;
            var floatValue = parseLatOrLongString(latOrLongInputElem.value, rowIndex, latOrLong, errors_out_unused, checkLimits);

            if ( floatValue != null  ) {
                floatValue = constrainLatOrLongValue(floatValue, latOrLong);

                bubbleOutLatLongInputEventRefresh(floatValue, latOrLong, rowIndex);
            } else {
                // Put it back where it was.
                targetElem.value = appState.isoEvents[rowIndex][latOrLong];
            }
        }
    }

    latOrLongInputElem.addEventListener('focus',function(event) {
        var rowIndex = getClickedRowIndex(event);
        selectIsoEvent(rowIndex);
    });

    latOrLongInputElem.addEventListener('blur',function(event) {
        finalizeLatLongInput();
    });

    latOrLongInputElem.addEventListener('keydown',function(event) {
        if (event.which == KEY_CODE__ENTER ) {
            finalizeLatLongInput();
            this.blur();
        }
    });

    latOrLongInputElem.addEventListener("input", function(event) {
        var rowIndex = getClickedRowIndex(event);
        var targetElem = getEventTargetElem(event);
        var valueBefore = targetElem.value;

        refreshFromLatOrLongInputEvent(targetElem, rowIndex);

        targetElem.value = valueBefore;
    });
}

function print(obj, tag = "") {
    tag = tag ? tag + ": " : "";

    if ( typeof obj == "number" || typeof obj == "string" ) {
        console.log(tag + obj);
    } else {
        console.log(tag + JSON.stringify(obj));
    }
}

function printError(obj) {
    print(obj, LOG_TAG__ERROR);
}

function printWarning(obj) {
    print(obj, LOG_TAG__WARNING);
}

function adjustSelectElemWidth(selectElement) {
    
    const selectedOptionText = selectElement.options[selectElement.selectedIndex].text;

    // Create a temporary span to measure the text width
    const tempSpan = document.createElement('span');
    tempSpan.style.position = 'fixed';
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.whiteSpace = 'nowrap'; // Prevent text wrapping
    tempSpan.textContent = selectedOptionText;

    document.body.appendChild(tempSpan); // Append to body to measure

    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan); // Remove after measuring

    // Set the select element's width (add some padding if needed)
    selectElement.style.width = (textWidth + 30) + 'px'; // +20 for padding/arrow
}

function fillInSelectElem(selectElem, optionEnumArray, nameFunction) {
    for ( var i = 0; i < optionEnumArray.length; i++ ) {
        var ithEnum = optionEnumArray[i];
        var option = document.createElement("option");
        option.text = nameFunction(ithEnum);
        option.value = ithEnum;

        var actuallyAdd = true;

        if ( actuallyAdd === true ) {
            selectElem.add(option);
        }
    }
}

function refreshFromFilterInputEvent(inputElem, rowIndex, serializationKey) {
    var floatValue = parseFloatString(inputElem.value, rowIndex, serializationKey);
    
    if ( floatValue != null ) {
        bubbleOutFilterInputEventRefresh(floatValue, serializationKey);
        
        return true;
    } else {
        return false;
    }
}

function bubbleOutFilterInputEventRefresh(floatValue, serializationKey) {
    getCurrentIsoEvent()[serializationKey] = floatValue;
    flushChangesToDisk();

    refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
}

function getAllChildCheckboxes(baseClassName) {
    return document.getElementsByClassName(baseClassName);
}

function setUpMasterCheckbox(checkBoxConfig) {

    var baseElemId = checkBoxConfig.baseElemId;
    var baseClassName = checkBoxConfig.baseClassName;
    var title = checkBoxConfig.title;
    
    var headerElemId = baseElemId + "-header";

    var headerElem = document.getElementById(headerElemId);

    if ( headerElem ) {

        var masterElemId = baseElemId + "-master";
        var masterClassName = baseClassName + "_master";
        var checkboxHtml = '<input type="checkbox" style="" id="'+masterElemId+'" class="'+masterClassName+'" title="'+title+'">';

        headerElem.innerHTML = checkboxHtml;

        var masterElem = document.getElementById(masterElemId);
        masterElem.addEventListener("change", function() {
            var allChildCheckboxes = getAllChildCheckboxes(baseClassName);
            var shouldNowBeChecked = this.checked;

            for ( var i = 0; i < allChildCheckboxes.length; i++ ) {
                var rowIndex = i;
                checkBoxConfig.onChildNowCheckedOrNot(rowIndex, shouldNowBeChecked);
            }

            checkBoxConfig.onMasterCheckboxChangeComplete();
        });
    }
}

function setUpIsoEventFieldCheckboxEventListeners() {
    function initIsoEventSerializedFieldCheckbox(index, masterCheckboxConfig) {
        var serializedFieldArray = masterCheckboxConfig == MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS ? SERIALIZED_FILTER_FIELDS : SERIALIZED_CHART_OPTION_FIELDS;
        var ithField = serializedFieldArray[index];

        document.getElementById(ithField.elemId).addEventListener("click", function() {

            var inputBoxNowChecked = this.checked;

            masterCheckboxConfig.onChildNowCheckedOrNot(index, inputBoxNowChecked);
            masterCheckboxConfig.onMasterCheckboxChangeComplete(index);
        });
    }

    var filterTableElem = document.getElementById("iso-event-filter-container");
    var chartOptionTableElem = document.getElementById("iso-event-chart-options-container");

    for ( var i = 0; i < ALL_SERIALIZED_FIELDS.length; i++ ) {
        var ithField = ALL_SERIALIZED_FIELDS[i];

        var indexInFilterFields = SERIALIZED_FILTER_FIELDS.indexOf(ithField);
        var indexInChartOptionFields = SERIALIZED_CHART_OPTION_FIELDS.indexOf(ithField);

        var isFilterField = indexInFilterFields >= 0;
        var masterCheckboxConfig = isFilterField ? MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS : MASTER_CHECKBOX_CONFIG__CHART_OPTIONS;

        var ithTableElem = isFilterField ? filterTableElem : chartOptionTableElem;

        var ithTableRow = ithTableElem.insertRow(-1);

        var rowShortName = isFilterField ? getRowShortNameHtml("F", indexInFilterFields) : getRowShortNameHtml("C", indexInChartOptionFields);

        var checkboxClass = isFilterField ? "iso_event_filter_checkbox" : "iso_event_chart_option_checkbox"

        var ithRowHtml = '';
        ithRowHtml += '<tr>';
        ithRowHtml += '<td class="col_sub_header_format_for_row" style="width:0%;"><div class="input_row_name">'+rowShortName+'</div></td>';
        ithRowHtml += '<td class="col_format col_with_input_left_right_padding filter_description_col" style="border-top:none;">'+ithField.name+'</td>';
        ithRowHtml += '<td class="col_format col_with_input_left_right_padding filter_description_col" style="border-top:none;"><input type="checkbox" style="" id="'+ithField.elemId+'" class="'+checkboxClass+'" title="'+ithField.title+'"></td>';
        ithRowHtml += '</tr>';

        ithTableRow.innerHTML = ithRowHtml;

        applyToolTipToElemId(ithField.elemId);

        var indexIntoFieldArray = isFilterField ? indexInFilterFields : indexInChartOptionFields;
        initIsoEventSerializedFieldCheckbox(indexIntoFieldArray, masterCheckboxConfig);

        if ( ithField.numericDefault != null ) {
            setUpFilterInputEventListeners(ithField.elemIdForInput, ithField.serializationKeyForValue);
        }
    }

    var lastTableRowForFilter = filterTableElem.insertRow(-1);
    lastTableRowForFilter.innerHTML = "<td class='filter_description_col' colspan='3' style='background-color:#BBBBBB; text-align: center;' colspan='3'><div id='z-dates-hidden'></div></td>";
}

function refreshDatesHidden(dateCount) {
    var datesPluralOrSingular = dateCount == 1 ? "Z-Date" : "Z-Dates";

    var datesHiddenElem = document.getElementById("z-dates-hidden");

    var stale = appState.latestResults.stale === true;
    var finalValue = stale ? "-" : dateCount;

    // var html = "<b>" + dateCount + " " + datesPluralOrSingular + " hidden</b>";
    var html = "<b>Z-Dates hidden: " + finalValue + "</b>"
    datesHiddenElem.innerHTML = html;
}

function numberWithCommas(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setUpFilterInputEventListeners(elemId, serializationKeyForValue) {
    var inputElem = document.getElementById(elemId);

    function finalizeIsoEventFilterInput(domEvent, serializationKeyForValue) {
        var isoEventIndex = appState.globalOptions.current_iso_event_index;
        var targetElem = getEventTargetElem(domEvent);

        if ( refreshFromFilterInputEvent(targetElem, isoEventIndex, serializationKeyForValue) ) {
            // Just one last refresh to be sure.
        } else {
            var errors_out_unused = [];
            var floatValue = parseFloatString(targetElem.value, isoEventIndex, serializationKeyForValue, errors_out_unused);

            if ( floatValue != null ) {
                bubbleOutFilterInputEventRefresh(floatValue, serializationKeyForValue);
            } else {
                // Put it back where it was.
                targetElem.value = appState.isoEvents[isoEventIndex][serializationKeyForValue];
            }
        }
    }

    inputElem.addEventListener('blur',function(domEvent) {
        finalizeIsoEventFilterInput(domEvent, serializationKeyForValue);
    });

    inputElem.addEventListener('keydown', function(domEvent) {
        if (domEvent.which == KEY_CODE__ENTER ) {
            // finalizeIsoEventFilterInput(domEvent, serializationKeyForValue);
            this.blur();
        }
    });

    // inputElem.addEventListener("input", function(domEvent) {
    //     var targetElem = getEventTargetElem(domEvent);
    //     var valueBefore = targetElem.value;
        
    //     var isoEventIndex = appState.globalOptions.current_iso_event_index;

    //     refreshFromFilterInputEvent(targetElem, isoEventIndex, serializationKeyForValue);

    //     targetElem.value = valueBefore;
    // });
}

function handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates = null) {
    var numberOfJustChangedFields = 0;

    for (var ithFieldVarName in appState.justChangedField ) {
        // check if the property/key is defined in the object itself, not in parent
        if ( appState.justChangedField.hasOwnProperty(ithFieldVarName) ) {
            if ( appState.justChangedField[ithFieldVarName] === true ) {
                numberOfJustChangedFields += 1;
            }
        }
    }
    
    for (var ithFieldVarName in appState.justChangedField ) {
        // check if the property/key is defined in the object itself, not in parent
        if ( appState.justChangedField.hasOwnProperty(ithFieldVarName) ) {
            if ( appState.justChangedField[ithFieldVarName] === true ) {

                var fieldChangeAcked = false;

                var actuallyShowToast = numberOfJustChangedFields == 1;

                if ( actuallyShowToast ) {
                    var isChartOptionField = false;

                    for ( var i = 0; i < SERIALIZED_CHART_OPTION_FIELDS.length; i++ ) {
                        var ithFilterField = SERIALIZED_CHART_OPTION_FIELDS[i];

                        if ( ithFilterField.varName == ithFieldVarName ) {
                            isChartOptionField = true;
                        }
                    }

                    var isNowEnabled = isIsoEventFieldEnabled(isoEvent, ithFieldVarName) === true;

                    if ( isChartOptionField === true ) {
                        if ( indicatorsThatOverlappedDates ) {
                            if ( isNowEnabled ) {
                                if ( indicatorsThatOverlappedDates[ithFieldVarName] === true ) {
                                } else {
                                    if ( ithFieldVarName != "SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES" && ithFieldVarName != "SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART" ) {
                                        showToast("No nearby dates found for indicator: " + getIsoEventFieldReadableTextOnlyName(ithFieldVarName));
                                    } else {
                                        if ( ithFieldVarName == "SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES" ) {
                                            var hideDatesFromGlobalOptions = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__DATES] === true;
                                        
                                            if ( hideDatesFromGlobalOptions === true ) {
                                                showToast("Still hiding Chart Dates because 'Z-Dates' column is hidden.");
                                            }
                                        }
                                    }
                                }
                            }

                            fieldChangeAcked = true;
                        }
                    } else {
                        // SERIALIZED_FIELD__ISO_EVENT_FILTER_NOT_ON_T_DATE has been removed, but leaving this snippet here as 
                        // an example of how to show a toast when a filter is enabled/disabled under certain conditions.
                        // if ( isNowEnabled ) {
                        //     if ( ithFieldVarName == "SERIALIZED_FIELD__ISO_EVENT_FILTER_NOT_ON_T_DATE" ) {
                        //         if ( isoEvent.t_dates.length == 0 ) {
                        //             showToast("NOTE: At least one T-Date must be added for this Filter to take effect.");
                        //         }
                        //     }
                        // }

                        fieldChangeAcked = true;
                    }
                } else {
                    // TODO: Try to pipe these kinds of things to an activity log, ultimately. Toasts are limited.
                }
                
                if ( fieldChangeAcked === true ) {
                    appState.justChangedField[ithFieldVarName] = false;
                }
            }
        }
    }
}