/**
 ## <a name="heatmap" href="#heatmap">#</a> Heat Map [Concrete] < [Color Chart](#color-chart) < [Base Chart](#base-chart)
 A heat map is matrix that represents the values of two dimensions of data using colors.

 #### dc.heatMap(parent[, chartGroup])
 Create a heat map instance and attach it to the given parent element.

 Parameters:
 * parent : string - any valid d3 single selector representing typically a dom block element such as a div.
 * chartGroup : string (optional) - name of the chart group this chart instance should be placed in. Once a chart is placed
 in a certain chart group then any interaction with such instance will only trigger events and redraw within the same
 chart group.

 Return:
 A newly created heat map instance

 ```js
 // create a heat map under #chart-container1 element using the default global chart group
 var heatMap1 = dc.heatMap("#chart-container1");
 // create a heat map under #chart-container2 element using chart group A
 var heatMap2 = dc.heatMap("#chart-container2", "chartGroupA");
 ```

 **/
dc.heatMap = function (parent, chartGroup) {

    var DEFAULT_BORDER_RADIUS = 6.75;

    var _chartBody;

    var _cols;
    var _rows;
    var _xBorderRadius = DEFAULT_BORDER_RADIUS;
    var _yBorderRadius = DEFAULT_BORDER_RADIUS;

    var _chart = dc.colorChart(dc.marginable(dc.baseChart({})));
    _chart._mandatoryAttributes(['group']);
    _chart.title(_chart.colorAccessor());

    _chart.boxOnClick = function (d) {
        var filter = d.key;
        dc.events.trigger(function() {
            _chart.filter(filter);
            dc.redrawAll(_chart.chartGroup());
        });
    };

    function filterAxis(axis, value) {
        var cellsOnAxis = _chart.selectAll(".box-group").filter( function (d) {
            return d.key[axis] == value;
        });
        var unfilteredCellsOnAxis = cellsOnAxis.filter( function (d) {
            return !_chart.hasFilter(d.key);
        });
        dc.events.trigger(function() {
            if(unfilteredCellsOnAxis.empty()) {
                cellsOnAxis.each( function (d) {
                    _chart.filter(d.key);
                });
            } else {
                unfilteredCellsOnAxis.each( function (d) {
                    _chart.filter(d.key);
                });
            }
            dc.redrawAll(_chart.chartGroup());
        });
    }

    dc.override(_chart, "filter", function(filter) {
        if(filter) {
            return _chart._filter(dc.filters.TwoDimensionalFilter(filter));
        } else {
            return _chart._filter();
        }

    });

    _chart.xAxisOnClick = function (d) { filterAxis(0, d); };
    _chart.yAxisOnClick = function (d) { filterAxis(1, d); };

    _chart.keyAccessor(function(d) {
        return d.key[0];
    });

    function uniq(d,i,a) {
        return !i || a[i-1] != d;
    }

    _chart.rows = function (_) {
        if (arguments.length) {
            _rows = _;
            return _chart;
        }
        if (_rows) return _rows;
        var rowValues = _chart.data().map(_chart.valueAccessor());
        rowValues.sort(d3.ascending);
        return d3.scale.ordinal().domain(rowValues.filter(uniq));
    };

    _chart.cols = function (_) {
        if (arguments.length) {
            _cols = _;
            return _chart;
        }
        if (_cols) return _cols;
        var colValues = _chart.data().map(_chart.keyAccessor());
        colValues.sort(d3.ascending);
        return d3.scale.ordinal().domain(colValues.filter(uniq));
    };

    _chart.doRender = function () {
        _chart.resetSvg();

        _chartBody = _chart.svg()
          .append("g")
          .attr("class", "heatmap")
          .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");

        return _chart.doRedraw();
    };

    _chart.doRedraw = function () {
        var rows = _chart.rows(),
            cols = _chart.cols(),
            rowCount = rows.domain().length,
            colCount = cols.domain().length,
            boxWidth = Math.floor(_chart.effectiveWidth() / colCount),
            boxHeight = Math.floor(_chart.effectiveHeight() / rowCount);

        cols.rangeRoundBands([0, _chart.effectiveWidth()]);
        rows.rangeRoundBands([_chart.effectiveHeight(), 0]);

        var boxes = _chartBody.selectAll("g.box-group").data(_chart.data(), function(d,i) {
            return _chart.keyAccessor()(d,i) + '\0' + _chart.valueAccessor()(d,i);
        });
        var gEnter = boxes.enter().append("g")
            .attr("class", "box-group");

        gEnter.append("rect")
            .attr("class","heat-box")
            .attr("fill", "white")
            .on("click", _chart.boxOnClick);

        gEnter.append("title")
            .text(function (d) { return _chart.title()(d); });

        dc.transition(boxes.select("rect"), _chart.transitionDuration())
            .attr("x", function(d,i) { return cols(_chart.keyAccessor()(d,i)); })
            .attr("y", function(d,i) { return rows(_chart.valueAccessor()(d,i)); })
            .attr("rx", _xBorderRadius)
            .attr("ry", _yBorderRadius)
            .attr("fill", _chart.getColor)
            .attr("width", boxWidth)
            .attr("height", boxHeight);

        boxes.exit().remove();

        var gCols = _chartBody.selectAll("g.cols");
        if (gCols.empty())
            gCols = _chartBody.append("g").attr("class", "cols axis");
        gCols.selectAll('text').data(cols.domain())
            .enter().append("text")
              .attr("x", function(d) { return cols(d) + boxWidth/2; })
              .style("text-anchor", "middle")
              .attr("y", _chart.effectiveHeight())
              .attr("dy", 12)
              .on("click", _chart.xAxisOnClick)
              .text(function(d) { return d; });
        var gRows = _chartBody.selectAll("g.rows");
        if (gRows.empty())
            gRows = _chartBody.append("g").attr("class", "rows axis");
        gRows.selectAll('text').data(rows.domain())
            .enter().append("text")
              .attr("y", function(d) { return rows(d) + boxHeight/2; })
              .attr("dy", 6)
              .style("text-anchor", "end")
              .attr("x", 0)
              .attr("dx", -2)
              .on("click", _chart.yAxisOnClick)
              .text(function(d) { return d; });

        if (_chart.hasFilter()) {
            _chart.selectAll("g.box-group").each(function (d) {
                if (_chart.isSelectedNode(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll("g.box-group").each(function (d) {
                _chart.resetHighlight(this);
            });
        }
    };

    _chart.xBorderRadius = function (d) {
        if (arguments.length) {
            _xBorderRadius = d;
        }
        return _xBorderRadius;
    };

    _chart.yBorderRadius = function (d) {
        if (arguments.length) {
            _yBorderRadius = d;
        }
        return _yBorderRadius;
    };

    _chart.isSelectedNode = function (d) {
        return _chart.hasFilter(d.key);
    };

    return _chart.anchor(parent, chartGroup);
};
