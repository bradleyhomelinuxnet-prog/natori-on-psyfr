

function getRecenterChartButton() {
    return document.getElementById("recenter-chart-button");
}

function hideChartElem() {
    // getChartElem().style.visibility = "hidden";
    getChartElem().style.opacity = 0;
}

function showChartElem() {
    // getChartElem().style.visibility = "visible";

    if ( appState.latestResults && appState.latestResults.stale === true ) {
        getChartElem().style.opacity = OPACITY__DISABLED;
    } else {
        getChartElem().style.opacity = 1;
    }
}


function showChartError(results, errorMessage, statusOnly = false) {
    hideChartElem();

    getChartErrorMessageWrapperElem().style.display = "table";

    if ( statusOnly ) {
        getChartErrorMessageElem().classList.remove("error_color");
        getChartErrorMessageElem().innerHTML = errorMessage;
    } else {
        getChartErrorMessageElem().classList.add("error_color");
        getChartErrorMessageElem().innerHTML = errorMessage;
    }

    var chart = appState.chart;
    
    chart.data.labels = [];
    chart.data.datasets = [];
    
    if ( statusOnly == false ) {
        updateChart();

        refreshZoomRelatedUi(results);
    }
}

function hideChartError() {
    showChartElem();
    if ( getChartErrorMessageWrapperElem() ) {
        getChartErrorMessageWrapperElem().style.display = "none";
    }
}

function recenterChart() {
    var chart = appState.chart;

    if ( chart ) {
        chart.resetZoom("none");
    }
    
    // updateChartDatasets(appState.latestResults);
}

function doChartInitialSetup() {
    getRecenterChartButton().addEventListener("click", function() {
        allowChartFlushToDisk();
        recenterChart();
    });

    // getChartElem().addEventListener("mouseover", function() {
    //     getChartElem().style.cursor = "grab";
    // });

    // getChartElem().addEventListener("mousedown", function() {
    //     getChartElem().style.cursor = "grabbing";
    // });

    // getChartElem().addEventListener("mouseup", function() {
    //     getChartElem().style.cursor = "grab";
    // });

    getChartElem().addEventListener("dblclick", function() {
        allowChartFlushToDisk();
        recenterChart();
    });

    let chartClicked = false;

    var invalidCoord = Number.MAX_SAFE_INTEGER;

    var mouseDownPoint = new GeoPoint();
    var mouseUpPoint = new GeoPoint();

    getChartElem().addEventListener('mousedown', function(e) {
        allowChartFlushToDisk();
        mouseDownPoint.set(e.clientX, e.clientY);
    });
    // getChartElem().addEventListener('mousemove', function(e) {
    //     chartClicked = false;
    // });
    getChartElem().addEventListener('mouseup', function(e) {
        allowChartFlushToDisk();
        mouseUpPoint.set(e.clientX, e.clientY);

        var distanceBetween = mouseDownPoint.calcDistanceTo(mouseUpPoint);

        var chartClicked = distanceBetween <= 5;

        if( chartClicked == true) {
            var isClick = true;
            doChartHitTests(appState.chart, e, isClick);
        }

        mouseDownPoint.set(invalidCoord, invalidCoord);
        mouseUpPoint.set(invalidCoord, invalidCoord);
    });
}

function isChartNotCentered() {
    var chart = appState.chart;

    return chart.isZoomedOrPanned();
}

function refreshZoomRelatedUi(results) {
    var chart = appState.chart;
    var recenterZoomButton = getRecenterChartButton();

    var isChartZoomedOrPanned = isChartNotCentered();
    var currentIsoEvent = getCurrentIsoEvent();

    if ( isChartZoomedOrPanned ) {
        currentIsoEvent.chart_x_min = chart.scales.x.min;
        currentIsoEvent.chart_x_max = chart.scales.x.max;
        currentIsoEvent.chart_y_min = chart.scales.y.min;
        currentIsoEvent.chart_y_max = chart.scales.y.max;
    } else {
        currentIsoEvent.chart_x_min = 0;
        currentIsoEvent.chart_x_max = 0;
        currentIsoEvent.chart_y_min = 0;
        currentIsoEvent.chart_y_max = 0;
    }

    var chartHasSomethingToRender = results.processed_z_dates.length > 0;

    if ( isChartZoomedOrPanned && chartHasSomethingToRender ) {
        recenterZoomButton.disabled = false;
    } else {
        recenterZoomButton.disabled = true;
    }

    if ( getCurrentScreen() == OPHIS_SCREEN__EXPORT_X_DATES ) {
        var updateChart = false;
        var setOverflowForScrollContainers = false;
        refreshCurrentPage(REFRESH_TYPE__SOFT, results, updateChart, setOverflowForScrollContainers);
    }
}

