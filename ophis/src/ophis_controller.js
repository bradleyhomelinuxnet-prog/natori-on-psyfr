

function getCurrentIsoEvent() {
    var currentIndex = 0;

    if ( appState.globalOptions.current_iso_event_index ) {
        currentIndex = appState.globalOptions.current_iso_event_index;
    } else {
        appState.globalOptions.current_iso_event_index = 0;
    }

    return appState.isoEvents[currentIndex];
}

function factoryReset() {
    if ( confirm('Are you sure you want to reset the entire program and clear all data?')) {
        localStorage.clear();
        
        if ( isRunningElectron() ) {
            electronBridge.resetProgram();
        } else {
            window.location.reload(true);
        }
    } else {
        // User clicked cancel or whatever
    }
}

function refreshMenuOptions() {
    if ( isRunningElectron() ) {
       var operationsColVisibleChecked = appState.globalOptions[GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY] === false;
       var prettifyOphFilesChecked = appState.globalOptions[GLOBAL_OPTION__PRETTIFY_OPH_FILES];
       var minifyOphFilesChecked = appState.globalOptions[GLOBAL_OPTION__MINIFY_OPH_FILES];
        window.electronBridge.refreshMenuOptions(operationsColVisibleChecked, prettifyOphFilesChecked, minifyOphFilesChecked);
    }
}

function toggleGlobalBooleanOptionWithNoFileChangeRequired(globalOption) {
    var shouldFlushChangesToDisk = false;
    setGlobalOption(globalOption, appState.globalOptions[globalOption] === false, shouldFlushChangesToDisk);

    refreshMenuOptions();
}

function toggleOperationsColVisible() {
    toggleGlobalBooleanOptionWithNoFileChangeRequired(GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY);
    
    var preserveScrollPosition = false;
    refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__NO_CHANGE);
}

function togglePrettifyOphFiles() {
    toggleGlobalBooleanOptionWithNoFileChangeRequired(GLOBAL_OPTION__PRETTIFY_OPH_FILES);
}

function toggleMinifyOphFiles() {
    if ( appState.globalOptions[GLOBAL_OPTION__MINIFY_OPH_FILES] === false ) {
        showMinifyWarningDialog(function() {
            toggleGlobalBooleanOptionWithNoFileChangeRequired(GLOBAL_OPTION__MINIFY_OPH_FILES);
        });
    } else {
        toggleGlobalBooleanOptionWithNoFileChangeRequired(GLOBAL_OPTION__MINIFY_OPH_FILES);
    }
}

function getLastIsoEvent() {
    if ( appState.isoEvents ) {
        return appState.isoEvents[appState.isoEvents.length-1];
    } else {
        return null;
    }
}

function swapInNewIsoEventArray(newIsoEvents, successMessage) {
    appState.isoEvents = newIsoEvents;
    if ( appState.globalOptions.current_iso_event_index > appState.isoEvents.length-1 ) {
        appState.globalOptions.current_iso_event_index = 0;
    }

    if ( isRunningHeadless() == false ) {
        refreshIsoEvents(REFRESH_TYPE__HARD, OPHIS_INPUT_CHANGE__FORCE);
        markChangesSaved();

        var forceFlush = false;
        flushChangesToDisk(forceFlush);

        if ( successMessage ) {
            showToast(successMessage);
        }
    }

    appState.loadedFromDisk = true;
}

function refreshIsoEvents(refreshType, ophisInputChange) {
    if ( refreshType == REFRESH_TYPE__HARD ) {
        rebuildIsoEventTableRows();
    }

    updateLatLongInputElemValues();

    var preserveScrollPosition = false;
    refreshXDates(refreshType, preserveScrollPosition, ophisInputChange);
}

function refreshXDateCounts() {
    var xDateCountElems = document.getElementsByClassName("x_date_count");
    for ( var i = 0; i < xDateCountElems.length; i++ ) {
        var ithDateCountElem = xDateCountElems[i];
        var ithIsoEvent = appState.isoEvents[i];
        var xDateCount = ithIsoEvent.x_dates.length;
        ithDateCountElem.innerHTML = xDateCount;
        ithDateCountElem.title = "This Iso-Event has " + xDateCount + " X-Dates";
    }
}

