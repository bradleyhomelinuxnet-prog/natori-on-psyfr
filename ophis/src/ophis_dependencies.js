

function newSunsetLibrary(name, enabled, execute) {
    return {
        name: name,
        enabled: enabled,
        execute: execute,
        cache: {}
    };
}

// I've observed this returning null for some "extreme" cases like north pole, etc.
// Lat constraints should make it pretty much impossible to input "extreme" cases,
// but you never know, have to be defensive.
// Overall it seems like the best library. But will go with Meeus as top choice since it's been in the program the longest.
var SUNSET_LIBRARY__COSINE_KITTY = newSunsetLibrary("CosineKitty", /*enabled*/true, function(nativeUtcDate, lat, long) {
    var observer = new Astronomy.Observer(lat, long, DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC);

    // var sunrise  = Astronomy.SearchRiseSet('Sun',  observer, +1, date, 300);
    // Not 100% sure what this does, but examples in the library use 300 so I'm going with it.
    var limitDays = 300;
    cosineKittySunset = Astronomy.SearchRiseSet('Sun',  observer, -1, nativeUtcDate, limitDays);

    return cosineKittySunset ? cosineKittySunset.date : null;
});


// Meeus seems better than Suncalc, but still running some NPEs and such with "extreme" lat/long combos.
// And I have seen some routine date/lat/long combos provide bad info.
var SUNSET_LIBRARY__MEEUS = newSunsetLibrary("Meeus", /*enabled*/true, function(nativeUtcDate, lat, long) {

    var sunTimes = getSunTimesMeeus(nativeUtcDate, lat, long, DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC);

    if ( sunTimes && sunTimes.setJS ) {
        return sunTimes.setJS
    } else {
        return null
    }
});

// Turns out SunCalc has a pretty rough issue list: https://github.com/mourner/suncalc/issues/101
// So should only use as last resort.
var SUNSET_LIBRARY__SUN_CALC = newSunsetLibrary("SunCalc", /*enabled*/true, function(nativeUtcDate, lat, long) {
    var sunCalcTimes = SunCalc.getTimes(nativeUtcDate, lat, long);

    return sunCalcTimes ? sunCalcTimes.sunset : null;
});

// In order of preference. If one library fails us for whatever reason
// (null/invalid return value, throws error, accuracy/consistency issue)
// then we try the next one.
var SUNSET_LIBRARIES = [
    SUNSET_LIBRARY__COSINE_KITTY,
    SUNSET_LIBRARY__MEEUS,
    SUNSET_LIBRARY__SUN_CALC
];

function getSunsetOnNativeUtcDate(nativeUtcDate, lat, long) {

    var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(SUNSET_LIBRARY__COSINE_KITTY, nativeUtcDate, lat, long);
    // var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(SUNSET_LIBRARY__MEEUS, nativeUtcDate, lat, long);
    // var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(SUNSET_LIBRARY__SUN_CALC, nativeUtcDate, lat, long);

    if ( nativeDateUtcSunset ) {
        return nativeDateUtcSunset;
    } else {
        return nativeUtcDate; // At least return something.
    }
}

function getSunsetOnNativeUtcDate_fromLibraryOrItsCacheWithNearestMinuteRounding(sunsetLibrary, nativeUtcDate, lat, long) {
    // Round date to the nearest minute BEFORE giving to library. This hopefully
    // reduces chance for rounding/tolerance discrepencies in library math, and
    // also increases the chance of a cache hit.
    const nativeUtcDateCloned = new Date(nativeUtcDate.getTime());
    roundDateToNearestMinute(nativeUtcDateCloned);

    var nativeDateUtcSunset = getSunsetOnNativeUtcDate_fromLibraryOrItsCache(sunsetLibrary, nativeUtcDate, lat, long);

    if ( nativeDateUtcSunset ) {
        // Round to the nearest minute ON THE WAY OUT as well, since it has been observed that the same library
        // can give a sunset time on the same day, for two different times in that day, that's different by e.g.
        // a few milliseconds. Rounding to the nearest minute BEFORE giving to the library should help with that.
        // But rounding AFTER doesn't hurt either.
        roundDateToNearestMinute(nativeDateUtcSunset);

        return nativeDateUtcSunset;
    } else {
        return null;
    }
}

function getSunsetOnNativeUtcDate_fromLibraryOrItsCache(sunsetLibrary, nativeUtcDate, lat, long) {
    if ( isFlagEnabled(FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE) ) {
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        var sunsetMillis = getFromSunsetCache(sunsetLibrary.cache, utcMillis, lat, long);

        if ( sunsetMillis ) {
            return utcMillisToNativeDate(sunsetMillis);
        }
    }

    var toReturn = getSunsetOnNativeUtcDate_directFromLibrary(sunsetLibrary, nativeUtcDate, lat, long);

    if ( toReturn && isFlagEnabled(FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE) ) {
        var utcMillis = nativeDateToUtcMillis(nativeUtcDate);
        addToSunsetCache(sunsetLibrary.cache, utcMillis, lat, long, toReturn);
    }

    return toReturn;
}

function getSunsetOnNativeUtcDate_directFromLibrary(sunsetLibrary, nativeUtcDate, lat, long) {
    try {
        var sunsetNativeDate = sunsetLibrary.execute(nativeUtcDate, lat, long);

        var toReturn = sunsetNativeDate ? sunsetNativeDate : null;

        return toReturn;
    } catch(error) {
        printError(error+"");
        return null;
    }
}

function removeAllDisplayedToolTips() {
    $(".tipsy").remove();
}

