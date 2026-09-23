

var APP_VERSION = "12.0"; // for now, need to change in package.json as well.

var ACCOUNT_HASHES = [
    "598d0282b5dbada84a65203778212f6966144832040e5d9ef2d31b01948f60d51eed0fd847a734f726c29185ae93b579579ef0cd5f03d876f0af914f3a8d81f2",
    "ccc060d1eff8469ea195d09efb4e8181cf5c3bedceef174fe2f17ad5aa20c76d1b51b1dffce5ab032c0b8972b788b63f694e6c2cbb513b4924f5e8b6ce5f22cf",
    "e29133bc63a4bbcc58f0e7827ab8b3a3a80cb6e36b65a56aeb238a487028ef7ec62c542012efef794696fba37c86acc9489fda264aa5a206e1269a7b72dc4fc2",
    "7c6b8109499d5b298d87c4920f0bfe456f8fa978879888ba450c34c9abde35dbcba9988b007e0ce40dba0dd68a9a0ebdc73fcdea808a2c9570ae5e063f504e4b",
    "71366dc23c547c28faae478a3a8ba906103ce52601c8e1350a577121a9a65f492154240c7956f26dff9453d11b7c388824f1822f914f376f376aa3d592d26491",
];

// EVERYTHING IN THIS FILE IS IMMUTABLE, i.e. CONSTANT, not changed at runtime.
// And should be RARELY if EVER changed in general.

var MINIMUM_NUMBER_OF_X_DATES = 2;

// Establish some sane maximums for both Y and Z. This could be days, or months, or years, depending on the Scope.
// For Day-based projections, this means that one hundred years is the projection limit.
var MAXIMUM_ROTATION_COUNT_Y = 36500;
var MAXIMUM_ROTATION_COUNT_Z = 36500;

var DEFAULT_HEADLESS_CURRENT_EPOCH_MILLIS = Number.MIN_SAFE_INTEGER;


var OPH_HEADLESS_OUTPUT_TYPE__CSV = "OPH_HEADLESS_OUTPUT_TYPE__CSV";
var OPH_HEADLESS_OUTPUT_TYPE__DEFAULT = OPH_HEADLESS_OUTPUT_TYPE__CSV;

var GLOBAL_OPTION__START_SCREEN = "start_screen";
var GLOBAL_OPTION__SKIN_MODE = "skin_mode";
var GLOBAL_OPTION__CURRENT_FILE_PATH = "current_file_path";
var GLOBAL_OPTION__LOCAL_TIME_OFFSET_IN_MILLIS = "local_time_offset_in_millis";
var GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES = "auto_recalculate_z_dates";

var GLOBAL_OPTION__BLUR_ABOUT_SCREEN = "blur_about_screen";
var GLOBAL_OPTION__HIDE_COL__DATES = "hide_date_col";
var GLOBAL_OPTION__HIDE_COL__HITS = "hide_hits_col";
var GLOBAL_OPTION__HIDE_COL__SCORE = "hide_score_col";
var GLOBAL_OPTION__HIDE_COL__MSRF = "hide_msrf_col";
var GLOBAL_OPTION__HIDE_COL__OPERATIONS = "hide_operations_col";
var GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY = "hide_operations_col_completely";
var GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT = "prettify_x_date_export_output";
var GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT = "minify_x_date_export_output";
var GLOBAL_OPTION__PRETTIFY_OPH_FILES = "prettify_oph_files";
var GLOBAL_OPTION__MINIFY_OPH_FILES = "minify_oph_files";

var SCORING_SYSTEM__LTE_V7 = "SCORING_SYSTEM__LTE_V7";
var SCORING_SYSTEM__GTE_V8 = "SCORING_SYSTEM__GTE_V8";

var DEFAULT_SCORING_SYSTEM = SCORING_SYSTEM__GTE_V8;

