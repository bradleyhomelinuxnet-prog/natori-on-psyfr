var DEFAULT_OPERATION_FUNCTION = new Function("Y", "return Y;");

function validateSunsetSequence(listOfSunsetsInMillis, errors_out) {
    var differenceLimitInMillis = 5 * MILLIS_PER_MINUTE;

    for ( var i = 0; i < listOfSunsetsInMillis.length; i++ ) {
        var ithSunsetMillis = listOfSunsetsInMillis[i];

        if ( i > 0 ) {
            var mostRecentSunsetMillisIntoDay = listOfSunsetsInMillis[i-1] % MILLIS_PER_DAY;
            var ithSunsetMillisIntoDay = ithSunsetMillis % MILLIS_PER_DAY;

            var minMillisIntoDay = Math.min(mostRecentSunsetMillisIntoDay, ithSunsetMillisIntoDay);
            var maxMillisIntoDay = Math.max(mostRecentSunsetMillisIntoDay, ithSunsetMillisIntoDay);
            var difference = maxMillisIntoDay - minMillisIntoDay;

            // Check if we're comaring e.g. midnight on one day, and a minute or two before midnight on another day.
            if ( difference > MILLIS_PER_DAY/2 ) {
                difference = MILLIS_PER_DAY - difference;
            }

            if ( difference > differenceLimitInMillis ) {
                var ithSunsetNative = utcMillisToNativeDate(ithSunsetMillis);
                errors_out.push("Found sunset issue for " + ithSunsetNative);
            }
        }
    }
}

function normalizeOperationEquationString(operationEquationString, doReplacements = true) {
    if ( operationEquationString ) {
        operationEquationString = operationEquationString + ""; // Cast to string if needed.
        operationEquationString = operationEquationString.replaceAll(" ", "");

        // Capitalize all function names, temporarily.
        // This is kind of a hacky way to get around the fact that `oph_exp()` will get replaced
        // with `oph_e*p()` for this basic find/replace normalization that's being done here.
        for ( var i = 0; i < ALL_OPH_FUNCTIONS.length; i++ ) {
            var ithOphFunction = ALL_OPH_FUNCTIONS[i];
            operationEquationString = operationEquationString.replaceAll(ithOphFunction.name, ithOphFunction.name.toUpperCase());
        }

        if ( doReplacements === true ) {
            operationEquationString = operationEquationString.replaceAll("x", "*");

            for ( var i = 0; i < ALL_OPH_CONSTANTS.length; i++ ) {
                var ithOphConstant = ALL_OPH_CONSTANTS[i];
                
                operationEquationString = operationEquationString.replaceAll(ithOphConstant, window[ithOphConstant]);
            }
        }

        // Put all functions back to lowercase.
        for ( var i = 0; i < ALL_OPH_FUNCTIONS.length; i++ ) {
            var ithOphFunction = ALL_OPH_FUNCTIONS[i];
            operationEquationString = operationEquationString.replaceAll(ithOphFunction.name.toUpperCase(), ithOphFunction.name.toLowerCase());
        }

        return operationEquationString;
    } else {
        return "";
    }
}

var Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE = "Z-value must resolve to a number > 0.";

function validateSimpleArithmeticString(normalizedAndStrippedOperationEquationString, errors_out) {
    if ( normalizedAndStrippedOperationEquationString.includes("=") ) {
        errors_out.push("Cannot include '=' in the equation.");
    }

    try {
        math.parse(normalizedAndStrippedOperationEquationString);

        try {
            var scope = {};
            var result = math.evaluate(normalizedAndStrippedOperationEquationString, scope);

            if ( isValidOperationEquationResult(result) ) {
                return true; // Expression evaluated to positive float.
            } else {
                errors_out.push(Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE);
                return false;
            }
        } catch (error) {
            errors_out.push(error.message);

            return false; // Expression is semantically invalid, or divide by zero, etc.
        }
    } catch (error) {
        errors_out.push(error.message);

        return false; // Expression is syntactically invalid
    }
}

function stripXDateFromOperationEquationString(normalizedOperationEquationString) {
    // Strip the `X1+` or `X2+` from the beginning of the string.
    normalizedOperationEquationString = normalizedOperationEquationString.slice(3);

    return normalizedOperationEquationString;
}

function stripOperationEquationString(normalizedOperationEquationString) {
    normalizedOperationEquationString = stripXDateFromOperationEquationString(normalizedOperationEquationString);

    for ( var i = 0; i < ALL_OPH_FUNCTIONS.length; i++ ) {
        var ithOphFunction = ALL_OPH_FUNCTIONS[i];

        // Remove all oph_*() function calls from the string. E.g. `10 + oph_round(Y*2)` will turn
        // to `10 + (Y*2)` which is still a valid arithmetic string, since all oph_*() functions 
        // currently only accept one parameter. This is purely for checking that the string 
        // is simple arithmetic, so stripping the function names doesn't matter.
        normalizedOperationEquationString = normalizedOperationEquationString.replaceAll(ithOphFunction.name, "");
    }

    // Again doesn't matter that we're putting a dummy value in for Y, since this is just for validation.
    normalizedOperationEquationString = normalizedOperationEquationString.replaceAll("Y", SAMPLE_Y_VALUE_FOR_VALIDATION);

    return normalizedOperationEquationString;
}

function isValidOperationEquationResult(result) {
    if ( typeof result === 'number' && Number.isNaN(result) == false && result > 0 ) {
        return true;
    } else {
       return false;
    }
}