function createNewIsoEvent(startingName, eventScope, startingLat, startingLong, locationEnabled) {
    var newIsoEvent = {
        name: startingName,
        notes: "",
        x_dates: [],
        t_dates: [],
        lat: startingLat,
        long: startingLong,
        location_enabled: locationEnabled,
        scope: eventScope,
        type: DEFAULT_EVENT_TYPE,
        operations: cloneDefaultOperationsForAppVersionGte10(),
        scoring_system: SCORING_SYSTEM__GTE_V8
    };

    for ( var i = 0; i < ALL_SERIALIZED_FIELDS.length; i++ ) {
        var ithFilterField = ALL_SERIALIZED_FIELDS[i];
        newIsoEvent[ithFilterField.serializationKey] = ithFilterField.enabledByDefault;

        if ( ithFilterField.numericDefault ) {
            newIsoEvent[ithFilterField.serializationKeyForValue] = ithFilterField.numericDefault;
        }
    }

    if ( isFlagEnabled(FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS) ) {
        addInitialDatesToIsoEvent(newIsoEvent);
    }

    return newIsoEvent;
}

function addIsoEvent(autoSelectNewEvent = true) {

    var currentIsoEvent = getLastIsoEvent();

    var startingName = "Event";

    if ( currentIsoEvent && currentIsoEvent.name ) {
        var nameSplit = currentIsoEvent.name.split(" ");
        var lastNameComponent = nameSplit[nameSplit.length-1];

        if ( isNonNegIntOrStringThereof(lastNameComponent) ) {
            var lastNameComponentAsInt = parseInt(lastNameComponent);
            lastNameComponentAsInt++;

            nameSplit[nameSplit.length-1] = lastNameComponentAsInt;
            startingName = nameSplit.join(" ");
        } else {
            startingName = nameSplit.join(" ") + " 2";
        }
    } else {
        startingName = "Event 1";
    }

    var startingLat = DEFAULT_LAT;
    var startingLong = DEFAULT_LONG;

    var locationEnabledByDefault = true;
    var eventScope = EVENT_SCOPE__DAYS;

    if ( appState.isoEvents.length > 0 ) {
        var latestEvent = appState.isoEvents[appState.isoEvents.length-1];
        startingLat = latestEvent.lat;
        startingLong = latestEvent.long;
        locationEnabledByDefault = latestEvent.scope == EVENT_SCOPE__HH_MM && latestEvent.location_enabled;
        eventScope = latestEvent.scope;
    } else {
        locationEnabledByDefault = eventScope == EVENT_SCOPE__HH_MM
    }

    if ( locationEnabledByDefault === false ) {
        startingLat = 0;
        startingLong = 0;
    }

    var newIsoEvent = createNewIsoEvent(startingName, eventScope, startingLat, startingLong, locationEnabledByDefault);

    appState.isoEvents.push(newIsoEvent);

    if ( autoSelectNewEvent === true ) {
        appState.globalOptions.current_iso_event_index = appState.isoEvents.length - 1;

        setSkinModeBasedOnCurrentEventType();
    }

    flushChangesToDisk();

    refreshIsoEvents(REFRESH_TYPE__HARD, autoSelectNewEvent ? OPHIS_INPUT_CHANGE__FORCE : OPHIS_INPUT_CHANGE__NO_CHANGE);
}

function addInitialDatesToIsoEvent(isoEvent) {
    var insertIndex = -1; // means push to end.
    var refreshView = false; // we will refresh right after this all at once.
    var flushChanges = false; // we will also presumably flush after this if needed as well.
    addXDate(isoEvent, insertIndex, refreshView, flushChanges);
    addXDate(isoEvent, insertIndex, refreshView, flushChanges);
}

