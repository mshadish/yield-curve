/*
 * If there is an error, insert an error message in the HTML
 * and log the error to the console.
 */
function processError(error) {
    if (error) {
        // Use the "statusText" of the error if possible
        var errorText = error.hasOwnProperty("statusText") ?
            error.statusText : error.toString();

        // Insert the error message before all else
        d3.select("body")
            .insert("p", ":first-child")
            .text("Error: " + errorText)
            .style("color", "red");

        // Log the error to the console
        console.warn(error);
        return true;
    }

    return false;
}

/*
 * Parses us-state-names.tsv into components.
 * Used by d3.tsv() function.
*/
function parseStateName(row) {
    return {
        id: +row.id,
        name: row.name.trim(),
        code: row.code.trim().toUpperCase()
    };
}

function symbolMap() {

    var lookup = {};

    // var projection = d3.geo.albersUsa();
    var projection = d3.geo.mercator();

    var radius = d3.scale.sqrt().range([5, 15]);

    var log = d3.select("#log");

    var map = null; // map data
    var values = null; // values for symbols

    // gets the value property from the dataset
    // for our example, we need to reset this!
    var value = function(d) { return d.value; };

    // let's generate the color scaling
    var colorScale = d3.scale.threshold()
        .domain([11, 35, 83, 200])
        .range(['#fee5d9','#fcae91','#fb6a4a','#de2d26','#a50f15']);
    var x_key = d3.scale.linear()
        .domain([0, 604])
        .range([0, 404]);


    function chart(id) {
        var width = 900;
        var height = 900;

        if (map === null || values === null) {
            console.warn("Unable to draw symbol map: missing data.");
            return;
        }

        updateLog("Drawing map... please wait.");

        var svg = d3.select("svg#" + id);
        var bbox = svg.node().getBoundingClientRect();

        // update project scale
        // (this may need to be customized for different projections)
        // projection = projection.scale(bbox.width);
        projection = projection.scale((width + 1) / 2 / Math.PI);

        // update projection translation
        projection = projection.translate([
            bbox.width / 2,
            bbox.height / 2
        ])
            .precision(.1);

        // set path generator based on projection
        var path = d3.geo.path().projection(projection);

        // update radius domain
        // uses our value function to get the right property
        radius = radius.domain(d3.extent(values, value));

        // create groups for each of our components
        // this just reduces our search time for specific states
        var country = svg.append("g").attr("id", "country");
        //var states  = svg.append("g").attr("id", "states");
        var symbols = svg.append("g").attr("id", "dots");


        // show that we have an array of features for states
        //console.log(topojson.feature(map, map.objects.states));

        // draw base map
        country.append("path")
            // use datum here because we only have 1 feature,
            // not an array of features (needed for data() call)
            .datum(topojson.feature(map, map.objects.land))
            .attr("d", path)
            .classed({"country": true});


        // draw symbols
        symbols.selectAll("circle")
            .data(values)
            .enter()
            .append("circle")
            .attr("r", function(d, i) {
                return radius(value(d));
            })
            .attr("cx", function(d, i) {
                // projection takes [longitude, latitude]
                // and returns [x, y] as output
                return projection([d.longitude, d.latitude])[0];
            })
            .attr("cy", function(d, i) {
                return projection([d.longitude, d.latitude])[1];
            })
            .style('fill', function(d) {return colorScale(Number(d.depth)); })
            .classed({"symbol": true})
            .on("mouseover", showHighlight)
            .on("mouseout", hideHighlight);

        // draw the legend
        var key = svg.append('g')
            .attr('class', 'key')
            .attr('transform', 'translate(' + width/2 + ',40)');
        key.selectAll('rect')
            .data(colorScale.range().map(function(d,i) {
                return {
                    x0: i ? x_key(colorScale.domain()[i-1]) : x_key.range()[0],
                    x1: i < colorScale.domain().length ? x_key(colorScale.domain()[i]) : x_key.range()[1],
                    z: d
                };
            }))
        .enter().append('g').each(function(d,i) {
            var g = d3.select(this);
            g.append('rect')
                .attr('height', 8)
                .attr('x', function(d) {return d.x0; })
                .attr('width', function(d) {return d.x1 - d.x0; })
                .style('fill', function(d) {return d.z ;});

            g.append('text')
                .attr('x', function(d) {return d.x0; })
                .attr('dy', i % 2 === 0 ? '-.1em' : '1.5em')
                .text(colorScale.domain()[i-1]);

            g.append('rect')
                .attr('height', 10)
                .attr('x', function(d) {return d.x0; })
                .attr('width', 2)
                .style('fill', i === 0 ? 'none' : 'black');
        });

        // add text
        key.append('text')
            .attr('x', -20)
            .attr('y', '-20')
            .text('Depth');



    }

    /*
     * These are functions for getting and setting values.
     * If no argument is provided, the function returns the
     * current value. Otherwise, it sets the value.
     *
     * If setting the value, ALWAYS return the chart object.
     * This will allow you to save the updated version of
     * this environment.
     *
     * Personally, I do not like _ to indicate the argument
     * that may or may not be provided, but its what the
     * original model uses.
     */

    // gets/sets the mapping from state abbreviation to topojson id
    chart.lookup = function(_) {
        // if no arguments, return current value
        if (!arguments.length) {
            return lookup;
        }

        // otherwise assume argument is our lookup data
        _.forEach(function(element) {
            lookup[element.id] = element.name;

            // lets you lookup the ID of a state
            // by its code (2-letter abbreviation)
            if (element.hasOwnProperty("code")) {
                lookup[element.code] = element.id;
            }
        });

        // always return chart object here
        console.log("Updated lookup information.")
        return chart;
    };

    /*
     * Note the semi-colon above. This was an assignment,
     * even though we were defining a function. All assignments
     * should end in a semi-colon.
     */

    // allows for customization of projection used
    chart.projection = function(_) {
        if (!arguments.length) {
            return projection;
        }

        projection = _;
        return chart;
    };

    /*
     * You can get/set functions just like variables.
     * The basic format is always the same.
     */

    // allows for customization of radius scale
    chart.radius = function(_) {
        if (!arguments.length) {
            return radius;
        }

        radius = _;
        return chart;
    };

    // updates the map data, must happen before drawing
    chart.map = function(_) {
        if (!arguments.length) {
            return map;
        }

        map = _;
        updateLog("Map data loaded.");

        return chart;
    };

    // updates the symbols values, must happen before drawing
    chart.values = function(_) {
        if (!arguments.length) {
            return values;
        }

        values = _;
        updateLog("Symbol data loaded.");

        return chart;
    };

    // updates how we access values from our dataset
    chart.value = function(_) {
        if (!arguments.length) {
            return value;
        }

        value = _;
        return chart;
    };

    /*
     * These functions are not outwardly accessible. They
     * are only used within this environment.
     */

    // updates the log message
    function updateLog(message) {
        // if no arguments, use default message
        if (!arguments.length) {
            log.text("Hover over a circle for more details");
            return;
        }

        // otherwise set log message
        log.text(message);
    }

    // called on mouseover
    function showHighlight(d) {
        // highlight symbol
        d3.select(this).classed({
            "highlight": true,
            "symbol": true
        });

        // highlight state associated with symbol
        d3.select("g#states")
            .select("path#state" + lookup[d.state])
            .classed({
                "highlight": true,
                "state": true
            });

        // updateLog(d.mag + ", " + d.mag +
        //     " received an average of " + d.precip +
        //     " inches of precipitation.");

        updateLog("Earthquake with magnitude of " + d.mag +
                ", depth of " + d.depth +
                ", location: " + d.place);
    }

    // called on mouseout
    function hideHighlight(d) {
        // reset symbol
        d3.select(this).classed({
            "highlight": false,
            "symbol": true
        });

        // reset state associated with symbol
        d3.select("g#states")
            .select("path#state" + lookup[d.state])
            .classed({
                "highlight": false,
                "state": true
            });

        // reset log message
        updateLog();
    }

    return chart;
}