function getTimezone(lat, long) {
    return tzlookup(lat, long);
}

function tipsyGravityCallback() {

    $document = $(document);
    $window = $(window);

    var tagMaxWidth = 500;
    var tagMaxHeight = 400;

    var margin = 0;
    var prefer = 'nw';

    var dir = {ns: prefer[0], ew: (prefer.length > 1 ? prefer[1] : false)};
    var boundTop = $document.scrollTop() + margin;
    var boundLeft = $document.scrollLeft() + margin;
    var $this = $(this);

    var hitNorth = false;
    var hitSouth = false;

    if ( ($this.offset().top - tagMaxHeight ) < boundTop) {
        hitNorth = true;
        dir.ns = 'n';
    }

    if ($this.offset().left < boundLeft) {
        dir.ew = 'w';
    }

    if ( ($window.width() + $document.scrollLeft()) - ($this.offset().left + tagMaxWidth) < margin) {
        dir.ew = 'e';
    }
    
    var toolTipBottom = $this.offset().top + tagMaxHeight;
    var windowBottom = $window.height() + $document.scrollTop();

    if ( toolTipBottom > windowBottom ) {
        hitSouth = true;
        dir.ns = 's';
    }

    if ( hitNorth && hitSouth ) {
        dir.ns = '';
    } else {
        
    }

    var toReturn = dir.ns + (dir.ew ? dir.ew : '');

    return toReturn;
}

function getBrowserTimezone() {
    return moment.tz.guess();
}

function initDependencies() {
    initToolTips();
}

function initToolTips() {

    // Not doing anything now since I figured out a better way to handle otol tip for sort button/col_header.
    // function cleanUpTips() {
    //     $tipsyElems = $(".tipsy");
    //     if ( $tipsyElems.length > 1 ) {
    //         $tipsyElems.each(function(index) {
    //             if ( index > 0 ) {
    //                 $(this).hide();
    //             } else {
    //                 $(this).show();
    //             }
    //         });
    //     } else if ( $tipsyElems.length == 1 ) {
    //         $tipsyElems.show();
    //     }
    // }

    // $(document).on("mouseenter", function() {
    //     // print("mouseenter");
    //     // cleanUpTips();
    // });

    // $(document).mousemove(function(e){
    //     cleanUpTips();
    // });
}


function newTipsyConfig() {
    var toReturn = {
        fade:false,
        offset:5,
        gravity:tipsyGravityCallback,
        opacity:1,
        trigger:'hover',
        html: true,
        delayIn:TOOL_TIP_DELAY_IN_MILLISECONDS
    };

    return toReturn;
}


function applyToolTipToCssClass(cssClass) {
    $("." + cssClass).tipsy(newTipsyConfig());
}

function applyToolTipToElemId(elemId) {
    applyToolTip(document.getElementById(elemId));
}

function applyToolTip(element) {
    if ( element ) {
        var tipsyConfig = newTipsyConfig();

        $(element).tipsy(tipsyConfig);
    }
}

function convertStandardLocalDateStringToNativeUtcDate(standardLocalDateString, lat_nullable, long_nullable, timezone_nullable = null) {
    if ( isValidLatAndLong(lat_nullable, long_nullable) || timezone_nullable != null ) {
        var timezone = timezone_nullable != null ? timezone_nullable : getTimezone(lat_nullable, long_nullable);
        var momentInstance = moment.tz(standardLocalDateString, timezone).utc();
        var toReturn = momentInstance.toDate();
    
        return toReturn;
    } else {
        // var momentInstance = moment.utc(standardLocalDateString, X_DATE_MOMENT_PARSING_FORMAT);
        var momentInstance = moment(standardLocalDateString, X_DATE_MOMENT_PARSING_FORMAT);
        var toReturn = momentInstance.toDate();

        // debugger;

        return toReturn;
    }
}

function convertNativeLocalDateToUtc(nativeDateInLocalTime, lat, long) {
    
    var timezone = getTimezone(lat, long);
    var nativeDateInStandardFormat = nativeUtcDateToStandardString_dateAndTime(nativeDateInLocalTime);
    var momentInstance = moment.tz(nativeDateInStandardFormat, timezone).utc();
    var toReturn = momentInstance.toDate();

    return toReturn;
}

function convertNativeUtcDateToLocalMoment(nativeDateInUtcTime, lat, long) {
    
    var timezone = getTimezone(lat, long);
    var standardDateFormat = nativeUtcDateToStandardString_dateAndTime(nativeDateInUtcTime);
    var toReturn = moment.utc(standardDateFormat).tz(timezone);

    return toReturn;
}

// Caller still needs to validate return value.
function flatPickrStringToXDate(eventScope, dateString) {
    if ( eventScope == EVENT_SCOPE__HH_MM ) {
        var dateStringSplit = dateString.split(" ");

        // Caller still needs to validate.
        var possibleXDate = {
            date: dateStringSplit[0],
            time: dateStringSplit[1]
        };
    
        return possibleXDate;
    } else if ( eventScope == EVENT_SCOPE__DAYS ) {
        var possibleXDate = {
            date: dateString,
            time: TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE
        };
    
        return possibleXDate;
    } else if ( eventScope == EVENT_SCOPE__MONTHS ) {
        var possibleXDate = {
            date: dateString,
            time: TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE
        };
    
        return possibleXDate;
    } else if ( eventScope == EVENT_SCOPE__YEARS ) {
        var possibleXDate = {
            date: dateString,
            time: TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE
        };
    
        return possibleXDate;
    }
}