function recenterChartIfNeeded() {
    var currentIsoEvent = getCurrentIsoEvent();

    var hasExplicitZoomWindow = false;
    if ( currentIsoEvent.chart_x_min || currentIsoEvent.chart_x_max || currentIsoEvent.chart_y_min || currentIsoEvent.chart_y_max ) {
        hasExplicitZoomWindow = true;
    }

    if ( hasExplicitZoomWindow == false ) {
        recenterChart();
    }
}

function blockChartFlushToDiskUntilUserInteraction() {
    appState.blockChartFlushToDisk = true;
}

function allowChartFlushToDisk() {
    appState.blockChartFlushToDisk = false;
}

function onZoomOrPanComplete(results) {

    // console.log("onZoomOrPanComplete(), blockFlush=" + appState.blockChartFlushToDisk);

    refreshZoomRelatedUi(results);

    if ( appState.blockChartFlushToDisk === false ) {
        // console.log("Flushing to disk in onZoomOrPanComplete()");
        flushChangesToDisk();
    } else {
        // console.log("Not flushing to disk in onZoomOrPanComplete()");
    }
}

function getChartElem() {
    return document.getElementById('timeline-chart');
}

function getChartErrorMessageElem() {
    return document.getElementById("chart-error-message");
}

function getChartErrorMessageWrapperElem() {
    return document.getElementById("chart-error-message-wrapper");
}

function clearChartHovers(callUpdateChartDatasets = true) {
    if ( appState.latestResults.highlighted_z_date_point != null || appState.latestResults.highlighted_operation_result_curve != null ) {

        appState.latestResults.highlighted_z_date_point = null;
        appState.latestResults.highlighted_operation_result_curve = null;

        if ( callUpdateChartDatasets ) {
            updateChartDatasets(appState.latestResults);
        }

        var zDateOutputRows = document.getElementsByClassName("z_date_output_row");

        for ( var i = 0; i < zDateOutputRows.length; i++ ) {
            var ithRow = zDateOutputRows[i];

            ithRow.setAttribute("chart_hover", "false");
        }

        var pillElems = document.getElementsByClassName("z_match_with_tool_tip");

        for ( var i = 0; i < pillElems.length; i++ ) {
            var ithPill = pillElems[i];

            ithPill.setAttribute("chart_hover", "false");
        }
    }
}

function setChartMousePointerToHand(trueOrFalse) {
    if ( trueOrFalse === true ) {
        getChartElem().style.cursor = "pointer";
    } else {
        getChartElem().style.cursor = "default";
    }
}

var lastChartMoveEvent = null;

