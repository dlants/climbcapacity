# Locale-Based Unit Preferences Implementation Plan

## Context

The goal is to implement user-configurable unit preferences with locale-based defaults in ClimbCapacity. This will allow users to select their preferred units based on major climbing communities (US/America, UK, Europe, Australia) and have that choice persist for logged-in users.

### Current State

- App currently defaults to American units (lb, vermin, inch) based on recent changes
- Unit selection works via the first unit in each measure's `units` array being the default
- Components like `UnitInputController` and `UnitToggleController` use the first unit from measure specs
- Session-based authentication with MongoDB storage for user data
- DCGView framework with controller/view separation

### Key Files and Components

- `packages/iso/units.ts`: Core unit definitions and conversion logic
- `packages/iso/measures/index.ts`: Measure specifications with unit arrays
- `packages/frontend/views/unit-input.tsx`: Core unit input component that defaults to `measureSpec.units[0]`
- `packages/frontend/views/unit-toggle.tsx`: Unit toggle/radio button component
- `packages/frontend/views/filters/min-max-filter.tsx`: Min-max filters that use unit toggles
- `packages/frontend/views/navigation.tsx`: Header navigation component
- `packages/frontend/main.tsx`: Main app controller and routing
- `packages/backend/auth/lucia.ts`: User authentication and session management
- `packages/iso/protocol.ts`: API request/response types

### Locale Definitions

We'll support these major climbing locales:

- **US (American)**: lb, vermin, inch, YDS (sport)
- **UK (British)**: lb, font, inch, British (sport)
- **Europe (European)**: kg, font, cm, French (sport)
- **Australia (Australian)**: kg, vermin, cm, Australian (sport)

# Implementation

## Phase 1: Core Locale Infrastructure

### [ ] Create locale definitions and unit mapping system

- [ ] Create `packages/iso/locale.ts` with locale definitions
  - [ ] Define `Locale` type: `"US" | "UK" | "Europe" | "Australia"`
  - [ ] Define `LocaleInfo` interface with display names and unit preferences
  - [ ] Create `LOCALE_CONFIGS` mapping with unit preferences for each locale:
    - [ ] US: `{ weight: "lb", bouldering: "vermin", sport: "yds", distance: "inch" }`
    - [ ] UK: `{ weight: "lb", bouldering: "font", sport: "british", distance: "inch" }`
    - [ ] Europe: `{ weight: "kg", bouldering: "font", sport: "french", distance: "cm" }`
    - [ ] Australia: `{ weight: "kg", bouldering: "vermin", sport: "australian", distance: "cm" }`
  - [ ] Add `getDefaultUnitsForLocale(locale: Locale): UnitPreferences` function
  - [ ] Add `detectBrowserLocale(): Locale` function using `navigator.language`
- [ ] Check for type errors and iterate until they pass

### [ ] Create unit preferences system

- [ ] Define `UnitPreferences` interface in `packages/iso/locale.ts`
  - [ ] Import `UnitCategory` type from `packages/iso/units.ts`
  - [ ] Map unit categories to preferred units: `Record<UnitCategory, UnitType>` which expands to `{ weight: "lb" | "kg", bouldering: "vermin" | "font", sport: "yds" | "british" | "french" | "australian", distance: "inch" | "cm" }`
  - [ ] Export `UnitPreferences` for direct map lookups (no helper function needed)
- [ ] Add unit categorization to `packages/iso/units.ts`
  - [ ] Define `UnitCategory` type as literal union: `"weight" | "bouldering" | "sport" | "distance"`
  - [ ] Add `UNIT_CATEGORIES` mapping from `UnitType` to `UnitCategory`
  - [ ] Add `getUnitCategory(unit: UnitType): UnitCategory` function
  - [ ] Ensure all grade units are properly categorized (vermin/font as bouldering, yds/british/french/australian as sport)
- [ ] Check for type errors and iterate until they pass

## Phase 2: Locale-Aware Controller Initialization

### [ ] Update measure specs to support locale-specific initial filters

- [ ] Modify `initialFilter` in measure specs from single min/max to locale-based map
  - [ ] Change structure from `{ type: "minmax", minValue: {...}, maxValue: {...} }` to `{ type: "minmax", localeRanges: { [locale]: { minValue: {...}, maxValue: {...} } } }`
  - [ ] Update all measure specs with appropriate ranges for each locale (e.g., weight ranges in lb for US/UK, kg for Europe/Australia)
  - [ ] Keep `units` arrays in measure specs unchanged as constants
- [ ] Check for type errors and iterate until they pass

### [ ] Create locale-aware utility functions

