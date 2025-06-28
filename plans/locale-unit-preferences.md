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
  - [ ] Add required `locale: Locale` parameter
  - [ ] Use `getPreferredUnitForMeasure(measureId, locale)` to determine preferred unit and set as `selectedUnit`
  - [ ] Always start with preferred unit instead of `measureSpec.units[0]`
- [ ] Modify `UnitToggleController` in unit toggle components
  - [ ] Add required `locale: Locale` parameter
  - [ ] Use locale to determine preferred unit and reorder units array to show preferred unit first
  - [ ] Initialize with preferred unit selected
- [ ] Modify `MinMaxFilterController` constructor in `packages/frontend/views/filters/min-max-filter.tsx`
  - [ ] Add required `locale: Locale` parameter
  - [ ] Use `getInitialFilterForLocale()` to get locale-appropriate min/max values
  - [ ] Pass locale to both `UnitInputController` instances
- [ ] Check for type errors and iterate until they pass

## Phase 3: UI Components

### [ ] Create locale selector dropdown component

- [ ] Create `packages/frontend/views/locale-selector.tsx`
  - [ ] Define `LocaleSelectorController` class
    - [ ] State: `{ selectedLocale: Locale, availableLocales: Locale[] }`
    - [ ] Constructor takes initial locale and dispatch function
    - [ ] `handleDispatch()` for `SELECT_LOCALE` messages
  - [ ] Define `LocaleSelectorView` class
    - [ ] Render dropdown with locale display names
    - [ ] Handle onChange events to dispatch locale changes
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
  - [ ] Add `LOCALE_CHANGED` message type with locale payload
  - [ ] Update `Msg` union type to include locale messages
- [ ] Update `MainAppController` to handle locale changes
  - [ ] Initialize locale from browser detection or user preference
  - [ ] Handle `LOCALE_CHANGED` messages to update state
  - [ ] Recompute unit preferences when locale changes
- [ ] Check for type errors and iterate until they pass

### [ ] Propagate preferences through component hierarchy

- [ ] Update page controllers to accept locale
  - [ ] Modify constructors of `ExploreController`, `ReportCardController`, etc. to accept required `locale: Locale`
  - [ ] Pass locale down to filter and input components
- [ ] Update component instantiation in `MainAppController`
  - [ ] Pass current locale to page controllers
  - [ ] Ensure all filter components receive locale parameter
- [ ] Check for type errors and iterate until they pass

## Phase 5: User Persistence

### [ ] Extend user model for locale preferences

- [ ] Add locale field to user document schema
  - [ ] Modify `UserDoc` interface in `packages/backend/auth/lucia.ts`
  - [ ] Add optional `locale?: Locale` field
  - [ ] Update Lucia database user attributes type
- [ ] Create database migration for existing users
  - [ ] Create `packages/backend/scripts/add-locale-to-users.ts`
  - [ ] Script to add default locale to existing user documents
  - [ ] Set default based on reasonable heuristic (e.g., "US")
- [ ] Iterate until migration runs successfully

### [ ] Add locale preference API endpoints

- [ ] Add locale endpoints to `packages/backend/app.ts`
  - [ ] `GET /api/user/locale` - Get user's preferred locale
  - [ ] `POST /api/user/locale` - Update user's preferred locale
  - [ ] Use `apiRoute` wrapper for proper error handling
  - [ ] Require authentication for these endpoints
- [ ] Add request/response types to `packages/iso/protocol.ts`
  - [ ] `UserLocaleRequest` type for POST body
  - [ ] `UserLocaleResponse` type for GET response
- [ ] Write backend tests for locale endpoints
  - [ ] Create `packages/backend/__tests__/locale-api.test.ts`
  - [ ] Test getting and setting user locale preferences
  - [ ] Test authentication requirements
- [ ] Iterate until backend tests pass

### [ ] Implement frontend locale persistence

- [ ] Add locale API calls to frontend
  - [ ] Create `packages/frontend/util/locale-api.ts`
  - [ ] Functions for getting and setting user locale preferences
  - [ ] Handle loading states and error cases
- [ ] Update `MainAppController` to load user locale on startup
  - [ ] Fetch user locale after authentication resolves
  - [ ] Fall back to browser detection for logged-out users
  - [ ] Save locale changes for logged-in users
- [ ] Add loading states for locale operations
  - [ ] Show loading indicator when changing locale
  - [ ] Handle API errors gracefully
- [ ] Check for type errors and iterate until they pass

## Phase 6: Testing and Integration

### [ ] Write comprehensive unit tests

- [ ] Test locale detection and configuration
  - [ ] Create `packages/iso/__tests__/locale.test.ts`
  - [ ] Test browser locale detection
  - [ ] Test unit preference mapping
- [ ] Test locale-aware utilities and controller initialization
  - [ ] Create `packages/iso/__tests__/locale-utilities.test.ts`
  - [ ] Test `getInitialFilterForLocale()` function
  - [ ] Test `getPreferredUnitForMeasure()` function with different locales
  - [ ] Test `reorderUnitsArray()` utility with different locales and measures
  - [ ] Test that each locale gets appropriate min/max values in their preferred units
- [ ] Test controller initialization with locale
  - [ ] Update existing controller tests to verify locale-aware initialization
  - [ ] Test that controllers start with preferred units for different locales
  - [ ] Test that all controllers work correctly with all supported locales
- [ ] Test component integration
  - [ ] Update existing unit input and filter tests
  - [ ] Test that components respect unit preferences
- [ ] Iterate until all unit tests pass

### [ ] Write end-to-end tests

