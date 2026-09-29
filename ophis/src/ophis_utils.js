

function isFlagEnabled(featureFlag) {
    return featureFlag === true;
}

function isSunsetCompletelyDisabled() {

    var toReturn = 
        isFlagEnabled(FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET) === false && 
        isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE) === false &&
        isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL) === false &&
        isFlagEnabled(FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER) === false &&
        isFlagEnabled(FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET) === false  ;

    return toReturn;
}

function isPriorSunsetDisplayEnabled() {
    var toReturn =
        isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE) === true ||
        isFlagEnabled(FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL) === true;

    return toReturn;
}

function removeAllDictKeysExcept(object, allowedKeys) {
  for (var key in object) {
    if (object.hasOwnProperty(key) && !allowedKeys.includes(key)) {
      delete object[key];
    }
  }
}

function getDictionarySize(dictionary) {
    var count = 0;

    for (var ith in dictionary) {
        if ( dictionary.hasOwnProperty(ith)) {
            count++;
        }
    }

    return count;
}

function getIsoEventField(varName) {
    for ( var i = 0; i < ALL_SERIALIZED_FIELDS.length; i++ ) {
        var ithFilterField = ALL_SERIALIZED_FIELDS[i];

        if ( ithFilterField.varName == varName ) {
            return ithFilterField;
        }
    }

    return null;
}

function xDateToInputElementValue(xDate, eventScope) {
    if ( eventScope == EVENT_SCOPE__HH_MM ) {
        return xDate.date + " " + xDate.time;
    } else if ( eventScope == EVENT_SCOPE__DAYS ) {
        return xDate.date;
    } else if ( eventScope == EVENT_SCOPE__MONTHS ) {
        return xDateToMonthYear(xDate.date);
    } else if ( eventScope == EVENT_SCOPE__YEARS ) {
        return xDate.date; // TODO: Probably a TODO warranted here, to crop just the year off.
    }
}

function getIsoEventFieldReadableTextOnlyName(varName) {
    var isoEventField = getIsoEventField(varName);

    if ( isoEventField != null ) {
        return isoEventField.textOnlyName;
    } else {
        return "";
    }
}

function isIsoEventFieldEnabled(isoEvent, varName) {
    for ( var i = 0; i < ALL_SERIALIZED_FIELDS.length; i++ ) {
        var ithFilterField = ALL_SERIALIZED_FIELDS[i];

        if ( ithFilterField.varName == varName ) {
            return isoEvent[ithFilterField.serializationKey];
        }
    }

    return false;
}

function getIsoEventFilterNumbericValue(isoEvent, varName) {
    for ( var i = 0; i < SERIALIZED_FILTER_FIELDS.length; i++ ) {
        var ithFilterField = SERIALIZED_FILTER_FIELDS[i];

        if ( ithFilterField.varName == varName ) {
            var valueToParse = isoEvent[ithFilterField.serializationKeyForValue];
            var toReturn = parseFloatElseNeg1(valueToParse);

            if ( toReturn >= 0 ) {
                return toReturn;
            } else {
                printWarning("Could not find numeric value for " + varName + ", returning default of " + ithFilterField.numericDefault);

                return parseFloatElseNeg1(ithFilterField.numericDefault);
            }
        }
    }

    printError("Could not find numeric value for " + varName);

    return -1.0;
}

function toLowerCase(string) {
    if ( string ) {
        return ("" +string).toLowerCase();
    } else {
        return "";
    }
}

function newSerializedFieldObject(varName, name, title, enabledByDefault, numericDefault = null, textOnlyName = null, zIndex = 0) {
    var baseName = varName.replace("SERIALIZED_FIELD__", "");
    var serializationKey = baseName.toLowerCase();
    var serializationKeyForValue = serializationKey + "_value";
    var elemId = serializationKey.replaceAll("_", "-") + "-checkbox";
    var elemIdForInput = serializationKey.replaceAll("_", "-") + "-input";
    
    var toReturn = {
        varName: varName,
        serializationKey: serializationKey,
        serializationKeyForValue: serializationKeyForValue,
        elemId: elemId,
        elemIdForInput: elemIdForInput,
        enabledByDefault: enabledByDefault,
        numericDefault: numericDefault,
        name: name,
        title: title,
        textOnlyName: textOnlyName,
        zIndex: zIndex
    };

    return toReturn;
}