var SCORING_SYSTEMS = [
    SCORING_SYSTEM__LTE_V7,
    SCORING_SYSTEM__GTE_V8
];

var INPUT_DATE_TYPE__X_DATE = "INPUT_DATE_TYPE__X_DATE";
var INPUT_DATE_TYPE__T_DATE = "INPUT_DATE_TYPE__T_DATE";

var OPHIS_INPUT_CHANGE__NO_CHANGE = "OPHIS_INPUT_CHANGE__NO_CHANGE";
var OPHIS_INPUT_CHANGE__CHANGED = "OPHIS_INPUT_CHANGE__CHANGED";
var OPHIS_INPUT_CHANGE__FORCE = "OPHIS_INPUT_CHANGE__FORCE";

var SAVE_BLOB_MODE__JUST_THE_EVENTS = "SAVE_BLOB_MODE__JUST_THE_EVENTS";
var SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS = "SAVE_BLOB_MODE__JUST_THE_GLOBAL_OPTIONS";
var SAVE_BLOB_MODE__EVERYTHING = "SAVE_BLOB_MODE__EVERYTHING";

var GLOBAL_HIDE_COL_OPTIONS = [
    GLOBAL_OPTION__HIDE_COL__DATES,
    GLOBAL_OPTION__HIDE_COL__HITS,
    GLOBAL_OPTION__HIDE_COL__SCORE,
    GLOBAL_OPTION__HIDE_COL__MSRF,
    GLOBAL_OPTION__HIDE_COL__OPERATIONS
];

var GLOBAL_BOOLEAN_OPTIONS = [
    GLOBAL_OPTION__BLUR_ABOUT_SCREEN,
    GLOBAL_OPTION__HIDE_OPERATIONS_COL_COMPLETELY,
    GLOBAL_OPTION__PRETTIFY_X_DATE_EXPORT_OUTPUT,
    GLOBAL_OPTION__MINIFY_X_DATE_EXPORT_OUTPUT,
    GLOBAL_OPTION__AUTO_RECALCULATE_Z_DATES,
    GLOBAL_OPTION__PRETTIFY_OPH_FILES,
    GLOBAL_OPTION__MINIFY_OPH_FILES
].concat(GLOBAL_HIDE_COL_OPTIONS);

// This was the original value for most of Ophis's development.
// Once released to Telegram group, people wanted the ability to put the
// first two dates one right after the other.
// var MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES = 6;

var MINIMUM_DAYS_BETWEEN_FIRST_TWO_X_DATES = 1;
var MINIMUM_DAYS_BETWEEN_SUBSEQUENT_X_DATES = 1;
var MINIMUM_X_DATES_REQUIRED = 2;
var MAX_CALENDAR_YEAR = 9999;

var MINIMUM_OPERATIONS_REQUIRED = 1;

var MILLIS_PER_MINUTE = 1000 * 60;
var MILLIS_PER_HOUR = MILLIS_PER_MINUTE * 60;
var MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;

var SYNODIC_MONTH = 29.53058770576;

var SERIALIZED_FIELD__ISO_EVENTS = "iso_events";
var SERIALIZED_FIELD__APP_VERSION = "app_version";
var SERIALIZED_FIELD__GLOBAL_OPTIONS = "global_options";
var SERIALIZED_FIELD__UI_STATE = "ui_state";
var SERIALIZED_FIELD__UI_STATE__CURRENT_ISO_EVENT = "current_iso_event";
var SERIALIZED_FIELD__LOCAL_STORAGE_SAVE_BLOB = "save_blob";

var INTRA_MOON_PHASE_DELTA = 1.0 / 8.0;
var LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS = 1;
var ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS = 1.25;
var LUNAR_DATE_MATCH_TOLERANCE = MILLIS_PER_DAY*LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS;
var ECLLIPSE_DATE_MATCH_TOLERANCE = MILLIS_PER_DAY*ECLIPSE_DATE_MATCH_TOLERANCE_IN_DAYS;

