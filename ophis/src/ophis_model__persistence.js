
function onCloseAppRequested() {

    function innerContinuation() {
        window.electronBridge.confirmCloseApp();
    }

    if ( appState.hasUnsavedChanges === false ) {
        innerContinuation();
    } else {
        if ( confirm("The current session is not saved to file. Are you sure you want to close the app?") ) {
            innerContinuation();
        } else {

        }
    }
}

function electronBridgeIncoming_openFileExplorer() {
    if ( isSignedIn() ) {
        function innerContinuation() {
            window.electronBridge.openFileExplorer();
        }

        var showWarning = shouldShowWarningBeforeNewFile();
    
        if ( showWarning === false ) {
            // File is presumably saved, nothing to worry about.
            innerContinuation();
        } else {
            if ( confirm("The current session is not saved to file. Are you sure you want to open a new file?") ) {
                innerContinuation();
            } else {
                // User clicked cancel or whatever.
            }
        }
    } 
}

function electronBridgeIncoming_onSaveClickedFromFileMenu() {
    if ( isSignedIn() ) {
        if ( appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] ) {
            var forceFlush = true;
            flushChangesToDisk(forceFlush);
        } else {
            electronBridgeIncoming_onSaveAsClickedFromFileMenu();
        }
    }
}

function electronBridgeIncoming_onSaveAsClickedFromFileMenu() {
    if ( isSignedIn() ) {
        if ( isRunningElectron() ) {
            var prettify = appState.globalOptions[GLOBAL_OPTION__PRETTIFY_OPH_FILES] === true;
            var minify = appState.globalOptions[GLOBAL_OPTION__MINIFY_OPH_FILES] === true;
            var saveBlob = getSaveBlob(SAVE_BLOB_MODE__JUST_THE_EVENTS, prettify, minify);
    
            window.electronBridge.saveFileAs(saveBlob);
        }
    }
}

function onSaveToFileError(message) {
    showToast("Could not save to file, see console for details.");
    console.log("Error saving file: " + message);
}

function onSaveAsSuccess(filePath) {
    setGlobalOption(GLOBAL_OPTION__CURRENT_FILE_PATH, filePath);

    markChangesSaved();
}

function shouldShowWarningBeforeNewFile() {
    var showWarning = false;

    if ( appState.hasUnsavedChanges === true ) {
        showWarning = true;
    }

    // if ( appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] ) {
    //     // Do nothing.
    // } else {
    //     // Second line of defense. Since this method is only reached in electron,
    //     // if we don't have a saved file path to begin with, it seems safe to show
    //     // a warning.
    //     showWarning = true;
    // }

    return showWarning;
}

function electronBridgeIncoming_startNewFile() {
    if ( isSignedIn() ) {
        function innerContinuation() {
            setGlobalOption(GLOBAL_OPTION__CURRENT_FILE_PATH, null);

            blockChartFlushToDiskUntilUserInteraction();
            resetAllIsoEvents();
    
            markFreshSaveStatus();
        }

        var showWarning = shouldShowWarningBeforeNewFile();
    
        if ( showWarning === false ) {
            // File is presumably saved, nothing to worry about.
            innerContinuation();
        } else {
            if ( confirm("The current session is not saved to file. Are you sure you want to start a new session?") ) {
                innerContinuation();
            } else {
                // User clicked cancel or whatever.
            }
        }
    }
}

function getSaveBlob(saveBlobMode, prettify = false, minify = false) {
    var saveObject = {};
    saveObject[SERIALIZED_FIELD__APP_VERSION] = APP_VERSION;

    if ( saveBlobMode == SAVE_BLOB_MODE__EVERYTHING || saveBlobMode == SAVE_BLOB_MODE__JUST_THE_EVENTS ) {
        saveObject[SERIALIZED_FIELD__ISO_EVENTS] = sanitizeIsoEventsForSaveOperation(appState.isoEvents, minify);
    }
    
    if ( saveBlobMode == SAVE_BLOB_MODE__EVERYTHING || saveBlobMode == SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS ) {
        saveObject[SERIALIZED_FIELD__GLOBAL_OPTIONS] = appState.globalOptions;
    }

    var replacer = null;
    var spaces = prettify ? 2 : null;
    var saveBlob = JSON.stringify(saveObject, replacer, spaces);

    saveBlob = saveBlob.replaceAll(",", ", ");
    // saveBlob = saveBlob.replaceAll(":", ": ");

    return saveBlob;
}

