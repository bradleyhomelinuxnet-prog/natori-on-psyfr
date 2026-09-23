
function getEffectiveXDateCount(isoEvent) {

    var toReturn = 0;
    
    for ( var i = 0; i < isoEvent.x_dates.length; i++ ) {
        var ithXDate = isoEvent.x_dates[i];
        
        if ( ithXDate.enabled === true ) {
            toReturn += 1;
        }
    }

    return toReturn;
}

function getScoringSystem(isoEvent) {
    if ( SCORING_SYSTEMS.includes(isoEvent.scoring_system) ) {
        return isoEvent.scoring_system;
    } else {
        return SCORING_SYSTEM__GTE_V8;
    }
}

function getEffectiveOperations(isoEvent) {
    var toReturn = [];

    var operationsCloned = deepClone(isoEvent.operations);
    
    for ( var i = 0; i < operationsCloned.length; i++ ) {
        var ithOperation = operationsCloned[i];

        if ( ithOperation.enabled === true ) {

            var validationErrors = [];
            var operationFunction = validateOperationString(ithOperation.equation, i, operationsCloned, validationErrors);

            if ( validationErrors.length > 0 ) {
                toReturn.push(ithOperation);
            } else {
                ithOperation.cached_operation_function = operationFunction;
                toReturn.push(ithOperation);
            }
        } else {
            toReturn.push(ithOperation);
        }
    }

    return toReturn;
}

function newOphErrorObject(errorStatus, errorMessage, convertErrorMessageToText = true) {
    return {
        error_status: errorStatus,
        error_message: convertErrorMessageToText ? convertHtmlToPlainText(errorMessage) : errorMessage
    };
}

function runOphisOnEventForExport(isoEvent) {
    var results = runOphisOnEvent(isoEvent);

    if ( results.errors.length > 0 ) {
        for ( var k = 0; k < results.errors.length; k++ ) {
            var kthError = results.errors[k];

            if ( isObjectString(kthError) ) {
                results.errors[k] = newOphErrorObject(OPH_OUTPUT_ERROR_STATUS__GENERAL_FAILURE, kthError);
            } else {
                results.errors[k].error_message = convertHtmlToPlainText(results.errors[k].error_message);
            }
        }
    } else {
        var zDates = results.processed_z_dates__sorted_by_date;

        if ( zDates.length == 0 ) {
            results.errors.push(newOphErrorObject(OPH_OUTPUT_ERROR_STATUS__NO_RESULTS, NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT, false));
        }
    }

    return results;
}

function runOphisOnEvent(isoEvent) {

    var errors = [];
    var yStructsArray = [];
    var zStructsDict = {};

    try {
        var effectiveXDateCount = getEffectiveXDateCount(isoEvent);
        var effectiveOperations = getEffectiveOperations(isoEvent);
        isoEvent.effective_operations = effectiveOperations;

        var enabledOperationCount = 0;

        for ( var i = 0; i < isoEvent.effective_operations.length; i++ ) {
            var ithOperation = isoEvent.effective_operations[i];

            if ( ithOperation.enabled === true && ithOperation.cached_operation_function ) {
                enabledOperationCount += 1;
            }
        }

        if ( effectiveXDateCount < MINIMUM_NUMBER_OF_X_DATES ) {
            errors.push("At least "+MINIMUM_NUMBER_OF_X_DATES+" X-Dates are required.");
        } else {
            if ( isoEvent.scope == EVENT_SCOPE__MONTHS ) {
                errors.push("Month-based projections may be supported in a future version.");
            } else if ( isoEvent.scope == EVENT_SCOPE__YEARS ) {
                errors.push("Year-based projections may be supported in a future version.");
            } else {
                if ( enabledOperationCount < MINIMUM_OPERATIONS_REQUIRED ) {
                    errors.push("At least "+MINIMUM_OPERATIONS_REQUIRED+" Operation is required.");
                } else {
                    var dateSpreadErrors = [];
                    var xDatesPassMuster = validateXDateSpread(isoEvent, dateSpreadErrors);
            
                    if ( xDatesPassMuster == false ) {
                        errors = dateSpreadErrors;
                    } else {
                        generateYAndZStructs(isoEvent, effectiveOperations, yStructsArray, zStructsDict);
                    }
                }
            }
        }

        var scoringSystem = getScoringSystem(isoEvent);

        scoreZDates(isoEvent.effective_operations, scoringSystem, zStructsDict);
    } catch (error) {
        errors.push(""+error);
    }
    
    var results = {
        errors: errors,
        y_structs: yStructsArray,
        z_structs: zStructsDict,
        selected_y_struct_for_details: 0
    };

    if ( results.errors.length > 0 ) {
        // Error handling is downstream, either in UI or in CLI.

        results.processed_z_dates = [];
        results.processed_z_dates__sorted_by_date = [];
    } else {
        sortAndFilterResults(isoEvent, results);
    }

    return results;
}