var ALREADY_CALCULATED_SUNSET_TOLERANCE_IN_MILLIS = MILLIS_PER_HOUR;

var HIGHEST_MSRF_NUMBER = 2559;
var UNDEFINED_FIELD_INPUT_NUMBER = undefined;

var SERIALIZED_FILTER_FIELDS = [
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_LAST_X_DATE",
        "before last X-Date",
        "Checking this box means all output before last X-Date will be hidden.",
        true
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_LAST_X_DATE",
        "on last X-Date",
        "Checking this box means any output on last X-Date will be hidden.",
        true
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEFORE_CURRENT_DATE",
        "before current date",
        "Checking this box means any output before the current date (adjustable) will be hidden.",
        true
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_ON_CURRENT_DATE",
        "on current date",
        "Checking this box means any output on the current date (adjustable) will be hidden.",
        false
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_BEYOND_MAX_DAYS",
        'beyond <input tabindex="-1" style="text-align:left; width:51px;" id="iso-event-filter-beyond-max-days-input" class="filter_text_input general_input" row_index="0" type="text"> days',
        "Checking this box means any output beyond the given number of days after the last X-Date will be hidden.",
        true,
        HIGHEST_MSRF_NUMBER
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_HIT_COUNT",
        'Hits are below <input tabindex="-1" style="text-align:left; width:35px;" id="iso-event-filter-min-hit-count-input" class="filter_text_input general_input" row_index="0" type="text">',
        "Checking this box means any output with hit count lower than this will be hidden.",
        false,
        2
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_MIN_SCORE",
        'Score is below <input tabindex="-1" style="text-align:left; width:35px;" id="iso-event-filter-min-score-input" class="filter_text_input general_input" row_index="0" type="text">',
        "Checking this box means any output lower than this score will be hidden. See About page for how score is calculated.",
        false,
        1
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__ISO_EVENT_FILTER_MSRF_MATCH",
         "no MSRF matches",
        "Checking this box means any output <i>without</i> MSRF matches will be hidden.",
        false
    )
];

function getDayString(dayCount) {
    return dayCount == 1 ? "1 day" : dayCount + " days";
}

function generateChartOptionIconHtml(imagePath, imageSize) {
    return "<img style='display:block; margin-left:2px; margin-top:2px; margin-bottom:2px; width:"+imageSize+"px; height:"+imageSize+"px;' src='img/astro_indicators/"+imagePath+"' />"
}

function newSerializedMoonOption(fieldKey, shortName, longName, image) {
    var readablePluralName = longName + " Moons";
    return newSerializedFieldObject(
        fieldKey,
        "<table class='chart_option_table'><tr><td>"+shortName+"</td><td class='chart_option_table_col'>" + generateChartOptionIconHtml(image, CHART_MOON_SIZE__HTML) + "</td></tr></table>",
        "Show any "+readablePluralName+" that are within "+getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)+" of any X-Date or Z-Date.",
        false,
        UNDEFINED_FIELD_INPUT_NUMBER,
        readablePluralName,
        /*zIndex=*/5
    );
}

var CHART_MOON_SIZE__HTML = 30;
var CHART_ECLIPSE_SIZE__HTML = CHART_MOON_SIZE__HTML;

