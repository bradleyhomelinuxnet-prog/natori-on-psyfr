

// Mutable global app state.
var appState = {
    startupErrors: [],
    hasUnsavedChanges: false,
    isSignedIn: false,
    isoEvents: [],
    mostRecentIsoEventMapClick:0,
    chart: null, // Created lazily just-in-time, per event.
    map: FEATURE_FLAG__SHOW_LOCATION == true ? L.map('map').setView([/*lat*/0, /*long*/0], DEFAULT_MAP_SELECTION_ZOOM) : null,
    mapMarkerLayer: FEATURE_FLAG__SHOW_LOCATION == true ? L.layerGroup() : null,
    loadedFromDisk: false,
    viewUpdateCount: 0,
    justChangedField: {},
    globalOptions: {},
    intialized: false,
    blockChartFlushToDisk: false,
    externalFilePath: null,
    initialized: false,
    needToFinalizeAppState: false,
    previousScreen: null,
    headless: false,
    headless_output_type: OPH_HEADLESS_OUTPUT_TYPE__DEFAULT,
    headless_output_path: "",
    headless_current_epoch_millis: DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS,
    headless_multiple_files: false,
    filePathFromMainArgs: null,
    fileInputValidationMode: FILE_INPUT_VALIDATION_MODE__LOOSE,
    latestResults: {}
}

// Default starting values. May be updated very shortly by disk loads.
appState.globalOptions[GLOBAL_OPTION__LOCAL_TIME_OFFSET_IN_MILLIS] = 0;
appState.globalOptions[GLOBAL_OPTION__START_SCREEN] = OPHIS_SCREEN__ABOUT;
appState.globalOptions[GLOBAL_OPTION__SKIN_MODE] = DEFAULT_SKIN_MODE;
appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] = "";

for ( var i = 0; i < GLOBAL_BOOLEAN_OPTIONS.length; i++ ) {
    var ithGlobalBooleanOption = GLOBAL_BOOLEAN_OPTIONS[i];

    if ( ithGlobalBooleanOption == GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES || ithGlobalBooleanOption == GLOBAL_OPTION__PRETTIFY_OPH_FILES ) {
        appState.globalOptions[ithGlobalBooleanOption] = true;
    } else {
        appState.globalOptions[ithGlobalBooleanOption] = false;
    }
}

function init(filePathFromMainArgs = null) {
    init_step1_getAppVersion(filePathFromMainArgs)
}

function init_step1_getAppVersion(filePathFromMainArgs) {

    console.log("init_step1_getAppVersion()");

    // The headless flag has to be parsed first, to route logging pipes appropriately.
    appState.headless = getQueryParamBool("headless", false);
    toggleConsoleLogOverride();

    appState.filePathFromMainArgs = filePathFromMainArgs;
    appState.headless_output_path = getQueryParamString("headless_output_path", "");
    appState.headless_output_type = getHeadlessOutputTypeFromQueryParams();
    appState.fileInputValidationMode = getInputValidationModeFromQueryParams();
    appState.headless_multiple_files = getQueryParamBool("headless_multiple_files", false);

    console.log("Using file input validation mode: " + appState.fileInputValidationMode);

    var rawHeadlessCurrentEpochTimeMillis = getQueryParamString("headless_current_epoch_millis");
    appState.headless_current_epoch_millis = getQueryParamInt("headless_current_epoch_millis", DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS);

    if ( rawHeadlessCurrentEpochTimeMillis && rawHeadlessCurrentEpochTimeMillis != "" ) {
        if ( appState.headless_current_epoch_millis == DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS ) {
             exitHeadlessWithError("--current-epoch-millis had an invalid value: " + rawHeadlessCurrentEpochTimeMillis);
             return;
        }
    }

    var cacheBuster = Math.floor(Math.random() * 99999999);
    getFileContents("./package.json?v="+cacheBuster, function(contents) {
        var versionFromFile = APP_VERSION;

        if ( contents ) {
            try {
                var packageJson = JSON.parse(contents);
                versionFromFile = packageJson.version ? packageJson.version : versionFromFile;
            } catch(error) {
                printWarning("Error parsing package.json.");
            }
        } else {
            printWarning("Could not get version from package.json.");
            // document.title = "Ophis";
            // alert("Could not determine app version, cannot continue.");
        }

        var firstComponent = getComponentOfSemVer(versionFromFile, 0);
        var secondComponent = getComponentOfSemVer(versionFromFile, 1);

        if ( secondComponent && secondComponent != "0" ) {
            APP_VERSION = firstComponent + "." + secondComponent;
        } else {
            APP_VERSION = firstComponent;
        }

        var indexOfRc = versionFromFile.indexOf("rc");

        if ( indexOfRc >= 0 ) {
            var rcComponent = versionFromFile.substring(indexOfRc, versionFromFile.length);

            if ( rcComponent ) {
                rcComponent = rcComponent.replaceAll(".", "");

                APP_VERSION += rcComponent;
            }
        }

        init_step2_signIn(filePathFromMainArgs);
    });
}