function sortAndFilterResults(isoEvent, results) {
    var zStructsDict = results.z_structs;
    var scoringSystem = getScoringSystem(isoEvent);
    var currentLocalDate = getCurrentLocalTime(appState.globalOptions.local_time_offset_in_millis);
    var filteredZDates = filterZDates(isoEvent, zStructsDict, currentLocalDate);
    var zDatesSortedByDate = sortZDates(filteredZDates, zStructsDict, Z_DATE_SORT_TYPE__DATE, scoringSystem);
    
    for ( var i = 0; i < zDatesSortedByDate.length; i++ ) {
        var ithZDateDictKey = zDatesSortedByDate[i];
        var ithZDateTags = results.z_structs[ithZDateDictKey];
        ithZDateTags.z_ordinal = i;
    }

    var sortedAndFilteredZDates = isoEvent.z_date_sort_type == Z_DATE_SORT_TYPE__DATE ? deepClone(zDatesSortedByDate) : sortZDates(filteredZDates, zStructsDict, isoEvent.z_date_sort_type, scoringSystem);

    results.processed_z_dates = sortedAndFilteredZDates;
    results.processed_z_dates__sorted_by_date = zDatesSortedByDate;
}

function generateYAndZStructs(isoEvent, effectiveOperations, yStructsDict_out, zStructsDict_out) {
    var effectiveXDates = isoEvent.x_dates;

    var alreadyCalculatedSunsets = [];

    for ( var i = 1; i < effectiveXDates.length; i++ ) {
        var ithXDate = effectiveXDates[i];
        var ithNativeDate = xDateToNativeDate(isoEvent.scope, ithXDate, isoEvent.lat, isoEvent.long);

        for ( var k = 0; k < effectiveXDates.length; k++ ) {
            if ( k < i ) {
                var kthXDate = effectiveXDates[k];

                if ( kthXDate.enabled === true && ithXDate.enabled === true ) {
                    var kthNativeDate = xDateToNativeDate(isoEvent.scope, kthXDate, isoEvent.lat, isoEvent.long);

                    var x1NativeDate = kthNativeDate;
                    var x2NativeDate = ithNativeDate;

                    var rotationCountY = axialRotationsBetweenNativeDates(isoEvent.scope, x1NativeDate, x2NativeDate, isoEvent.lat, isoEvent.long);

                    // print(rotationCountY);

                    var xOrdinal1 = k;
                    var xOrdinal2 = i;

                    var dayScopeStartTimeInMillis = isNonNegIntOrStringThereof(isoEvent.day_scope_start_time_in_millis) ? isoEvent.day_scope_start_time_in_millis : DEFAULT_DAY_SCOPE_START_TIME_MILLIS;

                    var operationResultsOnRotationCountY = runOperations(effectiveOperations, isoEvent.scope, x1NativeDate, x2NativeDate, rotationCountY, isoEvent.lat, isoEvent.long, alreadyCalculatedSunsets, dayScopeStartTimeInMillis);

                    var yOrdinal = yStructsDict_out.length;
                    var yStruct = {
                        y_ordinal: yOrdinal,
                        rotation_count_y: rotationCountY,
                        x_1_ordinal: xOrdinal1,
                        x_2_ordinal: xOrdinal2,
                        operation_results: operationResultsOnRotationCountY
                    };

                    tagZDates(yStruct, operationResultsOnRotationCountY, zStructsDict_out);

                    yStructsDict_out.push(yStruct);
                }
            }
        }
    }
}

