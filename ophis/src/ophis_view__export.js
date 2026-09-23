
var OPH_OUTPUT_NONE_KEYWORD = "None";

// Failure cases may be broken down more in the future if warranted.
var OPH_OUTPUT_ERROR_STATUS__SUCCESS = OPH_OUTPUT_NONE_KEYWORD;
var OPH_OUTPUT_ERROR_STATUS__NO_RESULTS = "NO_RESULTS";
var OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE = "GENERAL_FAILURE";

function handleHeadlessOutput() {
    if ( appState.isoEvents.length > 0 ) {
        if ( appState.headless_multiple_files === true ) {
            exportHeadlessMultipleCsvs();
        } else {
            exportHeadlessSingleCsv();
        }
    } else {
        exitHeadlessWithError("No Iso Events found.");
    }
}

function newCsvRowForError(currentIsoEvent, error) {

    var currentIsoEventName = currentIsoEvent.name;

    var errorStatus = error.error_status;
    var errorMessage = error.error_message;

    return {
        IsoEvent: currentIsoEventName,
        Date: OPH_OUTPUT_NONE_KEYWORD,
        Hits: 0,
        Score: 0,
        MSRF: OPH_OUTPUT_NONE_KEYWORD,
        Operations: OPH_OUTPUT_NONE_KEYWORD,
        ErrorStatus: errorStatus,
        ErrorMessage: errorMessage
    };
}

function exportHeadlessSingleCsv() {
    var csvRows = [];

    for ( var i = 0; i < appState.isoEvents.length; i++) {
        var ithIsoEvent = appState.isoEvents[i];
        var results = runOphisOnEventForExport(ithIsoEvent);

        if ( results.errors.length > 0 ) {
            console.error("Could not run on event: " + ithIsoEvent.name);

            for ( var k = 0; k < results.errors.length; k++ ) {
                var kthError = results.errors[k];

                console.error(JSON.stringify(kthError));

                var nextCsvRow = newCsvRowForError(ithIsoEvent, kthError);

                csvRows.push(nextCsvRow);
            }
        } else {

            var zDates = results.processed_z_dates__sorted_by_date;

            for (var k = 0; k < zDates.length; k++) {
                var kthZDateDictKey = zDates[k];
                var kthZDateTags = results.z_structs[kthZDateDictKey];
                
                // Add this debug logging
                // console.log('Processing date key:', kthZDateDictKey);
                // console.log('Tags object:', JSON.parse(JSON.stringify(kthZDateTags))); // This creates a clean copy for logging
                
                var nextCsvRow = newCsvRowForZDate(ithIsoEvent, kthZDateTags);

                csvRows.push(nextCsvRow);
            }
        }
    }

    if ( csvRows.length >= 1 ) {

        var fileName = "";

        if ( appState.headless_output_path ) {
            var fileName_fileNamePortion = appState.headless_output_path;
            var baseFileName = getFileNameFromPath(appState.filePathFromMainArgs);
            baseFileName = baseFileName.replace(".oph", ".csv");
            fileName = fileName_fileNamePortion + "/" + baseFileName;
        } else {
            fileName = appState.filePathFromMainArgs.replace(".oph", ".csv");
        }
        
        console.log("Outputting CSV to " + fileName);

        var csvString = Papa.unparse(csvRows);

        electronBridge.autoSaveToFile(fileName, csvString);

        electronBridge.closeAppWithHeadlessSuccess();
    } else {
        exitHeadlessWithError("Could not produce any CSV output. See above errors.");
    }
}