function validateOperationString(operationEquationString, indexInOperationArray, otherOperations, errors_out) {

    errors_out = Array.isArray(errors_out) ? errors_out : [];

    var toReturn = DEFAULT_OPERATION_FUNCTION;

    if ( operationEquationString ) {

        var doReplacements = true;
        var normalizedOperationEquationString = normalizeOperationEquationString(operationEquationString, doReplacements);

        var needsNormalizing = false;
        var startingX = getStartingX(normalizedOperationEquationString, needsNormalizing);

        if ( startingX == STARTING_X1 || startingX == STARTING_X2 ) {

            var operationEquationStringForValidation = stripOperationEquationString(normalizedOperationEquationString);

            validateSimpleArithmeticString(operationEquationStringForValidation, errors_out);
        
            if ( errors_out.length > 0 ) {
                return toReturn;
            }

            var operationEquationStringForFinalFunction = stripXDateFromOperationEquationString(normalizedOperationEquationString);

            try {
                var operationFunction = new Function("Y", "return " + operationEquationStringForFinalFunction + ";");

                var zValue = operationFunction(SAMPLE_Y_VALUE_FOR_VALIDATION);

                if ( isValidOperationEquationResult(zValue) ) {
                    toReturn = operationFunction;
                } else {
                    errors_out.push(Z_VALUE_MUST_BE_GREATER_THAN_ZERO_MESSAGE);
                }
            } catch (e) {
                errors_out.push("" + e);
            }
        } else {
            errors_out.push("Must start with 'X1 + &hellip;' or 'X2 + &hellip;'");
        }

        if ( errors_out.length == 0 ) {
        for( var i = indexInOperationArray-1; i >= 0; i-- ) {
            var ithOtherOperation = otherOperations[i];

            var doReplacements = true;
            var ithNormalizedOperationEquation = normalizeOperationEquationString(ithOtherOperation.equation, doReplacements);

            if ( ithNormalizedOperationEquation == normalizedOperationEquationString ) {
                errors_out.push("Indentical to Operation " + (i+1) + " and each Operation must be unique.");
            }
        }
    }
    } else {
        errors_out.push("Cannot be empty.");
    }

    return toReturn;
}

function validateXDateSpread(isoEvent, dateSpreadErrors_out) {
    var actuallyFoundError = false;

    var effectiveXDates = isoEvent.x_dates;

    for ( var i = 1; i < effectiveXDates.length; i++ ) {
        var ithXDate = effectiveXDates[i];

        if ( ithXDate.enabled == false ) {
            continue;
        }

        var ithNativeDate = xDateToNativeDate(isoEvent.scope, ithXDate, isoEvent.lat, isoEvent.long);

        var ithMinusOneXDate = null;
        var indexOfPreviousXDate = i;

        for ( var k = i-1; k >= 0; k-- ) {
            var kthXDate = effectiveXDates[k];

            indexOfPreviousXDate -= 1;

            if ( kthXDate.enabled === true ) {
                ithMinusOneXDate = kthXDate;
                break;
            }
        }

        if ( ithMinusOneXDate == null ) {
            continue;
        }

        var ithMinusOneNativeDate = xDateToNativeDate(isoEvent.scope, ithMinusOneXDate, isoEvent.lat, isoEvent.long);
        
        var minimumDaysBetweenDates = 0;

        if ( i == 1 ) {
            minimumDaysBetweenDates = MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES;
        } else {
            minimumDaysBetweenDates = MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES;
        }

        var x1NativeDate = ithMinusOneNativeDate;
        var x2NativeDate = ithNativeDate;

        if ( isValidNativeDate(x1NativeDate) && isValidNativeDate(x2NativeDate) ) {
            var axialRotationCount = axialRotationsBetweenNativeDates(isoEvent.scope, x1NativeDate, x2NativeDate, isoEvent.lat, isoEvent.long);

            var axialRotationsSingularOrPlural = minimumDaysBetweenDates == 1 ? "day" : "days";

            var x1ShortName = getRowShortNameHtml("X", indexOfPreviousXDate);
            var x2ShortName = getRowShortNameHtml("X", i);
            var leftArrowHtml = "&#8592; ";
            if ( axialRotationCount < 0 ) {
                actuallyFoundError = true;
                dateSpreadErrors_out.push(x2ShortName+" must be greater than "+x1ShortName);
            } else if ( axialRotationCount == 0 ) {
                actuallyFoundError = true;
                var errorMessage = x1ShortName+" and " + x2ShortName + " must be different days";

                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    errorMessage += ", or before/after sunset.";
                } else {
                    errorMessage += ".";
                }

                dateSpreadErrors_out.push(errorMessage);
            } else if ( axialRotationCount < minimumDaysBetweenDates ) {
                actuallyFoundError = true;
                dateSpreadErrors_out.push(x2ShortName+" must be at least "+ minimumDaysBetweenDates + " " + axialRotationsSingularOrPlural + " after "+x1ShortName + ", found: " + axialRotationCount);
            }
        } else {
            actuallyFoundError = true;
            dateSpreadErrors_out.push("Problem parsing one of the X-Dates to validate spread: " + JSON.stringify(ithXDate) + " or " + JSON.stringify(ithMinusOneXDate));
        }
    }

    if ( actuallyFoundError == false ) {
        dateSpreadErrors_out.length = 0;
    }

    return actuallyFoundError == false;
}

function validateNewWouldBeLoadDate(eventScope, ithXOrTDate, lat, long, loadErrors_out) {
    if ( ithXOrTDate.enabled === true ) {
        // all good
    } else if ( ithXOrTDate.enabled === false ) {
        // also all good.
    } else {
        ithXOrTDate.enabled = true;
    }

    if ( isFileInputValidationLoose() ) {
        if ( eventScope == EVENT_SCOPE__HH_MM ) {
            if ( ithXOrTDate.time ) { 
                // assume time is correctly formatted. Downstream logic will bail if not.
            } else {
                ithXOrTDate.time = "00:00";
            }
        }
    }
    
    var loadErrors_out_lengthBefore = loadErrors_out.length;

    var ithNativeDate = xDateToNativeDate(eventScope, ithXOrTDate, lat, long, loadErrors_out);

    if ( ithNativeDate != null ) {
        if ( loadErrors_out_lengthBefore == loadErrors_out.length ) {
            // Happy path.
        } else {
            loadErrors_out.push(JSON.stringify(ithXOrTDate) + " parsed to a valid native Date but errors were output.");
        }
    } else {
        if ( loadErrors_out_lengthBefore == loadErrors_out.length ) {
            // Something weird happened. Likely programmer error. Null native date but no error output.
            loadErrors_out.push(JSON.stringify(ithXOrTDate) + " parsed to a null native Date but no errors output.");
        } else {
            // Happy path, loadErrors_out contains the error info.
        }
    }
}

