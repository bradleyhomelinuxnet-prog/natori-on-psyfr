

var OVERFLOW_FOR_SCROLL_ENABLED = "scroll";

function recenterChartOnStartup() {
    // Absolutely no idea why this is needed. To reproduce, take 3 dates, 9/14/24, 9/20/26, and 9/21/26,
    // recenter the chart, and then refresh the page...without this, the chart is centered properly. The reset
    // button will be greyed out, but if you hover over a curve or something, the chart will jump to where it should
    // be. Also can't be below 40 milliseconds for the timeout (or something like that), otherwise the recentering 
    // doesn't take.
    //
    // UPDATE: Using chartjs.resizeDelay seems to fix this, but I will keep this here anyway.
    setTimeout(function() {
        blockChartFlushToDiskUntilUserInteraction();
        recenterChartIfNeeded();
    }, 50);
}

// function debugPollLoop() {
//     console.log(window.scrollY);

//     setTimeout(debugPollLoop, 1000);
// }

// setTimeout(debugPollLoop, 1000);

function setSkinModeBasedOnCurrentEventType() {
    var currentIsoEvent = getCurrentIsoEvent();
    var eventType = currentIsoEvent.type;

    var shouldFlushChangesToDisk = false;

    if ( eventType == EVENT_TYPE__PERSONAL ) {
        setSkinMode(SKIN_MODE__CLASSIC, shouldFlushChangesToDisk);
    } else if ( eventType == EVENT_TYPE__ASTROLOGICAL ) {
        setSkinMode(SKIN_MODE__ASTROLOGICAL, shouldFlushChangesToDisk);
    } else if ( eventType == EVENT_TYPE__MARKETS ) {
        setSkinMode(SKIN_MODE__MARKETS, shouldFlushChangesToDisk);
    }
}

function setSkinMode(skinMode, shouldFlushChangesToDisk = true) {
    setGlobalOption(GLOBAL_OPTION__SKIN_MODE, skinMode, shouldFlushChangesToDisk);

    if ( skinMode == SKIN_MODE__CLASSIC ) {
        document.getElementById("header-image").src = "img/header.png";
    } else if ( skinMode == SKIN_MODE__ASTROLOGICAL ) {
        document.getElementById("header-image").src = "img/header.png";
    } else if ( skinMode == SKIN_MODE__MARKETS ) {
        document.getElementById("header-image").src = "img/header_markets.png";
    }

    refreshWindowTitle();
}

function refreshWindowTitle(showSaveStatus = true) {

    var skinMode = appState.globalOptions[GLOBAL_OPTION__SKIN_MODE];
    skinMode = skinMode ? skinMode : DEFAULT_SKIN_MODE;

    var documentTitle = "";

    if ( skinMode == SKIN_MODE__CLASSIC ) {
        documentTitle = "Ophis v" + APP_VERSION;
    } else if ( skinMode == SKIN_MODE__ASTROLOGICAL ) {
        documentTitle = "Ophis Astrology Platform";
    } else if ( skinMode == SKIN_MODE__MARKETS ) {
        documentTitle = "Ophis Market Prediction Platform";
    }

    var currentFilePath = appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH];
    if ( currentFilePath ) {
        documentTitle += " (" + currentFilePath + ")";
    }

    showSaveStatus = showSaveStatus === true && appState.initialized === true;

    if ( showSaveStatus ) {
        if ( appState.hasUnsavedChanges == true ) {
            documentTitle += " " + FILE_NOT_SAVED_TEXT;
        } else {
            documentTitle += " " + FILE_SAVED_TEXT;
        }
    }

    document.title = documentTitle;

    if ( document.getElementById("app-version") ) {
        document.getElementById("app-version").innerHTML = "v" + APP_VERSION;
    }
}

