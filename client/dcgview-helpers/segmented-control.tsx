import './segmented-control.scss';

import * as DCGView from 'dcgview';
import * as Keys from 'lib/keys';
import {
  type TouchtrackingDevice,
  type TouchtrackingEvent
} from 'lib/touchtracking';

import {
  type FocusHelperOptions,
  manageFocusHelper
} from '../main/manage-focus-helper';
import { Tooltip, type TooltipGravity } from '../shared-components/tooltip';

const { For, If, IfElse } = DCGView.Components;

export type SegmentedControlOption = {
  key: string; //just used for rending the <For>. Possible there's a simplification we could do
  label?: () => string;
  icon?: () => string;
  template?: () => JSX.Element;
  tooltip?: () => string;
  tooltipGravity?: () => TooltipGravity;
  ariaLabel?: () => string; //defaults to label if ariaLabel isn't present
  selected: () => boolean;
  class?: () => string;
  onSelect: (device: TouchtrackingDevice | undefined) => void;
  disabled?: () => boolean;
  focusHelperOptions?: FocusHelperOptions; //this should be a constant that doesn't change
};

type SegmentedControlTheme =
  | 'default'
  | 'mini'
  | 'full-width-mini'
  | 'vertical';

type Props = {
  staticConfig: () => SegmentedControlOption[]; //named to make it clear that these are cached and won't change
  ariaGroupLabel: () => string; //localized string
  disabled?: () => boolean;
  theme?: () => SegmentedControlTheme;
  numRows?: () => number;
  minButtonWidth?: () => number;
  //this controls two things with accessibility:
  //  * the roles on the container
  //  * if multi select, we won't select the option as you arrow through it
  treatAsMultiSelect?: () => boolean;

  //TODO: someday remove this and always focus on tap
  focusOnTap?: () => boolean;
};

export class SegmentedControl extends DCGView.View<Props> {
  private config: SegmentedControlOption[];
  //store views so that we can access them to manually focus
  private btnViews: { [key: string]: HTMLElement } = {};

  init() {
    this.config = this.props.staticConfig();
  }

  template() {
    return (
      <div
        class={() => ({
          'dcg-segmented-control-container': true,
          'dcg-theme-mini': this.getTheme() === 'mini',
          'dcg-theme-full-width-mini': this.getTheme() === 'full-width-mini',
          'dcg-theme-default': this.getTheme() === 'default',
          'dcg-theme-vertical': this.getTheme() === 'vertical'
        })}
        role={() =>
          this.props.treatAsMultiSelect?.() ? 'listbox' : 'radiogroup'
        }
        aria-multiselectable={() =>
          this.props.treatAsMultiSelect?.() ? true : undefined
        }
        onKeyDown={this.bindFn(this.handleRadioKeydown)}
        aria-label={this.props.ariaGroupLabel}
      >
        <For each={() => this.config} key={(option) => option.key}>
          {(getOption) => {
            const option = getOption();
            return (
              <div
                class={() => ({
                  'dcg-segmented-control-btn': true,
                  'dcg-selected': option.selected(),
                  'dcg-disabled': this.isDisabled() || option.disabled?.(),
                  [option.class ? option.class() : '']: !!option.class
                })}
                role={() =>
                  this.props.treatAsMultiSelect?.() ? 'option' : 'radio'
                }
                tabIndex={() => this.getTabIndexForOption(option)}
                aria-label={() => this.getAriaLabel(option)}
                style={() => ({
                  'min-width': this.props.minButtonWidth
                    ? this.props.minButtonWidth() + 'px'
                    : undefined
                })}
                aria-checked={() =>
                  !this.props.treatAsMultiSelect?.()
                    ? option.selected()
                    : undefined
                }
                aria-selected={() =>
                  this.props.treatAsMultiSelect?.()
                    ? option.selected()
                    : undefined
                }
                onTap={(evt: TouchtrackingEvent) => {
                  if (this.isDisabled() || option.disabled?.()) return;
                  option.onSelect(evt.device);
                  if (this.props.focusOnTap?.())
                    this.btnViews[option.key]?.focus();
                }}
                didMount={(el: HTMLElement) => (this.btnViews[option.key] = el)}
                manageFocus={() => {
                  if (option.focusHelperOptions)
                    return manageFocusHelper(option.focusHelperOptions);
                  return undefined;
                }}
              >
                <Tooltip
                  tooltip={() => option.tooltip?.() || ''}
                  gravity={() => option.tooltipGravity?.() || 's'}
                  disabled={() => !(option.tooltip && option.tooltip())}
                >
                  {IfElse(() => !!option.template, {
                    false: () => (
                      <div class="dcg-segmented-control-interior">
                        {() => (option.label ? option.label() : '')}
                        <If predicate={() => !!option.icon}>
                          {() => (
                            <i
                              class={() => (option.icon ? option.icon() : '')}
                            />
                          )}
                        </If>
                      </div>
                    ),
                    true: option.template!
                  })}
                </Tooltip>
              </div>
            );
          }}
        </For>
      </div>
    );
  }

  private getAriaLabel(option: SegmentedControlOption) {
    if (option.ariaLabel) return option.ariaLabel();
    if (option.label) return option.label();
    if (option.tooltip) return option.tooltip();
    return '';
  }

  private isDisabled() {
    return !!this.props.disabled?.();
  }

  private getTheme(): SegmentedControlTheme {
    if (!this.props.theme) return 'default';
    return this.props.theme();
  }

  private handleRadioKeydown(evt: KeyboardEvent) {
    const key = Keys.lookup(evt);
    if (
      key !== 'Up' &&
      key !== 'Down' &&
      key !== 'Left' &&
      key !== 'Right' &&
      key !== 'Home' &&
      key !== 'End'
    )
      return;
    if (evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;

    evt.preventDefault();
    evt.stopPropagation();

    const currentIdx = this.config.findIndex(
      (o) => this.btnViews[o.key] === document.activeElement
    );
    const totalOptions = this.config.length;
    let newIdx = currentIdx;

    if (key === 'Home') newIdx = 0;
    if (key === 'End') newIdx = this.config.length - 1;
    if (key === 'Left') newIdx = (currentIdx - 1 + totalOptions) % totalOptions;
    if (key === 'Right') newIdx = (currentIdx + 1) % totalOptions;
    const numRows = this.props.numRows ? this.props.numRows() : 1;
    const columns = Math.ceil(totalOptions / numRows);
    const upDownStep = numRows === 1 ? 1 : columns;
    // when there is a single row, up/down moves left/right, otherwise up/down moves between rows in the selected column
    if (key === 'Up')
      newIdx = (currentIdx - upDownStep + totalOptions) % totalOptions;
    if (key === 'Down') newIdx = (currentIdx + upDownStep) % totalOptions;

    const newItem = this.config[newIdx];
    if (!newItem) return;

    this.btnViews[newItem.key]?.focus();
    if (this.props.treatAsMultiSelect?.()) return;
    newItem.onSelect('keyboard');
  }

  private getTabIndexForOption(option: SegmentedControlOption) {
    if (this.isDisabled()) return -1;
    const isFirst = option.key === this.config[0].key;
    const selectedFilter = this.config.find((o) => o.selected());

    return option.key === selectedFilter?.key || (isFirst && !selectedFilter)
      ? 0
      : -1;
  }
}
