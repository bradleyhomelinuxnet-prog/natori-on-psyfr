
var FILE_SAVE_AND_OPEN_SUGGESTION = "<div class='warning_color about_body'>NOTE: You may find the File->Save As/Open feature more useful for your workflow.</div>";



var HELP_MESSAGE__X_DATES_PANEL = "X-Dates are the primary type of Input data to the Ophis algorithms. At least 2 X-Dates are required to generate Output. Click the Add button above to get started.";
var HELP_MESSAGE__T_DATES_PANEL = "T-Dates (Target Dates) are a way to only show Z-Dates for the future dates that you are interested in, e.g. when a team will actually play again.";
var HELP_MESSAGE__FILTERS_PANEL = "Filters are used to cut down on Output noise to help bring focus to the Z-Dates that are most important.";
var HELP_MESSAGE__ISO_EVENTS_PANEL = "Iso-Event, short for Isometric Event, is an event that has repeated itself 2 or more times in the past, and will likely repeat again in the future.";
var HELP_MESSAGE__EVENT_SWAP = "This screen makes it easy to apply Settings from one Iso-Event to one or more other Iso-Events."

var DISABLED_ELEMENT_SUBSCRIPT = "&#8709;";

function generateLatOrLongInput(latOrLong) {
    var title = latOrLong == COORD_LAT ? "Latitude" : "Longitude";
    return "<input type='text' title='"+title+"' value='' style='height:26px; ' class='"+latOrLong+"_input general_input'></input>"
}

function getZValueReadable(zValueRaw, operationOrdinal = null) {
    var zValueReadable = intToDecimalString(zValueRaw);

    var zValueEquationQualifier = zValueRaw == 1 ? "&nbsp;day" : "&nbsp;days";

    // if ( operationOrdinal == 0 ) {
    //     zValueEquationQualifier += " (just the Y-Delta)";
    // }

    return zValueReadable + zValueEquationQualifier;
}

function generateTableToolTip(titles, values) {
    if ( FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS === true ) {
        var toReturn = "<table style=\"border:1px solid white; white-space:nowrap;\">";

        for ( var i = 0; i < titles.length; i++ ) {
            var ithTitle = titles[i];
            var ithValue = values[i];
    
            toReturn += "<tr><td class=\"tool_tip_table_border tool_tip_table_left_row\">"+ithTitle+"</td><td class=\"tool_tip_table_border\" >" + ithValue + "</td></tr>";
        }
    
        toReturn += "</table>";
        
        return toReturn;
    } else {
        return "";
    }
}

function replaceOperationConstants(operationEquation) {
    operationEquation = operationEquation.replace("OPH_CRV", OPH_CRV);
    operationEquation = operationEquation.replace("OPH_PI", OPH_PI);
    operationEquation = operationEquation.replace("OPH_PHI", OPH_PHI);

    return operationEquation;
}

function getRowShortNameHtml(letter, subscriptOrZeroBasedOrdinal, useSubscript = true) {
    if ( useSubscript === true ) {
        if ( isNonNegIntOrStringThereof(subscriptOrZeroBasedOrdinal) ) {
            subscriptOrZeroBasedOrdinal = subscriptOrZeroBasedOrdinal + 1;
        }

        return letter + "<sub>" + (subscriptOrZeroBasedOrdinal) + "</sub>";
    } else {
        return letter + (subscriptOrZeroBasedOrdinal);
    }
}

function disableRowButton(rowButtonElem) {
    if ( rowButtonElem.type != 'radio' ) {
        rowButtonElem.style.opacity = OPACITY__DISABLED;
    } else {
        rowButtonElem.parentElement.style.cursor = "not-allowed";
    }
    
    rowButtonElem.style.cursor = "not-allowed";
    rowButtonElem.style.color = "grey";
    rowButtonElem.disabled = true;
}

function readableMsrfMatchString(rotationCountZ, filterMatch) {

    var readableMatchString = "";
    if ( rotationCountZ === filterMatch.msrf_number ) {
        readableMatchString = "= " + filterMatch.readable_name;
    } else {
        readableMatchString = "&asymp; " + filterMatch.msrf_number + " (" + filterMatch.readable_name + ")";;
    }
    
    return rotationCountZ + " " + readableMatchString;
}

