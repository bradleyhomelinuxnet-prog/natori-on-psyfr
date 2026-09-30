

var CHART_MOON_SIZE = 30;
var CHART_ECLIPSE_SIZE = 30;
var Z_DATE_SYMBOL_SIZE = 25;
var Z_DATE_SYMBOL_PADDING = 0; // can't seem to handle negatives right now.
var Z_DATE_SYMBOL_SIZE_DIV_2 = Z_DATE_SYMBOL_SIZE / 2.0;


// var CHART_COLOR__GRID_LINE = "#E5E5E5";
var CHART_COLOR__GRID_LINE = "#00000000";
var CHART_COLOR__AXIS_LINE = "black";
var CHART_GRID_LINE_WIDTH = 2;

var CHART_CURVE_WIDTH__ONE_HIT = 1;
var CHART_CURVE_WIDTH__TWO_HITS = 1;
var CHART_CURVE_WIDTH__THREE_HITS = 2;
var CHART_CURVE_WIDTH__FOUR_HITS = 2;
var CHART_CURVE_WIDTH__FIVE_HITS = 2;


var CHART_CURVE_WIDTH__GROUP_HIGHLIGHTING = 4;
var CHART_CURVE_WIDTH__INDIVIDUAL_HIGHLIGHTING = 5;
var CHART_CURVE_WIDTH__HIT_TESTING = 7;

// These must be in rgba so that alpha can be dynamically set.
var CHART_CURVE_COLOR__ONE_HIT = "rgba(0,0,0,1.0)";
var CHART_CURVE_COLOR__TWO_HITS = CHART_CURVE_COLOR__ONE_HIT;
var CHART_CURVE_COLOR__THREE_HITS = "rgb(253, 218, 13,1.0)"; //cadmium yellow
var CHART_CURVE_COLOR__FOUR_HITS = "rgb(0, 150, 255, 1.0)"; //bright blue
var CHART_CURVE_COLOR__FIVE_HITS = "rgb(210, 43, 43, 1.0)"; //cadmium red

// var CHART_CURVE_COLOR__GROUP_HIGHLIGHTING = "green";
// var CHART_CURVE_COLOR__GROUP_HIGHLIGHTING = "rgb(115, 255, 130)";
var CHART_CURVE_COLOR__GROUP_HIGHLIGHTING = "rgb(91, 202, 102)";
var CHART_CURVE_COLOR__INDIVIDUAL_HIGHLIGHTING = "red";


var CHART_SPLINE_TENSION = .333;
var CHART_CURVE_COMPLEXITY = 12; // number of line segments comprising the curve...must be even number.
var CHART_POINT_RADIUS__X_DATE = 5;
var CHART_POINT_RADIUS__Z_DATE = 7;
var CHART_POINT_RADIUS_HOVER = 10;
var CHART_NEG_Y_AXIS_PERCENTAGE = .4;
var CHART_POS_Y_AXIS_PERCENTAGE = .05;
var CHART_FAN_OUT_HIT_RADIUS = CHART_POINT_RADIUS__Z_DATE + 1;

var CHART_PIXEL_OFFSET__Z_DELTA_RULER_MIN_Y = 60;
var CHART_PIXEL_OFFSET__MOONS = 70;
var CHART_PIXEL_OFFSET__ECLIPSES = CHART_PIXEL_OFFSET__MOONS + CHART_MOON_SIZE;

var CHART_RULER_LABEL_FONT_SIZE = 22; // font size for the dashed line "ruler" for when you click on a chart element.
var CHART_DATE_LABEL_FONT_SIZE = 22; // font size for the X-Date/Z-Date boxed ordinal labels .
var CHART_TIMESTAMP_FONT_SIZE = 18; // font size for date/timestamps along the X-axis.
var CHART_DATE_LABEL_SUBSCRIPT_FONT_SIZE = 15;
var CHART_DATE_LABEL_PADDING = 1;
var CHART_DATE_LABEL_SPACING = 2;
var CHART_DATE_LABEL_PIXEL_OFFSET_FROM_X_AXIS = 35;