function doChartHitTests(chart, event, isClick) {
    
    var position_pixels = Chart.helpers.getRelativePosition(event, chart);
    var positionX_data = chart.scales.x.getValueForPixel(position_pixels.x);
    var positionY_data = chart.scales.y.getValueForPixel(position_pixels.y);
    var mousePoint_data = new GeoPoint(positionX_data, positionY_data);

    if ( mousePoint_data.getY() < 0 && chart.date_label_points  ) {
        var labelHeight_data = Math.abs(chart.scales.y.getValueForPixel(0) - chart.scales.y.getValueForPixel(chart.date_label_points[0].height));

        // Z Date symbols are in z-order, backmost to foremost, so have to search backwards for hit testing.
        for ( var i = chart.date_label_points.length-1; i >= 0; i-- ) {
            var ithZDateLabelPoint = chart.date_label_points[i];
            var ithZDateDictKey = ithZDateLabelPoint.zDateDictKey;

            var labelWidth_data = Math.abs(chart.scales.x.getValueForPixel(0) - chart.scales.x.getValueForPixel(ithZDateLabelPoint.width));

            var xPoint = chart.scales.x.getValueForPixel(ithZDateLabelPoint.xPointPixels);
            var yPoint = ithZDateLabelPoint.yPoint;


            if ( mousePoint_data.getX() >= xPoint - labelWidth_data/2.0 && mousePoint_data.getX() <= xPoint + labelWidth_data/2.0 ) {
                if ( mousePoint_data.getY() >= yPoint - labelHeight_data/2.0 && mousePoint_data.getY() <= yPoint + labelHeight_data/2.0 ) {
                    if ( isClick === true && appState.latestResults.highlighted_z_date_point != ithZDateDictKey ) {
    
                        // Just clear any active backgrounds on Z-Date rows.
                        var callUpdateChartDatasets = false;
                        clearChartHovers(callUpdateChartDatasets);
                        
                        appState.latestResults.highlighted_z_date_point = ithZDateDictKey;
                        appState.latestResults.highlighted_operation_result_curve = null;
                        
                        updateChartDatasets(appState.latestResults);
                        
                        scrollOutputRowIntoView(ithZDateDictKey);
                    }

                    setChartMousePointerToHand(true);
                    
                    return;
                }
            }
        }
    }

    if ( chart.z_date_symbol_points ) {

        var zDateSymbolRadiusWidth_data = Math.abs(chart.scales.x.getValueForPixel(0) - chart.scales.x.getValueForPixel(Z_DATE_SYMBOL_SIZE/2.0));
        var zDateSymbolRadiusHeight_data = Math.abs(chart.scales.y.getValueForPixel(0) - chart.scales.y.getValueForPixel(Z_DATE_SYMBOL_SIZE/2.0));

        // Z Date symbols are in z-order, backmost to foremost, so have to search backwards for hit testing.
        for ( var i = chart.z_date_symbol_points.length-1; i >= 0; i-- ) {
            var ithZDateSymbolPoint = chart.z_date_symbol_points[i];
            var ithZDateDictKey = ithZDateSymbolPoint.zDateDictKey;

            var xPoint = chart.scales.x.getValueForPixel(ithZDateSymbolPoint.xPointPixels);
            var yPoint = ithZDateSymbolPoint.yPoint;
    
            if ( mousePoint_data.hitTestEclipse(xPoint, yPoint, zDateSymbolRadiusWidth_data, zDateSymbolRadiusHeight_data) <= 1 ) {
                if ( isClick === true && appState.latestResults.highlighted_z_date_point != ithZDateDictKey ) {
    
                    // Just clear any active backgrounds on Z-Date rows.
                    var callUpdateChartDatasets = false;
                    clearChartHovers(callUpdateChartDatasets);
                    
                    appState.latestResults.highlighted_z_date_point = ithZDateDictKey;
                    appState.latestResults.highlighted_operation_result_curve = null;
                    
                    updateChartDatasets(appState.latestResults);
                    
                    scrollOutputRowIntoView(ithZDateDictKey);
                }

                setChartMousePointerToHand(true);
                
                return;
            }
        }
    }

    var sortedAndFilteredZDates = appState.latestResults.processed_z_dates;
    var chartPointRadiusWidth_data = Math.abs(chart.scales.x.getValueForPixel(0) - chart.scales.x.getValueForPixel(CHART_POINT_RADIUS__Z_DATE));
    var chartPointRadiusHeight_data = Math.abs(chart.scales.y.getValueForPixel(0) - chart.scales.y.getValueForPixel(CHART_POINT_RADIUS__Z_DATE));
    
    for ( var i = 0; i < sortedAndFilteredZDates.length; i++ ) {
        var ithZDateDictKey = sortedAndFilteredZDates[i];

        if ( mousePoint_data.hitTestEclipse(parseInt(ithZDateDictKey), 0, chartPointRadiusWidth_data, chartPointRadiusHeight_data) <= 1 ) {
            if ( isClick === true && appState.latestResults.highlighted_z_date_point != ithZDateDictKey ) {

                // Just clear any active backgrounds on Z-Date rows.
                var callUpdateChartDatasets = false;
                clearChartHovers(callUpdateChartDatasets);
                
                appState.latestResults.highlighted_z_date_point = ithZDateDictKey;
                appState.latestResults.highlighted_operation_result_curve = null;
                
                updateChartDatasets(appState.latestResults);
                
                scrollOutputRowIntoView(ithZDateDictKey);
            }

            setChartMousePointerToHand(true);
            
            return;
        }
    }
    
    if ( mousePoint_data.getY() > 0 ) {
        var curveWidthToUseForHitTesting = CHART_CURVE_WIDTH__HIT_TESTING;
        var chartCurveWidthX = Math.abs(chart.scales.x.getValueForPixel(0) - chart.scales.x.getValueForPixel(curveWidthToUseForHitTesting));
        var chartCurveWidthY = Math.abs(chart.scales.y.getValueForPixel(0) - chart.scales.y.getValueForPixel(curveWidthToUseForHitTesting));
        
        for ( var i = 0; i < chart.data.datasets.length; i++ ) {
            var ithDataSet = chart.data.datasets[i];
            var ithOperationResult = ithDataSet.operation_result;
            
            if ( ithOperationResult ) {
                // continue;
            } else {
                // We made it through the curve datasets.
                break;
            }
            
            var xDateStart = ithOperationResult.x_date_native_start;
            var distanceBetween = distanceBetweenXDateAndZDate(ithOperationResult);
            var middleDateMillis = xDateStart.getTime() + distanceBetween / 2;
            
            var ellipseX = middleDateMillis;
            var ellipseY = 0;

            var curveOverlaps = false;
            
            var curveXOuter = ithDataSet.curve_x_radius + chartCurveWidthX/2;
            var curveXInner = ithDataSet.curve_x_radius - chartCurveWidthX/2;

            // Note chartCurveWidthX usage is correct here! This is the width of the chart in the "data" space.
            var curveYOuter = ithDataSet.curve_y_radius + chartCurveWidthY/2;
            var curveYInner = ithDataSet.curve_y_radius - chartCurveWidthY/2;

            if ( mousePoint_data.hitTestEclipse(ellipseX, ellipseY, curveXOuter, curveYOuter) <= 1 ) {
                if ( mousePoint_data.hitTestEclipse(ellipseX, ellipseY, curveXInner, curveYInner) >= 1 ) {
                    curveOverlaps = true;
                }
            }

            if ( curveOverlaps === true ) {
                if ( isClick === true && appState.latestResults.highlighted_operation_result_curve != ithOperationResult ) {
                    var callUpdateChartDatasets = false;
                    clearChartHovers(callUpdateChartDatasets);
                    
                    appState.latestResults.highlighted_z_date_point = ithOperationResult.z_date_dict_key;
                    appState.latestResults.highlighted_operation_result_curve = ithOperationResult;
                    
                    // console.log("curve match");
                    updateChartDatasets(appState.latestResults);
                    
                    var rowElement = scrollOutputRowIntoView(ithOperationResult.z_date_native_start.getTime()+"");

                    // debugger;
                    
                    if ( rowElement ) {
                        var pillElems = rowElement.getElementsByClassName("z_match_with_tool_tip");

                        for ( var i = 0; i < pillElems.length; i++ ) {
                            var ithPillElem = pillElems[i];
                            
                            if ( ithPillElem.getAttribute("operation_result_hash") == ithOperationResult.hash) {
                                ithPillElem.setAttribute("chart_hover", "true");
                            }
                            
                            ithPillElem.scrollIntoView({behavior: "smooth", block:"center", inline:"start"});
                        }
                    }
                }

                setChartMousePointerToHand(true);
                
                return;
            }
        }
    }
    
    setChartMousePointerToHand(false);

    if ( isClick === true ) {
        clearChartHovers();
    }
}