function getMsrfMatch(axialRotationCount) {

    axialRotationCount = roundNumberToAxialRotationPrecision(axialRotationCount);

    function newFilterMatchStruct(msrfFilter, msrfNumber) {
        var points = 0;
        var cssClass = "";
        var readableName = "";

        if ( msrfFilter == MSRF_FILTER__NORMAL ) {
            points = POINTS__NORMAL_MSRF_MATCH;
            cssClass = "msrf_normal";
            readableName = "Normal";
        } else if ( msrfFilter == MSRF_FILTER__IMPORTANT ) {
            points = POINTS__IMPORTANT_MSRF_MATCH;
            cssClass = "msrf_important";
            readableName = "Important";
        } else if ( msrfFilter == MSRF_FILTER__VORTEX ) {
            points = POINTS__VORTEX_MSRF_MATCH;
            cssClass = "msrf_vortex";
            readableName = "Vortex";
        }

        return {
            msrf_filter: msrfFilter,
            msrf_number: msrfNumber,
            points: points,
            css_class: cssClass,
            readable_name: readableName
        }
    }

    for ( var i = 0; i < MSRF_FILTER__VORTEX.length; i++ ) {
        var ithFilterNumber = MSRF_FILTER__VORTEX[i];

        if ( areEqualWithinTolerance(ithFilterNumber, axialRotationCount, VORTEX_FILTER_MATCH_TOLERANCE) ) {
            return newFilterMatchStruct(MSRF_FILTER__VORTEX, ithFilterNumber);
        }
    }

    function checkExactMatch(filter, axialRotationCountRoundedInner) {
        for ( var i = 0; i < filter.length; i++ ) {
            var ithFilterNumber = filter[i];
    
            if ( ithFilterNumber == axialRotationCountRoundedInner ) {
                return newFilterMatchStruct(filter, ithFilterNumber);
            }
        }

        return null;
    }

    // As per Jason, numbers "right in the middle" are counted as no match.
    // Must trend towards either the floor or the ceiling.
    var axialRotationCountAsString = axialRotationCount + "";
    if ( axialRotationCountAsString.endsWith(".5") ) {
        return null;
    }

    var axialRotationCountRounded = oph_round(axialRotationCount);
    var toReturn = null;

    toReturn = checkExactMatch(MSRF_FILTER__IMPORTANT, axialRotationCountRounded);

    if ( toReturn != null ) {
        return toReturn;
    }

    toReturn = checkExactMatch(MSRF_FILTER__NORMAL, axialRotationCountRounded);

    return toReturn;
}

function numbersEqualWithinTol(number1, number2, tolerance) {
    var lowerLimit = number1 - tolerance;
    var upperLimit = number1 + tolerance;

    if ( number2 >= lowerLimit && number2 <= upperLimit) {
        return true;
    } else {
        return false;
    }
}

function parseIntElseNeg1(number) {
    return parseIntElse(number, -1);
}

function parseIntElse(number, elseValue) {
    try {
        var toReturn = parseInt(number);

        if ( toReturn != null ) {
            return toReturn;
        } else {
            return elseValue;
        }
        
    } catch(e) {
        return elseValue;
    }
}

function parseFloatElseNeg1(value) {
    return parseFloatElse(value, -1.0);
}

function parseFloatElse(value, defaultValue) {
    var toReturn = defaultValue;

    try {
        toReturn = parseFloat(value);

        if ( toReturn != null && Number.isNaN(toReturn) === false ) {
            return toReturn;
        } else {
            return defaultValue;
        }
    } catch(e) {
        return defaultValue;
    }
}

function isObjectString(object) {
    if ( object != null & object != undefined && typeof object === "string" ) {
        return true;
    } else {
        return false;
    }
}

function isNonNegIntOrStringThereof(value) {
    if ( value ) {
        value = value + "";
        value = value.trim();

        if ( value ) {
            // Strip leading zeros, leaving one last zero if needed.
            while ( value.length > 1 && value.substring(0, 1) === "0" ) {
                value = value.substring(1);
            }

            if ( value ) {
                var n = Math.floor(Number(value));
                return n !== Infinity && String(n) === value && n >= 0;
            } else {
                return true; // equals zero.
            }
        } else {
            return false;
        }
    } else {
        if ( value === "0" || value === 0 ) {
            return true;
        } else {
            return false;
        }
    }
}

function areEqualWithinTolerance(value1, value2, tolerance) {
    var absDelta = Math.abs(value1 - value2);

    if ( absDelta <= tolerance ) {
        return true;
    } else {
        return false;
    }
}