function validateNewWouldBeLoadDates(eventScope, xOrTDateArray, lat, long, loadErrors_out) {
    for ( var i = 0; i < xOrTDateArray.length; i++ ) {
        var ithXOrTDate = xOrTDateArray[i];
        
        validateNewWouldBeLoadDate(eventScope, ithXOrTDate, lat, long, loadErrors_out);
    }
}

function isValidParsedFloat(floatValue, index, serializationKey, loadErrors_out) {
    if ( floatValue != null && floatValue != undefined ) {
        if ( typeof floatValue === "number" && isNaN(floatValue) === false ) {
            if ( floatValue >= 0 ) {
                return true;
            } else {
                loadErrors_out.push(index + "th event " + serializationKey + " is below zero, found: " + floatValue);
            }
        } else {
            loadErrors_out.push(index + "th event " + serializationKey + " must be a number, found: " + floatValue);
        }
    } else {
        loadErrors_out.push(index + "th event does not have " + serializationKey + " specified.");
    }

    return false;
}

function isValidParsedInt(intValue, index, serializationKey, loadErrors_out) {
    if ( intValue != null && intValue != undefined ) {
        if ( typeof intValue === "number" && isNaN(intValue) === false ) {
            if ( intValue >= 0 ) {
                return true;
            } else {
                loadErrors_out.push(index + "th event " + serializationKey + " is below zero, found: " + intValue);
            }
        } else {
            loadErrors_out.push(index + "th event " + serializationKey + " must be a number, found: " + intValue);
        }
    } else {
        loadErrors_out.push(index + "th event does not have " + serializationKey + " specified.");
    }

    return false;
}

function parseFloatString(stringValue, index, serializationKey, loadErrors_out = []) {
    try {
        var valueAsFloat = parseFloat(stringValue);
        
        if ( isValidParsedFloat(valueAsFloat, index, serializationKey, loadErrors_out) ) {
            return valueAsFloat;
        }
    } catch (e) {
        loadErrors_out.push(index + "th event " + serializationKey + " ("+stringValue+") could not be parsed to float due to error: " + e);
    }

    return null;
}

function parseIntString(stringValue, index, serializationKey, loadErrors_out = []) {
    try {
        var valueAsInt = parseInt(stringValue);
        
        if ( isValidParsedInt(valueAsInt, index, serializationKey, loadErrors_out) ) {
            return valueAsInt;
        }
    } catch (e) {
        loadErrors_out.push(index + "th event " + serializationKey + " ("+stringValue+") could not be parsed to int due to error: " + e);
    }

    return null;
}

function parseLatOrLongString(stringValue, index, latOrLong, loadErrors_out = [], checkLimits = true) {
    try {
        var valueAsFloat = parseFloat(stringValue);
        valueAsFloat = roundNumberToLocationPrecision(valueAsFloat);
        
        if ( isValidLatOrLong(valueAsFloat, index, latOrLong, loadErrors_out, checkLimits) ) {
            return valueAsFloat;
        }
    } catch (e) {
        loadErrors_out.push(index + "th event " + latOrLong + " ("+stringValue+") could not be parsed to float due to error: " + e);
    }

    return null;
}

function isValidLatAndLong(lat, long) {
    return isValidLatOrLong(lat, 0, COORD_LAT, [], true) && isValidLatOrLong(long, 0, COORD_LONG, [], true);
}

function isValidLatOrLong(numericValue, eventIndex, latOrLong, loadErrors_out, checkLimits = true) {
    if ( numericValue != null && numericValue != undefined ) {
        if ( typeof numericValue === "number" && Number.isNaN(numericValue) === false && Number.isFinite(numericValue) === true ) {
            if ( latOrLong == COORD_LAT ) {
                if ( checkLimits == false || (numericValue >= -LAT_LIMIT && numericValue <= LAT_LIMIT) ) {
                    // Checks out.
                    return true;
                } else {
                    loadErrors_out.push(eventIndex + "th event " + latOrLong + " must be between -90 and 90, found: " + numericValue);
                }
            } else if ( latOrLong == COORD_LONG ) {
                if ( checkLimits == false || (numericValue >= -LONG_LIMIT && numericValue <= LONG_LIMIT) ) {
                    // Checks out.
                    return true;
                } else {
                    loadErrors_out.push(eventIndex + "th event " + latOrLong + " must be between -180 and 180, found: " + numericValue);
                }
            } else {
                loadErrors_out.push(eventIndex + "th event " + latOrLong + " is unknown, found: " + latOrLong);
            }
        } else {
            loadErrors_out.push(eventIndex + "th event " + latOrLong + " must be a number, found: " + numericValue);
        }
    } else {
        loadErrors_out.push(eventIndex + "th event does not have " + latOrLong + " specified.");
    }

    return false;
}

function minifyXDateOrTDateArray(eventScope, xDatesOrTDates) {
    for ( var k = 0; k < xDatesOrTDates.length; k++ ) {
        var kthXDate = xDatesOrTDates[k];

        if ( eventScope == EVENT_SCOPE__DAYS ) {
            var exceptions = ["date"];

            if ( kthXDate.enabled === false ) {
                exceptions.push("enabled");
            }

            removeAllDictKeysExcept(kthXDate, exceptions);
        } else if ( eventScope == EVENT_SCOPE__HH_MM ) {
            var exceptions = ["date", "time"];

            if ( kthXDate.enabled === false ) {
                exceptions.push("enabled");
            }

            removeAllDictKeysExcept(kthXDate, exceptions);
        }
    }
}

