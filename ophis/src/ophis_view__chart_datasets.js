

function getNormalizedSolarEclipseType(eclipseObject) {
    var eclipseTypeFromNasa = eclipseObject["eclipse_type"];

    if ( eclipseTypeFromNasa.startsWith("P") ) { // Partial Eclipse
        return SOLAR_ECLIPSE_TYPE__PARTIAL;
    } else if ( eclipseTypeFromNasa.startsWith("A") ) { // Annular Eclipse
        return SOLAR_ECLIPSE_TYPE__FULL;
    } else if ( eclipseTypeFromNasa.startsWith("T") ) { // Total Eclipse
        return SOLAR_ECLIPSE_TYPE__FULL;
    } else if ( eclipseTypeFromNasa.startsWith("H") ) { // Hybrid Eclipse
        return SOLAR_ECLIPSE_TYPE__FULL;
    } else {
        return null;
    }
}

function getNormalizedLunarEclipseType(eclipseObject) {
    var eclipseTypeFromNasa = eclipseObject["eclipse_type"];

    if ( eclipseTypeFromNasa.startsWith("P") ) { // Partial Eclipse
        return LUNAR_ECLIPSE_TYPE__PARTIAL;
    } else if ( eclipseTypeFromNasa.startsWith("T") ) { // Total Eclipse
        return LUNAR_ECLIPSE_TYPE__FULL;
    } else {
        return null;
    }
}

function newChartPoint(x, y) {
    return {x: x, y: y};
}


function binarySearchForEclipse(eclipseArray, xDateOrZDateInMillis) {

    let start = 0, end = eclipseArray.length - 1;

    // Iterate while start not meets end
    while (start <= end) {
        // Find the mid index
        let mid = Math.floor((start + end) / 2);

        var ithDateInMillisOfPriorMidnight = eclipseArray[mid].date_millis;

        if ( xDateOrZDateInMillis >= ithDateInMillisOfPriorMidnight-ECLLIPSE_DATE_MATCH_TOLERANCE && xDateOrZDateInMillis <= ithDateInMillisOfPriorMidnight+ECLLIPSE_DATE_MATCH_TOLERANCE ) {
            return eclipseArray[mid];
        } else if (eclipseArray[mid].date_millis < xDateOrZDateInMillis) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }

    return null;
}

function drawRuler(chart, drawContext, xStart, xEnd, yLow, yHigh, label) {

    // nudge the dashed line and text just a bit over the red curve.
    yHigh -= CHART_CURVE_WIDTH__INDIVIDUAL_HIGHLIGHTING/2.0 + 2;

    drawContext.setLineDash([]);
    drawContext.strokeStyle = "black";
    drawContext.lineWidth = 2;
    drawContext.beginPath();
    drawContext.moveTo(xStart, yLow);
    drawContext.lineTo(xStart, yHigh - 10);
    drawContext.moveTo(xEnd, yHigh - 10);
    drawContext.lineTo(xEnd, yLow);
    drawContext.stroke();

    drawContext.setLineDash([5, 5]);
    drawContext.beginPath();
    drawContext.moveTo(xStart, yHigh);
    drawContext.lineTo(xEnd, yHigh);
    drawContext.stroke();

    var labelX = xStart + (xEnd - xStart)/2.0;

    var chartStart = chart.scales.x.getPixelForValue(chart.scales.x.min);
    var chartEnd = chart.scales.x.getPixelForValue(chart.scales.x.max);
    var labelWillBeOffScreenRight = xEnd > chartEnd;
    var labelWillBeOffScreenLeft = xStart < chartStart;

    if ( labelWillBeOffScreenRight && labelWillBeOffScreenLeft ) {
        labelX = chartStart + (chartEnd - chartStart)/2.0;
    } else if ( labelWillBeOffScreenRight ) {
        labelX = xStart + (chartEnd - xStart)/2.0
    } else if ( labelWillBeOffScreenLeft ) {
        labelX = chartStart + (xEnd - chartStart)/2.0
    }

    var labelWidth = drawContext.measureText(label).width;
    var labelHeight = CHART_RULER_LABEL_FONT_SIZE;

    var rulerLabelPadding = CHART_DATE_LABEL_PADDING*2;

    drawContext.lineWidth = 3;
    drawContext.setLineDash([]);
    drawContext.fillStyle = "white";
    drawContext.strokeStyle = "black";
    drawContext.beginPath();
    drawContext.roundRect(labelX-labelWidth/2.0 - rulerLabelPadding, yHigh - labelHeight/2.0 - rulerLabelPadding-1, labelWidth + rulerLabelPadding*2, labelHeight + rulerLabelPadding*2, 2);
    drawContext.stroke();
    drawContext.fill();

    // nudge text just a bit down.
    // yHigh += 1;


    drawContext.fillStyle = "black";
    drawContext.fillText(label, labelX, yHigh);
}

function getSymbolAxisOffset(zDateTags) {

    var operationMatchStructs = zDateTags.operation_match_structs

    var offsetInMillis = 0;

    var radiusMultiplier = .8;
    
    if ( operationMatchStructs.length == 1 ) {
        offsetInMillis = operationMatchStructs[0].operation_result.rotation_count_z/2.0;
        offsetInMillis *= radiusMultiplier;
    } else {
        var highestYRadius = 0;

        for ( var i = 0; i < operationMatchStructs.length; i++ ) {
            var ithYRadius = operationMatchStructs[i].operation_result.rotation_count_z/2.0;
            
            if ( ithYRadius > highestYRadius ) {
                highestYRadius = ithYRadius;
            }
        }

        offsetInMillis = highestYRadius * radiusMultiplier;
    }

    offsetInMillis *= MILLIS_PER_DAY;

    return offsetInMillis;
}

function generateZDateSymbolDatasets() {

    var toReturn = [];

    var results = appState.latestResults;
    var sortedAndFilteredZDates = deepClone(results.processed_z_dates);
    var zStructsDict = results.z_structs;

    // Shouldn't need to sort them anymore. They bounce off each other like balloons now.
    // sortedAndFilteredZDates.sort(function(a, b) {
    //     var ithZDateTags_a = zStructsDict[a];
    //     var ithZDateTags_b = zStructsDict[b];

    //     if ( ithZDateTags_a.hit_count == ithZDateTags_b.hit_count ) {
    //         return parseInt(a) > parseInt(b) ? -1 : 1;
    //     } else {
    //         return ithZDateTags_a.hit_count > ithZDateTags_b.hit_count ? 1 : -1;
    //     }
    // });

    for ( var i = 0; i < sortedAndFilteredZDates.length; i++ ) {
        var ithZDateDictKey = sortedAndFilteredZDates[i];
        var ithZDateTags = zStructsDict[ithZDateDictKey];

        if ( ithZDateTags.hit_count > 1 ) {

            var hitCountEnum = getHitCountSymbolImage(ithZDateTags.hit_count, /*srcOnly=*/false);
            var image = CHART_IMAGES[hitCountEnum];

            // Can be 0 for now. getSymbolAxisOffset() will be called at draw time.
            var xAxisOffsetInMillis = 0;//getSymbolAxisOffset(ithZDateTags);

            var newZDateSymbol = newZDateSymbolPoint(parseInt(ithZDateDictKey), xAxisOffsetInMillis, image, ithZDateDictKey, ithZDateTags);

            toReturn.push(newZDateSymbol);
        }
    }

    return toReturn;
}

function generateDateLabelDatasets(chart, xDatePointDataSets) {

    var drawContext = chart.canvas.getContext("2d");
    drawContext.font = CHART_DATE_LABEL_FONT_SIZE + "px Arial";

    var toReturn = [];

    var results = appState.latestResults;
    var sortedAndFilteredZDates = results.processed_z_dates;
    var zStructsDict = results.z_structs;

    for ( var i = 0; i < xDatePointDataSets.length; i++ ) {
        var ithXDatePoint = xDatePointDataSets[i];
        var ithXOrdinal = ithXDatePoint.ordinal;

        // Don't think this really matter anymore.
        var xAxisOffsetInMillis = 0;

        var labelMetrics = drawContext.measureText(ithXOrdinal);

        var newXDateLabelPoint = newDateLabelPoint(ithXDatePoint.xPoint, xAxisOffsetInMillis, X_DATE_SHORTHAND, ithXOrdinal, labelMetrics.width, CHART_DATE_LABEL_FONT_SIZE);

        toReturn.push(newXDateLabelPoint);
    }

    for ( var i = 0; i < sortedAndFilteredZDates.length; i++ ) {
        var ithZDateDictKey = sortedAndFilteredZDates[i];
        var ithZDateTags = zStructsDict[ithZDateDictKey];
        var ithZOrdinal = ithZDateTags.z_ordinal + 1;

        // Don't think this really matter anymore.
        var xAxisOffsetInMillis = 0;

        var labelMetrics = drawContext.measureText(ithZOrdinal);

        var newZDateLabelPoint = newDateLabelPoint(parseInt(ithZDateDictKey), xAxisOffsetInMillis, Z_DATE_SHORTHAND, ithZOrdinal, labelMetrics.width, CHART_DATE_LABEL_FONT_SIZE, ithZDateDictKey, ithZDateTags);

        toReturn.push(newZDateLabelPoint);
    }

    return toReturn;
}