function refreshCurrentPage(refreshType, results, callUpdateChartDatasets = true, setOverflowForScrollContainers = true, forceRedraw = false) {

    // console.log("REFRESHING CURRENT PAGE");

    appState.viewUpdateCount += 1;

    if ( appState.viewUpdateCount == 1 ) {
        setTimeout(function() {
            document.getElementById("initial-loading-container").classList.add("fade_out_loading_image");
            document.getElementById("panel-container").style.visibility = "visible";
            document.getElementById("panel-container").classList.add("fade_in_panels");
            
            setTimeout(function() {
                document.getElementById("initial-loading-container").parentElement.removeChild(document.getElementById("initial-loading-container"));
            }, 1000);
            
            requestAnimationFrame(function() {
                blockChartFlushToDiskUntilUserInteraction();
                setOverflowOnScrollContainers(OVERFLOW_FOR_SCROLL_ENABLED);
    
                if ( appState.loadedFromDisk ) {
                    if ( appState.globalOptions[GLOBAL_OPTION__CURRENT_FILE_PATH] ) {
                        // Startup toast was already shown.
                    } else {
                        showToast("Successfully loaded previous session.");
                    }
                }
            });
            
            recenterChartOnStartup();
        }, 500);
    } else {
        if ( setOverflowForScrollContainers === true ) {
            requestAnimationFrame(function() {
                // Have to call this twice, prolly cause layout code just got too
                // scrambled as far as order or operations, dependencies, whatever.
                setOverflowOnScrollContainers(OVERFLOW_FOR_SCROLL_ENABLED);
                setOverflowOnScrollContainers(OVERFLOW_FOR_SCROLL_ENABLED);
            });
        }
    }

    var previousResults = appState.latestResults;

    appState.latestResults = results;

    if ( isFlagEnabled(FEATURE_FLAG__SHOW_PAGE_REFRESHES_IN_CONSOLE) ) {
        console.log("Refreshing Page...");
    }

    // NOTE: Right now MUST clear the screen specific area first BEFORE calling clearOutputContainer()
    // A situation happens when the current time/date field is updated, which calls into this method.
    // Clearing screenSpecificArea.innerHTML then causes a blur event in the current time/date field, which causes a recursion
    // into this function where this very comment is. So clearOutputContainer() is called twice and then
    // renderCondensedOutputElseErrors() is called twice, which causes duplicates of all output rows.
    //
    // TODO: Eliminate the recursion completely so output doesn't get rendered twice in a row.
    // UPDATE: Eliminated the recursion by using onValidDateEntered_calling. Do a global search for that.
    // A bit hacky but solid enough. Still keep the order of operations mentioned in the original NOTE,
    // since it's more robust that way.
    var screenSpecificArea = document.getElementById("screen-specific-area");

    var currentScreen = getCurrentScreen();
    var previousScreen = appState.previousScreen;
    appState.previousScreen = currentScreen;

    var currentIsoEvent = getCurrentIsoEvent();

    
    var callClearOutputContainer = true;

    var previousScreenSameAsCurrentScreen = previousScreen == currentScreen;

    if ( forceRedraw === false ) {
        if ( previousScreenSameAsCurrentScreen ) {
            if ( refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY ) {
                if ( currentScreen != OPHIS_SCREEN__ABOUT && currentScreen != OPHIS_SCREEN__EXPORT_X_DATES ) {
                    callClearOutputContainer = false;
                }
            }

            if ( currentScreen == OPHIS_SCREEN__Z_DATES ) {
                if ( results.stale === true ) {
                    if ( refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY ) {
                        callClearOutputContainer = true;
                    } else {
                        callClearOutputContainer = false;
                    }
                }
            } else if ( currentScreen == OPHIS_SCREEN__EVENT_SETTINGS ) {
                callClearOutputContainer = true;
            }
        }
    }
    
    if ( callClearOutputContainer === true) {
        destroyFlatPickrInstance(document.getElementById("current-local-time"));
        screenSpecificArea.innerHTML = "";
        clearOutputContainer();
    }

    results.errors = results.errors.concat(appState.startupErrors);

    appState.justFixedErrors = false;
    if ( previousResults != null ) {
        if ( previousResults.errors && previousResults.errors.length > 0 ) {
            if ( results.errors.length == 0 ) {
                appState.justFixedErrors = true;
            }
        }
    }

    if ( results.errors.length > 0 ) {
        if ( currentScreen != OPHIS_SCREEN__Z_DATES && currentScreen != OPHIS_SCREEN__DEBUG && currentScreen != OPHIS_SCREEN__OPERATIONS && currentScreen != OPHIS_SCREEN__EVENT_SWAP && currentScreen != OPHIS_SCREEN__EXPORT_X_DATES && currentScreen != OPHIS_SCREEN__EVENT_SETTINGS ) {
            if ( refreshType != REFRESH_TYPE__RIGHT_PANEL_ONLY ) {
                if ( callUpdateChartDatasets === true ) {
                    currentScreen = OPHIS_SCREEN__Z_DATES;
                    setGlobalOption(GLOBAL_OPTION__START_SCREEN, currentScreen);
                    var currentScreenSelectElem = document.getElementById("current-screen");
                    currentScreenSelectElem.value = currentScreen;
                }  
            }
        }

        results.processed_z_dates = [];
        results.processed_z_dates__sorted_by_date = [];

        refreshDatesHidden(0);
    } else {
        var zStructsDict = results.z_structs;

        var totalNumberOfZDates = getDictionarySize(zStructsDict);
        var filteredNumberOfZDates = results.processed_z_dates.length;
        var zDatesHiddenCount = totalNumberOfZDates - filteredNumberOfZDates;
        refreshDatesHidden(zDatesHiddenCount);
    }

    if ( currentScreen == OPHIS_SCREEN__Z_DATES ) {
        setUpCondensedOutputOptionsControls(results);

        if ( previousScreenSameAsCurrentScreen ) {
            var renderCondensedOutput = forceRedraw === true || results.stale === false || (results.stale === true && refreshType == REFRESH_TYPE__RIGHT_PANEL_ONLY);
            if ( renderCondensedOutput == true) {
                renderCondensedOutputElseErrors(results);
            }
        } else {
            renderCondensedOutputElseErrors(results);
        }
    } else if ( currentScreen == OPHIS_SCREEN__DEBUG ) {
        if ( results.errors.length > 0 ) {
            renderErrors(results.errors);
        } else {
            renderDebugOutput(results);
        }
    } else if ( currentScreen == OPHIS_SCREEN__ABOUT ) {
        renderAbout(results);
    } else if ( currentScreen == OPHIS_SCREEN__EXPORT_X_DATES ) {
        renderExportXDates();
    } else if ( currentScreen == OPHIS_SCREEN__IMPORT_X_DATES ) {
        renderImport();
    } else if ( currentScreen == OPHIS_SCREEN__EVENT_SETTINGS ) {
        if ( callClearOutputContainer === true ) {
            renderEventSettings();
        }
    } else if ( currentScreen == OPHIS_SCREEN__EXPORT_Z_DATES ) {
        renderExportZDates();
    } else if ( currentScreen == OPHIS_SCREEN__OPERATIONS ) {
        if ( callClearOutputContainer === true ) {
            renderOperations();
        } else {
            refreshOperationRows();
        }
    } else if ( currentScreen == OPHIS_SCREEN__EVENT_SWAP ) {
        if ( callClearOutputContainer === true ) {
            renderIsoEventDataTransfer();
        } else {
            // refreshOperationRows();
        }
    }

    appState.justFixedErrors = false;

    var outputContainer = document.getElementById("scrollable-container-for-output-container");
    var zDatesUpToDate = document.getElementById("z-dates-up-to-date");

    // TODO: This is here so that Stale vs. Up-to-date don't shift the UI at all.
    // Do that by having both states as separate elements and hide/show them.
    zDatesUpToDate.style.width = "101px";

    if ( results.stale === true ) {

        if ( currentScreen == OPHIS_SCREEN__Z_DATES ) {
            outputContainer.style.opacity = OPACITY__DISABLED;
        } else {
            outputContainer.style.opacity = OPACITY__ENABLED;
        }
        
        enableStandardButton(document.getElementById("recalculate-z-dates-button"));

        zDatesUpToDate.className = "error_color";
        zDatesUpToDate.innerHTML = "Stale";

        if ( results.errors.length > 0 ) {
            hideChartElem();
        } else {
            getChartElem().style.opacity = OPACITY__DISABLED;
        }

        getChartErrorMessageWrapperElem().style.opacity = OPACITY__DISABLED;
    } else {
        outputContainer.style.opacity = OPACITY__ENABLED;
        disableStandardButton(document.getElementById("recalculate-z-dates-button"));

        zDatesUpToDate.className = "green_color";
        zDatesUpToDate.innerHTML = "Up-to-date";

        getChartElem().style.opacity = OPACITY__ENABLED;

        if ( callUpdateChartDatasets === true ) {
            updateChartDatasets(results);
        }

        getChartErrorMessageWrapperElem().style.opacity = OPACITY__ENABLED;
    }

    for ( var i = 0; i < MASTER_CHECKBOX_CONFIGS.length; i++ ) {
        var ithConfig = MASTER_CHECKBOX_CONFIGS[i];
        
        refreshMasterCheckboxBasedOnChildChange(ithConfig.baseElemId, ithConfig.baseClassName);
    }
    
     handleJustChangedFields(currentIsoEvent);
}