function scrollOutputRowIntoView(zDateDictKey) {
    if ( getCurrentScreen() == OPHIS_SCREEN__Z_DATES ) {
        var zDateOutputRows = document.getElementsByClassName("z_date_output_row");

        for ( var i = 0; i < zDateOutputRows.length; i++ ) {
            var ithRow = zDateOutputRows[i];

            if ( ithRow.getAttribute("z_date_key") == zDateDictKey ) {
                ithRow.scrollIntoView({behavior: "smooth", block:"center", inline:"start"});
                ithRow.setAttribute("chart_hover", "true");

                return ithRow;
            }
        }
    }

    return null;
}

function drawXAxis(chart) {
    var xAxisYPos = chart.scales.y.getPixelForValue(0);

    var drawContext = chart.canvas.getContext("2d");

    drawContext.fillStyle = "white";
    drawContext.fillRect(0, 0, chart.canvas.width, chart.canvas.height);

    drawContext.strokeStyle = "black";
    drawContext.setLineDash([]);
    drawContext.lineWidth = 2;
    drawContext.beginPath();
    drawContext.moveTo(0, xAxisYPos);
    drawContext.lineTo(chart.canvas.width, xAxisYPos);
    drawContext.stroke();
}

function doBeforeOrAfterDraw() {
    if ( shouldHideChart(getCurrentIsoEvent()) === false ) {
        return true;
    } else {
        return false;
    }
}