- [ ] Add helper functions to `packages/iso/measures/index.ts`
  - [ ] `getInitialFilterForLocale(measureSpec: MeasureSpec, locale: Locale): InitialFilter` - extracts appropriate initial filter from `localeRanges`
  - [ ] `getPreferredUnitForMeasure(measureId: MeasureId, locale: Locale): UnitType` - determines preferred unit for a measure based on its category and locale (looks up unit preferences from constant map)
- [ ] Check for type errors and iterate until they pass

### [ ] Update core components to use locale preferences

- [ ] Modify `UnitInputController` constructor in `packages/frontend/views/unit-input.tsx`
  - [ ] Access locale from `this.context.locale`
  - [ ] Use `getPreferredUnitForMeasure(measureId, this.context.locale)` to determine preferred unit and set as `selectedUnit`
  - [ ] Always start with preferred unit instead of `measureSpec.units[0]`
- [ ] Modify `UnitToggleController` in unit toggle components
  - [ ] Access locale from `this.context.locale`
  - [ ] Use locale to determine preferred unit and reorder units array to show preferred unit first
  - [ ] Initialize with preferred unit selected
- [ ] Modify `MinMaxFilterController` constructor in `packages/frontend/views/filters/min-max-filter.tsx`
  - [ ] Access locale from `this.context.locale`
  - [ ] Use `getInitialFilterForLocale()` to get locale-appropriate min/max values
  - [ ] Controllers will automatically get locale from context
- [ ] Check for type errors and iterate until they pass

## Phase 3: UI Components

### [ ] Create locale selector dropdown component

- [ ] Create `packages/frontend/views/locale-selector.tsx`
  - [ ] Define `LocaleSelectorController` class
    - [ ] State: Disjoint union representing dropdown state machine:
      - [ ] `{ type: "closed", selectedLocale: Locale }` - dropdown closed with current selection
      - [ ] `{ type: "open", selectedLocale: Locale }` - dropdown open showing options with last selected item
    - [ ] Constructor accesses initial locale from `this.context.locale`
    - [ ] `handleDispatch()` with single switch statement handling all actions:
      - [ ] `LOCALE_CHANGED` - updates selectedLocale in both closed/open states
      - [ ] `OPEN_DROPDOWN` - transitions from closed to open state
      - [ ] `CLOSE_DROPDOWN` - transitions from open to closed state
      - [ ] `SELECT_LOCALE` - transitions to closed state and returns locale change info to parent controller
    - [ ] Get available locales from `Object.keys(LOCALE_CONFIGS)`
  - [ ] Define `LocaleSelectorView` class
    - [ ] Render dropdown with locale display names using `SwitchUnion` for state-based rendering:
      - [ ] `closed` state: Show selected locale as button/trigger
      - [ ] `open` state: Show dropdown menu with all locale options
    - [ ] Handle interaction events by dispatching to controller:
      - [ ] Click on trigger dispatches `OPEN_DROPDOWN`
      - [ ] Click on option dispatches `SELECT_LOCALE` with chosen locale
      - [ ] Escape key dispatches `CLOSE_DROPDOWN`
      - [ ] Keyboard navigation (Arrow keys, Enter, Escape) dispatches appropriate actions
      - [ ] Document click listener: Add event listener to document when dropdown opens, remove when closes
        - [ ] Clicks outside dropdown element dispatch `CLOSE_DROPDOWN`
        - [ ] Clicks inside dropdown are ignored (preventDefault/stopPropagation)
    - [ ] Style as compact dropdown suitable for header
- [ ] Iterate until unit tests pass

### [ ] Integrate locale selector into navigation

- [ ] Modify `packages/frontend/views/navigation.tsx`
  - [ ] Add locale selector to navigation bar
  - [ ] Position it appropriately in header layout
  - [ ] Ensure it works for both logged-in and logged-out users
- [ ] Add CSS styling for header integration
  - [ ] Ensure dropdown looks consistent with existing navigation
  - [ ] Make it responsive for mobile layouts
- [ ] Check for visual regressions and iterate until satisfactory

## Phase 4: State Management and Data Flow

### [ ] Add locale state to main app model

- [ ] Modify `Model` type in `packages/frontend/main.tsx`
  - [ ] Add `locale: Locale` field
  - [ ] Add `unitPreferences: UnitPreferences` computed field
- [ ] Add locale messages to main app
  - [ ] Add `LOCALE_MSG` wrapper message type that opaquely wraps locale selector messages
  - [ ] Update `Msg` union type to include `LOCALE_MSG`
- [ ] Update `MainAppController` to handle locale changes
  - [ ] Initialize locale from browser detection
  - [ ] Handle `LOCALE_MSG` messages by forwarding to locale selector controller and processing results
  - [ ] Extract actual locale changes from locale selector controller responses
  - [ ] Add locale to `context` (alongside `myDispatch`) for propagation to child controllers
- [ ] Check for type errors and iterate until they pass