function sanitizeIsoEventsForSaveOperation(isoEvents, minify = false) {
    if ( Array.isArray(isoEvents) ) {
        isoEvents = deepClone(isoEvents);

        var defaultOperations = minify === true ? cloneDefaultOperationsForAppVersionGte10() : [];

        for ( var i = 0; i < isoEvents.length; i++ ) {
            var ithEventToSave = isoEvents[i];

            // TODO: Perhaps a White List of fields to keep, rather than deleting what shouldn't be there.
            // UPDATE: Hmm maybe not, since people may wish to save metadata along with an Event.
            delete ithEventToSave.effective_operations;
            delete ithEventToSave.checked_for_swap_target;
            delete ithEventToSave.checked_for_swap_source;

            ensureValidEventName(ithEventToSave);
            ensureValidEventNotes(ithEventToSave);
            ensureValidEventDayScopeStartTime(ithEventToSave);
            ensureValidEventScope(ithEventToSave);

            var ithEventScope = ithEventToSave.scope;

            var validLat = isValidLatOrLong(ithEventToSave.lat, i, COORD_LAT, []);
            var validLong = isValidLatOrLong(ithEventToSave.long, i, COORD_LONG, []);
            
            ithEventToSave.lat = validLat ? ithEventToSave.lat : DEFAULT_LAT;
            ithEventToSave.long = validLong ? ithEventToSave.long : DEFAULT_LONG;

            if ( minify === true ) {
                minifyXDateOrTDateArray(ithEventScope, ithEventToSave.x_dates);
                minifyXDateOrTDateArray(ithEventScope, ithEventToSave.t_dates);
            }

            if ( minify === true ) {

                for ( var k = 0; k < ALL_SERIALIZED_FIELDS.length; k++ ) {
                    var kthField = ALL_SERIALIZED_FIELDS[k];
                    
                    if ( ithEventToSave[kthField.serializationKey] == kthField.enabledByDefault ) {
                        delete ithEventToSave[kthField.serializationKey]
                    }

                    if ( kthField.numericDefault != null && kthField.numericDefault != undefined ) {
                        var currentValue = parseFloatElseNeg1(ithEventToSave[kthField.serializationKeyForValue]);

                        if ( kthField.numericDefault === currentValue ) {
                            delete ithEventToSave[kthField.serializationKeyForValue]
                        }
                    }
                }

                // Delete these even if they have valid values, since they only represent a random scroll/zoom
                // that's not critical to preserve outside of basic UX expectations, e.g. when switching between events.
                delete ithEventToSave.chart_x_min;
                delete ithEventToSave.chart_x_max;
                delete ithEventToSave.chart_y_min;
                delete ithEventToSave.chart_y_max;

                if ( ithEventToSave.x_dates && ithEventToSave.x_dates.length == 0 ) {
                    delete ithEventToSave.x_dates;
                }

                if ( ithEventToSave.day_scope_start_time_in_millis === DEFAULT_DAY_SCOPE_START_TIME_MILLIS ) {
                    delete ithEventToSave.day_scope_start_time_in_millis;
                }

                if ( ithEventToSave.t_dates && ithEventToSave.t_dates.length == 0 ) {
                    delete ithEventToSave.t_dates;
                }

                if ( ithEventToSave.name ) {
                    // all good, keep the name.
                } else {
                    delete ithEventToSave.name;
                }

                if ( ithEventToSave.notes ) {
                    // all good, keep the name.
                } else {
                    delete ithEventToSave.notes;
                }

                if ( ithEventToSave.day_scope_start_time_in_millis == DEFAULT_DAY_SCOPE_START_TIME_MILLIS ) {
                    delete ithEventToSave.notes;
                }

                //TODO: May need to get rid of this regardless as it never came to anything.
                delete ithEventToSave.type;

                if ( ithEventScope == EVENT_SCOPE__DAYS ) {
                    delete ithEventToSave.location_enabled;
                    delete ithEventToSave.lat;
                    delete ithEventToSave.long;
                }

                if ( ithEventScope == DEFAULT_EVENT_SCOPE ) {
                    delete ithEventToSave.scope;
                }

                if ( ithEventToSave.scoring_system == DEFAULT_SCORING_SYSTEM ) {
                    delete ithEventToSave.scoring_system;
                }

                var operationsAreSameAsDefault = true;

                if ( ithEventToSave.operations.length == defaultOperations.length ) {
                    for ( var k = 0; k < ithEventToSave.operations.length; k++ ) {
                        var kthOperation = ithEventToSave.operations[k];
                        var kthDefaultOperation = defaultOperations[k];

                        var kthOperationIdenticalToDefaults = false;

                        if ( kthOperation.equation == kthDefaultOperation.equation ) {
                            if ( kthOperation.weight == kthDefaultOperation.weight ) {
                                if ( kthOperation.enabled == kthDefaultOperation.enabled ) {
                                    kthOperationIdenticalToDefaults = true;
                                }
                            }
                        }

                        if ( kthOperationIdenticalToDefaults == false ) {
                            operationsAreSameAsDefault = false;
                            break;
                        }
                    }
                } else {
                    operationsAreSameAsDefault = false;
                }

                if ( operationsAreSameAsDefault === true ) {
                    delete ithEventToSave.operations;
                }
            }
        }

        return isoEvents;

    } else {
        return [];
    }
}