function resetIsoEventFieldOptions(fieldArray) {

    var currentIsoEvent = getCurrentIsoEvent();

    for ( var i = 0; i < fieldArray.length; i++ ) {
        var ithFilterField = fieldArray[i];

        currentIsoEvent[ithFilterField.serializationKey] = ithFilterField.enabledByDefault;

        if ( ithFilterField.numericDefault != null ) {
            currentIsoEvent[ithFilterField.serializationKeyForValue] = ithFilterField.numericDefault;
        }
    }

    flushChangesToDisk();

    var preserveScrollPosition = false;
    refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
}

function xDateToNativeDateForController(eventScope, xDate, lat_nullable = null, long_nullable = null) {
    var nullTimezone = null;
    var lockDayScopeToGmt = false;
    return xDateToNativeDate(eventScope, xDate, lat_nullable, long_nullable, [], nullTimezone, lockDayScopeToGmt)
}

function addOperation(currentIsoEvent, insertIndex = -1) {
    if ( Array.isArray(currentIsoEvent.operations) ) {
        // all good;
    } else {
        currentIsoEvent.operations = [];
    }

    var pushToEnd = insertIndex == -1;
    var operationToAdd = newOperation("X1+Y", POINTS__BETA_OPERATION_MATCH, OPERATION_ENABLED_TRUE);
    
    if ( pushToEnd === true ) {
        currentIsoEvent.operations.push(operationToAdd);
    } else {
        currentIsoEvent.operations.splice(insertIndex, 0, operationToAdd);
    }

    flushChangesToDisk();
    
    var preserveScrollPosition = false;
    refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
}

function addXDate(currentIsoEvent, insertIndex = -1, refreshView = true, flushChanges = true, inputDateType = INPUT_DATE_TYPE__X_DATE) {

    var isForXDates = inputDateType == INPUT_DATE_TYPE__X_DATE;
    var inputDateArray = isForXDates ? currentIsoEvent.x_dates : currentIsoEvent.t_dates;

    var currentDate = getCurrentNativeDate();
    var defaultDate = null;

    if ( currentIsoEvent.scope != EVENT_SCOPE__HH_MM ) {
        // var highNoon = (currentDate.getTime() - currentDate.getTime() % MILLIS_PER_DAY) + HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE*MILLIS_PER_HOUR;
        // currentDate.setTime(highNoon);
        currentDate.setHours(HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE);
        currentDate.setMinutes(0);
        currentDate.setSeconds(0);
    }

    var possiblyNullLat = null;
    var possiblyNullLong = null;

    var minimumDaysBetweenFirstTwoXDates = MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES;

    var pushToEnd = insertIndex == -1;
    
    if ( pushToEnd === true ) {
        if ( inputDateArray.length == 0 ) {
            defaultDate = new Date(currentDate.getTime() - minimumDaysBetweenFirstTwoXDates * MILLIS_PER_DAY);
        } else {
            var mostRecentXDate = inputDateArray[inputDateArray.length-1];
            
            var mostRecentNativeDate = xDateToNativeDateForController(currentIsoEvent.scope, mostRecentXDate, possiblyNullLat, possiblyNullLong);
    
            if ( inputDateArray.length == 1 ) {
                defaultDate = new Date(mostRecentNativeDate.getTime() + minimumDaysBetweenFirstTwoXDates * MILLIS_PER_DAY);
            } else {
                defaultDate = new Date(mostRecentNativeDate.getTime() + MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES * MILLIS_PER_DAY);
            }
        }
    } else {
        var xDateAtInsertIndex = inputDateArray[insertIndex];
        var xDateAtInsertIndex_native = xDateToNativeDateForController(currentIsoEvent.scope, xDateAtInsertIndex, possiblyNullLat, possiblyNullLong);

        if ( insertIndex == 0 ) {
            defaultDate = new Date(xDateAtInsertIndex_native.getTime() - minimumDaysBetweenFirstTwoXDates * MILLIS_PER_DAY);
        } else if ( insertIndex == 1 ) {
            var xDateAtZero = inputDateArray[0];
            var xDateAtZero_native = xDateToNativeDateForController(currentIsoEvent.scope, xDateAtZero, possiblyNullLat, possiblyNullLong);

            defaultDate = new Date(xDateAtZero_native.getTime() + minimumDaysBetweenFirstTwoXDates * MILLIS_PER_DAY);
        } else {
            defaultDate = new Date(xDateAtInsertIndex_native.getTime() - MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES * MILLIS_PER_DAY);
        }
    }

    var newXDateAsNative = nativeDateToXDate(defaultDate, possiblyNullLat, possiblyNullLong);
    newXDateAsNative.enabled = true;

    function finishXDateAdd() {
        if ( pushToEnd === true ) {
            inputDateArray.push(newXDateAsNative);
        } else {
            inputDateArray.splice(insertIndex, 0, newXDateAsNative);
        }
    
        if ( flushChanges === true ) {
            flushChangesToDisk();
        }
        
        if ( refreshView === true ) {
            var preserveScrollPosition = true;
            refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
        }
    }

    if ( inputDateArray.length == 2 ) {
        // alert("Please confirm that you have chosen the correct Type (Personal, Markets, etc.) for this Event, since results may differ based on the Event Type.");

        finishXDateAdd();
    } else {
        finishXDateAdd();
    }
}