function runOperationFunction(operationFunction, Y) {
    var zValue = operationFunction(Y);

    var zValueRounded = roundNumberToTimePrecision(zValue);

    return zValueRounded;
}

function getStartingX(operationEquationString, needsNormalizing = true) {

    if ( needsNormalizing === true ) {
        operationEquationString = normalizeOperationEquationString(operationEquationString);
    }

    if ( operationEquationString.startsWith("X1+") ) {
        return STARTING_X1;
    } else if ( operationEquationString.startsWith("X2+") ) {
        return STARTING_X2;
    } else {
        return null;
    }
}

// This function is necessary since rounding errors in trigonometry can mean that e.g. `12/14/23 3:01` and `12/14/23 3:02`
// can resolve to a slightly different sunset time, usually only a minute or two difference. So whatever sunset is calculated
// first, go with that one.
function findAlreadyCalculatedSunset(sunsetNative, alreadyCalculatedSunsets) {
    var sunsetMillis = sunsetNative.getTime();

    for( var i = 0; i < alreadyCalculatedSunsets.length; i++ ) {
        var ithCalculatedSunset = alreadyCalculatedSunsets[i];
        var ithCalculatedSunsetMillis = ithCalculatedSunset.getTime();

        if ( numbersEqualWithinTol(ithCalculatedSunsetMillis, sunsetMillis, ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS) ) {
            return ithCalculatedSunset;
        }
    }

    alreadyCalculatedSunsets.push(sunsetNative);

    return sunsetNative;
}

