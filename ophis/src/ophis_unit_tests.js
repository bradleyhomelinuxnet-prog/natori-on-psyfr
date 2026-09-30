
function runUnitTests(errors_out) {
    try {
        checkFeatureFlags(errors_out);
        selfCheckMsrfFilters(errors_out);
        spotCheckFilterMatches(errors_out);

        // auditSunsetCalculations(errors_out);
    } catch(e) {
        errors_out.push("Encountered error while running unit tests: " + e);
    }
}

function auditSunsetCalculations(errors_out) {
    var latLimit = LAT_LIMIT;
    var longLimit = LONG_LIMIT;

    // var latLimit = 2;
    // var longLimit = 2;
    
    for ( var lat = -latLimit; lat <= latLimit; lat++ ) {
        for ( var long = -longLimit; long <= longLimit; long++ ) {
            console.log("Auditing sunsets for lat="+lat+" long="+long);
            auditSunsetCalculationsForLocation(lat, long, errors_out);
        }
    }
}

function auditSunsetCalculationsForLocation(lat, long, errors_out) {

    var startingXDate = newXDate("01/01/2025", "12:00");
    var nativeDate = xDateToNativeDate(EVENT_SCOPE__HH_MM, startingXDate, lat, long);
    var startingDateMillis = nativeDateToUtcMillis(nativeDate);

    var dayLimit = 400;

    var sunsetsBefore = [];
    var sunsetsAfter = [];

    for ( var i = 0; i < dayLimit; i++ ) {
        var ithDateMillis = startingDateMillis + i * MILLIS_PER_DAY;
        var ithDateNative = new Date(ithDateMillis);

        var ithSunsetBefore = getSunsetNativeUtcDateBefore(ithDateNative, lat, long);
        var ithSunsetBeforeMillis = nativeDateToUtcMillis(ithSunsetBefore);
        sunsetsBefore.push(ithSunsetBeforeMillis);

        // var ithSunsetAfter = getSunsetNativeUtcDateAfter(ithDateNative, lat, long);
        // var ithSunsetAfterMillis = nativeDateToUtcMillis(ithSunsetAfter);
        // sunsetsAfter.push(ithSunsetAfterMillis);
    }

    validateSunsetSequence(sunsetsBefore, errors_out);
    // validateSunsetSequence(sunsetsAfter, errors_out);
}

function assert(condition, message) {
    if ( condition === false ) {
        showToast("ASSERTION FAILED: " + message);
    }
}

function checkFeatureFlags(errors_out) {
    if ( isSunsetCompletelyDisabled() === false) {
        // They're back baby!
        // errors_out.push("All sunset feature flags should be off.");
    }
}

function spotCheckFilterMatches(errors_out) {
    var NULL_FILTER = null;

    spotCheckFilterMatch(12.5, NULL_FILTER, errors_out);
    spotCheckFilterMatch(12.4, MSRF_FILTER__NORMAL, errors_out);
    // spotCheckFilterMatch(12.5, NULL_FILTER, errors_out);
}

function spotCheckFilterMatch(axialRotation, expectedFilter, errors_out) {
    var filterMatch = getMsrfMatch(axialRotation);

    if ( filterMatch != null ) {
        if ( filterMatch.msrf_filter != null && filterMatch.msrf_filter === expectedFilter ) {
            // Happy path.
        } else {
            errors_out.push("Filter starting with "+filterMatch.msrf_filter[0]+" matched for rotation count '" +axialRotation+ "' but expected filter startig with " + expectedFilter[0]);
        }
    } else {
        if ( expectedFilter === null ) {
            // Happy path.
        } else {
            errors_out.push("Got a null filter for rotation count '" +axialRotation+ "' but expected filter starting with: " + expectedFilter[0]);
        }
    }
}

function selfCheckMsrfFilters(errors_out) {
    selfCheckMsrfFilter(MSRF_FILTER__NORMAL, errors_out);
    selfCheckMsrfFilter(MSRF_FILTER__IMPORTANT, errors_out);
    selfCheckMsrfFilter(MSRF_FILTER__VORTEX, errors_out);
    selfCheckMsrfFilter(MSRF_FILTER__FINAL, errors_out);
}

function selfCheckMsrfFilter(filter, errors_out) {
    for( var i = 0; i < filter.length; i++ ) {
        var ithFilterNumber = filter[i];

        var filterMatch = getMsrfMatch(ithFilterNumber);

        if ( filterMatch != null ) {
            if ( filter == MSRF_FILTER__FINAL || filterMatch.msrf_filter === filter ) {
                // Happy path.
            } else {
                errors_out.push("Programmer Error: Filter number '" + ithFilterNumber + "' matched against wrong filter starting with: " + filter[0]); 
            }
        } else {
            errors_out.push("Programmer Error: Unclassified filter number '" + ithFilterNumber + "' for filter starting with: " + filter[0]);
        }
    }
}