function getCurrentScreen() {
    var currentScreenElem = document.getElementById("current-screen");
    var currentScreen = currentScreenElem.value;

    return currentScreen;
}

function clearOutputContainer() {
    // debugger;

    // Somewhat lazy but for now just always search and destroy instead of only when actually navigating away from the Settings screen.
    destroyFlatPickrInstance(document.getElementById("event-day-scope-start-time"));

    var outputContainer = getOutputContainer();
    outputContainer.innerHTML = "";
    removeAllDisplayedToolTips();
}

function renderErrors(errors, clearDatesHidden = true) {
    var headerRow = addOutputRow();
    headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;">Errors</td>';

    for ( var i = 0; i < errors.length; i++ ) {
        var ithError = errors[i];

        var errorRow = addOutputRow();
        errorRow.innerHTML = "<td style='width:33.33%;' class='col_format'><div class='col_output_text error_color'>"+ithError+"</div></td>";
    }

    if (clearDatesHidden === true ) {
        refreshDatesHidden(0);
    }
}

function renderExportXDates() {
    
    var headerRow = addOutputRow();
    var instructionHtml = "<div style='margin-right:10px;'>Paste into any Text Editor</div>";
    var buttonHtml = '<button title="Copies the blob of code below to your clipboard, which can then be pasted into a text editor of your choice." style="'+SCREEN_SPECIFIC_HEADER_MARGIN_LEFT+'margin-right:5px;" class="click_to_copy_button add_button large_font bordered small_border_radius">Copy</button>';
    buttonHtml += '<button id="export-x-dates-as-oph-file" title="Export an .oph file of the code below" style="" class="add_button large_font bordered small_border_radius">Export File</button>';
    // buttonHtml += '<button title="Exports a human-readable PDF for the currently selected Iso-Event." style="margin-left:10px;" title="Export PDF report with current dates." class="export_pdf_button add_button large_font bordered small_border_radius">Export PDF</button>';
    var emptyHtml = ""; // click to copy button right above used to be here.
    // var headerHtml = "<table style='width:100%;'><tr><td style='text-align:left; width:33%;'>"+emptyHtml+"</td><td style='width:33%; border:none; text-align:center; height:unset;' class='col_sub_header_format'>"+instructionHtml+"</td><td style='width:33%;'></td></tr></table>"
    headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;">'+instructionHtml+'</td>';

    var prettifyCheckboxHtml = createGlobalOptionCheckboxHtml("prettify-x-date-output", "prettify_x_date_output", "Toggle whether exported JSON is nicely formatted, or a big blob.", "Prettify");
    var minifyCheckboxHtml = createGlobalOptionCheckboxHtml("minify-x-date-output", "minify_x_date_output", "Include the absolute minimum output by stripping out any fields that match current program defaults.", "Minify");

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = buttonHtml + prettifyCheckboxHtml + minifyCheckboxHtml;

    hookUpGlobalOptionCheckbox("prettify-x-date-output", GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT);
    hookUpGlobalOptionCheckbox("minify-x-date-output", GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT);

    var contentRow = addOutputRow();
    var contentRowInnerHtml = "";

    var saveBlob = "";

    contentRowInnerHtml += "<td style='text-align:center;' class='col_format'>";
    {
        var prettify = appState.globalOptions[GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT];
        var minify = appState.globalOptions[GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT];
        saveBlob = getSaveBlob(SAVE_BLOB_MODE__JUST_THE_EVENTS, prettify, minify);

        // saveBlob = saveBlob.replace(/\n/g, '<br>');
        // saveBlob = saveBlob.replaceAll(" ", "&nbsp;");

        // contentRowInnerHtml += "<button href='#' style='display:block; margin-top:10px;' id='click-to-save-to-clipboard'>Click To Save To Clipboard</button><br>";

        var prefaceForCodeInputOutputNote = "";
        if ( isRunningElectron() ) {
            contentRowInnerHtml += FILE_SAVE_AND_OPEN_SUGGESTION;
            prefaceForCodeInputOutputNote = "ALSO NOTE: ";
        } else {
            prefaceForCodeInputOutputNote = "NOTE: ";
        }
        
        contentRowInnerHtml += "<div class='warning_color about_body'>"+prefaceForCodeInputOutputNote+"The below code can be pasted into any text editor. It ONLY contains INPUT like X-Dates, Iso-Event names, lat/long, etc., with ZERO Output Z-Dates, Scores, Hits, etc.</div>"

        if ( prettify === true ) {
            contentRowInnerHtml += "<code style='text-align:left;'><pre style=''>"+saveBlob+"</pre></code>";
        } else {
            contentRowInnerHtml += "<code style=''>"+saveBlob+"</code>";
        }
    }
    contentRowInnerHtml += "</td>";

    contentRow.innerHTML = contentRowInnerHtml;


    var copyButtons = document.getElementsByClassName("click_to_copy_button");
    var copyButton = copyButtons[copyButtons.length-1];

    if ( copyButton ) {
        applyToolTip(copyButton);
        copyButton.addEventListener("click", function() {
            navigator.clipboard.writeText(saveBlob);

            showToast("Copied to clipboard!");

            markChangesSaved();
        });
    }

    var exportButton = document.getElementById("export-x-dates-as-oph-file");
    applyToolTip(exportButton);
    exportButton.addEventListener("click", function() {
        writeStringToFile(saveBlob, "Export.oph");
    });
}