function enableRowButton(rowButtonElem) {
    if ( rowButtonElem.type == 'radio' ) {
        rowButtonElem.parentElement.style.cursor = "pointer";
    }

    rowButtonElem.style.opacity = 1.0;
    rowButtonElem.style.cursor = "pointer";

    if ( rowButtonElem.classList.contains("row_delete_button") || rowButtonElem.classList.contains("row_delete_button_master") ) {
        rowButtonElem.style.color = "red";
    } else {
        rowButtonElem.style.color = "black";
    }
    
    rowButtonElem.disabled = false;
}

function convertHtmlToPlainText(htmlString) {
  // Create a new div element in memory.
  var tempDivElement = document.createElement("div");

  // Set the innerHTML of the temporary div to the provided HTML string.
  // This causes the browser to parse the HTML and create a DOM structure.
  tempDivElement.innerHTML = htmlString;

  // Retrieve the plain text content from the temporary div.
  // .textContent is generally preferred as it's more standard and handles more cases.
  // .innerText can be used as a fallback for older browsers or specific needs.
  return tempDivElement.textContent || tempDivElement.innerText || "";
}

function readableAxialRotations(numericValue) {
    // if ( numericValue == 1 ) {
    //     return numericValue + " Axial Rotation";
    // } else {
    //     return numericValue + " Axial Rotations";
    // }

    return intToDecimalString(numericValue) + " days";
}

function readableLatLong(lat, long) {
    return "lat=" + lat + "&nbsp;&nbsp;&nbsp;long=" + long + "";
}

function readablePointsString(numericPoints) {
    var readableString = "";
    if ( numericPoints == 1) {
        readableString = numericPoints + " point";
    } else {
        readableString = numericPoints + " points";
    }

    return "<span class='about_screen_points'>"+readableString+"</span>";
}

function newXDate(date, time) {
    return {
        date: date,
        time: time,
        enabled: true
    }
}

function cloneNativeDate(nativeDate) { 
    return new Date(nativeDate.getTime());
}

function nativeDateToXDate(nativeDate_utcOrLocal, lat_nullable = null, long_nullable = null) {
    var toReturn = newXDate(
        nativeDateToReadableString_dateOnly(nativeDate_utcOrLocal, lat_nullable, long_nullable),
        nativeDateToReadableString_timeOnly(nativeDate_utcOrLocal, lat_nullable, long_nullable)
    );

    return toReturn;
}

function nativeDateToReadableString_dateOnly(nativeDate_utcOrLocal, lat_nullable = null, long_nullable = null) {

    var years = 0;
    var months = 0;
    var days = 0;

    if ( isValidLatAndLong(lat_nullable, long_nullable) ) {
        var momentInstance = convertNativeUtcDateToLocalMoment(nativeDate_utcOrLocal, lat_nullable, long_nullable);

        months = momentInstance.month() + 1;
        days = momentInstance.date();
        years = momentInstance.year();
    } else {
        // This returns the calendar date in the operator's local computer time/timezone.
        // This should only be a operator-friendly convenience for inputting a time like 3:10 PM, even though
        // 3:10 PM may ultimately be local to some other timezone.
        months = nativeDate_utcOrLocal.getMonth() + 1;
        days = nativeDate_utcOrLocal.getDate();
        years = nativeDate_utcOrLocal.getFullYear();
    }

    return dateComponentsToReadableString(years, months, days);
}

function nativeDateToReadableString_timeOnly(nativeDate_utcOrLocal, lat_nullable = null, long_nullable = null) {

    var hours = 0;
    var minutes = 0;

    if ( isValidLatAndLong(lat_nullable, long_nullable) ) {

        var momentInstance = convertNativeUtcDateToLocalMoment(nativeDate_utcOrLocal, lat_nullable, long_nullable);

        hours = momentInstance.hours();
        minutes = momentInstance.minutes();
    } else {
        hours = nativeDate_utcOrLocal.getHours();
        minutes = nativeDate_utcOrLocal.getMinutes();
    }

    var finalHours = padWithLeadingZeroIfLessThan10(hours);
    var finalMinutes = padWithLeadingZeroIfLessThan10(minutes);

    var toReturn = finalHours + ":" + finalMinutes;

    return toReturn;
}