function refreshXDateSunsets(inputDateType) {
    var isForXDates = inputDateType == INPUT_DATE_TYPE__X_DATE;

    if ( isPriorSunsetDisplayEnabled() ) {
        var currentIsoEvent = getCurrentIsoEvent();
        var priorSunsetDisplayClassSpecific = isForXDates ? "prior_sunset_display_x_date" : "prior_sunset_display_t_date";

        var sunsetElems = document.getElementsByClassName(priorSunsetDisplayClassSpecific);

        var inputDateArray = isForXDates ? currentIsoEvent.x_dates : currentIsoEvent.t_dates;

        if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
            var lat = currentIsoEvent.lat;
            var long = currentIsoEvent.long;
        
            for ( var i = 0; i < inputDateArray.length; i++ ) {
                var ithXDate = inputDateArray[i];
                var ithXDate_nativeUtc = xDateToNativeDate(currentIsoEvent.scope, ithXDate, lat, long);
        
                var ithPriorSunset_nativeUtc = getSunsetNativeUtcDateBefore_withCache(ithXDate_nativeUtc, lat, long);
                var ithPriorSunset_readableString = nativeDateToReadableString_dateAndTime(ithPriorSunset_nativeUtc, lat, long);
        
                sunsetElems[i].innerHTML = ithPriorSunset_readableString;
            }
        } else {
            if ( isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL) ) {
                for ( var i = 0; i < inputDateArray.length; i++ ) {
                    sunsetElems[i].innerHTML = "(not applicable)";
                }
            }
        }
    }
}

function refreshIsoEventFiltersAndChartOptions() {
    var currentIsoEvent = getCurrentIsoEvent();

    function refreshIndividualIsoEventFilterCheckBox(elemId, serializationKey) {
        var elem = document.getElementById(elemId);

        if ( currentIsoEvent[serializationKey] === true ) {
            elem.checked = true;
        } else {
            elem.checked = false;
        }
    }

    for ( var i = 0; i < ALL_SERIALIZED_FIELDS.length; i++ ) {
        var ithFilterField = ALL_SERIALIZED_FIELDS[i];

        refreshIndividualIsoEventFilterCheckBox(ithFilterField.elemId, ithFilterField.serializationKey);

        if ( ithFilterField.numericDefault ) {
            var currentValue = parseFloatElseNeg1(currentIsoEvent[ithFilterField.serializationKeyForValue]);
            document.getElementById(ithFilterField.elemIdForInput).value = currentValue >= 0 ? currentValue : ithFilterField.numericDefault;
        }
    }
}

