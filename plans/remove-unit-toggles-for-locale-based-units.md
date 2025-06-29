# Remove Unit Toggles for Locale-Based Units Implementation Plan

## Context

The goal is to remove individual unit toggles throughout the ClimbCapacity application and replace them with automatic unit selection based on locale preferences. This will simplify the user experience while maintaining the same functionality through the existing locale system.

### Current State Analysis

**Existing Components Using Unit Toggles:**

- `UnitToggleController` and `UnitToggleView` are used in 7+ locations
- Major usage areas: edit-measure, filters (min-max, toggle), reportcard, plot-list, unit-input
- Each component currently maintains its own unit selection state

**Existing Locale Infrastructure:**

- `Locale` type with US, UK, Europe, Australia options
- `LocaleSelectorController` and `LocaleSelectorView` for locale selection
- `getPreferredUnitForMeasure(measureId, locale)` function exists but underutilized
- `detectBrowserLocale()` function for initial locale detection
- Locale preferences already defined for weight, bouldering, sport, and distance categories

**Key Files and Entities:**

- `packages/iso/locale.ts`: Locale definitions and unit preferences
- `packages/iso/measures/index.ts`: `getPreferredUnitForMeasure` function
- `packages/iso/units.ts`: Unit conversion and utility functions
- `packages/frontend/views/unit-toggle.tsx`: Current unit toggle implementation
- `packages/frontend/views/locale-selector.tsx`: Locale selection component
- `packages/frontend/main.tsx`: Main app with locale state management
- `packages/frontend/views/unit-input.tsx`: Unit input component (uses UnitToggleController)
- `packages/frontend/views/snapshot/edit-measure.tsx`: Measure editing (uses UnitToggleController)
- `packages/frontend/views/reportcard/main.tsx`: Report card with output measure toggles
- `packages/frontend/views/reportcard/plot-list.tsx`: Plot list with unit toggles for each measure
- `packages/frontend/views/filters/*.tsx`: Filter components with unit toggles

## Implementation

### Phase 1: Swap locale to getter

- [x] instead of a static locale that's part of context, locale should be a getter. We should create it in main.tsx, and pull it off of the locale selector state.
- [x] propagate this change throughout the codebase by observing type errors and fixing them one at a time
- [x] in the end we should only have `locale: () => Locale` in context, never `locale: Locale`

**Completed Changes:**

- Updated `MainAppController` to remove static `locale` from state and added `get locale(): () => Locale` getter method that returns the current locale from `localeSelectorController.state.selectedLocale`
- Updated page constructors to pass `this.locale` (getter) instead of `this.state.locale` (static value)
- Updated all context interfaces to expect `locale: () => Locale` instead of `locale: Locale`:
  - `ReportCardController.context`
  - `ExploreController.context`
  - `ReportCardMainController.context`
  - `EditQueryController.context`
  - `PlotListController.context`
- Updated all locale usage within controllers to call `this.context.locale()` when getting the locale value, but pass `this.context.locale` (the getter function) when constructing child controllers
- Enhanced locale change handling in `MainAppController` to detect locale changes from `LocaleSelectorController`
- All TypeScript compilation passes without errors

**Key Learning:**

- When passing locale context between controllers, pass the getter function (`this.context.locale`) to maintain reactivity
- When using the locale value within a controller, call the getter (`this.context.locale()`) to get the current value
- DCGView's reactive system will automatically handle re-renders when the locale getter returns different values

### Phase 2: Update Core Unit Input Component

- [x] Modify `packages/frontend/views/unit-input.tsx` to remove UnitToggleController dependency
  - [x] Remove `UnitToggleController` from `UnitInputController` constructor
  - [x] Convert myDispatch into a context: {myDispatch} and add `locale` parameter to the context parameter in the `UnitInputController` constructor
  - [x] Replace unit selection logic with locale-based unit resolution
  - [x] Update `Msg` type to remove unit toggle messages
  - [x] Update `Model` type to use computed preferred unit instead of selected unit
  - [x] Iterate until no compilation/type errors
- [x] Update `UnitInputView` to remove unit toggle UI
  - [x] Remove `UnitToggleView` rendering
  - [x] Iterate until no compilation/type errors
- [x] Iterate until unit tests pass

