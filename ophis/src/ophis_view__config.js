
var TRANSPARENT_PIXEL_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// This was the beginning of an idea that never panned out really, but no harm keeping it under the hood.
var SKIN_MODE__CLASSIC = "SKIN_MODE__CLASSIC";
var SKIN_MODE__ASTROLOGICAL = "SKIN_MODE__ASTROLOGICAL";
var SKIN_MODE__MARKETS = "SKIN_MODE__MARKETS";
var DEFAULT_SKIN_MODE = SKIN_MODE__CLASSIC;

var KEY_CODE__ENTER = 13;

var NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT = "No results. You probably have to loosen up a filter.";

var FILE_NOT_SAVED_TEXT = "(Not Saved)";
var FILE_SAVED_TEXT = "(Saved)";

var OPERATION_PILLS_PER_ROW = 3;
var MSRF_PILLS_PER_ROW = 1;
var PILL_WIDTH_IN_PX = 100;

var COLOR__OPERATION_ALPHA = "rgba(184, 134, 11, 1.0)"
var COLOR__OPERATION_BETA = "rgba(0, 192, 255, 1.0)"
var COLOR__TRANSPARENT = "rgba(0,0,0,0)";

var SCREEN_SPECIFIC_HEADER_MARGIN_LEFT = "margin-left:0px;";

var COLOR__MSRF_NORMAL = "#2ede69";
var COLOR__MSRF_IMPORTANT = "#b80b0b";
var COLOR__MSRF_VORTEX = "purple";

var OPHIS_PANEL_BORDER_SPACING = 10;

var LAT_INPUT_HTML = generateLatOrLongInput(COORD_LAT);
var LONG_INPUT_HTML = generateLatOrLongInput(COORD_LONG);
var RIGHT_ARROW_HTML = "&rarr;";
var DOWN_ARROW_HTML = "&darr;";
var LEFT_ARROW_HTML = "&larr;";

// Dallas Texas Area
var DEFAULT_LAT = 32.8;
var DEFAULT_LONG = -96.8;

var DEFAULT_MAP_SELECTION_ZOOM = 4;
var MAP_MIN_ZOOM = 0; // all the way zoomed out.
var MAP_MAX_ZOOM = 5; // tiles are only generated up to this point.

var TOOL_TIP_DELAY_IN_MILLISECONDS = 750;

var ALLOW_FLATPICKR_INPUT = true;

function FLATPICKR_BASE_DATE_CONFIG__HH_MM__TIME_ONLY() {
    return {
        dateFormat: X_DATE_TIME_DISPLAY_FORMAT,
        noCalender: true,
        enableTime: true,
        time_24hr: true,
        allowInput: ALLOW_FLATPICKR_INPUT
    };
}

function FLATPICKR_BASE_DATE_CONFIG__HH_MM() {
    return {
        dateFormat: X_DATE_INPUT_DISPLAY_FORMAT,
        enableTime: true,
        time_24hr: true,
        allowInput: ALLOW_FLATPICKR_INPUT
    };
}

function FLATPICKR_BASE_DATE_CONFIG__DAYS() {
    return {
        dateFormat: X_DATE_CAL_DISPLAY_FORMAT,
        enableTime: false,
        time_24hr: false,
        allowInput: ALLOW_FLATPICKR_INPUT
    };
}

function FLATPICKR_BASE_DATE_CONFIG__MONTHS() {
    return {
        dateFormat: X_DATE_CAL_DISPLAY_FORMAT__MONTHS,
        enableTime: false,
        time_24hr: false,
        allowInput: ALLOW_FLATPICKR_INPUT,
        plugins: [
            new monthSelectPlugin({
                shorthand: true, //defaults to false
                dateFormat: X_DATE_CAL_DISPLAY_FORMAT__MONTHS, //defaults to "F Y"
                altFormat: "F Y", //defaults to "F Y"
                theme: "light" // defaults to "light"
            })
        ]
    };
}

function FLATPICKR_BASE_DATE_CONFIG__YEARS() {
    return {
        dateFormat: X_DATE_CAL_DISPLAY_FORMAT__YEARS,
        enableTime: false,
        time_24hr: false,
        allowInput: ALLOW_FLATPICKR_INPUT,
        plugins: [
            new monthSelectPlugin({
                shorthand: true, //defaults to false
                dateFormat: X_DATE_CAL_DISPLAY_FORMAT__YEARS, //defaults to "F Y"
                altFormat: "F Y", //defaults to "F Y"
                theme: "light" // defaults to "light"
            })
        ]
    };
}