function testRangeOverlap(x1, x2, y1, y2) {
    return (x1 >= y1 && x1 <= y2) ||
    (x2 >= y1 && x2 <= y2) ||
    (y1 >= x1 && y1 <= x2) ||
    (y2 >= x1 && y2 <= x2);
}

function hitTestSingularEntities(ithEntity, kthEntity, ithHitRadius, kthHitRadius) {
    var ithXPosInPixels = ithEntity.xPointPixels;
    var kthXPosInPixels = kthEntity.xPointPixels;

    return hitTestPoints(ithXPosInPixels, kthXPosInPixels, ithHitRadius, kthHitRadius);
}

function hitTestPoints(ithXPosInPixels, kthXPosInPixels, ithHitRadius, kthHitRadius) {

    var x1 = (ithXPosInPixels - ithHitRadius);
    var x2 = (ithXPosInPixels + ithHitRadius);
    var y1 = (kthXPosInPixels - kthHitRadius);
    var y2 = (kthXPosInPixels + kthHitRadius);

    if ( Math.max(x1,y1) <= Math.min(x2,y2) ) {
    // if ( testRangeOverlap(x1, x2, y1, y2) ) {
        return true;
    } else {
        return false;
    }
}

function organizeEntitiesIntoCollisionGroups(entities, resetXPointPixels, hitTest) {

    for ( var i = 0; i < entities.length; i++ ) {
        var ithEntity = entities[i];

        ithEntity.overlaps = [];
        ithEntity.visited = false;

        if ( resetXPointPixels ) {
            resetXPointPixels(ithEntity);
        }
    }

    for ( var i = 0; i < entities.length; i++ ) {
        var ithEntity = entities[i];

        for ( var k = i+1; k < entities.length; k++ ) {
            var kthEntity = entities[k];

            if ( hitTest(ithEntity, kthEntity) ) {
                ithEntity.overlaps.push(kthEntity);
                kthEntity.overlaps.push(ithEntity);
            }
        }
    }

    function visitEntity(symbol, group) {
        for ( var i = 0; i < symbol.overlaps.length; i++ ) {
            var ithOverlap = symbol.overlaps[i];

            if ( ithOverlap.visited === false ) {
                ithOverlap.visited = true;
                group.push(ithOverlap);

                visitEntity(ithOverlap, group);
            }
        }
    }

    var symbolGroups = [];

    for ( var i = 0; i < entities.length; i++ ) {
        var ithEntity = entities[i];

        if ( ithEntity.visited === false ) {
            ithEntity.visited = true;

            var newGroup = [];
            newGroup.push(ithEntity);
            symbolGroups.push(newGroup);

            visitEntity(ithEntity, newGroup);
        }
    }

    return symbolGroups;
}

function drawDateLabel(chart, dateShorthand, dateOrdinal, xPosInPixels, yPosInPixels, width, height, fontSize, highlighted = false) {
    height += 1;

    var drawContext = chart.canvas.getContext("2d");

    var ithWidthForDrawing = width - CHART_DATE_LABEL_SPACING*2 - CHART_DATE_LABEL_PADDING*2;

    var isZDate = dateShorthand == Z_DATE_SHORTHAND;

    drawContext.lineWidth = 3;
    drawContext.setLineDash([]);
    drawContext.fillStyle = isZDate ? "grey" : "white";
    drawContext.strokeStyle = isZDate && highlighted ? CHART_CURVE_COLOR__GROUP_HIGHLIGHTING : "black";
    drawContext.beginPath();
    drawContext.roundRect(xPosInPixels-ithWidthForDrawing/2.0 - CHART_DATE_LABEL_PADDING, yPosInPixels - height/2.0 - CHART_DATE_LABEL_PADDING-1, ithWidthForDrawing+CHART_DATE_LABEL_PADDING*2, height, 2);
    drawContext.stroke();
    drawContext.fill();

    drawContext.fillStyle = isZDate ? (highlighted ? CHART_CURVE_COLOR__GROUP_HIGHLIGHTING : "white") : "black";
    drawContext.font = fontSize + "px Arial";
    drawContext.fillText(dateOrdinal, xPosInPixels, yPosInPixels);
}

function drawDateLabels(chart) {
    if( chart.date_label_points ) {

        var drawContext = chart.canvas.getContext("2d");
        var xAxisYPos = chart.scales.y.getPixelForValue(0);

        drawContext.textAlign = "center";
        drawContext.textBaseline = "middle";
        // var shorthandMetrics = drawContext.measureText(dateTypeShorthand);

        function resetXPointPixels(ithEntity) {
            ithEntity.xPointPixels = chart.scales.x.getPixelForValue(ithEntity.xPoint);
            ithEntity.xPointPixelsOrig = ithEntity.xPointPixels;
        }

        function hitTest(ithEntity, kthEntity) {
            var toReturn = hitTestSingularEntities(ithEntity, kthEntity, ithEntity.width/2.0, kthEntity.width/2.0);

            return toReturn;
        }

        // Do an initial spread of the symbols.
        var previousSymbolGroups = organizeEntitiesIntoCollisionGroups(chart.date_label_points, resetXPointPixels, hitTest);
        // debugger;
        spreadZDateSymbols(previousSymbolGroups);

        var MAX_SPREAD_ITERATIONS = 10;
        var resetXPointPixelsNull = null;
        for ( var i = 0; i < MAX_SPREAD_ITERATIONS; i++ ) {
            var currentSymbolGroups = organizeEntitiesIntoCollisionGroups(chart.date_label_points, resetXPointPixelsNull, hitTest);
            // debugger;
            spreadZDateSymbols(currentSymbolGroups);

            if ( areSymbolGroupsEqual(previousSymbolGroups, currentSymbolGroups) ) {
                // console.log("ITERATIONS: " + i);
                break;
            } else {
                previousSymbolGroups = currentSymbolGroups;
            }
        }
        
        for ( var i = 0; i < chart.date_label_points.length; i++ ) {
            var ithDateLabelPoint = chart.date_label_points[i];
            var isXDate = ithDateLabelPoint.date_shorthand == X_DATE_SHORTHAND;

            var xAxisOffset = xAxisYPos;

            var xPosInPixels = ithDateLabelPoint.xPointPixels;
            var xPosInPixelOrig = chart.scales.x.getPixelForValue(ithDateLabelPoint.xPoint);

            var yPosInPixels = xAxisYPos + CHART_DATE_LABEL_PIXEL_OFFSET_FROM_X_AXIS;
            // var yPosInPixels = -20;

            if( chart.astronomical_points.length == 0 ) {
                yPosInPixels += CHART_DATE_LABEL_PIXEL_OFFSET_FROM_X_AXIS*.5;
            }
        
            ithDateLabelPoint.yPoint = chart.scales.y.getValueForPixel(yPosInPixels);
            ithDateLabelPoint.yPointPixels = yPosInPixels;

            var dashed = false;
            var lineWidthForTick = 3;
            var tickLength = 7;
            var tickOffset = isXDate ? - tickLength : tickLength;
            drawIndicatorLine(drawContext, xPosInPixelOrig, xAxisYPos+tickOffset, xPosInPixelOrig, xAxisYPos, dashed, dashStyle, lineWidthForTick);

            dashed = true;

            if ( ithDateLabelPoint.zDateDictKey && (appState.latestResults.highlighted_z_date_point == ithDateLabelPoint.zDateDictKey || appState.latestResults.highlighted_z_date_row == ithDateLabelPoint.zDateDictKey) ) {
                dashed = false;
            }

            var dashStyle = [1,3];
            tickOffset = isXDate ? 0 : tickLength;
            drawIndicatorLine(drawContext, xPosInPixelOrig, xAxisYPos + tickOffset, xPosInPixels, yPosInPixels - ithDateLabelPoint.height/2.0 - CHART_DATE_LABEL_PADDING, dashed, dashStyle);
        }

        var highlightedLabel = null;

        for ( var i = 0; i < chart.date_label_points.length; i++ ) {
            var ithDateLabelPoint = chart.date_label_points[i];

            var xPosInPixels = ithDateLabelPoint.xPointPixels;
            var yPosInPixels = chart.scales.y.getPixelForValue(ithDateLabelPoint.yPoint);

            if ( ithDateLabelPoint.zDateDictKey && (appState.latestResults.highlighted_z_date_point == ithDateLabelPoint.zDateDictKey || appState.latestResults.highlighted_z_date_row == ithDateLabelPoint.zDateDictKey) ) {
                highlightedLabel = ithDateLabelPoint;
                continue;
            }

            drawDateLabel(chart, ithDateLabelPoint.date_shorthand, ithDateLabelPoint.date_ordinal, xPosInPixels, yPosInPixels, ithDateLabelPoint.width, ithDateLabelPoint.height, CHART_DATE_LABEL_FONT_SIZE);

            // drawContext.drawImage(ithZDateSymbolPoint.loaded_image, xPosInPixels - Z_DATE_SYMBOL_SIZE_DIV_2, yPosInPixels - Z_DATE_SYMBOL_SIZE_DIV_2, Z_DATE_SYMBOL_SIZE, Z_DATE_SYMBOL_SIZE);
        }

        if ( highlightedLabel ) {
            var xPosInPixels = highlightedLabel.xPointPixels;
            var yPosInPixels = chart.scales.y.getPixelForValue(highlightedLabel.yPoint);
            var highlightedWidth = highlightedLabel.width*CHART_LABEL_HIGHLIGHTING_MAGNIFICATION;
            var highlightedHeight = highlightedLabel.height*CHART_LABEL_HIGHLIGHTING_MAGNIFICATION;

            yPosInPixels += (highlightedHeight - highlightedLabel.height) / 2.0;

            var highlighted = true;
            drawDateLabel(chart, highlightedLabel.date_shorthand, highlightedLabel.date_ordinal, xPosInPixels, yPosInPixels, highlightedWidth, highlightedHeight, CHART_DATE_LABEL_FONT_SIZE*CHART_LABEL_HIGHLIGHTING_MAGNIFICATION, highlighted);
        }
    }
}