function runOperations(operations, eventScope, x1NativeDate, x2NativeDate, axialRotationCountY, lat, long, alreadyCalculatedSunsets, dayScopeStartTimeMillis = 0) {
    var toReturn = [];

    if ( axialRotationCountY > MAXIMUM_ROTATION_COUNT_Y ) {
        console.warn("axialRotationCountY of " + axialRotationCountY  + " exceeded maximum of " + MAXIMUM_ROTATION_COUNT_Y + ". Constraining to maximum.");

        axialRotationCountY = MAXIMUM_ROTATION_COUNT_Y;
    }

    for( var i = 0; i < operations.length; i++ ) {
        var ithOperation = operations[i];

        if ( ithOperation.enabled == false ) {
            continue;
        }

        if ( ithOperation.cached_operation_function ) {
            // all good
        } else {
            // Used to warn here, but an operation with an error is now still included in the final list.
            // console.warn("Operation " + ithOperation.equation + " was enabled but did not have a cached_operation_function!");
            continue;
        }

        var ithZValue_raw = ithOperation.cached_operation_function(axialRotationCountY);

        if ( ithZValue_raw > MAXIMUM_ROTATION_COUNT_Z ) {
            console.warn("axialRotationCountZ of " + ithZValue_raw  + " exceeded maximum of " + MAXIMUM_ROTATION_COUNT_Z + ". Constraining to maximum.");

            ithZValue_raw = MAXIMUM_ROTATION_COUNT_Z;
        }
        
        var ithZValueInMillis_raw = ithZValue_raw * MILLIS_PER_DAY; // purposely do this before rounding to precision...feels more correct
        ithZValue_raw = roundNumberToTimePrecision(ithZValue_raw);

        var startingXDate_native = null;
        var otherXDate_native = null;

        var startingX = getStartingX(ithOperation.equation);

        if ( startingX == STARTING_X1 ) {
            startingXDate_native = x1NativeDate;
            otherXDate_native = x2NativeDate;
        } else if ( startingX == STARTING_X2 ) {
            startingXDate_native = x2NativeDate;
            otherXDate_native = x1NativeDate;
        }

        var dateToWhichToAddZValue_native = isFlagEnabled(FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET) ? getSunsetNativeUtcDateBefore_withCache(startingXDate_native, lat, long) : cloneNativeDate(startingXDate_native);
        otherXDate_native = isFlagEnabled(FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET) ? getSunsetNativeUtcDateBefore_withCache(otherXDate_native, lat, long) : cloneNativeDate(otherXDate_native);

        if ( eventScope == EVENT_SCOPE__DAYS ) {
            if ( dayScopeStartTimeMillis > 0 ) {
                dateToWhichToAddZValue_native.setTime(dateToWhichToAddZValue_native.getTime() + dayScopeStartTimeMillis);
            }
        }

        var zDateInMillisSinceEpoch = dateToWhichToAddZValue_native.getTime() + ithZValueInMillis_raw;
        var zDate_native = new Date(zDateInMillisSinceEpoch);

        var zDate_native_start = null;
        var zDate_native_end = null;

        if ( eventScope == EVENT_SCOPE__HH_MM && isFlagEnabled(FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER) ) {
            var sunsetSampling = [];
            var zDate_native_sunsetBefore = getSunsetNativeUtcDateBefore_withCache(zDate_native, lat, long, sunsetSampling);
            var zDate_native_sunsetAfter = getSunsetNativeUtcDateAfter_withCache(zDate_native, lat, long, sunsetSampling);

            zDate_native_sunsetBefore = findAlreadyCalculatedSunset(zDate_native_sunsetBefore, alreadyCalculatedSunsets);
            zDate_native_sunsetAfter = findAlreadyCalculatedSunset(zDate_native_sunsetAfter, alreadyCalculatedSunsets);

    
            // print(zDate_native_sunsetBefore);
            // if ( (zDate_native_sunsetBefore+ "").includes("2023-10-10") ) {
            //     print(zDate_native);
            // }
    
            zDate_native_start = zDate_native_sunsetBefore;
            zDate_native_end = zDate_native_sunsetAfter;
        } else {
            lat = null;
            long = null;

            if ( isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) {
                lat = 0;
                long = 0;
            }

            var tempZDate = nativeDateToXDate(zDate_native, lat, long);
            var zDate_native_timeZero = xDateToNativeDate(eventScope, tempZDate, lat, long);

            zDate_native_start = zDate_native_timeZero;
            zDate_native_end = zDate_native_timeZero;
        }
        
        // NOTE: PURPOSELY using startingXDate_native and NOT dateToWhichToAddZValue_native as the start date.
        // Since this may equal startingXDate_native_sunsetBefore and if FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET === true
        // then axialRotationsBetweenNativeDates may use as the starting date a sunset YET AGAIN prior to the given sunset. 
        //
        // UPDATE: Now just rounding the calculated Z-Value directly.
        //
        // var rotationCountZ = axialRotationsBetweenNativeDates(eventScope, startingXDate_native, zDate_native, lat, long);

        var rotationCountZ = roundNumberToAxialRotationPrecision(ithZValue_raw);
        var zDateNativeToMillis = zDate_native_start.getTime();
        // var hashWithoutOrdinal = ithZValue_raw + dateToWhichToAddZValue_native.toString() + zDate_native_end.toString();
        var hashWithoutOrdinal = "" + dateToWhichToAddZValue_native.getTime() + "" + zDateNativeToMillis;
        var fullUniqueHash = "" + i + "" + x1NativeDate.getTime() + "" + x2NativeDate.getTime() + "" + zDateNativeToMillis;

        var zDateReadableStart = "";
        var zDateReadableEnd = "";
        var zDateReadableStartNoHtml = "";
        var zDateReadableEndNoHtml = "";

        if ( eventScope == EVENT_SCOPE__HH_MM ) {
            zDateReadableStart = nativeDateToReadableString_dateAndTime(zDate_native_start, lat, long);
            zDateReadableEnd = nativeDateToReadableString_dateAndTime(zDate_native_end, lat, long);

            var includeHtmlForTime = false;
            zDateReadableStartNoHtml = nativeDateToReadableString_dateAndTime(zDate_native_start, lat, long, includeHtmlForTime);
            zDateReadableEndNoHtml = nativeDateToReadableString_dateAndTime(zDate_native_end, lat, long, includeHtmlForTime);
        } else if ( eventScope == EVENT_SCOPE__DAYS ) {
            zDateReadableStart = nativeDateToReadableString_dateOnly(zDate_native_start, lat, long);
            zDateReadableEnd = nativeDateToReadableString_dateOnly(zDate_native_end, lat, long);

            zDateReadableStartNoHtml = zDateReadableStart;
            zDateReadableEndNoHtml = zDateReadableEnd;
        }

        var ithOperationResult = {
            z_value: ithZValue_raw, // TODO: Minor naming issue, z-delta should only mean axial rotation count.
            rotation_count_y: axialRotationCountY,
            rotation_count_z: rotationCountZ,
            z_date_native: zDate_native, // Only used for debugging at this point.
            z_date_native_start: zDate_native_start,
            z_date_native_end: zDate_native_end,
            z_date_readable_start: zDateReadableStart,
            z_date_readable_end: zDateReadableEnd,
            z_date_readable_start_no_html: zDateReadableStartNoHtml,
            z_date_readable_end_no_html: zDateReadableEndNoHtml,
            x_date_native_start: dateToWhichToAddZValue_native,
            x_date_native_other: otherXDate_native,
            operation_ordinal: i,
            operation: operations[i],
            hash: fullUniqueHash,
            hash_without_ordinal: hashWithoutOrdinal,
            z_date_dict_key: zDateNativeToMillis
        };

        toReturn.push(ithOperationResult);
    }

    return toReturn;
}

