#!/usr/bin/env sh
###############################################################################
#
# Bash script to manage commits and updates of historical treasury data
#
# Specifically, if it looks like we have more data in the historical data file
# then we will commit and push to the repo
#
###############################################################################


# in order to do a proper comparison,
# first store the old line count of the historical treasury data file
old_line_count=`wc -l treasury_data_norm.csv | tr -s ' ' | cut -d ' ' -f 2`;



# next, run the python script to "refresh" the treasury data files
# ("refresh" because there may not be new data)
python refreshTreasuryData.py


# after running the update,
# compare the line counts of the old historical data file
# and the new data file to see if we have more data
new_line_count=`wc -l treasury_data_norm.csv | tr -s ' ' | cut -d ' ' -f 2`;



# now compare the old historical data count to the new count
if [ "$((old_line_count))" -lt "$((new_line_count))" ]
	# if we now have more records, then commit and push
	then
		# add the data files to commit
		git add treasury_data_norm.csv;
		git add treasury_data_historical.csv;
		# commit 
		git commit -m 'Data update `date`';
		# ...and push
		git push;
fi;