function spreadZDateSymbols(symbolGroups) {
    for ( var i = 0; i < symbolGroups.length; i++ ) {
        var ithSymbolGroupMembers = symbolGroups[i];

        if ( ithSymbolGroupMembers.length > 1 ) {

            ithSymbolGroupMembers.sort(function(a, b) {
                return a.xPoint - b.xPoint;
            });

            var lowestX = Number.MAX_SAFE_INTEGER;
            var highestX = -1;
            var averageCenter = 0;
            var idealTotalWidthOfGroup = 0;

            for ( var k = 0; k < ithSymbolGroupMembers.length; k++ ) {
                var kthSymbol = ithSymbolGroupMembers[k];

                if ( kthSymbol.xPointPixelsOrig < lowestX ) {
                    lowestX = kthSymbol.xPointPixelsOrig;
                }
                if ( kthSymbol.xPointPixelsOrig > highestX ) {
                    highestX = kthSymbol.xPointPixelsOrig;
                }

                idealTotalWidthOfGroup += kthSymbol.width;
            }
            
            var firstGroupMember = ithSymbolGroupMembers[0];
            var lastGroupMember = ithSymbolGroupMembers[ithSymbolGroupMembers.length-1];

            var laidOutWidthOfGroup = (lastGroupMember.xPointPixels + lastGroupMember.width/2) - (firstGroupMember.xPointPixels - firstGroupMember.width/2);

            if ( laidOutWidthOfGroup < (idealTotalWidthOfGroup - .1) ) {
                averageCenter = lowestX + (highestX - lowestX)/2.0;

                var currentX = (averageCenter - idealTotalWidthOfGroup/2.0) + ithSymbolGroupMembers[0].width/2.0;

                for ( var k = 0; k < ithSymbolGroupMembers.length; k++ ) {
                    var kthSymbol = ithSymbolGroupMembers[k];

                    kthSymbol.xPointPixels = currentX;

                    currentX += kthSymbol.width/2.0;

                    if ( k+1 < ithSymbolGroupMembers.length ) {
                        currentX += ithSymbolGroupMembers[k+1].width/2.0;
                    }
                }
            }
        }
    }
}

function areSymbolGroupsEqual(previousSymbolGroups, currentSymbolGroups) {
    if ( previousSymbolGroups.length == currentSymbolGroups.length ) {
        for ( var i = 0; i < previousSymbolGroups.length; i++ ) {
            var previousSymbolGroupMembers = previousSymbolGroups[i];
            var currentSymbolGroupMembers = currentSymbolGroups[i];

            if ( previousSymbolGroupMembers.length == currentSymbolGroupMembers.length ) {
                for ( var k = 0; k < previousSymbolGroupMembers.length; k++ ) {
                    var kthPreviousSymbol = previousSymbolGroupMembers[k];
                    var kthCurrentSymbol = currentSymbolGroupMembers[k];

                    if ( kthPreviousSymbol != kthCurrentSymbol ) {
                        return false;
                    }
                }
            } else {
                return false;
            }
        }

        return true;
    } else {
        return false;
    }
}

function drawZDateSymbols(chart) {
    if( chart.z_date_symbol_points ) {
        
        var drawContext = chart.canvas.getContext("2d");

        // drawContext.globalAlpha = .25;

        var xAxisYPos = chart.scales.y.getPixelForValue(0);

        function resetXPointPixels(ithEntity) {
            ithEntity.xPointPixels = chart.scales.x.getPixelForValue(ithEntity.xPoint);
            ithEntity.xPointPixelsOrig = ithEntity.xPointPixels;
        }

        function hitTest(ithEntity, kthEntity) {
            return hitTestSingularEntities(ithEntity, kthEntity, Z_DATE_SYMBOL_SIZE_DIV_2, Z_DATE_SYMBOL_SIZE_DIV_2);
        }

        // Do an initial spread of the symbols.
        var previousSymbolGroups = organizeEntitiesIntoCollisionGroups(chart.z_date_symbol_points, resetXPointPixels, hitTest);
        spreadZDateSymbols(previousSymbolGroups);

        var MAX_SPREAD_ITERATIONS = 10;
        var resetXPointPixelsNull = null;
        for ( var i = 0; i < MAX_SPREAD_ITERATIONS; i++ ) {
            var currentSymbolGroups = organizeEntitiesIntoCollisionGroups(chart.z_date_symbol_points, resetXPointPixelsNull, hitTest);
            spreadZDateSymbols(currentSymbolGroups);

            if ( areSymbolGroupsEqual(previousSymbolGroups, currentSymbolGroups) ) {
                // console.log("ITERATIONS: " + i);
                break;
            } else {
                previousSymbolGroups = currentSymbolGroups;
            }
        }
        
        for ( var i = 0; i < chart.z_date_symbol_points.length; i++ ) {
            var ithZDateSymbolPoint = chart.z_date_symbol_points[i];

            var xAxisOffset = getSymbolAxisOffset(ithZDateSymbolPoint.zDateTags);

            var xPosInPixels = ithZDateSymbolPoint.xPointPixels;
            var xPosInPixelOrig = chart.scales.x.getPixelForValue(ithZDateSymbolPoint.xPoint);
            
            var yOffsetFromXAxisInPixels = xAxisYPos - chart.scales.y.getPixelForValue(xAxisOffset);

            if ( yOffsetFromXAxisInPixels < 60 ) {
                yOffsetFromXAxisInPixels = 60;
            }

            // var yPosInPixels = xAxisYPos - yOffsetFromXAxisInPixels;
            var yPosInPixels = Z_DATE_SYMBOL_SIZE*2.5;
        
            ithZDateSymbolPoint.yPoint = chart.scales.y.getValueForPixel(yPosInPixels);

            var dashed = true;

            if ( appState.latestResults.highlighted_z_date_point == ithZDateSymbolPoint.zDateDictKey ) {
                dashed = false;
            }

            drawIndicatorLine(drawContext, xPosInPixelOrig, xAxisYPos, xPosInPixels, yPosInPixels, dashed);
        }

        var highlightedSymbol = null;

        for ( var i = 0; i < chart.z_date_symbol_points.length; i++ ) {
            var ithZDateSymbolPoint = chart.z_date_symbol_points[i];

            var xPosInPixels = ithZDateSymbolPoint.xPointPixels;
            var yPosInPixels = chart.scales.y.getPixelForValue(ithZDateSymbolPoint.yPoint);

            if ( appState.latestResults.highlighted_z_date_point == ithZDateSymbolPoint.zDateDictKey || appState.latestResults.highlighted_z_date_row == ithZDateSymbolPoint.zDateDictKey) {
                highlightedSymbol = ithZDateSymbolPoint;
                continue;
            }

            drawContext.drawImage(ithZDateSymbolPoint.loaded_image, xPosInPixels - Z_DATE_SYMBOL_SIZE_DIV_2, yPosInPixels - Z_DATE_SYMBOL_SIZE_DIV_2, Z_DATE_SYMBOL_SIZE, Z_DATE_SYMBOL_SIZE);
        }

        if ( highlightedSymbol ) {
            var magnifiedSize = Z_DATE_SYMBOL_SIZE*1.5;
            var magnifiedOffset = magnifiedSize / 2.0;

            var yPosInPixels = chart.scales.y.getPixelForValue(highlightedSymbol.yPoint);
            drawContext.drawImage(highlightedSymbol.loaded_image, highlightedSymbol.xPointPixels - magnifiedOffset, yPosInPixels - magnifiedOffset, magnifiedSize, magnifiedSize);
        }

        // drawContext.globalAlpha = 1.0;
    }
}