function renderEventSettings() {
    var outputContainer = getOutputContainer();

    var currentIsoEventShortName = getRowShortNameHtml("E", appState.globalOptions.current_iso_event_index);

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = currentIsoEventShortName + " Settings";

     var headerRow = addOutputRow();

      var headerRowHtml = '';
    headerRowHtml += '<td style="width:0%; background:white;" class="col_sub_header_format"><div style="width:0px;"></div></td>';
    headerRowHtml += '<td id="event-source-header" title="" style="width:0%; white-space:nowrap;" class="col_sub_header_format tool_tippable_cursor">Setting Name</td>';
    headerRowHtml += '<td id="event-source-header" title="" style="width:100%; white-space:nowrap;" class="col_sub_header_format tool_tippable_cursor">Setting Value</td>';

    headerRow.innerHTML = headerRowHtml;


    for ( var i = 0; i < ISO_EVENT_SETTINGS.length; i++ ) {
        var ithSetting = ISO_EVENT_SETTINGS[i];

        var shortRowName = getRowShortNameHtml("S", i);

        var newRowHtml = "";

        var settingValueHtml = ithSetting.generateHtml();
        newRowHtml += "<td style='width:0%;' class='col_sub_header_format_for_row'><div class='input_row_name'>"+shortRowName+"</div></td>";
        newRowHtml += "<td style='padding:5px; text-align:center; width:0%; ' class='col_format col_with_input_left_right_padding'><div class=''>"+ithSetting.readableName+"</div></td>";
        newRowHtml += "<td style='padding:10px; width:100%;' class='col_format'>"+settingValueHtml+"</td>";

        var newRow = outputContainer.insertRow(-1);
        newRow.classList.add("iso_event_setting_row");
        newRow.innerHTML = newRowHtml;

        ithSetting.setUpListeners();
    }
}

