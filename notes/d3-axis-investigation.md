# D3 Axis Tick Investigation

## Understanding D3 Axis SVG Structure

When D3 creates an axis, it generates a specific SVG structure for each tick. Here's what I discovered about the actual clickable areas and SVG elements.

## Updated Interaction Design

Based on user feedback, we're moving away from precise tick clicking to a more forgiving interaction model:

### New Interaction Flow:

1. **Hover anywhere on heatmap**: Dim all rows except hovered row
2. **First click**: Select that row, hover now previews range selection
3. **Second click**: Transition to histogram of selected range
4. **In histogram**: Hover shows bar details, click anywhere returns to heatmap

### Technical Requirements:

- Mouse coordinate to row mapping (Y position → nearest tick/row)
- Visual state management (hover, first selection, range preview)
- Smooth transitions between heatmap and histogram modes

## 1. Actual SVG Structure D3 Creates

When you call `.selectAll(".tick")` on a D3 axis, you're targeting **group elements (`<g class="tick">`)** that contain:

### Individual Tick Structure:

```html
<g class="tick" opacity="1" transform="translate(222,0)">
  <line stroke="currentColor" y2="6"></line>
  <text fill="currentColor" y="9" dy="0.71em">40</text>
</g>
```

### Complete Axis Structure:

```html
<g
  class="x-axis"
  transform="translate(0,250)"
  fill="none"
  font-size="10"
  font-family="sans-serif"
  text-anchor="middle"
>
  <path class="domain" stroke="currentColor" d="M50,6V0H480V6"></path>
  <g class="tick" opacity="1" transform="translate(50,0)">
    <line stroke="currentColor" y2="6"></line>
    <text fill="currentColor" y="9" dy="0.71em">0</text>
  </g>
  <g class="tick" opacity="1" transform="translate(136,0)">
    <line stroke="currentColor" y2="6"></line>
    <text fill="currentColor" y="9" dy="0.71em">20</text>
  </g>
  <!-- more ticks... -->
</g>
```

## 2. What Users Actually Click On

**The clickable area includes:**

- ✅ **The text label** (e.g., "40", "60", "80")
- ✅ **The tick line** (small line extending from the axis)
- ✅ **Empty space around both elements** (within the group's bounding box)

**The clickable area does NOT include:**

- ❌ Spaces between tick groups
- ❌ The axis domain line (unless specifically targeted)

## 3. Clickable Area Boundaries

The clickable area is defined by the **bounding box of the entire `<g class="tick">` group**, which includes:

- **Width**: Spans from the leftmost to rightmost pixel of either the line or text
- **Height**: Spans from the topmost to bottommost pixel of either the line or text
- **Padding**: Any whitespace within the group's calculated bounds

Based on my testing:

- X-axis ticks: Approximately 15-25px wide × 15-20px tall
- Y-axis ticks: Approximately 20-30px wide × 10-15px tall
- Varies based on font size and text length

## 4. User Experience Considerations

### Intuitive Aspects:

- ✅ Text labels are clearly clickable (users expect this)
- ✅ Small tick lines are clickable (good for precision clicking)
- ✅ Some padding around elements makes targeting easier

### Potentially Confusing Aspects:

- ⚠️ Empty space within tick groups is clickable (might surprise users)
- ⚠️ Gaps between ticks are not clickable (users might expect they are)
- ⚠️ Clickable area boundaries are invisible

## 5. Customization Options

### Targeting Specific Elements:

```javascript
// Target only text labels
axis.selectAll(".tick text").on("click", handler);

// Target only tick lines
axis.selectAll(".tick line").on("click", handler);

// Target entire tick groups (default)
axis.selectAll(".tick").on("click", handler);
```

### Expanding Clickable Area:

```javascript
// Add invisible larger rectangles for easier clicking
axis
  .selectAll(".tick")
  .insert("rect", ":first-child")
  .attr("width", 40) // Larger clickable area
  .attr("height", 30)
  .attr("x", -20) // Center on tick
  .attr("y", -15)
  .attr("fill", "transparent")
  .style("cursor", "pointer");
```

### Visual Feedback:

```css
.tick {
  cursor: pointer;
}
.tick:hover {
  background-color: rgba(255, 255, 0, 0.1);
}
```

## 6. Event Propagation

- Clicking on child elements (line/text) **bubbles up** to the tick group
- Use `event.stopPropagation()` if you want different behavior for text vs. line clicks
- `event.target` will be the specific element clicked (line, text, or group)

## 7. Recommendations for Heatmap Interface

For the heatmap axis interaction:

1. **Use `.selectAll(".tick")` for maximum clickable area**
2. **Add visual hover feedback** to indicate clickability
3. **Consider expanding clickable areas** for mobile/touch interfaces
4. **Test with real users** to ensure the interaction feels natural

## 8. Alternative Approaches

### Overlay Approach:

Create invisible rectangles over the entire axis area and handle clicks programmatically:

```javascript
// Create clickable overlay zones
const tickSpacing = xScale.range()[1] / (xScale.ticks().length - 1);
axis
  .selectAll(".tick-zone")
  .data(xScale.ticks())
  .enter()
  .append("rect")
  .attr("class", "tick-zone")
  .attr("x", (d) => xScale(d) - tickSpacing / 2)
  .attr("width", tickSpacing)
  .attr("height", 40)
  .attr("fill", "transparent")
  .on("click", (event, d) => handleTickClick(d));
```

This gives you complete control over the clickable areas and can provide more consistent user experience.