function drawRulers(chart) {
    var results = appState.latestResults;

    var drawContext = chart.canvas.getContext("2d");

    drawContext.textAlign = "center"; 
    drawContext.textBaseline = "middle";
    drawContext.fillStyle = "black";
    drawContext.font = CHART_RULER_LABEL_FONT_SIZE + "px Arial";
    
    var yLow = chart.scales.y.getPixelForValue(0);

    var operationResultForZDelta = null;

    if ( results.highlighted_operation_result_pill || results.highlighted_operation_result_curve ) {
        operationResultForZDelta = results.highlighted_operation_result_pill ? results.highlighted_operation_result_pill : results.highlighted_operation_result_curve;
    } else {
        return;
    }

    var curveDataset = null;
    for ( var i = 0; i < chart.data.datasets.length; i++ ) {
        var ithDataset = chart.data.datasets[i];

        if ( ithDataset.operation_result == operationResultForZDelta ) {
            curveDataset = ithDataset;
            break;
        }
    }

    var yHigh_zDelta = chart.scales.y.getPixelForValue(curveDataset.curve_y_radius);

    if ( yHigh_zDelta < 25 ) {
        yHigh_zDelta = 25;
    } else if ( yLow - yHigh_zDelta < CHART_PIXEL_OFFSET__Z_DELTA_RULER_MIN_Y ) {
        yHigh_zDelta = yLow - CHART_PIXEL_OFFSET__Z_DELTA_RULER_MIN_Y;
    }

    // Not used right now, but may be used to add decoration to the ruler line to indicate an MSRF match.
    var msrfMatchStruct = null;
    
    var sortedAndFilteredZDates = results.processed_z_dates;
    var zStructsDict = results.z_structs;

    for ( var i = 0; i < sortedAndFilteredZDates.length; i++ ) {
        var ithZDateDictKey = sortedAndFilteredZDates[i];
        var ithZDateTags = zStructsDict[ithZDateDictKey];

        var ithMsrfMatchStructs = ithZDateTags.msrf_match_structs;

        var k = 0;

        for ( k = 0; k < ithMsrfMatchStructs.length; k++ ) {
            var kthMsrfMatchStruct = ithMsrfMatchStructs[k];

            if ( operationResultForZDelta == kthMsrfMatchStruct.operation_result ) {
                msrfMatchStruct = kthMsrfMatchStruct;
            }
        }
    }

    // var borderColor = showTheRuler ? "black" : COLOR__TRANSPARENT;

    if ( msrfMatchStruct ) {
        if ( msrfMatchStruct.msrf_filter == MSRF_FILTER__NORMAL ) {
            borderColor = COLOR__MSRF_NORMAL;
        } else if ( msrfMatchStruct.msrf_filter == MSRF_FILTER__IMPORTANT ) {
            borderColor = COLOR__MSRF_IMPORTANT;
        } else if ( msrfMatchStruct.msrf_filter == MSRF_FILTER__VORTEX ) {
            borderColor = COLOR__MSRF_VORTEX;
        }
    }
    
    var dayString_y = getDayString(operationResultForZDelta.rotation_count_y);
    var dayString_z = getDayString(operationResultForZDelta.rotation_count_z);


    var xStart_zDelta = chart.scales.x.getPixelForValue(operationResultForZDelta.x_date_native_start.getTime());
    var zStart_zDelta = chart.scales.x.getPixelForValue(operationResultForZDelta.z_date_native_start.getTime());
    
    drawRuler(chart, drawContext, xStart_zDelta, zStart_zDelta, yLow, yHigh_zDelta, dayString_z);

    var xStart_yDelta = null;
    var xEnd_yDelta = null;

    if ( operationResultForZDelta.x_date_native_other.getTime() < operationResultForZDelta.x_date_native_start.getTime() ) {
        xStart_yDelta = chart.scales.x.getPixelForValue(operationResultForZDelta.x_date_native_other.getTime());
        xEnd_yDelta = chart.scales.x.getPixelForValue(operationResultForZDelta.x_date_native_start.getTime());
    } else {
        xStart_yDelta = chart.scales.x.getPixelForValue(operationResultForZDelta.x_date_native_start.getTime());
        xEnd_yDelta = chart.scales.x.getPixelForValue(operationResultForZDelta.x_date_native_other.getTime());
    }
    
    drawRuler(chart, drawContext, xStart_yDelta, xEnd_yDelta, yLow, yLow + (yHigh_zDelta - yLow)/2.0, dayString_y);
}

function drawIndicatorLine(drawContext, xStart, yStart, xEnd, yEnd, dashed = true, dashStyle = [4, 4], lineWidth = 1) {
    
    // drawContext.globalAlpha = 0.5;
    if ( dashed === true ) {
        drawContext.setLineDash(dashStyle);
    } else {
        drawContext.setLineDash([]);
    }
    
    drawContext.strokeStyle = "black";
    drawContext.lineCap = "round";
    drawContext.lineWidth = lineWidth;
    drawContext.beginPath();
    drawContext.moveTo(xStart, yStart);
    // drawContext.lineTo(kthDateConnectionXInPixels, xAxisYPos);
    drawContext.lineTo(xEnd, yEnd);
    drawContext.stroke();
    // drawContext.globalAlpha = 1.0;
}

function drawAstroIndicators(chart) {
    var drawContext = chart.canvas.getContext("2d");

    drawContext.textAlign="center"; 
    drawContext.textBaseline = "middle";
    // drawContext.font = CHART_MOON_SIZE + "px Arial";
    
    var xAxisYPos = chart.scales.y.getPixelForValue(0);

    if( chart.astronomical_points ) {
        for ( var i = 0; i < chart.astronomical_points.length; i++ ) {
            var ithAstroPoint = chart.astronomical_points[i];

            var xPosInPixels = chart.scales.x.getPixelForValue(ithAstroPoint.xPoint);
            var yPosInPixels = xAxisYPos;

            if ( ithAstroPoint.astro_indicator_type == ASTRO_INDICATOR_TYPE__LUNAR_PHASE ) {
                yPosInPixels += CHART_PIXEL_OFFSET__MOONS;
                // yPosInPixels -= CHART_MOON_SIZE/2.0;
            } else if ( ithAstroPoint.astro_indicator_type == ASTRO_INDICATOR_TYPE__ECLIPSE ) {
                yPosInPixels += CHART_PIXEL_OFFSET__ECLIPSES;
                // yPosInPixels -= CHART_ECLIPSE_SIZE/2.0;
            }

            if ( chart.date_label_points ) {
                for ( var k = 0; k < ithAstroPoint.date_connections_in_millis.length; k++ ) {
                    var kthDateConnectionMillis = ithAstroPoint.date_connections_in_millis[k];

                    for ( var m = 0; m < chart.date_label_points.length; m++ ) {
                        var mthDateLabelPoint = chart.date_label_points[m];

                        if ( mthDateLabelPoint.xPoint == kthDateConnectionMillis ) {
                            var dateLabelBottom = mthDateLabelPoint.yPointPixels + mthDateLabelPoint.height/2.0;
                            drawIndicatorLine(drawContext, xPosInPixels, yPosInPixels, mthDateLabelPoint.xPointPixels, dateLabelBottom);
                        }
                    }
                }
            }
        }

        for ( var i = 0; i < chart.astronomical_points.length; i++ ) {
            var ithAstroPoint = chart.astronomical_points[i];

            var xPosInPixels = chart.scales.x.getPixelForValue(ithAstroPoint.xPoint);
            var yPosInPixels = xAxisYPos;// + CHART_PIXEL_OFFSET__MOONS;
            var astroBodySize = 0;

            if ( ithAstroPoint.astro_indicator_type == ASTRO_INDICATOR_TYPE__LUNAR_PHASE ) {
                yPosInPixels += CHART_PIXEL_OFFSET__MOONS;
                astroBodySize = CHART_MOON_SIZE;
            } else if ( ithAstroPoint.astro_indicator_type == ASTRO_INDICATOR_TYPE__ECLIPSE ) {
                yPosInPixels += CHART_PIXEL_OFFSET__ECLIPSES;
                astroBodySize = CHART_ECLIPSE_SIZE;
            }

            var chartMoonSizeDiv2 = astroBodySize/2.0;
            drawContext.drawImage(ithAstroPoint.loaded_image, xPosInPixels - chartMoonSizeDiv2, yPosInPixels - chartMoonSizeDiv2, astroBodySize, astroBodySize);
        }
    }
}

function newChartDatePointDataset(dateInMillis, label, zDateTags, ordinal) {

    var pointRadius = CHART_POINT_RADIUS__Z_DATE;

    // if ( dateInMillis+"" == appState.latestResults.highlighted_z_date_row || dateInMillis+"" == appState.latestResults.highlighted_z_date_point ) {
    //     pointRadius = CHART_POINT_RADIUS_HOVER;
    // }

    if ( dateInMillis+"" == appState.latestResults.highlighted_z_date_point ) {
        pointRadius = CHART_POINT_RADIUS_HOVER;
    }

    var isXDatePoint = label.includes(X_DATE_SHORTHAND); //TODO Maybe something a little more formal.

    if ( isXDatePoint ) {
        pointRadius = CHART_POINT_RADIUS__X_DATE;
    } else {
        if ( zDateTags ) {
            if ( zDateTags.hit_count > 1 ) {
                // pointRadius = 0;
            }
        }
    }
    
    return {
        xPoint: dateInMillis,
        order: isXDatePoint ? CHART_DATASET_ORDER__X_DATE_POINT : CHART_DATASET_ORDER__Z_DATE_POINT,

        pointBackgroundColor: "black",
        pointRadius: pointRadius,
        pointHoverRadius: isXDatePoint ? pointRadius : CHART_POINT_RADIUS_HOVER,
        xPoint: dateInMillis,
        ordinal: ordinal,
        label: label
    }
}

