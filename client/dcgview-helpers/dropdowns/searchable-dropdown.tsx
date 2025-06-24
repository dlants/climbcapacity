import './searchable-dropdown.scss';

import { localizableNumericValue } from 'core/lib/localizable-numeric-value';
import * as DCGView from 'dcgview';
import * as Aria from 'lib/aria';
import * as Keys from 'lib/keys';
import { type TouchtrackingEvent } from 'lib/touchtracking';
import { type i18nInterface } from 'shared-components/shared-i18n';

const { If, For, Input } = DCGView.Components;

type Option = { id: string; label: string };

type Props = {
  controller: () => i18nInterface;
  renderWithInput: () => boolean;
  onChange: (option: { value: string; fromKeyboard: boolean }) => void;
  options: () => Option[];
  onCancel: () => void;
  placeholder: () => string;
  popoverOptionsOnFocus?: () => boolean;
  externalControl?: () => {
    getValue: () => string;
    onValueChange: (value: string) => void;
    onClear: () => void;
  };
  id?: () => string;
  required?: () => boolean;
};

// TODO use focus helper instead
type FocusLocation =
  | {
      type: 'filter';
    }
  | {
      type: 'option';
      id: string;
    };

/** Dropdown that allows searching for an option from the list and selecting it */
export class SearchableDropdownView extends DCGView.View<Props> {
  private controller: i18nInterface;
  private filter: string | undefined = undefined;
  private focusLocation: FocusLocation | undefined = undefined;
  private lastResultCount = 0;

  init() {
    this.controller = this.props.controller();
  }