var MIN_DATE_AND_TIME_FIELD_WIDTH = "155px";
var MIN_DATE_FIELD_WIDTH = "103px";
var MIN_TIME_FIELD_WIDTH = "65px";

var OPACITY__DISABLED = 0.5;
var OPACITY__ENABLED = 1.0;

var OPHIS_SCREEN__ABOUT = "OPHIS_SCREEN__ABOUT";
var OPHIS_SCREEN__Z_DATES = "OPHIS_SCREEN__Z_DATES";
var OPHIS_SCREEN__OPERATIONS = "OPHIS_SCREEN__OPERATIONS";
var OPHIS_SCREEN__DEBUG = "OPHIS_SCREEN__DEBUG";
var OPHIS_SCREEN__EXPORT_X_DATES = "OPHIS_SCREEN__EXPORT_X_DATES";
var OPHIS_SCREEN__EXPORT_Z_DATES = "OPHIS_SCREEN__EXPORT_Z_DATES";
var OPHIS_SCREEN__IMPORT_X_DATES = "OPHIS_SCREEN__IMPORT_X_DATES";
var OPHIS_SCREEN__EVENT_SETTINGS = "OPHIS_SCREEN__EVENT_SETTINGS";
var OPHIS_SCREEN__EVENT_SWAP = "OPHIS_SCREEN__EVENT_SWAP";

var DEFAULT_STARTING_SCREEN = OPHIS_SCREEN__Z_DATES;

var OPHIS_SCREENS = [
    OPHIS_SCREEN__ABOUT,
    OPHIS_SCREEN__Z_DATES,
    OPHIS_SCREEN__OPERATIONS,
    // OPHIS_SCREEN__DEBUG,
    OPHIS_SCREEN__IMPORT_X_DATES,
    OPHIS_SCREEN__EXPORT_X_DATES,
    OPHIS_SCREEN__EXPORT_Z_DATES,
    OPHIS_SCREEN__EVENT_SETTINGS,
    OPHIS_SCREEN__EVENT_SWAP,
];



function newMasterCheckbox(baseElemId, baseClassName, title, onChildNowCheckedOrNot, onMasterCheckboxChangeComplete) {
    return {
        baseElemId: baseElemId,
        baseClassName: baseClassName,
        title: title,
        onChildNowCheckedOrNot,
        onMasterCheckboxChangeComplete: onMasterCheckboxChangeComplete
    };
}

var MASTER_CHECKBOX_CONFIG__X_DATES = newMasterCheckbox(
    "x-date-checkbox",
    "x_date_checkbox",
    "Enable/Disable all X-Dates",
    function(rowIndex, nowChecked) {
        var currentIsoEvent = getCurrentIsoEvent();
        var xDate = currentIsoEvent.x_dates[rowIndex];
        xDate.enabled = nowChecked;
    },
    function() {
        flushChangesToDisk();
        var preserveScrollPosition = true;
        refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
    }
);

