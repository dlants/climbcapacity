# D3 SVG Mouse Interaction Approaches

## Overview

This analysis compares different approaches for capturing mouse interactions across an entire D3 SVG canvas, specifically looking at direct SVG event listeners vs. transparent overlay approaches.

## Current Heatmap Implementation

From `packages/frontend/views/plots/heatmap.tsx`:

- SVG structure: `<svg>` contains rectangles for bins, axes, labels
- Current mouse interactions: `.on("mouseover")` and `.on("mouseout")` on individual rectangles
- Tooltip implementation: Uses `d3.select("body").append("div")` for tooltip positioning
- Mouse coordinates: Uses `event.pageX` and `event.pageY` for tooltip positioning
- Event bubbling: Uses `.on("mouseout")` to hide tooltips when leaving rectangles

## Approach 1: Direct SVG Event Listeners

### Implementation

```javascript
svg.on("mousemove", function (event) {
  const [x, y] = d3.pointer(event, this);
  // Handle mouse position within SVG coordinate space
});

svg.on("click", function (event) {
  const [x, y] = d3.pointer(event, this);
  // Handle clicks on entire SVG
});
```

### Pros

- **Simpler setup**: No additional DOM elements needed
- **Direct coordinate access**: `d3.pointer(event, this)` gives SVG-relative coordinates automatically
- **Standard D3 pattern**: Common approach in D3 documentation and examples
- **Event bubbling works naturally**: Child elements can still receive their own events
- **Performance**: No extra DOM layers

### Cons

- **Event interference**: Child elements (rectangles, axes) may consume events and prevent bubbling
- **Limited control**: Cannot easily distinguish between background vs foreground clicks
- **Coordinate complications**: Need to handle coordinate transforms if SVG has nested groups

### Event Bubbling Considerations

- <cite index="5-13,5-14">Mouse events naturally bubble up from child elements to parent SVG, but `d3.event.stopPropagation()` can prevent this</cite>
- <cite index="19-16">In SVG, "whatever is in front" captures the events first, similar to HTML elements</cite>
- Child rectangles in heatmap would capture mouse events first, then bubble to SVG

## Approach 2: Transparent Overlay

### Implementation

```javascript
svg
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", WIDTH)
  .attr("height", HEIGHT)
  .style("fill", "transparent")
  .style("pointer-events", "all")
  .on("mousemove", handler)
  .on("click", handler);
```

### Pros

- **Full control**: Captures all mouse events across entire SVG area
- **Clear separation**: Background interactions separate from foreground element interactions
- **Coordinate consistency**: Always provides consistent coordinate space
- **Event layering**: Can control exactly which events go to overlay vs child elements
- **Common pattern**: <cite index="19-37,19-38">Used in D3 community for capturing background interactions</cite>

### Cons

- **Extra DOM element**: Adds another rectangle to the SVG
- **Event blocking**: May interfere with child element interactions unless carefully managed
- **Z-order dependency**: Must be positioned correctly in DOM to not block other interactions
- **Pointer-events management**: <cite index="17-9,17-12">Requires `pointer-events: all` to work with transparent elements</cite>

### Pointer-Events Property

- <cite index="19-24">CSS `pointer-events` property allows passing events "through" elements in front to elements behind</cite>
- <cite index="14-13">Works in modern browsers but had IE9 compatibility issues historically</cite>
- <cite index="17-19,17-20">Elements with `fill="none"` don't receive mouse events by default; need explicit fill or `pointer-events: all`</cite>

## Approach 3: Hybrid - Window-Level Events

### Implementation

```javascript
d3.select(window).on("mousemove", function (event) {
  // Check if mouse is over SVG using elementFromPoint
  const element = document.elementFromPoint(event.clientX, event.clientY);
  if (svg.node().contains(element)) {
    const [x, y] = d3.pointer(event, svg.node());
    // Handle mouse within SVG
  }
});
```

### Use Case

- <cite index="7-1,7-2">Useful for drag operations that may extend outside the SVG boundaries</cite>
- <cite index="7-5,7-6">Allows interactions to continue working even when mouse leaves the chart area</cite>

## Coordinate Calculation Differences

### Direct SVG Events

- <cite index="8-8">Use `d3.pointer(event, target)` for local coordinate transformation</cite>
- <cite index="8-10,8-11">Automatically handles SVG coordinate transformations and HTML element positioning</cite>
- Returns coordinates relative to the SVG element

### Transparent Overlay

- Same coordinate calculation as direct SVG events
- Overlay rectangle provides consistent coordinate space
- No additional transformation needed

### Page-Level Events