function init_step2_signIn(filePathFromMainArgs, account = "", errorMessage = "") {

    console.log("init_step2_signIn()");

    if ( isRunningHeadless() || isRunningElectron() == false || isFlagEnabled(FEATURE_FLAG__REQUIRE_SIGN_IN) == false ) {
        init_step3_loadImages(filePathFromMainArgs);
        return;
    }

    document.getElementById("initial-loading-container").style.visibility = "hidden";

    var message = "<div>Please enter account password:</div>";
    message += "<input value='"+account+"' type='password' style='box-sizing:border-box; margin-top:30px;' class='password_input' id='account-password-input'/>"

    // if ( errorMessage ) {
    //     // showToast(message);
    // }
    errorMessage = errorMessage ? errorMessage : "&nbsp;"
    message += "<div style='' class='error_color'>"+errorMessage+"</div>";

    var buttonText = "Sign In";
    var yesButtonText = null;
    var onYes = null;
    var cancelable = false;

    var account = "";

    var onPreNo = function() {
        account = document.getElementById("account-password-input").value;
    }

    var onNoOrOk = function() {
        if ( account ) {

            var hash = hashAccount(account);
        
            var hashMatches = false;
    
            for ( var i = 0; i < ACCOUNT_HASHES.length; i++ ) {
                var ithAccountHash = ACCOUNT_HASHES[i];
    
                if ( hash == ithAccountHash ) {
                    hashMatches = true;
                    break;
                }
            }
    
            if ( hashMatches === true ) {
                init_step3_loadImages(filePathFromMainArgs);
            } else {
                init_step2_signIn(filePathFromMainArgs, account, "Invalid password, try again.");
            }
        } else {
            init_step2_signIn(filePathFromMainArgs, account, "Password cannot be empty.");
        }
    }

    showDialog(message, buttonText, yesButtonText, onYes, onNoOrOk, onPreNo, cancelable);
}

function disableTabIndicesOnElems(elems) {
    for (let i = 0; i < elems.length; i++) {
        elems[i].tabIndex = -1;
    }
}

function isRunningHeadless() {
    return appState.headless === true;
}

function disableTabIndeces() {
    disableTabIndicesOnElems(document.getElementsByTagName('button'));
    disableTabIndicesOnElems(document.querySelectorAll('input[type="checkbox"]'));
}

function init_step3_loadImages(filePathFromMainArgs) {

    console.log("init_step3_loadImages()");

    appState.isSignedIn = true;

    if ( isRunningHeadless() ) {
        console.log("Skipping image load for headless mode.");
        init_step4_selfCheck(filePathFromMainArgs);
    } else {

        if ( isRunningElectron() ) {
            window.electronBridge.onSignedIn();
        }

        document.getElementById("initial-loading-container").style.visibility = "visible";

        // window.SOLAR_ECLIPSES_PROCESSED = optimizeEclipseData(ECLIPSE_TYPE__SOLAR);
        // window.LUNAR_ECLIPSES_PROCESSED = optimizeEclipseData(ECLIPSE_TYPE__LUNAR);
        
        loadAstroIndicators(function() {
            init_step4_selfCheck(filePathFromMainArgs);
        });
    }
}

