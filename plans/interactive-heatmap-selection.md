# Interactive Heatmap Selection Plan

## Context

The goal is to extend the heatmap visualization with user interactivity for selecting output measure ranges (y-axis). Users can hover anywhere on the heatmap to preview row selection, click to start range selection, and click again to complete the range and switch to histogram mode showing aggregated data for the selected y-range bands.

The relevant files and entities are:

**packages/frontend/views/plots/heatmap.tsx**: Current heatmap implementation using D3.js

- `Model`: Current heatmap model with `style: "heatmap"`, data points, labels, and optional user data
- `view()`: D3.js rendering function that creates the 2D binned visualization

**packages/frontend/views/plots/histogram.tsx**: Histogram implementation for reference

- `Model`: Histogram model with `style: "histogram"` and 1D data array
- `view()`: D3.js rendering function for bar chart visualization

**packages/frontend/views/plot.tsx**: Plot container component

- `Plot`: DCGView component that manages plot lifecycle and rendering
- `Model`: Union type of all plot models (Histogram.Model | Dotplot.Model | Heatmap.Model)

**packages/frontend/views/reportcard/plot-list.tsx**: Plot management and state

- `PlotListController`: Manages multiple plots with filtering and interpolation
- `getPlot()`: Method that determines plot type based on data size and creates appropriate model

**packages/frontend/views/plots/util.ts**: Shared utilities

- `generateBinThresholds()`: Creates bin boundaries for different unit types
- `tickFormatBins()`: Formats bin labels for display
- `Bin2D`: Type definition for 2D bins with frequency and position data

**DCGView Architecture**: State management pattern

- Controllers use `context: { myDispatch }` for sending actions up the tree
- `handleDispatch()` methods receive actions flowing down from root
- State changes trigger re-renders through DCGView's reactive system

## Implementation

- [ ] Create PlotController to replace PlotModel in plot-list.tsx
  - [ ] Create new `PlotController` class in `packages/frontend/views/plot.tsx`
  - [ ] PlotController.state contains current PlotModel info (filter, inputMeasure, interpolate, plot)
  - [ ] Check for type errors and iterate until they pass

- [ ] Replace Heatmap model with heatmap controller
  - [ ] Create new `HeatmapController` class alongside existing heatmap model
  - [ ] HeatmapController.state contains current heatmap Model definition
  - [ ] Add interaction sub-state as disjoint union: 'no-clicks' | 'first-row-selected' | 'second-row-selected'
  - [ ] Include interaction data: hoveredRow, selectedStartRow, selectedEndRow
  - [ ] Add methods: handleRowHover, handleRowClick, handleReturnToHeatmap
  - [ ] add a Msg type, and use a dispatch / handleDispatch pattern like the other controllers
  - [ ] PlotListController should propagate dispatches down to PlotController, which in turn should propagate down to HeatmapController
  - [ ] Extend state with interaction sub-state: 'no-clicks' | 'first-row-selected' | 'second-row-selected'
  - [ ] Check for type errors and iterate until they pass

- [ ] Update PlotController to dynamically decide what to render
  - [ ] PlotController contains a HeatmapController instance when the plot type is 'heatmap'
  - [ ] When HeatmapController interaction state is 'second-row-selected': derive and render histogram instead
  - [ ] Otherwise: render heatmap with appropriate interaction callbacks and visual state
  - [ ] PlotController.render() returns appropriate model based on HeatmapController state
  - [ ] Check for type errors and iterate until they pass

- [ ] Update plot-list.tsx to use PlotController instead of PlotModel
  - [ ] Replace `PlotModel` type with `PlotController` in `packages/frontend/views/reportcard/plot-list.tsx`
  - [ ] Update plots array to contain PlotController instances instead of PlotModel objects
  - [ ] Modify getPlots() method to create PlotController instances
  - [ ] Update rendering logic to use PlotController.render() method
  - [ ] Check for type errors and iterate until they pass

- [ ] Extend existing heatmap to support interaction callbacks
  - [ ] the view should accept a dispatch method
  - [ ] Add direct SVG event listeners for full-canvas mouse interactions
  - [ ] Use `svg.on("mousemove", handler)` and `svg.on("click", handler)` for entire SVG area
  - [ ] Implement mouse coordinate to row index mapping using `d3.pointer(event, this)` and scale inversion
  - [ ] Only add SVG event listeners if dispatch method is provided
  - [ ] Keep existing rectangle mouseover/mouseout events for tooltips (no conflicts)
  - [ ] Iterate until unit tests pass

- [ ] Add visual feedback system for row interactions in heatmap
  - [ ] Implement row dimming logic in heatmap view: show full opacity for relevant rows, 30% for others
  - [ ] Add no-clicks hover state: dim all rows except hovered row
  - [ ] Add first-row-selected preview state: dim all rows except range between start and current hover

- [ ] Implement data aggregation in PlotController
  - [ ] Add method to aggregate 2D heatmap bins into 1D histogram data
  - [ ] Sum frequencies across selected y-bins for each x-bin based on selectedStartRow/selectedEndRow
  - [ ] Generate histogram model from aggregated data when interaction state is 'second-row-selected'
  - [ ] Preserve user data point if it falls within selected range

- [ ] Implement mode switching logic in PlotController
  - [ ] PlotController.render() method checks HeatmapController.state.interaction
  - [ ] When interaction is 'no-clicks' or 'first-row-selected': return heatmap model with callbacks
  - [ ] When interaction is 'second-row-selected': return derived histogram model
  - [ ] Pass handleReturnToHeatmap callback to histogram model for click-anywhere-to-return
  - [ ] Maintain consistent x-axis scaling between heatmap and histogram models

- [ ] Integrate histogram with return-to-heatmap functionality
  - [ ] Add optional onReturnToHeatmap callback to existing histogram model
  - [ ] Add click-anywhere-to-return functionality in histogram view
  - [ ] Maintain existing histogram hover tooltips for bar details
  - [ ] Ensure backward compatibility - callback is optional

- [ ] Integrate PlotController with existing plot system
  - [ ] Update `PlotListController.getPlot()` in `packages/frontend/views/reportcard/plot-list.tsx`
  - [ ] Replace PlotModel creation with PlotController creation
  - [ ] PlotController integrates with existing DCGView dispatch pattern in plot-list.tsx
  - [ ] Update message handling to work with PlotController instead of PlotModel

## Technical Considerations

**Selection Interaction Pattern:**

- Hover anywhere on heatmap to preview row selection (dims other rows)
- First click anywhere on heatmap to start range selection (selects that row)
- Continue hovering to preview range selection (dims rows outside start-to-hover range)
- Second click to complete range selection and switch to histogram mode
- In histogram mode: hover shows bar details, click anywhere returns to heatmap

**State Architecture:**

- Selection state lives in HeatmapController
- PlotController decides which model (heatmap vs histogram) to render based on HeatmapController state
- Changes propagate through standard DCGView dispatch pattern
- Plot regeneration triggers when PlotController state changes

**Data Aggregation Strategy:**

- PlotController aggregates 2D heatmap bins into 1D histogram data for selected y-range
- Sum frequencies across selected y-bins for each x-bin
- Generate standard histogram model from aggregated data (reuses existing histogram implementation)
- Preserve user data point always, and pass it along to preserve highlighting
- Use same x-axis binning and scaling as original heatmap for consistency

**Performance Considerations:**

- Debounce hover events to avoid excessive re-rendering during mouse movement
- Cache aggregated histogram data until selection range changes
- Use efficient coordinate-to-row mapping with D3 scale inversion
- Optimize row dimming by updating opacity attributes rather than full re-render