// I just like the more descriptive function name here, and more searchable. Also a bottle neck for breakpoints.
// TODO: Find/replace all remaining instances of getTime().
function nativeDateToUtcMillis(nativeDate) {
    return nativeDate.getTime();
}

// Same reason for existence as nativeDateToUtcMillis().
// TODO: Find/replace all remaining instances of new Date()
function utcMillisToNativeDate(utcMillis) {
    return new Date(utcMillis);
}


function assertSunsetCalculationsDisabled() {
    // Sunset calculation are now back, so shouldn't assert.
    // If they get feature flagged off again for some reason, then maybe uncomment these.

    // console.log("Asserting sunset calculations.");
    // assert(isSunsetCompletelyDisabled() === false, "Sunset calculation should not be running!");
}

// If you input for example '10/12/2023 18:15' the current sunset library https://github.com/Fabiz/MeeusJs
// will return '10/10/2023 <whatever time sunset is>'. You basically can't get it to return 10/11/2023
// for some reason, no matter what time you put in, and I tried a bunch of samplings, within reason.
// Therefore we have to take a sampling and fabricate any missing sunsets.
//
// UPDATE: Now using https://github.com/cosinekitty/astronomy
// Keeping the sampling function just in case for now.
function getSunsetSampling(nativeUtcDate, lat, long) {

    if ( isFlagEnabled(FEATURE_FLAG__USE_SUNSET_SAMPLING) === false) {
        return null;
    }

    var samplings = [];

    for ( var i = 0; i < SUNSET_LIBRARIES.length; i++ ) {
        var ithSunsetLibrary = SUNSET_LIBRARIES[i];
        var ithSunsetLibrarySampling = getSunsetSamplingUsingLibrary(ithSunsetLibrary, nativeUtcDate, lat, long);

        if ( ithSunsetLibrarySampling && ithSunsetLibrarySampling.length > 0 ) {

            samplings.push(ithSunsetLibrarySampling);

            var ithErrorsOut = [];

            validateSunsetSequence(ithSunsetLibrarySampling, ithErrorsOut);

            if ( ithErrorsOut.length == 0 ) {
                return ithSunsetLibrarySampling;
            } else {
                continue;
            }
        }
    }

    // Worst case return the first sampling.
    return samplings[0] ? samplings[0] : null;
}

function getSunsetSamplingUsingLibrary(sunsetLibrary, nativeUtcDate, lat, long) {

    if ( isFlagEnabled(FEATURE_FLAG__USE_SUNSET_SAMPLING) === false) {
        return null;
    }

    assertSunsetCalculationsDisabled();

    var nativeDateInUtcMillis = nativeDateToUtcMillis(nativeUtcDate);

    var daySliceCount = 3;
    var numberOfDaysToSample = 5;
    var timeSlice = MILLIS_PER_DAY / daySliceCount;
    var sunsetSet = new Set();
    var totalLimit = daySliceCount*numberOfDaysToSample;
    var startDateInMillis = nativeDateInUtcMillis + (numberOfDaysToSample/2.0) * MILLIS_PER_DAY;
    for ( var i = 0; i < totalLimit; i++ ) {
        var offset = timeSlice * (i)
        var ithNativeDateSample = new Date(startDateInMillis - offset);
        var ithSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(sunsetLibrary, ithNativeDateSample, lat, long);

        if ( ithSunset ) {
            var ithSunsetInMillis = nativeDateToUtcMillis(ithSunset);
            sunsetSet.add(ithSunsetInMillis);
        }
    }

    // Sort so it's past->future.
    var sunsetArray = Array.from(sunsetSet);
    sunsetArray.sort(function(aSunset, bSunset) {
        return aSunset - bSunset;
    });

    for ( var i = sunsetArray.length-1; i >= 1; i-- ) {
        var prevSunset = sunsetArray[i-1];
        var nextSunset = sunsetArray[i];
        var delta = nextSunset - prevSunset;

        if ( delta > MILLIS_PER_DAY*1.5 ) {
            var gapFiller = prevSunset + Math.round(delta/2);
            sunsetArray.splice(i, 0, gapFiller);
            // printWarning("Created a missing sunset for: " + new Date(gapFiller));
        }
    }

    // print("Debug sunsets for " + nativeUtcDate);
    // for ( var i = 0; i < sunsetArray.length; i++ ) {
    //     var ithSunset = new Date(sunsetArray[i]);
    //     print(ithSunset+"");
    // }

    return sunsetArray;
}

