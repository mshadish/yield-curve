# Treasury Yield Curve Visualization

Simple D3 visualization to show how the Treasury Yield curve has changed over time.

## Usage

To use, hover the mouse over the year display (which provides data for 1990 - today).  Including this year, each year is represented as the average of data points for the year.  The final data point is a representation of the yield curve today.

## Automatic updates

Included sript to refresh the historical treasury data set nightly if there are new data points.  Instead of trying to make a request to the treasury.gov site every time this website is hit, we will instead make a new commit and push whenever we see additional data added to the historical data set.  This is driven by the shell script historicalDataUpdate.sh.

## To do

Set update to run on cron.  Clean up directory.