function init_step4_selfCheck(filePathFromMainArgs) {

    console.log("init_step4_selfCheck()");

    appState.startupErrors = [];

    selfCheckMsrfOnStartup(appState.startupErrors);
    runUnitTests(appState.startupErrors);

    if ( isRunningHeadless() && appState.startupErrors.length > 0 ) {

        for ( var i = 0; i < appState.startupErrors.length; i++ ) {
            var ithError = appState.startupErrors[i];

            console.error(ithError);
        }

        exitHeadlessWithError("Self-check failed.");
    } else {
        init_step5_dependencies(filePathFromMainArgs);
    }
}

function init_step5_dependencies(filePathFromMainArgs) {

    console.log("init_step5_dependencies()");

    if ( isRunningHeadless() ) {
        console.log("Skipping UI dependency init for headless mode.");

        init_step6_appState(filePathFromMainArgs);
    } else {
        Chart.register(ChartDataLabels);

        initTopLevelListeners();
        initDependencies();

        if ( isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ) {
            initMap();
        }
        
        doChartInitialSetup();

        init_step6_appState(filePathFromMainArgs);
    }
}

function initAppStateFinalization() {
    if ( isRunningHeadless() ) {
        handleHeadlessOutput();
    } else {
        setSkinModeBasedOnCurrentEventType();

        initGlobalToolTips();
        
        var isoEventRows = document.getElementsByClassName("iso_event_row");
        isoEventRows[appState.globalOptions.current_iso_event_index].scrollIntoView({block:"center"});
        
        disableTabIndeces();
        
        markFreshSaveStatus();
    }
    
    appState.initialized = true;

    refreshMenuOptions();
}

function initGlobalToolTips() {
    applyToolTipToCssClass("tool_tippable_cursor");
    applyToolTipToElemId("current-screen");
}

function exitHeadlessWithError(errorMessage) {
    console.error(errorMessage);

    if ( isRunningElectron() ) {
        electronBridge.closeAppWithHeadlessError();
    }
}

function initMap() {
    
    var mapBackgroundCloseCapture = document.getElementById("map-background-close-capture");
    var mapCloseButton = document.getElementById("map-close-button");

    mapBackgroundCloseCapture.addEventListener("click", function() {
        hideMap();
    });

    mapCloseButton.addEventListener("click", function() {
        hideMap();
    });

    L.tileLayer('./img/offline_map/map/{z}/{x}/{y}.png', {
        maxZoom: MAP_MAX_ZOOM,
        noWrap: true
    }).addTo(appState.map);

    appState.map.on('mousemove', function(e) {
        var lat = roundNumberToLocationPrecision(e.latlng.lat);
        var long = roundNumberToLocationPrecision(e.latlng.lng);
        
        updateMapLatLongHud(lat, long);
    });

    appState.map.on('click', function(e) {
        var isoEventIndex = appState.mostRecentIsoEventMapClick;
        var errors_out_unused = [];
        var checkLimits = false;

        // The lat/long from Leaflet seems to be a "string" anyway, but just being safe against future version breaking changes and such.
        var lat = parseLatOrLongString(e.latlng.lat, isoEventIndex, COORD_LAT, errors_out_unused, checkLimits);
        var long = parseLatOrLongString(e.latlng.lng, isoEventIndex, COORD_LONG, errors_out_unused, checkLimits);

        lat = constrainLatOrLongValue(lat, COORD_LAT);
        long = constrainLatOrLongValue(long, COORD_LONG);

        var isoEvent = appState.isoEvents[isoEventIndex];

        if ( isoEvent ) {
            isoEvent.lat = lat;
            isoEvent.long = long;
        }

        flushChangesToDisk();

        if ( appState.globalOptions.current_iso_event_index == isoEventIndex ) {
            refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
        } else {
            refreshIsoEvents(REFRESH_TYPE__SOFT, OPHIS_INPUT_CHANGE__CHANGED);
            selectIsoEvent(isoEventIndex);
        }

        hideMap();

        var timezone = getTimezone(isoEvent.lat, isoEvent.long);

        showToast("New Coords: " + readableLatLong(lat, long) + ", New Timezone: '" + timezone + "'");
    });

    var corner1 = L.latLng(-LAT_LIMIT, -LONG_LIMIT);
    var corner2 = L.latLng(LAT_LIMIT, LONG_LIMIT);
    var bounds = L.latLngBounds(corner1, corner2);
    appState.map.setMaxBounds(bounds);

    hideMap();
}