function exportHeadlessMultipleCsvs() {
    var numberOfCsvsCreated = 0;
        
    for ( var i = 0; i < appState.isoEvents.length; i++) {
        var ithIsoEvent = appState.isoEvents[i];
        var results = runOphisOnEventForExport(ithIsoEvent);

        var fileName_eventNamePortion = getCsvFileNameForExport(ithIsoEvent);

        var fileName = "";

        if ( appState.headless_output_path ) {
            var fileName_fileNamePortion = appState.headless_output_path;
            var baseFileName = getFileNameFromPath(appState.filePathFromMainArgs);
            baseFileName = baseFileName.replace(".oph", "");
            fileName = fileName_fileNamePortion + "/" + baseFileName + "/" + fileName_eventNamePortion;
        } else {
            var fileName_fileNamePortion = appState.filePathFromMainArgs;
            fileName_fileNamePortion = fileName_fileNamePortion.replace(".oph", "");
            fileName = fileName_fileNamePortion + "/" + fileName_eventNamePortion;
        }
        
        console.log("Outputting CSV to " + fileName);

        var csvString = convertResultsToCsvString(ithIsoEvent, results);

        electronBridge.autoSaveToFile(fileName, csvString);

        numberOfCsvsCreated++;
    }

    if ( numberOfCsvsCreated >= 1 ) {

        if ( numberOfCsvsCreated < appState.isoEvents.length ) {
            console.warn("Could not produce all CSVs. See above errors. " + numberOfCsvsCreated);
        }

        electronBridge.closeAppWithHeadlessSuccess();
    } else {
        exitHeadlessWithError("Could not produce any CSV files. See above errors.");
    }
}

function getInputValidationModeFromQueryParams() {
    var inputValidationModeRaw = getQueryParamString("input_validation_mode", "");
    var inputValidationMode = null;

    if ( inputValidationModeRaw ) {
        if ( toLowerCase(inputValidationModeRaw) == "loose" ) {
            inputValidationMode = FILE_INPUT_VALIDATION_MODE__LOOSE;
        } else if ( toLowerCase(inputValidationModeRaw) == "original" ) {
            inputValidationMode = FILE_INPUT_VALIDATION_MODE__ORIGINAL;
        } else if ( toLowerCase(inputValidationModeRaw) == "strict" ) {
            inputValidationMode = FILE_INPUT_VALIDATION_MODE__STRICT;
        } else {
            var defaultValidationMode = FILE_INPUT_VALIDATION_MODE__STRICT;
            console.warn("Unrecognized input validation mode, defaulting to: " + defaultValidationMode);

            inputValidationMode = defaultValidationMode;
        }
    } else {
        if ( isRunningHeadless() ) {
            inputValidationMode = FILE_INPUT_VALIDATION_MODE__STRICT;
        } else {
            inputValidationMode = FILE_INPUT_VALIDATION_MODE__LOOSE;
        }
    }
    
    return inputValidationMode;
}

function getHeadlessOutputTypeFromQueryParams() {
    var headlessOutputTypeRaw = getQueryParamString("headless_output_type", "csv");

    if ( toLowerCase(headlessOutputTypeRaw) == "csv" ) {
        return OPH_HEADLESS_OUTPUT_TYPE__CSV;
    } else {
        console.warn("Unsupported output type " + headlessOutputTypeRaw + " so assuming " + OPH_HEADLESS_OUTPUT_TYPE__DEFAULT);
        return OPH_HEADLESS_OUTPUT_TYPE__DEFAULT;
    }
}