function getNoonOfNativeUtcDate(nativeUtcDate) {
    var nativeDateInUtcMillis = nativeDateToUtcMillis(nativeUtcDate);

    var nativeDateInUtcMillis_priorMidnight = nativeDateInUtcMillis - (nativeDateInUtcMillis % MILLIS_PER_DAY);
    var nativeDateInUtcMillis_noon = nativeDateInUtcMillis_priorMidnight + MILLIS_PER_DAY/2;

    return new Date(nativeDateInUtcMillis_noon);
}

function getTimeZeroOfNativeDateMillis(nativeUtcDateInMillis) {
    var nativeDateInUtcMillis_priorMidnight = nativeUtcDateInMillis - (nativeUtcDateInMillis % MILLIS_PER_DAY);

    return nativeDateInUtcMillis_priorMidnight;
}

function getCurrentNativeDate() {
    return new Date();
}

var CACHE__SUNSET_BEFORE = {};
var CACHE__SUNSET_AFTER = {};

function sunsetCacheKey(utcMillis, lat, long) {
    var delimiter = "_";
    return utcMillis + delimiter + lat + delimiter + long;
}

function addToSunsetCache(cache, utcMillis, lat, long, sunsetInMillis) {
    if ( cache ) {
        var cacheKey = sunsetCacheKey(utcMillis, lat, long);
        cache[cacheKey] = sunsetInMillis;
    }
}

