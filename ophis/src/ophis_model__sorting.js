

function filterZDates(isoEvent, zStructsDict, nativeDateUtcCutoff = null) {
    var toReturn = [];
    var xDateArray = isoEvent.x_dates;

    var lastXDate = null;

    for ( var k = xDateArray.length-1; k >= 0; k-- ) {
        var kthXDate = xDateArray[k];
        if ( kthXDate.enabled === true ) {
            lastXDate = kthXDate;
            break;
        }
    }

    var lastXDateAsNative = xDateToNativeDate(isoEvent.scope, lastXDate, isoEvent.lat, isoEvent.long);

    var nativeDateUtcCutoffMillis = 0;

    if ( nativeDateUtcCutoff != null ) {
        if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
            nativeDateUtcCutoffMillis = nativeDateToUtcMillis(nativeDateUtcCutoff);
        } else {
            // This was the "old way" from after HH:MM was removed. Then HH:MM was added back again.
            // Using the old way for day-based scope just in case, though it can probably be simplified.
            var nativeDateUtcCutoffAsXDate = nativeDateToXDate(nativeDateUtcCutoff);
            var nativeDateUtcCutoffBackToNativeDate = xDateToNativeDate(isoEvent.scope, nativeDateUtcCutoffAsXDate);

            nativeDateUtcCutoffMillis = nativeDateToUtcMillis(nativeDateUtcCutoffBackToNativeDate);
        }
    }

    var tDatesInMillis = [];
    
    if ( isoEvent.t_dates && Array.isArray(isoEvent.t_dates) && isoEvent.t_dates.length > 0 ) {
        for ( var i = 0; i < isoEvent.t_dates.length; i++ ) {
            var ithTDate = isoEvent.t_dates[i];

            if ( ithTDate.enabled === true ) {
                var ithTDate_native = xDateToNativeDate(isoEvent.scope, ithTDate);

                if ( ithTDate_native ) {
                    var ithTDate_millis = nativeDateToUtcMillis(ithTDate_native);
                    tDatesInMillis.push(ithTDate_millis);
                } else {
                    console.warn("Could not convert t_date to native: " + JSON.stringify(ithTDate));
                }
            }
        }
    }
    
    var lastXDatePriorSunset = isFlagEnabled(FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET) ? getSunsetNativeUtcDateBefore_withCache(lastXDateAsNative, isoEvent.lat, isoEvent.long) : lastXDateAsNative;
    var lastXDatePriorSunsetInMillis = nativeDateToUtcMillis(lastXDatePriorSunset);

    // Filter out certain Z-Dates
    for (var ithSunsetBeforeMillisString in zStructsDict) {
        // check if the property/key is defined in the object itself, not in parent
        if (zStructsDict.hasOwnProperty(ithSunsetBeforeMillisString)) {
            var tagsDictForIthZDate = zStructsDict[ithSunsetBeforeMillisString];

            var nativeUtcDateToUseForZ = tagsDictForIthZDate.z_date_native_start;

            var nativeUtcDateToUseForZInMillis = nativeDateToUtcMillis(nativeUtcDateToUseForZ);

            var nativeUtcDateZInMillis_start = tagsDictForIthZDate.z_date_native_start;
            var nativeUtcDateZInMillis_end = tagsDictForIthZDate.z_date_native_end;

            var includeInOutput = true;

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_LAST_X_DATE") === true ) {
                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    if ( nativeUtcDateZInMillis_end <= lastXDatePriorSunsetInMillis ) {
                        includeInOutput = false;
                    }
                } else {
                    if ( nativeUtcDateToUseForZInMillis < lastXDatePriorSunsetInMillis ) {
                        includeInOutput = false;
                    }
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_LAST_X_DATE") === true ) {
                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    if ( lastXDatePriorSunsetInMillis >= nativeUtcDateZInMillis_start && lastXDatePriorSunsetInMillis < nativeUtcDateZInMillis_end ) {
                        includeInOutput = false;
                    }
                } else {
                    if ( nativeUtcDateToUseForZInMillis == lastXDatePriorSunsetInMillis ) {
                        includeInOutput = false;
                    }
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_CURRENT_DATE") === true ) {
                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    if ( nativeUtcDateZInMillis_end <= nativeDateUtcCutoffMillis ) {
                        includeInOutput = false;
                    }
                } else {
                    if ( nativeUtcDateToUseForZInMillis < nativeDateUtcCutoffMillis ) {
                        includeInOutput = false;
                    }
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_CURRENT_DATE") === true ) {
                if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                    if ( nativeDateUtcCutoffMillis >= nativeUtcDateZInMillis_start && nativeDateUtcCutoffMillis < nativeUtcDateZInMillis_end ) {
                        includeInOutput = false;
                    }
                } else {
                    if ( nativeUtcDateToUseForZInMillis == nativeDateUtcCutoffMillis ) {
                        includeInOutput = false;
                    }
                }
            }

            if ( tDatesInMillis.length > 0 ) {
                var overlappingAtLeastOneTDate = false;

                for ( var i = 0; i < tDatesInMillis.length; i++ ) {
                    var ithTDateInMillis = tDatesInMillis[i];

                    if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                        if ( ithTDateInMillis >= nativeUtcDateZInMillis_start && ithTDateInMillis < nativeUtcDateZInMillis_end ) {
                            overlappingAtLeastOneTDate = true;
                            break;
                        }
                    } else {
                        if ( nativeUtcDateToUseForZInMillis == ithTDateInMillis ) {
                            overlappingAtLeastOneTDate = true;
                            break;
                        }
                    }
                }

                if ( overlappingAtLeastOneTDate === false ) {
                    includeInOutput = false;
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE") === true ) {
                var minScore = getIsoEventFilterNumbericValue(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE");
                
                if ( tagsDictForIthZDate.score < minScore ) {
                    includeInOutput = false;
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT") === true ) {
                var minHitCount = getIsoEventFilterNumbericValue(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT");
                
                if ( tagsDictForIthZDate.hit_count < minHitCount ) {
                    includeInOutput = false;
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS") === true ) {
                var maxDays = getIsoEventFilterNumbericValue(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS");
                var millisDelta = nativeUtcDateToUseForZInMillis - lastXDatePriorSunsetInMillis;
                var dayDelta = millisDelta / MILLIS_PER_DAY
                var dayDeltaRounded = Math.round(dayDelta);

                if ( dayDelta != dayDeltaRounded ) {
                    // Seems to legitmately spam, so not sure it's worth keeping this here.
                    // printWarning("dayDelta of " + dayDelta + " didn't match dayDeltaRounded of " + dayDeltaRounded);
                }

                if ( dayDeltaRounded > maxDays ) {
                    includeInOutput = false;
                }
            }

            if ( isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__ISO_EVENT_FILTER_MSRF_MATCH") === true ) {
                if ( tagsDictForIthZDate.msrf_match_structs.length == 0 ) {
                    includeInOutput = false;
                }
            }

            if ( includeInOutput === true ) {
                toReturn.push(ithSunsetBeforeMillisString);
            }




            // // Only include in the sorted list if it has a score.
            // if ( tagsDictForIthZDate.score > 0 ) {
                

            //     // Only include in the sorted list if it's past the latest X-Date.
            //     if (  >  ) {

            //         // Only include in sorted list if it's past the cutoff date, if any.
            //         if ( nativeDateUtcCutoff == null || nativeDateToUtcMillis(nativeUtcDateToUseForZ) > nativeDateToUtcMillis(nativeDateUtcCutoff) )
            //         toReturn.push(ithSunsetBeforeMillisString);
            //     }
            // }
        }
    }

    return toReturn;
}

function sortZDates(filteredZDates, zStructsDict, sortType, scoringSystem) {
    sortType = sortType ? sortType : DEFAULT_Z_DATE_SORT_TYPE;

    var toReturn = Array.from(filteredZDates);

    toReturn.sort(function(a, b) {
        var sortValueA = 0;
        var sortValueB = 0;
        
        var zStructsDict_a = zStructsDict[a];
        var zStructsDict_b = zStructsDict[b];
        var score_a = zStructsDict_a.score;
        var score_b = zStructsDict_b.score;
        var hitCount_a = zStructsDict_a.hit_count;
        var hitCount_b = zStructsDict_b.hit_count;
        var msrfScore_a = sumUpMsrfMatchSubscore(zStructsDict_a.msrf_match_structs, scoringSystem);
        var msrfScore_b = sumUpMsrfMatchSubscore(zStructsDict_b.msrf_match_structs, scoringSystem);

        var msrfNumberSum_a = sumUpMsrfNumbersThemselves(zStructsDict_a.msrf_match_structs);
        var msrfNumberSum_b = sumUpMsrfNumbersThemselves(zStructsDict_b.msrf_match_structs);

        var operationCount_a = zStructsDict_a.operation_hit_count;
        var operationCount_b = zStructsDict_b.operation_hit_count;
        var operationScore_a = zStructsDict_a.operation_score;
        var operationScore_b = zStructsDict_b.operation_score;

        var sortOrder = SORT_ORDER__ASCENDING;

        var actualSortTypeToUseForThisPair = sortType;

        if ( sortType == Z_DATE_SORT_TYPE__SCORE && score_a == score_b ) {
            if ( hitCount_a == hitCount_b ) {
                actualSortTypeToUseForThisPair = Z_DATE_SORT_TYPE__DATE;
            } else {
                actualSortTypeToUseForThisPair = Z_DATE_SORT_TYPE__HIT_COUNT;
            }
        } else if ( sortType == Z_DATE_SORT_TYPE__MSRF && msrfScore_a == msrfScore_b && msrfNumberSum_a == msrfNumberSum_b ) {
            actualSortTypeToUseForThisPair = Z_DATE_SORT_TYPE__DATE;
        } else if ( sortType == Z_DATE_SORT_TYPE__OPERATIONS && operationScore_a == operationScore_b && operationCount_a == operationCount_b ) {
            actualSortTypeToUseForThisPair = Z_DATE_SORT_TYPE__DATE;
        } else if ( sortType == Z_DATE_SORT_TYPE__HIT_COUNT && hitCount_a == hitCount_b ) {
            actualSortTypeToUseForThisPair = Z_DATE_SORT_TYPE__DATE;
        }
        
        if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__SCORE ) {
            sortValueA = score_a;
            sortValueB = score_b;
            sortOrder = SORT_ORDER__DESCENDING;
        } else if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__DATE ) {
            sortValueA = zStructsDict_a.z_date_native_start.getTime();
            sortValueB = zStructsDict_b.z_date_native_start.getTime();
            sortOrder = SORT_ORDER__ASCENDING;
        } else if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__MSRF ) {
            if ( msrfScore_a == msrfScore_b ) {
                sortValueA = msrfNumberSum_a;
                sortValueB = msrfNumberSum_b;
            } else {
                sortValueA = msrfScore_a;
                sortValueB = msrfScore_b;
            }

            sortOrder = SORT_ORDER__DESCENDING;
        } else if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__OPERATIONS ) {
            if ( operationScore_a == operationScore_b ) {
                sortValueA = operationCount_a;
                sortValueB = operationCount_b;
            } else {
                sortValueA = operationCount_a;
                sortValueB = operationCount_b;
            }

            sortOrder = SORT_ORDER__DESCENDING;
        } else if ( actualSortTypeToUseForThisPair == Z_DATE_SORT_TYPE__HIT_COUNT ) {
            sortValueA = hitCount_a;
            sortValueB = hitCount_b;
            sortOrder = SORT_ORDER__DESCENDING;
        }

        var toReturn = (sortValueA > sortValueB ? -1 : 1);

        return toReturn * (sortOrder == SORT_ORDER__DESCENDING ? 1 : -1);
    });

    return toReturn;
}