function newChart() {

    return new Chart(
        getChartElem(),
        {
            plugins: [{
                id: 'customDrawing',

                // beforeDraw() and afterDraw() get called even if the chart is hidden/disabled.
                beforeDraw: (chart) => {
                    if ( doBeforeOrAfterDraw() ) {
                        drawXAxis(chart);
                    }
                },
                afterDraw: (chart) => {
                    if ( doBeforeOrAfterDraw() ) {
                        drawZDateSymbols(chart);
                        drawRulers(chart);
                        drawDateLabels(chart);
                        drawAstroIndicators(chart);
                    }
                }
            }, {
                id: 'eventPlugin',
                afterEvent(chart, args, opts) {
                    //  Tricky to use standard mouse leave events on the element, since onHover is called
                    // afterwards. So, could put a timeout in the standard mouse leave event, but seems sloppy.
                    // Suppose could also put events on the chart container parent. We'll see how this method stands up.
                    if ( args.event.type == "mouseleave" ) {
                        // clearChartHovers();
                    }
                }
            }],
            type: 'line',
            data: {
            },
            options: {
                events: ['mousemove', 'mouseleave'],
                onHover: function(event, items) {
                    if ( event.type == "mousemove" ) {
                        var isClick = false;
                        doChartHitTests(event.chart, event, isClick);
                    } else {
                        // clearChartHovers();
                    }
                },
                layout: {
                    // Needed because the last Z-Date point label like Z10 (with two digits) might slightly go out of bounds when centered.
                    padding: {
                        right:18,
                        // left: 18,
                    }
                    // padding:-100
                },
                
                // Turn off hover and intersect as commented out below, in order to disable internal hit testing (probably).
                // However when I try to e.g. change point radius myself without pointHoverRadius, the chart jumps around.
                // So need to let chartjs do it, which means enabling internal hit testing even though not otherwise needed.
                interactions: {
                    mode:  null,
                    // intersect: false,
                },
                hover: {
                    // mode: null
                },
                onResize: function(chart) {
                    // console.log("RESIZE");
                    
                    if ( appState.chart && appState.latestResults ) {
                    }
                },
                responsive: true,
                normalized: true,

                // has to be greater than zero, otherwise resize glitching can occur.
                // see recenterChartOnStartup() for case to reproduce this.
                resizeDelay: 5,
                animation: false,
                maintainAspectRatio: false,
                elements: {
                    point:{
                    },
                    line: {
                    }
                },
                plugins: {
                    eventPlugin: {
                        events: ['mouseleave']
                    },
                    tooltip: {
                        enabled: false
                    },
                    datalabels: {
                        align: function() {
                            return "bottom";
                        },
                        formatter: function(value, context) {
                            if ( context.dataset.date_label ) {
                                return context.dataset.date_label;
                            } else {
                                return null;
                            }
                        },
                        font: {
                            weight: 'normal',
                            size: CHART_DATE_LABEL_FONT_SIZE
                        },
                        labels: {
                            title: {
                                
                            },

                            usePointStyle: true,
                            
                            value: {
                                color: 'black'
                            }
                        }
                    },
                    legend: {
                        display: false
                    },
                    zoom: {
                        transitions: {
                            zoom: {
                                animation: {
                                    duration: 10000,
                                    easing: 'easeOutCubic'
                                },
                            }
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: .05
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy',
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                    //   title: {
                    //     display: true,
                    //     text: 'Axis Center Positioning'
                    //   }
                },
                scales: {
                    x: {
                        display: function() {
                            var currentIsoEvent = getCurrentIsoEvent();
                            var field = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_DATES");

                            var hideFromGlobalOptions = appState.globalOptions[GLOBAL_OPTION__HIDE_COL__DATES] === true

                            if ( currentIsoEvent[field.serializationKey] === true && hideFromGlobalOptions === false ) {
                                return true;
                            } else {
                                return false;
                            }
                        },
                        // border: {
                        //     color: "black"
                        // },
                        ticks: {
                            // padding:100,
                            beginAtZero: true,
                            sampleSize: 1,
                            // display: false
                            minRotation: 45,
                            maxRotation: 45,
                            font: {
                                size: CHART_TIMESTAMP_FONT_SIZE
                            }
                        },
                        grid: {
                            // display: false,
                            lineWidth: CHART_GRID_LINE_WIDTH
                        },
                        type: 'time',
                        adapters: {
                            date: {
                                zone: 'Etc/GMT'
                            }
                        },
                        time: {
                            // unit: 'day',
                            minUnit: 'day',
                            // minUnit: 'hour',
                            stepSize:100,
                            // displayFormats: {
                            //     day: CHART_DATE_FORMAT
                            // },
                            displayFormats: {
                                // day: "MM-DD-YY", // format required for moment, all caps.
                                day: "MM-dd-yy" // // format required for luxon, only month in caps, :shrug:
                            },
                        }
                    },
                    y: {
                        // afterFit: scale => {
                            // scale.paddingTop -= 100
                            // scale.paddingBotom -= 3
                        // },
                        
                        position:"left",
                        ticks: {
                            // beginAtZero: true,
                            padding:0,
                            display: false,
                            // count: 100,
                            // stepSize: MILLIS_PER_DAY,
                            // steps: 100,
                            // autoSkip: false
                             maxTicksLimit: 100,
                        },
                        grid: {
                            display: false,
                            lineWidth: 0,
                        },
                        // min: -100,
                        // max: 100,
                    }
                }
            }
        }
    );
}

function distanceBetweenXDateAndZDate(operationResult) {
    var xDateStart = operationResult.x_date_native_start;
    var zDate = operationResult.z_date_native_start;
    var distanceBetween = zDate.getTime() - xDateStart.getTime();

    return distanceBetween;
}

function shouldHideChart(currentIsoEvent) {
    var showChartField = getIsoEventField("SERIALIZED_FIELD__CHART_OPTION__SHOW_CHART");
    var hideChartCompletely = currentIsoEvent[showChartField.serializationKey] === false;

    return hideChartCompletely;
}

var sLastIsoEvent = null;
var sLastChartRefreshTimeoutId = -1;

function updateChartDatasets(results) {

    clearTimeout(sLastChartRefreshTimeoutId)
    
    var lastIsoEventLocal = sLastIsoEvent;
    var currentIsoEvent = getCurrentIsoEvent();
    sLastIsoEvent = currentIsoEvent;
    var isDifferentIsoEvent = currentIsoEvent != lastIsoEventLocal;
    var chart = appState.chart;

    if ( isDifferentIsoEvent ) {
        if ( chart ) {
            chart.destroy();
        }

        chart = newChart();
        appState.chart = chart;
    }

    hideChartError();

    if ( shouldHideChart(currentIsoEvent) === true ) {
        var statusOnly = true;
        showChartError(appState.latestResults, "Chart Hidden", statusOnly);
        return;
    }

    var temporarilyHideChart = isDifferentIsoEvent || appState.justFixedErrors;

    if ( temporarilyHideChart ) {
        var statusOnly = true;
        showChartError(appState.latestResults, "Loading...", statusOnly);
        // hideChartElem();
    }

    if ( currentIsoEvent.scope == EVENT_SCOPE__HH_MM ) {
        var timezone = getTimezone(currentIsoEvent.lat, currentIsoEvent.long);
        chart.options.scales.x.adapters.date.zone = timezone;
    } else {
        if ( currentIsoEvent.scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) {
            chart.options.scales.x.adapters.date.zone = getTimezone(0, 0);
        } else {
            chart.options.scales.x.adapters.date.zone = null;
        }
    }

    chart.options.plugins.zoom.zoom.onZoomComplete = debounce(function() {
        // console.log("onZoomComplete()");
        
        // console.log("onZoomComplete() debounced");
        // console.trace();
        // updateChartDatasets(results);

        onZoomOrPanComplete(results);
    });

    chart.options.plugins.zoom.zoom.onPreZoomComplete = function() {
    }

    // It appears that onPreZoom and onZoom only get called from an actual scroll wheel zoom.
    chart.options.plugins.zoom.zoom.onPreZoom = function() {
        allowChartFlushToDisk();
    }
    chart.options.plugins.zoom.zoom.onZoom = function() {
        allowChartFlushToDisk();
        refreshZoomRelatedUi(results);
    }

    chart.options.plugins.zoom.pan.onPanComplete = function() {
        // console.log("onPanComplete() debounced");
        // console.trace();

        onZoomOrPanComplete(results);
    }

    chart.options.plugins.zoom.pan.onPan = function() {
        refreshZoomRelatedUi(results);
    }

    var errors = results.errors;
    
    if ( errors.length > 0 ) {
        showChartError(results, "Please fix errors in order to render chart.");
        return;
    }
    
    var chart = appState.chart;

    var sortedAndFilteredZDates = results.processed_z_dates;

    if ( sortedAndFilteredZDates.length == 0 ) {
        showChartError(results, NO_RESULTS_MESSAGE__FILTER_TOO_TIGHT);
        return;
    }
    
    var chartUpdateStruct = generateChartUpdateStruct(chart, results);

    chart.data.datasets = chartUpdateStruct.datasets;
    chart.astronomical_points = chartUpdateStruct.astronomical_points;
    chart.z_date_symbol_points = chartUpdateStruct.z_date_symbol_points;
    chart.date_label_points = chartUpdateStruct.date_label_points;
    // chart.x_date_points = chartUpdateStruct.x_date_points;
    // chart.z_date_points = chartUpdateStruct.z_date_points;

    chart.scales.x.min = chartUpdateStruct.x_min;
    chart.scales.x.max = chartUpdateStruct.x_max;

    updateChart();

    if ( isDifferentIsoEvent ) {
        var animationMode = "none";

        if ( currentIsoEvent.chart_x_min || currentIsoEvent.chart_x_max ) {
            chart.zoomScale("x", {min: currentIsoEvent.chart_x_min, max: currentIsoEvent.chart_x_max}, animationMode);
        }

        if ( currentIsoEvent.chart_y_min || currentIsoEvent.chart_y_max ) {
            chart.zoomScale("y", {min: currentIsoEvent.chart_y_min, max: currentIsoEvent.chart_y_max}, animationMode);
        }
        
        /**
         * {@link onZoomOrPanComplete()} isn't called by {@link Chart.zoomScale()}, unlike some of its other functions,
         * so have to invoke the refresh ourselves.
         */
        refreshZoomRelatedUi(results); 

        updateChart();
    } else {
        if ( appState.justFixedErrors ) {
            recenterChart();
        }
    }

    if ( temporarilyHideChart ) {
        // Add a slight delay because with extreme curve situations the chart is still jumping a bit.
        sLastChartRefreshTimeoutId = setTimeout(function() {
            hideChartError();
            showChartElem();
        }, 500)
    }
}

function updateChart() {
    // console.log("updateChart() called.");
    if ( appState.chart ) {
        appState.chart.update();
    }
}