function resetAllIsoEvents() {
    appState.isoEvents.length = 0;
    addIsoEvent();
    localStorage.removeItem(SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB);
    markChangesSaved();
    flushChangesToDisk();
}

function recalculateZDatesHandler() {
    var preserveScrollPosition = true;
    refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__FORCE);
}

function init_step6_appState(filePathFromMainArgs) {

    console.log("init_step6_appState()");

    var savedJsonBlob = localStorage.getItem(SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB);

    var filePathToLoad = null;

    if ( isRunningHeadless() ) {
        if ( filePathFromMainArgs ) {
            filePathToLoad = filePathFromMainArgs;
        } else {
            exitHeadlessWithError("Could not find input file from args.");
        }
    } else if ( isRunningElectron() ) {
        if ( filePathFromMainArgs ) {
            console.log("Using filePathFromMainArgs: " + filePathFromMainArgs);
        } else {
            if ( appState.externalFilePath ) {
                console.log("Using appState.externalFilePath: " + appState.externalFilePath);

                filePathFromMainArgs = appState.externalFilePath;
                appState.externalFilePath = null;
            }
        }

        var globalOptionsOnly = true;
        var validationResult = validatePotentialDiskLoadOrImport(savedJsonBlob, globalOptionsOnly);
        loadSavedGlobalOptions(validationResult.global_options);

        if ( filePathFromMainArgs ) {
            filePathToLoad = filePathFromMainArgs;
        } else {
            if ( isFlagEnabled(FEATURE_FLAG__OPEN_PREVIOUS_FILE_UNDER_ELECTRON) ) {
                filePathToLoad = appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH];
            } else {
                filePathToLoad = null;

                var shouldFlushChangesToDisk = false;
                setGlobalOption(GLOBAL_OPTION__CURRENT_FILE_PATH, "", shouldFlushChangesToDisk);
            }
        }
    } else {
        filePathToLoad = null;
    }

    if ( filePathToLoad ) {
        appState.needToFinalizeAppState = true;
        electronBridge.openOphFile(filePathToLoad);
    } else {
        var loadBlobFromLocalStorage = false;
        
        if ( isRunningElectron() === true ) {
            loadBlobFromLocalStorage = false;
        } else {
            loadBlobFromLocalStorage = true;
        }

        if ( loadBlobFromLocalStorage === true && savedJsonBlob && loadSavedBlobFromProgrammaticAction(savedJsonBlob) ) {
            // Successfully loaded previous session.
    
            // if ( appState.globalOptions[GLOBAL_OPTION__SKIN_MODE] ) {
            //     setSkinMode(appState.globalOptions[GLOBAL_OPTION__SKIN_MODE]);
            // } else {
            //     setSkinMode(DEFAULT_SKIN_MODE);
            // }
        } else {
            // setSkinMode(DEFAULT_SKIN_MODE);
    
            addIsoEvent();
        }

        initAppStateFinalization();
    }
}