function parseSerializedFieldsForLoadedIsoEvent(isoEvent) {
    for ( var j = 0; j < ALL_SERIALIZED_FIELDS.length; j++ ) {
        var jthField = ALL_SERIALIZED_FIELDS[j];

        if ( isoEvent[jthField.serializationKey] === true || isoEvent[jthField.serializationKey] === false ) {
            // Nothing to do.
        } else {
            isoEvent[jthField.serializationKey] = jthField.enabledByDefault;
        }

        if ( jthField.numericDefault ) {
            var currentValue = parseFloatElseNeg1(isoEvent[jthField.serializationKeyForValue]);
            isoEvent[jthField.serializationKeyForValue] = currentValue >= 0 ? currentValue : jthField.numericDefault;
        }
    }
}

function parseOperationsForLoadedIsoEvent(isoEvent, importErrors_out) {
    if ( isoEvent.operations ) {
        if ( Array.isArray(isoEvent.operations) ) {
            if ( isoEvent.operations.length >= MINIMUM_OPERATIONS_REQUIRED ) {
                // For now be pretty permissive as far as what's allowed in the operations array.
                // Errors from running the actual operations should be enough to indicate issues.
            } else {
                if ( isFileInputValidationStrict() ) {
                    importErrors_out.push("Found less than the minimum required number of operations from the input file.");
                } else {
                    console.warn("Found less than the minimum required number of operations from the input file.");
                }
            }
        } else {
            if ( isFileInputValidationStrict() ) {
                importErrors_out.push("The operations field must be an array of strings.");
            } else {
                console.warn("Found non-array for operations field, Setting Operations to default.")
                isoEvent.operations = cloneDefaultOperationsForAppVersionGte10();
            }
        }
    } else {
        isoEvent.operations = cloneDefaultOperationsForAppVersionGte10();
        // isoEvent.operations = cloneDefaultOperationsForAppVersionLte7();
    }
}

function parseScoringSystemForLoadedIsoEvent(isoEvent, appVersionForImportAsInt, importErrors_out) {
    if ( isoEvent.scoring_system  ) {
        if ( SCORING_SYSTEMS.includes(isoEvent.scoring_system) ) {
            // All good
        } else {
            if ( isFileInputValidationStrict() ) {
                importErrors_out.push("Unrecognized scoring system "+isoEvent.scoring_system+" for event: " + isoEvent.name);
            } else {
                console.warn("Unrecognized scoring system "+isoEvent.scoring_system+" for event: " + isoEvent.name);
                if ( appVersionForImportAsInt >= 8 ) {
                    isoEvent.scoring_system = SCORING_SYSTEM__GTE_V8;
                } else {
                    // Based on PR feedback, default to newest scoring system, regardless.
                    isoEvent.scoring_system = SCORING_SYSTEM__GTE_V8;
                    // isoEvent.scoring_system = SCORING_SYSTEM__LTE_V7;
                }
            }
        }
    } else {
        if ( appVersionForImportAsInt >= 8 ) {
            isoEvent.scoring_system = SCORING_SYSTEM__GTE_V8;
        } else {
            // Based on PR feedback, default to newest scoring system, regardless.
            isoEvent.scoring_system = SCORING_SYSTEM__GTE_V8;
            // isoEvent.scoring_system = SCORING_SYSTEM__LTE_V7;
        }
    }
}

function isFileInputValidationOriginalOrStrict() {
    return appState.fileInputValidationMode == FILE_INPUT_VALIDATION_MODE__ORIGINAL || appState.fileInputValidationMode == FILE_INPUT_VALIDATION_MODE__STRICT;
}

function isFileInputValidationStrict() {
    return appState.fileInputValidationMode == FILE_INPUT_VALIDATION_MODE__STRICT;
}

function isFileInputValidationLoose() {
    return appState.fileInputValidationMode == FILE_INPUT_VALIDATION_MODE__LOOSE;
}

function isNullOrUndefinedOrEmptyString(value) {
    return value === null || value === undefined || value === "";
}

function parseLatLongForLoadedIsoEvent(isoEvent, i, importErrors_out) {

    var isHHMM = isoEvent.scope == EVENT_SCOPE__HH_MM;

    // The lat/long is "valid" if it's missing completely for non-HHMM scope, regardless of file validation mode.
    var validLat = isNullOrUndefinedOrEmptyString(isoEvent.lat) && isHHMM === false ? true : isValidLatOrLong(isoEvent.lat, i, COORD_LAT, importErrors_out);
    var validLong = isNullOrUndefinedOrEmptyString(isoEvent.long) && isHHMM === false  ? true : isValidLatOrLong(isoEvent.long, i, COORD_LONG, importErrors_out);

    var shouldContinue = false;

    if ( validLat && validLong ) {
        if ( isoEvent.scope != EVENT_SCOPE__HH_MM ) {
            // Should never really get here for normal use cases, but just in case,
            // force location disabled if scope isn't relevant.
            toggleIsoEventLocationEnabled(isoEvent, false);
        } else {
            // The opposite of above. `isoEvent.location_enabled` used to mean something more,
            // but now, if HH:MM scope is set, location must also be a factor. It can't be
            // selectively turned on and off directly.
            isoEvent.location_enabled = true; // force to true just in case.
        }


        if ( isNullOrUndefinedOrEmptyString(isoEvent.lat) ) {
            isoEvent.lat = DEFAULT_LAT;
        }

        if ( isNullOrUndefinedOrEmptyString(isoEvent.long) ) {
            isoEvent.long = DEFAULT_LONG;
        }

        shouldContinue = true;
    } else {
        if ( isFileInputValidationOriginalOrStrict() ) {
            importErrors_out.push(i + "th event has invalid lat and/or long: " + readableLatLong(isoEvent.lat, isoEvent.long));

            shouldContinue = false;
        } else {
            if ( validLat == false ) {
                console.warn("Invalid latitude found for event: " + isoEvent.lat);

                isoEvent.lat = DEFAULT_LAT;
            }

            if ( validLong == false ) {
                console.warn("Invalid longitude found for event: " + isoEvent.long);

                isoEvent.long = DEFAULT_LONG;
            }

            shouldContinue = true;
        }
    }
    
    return shouldContinue;
}