function newChartDatasetFromOperationResult(effectiveOperations, ithZDateDictKey, operationResult, zDateTags) {
    var xDateStart = operationResult.x_date_native_start;
    var distanceBetween = distanceBetweenXDateAndZDate(operationResult);
    var middleDateMillis = xDateStart.getTime() + distanceBetween / 2;
    var operationOrdinal = operationResult.operation_ordinal;
    var operation = effectiveOperations[operationOrdinal];
    var isAlpha = isAlphaOperation(operation);
    
    // var lineColor = isAlphaOperation ? COLOR__OPERATION_ALPHA : COLOR__OPERATION_BETA;
    var lineColor = CHART_CURVE_COLOR__ONE_HIT;
    var borderWidth = CHART_CURVE_WIDTH__ONE_HIT;

    if ( zDateTags.hit_count <= 1 ) {
        lineColor = CHART_CURVE_COLOR__ONE_HIT;
        borderWidth = CHART_CURVE_WIDTH__ONE_HIT;
    } else if ( zDateTags.hit_count == 2 ) {
        lineColor = CHART_CURVE_COLOR__TWO_HITS;
        borderWidth = CHART_CURVE_WIDTH__TWO_HITS;
    } else if ( zDateTags.hit_count == 3 ) {
        lineColor = CHART_CURVE_COLOR__THREE_HITS;
        borderWidth = CHART_CURVE_WIDTH__THREE_HITS;
    } else if ( zDateTags.hit_count == 4 ) {
        lineColor = CHART_CURVE_COLOR__FOUR_HITS;
        borderWidth = CHART_CURVE_WIDTH__FOUR_HITS;
    } else if ( zDateTags.hit_count >= 5 ) {
        lineColor = CHART_CURVE_COLOR__FIVE_HITS;
        borderWidth = CHART_CURVE_WIDTH__FIVE_HITS;
    }

    var dataSetOrder = CHART_DATASET_ORDER__DEFAULT; // Highest is drawn first, i.e. lower z-index.

    if ( isAlpha == true ) {
        dataSetOrder = CHART_DATASET_ORDER__ALPHA_OPERATION;
    }

    var hasSpecialColoring = false;

    if ( ithZDateDictKey == appState.latestResults.highlighted_z_date_row || ithZDateDictKey == appState.latestResults.highlighted_z_date_point ) {
        lineColor = CHART_CURVE_COLOR__GROUP_HIGHLIGHTING
        borderWidth = CHART_CURVE_WIDTH__GROUP_HIGHLIGHTING;
        dataSetOrder = CHART_DATASET_ORDER__HIGHLIGHTED_Z_DATE_ROW;

        hasSpecialColoring = true;
    }

    if ( operationResult == appState.latestResults.highlighted_operation_result_pill || operationResult == appState.latestResults.highlighted_operation_result_curve ) {
        lineColor = CHART_CURVE_COLOR__INDIVIDUAL_HIGHLIGHTING;
        borderWidth = CHART_CURVE_WIDTH__INDIVIDUAL_HIGHLIGHTING;
        dataSetOrder = CHART_DATASET_ORDER__HIGHLIGHTED_PILL;

        hasSpecialColoring = true;
    }

    var rotationPoint = new GeoPoint(xDateStart.getTime(), 0);
    var rotationOriginPoint = new GeoPoint(middleDateMillis, 0);
    var radianIncrement = -Math.PI / CHART_CURVE_COMPLEXITY;

    rotationPoint.rotateBy(-radianIncrement, rotationOriginPoint);

    // Have to have the first and last point of the curve actually be past the zero mark
    // in order to induce a nice smooth half circle/ellipse. If you stop right on the 
    // X-axis then the last curve segment of the spine has a kink. So, nudging this kink
    // to below the X-axis and hiding the last segment on either side.
    var data = [];
    for ( var i = 0; i < CHART_CURVE_COMPLEXITY+3; i++ ) {
        // if ( i == CHART_CURVE_COMPLEXITY ) {
        //     data.push(newChartPoint(xDateStart.getTime() + distanceBetween, 0));
        // } else {
            data.push(newChartPoint(rotationPoint.getX(), rotationPoint.getY()));
        // }

        // if ( i < CHART_CURVE_COMPLEXITY ) {
            rotationPoint.rotateBy(radianIncrement, rotationOriginPoint);
        // }
    }

    return {
        lineTension: CHART_SPLINE_TENSION,
        data: data,
        
        borderColor: lineColor,
        segment: {
            borderColor: function(context) {
                if ( context.p0DataIndex == 0 || context.p1DataIndex == CHART_CURVE_COMPLEXITY+2 ) {
                    return COLOR__TRANSPARENT;
                }

                if ( hasSpecialColoring == false ) {
                    var alpha = (context.p1DataIndex-1) / CHART_CURVE_COMPLEXITY;
                    // alpha *= alpha;
                    alpha = Math.pow(alpha, 1.5);
                    var baseAlpha = .075;
                    alpha = baseAlpha + ((1-baseAlpha)*alpha);
                    var color = lineColor.replace("1.0", alpha);
    
                    return color;
                } else {
                    return lineColor;
                }
            }
        },
        borderWidth: borderWidth,

        order: dataSetOrder,

        pointRadius: 0,
        pointHoverRadius: 0,

        operation_result: operationResult,
        curve_x_radius: distanceBetween/2,
        curve_y_radius: distanceBetween/2,

        operation_result_hash: operationResult.hash,

        xPoint1: xDateStart.getTime(),
        xPoint2: xDateStart.getTime() + distanceBetween
    }
}

function getLunarPhase(lunarAge) {
    if (lunarAge < 1.84566173161) return lunarphase.LunarPhase.NEW;
    else if (lunarAge < 5.53698519483) return lunarphase.LunarPhase.WAXING_CRESCENT;
    else if (lunarAge < 9.22830865805) return lunarphase.LunarPhase.FIRST_QUARTER;
    else if (lunarAge < 12.91963212127) return lunarphase.LunarPhase.WAXING_GIBBOUS;
    else if (lunarAge < 16.61095558449) return lunarphase.LunarPhase.FULL;
    else if (lunarAge < 20.30227904771) return lunarphase.LunarPhase.WANING_GIBBOUS;
    else if (lunarAge < 23.99360251093) return lunarphase.LunarPhase.LAST_QUARTER;
    else if (lunarAge < 27.68492597415) return lunarphase.LunarPhase.WANING_CRESCENT;

    return lunarphase.LunarPhase.NEW;
}

function newAstroIndicatorPoint(xPoint, loadedImage, astroIndicatorType, zIndex) {
    return {
        xPoint: xPoint,
        loaded_image: loadedImage,
        date_connections_in_millis: [],
        astro_indicator_type: astroIndicatorType,
        z_index: zIndex
    }
}

function newZDateSymbolPoint(xPoint, yPoint, loadedImage, zDateDictKey, zDateTags) {
    return {
        xPoint: xPoint,
        yPoint: yPoint,
        loaded_image: loadedImage,
        width: Z_DATE_SYMBOL_SIZE,
        zDateDictKey: zDateDictKey,
        zDateTags: zDateTags
    }
}

function newDateLabelPoint(xPoint, yPoint, dateShorthand, dateOrdinal, labelWidth, labelHeight, zDateDictKey, zDateTags) {
    return {
        xPoint: xPoint,
        yPoint: yPoint,
        date_shorthand: dateShorthand,
        date_ordinal: dateOrdinal,
        width: Math.round(labelWidth) + CHART_DATE_LABEL_SPACING*2.0 + CHART_DATE_LABEL_PADDING*2.0,
        height: labelHeight,
        zDateDictKey: zDateDictKey,
        zDateTags: zDateTags
    }
}