function initTopLevelListeners() {

    // if ( typeof require !== 'undefined' ) {
    //     var require_electron = require('electron');
    //     if ( require_electron ) {
    //         var ipcRenderer = require_electron.ipcRenderer;
    //         ipcRenderer.on('factoryReset', function (event, message) {
    //             factoryReset();
    //         });
    //     }
    // }
    
    document.onkeydown = function(evt) {
        evt = evt || window.event;
        
        if ( isEscapeKey(evt) ) {
            var dialogElemOrNull = document.getElementById("yes-no-dialog-wrapper");
            hideDialog(dialogElemOrNull);
            hideMap();
        }
    };

    document.getElementById("add-x-date-button").addEventListener("click", function() {
        addXDate(getCurrentIsoEvent());
        scrollPanelToBottom(getXDateContainer());
    });

    document.getElementById("add-t-date-button").addEventListener("click", function() {
        var insertIndex = -1;
        var refreshView = true;
        var flushChanges = true;

        addXDate(getCurrentIsoEvent(), insertIndex, refreshView, flushChanges, INPUT_DATE_TYPE__T_DATE);
        scrollPanelToBottom(getTDateContainer());
    });

    document.getElementById("reset-iso-event-filters-button").addEventListener("click", function() {
        showDialog("Are you sure you want to reset the filters to default for this Iso-Event?", "NO, keep current filters", "YES, reset filters to default", function() {
            resetIsoEventFieldOptions(SERIALIZED_FILTER_FIELDS);
        });
    });

    document.getElementById("reset-iso-event-chart-options-button").addEventListener("click", function() {
        showDialog("Are you sure you want to reset the chart options to default for this Iso-Event?", "NO, keep current options", "YES, reset options to default", function() {
            resetIsoEventFieldOptions(SERIALIZED_CHART_OPTION_FIELDS);
        });
    });

    document.getElementById("reset-iso-event-chart-help-button").addEventListener("click", function() {
        var message = "";
        message += "Moon Phases and Eclipses are only shown on the chart if they occur within +/-"+getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)+" of a given X-Date or Z-Date.<br><br>";
        message += "Each Moon Phase lasts 3.69 days. The Moon Phase Symbol will be drawn at the approximate mid-point of its phase.<br><br>";
        message += "Moon Phases are calculated algorithmically in the Ophis Software, while eclipse dates are sourced from a NASA database: <a href='https://science.nasa.gov/eclipses/'>https://science.nasa.gov/eclipses/</a><br><br>";
        message += "This NASA database includes all Eclipse dates in Anno Domini/Common Era up to the year 3000, and is bundled directly into Ophis. As such, like the rest of Ophis, none of the Eclipse calculations require an Internet connection.<br><br>";
        message += "For simplicity's sake, Full Solar Eclipses encompass Annular, Total, and Hybrid eclipse types. Penumbral Lunar Eclipses (those barely visible) are not included.";

        showOkDialog(message);
    });

    document.getElementById("x-date-container-starting-message").innerHTML = HELP_MESSAGE__X_DATES_PANEL;
    document.getElementById("t-date-container-starting-message").innerHTML = HELP_MESSAGE__T_DATES_PANEL;

    document.getElementById("x-dates-help-button").addEventListener("click", function() {
        var message = "";
        message += HELP_MESSAGE__X_DATES_PANEL;

        showOkDialog(message);
    });

    document.getElementById("t-dates-help-button").addEventListener("click", function() {
        var message = "";
        message += HELP_MESSAGE__T_DATES_PANEL;

        showOkDialog(message);
    });

    document.getElementById("iso-events-help-button").addEventListener("click", function() {
        var message = "";
        message += HELP_MESSAGE__ISO_EVENTS_PANEL;

        showOkDialog(message);
    });

    document.getElementById("iso-event-filters-help-button").addEventListener("click", function() {
        var message = "";
        message += HELP_MESSAGE__FILTERS_PANEL;

        showOkDialog(message);
    });

    document.getElementById("chart-help-button").addEventListener("click", function() {
        var message = "";
        message += "The <b>Hit Count</b> of an Output Date (aka Z-Date) is determined by (a) the number of Operations that generated the date, plus (b) the number of MSRF Filter matches for that Date.<br><br>";
        message += "The <b>Score</b> of an Output Date takes into account (a) whether an Operation is an Alpha or Beta, and (b) the significance of the MSRF Fitler match.<br><br>";
        // message += " The following symbols are drawn for Dates with two or more hits:<br><br>";

        function newRowHtmlForChartSymbolExplanation(chartSymbol, lineStyle, explanation) {
            var toReturn = "";

            toReturn += "<tr>";
            if ( chartSymbol == null ) {
                toReturn += "<td class='chart_help_hit_count_cell_inner'>(none)</td>";
            } else {
                toReturn += "<td class='chart_help_hit_count_cell_inner'><img src='"+chartSymbol+"'></td>";
            }

            toReturn += "<td class='chart_help_hit_count_cell_inner'><div style=' border-top:"+lineStyle+";'></div></td>";

            toReturn += "<td class='chart_help_hit_count_cell_inner'>"+explanation+"</td>";
            
            toReturn += "</tr>";

            return toReturn;
        }

        function chartLineStyleGenerator(thickness, color) {
            return thickness + "px solid " + color;
        }

        var tableHtml = "";
        tableHtml += "<table style='width:100%;'>";
        tableHtml += "<tr><td class='chart_help_hit_count_cell_header chart_help_hit_count_cell_inner'>Symbol</td><td class='chart_help_hit_count_cell_header chart_help_hit_count_cell_inner'>Curve</td><td style='width:100%;' class='chart_help_hit_count_cell_header chart_help_hit_count_cell_inner'>Description</td></tr>";
        tableHtml += newRowHtmlForChartSymbolExplanation(null, chartLineStyleGenerator(CHART_CURVE_WIDTH__ONE_HIT, CHART_CURVE_COLOR__ONE_HIT), "Only a single Operation produced the Output Date. This indicates a weak signal by itself. However, this sole Output Date may strengthen the signal of other nearby Output Dates.");
        tableHtml += newRowHtmlForChartSymbolExplanation(CHART_SYMBOL_IMAGE_SRC__GEMINI, chartLineStyleGenerator(CHART_CURVE_WIDTH__TWO_HITS, CHART_CURVE_COLOR__TWO_HITS), "Two Operations (or one Operation and one Filter) produced the Output Date. The curve itself looks the same, but this Output Date is more significant than having no symbol.");
        tableHtml += newRowHtmlForChartSymbolExplanation(CHART_SYMBOL_IMAGE_SRC__TRIANGLE, chartLineStyleGenerator(CHART_CURVE_WIDTH__THREE_HITS, CHART_CURVE_COLOR__THREE_HITS), "Three Operations/Filters produced the Output Date.");
        tableHtml += newRowHtmlForChartSymbolExplanation(CHART_SYMBOL_IMAGE_SRC__DIAMOND, chartLineStyleGenerator(CHART_CURVE_WIDTH__FOUR_HITS, CHART_CURVE_COLOR__FOUR_HITS), "Four Operations/Filters produced the Output Date.");
        tableHtml += newRowHtmlForChartSymbolExplanation(CHART_SYMBOL_IMAGE_SRC__CIRCLE, chartLineStyleGenerator(CHART_CURVE_WIDTH__FIVE_HITS, CHART_CURVE_COLOR__FIVE_HITS), "Five or more Operations/Filters produced the Output Date.");
        tableHtml += "</table>";

        message += tableHtml;

        showOkDialog(message);
    });

    document.getElementById("add-iso-event-button").addEventListener("click", function() {
        var autoSelectNewEvent = false;
        addIsoEvent(autoSelectNewEvent);
        scrollPanelToBottom(getIsoEventContainer());
    });

    enableRowButton(document.getElementById("reset-iso-events-button"));
    document.getElementById("reset-iso-events-button").addEventListener("click", function() {
        showDialog("Are you sure you want to delete all Iso-Events and their X-Dates?", "NO, keep existing data", "YES, delete all", function() {
            resetAllIsoEvents();
        });
    });

    function deleteAllInputDatesHandler(inputDateType) {
        var isForXDates = inputDateType == INPUT_DATE_TYPE__X_DATE;

        var readableName = isForXDates ? "X-Dates" : "T-Dates";
        showDialog("Are you sure you want to delete all "+readableName+" for this Iso-Event?", "NO, keep existing "+readableName, "YES, delete all "+readableName, function() {
            var currentIsoEvent = getCurrentIsoEvent();

            if ( isForXDates ) {
                 currentIsoEvent.x_dates = [];
            } else {
                currentIsoEvent.t_dates = [];
            }

            markChangesSaved();

            var preserveScrollPosition = false;
            refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);

            recenterChart();

            flushChangesToDisk();
        });
    }

    document.getElementById("reset-x-dates-button").addEventListener("click", function() {
        deleteAllInputDatesHandler(INPUT_DATE_TYPE__X_DATE);
    });

    document.getElementById("reset-t-dates-button").addEventListener("click", function() {
        deleteAllInputDatesHandler(INPUT_DATE_TYPE__T_DATE);
    });

    if ( document.getElementById("recalculate-z-dates-button") ) {
        document.getElementById("recalculate-z-dates-button").addEventListener("click", function() {
            recalculateZDatesHandler();
        });
    }

    setUpIsoEventFieldCheckboxEventListeners();

    for ( var i = 0; i < MASTER_CHECKBOX_CONFIGS.length; i++ ) {
        var ithConfig = MASTER_CHECKBOX_CONFIGS[i];

        setUpMasterCheckbox(ithConfig);
    }

    var currentScreenSelectElem = document.getElementById("current-screen");

    fillInSelectElem(currentScreenSelectElem, OPHIS_SCREENS, getScreenName);

    currentScreenSelectElem.addEventListener("change", function() {
        setCurrentScreen(this.value);
    });


    applyToolTipToElemId("add-x-date-button");
    applyToolTipToElemId("reset-x-dates-button");
    applyToolTipToElemId("recalculate-z-dates-button");
    applyToolTipToElemId("add-iso-event-button");
    applyToolTipToElemId("reset-iso-events-button");
    applyToolTipToElemId("reset-iso-event-filters-button");
    applyToolTipToElemId("reset-iso-event-chart-options-button");
    applyToolTipToElemId("reset-iso-event-chart-help-button");
    applyToolTipToElemId("recenter-chart-button");
    applyToolTipToElemId("chart-help-button");


    if ( isRunningElectron() === false ) {
        // Pretty sure this is completely deprecated now, considering the browser always auto-saves now.
        // And Electron handles its own app-close interception stuff. In fact having this function here
        // doesn't let Electron reload or navigate away from the window, e.g. when performing `Reset Program` from the menu.
        window.addEventListener("beforeunload", function(event) {
        var confirmationMessage = "Are you sure you want to leave?";
        if ( appState.hasUnsavedChanges == true) {
            (event || window.event).returnValue = confirmationMessage; //Gecko + IE
            return confirmationMessage;
        } else {
            return undefined;
        }
    });
    }

    var currentDevicePixelRation = window.devicePixelRatio;

    window.onresize = function() {
        allowChartFlushToDisk();

        var newDevicePixelRatio = window.devicePixelRatio;

        if ( currentDevicePixelRation != newDevicePixelRatio ) {
            currentDevicePixelRation = newDevicePixelRatio;

            requestAnimationFrame(function() {
                var callUpdateChartDatasets = true;
                var setOverflowForScrollContainers = true;
                var forceRedraw = true;

                //setPanelMaxDimensions() will be called downstream anyway.
                refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, appState.latestResults, callUpdateChartDatasets, setOverflowForScrollContainers, forceRedraw);
            });
        } else {
            setPanelMaxDimensions();
        }

        //TODO: Little specific here. Maybe have a more generic way of trickling resizes-only down to UI.
        if ( getCurrentScreen() == OPHIS_SCREEN__EVENT_SWAP ) {
            refreshIsoEventSwapRows();
        }
    }

    window.addEventListener('scroll', function() {
        updateOutputPanelScrollIfNeeded();
    });
}