var CHART_SYMBOL_HIGHLIGHTING_MAGNIFICATION = 1.5;
var CHART_LABEL_HIGHLIGHTING_MAGNIFICATION = 1.0; // eh disable for now


// Highest order is drawn first, i.e. lower z-index.
var CHART_DATASET_ORDER__Z_DELTA_RULER = 1;
var CHART_DATASET_ORDER__ASTRO_EVENTS = 2;
var CHART_DATASET_ORDER__Z_DATE_POINT = 3;
var CHART_DATASET_ORDER__X_DATE_POINT = 4;
var CHART_DATASET_ORDER__HIGHLIGHTED_PILL = 5;
var CHART_DATASET_ORDER__HIGHLIGHTED_Z_DATE_ROW = 6;
var CHART_DATASET_ORDER__ALPHA_OPERATION = 7;
var CHART_DATASET_ORDER__DEFAULT = 8;


var MOON_PHASE_DICT = {};
var CHART_IMAGES = {};

function newMoonPhaseDictEntry(serializedField, moonPhasePercentage, imagePath) {
    return {
        serialized_field: serializedField,
        moon_phase_percentage: moonPhasePercentage,
        imagePath: imagePath
    };
}

MOON_PHASE_DICT[lunarphase.LunarPhase.NEW] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_NEW_MOONS", 0.0, "new_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.WAXING_CRESCENT] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_WAXING_CRESCENT_MOONS", INTRA_MOON_PHASE_DELTA * 1, "waxing_crescent_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.FIRST_QUARTER] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_FIRST_QUARTER_MOONS", INTRA_MOON_PHASE_DELTA * 2, "first_quarter_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.WAXING_GIBBOUS] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_WAXING_GIBBOUS_MOONS", INTRA_MOON_PHASE_DELTA * 3, "waxing_gibbous_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.FULL] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_FULL_MOONS", 0.5, "full_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.WANING_GIBBOUS] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_WANING_GIBBOUS_MOONS", INTRA_MOON_PHASE_DELTA * 5, "waning_gibbous_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.LAST_QUARTER] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_THIRD_QUARTER_MOONS", INTRA_MOON_PHASE_DELTA * 6, "third_quarter_moon.png");
MOON_PHASE_DICT[lunarphase.LunarPhase.WANING_CRESCENT] = newMoonPhaseDictEntry("SERIALIZED_FIELD__CHART_OPTION__SHOW_WANING_CRESCENT_MOONS", INTRA_MOON_PHASE_DELTA * 7, "waning_crescent_moon.png");


var ECLIPSE_TYPE__LUNAR = "ECLIPSE_TYPE__LUNAR";
var ECLIPSE_TYPE__SOLAR = "ECLIPSE_TYPE__SOLAR";

var SOLAR_ECLIPSE_TYPE__FULL = "SOLAR_ECLIPSE_TYPE__FULL";
var SOLAR_ECLIPSE_TYPE__PARTIAL = "SOLAR_ECLIPSE_TYPE__PARTIAL";

var LUNAR_ECLIPSE_TYPE__FULL = "LUNAR_ECLIPSE_TYPE__FULL";
var LUNAR_ECLIPSE_TYPE__PARTIAL = "LUNAR_ECLIPSE_TYPE__PARTIAL";

var ASTRO_INDICATOR_TYPE__LUNAR_PHASE = "ASTRO_INDICATOR_TYPE__LUNAR_PHASE";
var ASTRO_INDICATOR_TYPE__ECLIPSE = "ASTRO_INDICATOR_TYPE__ECLIPSE";