function generateAstronomicalEventDatasets(isoEvent, xDatesInMillis, zDatesInMillis) {

    // Collect a sampling of dates to check moon phases.
    var allDatesInMillis = xDatesInMillis.concat(zDatesInMillis);
    allDatesInMillis.sort(function(a, b) {
        return a - b;
    });

    var dateSamplingBasedOnAllDates = [];
    var MOON_SAMPLING_HALF_WINDOW_IN_MILLIS = MILLIS_PER_DAY*8

    var tempDate = new Date();
    var timeZone = isoEvent.scope == EVENT_SCOPE__HH_MM ? getTimezone(isoEvent.lat, isoEvent.long) : "";

    if ( isoEvent.scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) {
        timeZone = getTimezone(0, 0);
    }

    for ( var k = 0; k < allDatesInMillis.length; k++ ) {
        var kthDateInMillis = allDatesInMillis[k];

        if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
            kthDateInMillis = roundMillisToNearestMidnightInTimeZone(kthDateInMillis, timeZone);
        } else if ( isoEvent.scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) {
            kthDateInMillis = roundMillisToNearestMidnightInTimeZone(kthDateInMillis, timeZone);
        }

        var kthWindowStart = kthDateInMillis - MOON_SAMPLING_HALF_WINDOW_IN_MILLIS;
        var kthWindowEnd = kthDateInMillis + MOON_SAMPLING_HALF_WINDOW_IN_MILLIS + MILLIS_PER_DAY;

        if ( dateSamplingBasedOnAllDates.length > 0 ) {
            var lastDateSampling = dateSamplingBasedOnAllDates[dateSamplingBasedOnAllDates.length-1];

            while ( kthWindowStart <= lastDateSampling ) {
                kthWindowStart += MILLIS_PER_DAY;
            }
        }
        
        for ( var ithDateInMillisOnOrAroundXOrZDate = kthWindowStart; ithDateInMillisOnOrAroundXOrZDate < kthWindowEnd; ithDateInMillisOnOrAroundXOrZDate += MILLIS_PER_DAY ) {
            dateSamplingBasedOnAllDates.push(ithDateInMillisOnOrAroundXOrZDate);
        }
    }

    var currentDate = new Date(0);
    var currentPhase = null;
    var percentageDeltaOfClosestCurrentDate = null;
    var closestDatesToAstroIndicators = {};
    
    for ( var i = 0; i < dateSamplingBasedOnAllDates.length; i++ ) {

        var ithDateInMillisOnOrAroundXOrZDate = dateSamplingBasedOnAllDates[i];

        currentDate.setTime(ithDateInMillisOnOrAroundXOrZDate);

        var ithLunarAgePercent = lunarphase.Moon.lunarAgePercent(currentDate);
        var ithLunarAge = ithLunarAgePercent * SYNODIC_MONTH;
        var ithIndicator_phase = getLunarPhase(ithLunarAge);
        var moonPhaseLookup = MOON_PHASE_DICT[ithIndicator_phase];

        var ithLunarAgePercent_wrapped = currentPhase == lunarphase.LunarPhase.NEW && ithLunarAgePercent > 0.5 ? 1.0 - ithLunarAgePercent : ithLunarAgePercent;
        var idealPercentage = moonPhaseLookup.moon_phase_percentage;
        var distanceFromIdealPercentage = Math.abs(idealPercentage - ithLunarAgePercent_wrapped);

        var startNewClosestDateSearch = false;

        if ( currentPhase != ithIndicator_phase ) {
            startNewClosestDateSearch = true;
        } else {
            if (closestDatesToAstroIndicators.hasOwnProperty(ithIndicator_phase) == false ) {
                startNewClosestDateSearch = true;
            } else {
                var dateMidpointsForMoonPhase = closestDatesToAstroIndicators[ithIndicator_phase];
                var lastIndicatorDate = dateMidpointsForMoonPhase[dateMidpointsForMoonPhase.length-1];
                var distanceBetweenLastIndicatorDateAndIthDate = Math.abs(ithDateInMillisOnOrAroundXOrZDate - lastIndicatorDate);

                if ( distanceBetweenLastIndicatorDateAndIthDate > MILLIS_PER_DAY*10 ) {
                    startNewClosestDateSearch = true;
                }
            }
        }

        if ( startNewClosestDateSearch ) {
            if (closestDatesToAstroIndicators.hasOwnProperty(ithIndicator_phase) == false ) {
                closestDatesToAstroIndicators[ithIndicator_phase] = [];
            }

            closestDatesToAstroIndicators[ithIndicator_phase].push(ithDateInMillisOnOrAroundXOrZDate);

            currentPhase = ithIndicator_phase;
            percentageDeltaOfClosestCurrentDate = null;
        }

        if ( percentageDeltaOfClosestCurrentDate == null || distanceFromIdealPercentage < percentageDeltaOfClosestCurrentDate ) {
            percentageDeltaOfClosestCurrentDate = distanceFromIdealPercentage;

            var dateMidpointsForMoonPhase = closestDatesToAstroIndicators[currentPhase];
            dateMidpointsForMoonPhase[dateMidpointsForMoonPhase.length-1] = ithDateInMillisOnOrAroundXOrZDate;
        }
    }

    var fullSolarEclipsesEnabled = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__FULL_SOLAR_ECLIPSES") === true;
    var partialSolarEclipsesEnabled = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__PARTIAL_SOLAR_ECLIPSES") === true;
    var fullLunarEclipsesEnabled = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__FULL_LUNAR_ECLIPSES") === true;
    var partialLunarEclipsesEnabled = isIsoEventFieldEnabled(isoEvent, "SERIALIZED_FIELD__CHART_OPTION__PARTIAL_LUNAR_ECLIPSES") === true;

    if ( fullSolarEclipsesEnabled || partialSolarEclipsesEnabled || fullLunarEclipsesEnabled || partialLunarEclipsesEnabled ) {
        for ( var i = 0; i < allDatesInMillis.length; i++ ) {
            var ithDateInMillis = allDatesInMillis[i];
    
            if ( fullSolarEclipsesEnabled || partialSolarEclipsesEnabled ) {
                var eclipseObject = binarySearchForEclipse(SOLAR_ECLIPSES_PROCESSED, ithDateInMillis);

                if ( eclipseObject != null ) {
                    var eclipseType = getNormalizedSolarEclipseType(eclipseObject);

                    if ( eclipseType == SOLAR_ECLIPSE_TYPE__FULL && fullSolarEclipsesEnabled || eclipseType == SOLAR_ECLIPSE_TYPE__PARTIAL && partialSolarEclipsesEnabled ) {
                        var eclipseDateInMillis = eclipseObject["date_millis"];
                        eclipseDateInMillis = eclipseDateInMillis;//getTimeZeroOfNativeDateMillis(eclipseDateInMillis);

                        closestDatesToAstroIndicators[eclipseType] = closestDatesToAstroIndicators[eclipseType] ? closestDatesToAstroIndicators[eclipseType] : {};
                        closestDatesToAstroIndicators[eclipseType][eclipseDateInMillis+""] = true;
                    }
                }
            }

            if ( fullLunarEclipsesEnabled || partialLunarEclipsesEnabled ) {
                var eclipseObject = binarySearchForEclipse(LUNAR_ECLIPSES_PROCESSED, ithDateInMillis);

                if ( eclipseObject != null ) {
                    var eclipseType = getNormalizedLunarEclipseType(eclipseObject);

                    if ( eclipseType && eclipseType == LUNAR_ECLIPSE_TYPE__FULL && fullLunarEclipsesEnabled || eclipseType && eclipseType == LUNAR_ECLIPSE_TYPE__PARTIAL && partialLunarEclipsesEnabled ) {
                        var eclipseDateInMillis = eclipseObject["date_millis"];
                        eclipseDateInMillis = eclipseDateInMillis;//getTimeZeroOfNativeDateMillis(eclipseDateInMillis);

                        closestDatesToAstroIndicators[eclipseType] = closestDatesToAstroIndicators[eclipseType] ? closestDatesToAstroIndicators[eclipseType] : {};
                        closestDatesToAstroIndicators[eclipseType][eclipseDateInMillis+""] = true;
                    }
                }
            }
        }
    }

    var toReturn = [];

    var indicatorsThatOverlappedDates = {};

    for (var ithIndicator_phase in closestDatesToAstroIndicators) {
        // check if the property/key is defined in the object itself, not in parent
        if (closestDatesToAstroIndicators.hasOwnProperty(ithIndicator_phase)) {

            var moonPhaseLookup = MOON_PHASE_DICT[ithIndicator_phase];
            var eclipseLookup = ECLIPSE_DICT[ithIndicator_phase];
            var loadedImage = CHART_IMAGES[ithIndicator_phase];

            if ( moonPhaseLookup ) {
                var serializedField = moonPhaseLookup.serialized_field;

                if ( isIsoEventFieldEnabled(isoEvent, serializedField) === true ) {

                    var filterField = getIsoEventField(serializedField);
                    
                    var dateMidpointsForMoonPhase = closestDatesToAstroIndicators[ithIndicator_phase];

                    for ( var i = 0; i < dateMidpointsForMoonPhase.length; i++ ) {
                        var ithDateInMillisForPhase = dateMidpointsForMoonPhase[i];

                        var moonPoint = null;

                        for ( var k = 0; k < allDatesInMillis.length; k++ ) {
                            var kthXDateOrZDateInMillis = allDatesInMillis[k];

                            if ( Math.abs(ithDateInMillisForPhase - kthXDateOrZDateInMillis) <= LUNAR_DATE_MATCH_TOLERANCE ) {
                                if ( moonPoint == null ) {

                                    // I think rounding AGAIN after the moon phase sampling can shift the day down again.
                                    // So don't round again! This would-be bug just affects the moon's icon position on the chart, but
                                    // still would be confusing.
                                    // if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                                    //     ithDateInMillisForPhase = roundMillisToNearestMidnightInTimeZone(ithDateInMillisForPhase, timeZone);
                                    // }

                                    moonPoint = newAstroIndicatorPoint(ithDateInMillisForPhase, loadedImage, ASTRO_INDICATOR_TYPE__LUNAR_PHASE, filterField.zIndex);
                                    toReturn.push(moonPoint);
                                    indicatorsThatOverlappedDates[serializedField] = true;
                                }

                                moonPoint.date_connections_in_millis.push(kthXDateOrZDateInMillis);
                            }
                        }
                    }
                }
            } else if ( eclipseLookup ) {
                var serializedField = eclipseLookup.serialized_field;
                var filterField = getIsoEventField(serializedField);

                var dateMidpointsForEclipse = closestDatesToAstroIndicators[ithIndicator_phase];
                
                for (var ithEclipseMidpointDate in dateMidpointsForEclipse) {
                    // check if the property/key is defined in the object itself, not in parent
                    if (dateMidpointsForEclipse.hasOwnProperty(ithEclipseMidpointDate)) {
                        var eclipsePoint = null;

                        for ( var k = 0; k < allDatesInMillis.length; k++ ) {
                            var kthXDateOrZDateInMillis = allDatesInMillis[k];

                            var ithEclipseMidpointDateMillis = parseIntElseNeg1(ithEclipseMidpointDate);

                            if ( Math.abs(ithEclipseMidpointDateMillis - kthXDateOrZDateInMillis) <= ECLLIPSE_DATE_MATCH_TOLERANCE ) {
                                if ( eclipsePoint == null ) {

                                    if ( isoEvent.scope == EVENT_SCOPE__HH_MM ) {
                                        ithEclipseMidpointDateMillis = roundMillisToNearestMidnightInTimeZone(ithEclipseMidpointDateMillis, timeZone);
                                    } else if ( isoEvent.scope == EVENT_SCOPE__DAYS && isFlagEnabled(FEATURE_FLAG__LOCK_DAY_SCOPE_TO_GMT) ) {
                                        ithEclipseMidpointDateMillis = roundMillisToNearestMidnightInTimeZone(ithEclipseMidpointDateMillis, timeZone);
                                    }
                                    
                                    eclipsePoint = newAstroIndicatorPoint(ithEclipseMidpointDateMillis, loadedImage, ASTRO_INDICATOR_TYPE__ECLIPSE, filterField.zIndex);
                                    toReturn.push(eclipsePoint);
                                    indicatorsThatOverlappedDates[serializedField] = true;
                                }

                                eclipsePoint.date_connections_in_millis.push(kthXDateOrZDateInMillis);
                            }
                        }
                    }
                }
            }
        }
    }

    handleJustChangedFields(isoEvent, indicatorsThatOverlappedDates);

    toReturn.sort(function(a, b) {
        return a.z_index - b.z_index;
    });

    return toReturn;
}