var MASTER_CHECKBOX_CONFIG__T_DATES = newMasterCheckbox(
    "t-date-checkbox",
    "t_date_checkbox",
    "Enable/Disable all T-Dates",
    function(rowIndex, nowChecked) {
        var currentIsoEvent = getCurrentIsoEvent();
        var tDate = currentIsoEvent.t_dates[rowIndex];
        tDate.enabled = nowChecked;
    },
    function() {
        flushChangesToDisk();
        var preserveScrollPosition = true;
        refreshXDates(REFRESH_TYPE__HARD, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
    }
);

function serializedFieldMasterCheckboxConfig_onChildNowCheckedOrNot(index, nowChecked, masterCheckboxConfig) {
    var serializedFieldArray = masterCheckboxConfig == MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS ? SERIALIZED_FILTER_FIELDS : SERIALIZED_CHART_OPTION_FIELDS;
    var ithFilterField = serializedFieldArray[index];

    var currentIsoEvent = getCurrentIsoEvent();
    var wasAlreadyChecked = currentIsoEvent[ithFilterField.serializationKey] ? true: false;
    currentIsoEvent[ithFilterField.serializationKey] = nowChecked;

    if ( wasAlreadyChecked != nowChecked ) {
        appState.justChangedField[ithFilterField.varName] = true;
    }
}

function serializedFieldMasterCheckboxConfig_onMasterCheckboxChangeComplete() {

    var currentIsoEvent = getCurrentIsoEvent();

    removeAllDisplayedToolTips();

    flushChangesToDisk();

    var preserveScrollPosition = false;

    var forceInputChange = false;

    var showCartField = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART");
    var isShowChartFieldChecked = currentIsoEvent[showCartField.serializationKey] ? true : false;
    var didShowChartFieldJustChange = appState.justChangedField[showCartField.varName] ? true : false;
    
    if ( didShowChartFieldJustChange && isShowChartFieldChecked ) {
        // Be a bit sloppy here, and pretend that input changed just so the chart draws itself with fresh output when first shown.
        forceInputChange = true;
    } else {
        forceInputChange = false;
    }

    refreshXDates(REFRESH_TYPE__SOFT, preserveScrollPosition, forceInputChange ? OPHIS_INPUT_CHANGE__FORCE : OPHIS_INPUT_CHANGE__CHANGED);
}

var MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS = newMasterCheckbox(
    "iso-event-filter-checkbox",
    "iso_event_filter_checkbox",
    "Enable/Disable all Filters",
    function(index, nowChecked) {
        serializedFieldMasterCheckboxConfig_onChildNowCheckedOrNot(index, nowChecked, MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS);
    },
    serializedFieldMasterCheckboxConfig_onMasterCheckboxChangeComplete
);

var MASTER_CHECKBOX_CONFIG__CHART_OPTIONS = newMasterCheckbox(
    "iso-event-chart-option-checkbox",
    "iso_event_chart_option_checkbox",
    "Enable/Disable all Chart Options",
    function(index, nowChecked) {
        serializedFieldMasterCheckboxConfig_onChildNowCheckedOrNot(index, nowChecked, MASTER_CHECKBOX_CONFIG__CHART_OPTIONS);
    },
    serializedFieldMasterCheckboxConfig_onMasterCheckboxChangeComplete
);

var MASTER_CHECKBOX_CONFIG__OPERATIONS = newMasterCheckbox(
    "operation-checkbox",
    "operation_checkbox",
    "Enable/Disable all Operations",
    function(rowIndex, nowChecked) {
        var currentIsoEvent = getCurrentIsoEvent();
        var operation = currentIsoEvent.operations[rowIndex];
        operation.enabled = nowChecked;
    },
    function() {
        flushChangesToDisk();
        var preserveScrollPosition = false;
        refreshXDates(REFRESH_TYPE__RIGHT_PANEL_ONLY, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);
    }
);

var MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP = newMasterCheckbox(
    "iso-event-swap-checkbox",
    "iso_event_swap_checkbox",
    "Enable/Disable all Destination Iso-Events",
    function(rowIndex, nowChecked) {
        var targetIsoEvent = appState.isoEvents[rowIndex];
        targetIsoEvent.checked_for_swap_target = nowChecked;
    },
    function() {
        // flushChangesToDisk();
        // var preserveScrollPosition = false;
        // refreshXDates(REFRESH_TYPE__RIGHT_PANEL_ONLY, preserveScrollPosition, OPHIS_INPUT_CHANGE__CHANGED);

        refreshIsoEventSwapRows();
        refreshMasterCheckboxBasedOnChildChange(MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.baseElemId, MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP.baseClassName);
    }
);

var MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING = newMasterCheckbox(
    "iso-event-swap-setting-checkbox",
    "iso_event_swap_setting_checkbox",
    "Enable/Disable all Settings",
    function(rowIndex, nowChecked) {
        var currentSwapSetting = ISO_EVENT_DATA_TRANSFERS[rowIndex];
        currentSwapSetting.checkboxEnabled = nowChecked;
    },
    function() {
        refreshIsoEventSwapRows();
        refreshMasterCheckboxBasedOnChildChange(MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING.baseElemId, MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING.baseClassName);
    }
);

var MASTER_CHECKBOX_CONFIGS = [
    MASTER_CHECKBOX_CONFIG__X_DATES,
    MASTER_CHECKBOX_CONFIG__T_DATES,
    MASTER_CHECKBOX_CONFIG__ISO_EVENT_FILTERS,
    MASTER_CHECKBOX_CONFIG__CHART_OPTIONS,
    MASTER_CHECKBOX_CONFIG__OPERATIONS,
    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP,
    MASTER_CHECKBOX_CONFIG__ISO_EVENT_SWAP_SETTING
];