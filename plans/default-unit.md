# Default Unit Selection in ClimbCapacity

## Overview

This document summarizes how default unit selection works throughout the ClimbCapacity application and the changes made to switch from metric to American units as defaults.

## How Default Units Work

### 1. Measure Specifications (`packages/iso/measures/`)

Each measure specification defines:
- `units: UnitType[]` - Array where **the first unit is the default**
- `initialFilter: InitialFilter` - Default filter values for the measure

**Key Pattern**: The first unit in the `units` array becomes the default unit that components will use.

### 2. Unit Input Controller (`packages/frontend/views/unit-input.tsx`)

The `UnitInputController` constructor:
```typescript
const measureSpec = getSpec(measureId);
const defaultUnit = measureSpec.units[0]; // Always uses first unit
this.state = {
  selectedUnit: defaultUnit, // Sets to first unit regardless of initialValue
  // ...
};
```

**Important**: The controller always defaults to `measureSpec.units[0]`, even when an `initialValue` with a different unit is provided.

### 3. Min-Max Filter Controller (`packages/frontend/views/filters/min-max-filter.tsx`)

Creates unit input controllers and unit toggle controller:
```typescript
const minInputController = new UnitInputController(measureId, dispatch, minValue);
const unitToggleController = new UnitToggleController({
  selectedUnit: minInputController.state.selectedUnit, // Uses the selected unit from input controller
  // ...
});
```

The unit toggle controller gets its initial selected unit from the input controller's selected unit.

## Changes Made to Switch to American Units

### 1. Reordered `units` Arrays

Changed the order in all measure specifications to put American units first:

**Before** (metric first):
```typescript
units: ["kg", "lb"]
units: ["ircra", "vermin", "font"] 
units: ["m", "cm", "inch"]
```

**After** (American first):
```typescript
units: ["lb", "kg"]
units: ["vermin", "ircra", "font"]
units: ["inch", "m", "cm"]
```

### 2. Updated `initialFilter` Values

Changed initial filter values to use American units:

**Before**:
```typescript
initialFilter: {
  type: "minmax",
  minValue: { unit: "kg", value: 35 },
  maxValue: { unit: "kg", value: 100 },
}
```

**After**:
```typescript
initialFilter: {
  type: "minmax", 
  minValue: { unit: "lb", value: 77 },
  maxValue: { unit: "lb", value: 220 },
}
```

### 3. Fixed DCGView `checked` Attribute

Discovered that radio button selection wasn't working because DCGView was setting `checked="true"/"false"` instead of proper HTML boolean attributes.

**Solution**: Added custom attribute handler for `checked`:
- `packages/frontend/dcgview/attr-checked.ts` - Handles boolean attribute correctly
- Registered in `packages/frontend/dcgview/dcg-view.ts`
- Sets `checked=""` when true, removes attribute when false

## Key Learnings

1. **Default unit is always `units[0]`** - The `UnitInputController` ignores the unit of `initialValue` and always defaults to the first unit in the measure spec.

2. **Consistency is crucial** - Both the `units` array order AND the `initialFilter` values need to use the same unit system for proper behavior.

3. **Unit toggle gets its initial state from input controller** - The `UnitToggleController` is initialized with the selected unit from the `UnitInputController`, so they stay in sync.

4. **DCGView boolean attributes need custom handlers** - HTML boolean attributes like `checked` and `disabled` require special handling to work correctly with DCGView's reactive system.

## Files Modified

### Measure Specifications:
- `packages/iso/measures/forcemeter.ts` - Reordered units, updated initialFilter
- `packages/iso/measures/movement.ts` - Reordered units
- `packages/iso/measures/fingers.ts` - Reordered units, updated initialFilter  
- `packages/iso/measures/grades.ts` - Already had American units first
- `packages/iso/measures/power.ts` - Already had American units first
- `packages/iso/measures/index.ts` - Updated armspan initialFilter

### DCGView Framework:
- `packages/frontend/dcgview/attr-checked.ts` - New custom attribute handler
- `packages/frontend/dcgview/dcg-view.ts` - Registered checked attribute handler
- `packages/frontend/views/unit-toggle.tsx` - Fixed label htmlFor attribute

## Next Steps

The foundation is now in place for user-configurable unit preferences. A user setting system could:
1. Allow users to choose between "American" and "Metric" unit preferences
2. Dynamically reorder the `units` arrays based on user preference
3. Update `initialFilter` values to match the user's preferred units
4. Persist these preferences in user settings