function ensureValidEventName(isoEvent) {
    if ( isoEvent.name ) {
        // All good.
    } else {
        // Just make sure `null` or undefined or something isn't saved/loaded
        isoEvent.name = "";
    }
}

function ensureValidEventNotes(isoEvent) {
    if ( isoEvent.notes ) {
        // All good.
    } else {
        // Just make sure `null` or undefined or something isn't saved/loaded
        isoEvent.notes = "";
    }
}

function ensureValidEventDayScopeStartTime(isoEvent) {
    if ( isoEvent.day_scope_start_time_in_millis ) {
        if ( isNonNegIntOrStringThereof(isoEvent.day_scope_start_time_in_millis) ) {
            if ( isoEvent.day_scope_start_time_in_millis >= MILLIS_PER_DAY ) {
                isoEvent.day_scope_start_time_in_millis = MILLIS_PER_DAY - MILLIS_PER_MINUTE;
            } else {
                // All good.
            }
        } else {
            isoEvent.day_scope_start_time_in_millis = DEFAULT_DAY_SCOPE_START_TIME_MILLIS;
        }
    } else {
        isoEvent.day_scope_start_time_in_millis = DEFAULT_DAY_SCOPE_START_TIME_MILLIS;
    }
}

function ensureValidEventType(isoEvent, importErrors_out = []) {
    if ( isoEvent.type ) {
        if ( EVENT_TYPES.includes(isoEvent.type) ) {
            // All good.
        } else {
            if ( isFileInputValidationStrict() ) {
                importErrors_out.push("Unrecognized event type: " + isoEvent.type);
            } else {
                console.warn(isoEvent.type + " was not recognized, changing to " + DEFAULT_EVENT_TYPE);
                
                isoEvent.type = DEFAULT_EVENT_TYPE;
            }
        }
    } else {
        // If type is not specified at all, just set to the default, since this feature never got traction.
        isoEvent.type = DEFAULT_EVENT_TYPE;
    }
}

function ensureValidEventScope(isoEvent, importErrors_out = []) {
    if ( isoEvent.scope ) {
        if ( EVENT_SCOPES.includes(isoEvent.scope) ) {
            // All good.
        } else {
            if ( isFileInputValidationStrict() ) {
                importErrors_out.push("Unrecognized event scope: " + isoEvent.scope);
            } else {
                console.warn(isoEvent.scope + " was not recognized, changing to " + DEFAULT_EVENT_SCOPE);

                isoEvent.scope = DEFAULT_EVENT_SCOPE;
            }
        }
    } else {
        // Assume most-specific scope.
        isoEvent.scope = DEFAULT_EVENT_SCOPE;
    }
}

function smoothOutXDatesForLoadedEvent(ithEventToLoad) {
    var refreshViewForXDateChanges = false;
    var flushToDiskForXDateChanges = false;

    for ( var k = 0; k < ithEventToLoad.x_dates.length; k++ ) {
        var kthErrors = [];
        var kthXDate = ithEventToLoad.x_dates[k];

        validateNewWouldBeLoadDate(ithEventToLoad.scope, kthXDate, ithEventToLoad.lat, ithEventToLoad.long, kthErrors);

        if ( kthErrors.length > 0 ) {
            if ( isFlagEnabled(FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD) ) {
                console.warn("Found invalid X-Date " + k + " " + kthXDate + " for " + ithEventToLoad.name + ", replacing with new X-Date.");
            } else {
                console.warn("Found invalid X-Date " + k + " " + kthXDate + " for " + ithEventToLoad.name + ", removing from x_dates array.");
            }
            
            
            var insertIndex = k == ithEventToLoad.x_dates.length-1 ? -1 : k;

            ithEventToLoad.x_dates.splice(k, 1);

            // NOTE: Used to always add an X-Date here. New UI can have zero X-Dates.
            if ( isFlagEnabled(FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD) ) {
                addXDate(ithEventToLoad, insertIndex, refreshViewForXDateChanges, flushToDiskForXDateChanges);
            } else {
                // do nothing.
            }
        } else {
            // carry on. 
        }
    }

    if ( isFlagEnabled(FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD) ) {
        if ( ithEventToLoad.x_dates.length == 0 ) {
            addInitialDatesToIsoEvent(ithEventToLoad);
        } else {
            while( ithEventToLoad.x_dates.length < MINIMUM_NUMBER_OF_X_DATES ) {
                var insertIndex = -1; // means push to end.
                addXDate(ithEventToLoad, insertIndex, refreshViewForXDateChanges, flushToDiskForXDateChanges);
            }
        }
    } else {
        // do nothing.
    }
}

function smoothOutTDatesForLoadedEvent(ithEventToLoad) {

    for ( var k = ithEventToLoad.t_dates.length-1; k >= 0; k-- ) {
        var kthErrors = [];
        var kthTDate = ithEventToLoad.t_dates[k];

        validateNewWouldBeLoadDate(ithEventToLoad.scope, kthTDate, ithEventToLoad.lat, ithEventToLoad.long, kthErrors);

        if ( kthErrors.length > 0 ) {
            console.warn("Found invalid T-Date " + k + " for " + ithEventToLoad.name + ", removing from array.");
            ithEventToLoad.t_dates.splice(k, 1);
        } else {
            // carry on. 
        }
    }
}