function setCurrentScreen(screenEnum) {
     var currentScreenSelectElem = document.getElementById("current-screen");
    currentScreenSelectElem.value = screenEnum;

    setGlobalOption(GLOBAL_OPTION__START_SCREEN, screenEnum);

    adjustSelectElemWidth(currentScreenSelectElem);

    // This is one place OPHIS_INPUT_CHANGE__CHANGED/OPHIS_INPUT_CHANGE__NO_CHANGE doesn't fit in super cleanly,
    // since it's not the input data that has changed, but rather the fact that 
    // the Operator may have been on a non-Z-Date output screen and now has changed
    // to looking at Z-Dates again, which may require a re-run of Ophis if auto-recalc
    // is enabled. Err on the side of assuming a recalc is required, if GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES
    // is enabled. ALTHOUGH, I suppose we could trust appState.latestResults.stale if we wanted. Anyway,
    // doesn't really hurt to run the operations again here.
    var autoRecalcEnabled = appState.globalOptions[GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES] ? true : false;
    var assumeSomeInputChanged = autoRecalcEnabled && getCurrentScreen() == OPHIS_SCREEN__Z_DATES;
    refreshIsoEvents(REFRESH_TYPE__RIGHT_PANEL_ONLY, assumeSomeInputChanged ? OPHIS_INPUT_CHANGE__CHANGED : OPHIS_INPUT_CHANGE__NO_CHANGE);
}


if ( isRunningElectron() ) {
    // Electron calls init();
} else {
    init();
}