function getFromSunsetCache(cache, utcMillis, lat, long) {
    if ( cache ) {
        var cacheKey = sunsetCacheKey(utcMillis, lat, long);
        var cacheValue = cache[cacheKey];

        // Truthiness check will (I believe) return false if cacheValue is zero, which it could technically be with backtesting around 1970.
        // So add explicit check for 0.
        if ( cacheValue || cacheValue === 0 ) {
            return cacheValue;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

function getSunsetNativeUtcDateBefore_withCache(nativeUtcDate, lat, long, sunsetSampling_elseOut = null) {

    // Increase chance of cache hit by rounding to nearest minute.
    nativeUtcDate = cloneNativeDate(nativeUtcDate);
    roundDateToNearestMinute(nativeUtcDate);

    if ( isFlagEnabled(FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE) ) {
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        var sunsetMillis = getFromSunsetCache(CACHE__SUNSET_BEFORE, utcMillis, lat, long);

        if ( sunsetMillis ) {
            return utcMillisToNativeDate(sunsetMillis);
        }
    }

    var toReturn = getSunsetNativeUtcDateBefore(nativeUtcDate, lat, long, sunsetSampling_elseOut);

    if ( toReturn && isFlagEnabled(FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE) ) {
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        addToSunsetCache(CACHE__SUNSET_BEFORE, utcMillis, lat, long, toReturn);
    }
    
    return toReturn;
}

function getSunsetNativeUtcDateAfter_withCache(nativeUtcDate, lat, long, sunsetSampling_elseOut = null) {

    // Increase chance of cache hit by rounding to nearest minute.
    nativeUtcDate = cloneNativeDate(nativeUtcDate);
    roundDateToNearestMinute(nativeUtcDate);

    if ( isFlagEnabled(FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE) ) {
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        var sunsetMillis = getFromSunsetCache(CACHE__SUNSET_AFTER, utcMillis, lat, long);

        if ( sunsetMillis ) {
            return utcMillisToNativeDate(sunsetMillis);
        }
    }

    var toReturn = getSunsetNativeUtcDateAfter(nativeUtcDate, lat, long, sunsetSampling_elseOut);

    if ( toReturn && isFlagEnabled(FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE) ) {
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        addToSunsetCache(CACHE__SUNSET_AFTER, utcMillis, lat, long, toReturn);
    }

    return toReturn;
}

function getSunsetNativeUtcDateBefore(nativeUtcDate, lat, long, sunsetSampling_elseOut = null) {

    assertSunsetCalculationsDisabled();
    var nativeDateInUtcMillis = nativeDateToUtcMillis(nativeUtcDate);

    if ( isFlagEnabled(FEATURE_FLAG__USE_SUNSET_SAMPLING) ) {

        sunsetSampling_elseOut = sunsetSampling_elseOut ? sunsetSampling_elseOut : [];
        
        if ( sunsetSampling_elseOut.length > 0 ) {
            // Use existing sunset sampling.
        } else {
            var sunsetSampling = getSunsetSampling(nativeUtcDate, lat, long);
            sunsetSampling_elseOut.push(...sunsetSampling);
        }

        for ( var i = sunsetSampling_elseOut.length-1; i >= 0; i-- ) {
            var ithSunsetInMillis = sunsetSampling_elseOut[i];

            if ( nativeDateInUtcMillis >= ithSunsetInMillis ) {
                return new Date(ithSunsetInMillis)
            }
        }
    }

    // If for whatever reason the sampling approach doesn't return anything,
    // purposely fall through.
    var limit = 600;
    var i = 0;
    var step = MILLIS_PER_DAY / 2;

    for ( var i = 0; i < limit; i++ ) {
        var ithNativeDate = new Date(nativeDateInUtcMillis - (i * step));
        var ithSunset = getSunsetOnNativeUtcDate(ithNativeDate, lat, long);
        var ithSunsetInMillis = nativeDateToUtcMillis(ithSunset);

        if ( ithSunsetInMillis <= nativeDateInUtcMillis ) {
            return ithSunset;
        }
    }

    // Probably should never get here, but if so at least return *something*.
    return getSunsetOnNativeUtcDate(nativeUtcDate, lat, long);
}

function getSunsetNativeUtcDateAfter(nativeUtcDate, lat, long, sunsetSampling_elseOut = null) {

    assertSunsetCalculationsDisabled();
    var nativeDateInUtcMillis = nativeDateToUtcMillis(nativeUtcDate);

    if ( isFlagEnabled(FEATURE_FLAG__USE_SUNSET_SAMPLING) ) {
        sunsetSampling_elseOut = sunsetSampling_elseOut ? sunsetSampling_elseOut : [];
        
        if ( sunsetSampling_elseOut.length > 0 ) {
            // Use existing sunset sampling.
        } else {
            var sunsetSampling = getSunsetSampling(nativeUtcDate, lat, long);
            sunsetSampling_elseOut.push(...sunsetSampling);
        }
        
        for ( var i = 0; i < sunsetSampling_elseOut.length; i++) {
            var ithSunsetInMillis = sunsetSampling_elseOut[i];

            if ( nativeDateInUtcMillis <= ithSunsetInMillis ) {
                return new Date(ithSunsetInMillis)
            }
        }
    }

    // If for whatever reason the sampling approach doesn't return anything,
    // purposely fall through.
    var limit = 600;
    var i = 0;
    var step = MILLIS_PER_DAY / 2;

    for ( var i = 0; i < limit; i++ ) {
        var ithNativeDate = new Date(nativeDateInUtcMillis + (i * step));
        var ithSunset = getSunsetOnNativeUtcDate(ithNativeDate, lat, long);
        var ithSunsetInMillis = nativeDateToUtcMillis(ithSunset);

        if ( ithSunsetInMillis > nativeDateInUtcMillis ) {
            return ithSunset;
        }
    }

    // Should never get here, but if so at least return *something*.
    return getSunsetOnNativeUtcDate(nativeUtcDate, lat, long);
}

function constrainLatOrLongValue(latOrLongValue, latOrLong) {
    if ( latOrLong == COORD_LAT ) {
        if ( latOrLongValue < -LAT_LIMIT ) {
            return -LAT_LIMIT;
        } else if ( latOrLongValue > LAT_LIMIT ) {
            return LAT_LIMIT;
        }
    } else if ( latOrLong == COORD_LONG) {
        if ( latOrLongValue < -LONG_LIMIT ) {
            return -LONG_LIMIT;
        } else if ( latOrLongValue > LONG_LIMIT ) {
            return LONG_LIMIT;
        }
    } else {
        return latOrLongValue;
    }

    return roundNumberToLocationPrecision(latOrLongValue);
}

function isSignedIn() {
    return appState.isSignedIn === true;
}

function isRunningElectron() {
    return window.electronBridge ? true : false;
}

function getCurrentLocalTime(millisOffset = 0) {
    if ( isRunningHeadless() && appState.headless_current_epoch_millis > DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS ) {
        var currentLocalTimeFromCommandLineFlags = new Date(appState.headless_current_epoch_millis);

        return currentLocalTimeFromCommandLineFlags;
    } else {
        var toReturn = moment().add(millisOffset, 'milliseconds').toDate();

        roundDateToNearestMinute(toReturn);

        return toReturn;
    }
}

function hashAccount(account) {
    return sha512(account);
}

function getLocalTimeAsPickrValue(millisOffset) {
    var currentNativeDate = getCurrentLocalTime(millisOffset);
    var currentXDate = nativeDateToXDate(currentNativeDate);

    return currentXDate.date + " " + currentXDate.time;
}

function getLocalDateAsPickrValue(millisOffset) {
    var currentNativeDate = getCurrentLocalTime(millisOffset);
    var currentXDate = nativeDateToXDate(currentNativeDate);

    return currentXDate.date;
}

function getMillisFromStartOfDayFromNativeDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();

    var toReturn = hours*MILLIS_PER_HOUR + minutes*MILLIS_PER_MINUTE;

    return toReturn;
}

function xDateToMonthYear(xDateCalendarDate) {
    var calendarDateSplit = xDateCalendarDate.split(DATE_DELIMITER);

    return calendarDateSplit[0] + DATE_DELIMITER + calendarDateSplit[2];
}

function getComponentOfSemVer(semVer, index) {
    var defaultToReturn = "X";

    if ( semVer ) {
        var semVerSplit = semVer.split(".");
        var component = semVerSplit[index];

        return component ? component : defaultToReturn;
    } else {
        return defaultToReturn;
    }
}

function getFileContents(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            // The request is done; did it work?
            if (xhr.status == 200) {
                // ***Yes, use `xhr.responseText` here***
                callback(xhr.responseText);
            } else {
                // ***No, tell the callback the call failed***
                callback(null);
            }
        }
    };
    xhr.open("GET", path);
    xhr.send();
}