var SERIALIZED_CHART_OPTION_FIELDS = [

    newSerializedFieldObject(
        "SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART",
        "<table class='chart_option_table'><tr><td>Chart Itself</td><td class='chart_option_table_col'></td></tr></table>",
        "Show the chart itself.",
        true,
        UNDEFINED_FIELD_INPUT_NUMBER,
        "Chart Itself",
        /*zIndex=*/10
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES",
        "<table class='chart_option_table'><tr><td>Chart Dates</td><td class='chart_option_table_col'></td></tr></table>",
        "Show dates on the chart.",
        true,
        UNDEFINED_FIELD_INPUT_NUMBER,
        "Chart Dates",
        /*zIndex=*/10
    ),

    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_NEW_MOONS", "New", "New", "new_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_FIRST_QUARTER_MOONS", "1st Quarter", "1st Quarter", "first_quarter_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_FULL_MOONS", "Full", "Full", "full_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_THIRD_QUARTER_MOONS", "3rd Quarter", "3rd Quarter", "third_quarter_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_WAXING_CRESCENT_MOONS", "Wax Crscnt", "Waxing Crescent", "waxing_crescent_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_WANING_CRESCENT_MOONS", "Wan Crscnt", "Waning Crescent", "waning_crescent_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_WAXING_GIBBOUS_MOONS", "Wax Gibb", "Waxing Gibbous", "waxing_gibbous_moon.png"),
    newSerializedMoonOption("SERIALIZED_FIELD__CHART_OPTION__SHOW_WANING_GIBBOUS_MOONS", "Wan Gibb", "Wax Gibbous", "waning_gibbous_moon.png"),

    newSerializedFieldObject(
        "SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES",
        "<table class='chart_option_table'><tr><td>Full Solar</td><td class='chart_option_table_col'>" + generateChartOptionIconHtml("solar_eclipse_full.png", CHART_ECLIPSE_SIZE__HTML) + "</td></tr></table>",
        "Show any Full Solar Eclipses that are within "+getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)+" of any X-Date or Z-Date.",
        false,
        UNDEFINED_FIELD_INPUT_NUMBER,
        "Full Solar Eclipses",
        /*zIndex=*/10
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__CHART_OPTION__PARTIAL_SOLAR_ECLIPSES",
        "<table class='chart_option_table'><tr><td>Partial Solar</td><td class='chart_option_table_col'>" + generateChartOptionIconHtml("solar_eclipse_partial.png", CHART_ECLIPSE_SIZE__HTML) + "</td></tr></table>",
        "Show any Partial Solar Eclipses that are within "+getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)+" of any X-Date or Z-Date.",
        false,
        UNDEFINED_FIELD_INPUT_NUMBER,
        "Partial Solar Eclipses",
        /*zIndex=*/8
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__CHART_OPTION__FULL_LUNAR_ECLIPSES",
        "<table class='chart_option_table'><tr><td>Full Lunar</td><td class='chart_option_table_col'>" + generateChartOptionIconHtml("lunar_eclipse_full.png", CHART_ECLIPSE_SIZE__HTML) + "</td></tr></table>",
        "Show any Partial Lunar Eclipses that are within "+getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)+" of any X-Date or Z-Date.",
        false,
        UNDEFINED_FIELD_INPUT_NUMBER,
        "Full Lunar Eclipses",
        /*zIndex=*/9
    ),
    newSerializedFieldObject(
        "SERIALIZED_FIELD__CHART_OPTION__PARTIAL_LUNAR_ECLIPSES",
        "<table class='chart_option_table'><tr><td>Partial Lunar</td><td class='chart_option_table_col'>" + generateChartOptionIconHtml("lunar_eclipse_partial.png", CHART_ECLIPSE_SIZE__HTML) + "</td></tr></table>",
        "Show any Partial Lunar Eclipses that are within "+getDayString(LUNAR_DATE_MATCH_TOLERANCE_IN_DAYS)+" of any X-Date or Z-Date.",
        false,
        UNDEFINED_FIELD_INPUT_NUMBER,
        "Partial Lunar Eclipses",
        /*zIndex=*/7
    ),
];

var ALL_SERIALIZED_FIELDS = SERIALIZED_FILTER_FIELDS.concat(SERIALIZED_CHART_OPTION_FIELDS);

var HOURS_IN_DAY_TO_USE_WITHOUT_HH_MM_SCOPE = 0;
var TIMESTAMP_TO_USE_WITHOUT_HH_MM_SCOPE = "00:00";