function fanOutOverlappingCurves(chartXMin, curveDataSets, longestSpanBetweenXDateAndZDate) {

    var largestCurveRadiusBeforeFanning = longestSpanBetweenXDateAndZDate/2.0;

    for ( var i = 0; i < curveDataSets.length; i++ ) {
        var ithEntity = curveDataSets[i];
        var ithCurveRadius = ithEntity.curve_y_radius;
        var diff = largestCurveRadiusBeforeFanning - ithCurveRadius;
        var percentageOfDiff = .15;

        ithEntity.curve_y_radius = ithCurveRadius + diff*percentageOfDiff;
        ithEntity.point_scale_factor = ithEntity.curve_y_radius / ithCurveRadius;

        // var percentageOfLargest = ithCurveRadius / largestCurveRadiusBeforeFanning;
        // var inversePercentage = 1.0 - percentageOfLargest;
        // var inverseScaling = 1+inversePercentage;
        // ithCurveRadius *= inverseScaling;

        // ithEntity.curve_y_radius = ithCurveRadius;
        // ithEntity.point_scale_factor = inverseScaling;
    }

    var largestCurveYRadius = 0;

    var chartCanvasWidth = document.getElementById("timeline-chart").clientWidth;

    var hitRadius = CHART_FAN_OUT_HIT_RADIUS;

    function hitTest(ithEntity, kthEntity) {

        var ithOperationResult = ithEntity.operation_result;
        var minXForSimulatedChartRange = ithOperationResult.x_date_native_start.getTime();
        var ithRanage = ithEntity.xPoint2 - minXForSimulatedChartRange;
        var scaling = chartCanvasWidth / ithRanage;

        var ithXPos1InPixels = (ithEntity.xPoint1 - chartXMin) * scaling;
        var ithXPos2InPixels = ithXPos1InPixels + (ithEntity.xPoint2 - ithEntity.xPoint1) * scaling;

        var kthXPos1InPixels = (kthEntity.xPoint1 - chartXMin) * scaling;
        var kthXPos2InPixels = kthXPos1InPixels + (kthEntity.xPoint2 - kthEntity.xPoint1) * scaling;

        var toReturn = hitTestPoints(ithXPos1InPixels, kthXPos1InPixels, hitRadius, hitRadius) && hitTestPoints(ithXPos2InPixels, kthXPos2InPixels, hitRadius, hitRadius);

        return toReturn;
            //     ||
            // hitTestPoints(ithXPos1InPixels, kthXPos1InPixels, hitRadius, hitRadius) && hitTestPoints(ithXPos2InPixels, kthXPos2InPixels, hitRadius, hitRadius)
    }
    var resetXPointPixels = null;

    var curveGroups = organizeEntitiesIntoCollisionGroups(curveDataSets, resetXPointPixels, hitTest);

    function scaleCurvePoints(curveDataSet, fanFactor) {
        var pointScaleFactor = curveDataSet.point_scale_factor ? curveDataSet.point_scale_factor : 1.0;

        for ( var m = 1; m < curveDataSet.data.length; m++ ) {
            var mthPoint = curveDataSet.data[m];
            
            mthPoint.y *= pointScaleFactor;
            mthPoint.y *= fanFactor;
        }
    }

    for ( var i = 0; i < curveGroups.length; i++ ) {
        var ithCurveGroupMembers = curveGroups[i];

        if ( ithCurveGroupMembers.length == 1 ) {
            var soleCurveDataset = ithCurveGroupMembers[0];
            
            if ( soleCurveDataset.curve_y_radius > largestCurveYRadius ) {
                largestCurveYRadius = soleCurveDataset.curve_y_radius;
            }

            scaleCurvePoints(soleCurveDataset, 1.0);

        } else if ( ithCurveGroupMembers.length > 1 ) {
            
            ithCurveGroupMembers.sort(function(a, b) {
                return a.curve_x_radius - b.curve_x_radius;
            });

            for ( var k = 0; k < ithCurveGroupMembers.length; k++ ) {
                var kthCurveDataSet = ithCurveGroupMembers[k];

                if ( kthCurveDataSet.operation_result.rotation_count_z == 2314.2 ) {
                    // debugger;
                }

                var fanScaleFactor = 1 + (.15 * k);
                kthCurveDataSet.curve_y_radius *= fanScaleFactor;

                // var curveYRadiusBefore = kthCurveDataSet.curve_y_radius;
                // var offset = kthCurveDataSet.curve_y_radius * .2;
                // kthCurveDataSet.curve_y_radius = kthCurveDataSet.curve_y_radius + offset*k;
                // fanScaleFactor = kthCurveDataSet.curve_y_radius / curveYRadiusBefore;

                if ( kthCurveDataSet.curve_y_radius > largestCurveYRadius ) {
                    largestCurveYRadius = kthCurveDataSet.curve_y_radius;
                }

                scaleCurvePoints(kthCurveDataSet, fanScaleFactor);
            }
        }
    }

    return largestCurveYRadius;

    // var hashToCurveDict = [];

    // for ( var i = 0; i < curveDataSets.length; i++ ) {
    //     var ithCurveDataSet = curveDataSets[i];
    //     var ithHash = ithCurveDataSet.operation_result.hash_without_ordinal;

    //     var sameCurveArray = null;

    //     if ( hashToCurveDict[ithHash] ) {
    //         sameCurveArray = hashToCurveDict[ithHash];
    //     } else {
    //         sameCurveArray = [];
    //         hashToCurveDict[ithHash] = sameCurveArray;
    //     }

    //     sameCurveArray.push(ithCurveDataSet);
    // }

    // for (var ithHash in hashToCurveDict) {
    //     // check if the property/key is defined in the object itself, not in parent
    //     if (hashToCurveDict.hasOwnProperty(ithHash)) {
    //         var sameCurveArray = hashToCurveDict[ithHash];

    //         if ( sameCurveArray.length > 1 ) {
    //             for ( var i = 0; i < sameCurveArray.length; i++ ) {
    //                 var ithCurveDataSet = sameCurveArray[i];
    //                 var scaleFactor = 1 + (.2 * i);
    //                 ithCurveDataSet.curve_y_radius *= scaleFactor;

    //                 for ( var k = 1; k < ithCurveDataSet.data.length; k++ ) {
    //                     var kthPoint = ithCurveDataSet.data[k];
                        
    //                     kthPoint.y *= scaleFactor
    //                 }
    //             }
    //         }
    //     }
    // }
}