// Note input may be a tDate (target date) as well now, but not bothering to refactor function names/parameters just yet.
function xDateToNativeDate(eventScope, xDate, lat_nullable = null, long_nullable = null, errors_out = [], timezone_nullable = null, lockDayScopeToGmt = FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) {
    try {
        var dateToUse = null;
        var timeToUse = null;

        if ( eventScope == EVENT_SCOPE__HH_MM ) {
            dateToUse = xDate.date;
            timeToUse = xDate.time;
        } else if ( eventScope == EVENT_SCOPE__DAYS ) {
            dateToUse = xDate.date;
            timeToUse = TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE;
        } else if ( eventScope == EVENT_SCOPE__MONTHS ) {
            dateToUse = xDate.date;
            timeToUse = TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE;
        } else if ( eventScope == EVENT_SCOPE__YEARS ) {
            dateToUse = xDate.date;
            timeToUse = TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE;
        }

        if ( dateToUse == null || timeToUse == null ) {
            errors_out.push("Scope-modified date and/or time came up null. (unhandled case).");
            return null;
        }

        var calendarDateComponents = validateXDateCalendarDate(dateToUse, errors_out);
        var timeComponents = validateXDateTime(timeToUse, errors_out);

        if ( calendarDateComponents != null && timeComponents != null ) {

            var standardString = dateAndTimeComponentsToStandardString(
                calendarDateComponents.year,
                calendarDateComponents.month,
                calendarDateComponents.day,
                timeComponents.hours,
                timeComponents.minutes,
            );

            if ( eventScope != EVENT_SCOPE__HH_MM ) {
                if ( eventScope == EVENT_SCOPE__DAYS ) {
                    if ( lockDayScopeToGmt === true ) {
                        lat_nullable = 0;
                        long_nullable = 0;
                        timezone_nullable = null; // will be determined downstream based on lat/long.
                    } else {
                        lat_nullable = null;
                        long_nullable = null;
                        timezone_nullable = null;
                    }
                } else {
                    lat_nullable = null;
                    long_nullable = null;
                    timezone_nullable = null;
                }
            }
            
            var toReturn = convertStandardLocalDateStringToNativeUtcDate(standardString, lat_nullable, long_nullable, timezone_nullable);

            if ( isValidNativeDate(toReturn) ) {
                return toReturn;
            } else {
                var message = "X-Date " + JSON.stringify(xDate) + " passed sniff tests but native date object '"+toReturn+"' is invalid on the raw components " + JSON.stringify(calendarDateComponents) + " and " + JSON.stringify(timeComponents);
                printWarning(message);
                errors_out.push(message);
                return null;
            }
        } else {
            // Count on upstream methods pushing an error to the out array.
            return null;
        }
    } catch(e) {
        errors_out.push("Problem parsing xDate '"+JSON.stringify(xDate)+" " + e);
        return null;
    }
}