function scoreZDates(effectiveOperations, scoringSystem, zStructsDict_out) {
    for (var ithSunsetBeforeMillisString in zStructsDict_out) {
        // check if the property/key is defined in the object itself, not in parent
        if (zStructsDict_out.hasOwnProperty(ithSunsetBeforeMillisString)) {

            var tagsDictForIthZDate = zStructsDict_out[ithSunsetBeforeMillisString];
            
            sortOperationMatches(tagsDictForIthZDate.operation_match_structs);
            sortMsrfMatches(tagsDictForIthZDate.msrf_match_structs);

            var operationSubscore = getOperationScore(effectiveOperations, tagsDictForIthZDate.operation_match_structs);
            var msrfMatchSubscore = sumUpMsrfMatchSubscore(tagsDictForIthZDate.msrf_match_structs, scoringSystem);

            var finalScore = 0;
            var operationHitCount = tagsDictForIthZDate.operation_match_structs.length;
            var msrfHitCount = tagsDictForIthZDate.msrf_match_structs.length;
            var finalHitCount = operationHitCount + msrfHitCount;

            finalScore += operationSubscore;
            finalScore += msrfMatchSubscore;

            var baseScorePreMultiply = finalScore;

            if ( scoringSystem == SCORING_SYSTEM__LTE_V7 ) {
                // Nothing more to do.
            } else if ( scoringSystem == SCORING_SYSTEM__GTE_V8 ) {
                var msrfMultiplier = getMsrfScoreMultiplier(tagsDictForIthZDate.msrf_match_structs);

                finalScore *= msrfMultiplier;
            } else {
                console.warn("Unhandled scoring system: " + scoringSystem);
            }
            
            tagsDictForIthZDate.operation_score = operationSubscore;
            tagsDictForIthZDate.operation_hit_count = operationHitCount;

            var finalScoreRounded = roundNumberToPrecision(finalScore, DECIMAL_PRECISION__SCORE);

            tagsDictForIthZDate.score = finalScoreRounded;
            tagsDictForIthZDate.base_score_pre_multiply = baseScorePreMultiply;
            tagsDictForIthZDate.hit_count = finalHitCount;
        }
    }
}

function getMsrfScoreMultiplierForFilter(msrfFilter) {

    var toReturn = 1.0;

    if ( msrfFilter == MSRF_FILTER__NORMAL ) {
        toReturn = SCORE_MULTIPLIER__NORMAL_MSRF_MATCH;
    } else if ( msrfFilter == MSRF_FILTER__IMPORTANT ) {
        toReturn = SCORE_MULTIPLIER__IMPORTANT_MSRF_MATCH;
    } else if ( msrfFilter == MSRF_FILTER__VORTEX ) {
        toReturn = SCORE_MULTIPLIER__VORTEX_MSRF_MATCH;
    }
    
    return toReturn;
}

function getMsrfScoreMultiplier(msrfMatches) {
    var toReturn = 1.0;
    
    for ( var i = 0; i < msrfMatches.length; i++ ) {
        var ithMsrfMatchStruct = msrfMatches[i];
        
        var ithMultiplier = getMsrfScoreMultiplierForFilter(ithMsrfMatchStruct.msrf_filter);

        if ( ithMultiplier > toReturn ) {
            toReturn = ithMultiplier;
        }
    }

    return toReturn;
}