function renderImport() {
    var headerRow = addOutputRow();
    var instructionHtml = "<div style='margin-right:10px;'>Paste Previously Exported Code</div>";
    var buttonHtml = '<button style="'+SCREEN_SPECIFIC_HEADER_MARGIN_LEFT+'margin-right:10px;" class="click_to_load_button add_button large_font bordered small_border_radius">Load</button>';
    var emptyHtml = ''; // click to load button right above used to be here.
    // var headerHtml = "<table style='width:100%;'><tr><td style='text-align:left; width:33%;'>"+emptyHtml+"</td><td style='width:33%; border:none; text-align:center; height:unset;' class=''>"+instructionHtml+"</td><td style='width:33%;'></td></tr></table>"
    headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;">'+instructionHtml+'</td>';

    var contentRow = addOutputRow();
    var contentRowInnerHtml = "";

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = buttonHtml;

    contentRowInnerHtml += "<td style='text-align:center; padding:15px;' class='col_format'>";
    {
        if ( isRunningElectron() ) {
            contentRowInnerHtml += FILE_SAVE_AND_OPEN_SUGGESTION;
        }
        contentRowInnerHtml += "<textarea class='text_area' style='' rows=10 id='code_load_area' placeholder='Paste previously exported Iso-Events here then click \"Load\" above.'></textarea>";
    }
    contentRowInnerHtml += "</td>";

    contentRow.innerHTML = contentRowInnerHtml;

    var loadButtons = document.getElementsByClassName("click_to_load_button");

    loadButtons[loadButtons.length-1].addEventListener("click", function() {
        var existingErrorCols = document.getElementsByClassName("load_error_col");

        while(existingErrorCols.length > 0){
            existingErrorCols[0].parentNode.removeChild(existingErrorCols[0]);
        }

        var textAreaElem = document.getElementById("code_load_area");

        if ( textAreaElem.value ) {
            if (appState.hasUnsavedChanges == true ) {
                showDialog("You have unsaved changes. Are you sure you want to overwrite them?", "NO, don't overwrite", "YES, overwrite", function() {
                    importIsoEventsFromUserInteraction(textAreaElem.value);
                });
            } else {
                showDialog("Are you sure you want to overwrite the existing Iso-Events and their X-Dates?", "NO, don't overwrite", "YES, overwrite", function() {
                    importIsoEventsFromUserInteraction(textAreaElem.value);
                });
            }
        } else {
            showToast("Nothing to load!");
        }
    });
}

function createGlobalOptionCheckboxHtml(elemId, elemClass, checkboxTitle, labelText, margin = 12) {
    var checkBoxHtml = "<input type='checkbox' style='position:relative;top:2px; margin-left:"+margin+"px;' id='"+elemId+"' class='"+elemClass+"' title='"+checkboxTitle+"' />";
    checkBoxHtml += "<label style='cursor:pointer;margin-left:1px;' title='"+checkboxTitle+"' id='"+elemId+"-label' for='"+elemId+"'>"+labelText+"</label>";

    return checkBoxHtml;
}

