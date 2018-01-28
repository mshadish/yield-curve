// Yield Curve visualization
// Matt Shadish
// 1/14/2018



// read in the data
d3.csv('treasury_data_historical.csv', function(error, data) {
	if (error) {
		console.warn(error);
		return
	}

	var dataset = data;

	dataset.forEach(function(d) {
			var col_headers = Object.keys(d)
			col_headers.forEach(function(e) {
				if (["term"].indexOf(e) >= 0) { return; }
				if (d[e] === "") { 
					d[e] = NaN; 
				} else {
					// converts to an int
					d[e] = +d[e]; 
				}
			})
			
	});

	generateYieldCurve(dataset);

});





// we'll define the plotting of the yield curve as its own function
// that requires data be passed to it
function generateYieldCurve(data) {


	// define the area for the chart
	var margin = {top: 50, right: 80, bottom: 50, left: 50},
	    width = 960 - margin.left - margin.right,
	    height = 500 - margin.top - margin.bottom;


	// starting date here
	var date = 'Today';


	var x = d3.scale.linear()
		.domain([0,11])
	    .range([0, width]);

	var y = d3.scale.linear()
		.domain([0,10])
	    .range([height, 0]);




	// X axis definition
	//
	// define ticklabels to use
	var tickLabels = ['', '1MO','3MO','6MO','1YR','2YR','3YR','5YR','7YR','10YR','20YR','30YR']
	// and then create the xaxis svg
	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom")
	    // apply the tick labels accordingly
	    .tickFormat(function(d,i){ return tickLabels[i] });

	// Y axis definition
	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var line = d3.svg.line()
	    .interpolate("basis")
	    // try a fill interpolation
	    /*.interpolate(function(points){  //interpolate straight lines with gaps for NaN
	    	console.log(points);
	      var section = 0;
	      var arrays = [[]];
	      points.forEach(function(d,i){
	        if(isNaN(d[1])){
	        	null;
	          //section++;
	          //arrays[section] = [];
	        }else{
	          arrays[section].push(d)
	        }
	      });
	      console.log(arrays);
	      var pathSections = [];
	      arrays.forEach(function(points){
	        pathSections.push(d3.svg.line()(points));
	      })
	      var joined = pathSections.join('');
	      console.log(joined);
	      return joined.substr(1); //substring becasue D£ always adds an M to a path so we end up with MM at the start
	    })
	*/
	    .x(function(d) { return x(d['x-axis']); })
	    .y(function(d) { return y(d[date]) });


	var svg = d3.select("body").attr("align", "center").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	    ;



	    // add text for the x- and y-axes
	    svg.append('text')
	    	.attr('x', width/2)
	    	.attr('y', height + margin.bottom)
	    	.style('text-anchor', 'middle')
	    	.style('font-size', 20)
	    	.style('font-weight', 900)
	    	.text('Term');

	    // y-axis, which is Yield
	    svg.append('text')
		    .attr('x', 0)
		    .attr('y', -margin.top/2)
		    .style('text-anchor', 'middle')
		    .style('font-size', 20)
		    .style('font-weight', 900)
		    .text('Yield (%)');


		// Title here
		svg.append('text')
	        .attr('x', (margin.left + width)/2)
	        .attr('y', -margin.top/2)
	        .style('text-anchor', 'middle')
	        .style('font-size', 24)
	        .style('font-weight', 900)
	        .text('Treasury Yield Curve over Time');


	    // add the year label
	    var label = svg.append('text')
	        .attr('class', 'year label')
	        .attr('text-anchor', 'end')
	        .style('font-family', 'Comic Sans MS')
	        .attr('y', height - margin.bottom)
	        .attr('x', width - margin.right)
	        .text(date);

	    // add a box on top of the year
	    // this is the box we'll use to determine the date values
	    // add an overlay for the box
	    var box = label.node().getBBox();


	    var overlay = svg.append('rect')
	        .attr('class', 'overlay')
	        .attr('x', box.x)
	        .attr('y', box.y)
	        .attr('width', box.width)
	        .attr('height', box.height)
	        .on('mouseover', userMovement);
	    


	    // provide the definition of the userMovement() function
	    function userMovement() {

	        // define the annual scaling for user speicifcation
	        var yearScale = d3.scale.linear()
	            .domain([1990, 2019])
	            .range([box.x + 10, box.x + box.width - 10])
	            .clamp(true);

	        svg.transition().duration(0);
	        // add the mouse scaling
	        overlay.on('mouseover', mouseover)
	            .on('mouseout', mouseout)
	            .on('mousemove', mousemove)
	            .on('touchmove', mousemove);

	        // define the mouseover, mouseout, and mousemove functions
	        function mouseover() {
	            label.classed('active', true);
	        }
	        function mouseout() {
	            label.classed('active', false);
	        }
	        function mousemove() {
	            displayYear(yearScale.invert(d3.mouse(this)[0]));
	        }
	    }


	    // create a mapping to convert next year's date to the "Today" value
	    // as it is represented in the treasury data
	    var mapping = {2019: 'Today'};


	    // define the function to change year on mouseover
	    // this is used in the mouseover transparent box over the year display
	    // and allows the user to manipulate the year we're interested in
	    function displayYear(year) {
	    	// this is where the meat is
	    	// first, we round the year and change the global date variable...
	    	date = Math.round(year);
	    	// check the hash lookup
	    	if (mapping.hasOwnProperty(date)) {date = mapping[date]; }
	    	// ...then call the line attribute to re-plot
	    	svg.selectAll(".line").attr("d", line);
	        // change the year that displays
	        label.text(date);
	    }





		svg.append("g")
		    .attr("class", "x axis")
		    .attr("transform", "translate(0," + height + ")")
		    .call(xAxis);

		svg.append("g")
		    .attr("class", "y axis")
		    .call(yAxis)



		
	  svg.append("path")
	      .datum(data)
	      .attr("class", "line")
	      ;


	  // plot the initial date
	  svg.selectAll(".line").attr("d", line);


}