function onOphFileOpenError(filePath, message) {
    showToast("Could not open file, see console for details.");

    console.log("onOphFileOpenError(): Error loading file: " + message);
    console.log("onOphFileOpenError(): File path given is " + filePath);
    console.log("onOphFileOpenError(): File path from global options is " + appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH]);

    if ( filePath == appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] ) {
        setGlobalOption(GLOBAL_OPTION__CURRENT_FILE_PATH, null);
    }

    if ( appState.needToFinalizeAppState === true ) {
        appState.needToFinalizeAppState = false;

        var filePathFromMainArgsPurposelyNull = null;

        // Have to back up a bit and re-run initAppState(), instead of just calling initAppStateFinalization().
        initAppState(filePathFromMainArgsPurposelyNull);
    }
}

function onOphFileOpenedFromOutsideApp(filePath) {
    console.log("onOphFileOpenedFromOutsideApp() received: " + filePath);
    console.log("onOphFileOpenedFromOutsideApp() appState.initialized=" + appState.initialized);

    if ( appState.initialized === true ) {

        function innerContinuation() {
            window.electronBridge.openOphFile(filePath);
        }

        var showWarning = shouldShowWarningBeforeNewFile();
    
        if ( showWarning === false ) {
            // File is presumably saved, nothing to worry about.
            innerContinuation();
        } else {
            if ( confirm("The current session is not saved to file. Are you sure you want to open '"+filePath+"'?") ) {
                innerContinuation();
            } else {
                // User clicked cancel or whatever.
            }
        }
    } else {
        appState.externalFilePath = filePath;
    }
}

function onOphFileOpened(filePath, fileContents, checkForUnsavedChanges = false) {
    function innerContinuation() {
        var validationResult = validatePotentialDiskLoadOrImport(fileContents);

        if ( validationResult.errors.length > 0 ) {
            onOphFileOpenError(filePath, "Got validation errors when trying to parse opened file.");
        } else {
            setGlobalOption(GLOBAL_OPTION__CURRENT_FILE_PATH, filePath);
            
            blockChartFlushToDiskUntilUserInteraction();

            swapInNewIsoEventArray(validationResult.result, "Successfully loaded " + filePath);

            if ( appState.needToFinalizeAppState === true ) {
                appState.needToFinalizeAppState = false;

                initAppStateFinalization();
            }
        }
        markFreshSaveStatus();
    }

    if ( checkForUnsavedChanges === true && shouldShowWarningBeforeNewFile() ) {
        if ( confirm("The current session is not saved to file. Are you sure you want to open '"+filePath+"'?") ) {
            innerContinuation();
        } else {
            // User clicked cancel or whatever.
        }
    } else {
        innerContinuation();
    }
}

function setGlobalOption(optionName, optionValue, shouldFlushChangesToDisk = true) {

    if ( appState.globalOptions[optionName] === undefined ) {
        printWarning("Global option '"+optionName+"' was undefined, setting anyway.");
    }

    appState.globalOptions[optionName] = optionValue;

    if ( shouldFlushChangesToDisk ) {
        flushChangesToDisk();
    }
}

function flushChangesToDisk(forceFlush = false, showSaveStatus = true) {
    // console.log("flushChangesToDisk()");

    appState.hasUnsavedChanges = true;

    var generateBlob = false;

    if ( forceFlush === true ) {
        generateBlob = true;
    } else {
        if ( isRunningElectron() ) {
            if ( isFlagEnabled(FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON) ) {
                generateBlob = true;
            } else {
                generateBlob = false;
            }
        } else {
            generateBlob = true;
        }
    }
    
    if ( generateBlob === true ) {
        var writeBlobToLocalStorage = false;

        if ( isRunningElectron() ) {
            if ( forceFlush === true || isFlagEnabled(FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON) ) {
                writeBlobToLocalStorage = true;

                if ( appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] ) {
                    var prettify = appState.globalOptions[GLOBAL_OPTION__PRETTIFY_OPH_FILES] === true;
                    var minify = appState.globalOptions[GLOBAL_OPTION__MINIFY_OPH_FILES] === true;
                    var saveBlobWithoutOptions = getSaveBlob(SAVE_BLOB_MODE__JUST_THE_EVENTS, prettify, minify);
                    window.electronBridge.autoSaveToFile(appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH], saveBlobWithoutOptions);
                }
            } else {
                writeBlobToLocalStorage = false;
            }
        } else {
            writeBlobToLocalStorage = true;
        }
        
        if ( writeBlobToLocalStorage ) {
            var saveBlobWithOptions = getSaveBlob(SAVE_BLOB_MODE__EVERYTHING);
            localStorage.setItem(SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB, saveBlobWithOptions);

            appState.hasUnsavedChanges = false;
        }
    } else {
        var saveBlobWithONLYOptions = getSaveBlob(SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS);
        localStorage.setItem(SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB, saveBlobWithONLYOptions);
    }

    refreshUnsavedChangesReminder(showSaveStatus);
}

