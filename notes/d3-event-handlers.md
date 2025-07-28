# D3 Event Handlers in the Heatmap Component

## How D3's `.on()` Method Works

D3's `.on()` method attaches event listeners to DOM elements in a selection. The basic syntax is:

```typescript
selection.on(eventType, handler)
```

Where:
- `eventType` is a string like `"click"`, `"mouseover"`, `"mouseout"`
- `handler` is a function that receives `(event, data)` parameters

The key insight is that **D3 automatically passes the bound data** as the second parameter to your event handler.

## Current Event Handling in Heatmap

The existing heatmap already uses event handlers for tooltips:

```typescript
svg
  .selectAll("rect")
  .on("mouseover", (event, data) => {
    const d = data as Bin2D | undefined;
    if (!d) return;
    
    // Access the bound data
    const xRange = tickFormatBins(d.col, model.xUnit, xThresholds);
    const yRange = tickFormatBins(d.row, model.yUnit, yThresholds);
    
    tooltip.html(`Frequency: ${d.frequency}...`);
  })
  .on("mouseout", () => {
    tooltip.style("visibility", "hidden");
  });
```

## Adding Click Handlers to Y-Axis

### The Challenge

The y-axis is created using `d3.axisLeft(y)`, which generates a complex SVG structure:

```xml
<g class="axis">
  <g class="tick">
    <line></line>
    <text>Label 1</text>
  </g>
  <g class="tick">
    <line></line>
    <text>Label 2</text>
  </g>
  <!-- ... more ticks -->
</g>
```

### Solution: Target the Tick Elements

You need to select the tick elements after the axis is created and add event handlers:

```typescript
// First create the y-axis as usual
const yAxisGroup = svg.append("g").call(yAxis);

// Then add click handlers to the tick elements
yAxisGroup
  .selectAll(".tick")
  .on("click", (event, tickData) => {
    // tickData is the tick value (string representation of row index)
    const rowIndex = parseInt(tickData as string);
    const binRow = bins2D[rowIndex];
    
    console.log(`Clicked y-axis row ${rowIndex}`, binRow);
    
    // You can dispatch an action to the parent DCGView component
    // (assuming you pass a callback through the model)
    if (model.onYAxisClick) {
      model.onYAxisClick(rowIndex, binRow);
    }
  })
  .style("cursor", "pointer"); // Visual feedback
```

### Complete Implementation Example

Here's how you'd modify the heatmap view function:

```typescript
export type Model = {
  style: "heatmap";
  data: Point[];
  xLabel: string;
  xUnit?: UnitType;
  yLabel: string;
  yUnit?: UnitType;
  myData?: { x: number; y: number };
  onYAxisClick?: (rowIndex: number, binData: Bin2D[]) => void; // NEW
};

export function view({
  model,
  svg,
}: {
  model: Model;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
}) {
  // ... existing code for bins2D, scales, rectangles ...

  // Create axes
  const xAxisGroup = svg.append("g").call(xAxis);
  const yAxisGroup = svg.append("g").call(yAxis);

  // Add click handlers to y-axis ticks
  yAxisGroup
    .selectAll(".tick")
    .on("click", function(event, tickData) {
      const rowIndex = parseInt(tickData as string);
      const binRow = bins2D[rowIndex];
      
      // Visual feedback - highlight clicked tick
      yAxisGroup.selectAll(".tick").style("font-weight", "normal");
      d3.select(this).style("font-weight", "bold");
      
      // Callback to parent component
      if (model.onYAxisClick) {
        model.onYAxisClick(rowIndex, binRow);
      }
    })
    .style("cursor", "pointer")
    .append("title") // Tooltip for accessibility
    .text((d) => `Click to filter by ${model.yLabel}: ${tickFormatBins(parseFloat(d), model.yUnit, yThresholds)}`);

  // ... rest of existing code ...
}
```

## Integration with DCGView

To integrate with DCGView's action system, you'd update your component:

```typescript
// In your DCGView component
class HeatmapView extends DCGView.Class<Props> {
  template() {
    return (
      <div>
        <svg ref={this.svgRef}></svg>
      </div>
    );
  }

  init() {
    this.svgRef = DCGView.jsx.useRef<SVGSVGElement>();
  }

  onMount() {
    const svg = d3.select(this.svgRef.current);
    
    const model: Model = {
      // ... your model data ...
      onYAxisClick: (rowIndex, binData) => {
        // Dispatch action up to parent
        this.props.myDispatch({
          type: 'HEATMAP_Y_AXIS_CLICKED',
          rowIndex,
          binData,
        });
      }
    };

    view({ model, svg });
  }
}
```

## Gotchas and Complexities

### 1. Event Handler Context

```typescript
// BAD - arrow function loses 'this' context
.on("click", (event, data) => {
  d3.select(this).style("color", "red"); // 'this' is not the DOM element!
})

// GOOD - regular function preserves 'this'
.on("click", function(event, data) {
  d3.select(this).style("color", "red"); // 'this' is the clicked DOM element
})
```

### 2. Data Binding

The second parameter in event handlers is the **bound data**, not the DOM element:

```typescript
.on("click", (event, data) => {
  // event = MouseEvent
  // data = whatever was bound to this element during .data() or .datum()
  // this = the DOM element (if using regular function)
})
```

### 3. Preventing Event Bubbling

```typescript
.on("click", (event, data) => {
  event.stopPropagation(); // Prevent event from bubbling up
  // Your click logic here
})
```

### 4. Cleaning Up Event Listeners

D3 automatically removes event listeners when elements are removed from the DOM, but if you're updating the chart, you might want to explicitly remove them:

```typescript
// Remove all click handlers
selection.on("click", null);
```

## Advanced: Multiple Event Types

You can add multiple event handlers to the same selection:

```typescript
yAxisGroup
  .selectAll(".tick")
  .on("click", handleClick)
  .on("mouseover", handleMouseOver)
  .on("mouseout", handleMouseOut)
  .on("contextmenu", handleRightClick); // Right-click
```

## Working with Axis Labels vs. Ticks

If you want to click on the axis labels specifically (not the entire tick area):

```typescript
// Target just the text elements
yAxisGroup
  .selectAll(".tick text")
  .on("click", function(event, tickData) {
    // This targets only the text labels
    const rowIndex = parseInt(tickData as string);
    // ... handle click
  })
  .style("cursor", "pointer");
```

## Real-World Example: Filter by Y-Axis Range

Here's a practical example where clicking a y-axis tick filters the data:

```typescript
onYAxisClick: (rowIndex: number, binData: Bin2D[]) => {
  const yRange = yThresholds[rowIndex];
  const nextYRange = yThresholds[rowIndex + 1];
  
  // Filter original data to this y-range
  const filteredData = model.data.filter(point => 
    point.y >= yRange && point.y < nextYRange
  );
  
  // Dispatch to parent with filtered data
  this.props.myDispatch({
    type: 'FILTER_BY_Y_RANGE', 
    yMin: yRange,
    yMax: nextYRange,
    filteredData
  });
}
```

This creates an interactive heatmap where users can click y-axis labels to filter the underlying dataset.