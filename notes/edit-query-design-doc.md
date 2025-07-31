# context

I need to rework the EditQuery situation.

MeasureStats is no longer a thing. Instead we have `facetDistribution`.

This maps from `FacetString` - which is a particular value or range of values from a particular measure.

# goal

EditQuery should be updated to be essentially a tool for selecting a `MeiliFilterQuery`.

We should rename it to something like `FilterSelector`

I want to move it to a sidebar that will appear on the left hand of the screen (collapsed on narrow screens)

# data flow

We will re-query the backend every time a filter changes. This will provide us new facetDistribution values. So this component should accept a facetDistribution upon construction define an action to update its facetDistribution value.

I still want to have previews of counts for how many snapshots are "behind" each filter. We will use the facetDistribution for this.

# ui

The total set of measures we can filter by should be visible in a vertical arrangement, with one row per measure. There should be an input box at the top to help us narrow down the measures we want, by using fuzzy-search filtering on the total list of measures and such to narrow things down from that long list.

Depending on the measure, we will have different interfaces for how to enable filtering by that measure:

- for categorical measures, there should be a nested row for each category, with a checkbox in front of it.
  - for each option, convert it to a facet, then pull the snapshot count from the facetDistribution and show it after the value in each row in parenthesis, so something like:

gender
[ ] male (100)
[ ] female (115)

- for linear measures, we should have a row below the measure name with a two-ended slider, where the user can slide a min and a max value.
  - these sliders should have discrete spacings on them, corresponding to facet bin values
  - the slider should be overlayed by a histogram, with each discrete step marked by snapshot frequency from that bin
  - to get the frequency counts, grab the facet for the bin and look it up in the facetDistribution
  - use the locale to determine which set of facets to grab

weight
(histogram overlay)
slider with discrete positions: 100lb - 105lb - 110lb ... followed by a total (100 total snapshots)
currently selected bin ranges (110 - 155)