function hookUpGlobalOptionCheckbox(elemId, globalOption, onChangeElseRefreshCurrentPage = null) {
    var checkBoxElem = document.getElementById(elemId);

    if ( checkBoxElem ) {
        checkBoxElem.checked = appState.globalOptions[globalOption];

        function onChange() {
            var checkBoxElemInner = document.getElementById(elemId);
            var shouldNowBeChecked = checkBoxElemInner.checked;
            setGlobalOption(globalOption, shouldNowBeChecked);

            if ( onChangeElseRefreshCurrentPage ) {
                onChangeElseRefreshCurrentPage(shouldNowBeChecked);
            } else {
                refreshCurrentPage(REFRESH_TYPE__RIGHT_PANEL_ONLY, appState.latestResults);
            }
        }

        
        checkBoxElem.addEventListener("change", function() {
            var checkBoxElemInner = document.getElementById(elemId);

            if ( globalOption == GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT && appState.globalOptions[GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT] === false ) {
                checkBoxElemInner.checked = false;
                showMinifyWarningDialog(function() {
                    checkBoxElemInner.checked = true;
                    onChange();
                });
            } else {
                onChange();
            }
        });

        applyToolTip(checkBoxElem);
        applyToolTipToElemId(elemId + "-label");
    }
}

function renderAbout(results) {
    // var blurCheckboxHtml = createGlobalOptionCheckboxHtml("blur-about-screen-checkbox", "blur_about_screen_checkbox", "Show or Blur About Screen", "Blur Screen");
    var blurCheckboxHtml = "";

    var screenSpecificArea = document.getElementById("screen-specific-area");
    screenSpecificArea.innerHTML = blurCheckboxHtml;

    // hookUpGlobalOptionCheckbox("blur-about-screen-checkbox", GLOBAL_OPTION__BLUR_ABOUT_SCREEN);

    var headerRow = addOutputRow();
    headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;"><table style="width:100%;"><tr><td style="width:20%;"></td><td style="text-align:center; width:60%;">Please Read Carefully Before Use</td><td style="width:20%; text-align:right; padding-right:10px;"></td></tr></table></td>';

    var contentRow = addOutputRow();
    var contentRowInnerHtml = "";

    contentRowInnerHtml += "<td style='' class='col_format'><div id='about-screen-text' class='col_output_text'>";
    {
        contentRowInnerHtml += "<div class='about_header'>Implementation Details</div>";
        contentRowInnerHtml += "<div class='about_body'>";
        contentRowInnerHtml += "<ul class='about_page_ul'>";

        if ( isSunsetCompletelyDisabled() === false ) {
            contentRowInnerHtml += "<li>Sunset times are calculated using trigonometry based on date, latitude and longitude. These are implementations of algorithms described in the book 'Astronomical Algorithms' by Jean Meeus. Jewish calendar websites generally use these methods.</li>";
        }
        
        contentRowInnerHtml += "<li>Distance between calendar X-Dates is in days, which will always be whole numbers/integers (no decimal component). Meanwhile a Z-Value (operation result in days) DOES have a decimal component, rounded to the nearest tenth.</li>";
        contentRowInnerHtml += "<li>Z-Value days are fuzzily matched against MSRF integers. For example Z=12.4 matches 12 and 20.6 matches 21. Z-Values like 11.5 or 12.5 will never match an MSRF integer since they are \"right in the middle\". The exception to MSRF integers are the <span class='msrf_vortex'>Vortex Numbers</span> which DO have a decimal component and are matched if the Z-Value is equal +/- "+VORTEX_FILTER_MATCH_TOLERANCE+" .</li>";
        
        if ( isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ) {
            contentRowInnerHtml += "<li>If using HH:MM Scope, Input times should be provided relative to the time zone implied by an Iso-Event's lat/long coordinates, NOT in UTC time or local time (unless they happen to match the time zone). If inputting the end time of a game, imagine you're a local, in the stadium, when the game ends. What does your phone say is the date and time? Put that in.</li>";
            contentRowInnerHtml += "<li>Output times like sunsets and Z-Dates (AKA Future Dates) are ALSO displayed relative to every Iso-Event's individual, local timezone.</li>";
        }
        
        // This item is now an optional (by default enabled) filter.
        // contentRowInnerHtml += "<li>It is very common for the algorithm to generate Z-Dates that occur BEFORE (or on) the last X-Date, assuming more than two X-Dates. These Z-Dates are excluded from Condensed Output.</li>";
        // contentRowInnerHtml += "<li>The 'Debug' screen is provided only for auditability of this implementation, to make sure of no mistakes against the specification. It's kind of half-baked and will either be improved on, or later versions may exclude it.</li>";
        contentRowInnerHtml += "</ul>";
        contentRowInnerHtml += "</div>";



        // SECURITY
        contentRowInnerHtml += "<div class='about_header'>Security</div>";
        contentRowInnerHtml += "<div class='about_body'>";
        {
            contentRowInnerHtml += "<ul class='about_page_ul'>";
            contentRowInnerHtml += "<li>This program uses ZERO external resources. ALL files (code, data, images, etc.) are loaded locally. This can be confirmed by opening Developer Tools and watching network traffic.</li>";
            contentRowInnerHtml += "<li>The program was originally designed to be run on an air-gapped computer. No Internet connection. Defense-in-depth. And this is another proof that everything is local.</li>";
            contentRowInnerHtml += "</ul>";
        }
        contentRowInnerHtml += "</div>";


        // SCORING SYSTEM
        contentRowInnerHtml += "<div class='about_header'>Scoring System</div>";
        contentRowInnerHtml += "<div class='about_body'>";
        contentRowInnerHtml += "<span class=''>Every future Z-Date is given a cumulative Score based on the below criteria. Click the '?' on the chart for more information on Scoring and Hits.";//If a Z-Date has a score of zero then it's considered a ghost and excluded from the results entirely. A Z-Date is also excluded if it takes place BEFORE (or on) the last X-Date, even if it has a non-zero score.</span>";
        {
            contentRowInnerHtml += "<ul style='margin-top:10px;' class='about_page_ul'>";
            contentRowInnerHtml += "<li>"+readablePointsString("X")+" for every Operation that generated it, customizable on the Operations Screen.</li>";
            // contentRowInnerHtml += "<li>"+readablePointsString(POINTS__BETA_OPERATION_MATCH)+" for every <span class='operation_beta'>Beta Operation</span> that generated it.</li>";//, as long as one or more of the following conditions are met: <ul><li>At least one other <span class='operation_alpha'>Alpha</span> match.</li><li>At least one other <span class='operation_beta'>Beta</span> match.</li><li>At least one MSRF match.</li></ul>";
            contentRowInnerHtml += "<li><span class='operation_alpha'>Alpha Operations</span> are those with a \"weight\" >= 1, otherwise it's a <span class='operation_beta'>Beta Operation</span>.</li>";
            
            contentRowInnerHtml += "<li>"+readablePointsString(POINTS__NORMAL_MSRF_MATCH)+" for every <span class='msrf_normal'>Normal MSRF</span> match.</li>";
            contentRowInnerHtml += "<li>"+readablePointsString(POINTS__IMPORTANT_MSRF_MATCH)+" for every <span class='msrf_important'>Important MSRF</span> match.</li>";
            contentRowInnerHtml += "<li>"+readablePointsString(POINTS__VORTEX_MSRF_MATCH)+" for every <span class='msrf_vortex'>Vortex MSRF</span> match.</li>";
            contentRowInnerHtml += "</ul>";
        }
        contentRowInnerHtml += "</div>";



        // OPHIS OPERATIONS
        // contentRowInnerHtml += "<div class='about_header'>Operations</div>";
        // contentRowInnerHtml += "<div class='about_body'>";

        // contentRowInnerHtml += "<div style='text-align:center;margin-bottom:10px;'><span class='operation_alpha'>Alpha</span> - <span class='operation_beta'>Beta</span></div>";

        // var xSub1 = getRowShortNameHtml("X", 0);
        // var xSub2 = getRowShortNameHtml("X", 1);
        
        // // contentRowInnerHtml += "<ul class='about_page_ul'>";
        // contentRowInnerHtml += "<table>";
        // for( var i = 0; i < OPHIS_OPERATIONS.length; i++ ) {
        //     var ithOperation = OPHIS_OPERATIONS[i];

        //     var cssClassName = "";

        //     if ( isBetaOperation(ithOperation) ) {
        //         cssClassName = "operation_beta";
        //     } else if ( isAlphaOperation(ithOperation) ) {
        //         cssClassName = "operation_alpha";
        //     }

        //     var operationName = ithOperation.equation;
        //     operationName = operationName.replace("X1", xSub1);
        //     operationName = operationName.replaceAll(" ", "&nbsp;");
        //     operationName = operationName.replace("X2", xSub2);
        //     operationName = operationName.replaceAll("x", "&centerdot;");


        //     var operationWithConstantsReplaced = replaceOperationConstants(operationName);


        //     // operationName = operationName.replace("PI", "&#960;");
        //     // operationName = operationName.replace("PI", "&pi;");
        //     // operationName = operationName.replace("PHI", "&phi;");
        //     // operationName = operationName.replace("PI", "&Pi;");
        //     // operationName = operationName.replace("PHI", "&Phi;");
            
            
        //     // operationName = operationName.replace("x", "&times;");

            
        //     var operationZShortName = getRowShortNameHtml(OPERATION_SHORTHAND, i);

        //     contentRowInnerHtml += "<tr>";
        //     contentRowInnerHtml += "<td><span class='"+cssClassName+"' style='font-weight:600;'>"+operationZShortName+"</span></td>";
        //     contentRowInnerHtml += "<td style='font-weight:600;'>&nbsp;&nbsp;=&nbsp;&nbsp;</td>";
        //     contentRowInnerHtml += "<td><span class='"+cssClassName+"' style='font-weight:600;'>"+operationName+"</span></td>";
        //     contentRowInnerHtml += "<td style='font-weight:600;'>&nbsp;&nbsp;=&nbsp;&nbsp;</td>";
        //     contentRowInnerHtml += "<td><span class='"+cssClassName+"' style='font-weight:600;'>"+operationWithConstantsReplaced+"</span></td>";
        //     contentRowInnerHtml += "</tr>";

        //     // contentRowInnerHtml += "<li style='font-weight:600;'><span style='font-weight:600;'>"+operationZShortName+":&nbsp;</span><span class='"+cssClassName+"'>"+operationName+"</span></li>";
        //     // contentRowInnerHtml += "<li style='font-weight:600;'><span class='"+cssClassName+"'>"+operationZShortName+"&nbsp;=&nbsp;"+operationName+"&nbsp;=&nbsp;"+operationWithConstantsReplaced+"</span></li>";
        // }
        // // contentRowInnerHtml += "</ul>";
        // contentRowInnerHtml += "</table>";

        // contentRowInnerHtml += "</div>";



        // FILTER NUMBERS
        contentRowInnerHtml += "<div class='about_header'>MSRF Numbers</div>";
        contentRowInnerHtml += "<div style='text-align: justify; text-justify: inter-word;' class='about_body'>";
        {
            contentRowInnerHtml += "<div style='text-align:center;margin-bottom:10px;'><span class='msrf_normal'>Normal</span> - <span class='msrf_important'>Important</span> - <span class='msrf_vortex'>Vortex</span></div>";

            var filterNumberHtml = "";
            for( var i = 0; i < MSRF_FILTER__FINAL.length; i++ ) {
                var ithFilterNumber = MSRF_FILTER__FINAL[i];

                if ( i > 0 ) {
                    filterNumberHtml += ", ";
                }

                var filterMatch = getMsrfMatch(ithFilterNumber);

                var cssClassName = "";

                if ( filterMatch != null ) {
                    cssClassName = filterMatch.css_class;
                } else {
                    filterNumberHtml = "Programmer Error: Unclassified filter number: " + ithFilterNumber;
                    break;
                }

                filterNumberHtml += "<span class='"+cssClassName+"'>" + ithFilterNumber + "</span>";
            }
            contentRowInnerHtml += filterNumberHtml;
        }
        contentRowInnerHtml += "</div>";

        contentRowInnerHtml += "<br>";
    }
    contentRowInnerHtml += "</div></td>";

    contentRow.innerHTML = contentRowInnerHtml;

    var aboutScreenText = document.getElementById("about-screen-text");

    aboutScreenText.style.filter = appState.globalOptions[GLOBAL_OPTION__BLUR_ABOUT_SCREEN] == true ? "blur(8px)" : "";
}