var DATE_DELIMITER = "/";
var STANDARD_DATE_DELIMITER = "-";
var X_DATE_CAL_DISPLAY_FORMAT = "m"+DATE_DELIMITER+"d"+DATE_DELIMITER+"Y";
var X_DATE_CAL_DISPLAY_FORMAT__MONTHS = "m"+DATE_DELIMITER+"Y";
var X_DATE_CAL_DISPLAY_FORMAT__YEARS = "Y";
var X_DATE_TIME_DISPLAY_FORMAT = "H:i";
var X_DATE_INPUT_DISPLAY_FORMAT = X_DATE_CAL_DISPLAY_FORMAT + " " + X_DATE_TIME_DISPLAY_FORMAT;

// NOTE: CANNOT use X_DATE_TIME_DISPLAY_FORMAT because apparently moment.js differs from other parsing
// solutions that use "i" for minutes in order to disambiguate from months.
var X_DATE_MOMENT_PARSING_FORMAT = "YYYY-MM-DD" + " " + "HH:mm";

// Use "expected" precision, e.g. 3.141 instead of 3.142. For most of the constants this is needless
// pedantry, writing all this out, but just being sure, showing the work in case there's confusion.
var FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION = true;

// This was always just a false sense of security anyway, so now set to false!
// It was like having a fake security camera just to scare people.
var FEATURE_FLAG__REQUIRE_SIGN_IN = false;

var FEATURE_FLAG__SHOW_MSRF_AND_OPERATION_PILL_TOOL_TIPS = true;

var FEATURE_FLAG__SHOW_PAGE_REFRESHES_IN_CONSOLE = false;

var FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT = true;
var FEATURE_FLAG__ADD_INITIAL_X_DATES_TO_NEW_ISO_EVENTS = false;

// After feedback from Jason, Z-Value should be added to the exact X-Date and not Prior Sunset
var FEATURE_FLAG__SUNSET__ADD_Z_VALUE_TO_X_DATE_PRIOR_SUNSET = false;
var FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_IN_SEPARATE_COL = false;
var FEATURE_FLAG__SUNSET__SHOW_X_DATE_PRIOR_SUNSET_INLINE = true;
var FEATURE_FLAG__SUNSET__CALCULATE_BEFORE_N_AFTER = true;
var FEATURE_FLAG__SUNSET__FILTER_BASED_ON_PRIOR_SUNSET = false;

var FEATURE_FLAG__USE_SUNSET_SAMPLING = true;
var FEATURE_FLAG__USE_PER_LIBRARY_SUNSET_CACHE = true;
var FEATURE_FLAG__BEFORE_N_AFTER_SUNSET_CACHE = false;

var FEATURE_FLAG__ALL_OPERATOR_HIDE_OUTPUT_COLS = false;

var FEATURE_FLAG__SHOW_LOCATION = true;
var FEATURE_FLAG__SHOW_SCOPE = true;

var FEATURE_FLAG__AUTOSAVE_UNDER_ELECTRON = false;
var FEATURE_FLAG__OPEN_PREVIOUS_FILE_UNDER_ELECTRON = false;

var FEATURE_FLAG__AUTO_FILL_X_DATES_DURING_FILE_LOAD = false;

var EVENT_SCOPE__HH_MM = "EVENT_SCOPE__HH_MM";
var EVENT_SCOPE__DAYS = "EVENT_SCOPE__DAYS";
var EVENT_SCOPE__MONTHS = "EVENT_SCOPE__MONTHS";
var EVENT_SCOPE__YEARS = "EVENT_SCOPE__YEARS";

var EVENT_SCOPES = [
    EVENT_SCOPE__HH_MM,
    EVENT_SCOPE__DAYS,
    EVENT_SCOPE__MONTHS,
    EVENT_SCOPE__YEARS
];