function debounce(callback, delay = 100) {
    var timer;

    return function() {
        clearTimeout(timer);
        timer = setTimeout(function() {
            callback();
        }, delay);
    }
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function sanitizeFileName(fileName) {
    // Replace invalid characters with an underscore
    // This regex targets characters that are not alphanumeric, underscore, hyphen, or dot
    var sanitized = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');

    // Remove leading/trailing periods and spaces (important for Windows compatibility)
    var trimmed = sanitized.replace(/^[. ]+|[. ]+$/g, '');

    // Optional: Limit filename length (e.g., to 255 characters, a common limit)
    var truncated = trimmed.substring(0, 255);

    return truncated;
}

function getQueryParamBool(queryParamName, defaultValue = false ) {
    var queryParamValue = getQueryParam(queryParamName, defaultValue);

    if ( queryParamValue == "true" || queryParamValue == true ) {
        return true;
    } else {
        return defaultValue;
    }
}

function getQueryParamString(queryParamName, defaultValue = "" ) {
    var queryParamValue = getQueryParam(queryParamName, defaultValue);

    return queryParamValue;
}

function getQueryParamInt(queryParamName, defaultValue = Number.MIN_SAFE_INTEGER ) {
    var queryParamValue = getQueryParam(queryParamName, defaultValue);

    return parseIntElse(queryParamValue, defaultValue);
}

function getQueryParam(queryParamName, defaultValue = null ) {
    var queryString = window.location.search;
    if ( queryString ) {
        var params = new URLSearchParams(queryString);
        
        var queryParamValue = params.get(queryParamName);

        if ( queryParamValue ) {
            return queryParamValue;
        } else {
            return defaultValue;
        }
    } else {
        return defaultValue;
    }
}

function roundMillisToNearestMidnightInTimeZone(nativeDateMillisUtc, timeZone) {
    var momentInstance = moment(nativeDateMillisUtc).tz(timeZone, true);

    const midnight = momentInstance.endOf('day');
    const lastMidnight = momentInstance.startOf('day');
    const timeUntilMidnight = midnight.diff(momentInstance);
    const timeSinceMidnight = momentInstance.diff(lastMidnight);

    let nearestMidnight;

    if (timeUntilMidnight < timeSinceMidnight) {
        nearestMidnight = midnight;
    } else {
        nearestMidnight = lastMidnight;
    }

    var toReturn = nearestMidnight.valueOf();

    return toReturn;
}

function roundDateToNearestMinute(nativeDate) {
    var seconds = nativeDate.getSeconds();

    if (seconds >= 30) {
        nativeDate.setMinutes(nativeDate.getMinutes() + 1);
    }

    nativeDate.setSeconds(0);
    nativeDate.setMilliseconds(0);
}

function axialRotationsBetweenNativeDates(eventScope, olderNativeDate, newerNativeDate, lat, long) {

    var dayDifferenceManual = 0;

    if ( eventScope == EVENT_SCOPE__HH_MM ) {
        var olderNativeDate_priorSunset = getSunsetNativeUtcDateBefore_withCache(olderNativeDate, lat, long);
        var newerNativeDate_priorSunset = getSunsetNativeUtcDateBefore_withCache(newerNativeDate, lat, long);

        var millisDifferenceManual  = newerNativeDate_priorSunset.getTime() - olderNativeDate_priorSunset.getTime();

        if ( millisDifferenceManual == 0 ) {
            dayDifferenceManual = 0;
        } else if ( millisDifferenceManual < 0 ) {
            if ( millisDifferenceManual >= -MILLIS_PER_DAY ) {
                return -1;
            } else {
                var remainder = millisDifferenceManual % MILLIS_PER_DAY;
                var roundDown = remainder < (-MILLIS_PER_DAY/2);

                dayDifferenceManual = (millisDifferenceManual - remainder) / MILLIS_PER_DAY;

                if ( roundDown ) {
                    dayDifferenceManual = dayDifferenceManual - 1;
                }

                dayDifferenceManual = roundNumberToAxialRotationPrecision(dayDifferenceManual);
            }
        } else if ( millisDifferenceManual <= MILLIS_PER_DAY ) {
            dayDifferenceManual = 1;
        } else {
            var remainder = millisDifferenceManual % MILLIS_PER_DAY;
            var roundUp = remainder > (MILLIS_PER_DAY/2);

            dayDifferenceManual = (millisDifferenceManual - remainder) / MILLIS_PER_DAY;

            if ( roundUp ) {
                dayDifferenceManual = dayDifferenceManual + 1;
            }

            dayDifferenceManual = roundNumberToAxialRotationPrecision(dayDifferenceManual);
        }
    } else {
        var millisDifferenceManual = newerNativeDate.getTime() - olderNativeDate.getTime();
        dayDifferenceManual = roundNumberToAxialRotationPrecision(millisDifferenceManual / MILLIS_PER_DAY);
    }
    
    var toReturn = dayDifferenceManual;

    // print("older: " + olderNativeDate_priorSunset.getTime());
    // print("newer: " + newerNativeDate_priorSunset.getTime());

    // var a = moment(olderNativeDate_priorSunset);
    // var b = moment(newerNativeDate_priorSunset);
    // var dayDifferenceFromMoment = b.diff(a, 'days');

    // if ( dayDifferenceFromMoment != dayDifferenceManual ) {
    //     printWarning("Axial Rotation count differed between manual calculation and moment:  manual=" + dayDifferenceManual + " moment=" + dayDifferenceFromMoment);
    // }

    // print("Rotation Count   manual=" + dayDifferenceManual + " moment=" + dayDifferenceFromMoment);

    // var toReturn = dayDifferenceFromMoment;
    
    // NOTE: This was the old way I was calculating the delta, which had some seemingly bad results, e.g. doing a
    // birthday calculation could give 366 days as output.
    // var olderNativeDate_priorSunset_inDaysSinceEpoch = daysSinceEpochFromMillis(olderNativeDate_priorSunset.getTime());
    // var newerNativeDate_priorSunset_inDaysSinceEpoch = daysSinceEpochFromMillis(newerNativeDate_priorSunset.getTime());
    // var toReturn = newerNativeDate_priorSunset_inDaysSinceEpoch - olderNativeDate_priorSunset_inDaysSinceEpoch;

    
    // UPDATE: Rotation counts are now rounded to one decimal.
    // if ( false == isNonNegIntOrStringThereof(toReturn) ) {
    //     // This CAN actually happen, but in practice I've only seen it occur with e.g. 2000 year differences, and only 1 day discrepancy.
    //     printError("Non-integer (or negative) return value for axialRotationsBetweenNativeDates(): " + toReturn);
    // }

    return toReturn;
}

function daysSinceEpochFromMillis(millisSinceEpoch) {
    return (millisSinceEpoch - millisSinceEpoch % MILLIS_PER_DAY) / MILLIS_PER_DAY;
}

function roundNumberToTimePrecision(value) {
    return roundNumberToPrecision(value, DECIMAL_PRECISION__TIME);
}

function roundNumberToLocationPrecision(value) {
    return roundNumberToPrecision(value, DECIMAL_PRECISION__LOCATION);
}

function roundNumberToAxialRotationPrecision(value) {
    return roundNumberToPrecision(value, DECIMAL_PRECISION__AXIAL_ROTATIONS);
}

function roundNumberToPrecision(value, precision) {
    var factor = Math.pow(10, precision);
    var toReturn = Math.round((value + Number.EPSILON) * factor) / factor;

    return toReturn;
}

function newOperation(equation, weight, enabled = true) {
    return {
        equation: equation,
        weight: weight,
        enabled: true
    };
}

function oph_sqrt(value) {
    return Math.sqrt(value);
}

function oph_abs(value) {
    return Math.abs(value);
}

function oph_floor(value) {
    return Math.floor(value);
}

function oph_ceil(value) {
    return Math.ceil(value);
}

function oph_log(value) {
    return Math.log(value);
}

function oph_sin(value) {
    return Math.sin(value);
}

function oph_cos(value) {
    return Math.cos(value);
}

function oph_tan(value) {
    return Math.tan(value);
}

function oph_exp(value) {
    return Math.exp(value);
}

// A wrapper around Math.round() in case this needs to be updated quickly at some point.
function oph_round(value) {
    return Math.round(value);
}

function oph_flip(value) {
    var valueAsString = value + "";
    var indexOfDecimalPlace = valueAsString.indexOf(".");
    valueAsString = valueAsString.replace(".", "");

    var valueAsStringSplit = valueAsString.split("");
    var valueAsStringSplitReversed = valueAsStringSplit.reverse();

    if ( indexOfDecimalPlace > 0 ) {
        valueAsStringSplitReversed.splice(indexOfDecimalPlace, 0, ".");
    }
    
    var joinArray = valueAsStringSplitReversed.join("");
    
    var numberObject = new Number(joinArray);
    var numberPrimitive = numberObject.valueOf();

    return numberPrimitive;
}

var ALL_OPH_FUNCTIONS = [
    oph_sqrt,
    oph_abs,
    oph_floor,
    oph_ceil,
    oph_log,
    oph_sin,
    oph_cos,
    oph_tan,
    oph_round,
    oph_flip,
    oph_exp
]