function validatePotentialIsoEventImportAssumingValidJsonSyntax(importDict, importErrors_out) {
    
    var newIsoEventArray = Array.isArray(importDict) ? importDict : importDict[SERIALIZED_FIELD__ISO_EVENTS];

    var appVersionForImportString = importDict.app_version;
    var appVersionForImportAsInt = -1;

    if ( appVersionForImportString ) {
        appVersionForImportAsInt = parseInt(appVersionForImportString);

        if ( appVersionForImportAsInt <= 0 ) {
            appVersionForImportAsInt = parseInt(APP_VERSION);
        }
    } else {
        appVersionForImportAsInt = parseInt(APP_VERSION);
    }

    var createNewIsoEventArray = false;
    
    if ( newIsoEventArray ) {
        if ( Array.isArray(newIsoEventArray) ) {
            if ( newIsoEventArray.length >= 1 ) {
                for ( var i = 0; i < newIsoEventArray.length; i++ ) {
                    var ithEventToLoad = newIsoEventArray[i];

                    ensureValidEventName(ithEventToLoad);
                    ensureValidEventNotes(ithEventToLoad);
                    ensureValidEventDayScopeStartTime(ithEventToLoad);
                    ensureValidEventScope(ithEventToLoad, importErrors_out);
                    ensureValidEventType(ithEventToLoad, importErrors_out);
                    parseSerializedFieldsForLoadedIsoEvent(ithEventToLoad);
                    parseOperationsForLoadedIsoEvent(ithEventToLoad, importErrors_out);
                    parseScoringSystemForLoadedIsoEvent(ithEventToLoad, appVersionForImportAsInt, importErrors_out);

                    var importErrorsJustForLatLong_out = [];
                    var keepGoingAfterParsingLatLong = parseLatLongForLoadedIsoEvent(ithEventToLoad, i, importErrorsJustForLatLong_out);

                    if ( keepGoingAfterParsingLatLong === false ) {
                        importErrors_out.push(...importErrorsJustForLatLong_out);
                        continue;
                    }

                    if (ithEventToLoad.x_dates && Array.isArray(ithEventToLoad.x_dates) && ithEventToLoad.x_dates.length >= MINIMUM_NUMBER_OF_X_DATES ) {
                        var importErrorsJustForXDates_out = [];

                        validateNewWouldBeLoadDates(ithEventToLoad.scope, ithEventToLoad.x_dates, ithEventToLoad.lat, ithEventToLoad.long, importErrorsJustForXDates_out);
                        
                        if ( importErrorsJustForXDates_out.length > 0 && isFileInputValidationLoose() ) {
                            smoothOutXDatesForLoadedEvent(ithEventToLoad);
                        } else {
                            importErrors_out.push(...importErrorsJustForXDates_out);
                        }
                    } else {
                        if ( isFileInputValidationOriginalOrStrict() ) {
                            importErrors_out.push(i + "th event must have two or more x_dates defined.");
                        } else {
                            // console.warn("Input event " + ithEventToLoad.name + " did not have at least 2 X-Dates, auto-populating.");
                            ithEventToLoad.x_dates = ithEventToLoad.x_dates && Array.isArray(ithEventToLoad.x_dates) ? ithEventToLoad.x_dates : [];

                            smoothOutXDatesForLoadedEvent(ithEventToLoad);
                        }
                    }

                    if ( ithEventToLoad.t_dates && Array.isArray(ithEventToLoad.t_dates) ) {
                        var importErrorsJustForTDates_out = [];

                        validateNewWouldBeLoadDates(ithEventToLoad.scope, ithEventToLoad.t_dates, ithEventToLoad.lat, ithEventToLoad.long, importErrorsJustForTDates_out);

                        if ( importErrorsJustForTDates_out.length > 0 && isFileInputValidationLoose() ) {
                            smoothOutTDatesForLoadedEvent(ithEventToLoad);
                        } else {
                            importErrors_out.push(...importErrorsJustForTDates_out);
                        }
                    } else {
                        ithEventToLoad.t_dates = [];
                    }
                }
            } else {
                if ( isFileInputValidationOriginalOrStrict() ) {
                    importErrors_out.push("Loaded iso event array must have at least one element.");
                } else {
                    console.warn("Did not find any Iso-Events in input file, auto-adding one Iso-Event.");
                    createNewIsoEventArray = true;
                }
            }
        } else {
            if ( isFileInputValidationOriginalOrStrict() ) {
                importErrors_out.push("Parsed object is not an array.");
            } else {
                console.warn("Could not find valid Iso-Event array in input file, auto-creating one.");
                createNewIsoEventArray = true;
            }
        }
    } else {
        if ( isFileInputValidationOriginalOrStrict() ) {
            importErrors_out.push("Missing fields '"+SERIALIZED_FIELD__ISO_EVENTS+"' in load blob.");
        } else {
            console.warn("Could not find Iso-Event array in input file at all, auto-creating one.");
            createNewIsoEventArray = true;
        }
        
    }

    if ( createNewIsoEventArray === true ) {
        var startingLat = 0;
        var startingLong = 0;
        var locationEnabled = false;
        var newIsoEvent = createNewIsoEvent("Event 1", DEFAULT_EVENT_SCOPE, startingLat, startingLong, locationEnabled);

        newIsoEventArray = [newIsoEvent];
    }

    return newIsoEventArray;
}

function validatePotentialDiskLoadOrImport(jsonString, globalOptionsOnly = false) {
    var newIsoEventArray = null;
    var globalOptions = null;
    var importErrors = [];

    if ( jsonString ) {
        try {
            var importDict = JSON.parse(jsonString);
    
            if ( importDict ) {
                if ( globalOptionsOnly === false ) {
                    newIsoEventArray = validatePotentialIsoEventImportAssumingValidJsonSyntax(importDict, importErrors);
                }

                // For now can be null, missing or invalid. This is purposely much more forgiving than iso event load/import.
                globalOptions = importDict[SERIALIZED_FIELD__GLOBAL_OPTIONS];
            } else {
                importErrors.push("Null or undefined object after parsing string.");
            }
        } catch(e) {
            importErrors.push("Could not parse JSON due to error: " + e);
        }
    } else {
        importErrors.push("Saved JSON blob was a falsey string.");
    }

    if ( importErrors.length == 0 && newIsoEventArray == null ) {
        importErrors.push("Blob import made it past the gauntlet with zero errors, yet a null event array.");
    } else if ( importErrors.length > 0 && newIsoEventArray != null ) {
        importErrors.push("Blob import had one or more errors and also a non-null event array.");

        newIsoEventArray = null;
    }

    return {
        result: newIsoEventArray,
        errors: importErrors,
        global_options: globalOptions
    };
}