// File input validation strictness was introduced in v11 because of both headless mode, which should generally be stricter,
// and on the other hand there were feature requests to make file input validation more relaxed. "Original" here means
// the strictness that was the non-configurable default in versions <= v10.
var FILE_INPUT_VALIDATION_MODE__STRICT = "FILE_INPUT_VALIDATION_MODE__STRICT";
var FILE_INPUT_VALIDATION_MODE__ORIGINAL = "FILE_INPUT_VALIDATION_MODE__ORIGINAL";
var FILE_INPUT_VALIDATION_MODE__LOOSE = "FILE_INPUT_VALIDATION_MODE__LOOSE";

var FILE_INPUT_VALIDATION_MODES = [
    FILE_INPUT_VALIDATION_MODE__STRICT,
    FILE_INPUT_VALIDATION_MODE__ORIGINAL,
    FILE_INPUT_VALIDATION_MODE__LOOSE
];

var GLOBAL_DATE_SCOPE = isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ? EVENT_SCOPE__HH_MM : EVENT_SCOPE__DAYS;

// Based on user feedback, the default scope, if it's missing from an `.oph` file, should be Days.
// var DEFAULT_EVENT_SCOPE = isFlagEnabled(FEATURE_FLAG__SHOW_LOCATION) ? EVENT_SCOPE__HH_MM : EVENT_SCOPE__DAYS;
var DEFAULT_EVENT_SCOPE = EVENT_SCOPE__DAYS;

var DEFAULT_DAY_SCOPE_START_TIME_MILLIS = 0;


var EVENT_TYPE__PERSONAL = "EVENT_TYPE__PERSONAL";
var EVENT_TYPE__ASTROLOGICAL = "EVENT_TYPE__ASTROLOGICAL";
var EVENT_TYPE__MARKETS = "EVENT_TYPE__MARKETS";

var DEFAULT_EVENT_TYPE = EVENT_TYPE__PERSONAL;

var EVENT_TYPES = [
    EVENT_TYPE__PERSONAL,
    // EVENT_TYPE__ASTROLOGICAL,
    EVENT_TYPE__MARKETS
];

var VORTEX_FILTER_MATCH_TOLERANCE = .1;

var DECIMAL_PRECISION__TIME = 2;
var DECIMAL_PRECISION__LOCATION = 1;
var DECIMAL_PRECISION__AXIAL_ROTATIONS = 1;
var DECIMAL_PRECISION__SCORE = 2;

var PI_RAW = Math.PI;
var PHI_RAW = 1.61803398875;
var CURVATURE_RAW = PI_RAW * PHI_RAW;

var PI_TO_2_DECIMAL_PLACES_AS_EXPECTED = 3.14;
var PI_TO_3_DECIMAL_PLACES_AS_EXPECTED = 3.141;

var PHI_TO_2_DECIMAL_PLACES_AS_EXPECTED = 1.61;
var PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED = 1.618;

var CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED = 5.08;
var CURVATURE_TO_3_DECIMAL_PLACES_AS_EXPECTED = 5.083;

var PI_AS_EXPECTED;
var PHI_AS_EXPECTED;
var CURVATURE_AS_EXPECTED;

if ( DECIMAL_PRECISION__TIME == 2 ) {
    PI_AS_EXPECTED = PI_TO_2_DECIMAL_PLACES_AS_EXPECTED;
    // PHI_AS_EXPECTED = PHI_TO_2_DECIMAL_PLACES_AS_EXPECTED;
    // NOTE: PURPOSELY using phi to 3 decimal places, even when decimal precision for time is "2".
    // This is because it was noted that Jason often says "1.618" in videos so I think this would be more
    // expected by him. Whereas for PI he usually says "3.14" and not "3.141" or anything.
    // ALSO if PHI was shortened to two decimal places it should be 1.62, which "looks" wrong.
    PHI_AS_EXPECTED = PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED;
    CURVATURE_AS_EXPECTED = CURVATURE_TO_2_DECIMAL_PLACES_AS_EXPECTED;
} else if ( DECIMAL_PRECISION__TIME == 3 ) {
    PI_AS_EXPECTED = PI_TO_3_DECIMAL_PLACES_AS_EXPECTED;
    PHI_AS_EXPECTED = PHI_TO_3_DECIMAL_PLACES_AS_EXPECTED;
    CURVATURE_AS_EXPECTED = CURVATURE_TO_3_DECIMAL_PLACES_AS_EXPECTED;
} else {
    PI_AS_EXPECTED = roundNumberToTimePrecision(PI_RAW);
    PHI_AS_EXPECTED = roundNumberToTimePrecision(PHI_RAW);
    CURVATURE_AS_EXPECTED = roundNumberToTimePrecision(CURVATURE_RAW);
}