function renderExportZDates() {
    var headerRow = addOutputRow();
    headerRow.innerHTML = '<td class="col_sub_header_format" style="width:50%;"><table style="width:100%;"><tr><td style="width:20%;"></td><td style="text-align:center; width:60%;">Export Z-Dates to Various Formats</td><td style="width:20%; text-align:right; padding-right:10px;"></td></tr></table></td>';

    var contentRow = addOutputRow();
    var contentRowInnerHtml = "";
    
    contentRowInnerHtml += "<td style='' class='col_format'><div id='about-screen-text' class='col_output_text'>";
    {
        contentRowInnerHtml += "<div style='text-align:center;' class='warning_color about_body'>NOTE: The below export options are provided as a Proof of Concept and can be improved depending on use cases.</div>"

        contentRowInnerHtml += "<div class='about_body'>";
        // contentRowInnerHtml += "<br>";
        contentRowInnerHtml += "<a id='pdf-export-link' class='export_link'>Export PDF for Currently Selected Iso-Event</a>";
        contentRowInnerHtml += "<br><br>";
        contentRowInnerHtml += "<a id='csv-export-link' class='export_link'>Export CSV for Currently Selected Iso-Event</a>";
        contentRowInnerHtml += "<br><br>";
        contentRowInnerHtml += "<a id='excel-export-link' class='export_link'>Export Excel Sheet for Currently Selected Iso-Event</a>";

        contentRowInnerHtml += "</div>";

    }
    contentRowInnerHtml += "</div></td>";

    contentRow.innerHTML = contentRowInnerHtml;

    var pdfExportLink = document.getElementById("pdf-export-link");
    var csvExportLink = document.getElementById("csv-export-link");
    var excelExportLink = document.getElementById("excel-export-link");

    pdfExportLink.addEventListener("click", function() {
        validateOutputBeforeExport(function() {
            function chartExportContinuation() {
                showToast("Generating report, may take a second...");

                setTimeout(function() {
                    exportPdf();
                }, 500);
            }

            if ( isChartNotCentered() ) {
                showDialog("The chart is not centered. Would you like to center it first before taking a snapshot?", "NO, use current position", "YES, center it", function() {
                    recenterChart();
                    chartExportContinuation();
                }, function() {
                    chartExportContinuation();
                });
            } else {
                chartExportContinuation();
            }
        });
    });

    csvExportLink.addEventListener("click", function() {
        validateOutputBeforeExport(function() {
            exportCsv(getCurrentIsoEvent(), appState.latestResults);
        });
    });

    excelExportLink.addEventListener("click", function() {
        validateOutputBeforeExport(function() {
            exportExcel();
        });
    });
}

function validateOutputBeforeExport(continuation) {
    
    if ( appState.latestResults.stale === true ) {
        var preserveScrollPosition = true;
        refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, OPHIS_INPUT_CHANGE__FORCE);
    }

    if ( appState.latestResults.errors.length > 0 ) {
        showOkDialog("Please fix errors and try again.");
    } else {
        continuation();
    }
}

// {
//     "z_date_native": "2025-07-05T03:21:36.000Z",
//     "z_date_native_start": "2025-07-05T00:00:00.000Z",
//     "z_date_native_end": "2025-07-05T00:00:00.000Z",
//     "z_date_readable_start": "07/05/2025",
//     "z_date_readable_end": "07/05/2025",
//     "operation_match_structs": [],
//     "msrf_match_structs": [],
//     "score": 2,
//     "hit_count": 3,
//     "operation_score": 2,
//     "operation_hit_count": 3,
//     "z_ordinal": 0
// }