function sortMsrfMatches(msrfMatchStructs) {
    msrfMatchStructs.sort(function(a, b) {
        var rotationCountForA = a.operation_result.rotation_count_z;
        var rotationCountForB = b.operation_result.rotation_count_z;

        var multiplierA = getMsrfScoreMultiplierForFilter(a.msrf_filter);
        var multiplierB = getMsrfScoreMultiplierForFilter(b.msrf_filter);

        if ( multiplierA > multiplierB ) {
            return -1;
        } else if ( multiplierA < multiplierB ) {
            return 1;
        } else {
            if ( rotationCountForA >= rotationCountForB ) {
                return -1;
            } else {
                return 1;
            }
        }
    });
}

function sortOperationMatches(operationMatchStructs) {
    operationMatchStructs.sort(function(a, b) {
        var yStructA = a.y_struct;
        var operationResultA = a.operation_result;

        var yStructB = b.y_struct;
        var operationResultB = b.operation_result;

        
        if ( operationResultA.operation.weight > operationResultB.operation.weight ) {
            return -1;
        } else if ( operationResultA.operation.weight < operationResultB.operation.weight ) {
            return 1;
        }

        if ( operationResultA.operation_ordinal == operationResultB.operation_ordinal ) {
            if ( yStructA.x_1_ordinal == yStructB.x_1_ordinal ) {
                if ( yStructA.x_2_ordinal == yStructB.x_2_ordinal ) {
                    return 1;
                } else if ( yStructA.x_2_ordinal > yStructB.x_2_ordinal ) {
                    return 1;
                } else {
                    return -1;
                }
            } else if ( yStructA.x_1_ordinal > yStructB.x_1_ordinal ) {
                return 1;
            } else {
                return -1;
            }
        } else if ( operationResultA.operation_ordinal > operationResultB.operation_ordinal ) {
            return 1;
        } else {
            return -1;
        }
    });
}