function selfCheckMsrfOnStartup(errors_out) {

    for ( var i = 0; i < MSRF_FILTER__FINAL.length; i++ ) {
        var ithFilterNumber = MSRF_FILTER__FINAL[i];
        var duplicatesForIthNumber = 0;

        if ( isNonNegIntOrStringThereof(ithFilterNumber) ) {
            if ( parseIntElseNeg1(ithFilterNumber) > 0 ) {
                // all good, continue.
            } else {
                var errorMessage = "Filter number " + ithFilterNumber + " is not a positive integer.";
                errors_out.push(errorMessage);
            }
        } else {
            var filterMatch = getMsrfMatch(ithFilterNumber);
            if ( filterMatch != null && filterMatch.msrf_filter == MSRF_FILTER__VORTEX ) {
                // all good, continue;
            } else {
                var errorMessage = "Filter number " + ithFilterNumber + " is not an integer nor was it a vortex number.";
                errors_out.push(errorMessage);
            }
        }

        for ( var k = 0; k < MSRF_FILTER__FINAL.length; k++ ) {
            if ( i == k ) {
                continue;
            }

            var kthFilterNumber = MSRF_FILTER__FINAL[k];

            // UPDATE: Now no longer flooring.
            // if ( Math.floor(kthFilterNumber) == Math.floor(ithFilterNumber) ) {
            //     duplicatesForIthNumber++;
            // }
            
            if ( kthFilterNumber == ithFilterNumber ) {
                duplicatesForIthNumber++;
            }
        }

        if ( duplicatesForIthNumber > 0 ) {
            var errorMessage = "Filter number " + ithFilterNumber + " was found two or more times.";
            if ( errors_out.includes(errorMessage) == false ) {
                errors_out.push("Filter number " + ithFilterNumber + " was found two or more times.");
            }
        }
    }
}

function isValidNativeDate(nativeDate) {
    if ( nativeDate != null && Object.prototype.toString.call(nativeDate) === "[object Date]") {
        // it is a date
        if (isNaN(nativeDate)) { // d.getTime() or d.valueOf() will also work
            // date object is not valid
            return false;
        } else {
            // date object is valid
            return true;
        }
    } else {
        // not a date object
        return false;
    }
}

function validateXDateCalendarDate(xDateCalendarDate, errors_out = [], delimiter = DATE_DELIMITER) {
    var calendarDateSplit = xDateCalendarDate.split(delimiter);

    if ( calendarDateSplit.length == 3 ) {
        for ( var i = 0; i < calendarDateSplit.length; i++ ) {
            var ithCalendarComponent = calendarDateSplit[i];

            if ( isNonNegIntOrStringThereof(ithCalendarComponent) ) {

                var parsedCalendarComponent = parseIntElseNeg1(ithCalendarComponent);

                var isValidIntegerForComponent = false;

                if ( i == 2 ) {
                    // Validate years. Eventually might allow negative years.
                    isValidIntegerForComponent = parsedCalendarComponent >= 0;

                    if ( parsedCalendarComponent > MAX_CALENDAR_YEAR ) {
                        calendarDateSplit[2] = ""+MAX_CALENDAR_YEAR; // sanity check, keep year 4 digits to keep things simple.
                    }
                } else {
                    isValidIntegerForComponent = parsedCalendarComponent > 0;
                }

                if ( isValidIntegerForComponent === true ) {
                    // Happy path.
                } else {
                    errors_out.push(xDateCalendarDate + " must be composed of positive integers. Couldn't parse to positive int: " + ithCalendarComponent);
                    return null;
                }
            } else {
                errors_out.push(xDateCalendarDate + " must be composed of positive integers, problem with: " + ithCalendarComponent);
                return null;
            }
        }

        var yearComponent = calendarDateSplit[2];
        var monthComponent = calendarDateSplit[0];
        var dayComponent = calendarDateSplit[1];

        if ( yearComponent.length <= 4 && monthComponent.length <= 2 && dayComponent.length <= 2 ) {
            try {
                return {
                    year: parseInt(yearComponent),
                    month: parseInt(monthComponent),
                    day: parseInt(dayComponent),

                    year_orig: yearComponent,
                    month_orig: monthComponent,
                    day_orig: dayComponent,
                };
            } catch(e) {
                errors_out.push(xDateCalendarDate + " could not be parsed due to error: " + e);
                return null;
            }
        } else {
            errors_out.push(xDateCalendarDate + " must have 4-digit year, found: " + yearComponent);
            return null;
        }
    } else {
        errors_out.push(xDateCalendarDate + " must be of format " + X_DATE_CAL_DISPLAY_FORMAT + ".");
        return null;
    }
}

function validateXDateTime(xDateTime, errors_out = []) {
    var timestampRawSplit = xDateTime.split(":");

    if ( timestampRawSplit.length == 2) {
        if ( isNonNegIntOrStringThereof(timestampRawSplit[0]) && isNonNegIntOrStringThereof(timestampRawSplit[1]) ) {

            var hours = parseInt(timestampRawSplit[0]);
            var minutes = parseInt(timestampRawSplit[1]);

            if ( hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ) {
                return {
                    hours: hours,
                    minutes: minutes
                }
            } else {
                errors_out.push(xDateTime + " has out of bounds hours and/or minutes.");
                return null;
            }
        } else {
            errors_out.push(xDateTime + " has non-integer hours or minutes in string.");
            return null;
        }
    } else {
        errors_out.push(xDateTime + " must be of format "+X_DATE_TIME_DISPLAY_FORMAT+", e.g. '10:00 AM'.");
        return null;
    }
}