function nativeDateToReadableString_dateAndTime(nativeUtcDate, lat, long, includeHtmlForTime = true) {

    // Make sure to include a space, if no HTML.
    var htmlStart = includeHtmlForTime ? "<span style='margin-left:3px;' class='has_clock_font'>" : " ";
    var htmlEnd = includeHtmlForTime ? "</span>" : "";
    return nativeDateToReadableString_dateOnly(nativeUtcDate, lat, long) + htmlStart + nativeDateToReadableString_timeOnly(nativeUtcDate, lat, long) + htmlEnd;
}

function dateComponentsToStandardString(year, oneBasedMonth, oneBasedDay) {
    return year + STANDARD_DATE_DELIMITER + padWithLeadingZeroIfLessThan10(oneBasedMonth) + STANDARD_DATE_DELIMITER + padWithLeadingZeroIfLessThan10(oneBasedDay);
}

function dateComponentsToReadableString(year, oneBasedMonth, oneBasedDay) {
    return padWithLeadingZeroIfLessThan10(oneBasedMonth) + DATE_DELIMITER + padWithLeadingZeroIfLessThan10(oneBasedDay) + DATE_DELIMITER + year;
}

function timeComponentsToStandardString(hours_24, minutes) {
    var finalHours = padWithLeadingZeroIfLessThan10(hours_24);
    var finalMinutes = padWithLeadingZeroIfLessThan10(minutes);

    var toReturn = finalHours + ":" + finalMinutes;

    return toReturn;
}

function dateAndTimeComponentsToStandardString(year, oneBasedMonth, oneBasedDay, hours_24, minutes) {
    return dateComponentsToStandardString(year, oneBasedMonth, oneBasedDay) + " " + timeComponentsToStandardString(hours_24, minutes);
}

function nativeUtcDateToStandardString_dateAndTime(nativeUtcDate) {
    return dateAndTimeComponentsToStandardString(nativeUtcDate.getUTCFullYear(), nativeUtcDate.getUTCMonth() + 1, nativeUtcDate.getUTCDate(), nativeUtcDate.getUTCHours(), nativeUtcDate.getUTCMinutes());
}

function padWithLeadingZeroIfLessThan10(value) {
    return value < 10 ? "0" + value : value;
}

function getEventScopeName(eventScope) {
    var toReturn = "no-name";

    if ( eventScope == EVENT_SCOPE__HH_MM ) {
        toReturn = "HH:MM"; 
    } else if ( eventScope == EVENT_SCOPE__DAYS ) {
        toReturn = "Days";
    } else if ( eventScope == EVENT_SCOPE__MONTHS ) {
        toReturn = "Months";
    } else if ( eventScope == EVENT_SCOPE__YEARS ) {
        toReturn = "Years";
    }

    // toReturn += "&nbsp;";
    toReturn += " ";

    return toReturn;
}

function getEventTypeName(eventScope) {
    var toReturn = "no-name";

    if ( eventScope == EVENT_TYPE__PERSONAL ) {
        toReturn = "Personal"; 
    } else if ( eventScope == EVENT_TYPE__ASTROLOGICAL ) {
        toReturn = "Astrological";
    } else if ( eventScope == EVENT_TYPE__MARKETS ) {
        toReturn = "Markets";
    }

    toReturn += " ";

    return toReturn;
}

function getScreenName(ophisScreen) {
    var toReturn = "no-name";

    if ( ophisScreen == OPHIS_SCREEN__ABOUT ) {
        toReturn = "About"; 
    } else if ( ophisScreen == OPHIS_SCREEN__Z_DATES ) {
        toReturn = "Z-Dates";
    } else if ( ophisScreen == OPHIS_SCREEN__DEBUG ) {
        toReturn = "Debug";
    } else if ( ophisScreen == OPHIS_SCREEN__EXPORT_X_DATES ) {
        toReturn = "Export Events";
    } else if ( ophisScreen == OPHIS_SCREEN__IMPORT_X_DATES ) {
        toReturn = "Import Events";
    } else if ( ophisScreen == OPHIS_SCREEN__EXPORT_Z_DATES ) {
        toReturn = "Export Z-Dates";
    } else if ( ophisScreen == OPHIS_SCREEN__OPERATIONS ) {
        toReturn = "Operations";
    } else if ( ophisScreen == OPHIS_SCREEN__EVENT_SWAP ) {
        toReturn = "Event Data Transfer";
    } else if ( ophisScreen == OPHIS_SCREEN__EVENT_SETTINGS ) {
        toReturn = "Event Settings";
    }

    // toReturn += "&nbsp;";
    toReturn += " ";

    return toReturn;
}