function sumUpMsrfMatchSubscore(msrfMatches, scoringSystem) {

    var overallScoreMultiplier = getMsrfScoreMultiplier(msrfMatches);

    var toReturn = 0;

    var alreadyFoundScoreMultiplier = false;
    
    for ( var i = 0; i < msrfMatches.length; i++ ) {
        var ithMsrfMatchStruct = msrfMatches[i];

        var ithScoreMultiplier = getMsrfScoreMultiplierForFilter(ithMsrfMatchStruct.msrf_filter);

        if ( alreadyFoundScoreMultiplier == false && ithScoreMultiplier == overallScoreMultiplier && scoringSystem == SCORING_SYSTEM__GTE_V8 ) {
            alreadyFoundScoreMultiplier = true;
            // Don't add this MSRF number into the base points equation, since it will be the multiplier.
        } else {
            toReturn += ithMsrfMatchStruct.points;
        }
    }

    return toReturn;
}

function sumUpMsrfNumbersThemselves(msrfMatches) {
    var toReturn = 0;
    
    for ( var i = 0; i < msrfMatches.length; i++ ) {
        var ithMsrfMatchStruct = msrfMatches[i];

        toReturn += ithMsrfMatchStruct.msrf_number;;
    }

    return toReturn;
}

function getOperationScore(effectiveOperations, operationMatchStructs) {
    var toReturn = 0;
    
    for ( var i = 0; i < operationMatchStructs.length; i++ ) {
        var ithOperationMatchStruct = operationMatchStructs[i];
        var ithOperationOrdinal = ithOperationMatchStruct.operation_result.operation_ordinal;
        var ithOperation = effectiveOperations[ithOperationOrdinal];
        var weight = ithOperation.weight;
        ithOperationMatchStruct.points = weight;
        toReturn += weight;
    }

    return toReturn;
}

function tagZDates(yStruct, operationResultsOnRotationCountY, zStructsDict_out) {
    for ( var i = 0; i < operationResultsOnRotationCountY.length; i++ ) {
        var ithOperationResult = operationResultsOnRotationCountY[i];

        var ithRotationCountZ = ithOperationResult.rotation_count_z;
        
        // Make sure the key is a string in case Javascript (or wherever this may be ported to)
        // tries something inefficient with a sparse array. Basically force a String-key Dictionary.
        var ithOperationResultDictKey = nativeDateToUtcMillis(ithOperationResult.z_date_native_start) + "";

        var existingZStruct = zStructsDict_out[ithOperationResultDictKey];

        // console.log(ithOperationResult.z_date_native_start + " " + ithOperationResultDictKey);

        // debugger;

        if ( existingZStruct ) {
            // already exists, just gotta add to it.
        } else {
            var newZStruct = {
                z_date_native: ithOperationResult.z_date_native,
                z_date_native_start: ithOperationResult.z_date_native_start,
                z_date_native_end: ithOperationResult.z_date_native_end,
                z_date_readable_start: ithOperationResult.z_date_readable_start,
                z_date_readable_end: ithOperationResult.z_date_readable_end,
                z_date_readable_start_no_html: ithOperationResult.z_date_readable_start_no_html,
                z_date_readable_end_no_html: ithOperationResult.z_date_readable_end_no_html,
                operation_match_structs: [],
                msrf_match_structs: [],

                // Both will be computed all at once later. Could be done here but keeping the logic simple-to-follow
                // in favor of something technically more optimized.
                score: 0,
                hit_count: 0
            }

            zStructsDict_out[ithOperationResultDictKey] = newZStruct;

            existingZStruct = newZStruct;
        }

        var operationMatchStruct = {
            y_struct: yStruct,
            operation_result: ithOperationResult
        }

        existingZStruct.operation_match_structs.push(operationMatchStruct);

        var msrfMatchStruct = getMsrfMatch(ithRotationCountZ);
        
        if ( msrfMatchStruct != null ) {
            msrfMatchStruct.y_struct = yStruct;
            msrfMatchStruct.operation_result = ithOperationResult;
            
            existingZStruct.msrf_match_structs.push(msrfMatchStruct);
        }
    }
}