var OPH_PI = isFlagEnabled(FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION) ? PI_AS_EXPECTED : roundNumberToTimePrecision(PI_RAW);
var OPH_PHI = isFlagEnabled(FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION) ? PHI_AS_EXPECTED : roundNumberToTimePrecision(PHI_RAW);
var OPH_CRV = isFlagEnabled(FEATURE_FLAG__USE_EXPECTED_CONSTANTS_PRECISION) ? CURVATURE_AS_EXPECTED : roundNumberToTimePrecision(OPH_PI * OPH_PHI);
var OPH_HEP = 7.01;

var ALL_OPH_CONSTANTS = [
    "OPH_PI",
    "OPH_PHI",
    "OPH_CRV",
    "OPH_HEP"
];

var SAMPLE_Y_VALUE_FOR_VALIDATION = 10;

// Have to have a reasonable limit for latitude. Every sunset calculation library
// I've tested starts freaking out once you get too arctic! :)
var LAT_LIMIT = 65;
var LONG_LIMIT = 180;
var DEFAULT_HEIGHT_IN_METERS_FOR_SUN_CALC = 2;

var STARTING_X1 = "STARTING_X1";
var STARTING_X2 = "STARTING_X2";

var REFRESH_TYPE__RIGHT_PANEL_ONLY = "REFRESH_TYPE__RIGHT_PANEL_ONLY";
var REFRESH_TYPE__SOFT = "REFRESH_TYPE__SOFT";
var REFRESH_TYPE__HARD = "REFRESH_TYPE__HARD";

var COORD_LAT = "lat";
var COORD_LONG = "long";

var Z_DATE_SORT_TYPE__SCORE = "SORT_TYPE__SCORE";
var Z_DATE_SORT_TYPE__DATE = "SORT_TYPE__DATE";
var Z_DATE_SORT_TYPE__MSRF = "SORT_TYPE__MSRF";
var Z_DATE_SORT_TYPE__HIT_COUNT = "SORT_TYPE__HIT_COUNT";
var Z_DATE_SORT_TYPE__OPERATIONS = "SORT_TYPE__OPERATIONS";
var DEFAULT_Z_DATE_SORT_TYPE = Z_DATE_SORT_TYPE__DATE;

var Z_DATES_SORT_TYPES = [
    Z_DATE_SORT_TYPE__SCORE,
    Z_DATE_SORT_TYPE__DATE,
    Z_DATE_SORT_TYPE__MSRF,
    Z_DATE_SORT_TYPE__HIT_COUNT,
    Z_DATE_SORT_TYPE__OPERATIONS
];

var SORT_ORDER__ASCENDING = "SORT_ORDER__ASCENDING";
var SORT_ORDER__DESCENDING = "SORT_ORDER__DESCENDING";

var LOG_TAG__ERROR = "OPHIS_ERROR";
var LOG_TAG__WARNING = "OPHIS_WARNING";
var LOG_TAG__INFO = "OPHIS_INFO";

var CURVATURE_SHORTHAND = "CRVTR";
var OPERATION_SHORTHAND = "O";
var X_DATE_SHORTHAND = "X";
var Z_DATE_SHORTHAND = "Z";