- <cite index="10-4,10-6">Use `event.pageX` and `event.pageY` for absolute page positioning (replaces `d3.event` in modern D3)</cite>
- <cite index="26-5,26-6">`event.clientX/clientY` gives viewport-relative position (no scrolling), `event.pageX/pageY` includes scrolling offset</cite>
- Need manual transformation to SVG coordinate space
- Useful for tooltip positioning relative to browser window

## Recommendations for Heatmap Implementation

### Project Context

- **D3 Version**: 7.9.0 (modern version, use `d3.pointer()`)
- **Current Implementation**: Rectangle-level mouseover/mouseout events for tooltips
- **SVG Structure**: 600x400px SVG with margins, contains rectangles, axes, labels

### Best Approach: Direct SVG Events

For the heatmap use case, **direct SVG event listeners** are recommended:

1. **Simplicity**: No additional DOM elements needed
2. **Compatibility**: Works well with existing rectangle mouseover events
3. **Performance**: Minimal overhead
4. **Modern D3**: Uses current `d3.pointer()` API

### Implementation Strategy

```javascript
// Add to heatmap view function after creating SVG elements
svg.on("mousemove", function (event) {
  const [x, y] = d3.pointer(event, this);

  // Convert pixel coordinates to bin indices
  const binCol = Math.floor((x - MARGIN.left) / x.bandwidth());
  const binRow = Math.floor((y - MARGIN.top) / y.bandwidth());

  // Handle mouse tracking across entire canvas
  if (
    binCol >= 0 &&
    binCol < bins2D[0].length &&
    binRow >= 0 &&
    binRow < bins2D.length
  ) {
    // Mouse is over a valid bin area
  } else {
    // Mouse is over axis/margin area
  }
});

svg.on("click", function (event) {
  const [x, y] = d3.pointer(event, this);
  // Handle clicks on background areas (axes, margins, empty spaces)
});
```

### Event Coordination

- **Keep existing**: Rectangle `mouseover`/`mouseout` for detailed bin tooltips
- **Add SVG-level**: `mousemove` for cursor tracking across entire canvas
- **Add SVG-level**: `click` for background interactions (axes, margins)
- **Event management**: <cite index="5-13">Use `event.stopPropagation()` on rectangle events if SVG handler conflicts occur</cite>
- **Performance**: SVG-level handlers complement rather than replace existing rectangle handlers

### Why Not Transparent Overlay

While the overlay approach works, it adds complexity without significant benefits for this use case:

- Heatmap doesn't need complex event layering
- Existing rectangle interactions work fine with event bubbling
- Direct SVG events provide cleaner, more maintainable code

## Key Technical Notes

### D3 Coordinate Helpers

#### Modern D3 (v6+): d3.pointer()

- <cite index="21-1,21-6,21-8">`d3.pointer(event)` replaces `d3.mouse()` in D3 version 6+, where event is the first argument to the mouse callback</cite>
- <cite index="22-5,22-6">`d3.pointer(event, target)` returns coordinates relative to specified target, supports MouseEvent, PointerEvent, Touch, or custom events</cite>
- <cite index="22-8,22-9">Automatically handles SVG coordinate transformations using inverse screen coordinate matrix, and HTML element positioning relative to bounding client rectangle</cite>
- <cite index="25-23,25-27">Requires DOM element as target, not D3 selection - use `element.node()` or pass `this` within event handler</cite>

#### Legacy D3 (v5 and earlier): d3.mouse()

- <cite index="24-14,24-15,24-16,24-17">`d3.mouse(this)` takes DOM element parameter (not D3 selection), returns `[x, y]` array of coordinates</cite>
- <cite index="25-7,25-8,25-9">Returns coordinates relative to specified container (HTML or SVG element like svg:g or svg:svg)</cite>

#### Usage Examples

```javascript
// Modern D3 v6+ approach
svg.on("mousemove", function (event) {
  const [x, y] = d3.pointer(event, this);
  // Handle coordinates relative to SVG
});

// Legacy D3 v5 approach
svg.on("mousemove", function () {
  const [x, y] = d3.mouse(this);
  // Handle coordinates relative to SVG
});
```

### Event Types

- <cite index="8-2,8-5">`mousemove`, `click`, `mouseover`, `mouseout` all supported, can use namespaced events like `click.foo`</cite>
- <cite index="8-6,8-7">Event handlers receive `(event, datum)` parameters with `this` as DOM element</cite>

### Browser Compatibility

- Modern D3 approaches work in all current browsers
- <cite index="19-24">CSS `pointer-events` has broad modern browser support</cite>
- No special handling needed for current browser targets