function writeStringToFile(stringToWrite, fileName) {
    var blob = new Blob([stringToWrite], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function newCsvRowForZDate(currentIsoEvent, zDateTags) {
    
    var currentIsoEventName = currentIsoEvent.name;

    // Safely get MSRF numbers
    let msrfNumbers = [];
    if (Array.isArray(zDateTags.msrf_match_structs)) {
        msrfNumbers = zDateTags.msrf_match_structs
        .map(msrf => msrf.msrf_number)
        .filter(num => num !== undefined)
        .sort((a, b) => b - a);
    }

    // Get operation numbers (operation_ordinal + 1)
    let operationNumbers = [];
    if (Array.isArray(zDateTags.operation_match_structs)) {
        operationNumbers = zDateTags.operation_match_structs
        .map(op => {
            // Look for operation_ordinal in operation_result
            var opResult = op.operation_result || {};
            var opNum = (opResult.operation_ordinal !== undefined) ? opResult.operation_ordinal + 1 : null;
            if ( opNum < 10 ) {
                opNum = "0" + opNum;
            }
            return opNum ? "OP" + opNum: null;
        })
        .filter(op => op !== null)
        .sort((a, b) => {
            // Sort by operation number
            var numA = parseInt(a.replace('OP', ''));
            var numB = parseInt(b.replace('OP', ''));
            return numA - numB;
        });
    }

    return {
        IsoEvent: currentIsoEventName,
        Date: zDateTags.z_date_readable_start_no_html,
        Hits: zDateTags.hit_count,
        Score: zDateTags.score,
        MSRF: msrfNumbers.join(', ') || OPH_OUTPUT_NONE_KEYWORD,
        Operations: operationNumbers.join(', ') || OPH_OUTPUT_NONE_KEYWORD,
        ErrorStatus: OPH_OUTPUT_ERROR_STATUS__SUCCESS,
        ErrorMessage: OPH_OUTPUT_NONE_KEYWORD
    };
}

function convertResultsToCsvString(currentIsoEvent, results) {

    var csvRows = [];

    if ( results.errors.length > 0 ) {
        console.error("Could not run on event: " + currentIsoEvent.name);

        for ( var k = 0; k < results.errors.length; k++ ) {
            var kthError = results.errors[k];

            console.error(JSON.stringify(kthError));

            var nextCsvRow = newCsvRowForError(currentIsoEvent, kthError);

            csvRows.push(nextCsvRow);
        }
    } else {
        var zDates = results.processed_z_dates__sorted_by_date;

        for (var i = 0; i < zDates.length; i++) {
            var ithZDateDictKey = zDates[i];
            var ithZDateTags = results.z_structs[ithZDateDictKey];
            
            // Add this debug logging
            // console.log('Processing date key:', ithZDateDictKey);
            // console.log('Tags object:', JSON.parse(JSON.stringify(ithZDateTags))); // This creates a clean copy for logging
            
            var ithCsvRow = newCsvRowForZDate(currentIsoEvent, ithZDateTags);
            csvRows.push(ithCsvRow);
        }
    }

    var csvString = Papa.unparse(csvRows);

    return csvString;
}

function getFileNameFromPath(filePath) {
  // Handle both forward and backward slashes
  const parts = filePath.split(/[/\\]/);

  return parts.pop(); // Get the last element (filename)
}

function getCsvFileNameForExport(currentIsoEvent) {
    var fileName = getFileNameForExport(currentIsoEvent);
    fileName += ".csv";

    return fileName;
}

function exportCsv(currentIsoEvent, results) {
    var fileName = getCsvFileNameForExport(currentIsoEvent);

    var csvString = convertResultsToCsvString(currentIsoEvent, results);

    writeStringToFile(csvString, fileName);
}

function newExcelRowForDate(zDateTags) {
    
    return [{
        type: String,
        value: zDateTags.z_date_readable_start_no_html
    }, {
        type: Number,
        value: zDateTags.hit_count
    }, {
        type: Number,
        value: zDateTags.score
    }];
}

function exportExcel() {
    
    const headerRow = [{
        value: 'Date',
        fontWeight: 'bold'
    }, {
        value: 'Hits',
        fontWeight: 'bold'
    }, {
        value: 'Score',
        fontWeight: 'bold'
    }];

    var fileName = getFileNameForExport();
    fileName += ".xlsx";
    var zDates = appState.latestResults.processed_z_dates__sorted_by_date;

    var excelRows = [];

    excelRows.push(headerRow);

    for ( var i = 0; i < zDates.length; i++ ) {
        var ithZDateDictKey = zDates[i];
        var ithZDateTags = appState.latestResults.z_structs[ithZDateDictKey];
        var ithExcelRow = newExcelRowForDate(ithZDateTags);

        excelRows.push(ithExcelRow);
    }

    var columns = null;

    writeXlsxFile(excelRows, {
        columns, // (optional) column widths, etc.
        fileName: fileName
    })
}

function getFileNameForExport(currentIsoEvent = getCurrentIsoEvent()) {
    var currentIsoEventName = currentIsoEvent.name;
    var fileName = currentIsoEventName.replaceAll(" ", "_");

    var fileName_sanitized = sanitizeFileName(fileName);

    if ( fileName != fileName_sanitized ) {
        console.warn("Original fileName='"+fileName+"' had to be changed to '"+fileName_sanitized+"'.");

        return fileName_sanitized;
    } else {
        return fileName;
    }
}

function exportPdf() {
    var TITLE_FONT_SIZE = 20;
    var BODY_FONT_SIZE = 14;
    var MARGIN = 20;
    var MARGIN_2 = MARGIN*2;
    var TABLE_WIDTH = pageWidth - MARGIN;
    var TAB = "&nbsp;&nbsp;&nbsp;";
    var MARGIN_INNER = 0;
    
    var currentIsoEvent = getCurrentIsoEvent();
    var currentIsoEventName = currentIsoEvent.name;

    var filename = getFileNameForExport();
    
    var pdfDoc = new jspdf.jsPDF('l', 'pt')
    var pageWidth = pdfDoc.internal.pageSize.getWidth();
    var pageHeight = pdfDoc.internal.pageSize.getHeight();
    var currentPage = 0;
    var htmlForDateOutput = [];
    
    pdfDoc.addPage(); // for the chart.
    
    function titleHtml(title, useBr = true) {
        var toReturn = "<div style='text-align:center; font-size:"+TITLE_FONT_SIZE+"px; width:100%;'>"+title+"</div>";
        
        if ( useBr == true ) {
            toReturn += "<br>";
        }
        return toReturn;
    }
    
    var pdfDocConfig = {
        callback: function() {
            
            currentPage++;
            pdfDocConfig.y = currentPage * pageHeight;
            
            if ( currentPage == 1 ) {
                var chartElem = getChartElem();
                var chartWidth = chartElem.clientWidth;
                var chartHeight = chartElem.clientHeight;
                var scaling = pageWidth / chartWidth;
                
                var QUALITY = .95;
                function blobCallback(blob) {
                    var blobUrl = URL.createObjectURL(blob);
                    var chartHeightScaled = chartHeight*scaling;
                    var chartStartY = pageHeight/2.0 - chartHeightScaled/2.0;
                    
                    pdfDoc.setPage(2);
                    pdfDoc.addImage(blobUrl,'JPEG', 0, chartStartY, chartWidth*scaling, chartHeightScaled);
                    
                    pdfDoc.line(0, chartStartY, pageWidth, chartStartY);
                    pdfDoc.line(0, chartStartY+chartHeightScaled, pageWidth, chartStartY+chartHeightScaled);
                    
                    var chartTitle = titleHtml("Chart for '" + currentIsoEventName + "'");
                    var chartHtml = PAGE_START_HTML + chartTitle + PAGE_END_HTML;
                    pdfDocConfig.y -= MARGIN_2
                    pdfDoc.html(chartHtml, pdfDocConfig);
                }

                getChartElem().toBlob(blobCallback, "image/jpeg", QUALITY);
            } else if ( currentPage >= 2) {

                var pageFlattened = currentPage - 2;

                if ( pageFlattened < htmlForDateOutput.length ) {
                    pdfDocConfig.y -= (MARGIN_2*2)
                    pdfDocConfig.y -= (MARGIN_2*pageFlattened)
                    pdfDocConfig.y += 5;

                    // // pdfDoc.setPage(currentPage);
                    // pdfDocConfig.y = pageHeight * currentPage;

                    // pdfDocConfig.margin = 40;
                    pdfDoc.html(htmlForDateOutput[pageFlattened], pdfDocConfig);
                } else {
                    pdfDoc.save(filename + '.pdf');
                }
            }
        },
        windowWidth: pageWidth,
        width: pageWidth,
        margin:MARGIN
        // autoPaging: "text"
    };
    
    var htmlPageOne = "";
    
    var PAGE_START_HTML = "<table style='width:100%; height:100%;'><tr><td style='padding-right:"+MARGIN_2+"px'>";
    PAGE_START_HTML += "<div style='word-spacing:0px; width:100%;font-size:"+BODY_FONT_SIZE+"px;'>";
    
    var PAGE_END_HTML = "</div></td></tr></table>";
    
    htmlPageOne += PAGE_START_HTML;
    
    // html += "<br>";
    var currentNativeDate = getCurrentLocalTime();
    var currentDateAsXDate = nativeDateToXDate(currentNativeDate);
    
    htmlPageOne += titleHtml("Ophis Report for '" + currentIsoEventName + "'", /*useBr=*/false);
    htmlPageOne += "<div style='text-align:center; color:grey; font-size:"+BODY_FONT_SIZE+"px; width:100%;'>Generated on "+currentDateAsXDate.date+"</div><br>";
    
    var disclaimer = "";
    disclaimer += TAB + "The following Report has been generated using the Ophis Date Sequence Predictive Analytics software, based on Input Dates provided by you. ";
    disclaimer += "Predicting the future will never be 100% accurate. The content of this report is thus provided for information purposes only. ";
    disclaimer += "You should not construe any such information or other material generated by this software as legal, investment, financial, or any other type of advice.";
    disclaimer += "<br><br>";
    disclaimer += TAB + "Following is a breakdown of terms to help you interpret the information provided in this Report.";
    disclaimer += "<br>";
    
    htmlPageOne += "<table style='font-size:"+BODY_FONT_SIZE+"px; width:100%;'><tr><td style='padding-right:"+MARGIN_INNER+"px;'>"+disclaimer+"</tr></td></table>";
    htmlPageOne += "<br>";
    
    var TERM_SPACE = "<tr><td>&nbsp;</td></tr>";
    
    function term(termName, text) {
        return "<tr><td style='text-align:right; vertical-align:top;'><b>-</b></td><td style='padding-left:5px;padding-right:"+MARGIN_INNER+"px;'><div><b>"+termName+"&nbsp;</b>"+text+"</div></td></tr>" + TERM_SPACE;
    }
    
    // html += "<table style='width:"+TABLE_WIDTH+"pt;'>";
    htmlPageOne += "<table width='"+TABLE_WIDTH+"'>";
    htmlPageOne += term(
        "All&nbsp;Dates",
        "in this report are given in the MM/DD/YYYY format."
    );
    htmlPageOne += term(
        "Input&nbsp;Dates",
        "were provided by you and represent a series of significant events, either in your personal life or in the collective. These events must have a similar theme."
    );
    htmlPageOne += term(
        "Output&nbsp;Dates",
        "are generated by the Ophis software, and indicate future dates where either (a) the event related to the Input Dates is likely to reoccur, and/or (b) conditions will be conducive to making it happen again."
    );
    htmlPageOne += term(
        "Hits",
        "are provided for each Output Date, and describe the number of individual Ophis operations and filters that generated the date. This can indicate a higher importance of the date relative to other Output Dates."
    );
    htmlPageOne += term(
        "Scores",
        "are also provided for each Output Date. A Score is similar to the number of Hits, however some Ophis operations and filters are more significant than others. The Score reflects this further breakdown."
    );
    htmlPageOne += term(
        "Chart Ouput",
        "is provided to give you a visual feel for how the Output Dates ripple into the future. You may notice that some of the individual Output Dates cluster around each other, which strengthens the signal for that time period as a whole, especially when one or more of the clustered dates have a high Score or Hits."
    );
    
    htmlPageOne += "</table>";
    
    htmlPageOne += PAGE_END_HTML;
    
    
    var MAX_DATE_ROWS_PER_PAGE = 15;
    var ORDINAL_BACKGROUND_COLOR = "#dddddd";
    var DARKER_BACKGROUND_COLOR = "#bbbbbb";
    var TABLE_PADDING = 5;
    
    var BORDER = "1px solid black"
    var tableCellStyle = "padding:5px;";
    var ordinalTableCellStyle = "text-align:center;"
    var dateTableStyle = "border-collapse: collapse; width:100%;";
    var dateLabelStyle = "border: "+BORDER+"; border-radius: 2px;";

    var xDates = currentIsoEvent.x_dates;
    var zDates = appState.latestResults.processed_z_dates__sorted_by_date;
    var maxDates = Math.max(xDates.length, zDates.length);

    function tablePageHtml(pageIndex) {
        var toReturn = "";
    
        toReturn += PAGE_START_HTML;

        var xTableVisible = xDates.length >= pageIndex*MAX_DATE_ROWS_PER_PAGE;
        var zTableVisible = zDates.length >= pageIndex*MAX_DATE_ROWS_PER_PAGE;

        var xTableVisibility = xTableVisible ? "" : "visibility:hidden;";
        var zTableVisibility = zTableVisible ? "" : "visibility:hidden;";
        
        var xDateTableHtml = "<table style='"+xTableVisibility+""+dateTableStyle+"'>";
        var zDateTableHtml = "<table style='"+zTableVisibility+""+dateTableStyle+"'>";
        var spaceTableHtml = "<div style='width:80px;'></div>";
        
        var inputDatesTitle = "Input Dates";
        var outputDatesTitle = "Output Dates";

        if ( xTableVisible && pageIndex >= 1 ) {
            inputDatesTitle += " (continued)";
        }

        if ( zTableVisible && pageIndex >= 1 ) {
            outputDatesTitle += " (continued)";
        }
        
        xDateTableHtml += "<tr>";
        xDateTableHtml += "<td colspan=2 style='background-color:"+DARKER_BACKGROUND_COLOR+";border-left:"+BORDER+";border:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>"+inputDatesTitle+"</b></td>";
        xDateTableHtml += "</tr>";
        
        xDateTableHtml += "<tr>";
        xDateTableHtml += "<td style='background-color:"+ORDINAL_BACKGROUND_COLOR+"; border-left:"+BORDER+";border-bottom:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>Chart Label</b></td>";
        xDateTableHtml += "<td style='background-color:"+ORDINAL_BACKGROUND_COLOR+"; border-right:"+BORDER+";border-left:"+BORDER+";border-bottom:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>MM/DD/YYYY</b></td>";
        xDateTableHtml += "</tr>";
        
        
        zDateTableHtml += "<tr>";
        zDateTableHtml += "<td colspan=4 style='background-color:"+DARKER_BACKGROUND_COLOR+";border-left:"+BORDER+";border:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>"+outputDatesTitle+"</b></td>";
        zDateTableHtml += "</tr>";
        
        zDateTableHtml += "<tr style=''>";
        zDateTableHtml += "<td style='background-color:"+ORDINAL_BACKGROUND_COLOR+"; border-left:"+BORDER+";border-bottom:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>Chart Label</b></td>";
        zDateTableHtml += "<td style='background-color:"+ORDINAL_BACKGROUND_COLOR+"; border-left:"+BORDER+";border-bottom:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>MM/DD/YYYY</b></td>";
        zDateTableHtml += "<td style='background-color:"+ORDINAL_BACKGROUND_COLOR+"; border-left:"+BORDER+";border-bottom:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>Hits</b></td>";
        zDateTableHtml += "<td style='background-color:"+ORDINAL_BACKGROUND_COLOR+"; border-right:"+BORDER+";border-left:"+BORDER+";border-bottom:"+BORDER+";padding:"+TABLE_PADDING+"px;text-align:center;'><b>Score</b></td>";
        zDateTableHtml += "</tr>";
        
        function ordinalHtml(ordinal, backgroundColor, fontColor, isFirst, isLast) {
            var borderBottom = isLast ? "border-bottom:" + BORDER + ";" : "";
            var labelBorder = isFirst ? "" : "border-top:" + BORDER + ";";
            var innerOrdinalHtml = "<table style='"+dateLabelStyle+"background-color:"+backgroundColor+";'><tr><td style='color:"+fontColor+";padding-bottom:2px;padding-left:2px;padding-right:2px;'>"+ordinal+"</td></tr></table>";
            // var xOrdinalHtml = "<div style='border:"+BORDER+";'>"+xOrdinal+"</div>";
            var toReturn = "<tr><td style='"+borderBottom+"border-left:" + BORDER + ";padding:"+TABLE_PADDING+"px;"+labelBorder+"'>"+innerOrdinalHtml+"</td>";
            
            return toReturn;
        }

        var limit = Math.min(MAX_DATE_ROWS_PER_PAGE, maxDates)
        
        for ( var i = 0; i < limit; i++ ) {

            var indexIntoArray = pageIndex*MAX_DATE_ROWS_PER_PAGE + i;
            var ithXDate = indexIntoArray < xDates.length ? xDates[indexIntoArray] : null;
            
            var border = "border-left: " +BORDER + ";";
            
            // if ( i > 0 ) {
            border += "border-top: " +BORDER + ";";
            // }
            
            var isFirstRow = i == 0;
            
            var dateBorder = isFirstRow ? "" : "border-top:"+BORDER+";";
            dateBorder += "border-left:"+BORDER+";";
            
            if ( ithXDate ) {
                var xOrdinal = indexIntoArray+1;
                
                var isLastXDate = indexIntoArray == xDates.length-1 || i == limit-1;
                
                var xDateBorder = dateBorder + "border-right:"+BORDER+";";
                
                if ( isLastXDate ) {
                    xDateBorder += "border-bottom:"+BORDER+";";
                }
                
                xDateTableHtml += ordinalHtml(xOrdinal, "white", "black", isFirstRow, isLastXDate);
                xDateTableHtml += "<td style='padding:"+TABLE_PADDING+"px;"+xDateBorder+"'>";
                xDateTableHtml += ithXDate.date;
                xDateTableHtml += "</td></tr>";
            }
            
            var ithZDateDictKey = indexIntoArray < zDates.length ? zDates[indexIntoArray] : null;

            if ( ithZDateDictKey ) {
                var ithZDateTags = appState.latestResults.z_structs[ithZDateDictKey];

                var readableZDate = ithZDateTags.z_date_readable_start;
                var zDateLabel = Z_DATE_SHORTHAND + (i+1);//convertIntToSubscriptUnicode(i+1);
                var score = ithZDateTags.score;
                var hitCount = ithZDateTags.hit_count;
                var zOrdinal = ithZDateTags.z_ordinal+1;
                var isFinalZDate = indexIntoArray == zDates.length-1 || i == limit-1;
                var hitCountSymbolSrc = getHitCountSymbolImage(hitCount, /*srcOnly=*/true);
                var hitCountVisibility = hitCount > 1 ? "" : "visibility:hidden;";
                var imageSymbolWidth = 16;
                var hitCountImgStyle = "style='"+hitCountVisibility+"position:relative;top:3.5px; width:"+imageSymbolWidth+"px;height:"+imageSymbolWidth+"px;' src='"+hitCountSymbolSrc+"'";
                // var hitCountSymbolImg = hitCount <= 1 ? "<span style='width:"+imageSymbolWidth+"px;height:"+imageSymbolWidth+"px;'>" : "<img style='width:"+imageSymbolWidth+"px;height:"+imageSymbolWidth+"px;' src='"+hitCountSymbolSrc+"' />&nbsp;";
                var hitCountSymbolImg = "<img "+hitCountImgStyle+" />&nbsp;";


                var finalZTableCellStyle = tableCellStyle;
                finalZTableCellStyle += isFinalZDate ? border : "";

                var bottomBorderForZRow = isFinalZDate ? "border-bottom:"+BORDER+";" : "";

                var hitCountTable = "<table><tr><td>"+hitCountSymbolImg+"</td><td>"+hitCount+"</td></tr></table>";
                
                zDateTableHtml += ordinalHtml(zOrdinal, "grey", "white", isFirstRow, isFinalZDate);
                zDateTableHtml += "<td style='"+bottomBorderForZRow+"padding:"+TABLE_PADDING+"px;"+dateBorder+"'>";
                zDateTableHtml += readableZDate
                zDateTableHtml += "</td>";
                zDateTableHtml += "<td style='"+bottomBorderForZRow+"padding:"+TABLE_PADDING+"px;"+dateBorder+"'>"+hitCountTable+"</td>";
                zDateTableHtml += "<td style='"+bottomBorderForZRow+"border-right:"+BORDER+";padding:"+TABLE_PADDING+"px;"+dateBorder+"'>"+score+"</td>";
                zDateTableHtml += "</tr>";
            }
        }
        
        xDateTableHtml += "</table>";
        zDateTableHtml += "</table>";
        
        toReturn += "<table style='border-collapse:collapse; width:100%;'>";
        toReturn += "<td style='vertical-align:top;'>"+xDateTableHtml+"</td>";
        toReturn += "<td style='vertical-align:top;'>"+spaceTableHtml+"</td>";
        toReturn += "<td style='vertical-align:top;'>"+zDateTableHtml+"</td>";
        toReturn += "</tr>";
        toReturn += "</table>";
        
        
        toReturn += PAGE_END_HTML;

        return toReturn;
    }
    
    var pageCount = maxDates / MAX_DATE_ROWS_PER_PAGE;

    for ( var i = 0; i < pageCount; i++ ) {
        htmlForDateOutput.push(tablePageHtml(i));
    }
    
    
    pdfDoc.html(htmlPageOne, pdfDocConfig);
}

