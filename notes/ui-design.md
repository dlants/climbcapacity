ok, so the central problem is that the data is going to be sparse. So you only really want to be exploring where there's data.

Someone filling out some of the measures isn't going to fill out all of the measures.

so you want to navigate the space of:

- anthro measures
- outcome measures
- capacity measures

all of these in an intersectional way.

So I guess the UI has just the ability to select all of these.

- for anthro measures, it behaves like a filter.
- for outcome measures, you select just the one.
- for capacity measures, you select just the one (or interpolate, in which case this becomes an OR across several capacity measures).

This way at each point we can facet based on the current combination of the three.

So this means we need only "has_measure" markers for everything other than anthro measures.

What does this mean for how we store snapshots?

- i guess we still store everything together. We store the measures in the doc, as well as the facet array, but don't actually retrieve the facet array.
- the number of measures for any given snapshot is going to be small.

for anthro measures, there's relatively few of them, and they're not "measureClasses", so we can probably just have something flat for these.

for output measures, we can probably do a series of toggle boxes: sport/boulder, outdoor/gym, max/top5/flash/etc...

for capacities, we need to do some combination... there are too many variations of all the various measure classes, so we will have to show the measure class at the selection level, then do a measure class toggle within that (so similar to the output measure, probably using ./packages/frontend/views/select-measure-class.tsx)

consequences of this:

1. we should split up the facets, since we don't actually need all of them at all times.

- anthro facets should remain as-is (we need the facets and bins, etc...)
- we only need the output facets when we're editing the output measure. So we should put it editing behind a button, so we can fetch the output measure facets just as we need them.
- for measure classes, what info do we need to navigate them effectively?
- when picking the measure class, we need to know how many total snapshots there are for any measure within that class, given the current set of filters and output measure (this means we need a has_measure_class facet).
- when picking within an output or a capacity measure class, we need the complete set of facets for that entire measure class. I think we can do that via a dropdown of all of the possible measureIds within that class, sorted in descending order by how many snapshots each has.

ok so:

```
{
    anthro_facets: // full list of facets of all the anthro measures for this snapshot, including bins
    output_measure_ids: // list of output measureIds for this snapshot, just whether they exist or not.
    input_measure_classes: // all the capacity measure classes (or ids for measures that are not part of classes) for this snapshot
    input_measure_ids: // all the input measureIds
}
```

Let's define a new nominal type `MeasureClassName`, with input_measure_classes being of type `(MeasureClassName | MeasureId)[]`

2. we should update the routes to support the following:
   snapshot/query: takes

```
type SnapshotQuery = {
  anthro_filters: FacetString[][]; // OR over inner array, AND over outer array
  output_measure_id: MeasureId;
  input_measure_id: MeasureId;
}
```

This should return a list of snapshots satisfying all of these choices.

snapshot/facets/anthro: takes

```
type AnthroFacetsQuery= {
  output_measure_id?: MeasureId;
  input_measure_id?: MeasureId;
}
```

This should return anthro facets.

snapshot/facets/output_measure

```
type OutputMeasureFacetsQuery: {
  anthro_filters: FacetString[][];
  input_measure_id?: MeasureId
}
```

This should return just the output measure id facets, filtered by the anthro measures and the input_measure_id (if defined).

snapshot/facets/input_measure_classes

```
type InputMeasureClassFacetsQuery: {
  anthro_filters: FacetString[][];
  output_measure_id?: MeasureId
}
```

This should return just the input measure class facets, filtered by the anthro measures and the input_measure_id (if defined)

snapshot/facets/input_measure_for_class

```
type InputMeasureFacetsForClassQuery: {
  anthro_filters: FacetString[][];
  input_measure_class: MeasureClassId;
  output_measure_id?: MeasureId
}
```

This should return just the facets for the given input measure class, filtered by the anthro measures and the input_measure_id (if defined)

3. we should update the data exploration tab to have a list of graphs. Each graph should now have its own anthro filter, output measure and input measure (capacity measure) selection UI.

The graph should start with empty anthro filters, and no output measure or input measure selected.

There should be a button to add a new graph, which copies the state of the preceding graph.

4. Before we render the facet controls, we should query the anthro facets. This should allow us to display the full set of counts for each filter, as well as full histograms for binned anthro facets (like height, weight). Whenever we update the input or output measure, we should re-query the anthro facets to update those numbers and histograms

There should be UI to choose input measure classes. This should query the input measure class endpoint, and let you choose the measure classes. They should come down in a dropdown, be annotated by how many snapshots are in the class, and be sorted in descending order. This endpoint should re-fetch every time we make a change to the anthro facets or the output measure. The UI should just be a simple dropdown.

For the input measures, and the output measures (of the selected measure class), we should simplify the UI to be just a single dropdown for all the possible measures within the class, shown in descending order by the facet count. We should re-fetch these whenever the anthro measures change, or the input/output measure changes (whatever we're not controlling currently).