function updateLatLongInputElemValues() {
    var latElems = document.getElementsByClassName("lat_input");
    var longElems = document.getElementsByClassName("long_input");
    var openMapIcons = document.getElementsByClassName("open_map_icon");
    var timezoneElems = document.getElementsByClassName("timezone_display");
    var locationEnabledCheckboxes = document.getElementsByClassName("location_enabled_checkbox");

    for ( var i = 0; i < latElems.length; i++ ) {
        var ithLatElem = latElems[i];
        var ithLongElem = longElems[i];
        var ithTimezoneElem = timezoneElems[i];
        var ithMapIcon = openMapIcons[i];
        var ithLocationEnabledCheckbox = locationEnabledCheckboxes[i];

        var ithIsoEvent = appState.isoEvents[i];

        ithLatElem.value = ithIsoEvent.lat;
        ithLongElem.value = ithIsoEvent.long;

        // var ithTimezone = ithIsoEvent.location_enabled ? getTimezone(ithIsoEvent.lat, ithIsoEvent.long) : "Etc/UTC";
        var ithTimezone = getTimezone(ithIsoEvent.lat, ithIsoEvent.long);

        ithTimezoneElem.innerHTML = ithTimezone;
        ithTimezoneElem.title = ithTimezone;

        if ( ithIsoEvent.location_enabled ) {
            ithLatElem.disabled = false;
            ithLongElem.disabled = false;
            ithLatElem.style.opacity = OPACITY__ENABLED;
            ithLongElem.style.opacity = OPACITY__ENABLED;
            ithMapIcon.style.opacity = OPACITY__ENABLED;
            ithMapIcon.style.cursor = "pointer";

            if ( ithLocationEnabledCheckbox ) {
                ithLocationEnabledCheckbox.checked = true;
            }
        } else {
            ithLatElem.disabled = true;
            ithLongElem.disabled = true;
            ithLatElem.style.opacity = OPACITY__DISABLED;
            ithLongElem.style.opacity = OPACITY__DISABLED;
            ithMapIcon.style.opacity = OPACITY__DISABLED;
            ithMapIcon.style.cursor = "not-allowed";
            
            if ( ithLocationEnabledCheckbox ) {
                ithLocationEnabledCheckbox.checked = false;
            }
        }
    }
}