### Phase 3: Update Edit Measure Components

- [x] Modify `packages/frontend/views/snapshot/edit-measure.tsx`
  - [x] Remove `UnitToggleController` imports and usage
  - [x] Update `EditMeasureController` constructor to wrap `myDispatch` in a `this.context` member, and add locale parameter to context
  - [x] Remove unit toggle state management and message handling
  - [x] Update both main and training measure controllers to use locale-based units
  - [x] Remove unit toggle from `Model` type
  - [x] Update `Msg` type to remove unit toggle messages
  - [x] Remove references to `unitToggleController` in `canSubmit` method
- [x] Update `EditMeasureView` and `EditMeasureItemView`
  - [x] Remove `UnitToggleView` rendering and related conditional logic
  - [x] Remove `unitToggleController` props from view components
- [x] Update parent components to pass locale context
  - [x] Modify `packages/frontend/views/snapshot/edit-measure-class.tsx`
    - [x] Add locale parameter to constructor context
    - [x] Update EditMeasureController instantiations to pass locale context
  - [x] Modify `packages/frontend/views/snapshot/edit-measure-or-class.tsx`
    - [x] Add locale parameter to constructor context
    - [x] Pass locale context down to child controllers
- [x] Iterate until no compilation/type errors
- [x] Iterate until tests pass

### Phase 4: Update Filter Components

- [x] Modify `packages/frontend/views/filters/min-max-filter.tsx`
  - [x] Remove `UnitToggleController` from `MinMaxFilterController`
  - [x] wrap myDispatch in a context and add locale parameter to the context in the constructor
  - [x] Update unit selection to use locale-based preferences
  - [x] Remove unit toggle messages from `Msg` type
  - [x] Update `getUnit()` method to return locale-preferred unit
  - [x] Iterate until no compilation/type errors
- [x] Update `MinMaxFilterView`
  - [x] Remove `UnitToggleView` rendering and conditional logic
  - [x] Iterate until no compilation/type errors
- [x] Modify `packages/frontend/views/filters/toggle-filter.tsx`
  - [x] Remove `UnitToggleController` from `ToggleFilterController`
  - [x] wrap myDispatch in context and locale parameter
  - [x] Update `getUnit()` method and remove unit toggle messages
  - [x] Iterate until no compilation/type errors
- [x] Update `ToggleFilterView`
  - [x] Remove `UnitToggleView` rendering
  - [x] Iterate until no compilation/type errors
- [x] Iterate until tests pass

### Phase 5: Update Report Card Components

- [x] Modify `packages/frontend/views/reportcard/plot-list.tsx`
  - [x] Remove `UnitToggle` import and `UnitToggleController` from `PlotModel`
  - [x] Update `PlotListController` constructor to use locale for unit selection
  - [x] Remove unit toggle state management and message handling
  - [x] Update plot rendering to use locale-based units
  - [x] Remove `TOGGLE_MSG` from `Msg` type and related handling
  - [x] Iterate until no compilation/type errors
- [x] Update `PlotListView`
  - [x] Remove `UnitToggleView` rendering from `renderPlotWithControls`
  - [x] Iterate until no compilation/type errors
- [x] Modify `packages/frontend/views/reportcard/main.tsx`
  - [x] Remove `UnitToggleController` from output measure selection
  - [x] Update `ReportCardMainController` to use locale-based unit selection for output measures
  - [x] Remove unit toggle message handling
  - [x] Update output measure unit selection logic
  - [x] Iterate until no compilation/type errors
- [x] Update `ReportCardMainView`
  - [x] Remove `UnitToggleView` from output measure container
  - [x] Iterate until no compilation/type errors
- [x] Write tests for updated report card functionality
  - [x] Test plot generation with locale-based units
  - [x] Test output measure selection follows locale preferences
  - [x] Iterate until tests pass

### Phase 6: Update Page-Level Components

- [x] Modify `packages/frontend/pages/report-card.tsx`
  - [x] Ensure locale is properly passed down to report card components
  - [x] Verify no direct unit toggle usage remains
  - [x] Iterate until no compilation/type errors
- [x] Update any other page components that use unit toggles
  - [x] Check snapshot, explore, and custom-query pages
  - [x] Update them to pass locale context properly
  - [x] Iterate until no compilation/type errors