var CHART_SYMBOL_IMAGE__GEMINI = "CHART_SYMBOL_IMAGE__GEMINI";
var CHART_SYMBOL_IMAGE__TRIANGLE = "CHART_SYMBOL_IMAGE__TRIANGLE";
var CHART_SYMBOL_IMAGE__DIAMOND = "CHART_SYMBOL_IMAGE__DIAMOND";
var CHART_SYMBOL_IMAGE__CIRCLE = "CHART_SYMBOL_IMAGE__CIRCLE";

var CHART_SYMBOL_IMAGE_SRC__GEMINI = "img/hit_symbols/gemini.png";
var CHART_SYMBOL_IMAGE_SRC__TRIANGLE = "img/hit_symbols/triangle.png";
var CHART_SYMBOL_IMAGE_SRC__DIAMOND = "img/hit_symbols/diamond.png";
var CHART_SYMBOL_IMAGE_SRC__CIRCLE = "img/hit_symbols/circle.png";

var CHART_IMAGE_COUNT = getDictionarySize(MOON_PHASE_DICT) + 4 + 4;

function newEclipseDictEntry(serializedField, imagePath) {
    return {
        serialized_field: serializedField,
        imagePath: imagePath
    };
}


var ECLIPSE_DICT = {};

ECLIPSE_DICT[SOLAR_ECLIPSE_TYPE__FULL] = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES", "\u{1F506}");
ECLIPSE_DICT[SOLAR_ECLIPSE_TYPE__PARTIAL] = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__PARTIAL_SOLAR_ECLIPSES", "\u{1F506}");
ECLIPSE_DICT[LUNAR_ECLIPSE_TYPE__FULL] = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__FULL_LUNAR_ECLIPSES", "\u{1F506}");
ECLIPSE_DICT[LUNAR_ECLIPSE_TYPE__PARTIAL] = newEclipseDictEntry("SERIALIZED_FIELD__CHART_OPTION__PARTIAL_LUNAR_ECLIPSES", "\u{1F506}");


function loadAstroIndicators(onAllImagesLoaded) {

    function onImageLoaded(loadEvent) {
        var imageElem = loadEvent.target;

        CHART_IMAGES[imageElem.astro_indicator] = imageElem

        var astroImageCountSoFar = getDictionarySize(CHART_IMAGES);

        if ( astroImageCountSoFar == CHART_IMAGE_COUNT ) {
            onAllImagesLoaded();
        }
    }
    
    function newImage(indicator, imagePath) {
        var imgElem = new Image();
        imgElem.astro_indicator = indicator;
        imgElem.onload = onImageLoaded;
        imgElem.src = imagePath;
    }

    for (var ithPhase in MOON_PHASE_DICT) {
        // check if the property/key is defined in the object itself, not in parent
        if (MOON_PHASE_DICT.hasOwnProperty(ithPhase)) {
            var ithMoonPhaseObject = MOON_PHASE_DICT[ithPhase];

            newImage(ithPhase, "img/astro_indicators/" + ithMoonPhaseObject.imagePath);
        }
    }

    newImage(SOLAR_ECLIPSE_TYPE__FULL, "img/astro_indicators/solar_eclipse_full.png");
    newImage(SOLAR_ECLIPSE_TYPE__PARTIAL, "img/astro_indicators/solar_eclipse_partial.png");
    newImage(LUNAR_ECLIPSE_TYPE__FULL, "img/astro_indicators/lunar_eclipse_full.png");
    newImage(LUNAR_ECLIPSE_TYPE__PARTIAL, "img/astro_indicators/lunar_eclipse_partial.png");

    newImage(CHART_SYMBOL_IMAGE__GEMINI, CHART_SYMBOL_IMAGE_SRC__GEMINI);
    newImage(CHART_SYMBOL_IMAGE__TRIANGLE, CHART_SYMBOL_IMAGE_SRC__TRIANGLE);
    newImage(CHART_SYMBOL_IMAGE__DIAMOND, CHART_SYMBOL_IMAGE_SRC__DIAMOND);
    newImage(CHART_SYMBOL_IMAGE__CIRCLE, CHART_SYMBOL_IMAGE_SRC__CIRCLE);
}