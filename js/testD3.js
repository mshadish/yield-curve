// Code adapted from http://bl.ocks.org/mbostock/1642989
function testD3(svgid) {
    var svg = d3.select("svg#" + svgid);

    if (svg.empty()) {
        console.warn("Unable to find SVG:", svgid);
        return;
    }

    var n = 40;
    var data = d3.range(n).map(function() { return Math.random()});

    var bbox = svg.node().getBoundingClientRect();
    var lineWidth = 1.5;

    var x = d3.scale.linear();
    x = x.domain([1, n - 2]);
    x = x.range([0, bbox.width]);

    var y = d3.scale.linear();
    y = y.domain(d3.extent(data));
    y = y.range([bbox.height - lineWidth, lineWidth]);

    var line = d3.svg.line().interpolate("basis");
    line = line.x(function(d, i) { return x(i); });
    line = line.y(function(d, i) { return y(d); });

    var path = svg.append("g").append("path").datum(data);
    path.attr("class", "line");
    path.attr("d", line);
    path.attr("fill", "none");
    path.attr("stroke", "black");
    path.attr("stroke-width", lineWidth);

    tick();

    function tick() {
        data.push(Math.random());

        path.attr("d", line);
        path.attr("transform", null);

        path.transition()
            .duration(500)
            .ease("linear")
            .attr("transform", "translate(" + x(0) + ",0)")
            .each("end", tick);

        data.shift();
    }
}