function refreshIsoEventRowBackgrounds(isoEventIndex) {
    var isoEventRows = document.getElementsByClassName("iso_event_row");
    for ( var i = 0; i < isoEventRows.length; i++ ) {
        var ithElem = isoEventRows[i];
        
        if ( isoEventRows.length > 1 && i == isoEventIndex ) {
            ithElem.setAttribute("row_selected", "true");
        } else {
            ithElem.setAttribute("row_selected", "false");
        }
    }
}

function selectIsoEvent(isoEventIndex) {
    setGlobalOption("current_iso_event_index", isoEventIndex);

    var radioElems = document.getElementsByClassName("row_radio_button");
    radioElems[isoEventIndex].checked = true;

    setSkinModeBasedOnCurrentEventType();

    var preserveScrollPosition = false;
    // Originally forced a recalc when switching events, but it's kind of a pain if you're e.g. just checking X-Dates.
    // refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__FORCE);
    refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);

    refreshIsoEventRowBackgrounds(isoEventIndex);
}

function refreshXDates(refreshType, preserveScrollPosition = false, ophisInputChange = OPHIS_INPUT_CHANGE__CHANGED) {
    var currentIsoEvent = getCurrentIsoEvent();
    
    refreshIsoEventFiltersAndChartOptions();
    
    if ( refreshType == REFRESH_TYPE__HARD ) {
        rebuildXDateTableRows(preserveScrollPosition, INPUT_DATE_TYPE__X_DATE);
        rebuildXDateTableRows(preserveScrollPosition, INPUT_DATE_TYPE__T_DATE);

        var currentIsoEventShortName = getRowShortNameHtml("E", appState.globalOptions.current_iso_event_index);
        document.getElementById("x-dates-col-header").innerHTML = currentIsoEventShortName + " X-Dates";
        document.getElementById("t-dates-col-header").innerHTML = currentIsoEventShortName + " T-Dates";
        document.getElementById("iso-event-filter-header").innerHTML = currentIsoEventShortName + " Filters";

        document.getElementById("iso-event-chart-options-header").innerHTML = currentIsoEventShortName + " Chart Config";

        refreshXDateCounts();
    }

    var resetXDatesButton = document.getElementById("reset-x-dates-button");

    if ( currentIsoEvent.x_dates.length > 0 ) {
        enableRowButton(resetXDatesButton);
    } else {
        disableRowButton(resetXDatesButton);
    }

    refreshXDateSunsets(INPUT_DATE_TYPE__X_DATE);
    refreshXDateSunsets(INPUT_DATE_TYPE__T_DATE);

    var hasLatestResults = false;

    if ( appState.latestResults && getDictionarySize(appState.latestResults) > 0 ) {
        hasLatestResults = true;
    } else {
        hasLatestResults = false;
    }

    var actuallyRunOphis = true;

    if ( ophisInputChange === OPHIS_INPUT_CHANGE__FORCE ) {
        actuallyRunOphis = true;
    } else if ( hasLatestResults === false ) {
        actuallyRunOphis = true;
    } else {
        if ( getCurrentScreen() == OPHIS_SCREEN__Z_DATES ) {
            if ( ophisInputChange == OPHIS_INPUT_CHANGE__NO_CHANGE ) {
                actuallyRunOphis = false;
            } else {
                actuallyRunOphis = appState.globalOptions[GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES];
            }
        } else {
            actuallyRunOphis = false;
        }
    }

    var results = null;

    if ( actuallyRunOphis === true ) {
        results = runOphisOnEvent(currentIsoEvent);
        results.stale = false;
    } else {
        console.log("Skipping Ophis run and using previous results.");
        var wasAlreadyStale = appState.latestResults.stale;
        results = appState.latestResults;

        if ( ophisInputChange == OPHIS_INPUT_CHANGE__NO_CHANGE ) {
            results.stale = wasAlreadyStale;
        } else {
            results.stale = true;
        }
    }

    refreshCurrentPage(refreshType, results);

    removeAllDisplayedToolTips();
}