- [ ] Create `packages/frontend/e2e/locale-preferences.spec.ts`
  - [ ] Test locale selector functionality
  - [ ] Test that unit preferences persist across page navigation
  - [ ] Test logged-in user preference persistence
  - [ ] Test logged-out user browser-based defaults
- [ ] Test measure input and filtering with different locales
  - [ ] Verify unit toggles show preferred units first (including both bouldering and sport grades)
  - [ ] Verify filters use preferred units for initial values
  - [ ] Test unit conversion continues to work correctly for all unit categories
  - [ ] Test that bouldering vs sport grade preferences work independently
- [ ] Iterate until E2E tests pass

## Phase 7: Edge Cases and Polish

### [ ] Handle edge cases and error scenarios

- [ ] Add fallback for unsupported browser locales
  - [ ] Default to "US" for unrecognized locales
  - [ ] Log warnings for unsupported locales
- [ ] Handle API failures gracefully
  - [ ] Fall back to browser detection if user locale API fails
  - [ ] Show user-friendly error messages for locale save failures
- [ ] Handle measure specs without preferred units
  - [ ] Fall back to original unit order when preferred unit not available for a locale
  - [ ] Log warnings for missing unit categories
- [ ] Update all existing controller instantiations to pass locale
  - [ ] Search codebase for all `UnitInputController`, `UnitToggleController`, `MinMaxFilterController` instantiations
  - [ ] Add locale parameter to all instantiations
- [ ] Check for errors and iterate until robust

### [ ] Performance optimizations

- [ ] Add caching for measure spec reordering
  - [ ] Cache reordered specs by locale to avoid recomputation
  - [ ] Invalidate cache when locale changes
- [ ] Optimize locale detection
  - [ ] Cache browser locale detection result
  - [ ] Avoid repeated API calls for user locale
- [ ] Check performance and iterate until satisfactory

### [ ] User experience improvements

- [ ] Add visual feedback for locale changes
  - [ ] Show confirmation when locale is successfully changed
  - [ ] Update page content immediately when locale changes
- [ ] Add keyboard navigation for locale selector
  - [ ] Ensure dropdown is fully accessible
  - [ ] Add proper ARIA labels and keyboard support
- [ ] Add locale indicators where helpful
  - [ ] Show current locale in tooltip or subtle indicator
  - [ ] Consider showing unit symbols in relevant places
- [ ] Check UX and iterate until polished

## Phase 8: Documentation and Deployment

### [ ] Update documentation

- [ ] Update `context.md` with locale system information
  - [ ] Document locale types and configuration
  - [ ] Document unit preference system
  - [ ] Document API endpoints
- [ ] Add migration notes for deployment
  - [ ] Document database migration requirements
  - [ ] Document any breaking changes for existing users
- [ ] Create user-facing documentation
  - [ ] Document how to change locale preferences
  - [ ] Explain what each locale setting does
- [ ] Iterate until documentation is complete

### [ ] Prepare for deployment

- [ ] Add locale system to build process
  - [ ] Ensure all new TypeScript files are included
  - [ ] Verify no missing dependencies
- [ ] Test migration in staging environment
  - [ ] Run user locale migration script
  - [ ] Verify existing users get reasonable defaults
- [ ] Plan gradual rollout strategy
  - [ ] Consider feature flag for locale selector
  - [ ] Plan monitoring for locale-related errors
- [ ] Iterate until deployment-ready

## Potential Challenges and Edge Cases

### Technical Challenges

1. **Controller Initialization Complexity**: Ensuring all controllers that need locale preferences receive them consistently through the component hierarchy.

2. **Initial Filter Conversion**: Converting `initialFilter` values between units while preserving semantic meaning (e.g., maintaining reasonable min/max ranges).

3. **Breaking Changes**: Since locale becomes required, need to update all existing controller instantiations throughout the codebase.

4. **State Synchronization**: Keeping locale state synchronized between local state, API calls, and component props.

5. **Unit Array Reordering**: Efficiently reordering units arrays for display without modifying the original measure spec constants.

### User Experience Challenges

1. **Locale Detection Accuracy**: Browser locale detection may not always match climbing preferences (e.g., an American living in Europe).

2. **Mid-Session Changes**: Handling locale changes gracefully when users have partially filled forms.

3. **Performance**: Ensuring locale changes feel instant without causing UI lag.

### Data Challenges

1. **Migration Safety**: Ensuring existing users get sensible locale defaults without breaking their experience.

2. **API Reliability**: Handling cases where locale preference API calls fail without breaking core functionality.

3. **Unit Availability**: Handling cases where a locale's preferred unit isn't available for a specific measure.

4. **Locale Range Fallbacks**: Handling cases where a measure spec doesn't have `localeRanges` defined for a specific locale, requiring fallback to a default locale's ranges.

5. **Constant Measure Specs**: Ensuring measure specs remain as immutable constants while still providing locale-aware behavior through controller initialization.

### Testing Challenges

1. **Browser Variation**: Testing locale detection across different browsers and regions.

2. **State Management**: Testing complex state synchronization between locale preferences and unit components.

3. **Migration Testing**: Ensuring database migrations work correctly across different user data scenarios.

## Success Criteria

1. **Functional**: Users can select their locale and see appropriate unit defaults
2. **Persistent**: Logged-in users' locale preferences persist across sessions
3. **Performant**: Locale changes feel instant with no noticeable lag
4. **Robust**: System handles edge cases and API failures gracefully
5. **Accessible**: Locale selector is fully keyboard and screen-reader accessible
6. **Tested**: Comprehensive unit and E2E tests ensure reliability
7. **Documented**: Clear documentation for users and developers