  template() {
    return (
      <div class="dcg-search-container" onKeyDown={this.bindFn(this.onKeydown)}>
        <If predicate={this.props.renderWithInput}>
          {() => (
            <div role="search" class="dcg-searchable-dropdown">
              <Input
                class={() => ({
                  'dcg-results-hidden': !this.showResults()
                })}
                id={() => (this.props.id ? this.props.id() : undefined)}
                didMount={this.bindFn(this.didMountInput)}
                onInput={this.bindFn(this.onInputChange)}
                value={this.bindFn(this.getFilterString)}
                placeholder={() => this.props.placeholder()}
                // @ts-expect-error `autofill` is not a standard attribute.
                autofill={this.const(false)}
                data-1p-ignore={this.const(true)}
                manageFocus={this.const({
                  shouldBeFocused: this.bindFn(this.shouldFilterBeFocused),
                  onFocusedChanged: this.bindFn(this.onFilterFocusChange)
                })}
                required={() => this.props.required?.()}
              />
              <If predicate={() => this.shouldShowDeleteX()}>
                {() => (
                  <i
                    class="dcg-icon-remove dcg-remove-x dcg-do-not-blur"
                    role="button"
                    tabIndex="0"
                    aria-label={() =>
                      this.controller.s('shared-calculator-button-clear')
                    }
                    onTap={this.bindFn(this.onDeleteXTapped)}
                  />
                )}
              </If>
            </div>
          )}
        </If>

        <If
          predicate={() =>
            this.getFilteredOptions().length > 0 && this.showResults()
          }
        >
          {() => (
            <div
              class={() => ({
                'dcg-searchable-dropdown-list-container': true,
                'dcg-render-as-popover': this.props.popoverOptionsOnFocus?.()
              })}
            >
              <div
                class={() => ({
                  'dcg-searchable-dropdown-list': true,
                  'dcg-do-not-blur': true,
                  'dcg-no-input': !this.props.renderWithInput()
                })}
                role="listbox"
                aria-label={() =>
                  this.controller.s('shared-calculator-label-search-results')
                }
              >
                <For
                  each={() => this.getFilteredOptions()}
                  key={(option) => option.id + '-' + option.label}
                >
                  {(getOption) => (
                    <div
                      class="dcg-searchable-dropdown-option"
                      role="option"
                      onTap={(evt: TouchtrackingEvent) =>
                        this.selectOption(
                          getOption(),
                          evt.device === 'keyboard'
                        )
                      }
                      manageFocus={this.const({
                        shouldBeFocused: () =>
                          this.shouldOptionBeFocused(getOption()),
                        onFocusedChanged: (bool: boolean) =>
                          this.onOptionFocusChange(getOption(), bool)
                      })}
                      tabIndex={0}
                    >
                      {() => getOption().label}
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </If>
        <If
          predicate={() =>
            this.getFilteredOptions().length === 0 && this.showResults()
          }
        >
          {() => (
            <div
              class={() => ({
                'dcg-searchable-dropdown-list-container': true,
                'dcg-render-as-popover': this.props.popoverOptionsOnFocus?.()
              })}
            >
              <div
                class={() => ({
                  'dcg-searchable-dropdown-list': true,
                  'dcg-no-search-results': true
                })}
              >
                {() =>
                  this.controller.s('shared-calculator-text-search-results', {
                    count: localizableNumericValue(0)
                  })
                }
              </div>
            </div>
          )}
        </If>
      </div>
    );
  }

  showResults() {
    if (!this.props.popoverOptionsOnFocus?.()) return true;
    return !!this.focusLocation;
  }

  didMountInput() {
    if (this.props.popoverOptionsOnFocus?.()) return;
    this.focusFilter();
  }

  shouldShowDeleteX(): boolean {
    // show if the user has typed anything
    return !!this.getFilterString();
  }

  onDeleteXTapped(evt: TouchtrackingEvent) {
    this.onInputChange('');
    if (this.props.externalControl) {
      this.props.externalControl().onClear();
      if (evt.device === 'keyboard') this.focusFilter();
    } else {
      this.focusFilter();
      this.update();
    }
  }

  shouldFilterBeFocused() {
    return this.focusLocation && this.focusLocation.type === 'filter';
  }

  onFilterFocusChange(isFocused: boolean) {
    if (isFocused) {
      this.focusFilter();
    } else {
      this.focusLocation = undefined;
      this.update();
    }
  }

  shouldOptionBeFocused(option: Option) {
    return (
      this.focusLocation &&
      this.focusLocation.type === 'option' &&
      this.focusLocation.id === option.id
    );
  }

  focusFilter() {
    this.focusLocation = { type: 'filter' };
    this.update();
  }

  focusOption(option: Option) {
    this.focusLocation = {
      type: 'option',
      id: option.id
    };
    this.update();
  }

  getFocusedOptionIndex() {
    if (!this.focusLocation) return -1;
    if (this.focusLocation.type !== 'option') return -1;

    const focusedId = this.focusLocation.id;
    const options = this.getFilteredOptions();

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option.id === focusedId) {
        return i;
      }
    }

    return -1;
  }

  onOptionFocusChange(option: Option, bool: boolean) {
    if (bool) {
      this.focusOption(option);
    } else {
      this.focusLocation = undefined;
      this.update();
    }
  }

  onKeydown(evt: KeyboardEvent) {
    switch (Keys.lookup(evt)) {
      case Keys.ENTER:
        if (this.shouldFilterBeFocused()) {
          const options = this.getFilteredOptions();
          if (options.length === 1) {
            this.selectOption(options[0], true);
          }
        }
        break;

      case Keys.UP:
        if (this.moveFocusInDirection(-1)) {
          // arrowing in the dropdown causes it to scroll. Don't do that
          evt.preventDefault();
        }
        break;

      case Keys.DOWN:
        if (this.moveFocusInDirection(1)) {
          // arrowing in the dropdown causes it to scroll. Don't do that
          evt.preventDefault();
        }
        break;

      case Keys.HOME:
        evt.preventDefault();
        this.focusFirstOption();
        break;

      case Keys.END:
        evt.preventDefault();
        this.focusLastOption();
        break;
      case Keys.ESCAPE:
        this.props.onCancel();
        break;
      case Keys.TAB:
        // we explicitly handle the TAB events if we know what to do with them.
        // this is important because a tab from the filter input to the first
        // option will pass through a phase where nothing is focused. That causes
        // the dropdown to disappear. So focus doesn't end up where it was about
        // to go. Moving the focus from the filter input to the first option
        // through code avoids this issue.
        if (evt.shiftKey) {
          if (this.moveFocusInDirection(-1)) {
            evt.preventDefault();
          }
        } else {
          if (this.moveFocusInDirection(1)) {
            evt.preventDefault();
          }
        }
        break;
    }
  }

  moveFocusInDirection(dir: number): boolean {
    const options = this.getFilteredOptions();
    const focusedIndex = this.getFocusedOptionIndex();
    const nextFocusedIndex = focusedIndex + dir;

    if (nextFocusedIndex == -1 && this.props.renderWithInput()) {
      this.focusFilter();
      return true;
    }

    const nextOption = options[nextFocusedIndex];
    if (nextOption) {
      this.focusOption(nextOption);
      return true;
    }

    return false;
  }

  focusFirstOption() {
    const options = this.getFilteredOptions();
    if (options.length === 0) return;
    this.focusOption(options[0]);
  }

  focusLastOption() {
    const options = this.getFilteredOptions();
    if (options.length === 0) return;
    this.focusOption(options[options.length - 1]);
  }

  onInputChange(filter: string) {
    if (this.props.externalControl) {
      this.props.externalControl().onValueChange(filter);
    } else {
      this.filter = filter;
    }
    this.update();
  }

  getFilterString() {
    if (this.props.externalControl)
      return this.props.externalControl().getValue();
    return this.filter || '';
  }

  selectOption(option: Option, fromKeyboard: boolean) {
    if (this.props.popoverOptionsOnFocus?.()) {
      this.onInputChange(option.label);
    } else {
      this.onInputChange('');
    }
    this.focusLocation = undefined;
    this.update();

    this.props.onChange({
      value: option.id,
      fromKeyboard
    });
  }

  getFilteredOptions() {
    let options = this.props.options();
    const filter = this.getFilterString().toLowerCase().trim();
    if (filter) {
      options = options.filter((option: Option) => {
        return option.label.toLowerCase().indexOf(filter) !== -1;
      });
    }

    return options;
  }

  onUpdate() {
    const resultCount = this.getFilteredOptions().length;
    if (
      this.focusLocation &&
      this.focusLocation.type === 'filter' &&
      resultCount !== this.lastResultCount
    ) {
      Aria.alert(
        this.controller.s('shared-calculator-text-search-results', {
          count: localizableNumericValue(resultCount)
        })
      );
    }
    this.lastResultCount = resultCount;
  }
}