function markFreshSaveStatus() {
    var showSaveStatus = false;
    markChangesSaved(showSaveStatus);
}

function markChangesSaved(showSaveStatus = true) {
    appState.hasUnsavedChanges = false;

    refreshUnsavedChangesReminder(showSaveStatus);
}

function importIsoEventsFromUserInteraction(importBlob) {
    var validationResult = validatePotentialDiskLoadOrImport(importBlob);

    if ( validationResult.errors.length > 0 ) {
        for ( var i = 0; i < validationResult.errors.length; i++ ) {
            var ithError = validationResult.errors[i];
            
            var errorRow = addOutputRow();
            errorRow.innerHTML = "<td style='width:100%;' class='load_error_col col_format'><div class='col_output_text error_color'>Error: "+ithError+"</div></td>";
        }

        showToast("Load failed, see errors.");
    } else {
        swapInNewIsoEventArray(validationResult.result, "Successfully loaded!");
    }
}

function loadGlobalOption(globalOptionsToLoad, optionName, expectedType) {
    if ( typeof globalOptionsToLoad[optionName] == expectedType ) {
        appState.globalOptions[optionName] = globalOptionsToLoad[optionName];
    }
}

function loadSavedGlobalOptions(globalOptions) {
    var currentScreenSelect = document.getElementById("current-screen");

    if ( globalOptions ) {
        for ( var i = 0; i < GLOBAL_BOOLEAN_OPTIONS.length; i++ ) {
            loadGlobalOption(globalOptions, GLOBAL_BOOLEAN_OPTIONS[i], "boolean");
        }

        loadGlobalOption(globalOptions, GLOBAL_OPTION__START_SCREEN, "string");
        loadGlobalOption(globalOptions, GLOBAL_OPTION__SKIN_MODE, "string");
        loadGlobalOption(globalOptions, GLOBAL_OPTION__CURRENT_FILE_PATH, "string");
        loadGlobalOption(globalOptions, "local_time_offset_in_millis", "number");
        loadGlobalOption(globalOptions, "current_iso_event_index", "number");

        // currentScreenSelect.value = appState.globalOptions.start_screen;
        currentScreenSelect.value = DEFAULT_STARTING_SCREEN;
    } else {
        // No prob, will use defaults.

        currentScreenSelect.value = DEFAULT_STARTING_SCREEN;
    }

    adjustSelectElemWidth(currentScreenSelect);

    
    var autoRecalculateZDatesContainer = document.getElementById("auto-recalculate-z-dates-container");
    autoRecalculateZDatesContainer.innerHTML = createGlobalOptionCheckboxHtml("auto-recalculate-z-dates-checkbox", "auto_recalculate_z_dates_checkbox", "Auto-Recalculate Z-Dates on every Input change.", "Auto", 7);

    hookUpGlobalOptionCheckbox("auto-recalculate-z-dates-checkbox", GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES, function(nowChecked) {
        if ( nowChecked == true ) {
            recalculateZDatesHandler();
        }
    });
}

function loadSavedBlobFromProgrammaticAction(saveBlob) {
    var validationResult = validatePotentialDiskLoadOrImport(saveBlob);

    loadSavedGlobalOptions(validationResult.global_options);

    if ( validationResult.errors.length > 0 ) {

        // Only show an error if blob is a truthey string, otherwise just means localStorage was cleared or something.
        if ( saveBlob ) {
            showToast("Could not load previous session, see console for details.");
        }

        return false;
    } else {
        var emptyToastMessage = "";
        swapInNewIsoEventArray(validationResult.result, emptyToastMessage);

        return true;
    }
}