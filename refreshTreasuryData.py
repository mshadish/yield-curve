# -*- coding: utf-8 -*-
"""
Python script to pull down the current year's data from treasury.gov
and append it to our dataset of treasury yields

1) HTTP request to treasury.gov to get this current year's treasury data
    (xml format)

2) Transform the data to a normalized form showing yield by term and date

3) Write out
"""
# imports
# utility imports
import re
import dateutil
# imports to get and handle the XML data
import requests
import xml.etree.cElementTree as xml
# other imports
import pandas as pd



# define the conversion (in time) of the term and length of time
TERM_CONVERSION = {
    'BC_10YEAR': 10,
    'BC_1MONTH': 1.0 / 12.0,
    'BC_1YEAR': 1,
    'BC_20YEAR': 20,
    'BC_2YEAR': 2,
    'BC_30YEAR': 30,
    'BC_3MONTH': 0.25,
    'BC_3YEAR': 3,
    'BC_5YEAR': 5,
    'BC_6MONTH': 0.5,
    'BC_7YEAR': 7
}



# treasury.gov XML url defined here
TREASURY_URL = 'https://www.treasury.gov/resource-center/data-chart-center/interest-rates/pages/XmlView.aspx?data=yieldyear&year=2018'

print 'Requesting treasury data...'
# grab the data from treasury.gov...
xml_response = requests.get(TREASURY_URL)
# ...read in the text as an element tree...
xml_text = xml_response.text
etree = xml.ElementTree(xml.fromstring(xml_text))
# ...prepare the xml to iterate through
root = etree.getroot()
xml_children = root.getchildren()
# ...and then parse through the xml element tree in the next step


print 'Parsing XML...'
### PARSING THROUGH THE XML
# we'll use a simple loop and regex matching
# to step through the xml data
recs = []

for element in xml_children:
    if element.tag is not None:
        # we're looking for records tagged with 'entry'
        if element.tag.endswith('entry'):
            # indicating we've found a day's yield
            # get the iterator to step through the elements
            # looking for the 'content' tag
            entry_children = element.getiterator()
            
            # initialize the date-storage variables
            curdate = None
            curdate_dt = None

            # pull out the content
            for entry_child in entry_children:
                # look for the date
                if entry_child.tag.endswith('NEW_DATE'):
                    # pull out the date
                    curdate = entry_child.text    
                    # and convert to a parsed date value
                    curdate_dt = dateutil.parser.parse(curdate)
                
                # otherwise look for an indication of the note term
    
                # if this record is associated with a note yield,
                # pull out the term and the yield
                elif re.search(r'BC_\d+[a-zA-Z]+$', entry_child.tag):
                    # pull out the date
                    term = re.search('BC_\d+[a-zA-Z]+$', entry_child.tag).group(0)
                    # may have a blank yield
                    # in which case we'll skip
                    if entry_child.text is None:
                        continue
                    else:
                        # otherwise, we can add the item to 
                        rate = float(entry_child.text)
                        recs.append({'term': term,
                                     'date_string': curdate_dt.strftime('%Y-%m-%d'),
                                     'yield': rate,
                                     'dt': curdate_dt})
# end loop through xml

# convert to a dataframe
newdf = pd.DataFrame(recs)

print 'Reading and combining with historical data...'
# read the historical data
historical_df = pd.read_csv('treasury_data_norm.csv')
historical_df['dt'] = historical_df['date_string'].apply(dateutil.parser.parse)
# ...and combine with the new data
combined = newdf.append(historical_df).drop_duplicates(['dt','term'])
# sort it for consistency
combined = combined.sort_values(['dt','term'])
# write it out as a new file
# which we'll compare against the original norm file to see if a commit/push is necessary
combined[['date_string','yield','term']].to_csv('treasury_data_norm.csv', index=False)



# extra step -- convert the current year to a 'TODAY' value
# for plotting reasons
max_date = combined['dt'].max()
combined['year'] = combined['dt'].apply(lambda x: {max_date: 'Today'}.get(x,x.strftime('%Y')))


###
# compute the average yield per term per year
###
combined['termlength'] = combined['term'].apply(lambda x: TERM_CONVERSION.get(x))
# drop any records where we don't have the term conversion
combined = combined[pd.notnull(combined['termlength'])]
grp_by_year = combined.groupby(['year','termlength'])['yield'].mean().reset_index()







print 'Transforming to crosstab'
###########
# INTERPOLATE THE VALUES BEFORE WRITING OUT
#
# methodology

# step 1) pivot the data into a crosstab of TERMLENGTH crossed with YEAR
#
# step 2) unstack the crosstab to create a normalized view of
#    YEAR | TERMLENGTH | YIELD
#    this unstack will include null values for cases
#    where no yield was provided for a given YEAR + TERMLENGTH
#
# step 3) interpolate values by year by iterating through each year
#    and leveraging pandas interpolate() and fill() methods


# step 1) pivot
# pivot such that the years are represented as columns
pivoted = grp_by_year.pivot(index='termlength', columns='year', values='yield')


# step 2) unstack
# after pivoting the first time, unstack so we can interpolate
unstacked = pivoted.unstack().reset_index()
# rename columns for clarity
unstacked.columns = ['year','termlength','yield']


# step 3) interpolate() and fill()
# we'll iterate through each year, subset the dataframe by year, fill,
# and then re-append to a final dataframe
interpolated = pd.DataFrame([], columns=unstacked.columns)
for yearval in unstacked['year'].unique():
    # grab subset by year
    subset_df = unstacked[unstacked['year'] == yearval]
    # sort by term length
    subset_df = subset_df.sort_values('termlength')
    # interpolate
    subset_df = subset_df.interpolate()
    # fill the edges
    subset_df = subset_df.ffill().bfill()
    # add to our final dataframe
    interpolated = interpolated.append(subset_df)
# complete looping through years








#############
# FINAL
# TRANSFORM INTO D3.js FORMAT
#
# this is simply a crosstab again

# repivot into crosstab
d3_format = interpolated.pivot(index='termlength', columns='year',
                               values='yield')
# reset the index which we'll treat as our x-axis values
d3_format = d3_format.reset_index()
# offset the index by 1 for plotting
d3_format.index = d3_format.index + 1
# sort to be sure
d3_format = d3_format.sort_values('termlength')

# write out to d3 format CSV
d3_format.to_csv('treasury_data_historical.csv', index_label='x-axis')