function generateChartUpdateStruct(chart, results) {

    var currentIsoEvent = getCurrentIsoEvent();

    var xDatePointDataSets = [];

    var xDatesInMillis = [];
    
    var effectiveXDates = currentIsoEvent.x_dates;

    for ( var i = 0; i < effectiveXDates.length; i++ ) {
        var ithXDate = effectiveXDates[i];

        if ( ithXDate.enabled === true ) {
            var ithNativeDate = xDateToNativeDate(currentIsoEvent.scope, ithXDate, currentIsoEvent.lat, currentIsoEvent.long);
            var ithNativeDateMilis = ithNativeDate.getTime();

            xDatesInMillis.push(ithNativeDateMilis);

            var ordinal = i+1;
            var label = "X" + convertIntToSubscriptUnicode(ordinal);
            var zDateTags = {};

            var ithDataSet = newChartDatePointDataset(ithNativeDateMilis, label, zDateTags, ordinal);
            xDatePointDataSets.push(ithDataSet);
        }
    }

    var sortedAndFilteredZDates = results.processed_z_dates;
    var furthestZDate = null;
    var longestSpanBetweenXDateAndZDate = 0;
    var zStructsDict = results.z_structs;
    var zDatesInMillis = [];

    var curveDataSets = [];

    for ( var i = 0; i < sortedAndFilteredZDates.length; i++ ) {
        var ithZDateDictKey = sortedAndFilteredZDates[i];
        var ithZDateTags = zStructsDict[ithZDateDictKey];

        var ordinal = i+1;
        var label = "Z" + convertIntToSubscriptUnicode(ordinal);
        // var ithDataSet = newChartDatePointDataset(parseInt(ithZDateDictKey), label, ithZDateTags, ordinal);
        // zDatePointDataSets.push(ithDataSet);

        var ithZDate = ithZDateTags.z_date_native_start;

        zDatesInMillis.push(ithZDate.getTime());

        if ( furthestZDate == null || ithZDate.getTime() > furthestZDate.getTime() ) {
            furthestZDate = ithZDate;
        }

        var ithOperationMatchStructs = ithZDateTags.operation_match_structs;

        var k = 0;

        for ( k = 0; k < ithOperationMatchStructs.length; k++ ) {
            var kthOperationMatchStruct = ithOperationMatchStructs[k];
            var kthOperationResult = kthOperationMatchStruct.operation_result;
            
            var kthChartDataset = newChartDatasetFromOperationResult(currentIsoEvent.effective_operations, ithZDateDictKey, kthOperationResult, ithZDateTags);
            curveDataSets.push(kthChartDataset);
            
            var xDateToZDateInMillis = distanceBetweenXDateAndZDate(kthOperationResult);

            if ( xDateToZDateInMillis > longestSpanBetweenXDateAndZDate ) {
                longestSpanBetweenXDateAndZDate = xDateToZDateInMillis;
            }
        }
    }

    var xMin = xDatesInMillis[0] - MILLIS_PER_DAY;
    var xMax = furthestZDate.getTime() + MILLIS_PER_DAY;

    var largestCurveYRadius = fanOutOverlappingCurves(xMin, curveDataSets, longestSpanBetweenXDateAndZDate);

    var yMin = -largestCurveYRadius;
    var yMax = largestCurveYRadius;

    // var yMin = -longestSpanBetweenXDateAndZDate/2;
    // var yMax = longestSpanBetweenXDateAndZDate/2;

    curveDataSets.sort(function(a, b) {
        var orderA = a.order;
        var orderB = b.order;

        var toReturn = (orderA > orderB ? 1 : -1);

        return toReturn;
    });

    // This forces the chart to display at least bit more around the curves.
    var paddingDataSet = {
        data: [
            newChartPoint(xMin, yMin * CHART_NEG_Y_AXIS_PERCENTAGE),
            newChartPoint(xMax, yMin * CHART_NEG_Y_AXIS_PERCENTAGE),
            newChartPoint(xMin, yMax + yMax * CHART_POS_Y_AXIS_PERCENTAGE),
            newChartPoint(xMax, yMax + yMax * CHART_POS_Y_AXIS_PERCENTAGE)
        ],
        x_min: xMin,
        x_max: xMax,
        borderColor: "red",
        borderWidth: 0,
        pointRadius: 5,
        pointBackgroundColor: "#00000000",
        pointHoverRadius: 0
    }
    
    var currentIsoEvent = getCurrentIsoEvent();

    var astronomicalEventDatasets = generateAstronomicalEventDatasets(currentIsoEvent, xDatesInMillis, zDatesInMillis);

    var zDateSymbolDatasets = generateZDateSymbolDatasets();
    var dateLabelDatasets = generateDateLabelDatasets(chart, xDatePointDataSets);

    // var xAndZDatePoints = xDatePointDataSets.concat(zDatePointDataSets);

    var finalDatasetArray = curveDataSets.concat(paddingDataSet);

    return {
        x_min: xMin,
        x_max: xMax,
        y_min: yMin,
        y_max: yMax,
        datasets: finalDatasetArray,
        astronomical_points: astronomicalEventDatasets,
        z_date_symbol_points: zDateSymbolDatasets,
        date_label_points: dateLabelDatasets
    }
}



var ECLIPSE_DATA_TIME_FORMAT = "HH:mm:ss"
var ECLIPSE_DATA_DATE_FORMAT = "YYYY, MMMM D";
var ECLIPSE_DATA_TIMESTAMP_FORMAT = ECLIPSE_DATA_DATE_FORMAT + " " + ECLIPSE_DATA_TIME_FORMAT;

// https://science.nasa.gov/moon/eclipses/

// lunar eclipse values: {"T-":true,"T+":true,"P":true,"N":true,"T":true,"Ne":true,"Nb":true,"Nx":true}

// Penumbral	N	94	37.2%
// Partial	P	98	38.7%
// Total	T	61	24.1%



// https://science.nasa.gov/eclipses/types/

// solar eclipse values: {"P":true,"A":true,"T":true,"H":true,"Tm":true,"Pb":true,"Hm":true,"Pe":true,"H2":true,"A+":true,"Am":true,"As":true,"T-":true,"An":true,"H3":true,"Tn":true,"A-":true,"T+":true,"Ts":true}

// Ecl.       Eclipse Type where:
//             Type         P  = Partial Eclipse.
//                          A  = Annular Eclipse.
//                          T  = Total Eclipse.
//                          H  = Hybrid or Annular/Total Eclipse.

//                        Second character in Eclipse Type:
//                          "m" = Middle eclipse of Saros series.
//                          "n" = Central eclipse with no northern limit.
//                          "s" = Central eclipse with no southern limit.
//                          "+" = Non-central eclipse with no northern limit.
//                          "-" = Non-central eclipse with no southern limit.
//                          "2" = Hybrid path begins total and ends annular.
//                          "3" = Hybrid path begins annular and ends total.
//                          "b" = Saros series begins (first eclipse in series).
//                          "e" = Saros series ends (last eclipse in series).



function optimizeEclipseData(eclipseType) {
    var toReturn = [];

    // var eclipseTypes = {};

    var originalArray = eclipseType == ECLIPSE_TYPE__LUNAR ? LUNAR_ECLIPSES_ORIG : SOLAR_ECLIPSES_ORIG;

    for( var i = 0; i < originalArray.length; i++ ) {
        var ith = originalArray[i];
    
        var ithDate = ith["Calendar Date"];
    
        if ( ithDate.startsWith("-") ) {
            // Skip eclipses in the B.C. era. There's some issue with date/time parsing if I recall, for negative years.
            continue;
        }
    
        var ithTime = ith["Eclipse Time"];
        var ithType = ith["Eclipse Type"];
        
        // eclipseTypes[ithType] = true;

        if ( eclipseType == ECLIPSE_TYPE__LUNAR && ithType.startsWith("N") ) {
            // Skip Penumbral eclipses, the ones that you can barely see.
            continue;
        } else {
            var timestamp = ithDate + " " + ithTime;
            var ithMoment = moment.utc(timestamp, ECLIPSE_DATA_TIMESTAMP_FORMAT);
            var nativeDate = ithMoment.toDate();
            var eclipseDateAsXDate = nativeDateToXDate(nativeDate, 0, 0);
            var eclipseDateTimeZero = xDateToNativeDateForController(EVENT_SCOPE__DAYS, eclipseDateAsXDate);

            toReturn.push({
                date_millis: eclipseDateTimeZero.getTime(),
                eclipse_type: ithType
            });
        }
    }

    return toReturn;
}