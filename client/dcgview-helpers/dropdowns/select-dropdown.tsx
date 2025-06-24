import * as DCGView from 'dcgview';
import TriggeredEvent = JQuery.TriggeredEvent;
import './select-dropdown.scss';

import $ from 'jquery';
import * as Keys from 'lib/keys';
import { uuid } from 'lib/uuid';

import type { BrailleController } from '../../shared-components/mathquill-braille-wrapper';
import { type i18nInterface } from '../../shared-components/shared-i18n';
import { MixedTextMath } from '../mixed-text-math';
import { FocusTrappingHelper } from './dropdown-focus-helper';
import { type DropdownOption, OptionsDropdownList } from './options-dropdown';

const { If, IfElse } = DCGView.Components;

export type Option = {
  id: string;
  label: string;
  disabled?: boolean;
  class?: string;
};

type Props<TOption extends Option> = {
  controller: () => i18nInterface & BrailleController;
  onChange?: (value: TOption['id']) => void;
  options: () => TOption[];
  externalControl?: () => {
    getValue: () => TOption['id'];
    onValueChange: (value: TOption['id']) => void;
  };
  id: () => string;
  defaultValue?: () => string;
  focusOnMount?: () => boolean;
  manageFocus?: DCGView.HTMLProps<HTMLElement>['manageFocus'];
  buildFooter?: () => DCGView.Child | DCGView.Children;
  onOpenChange?: (isOpen: boolean) => void;
  addBottomPaddingToDropdown?: () => boolean;
  dontFocusAnchorOnSelect?: () => boolean; // we might want to move focus to new ui that shows up when selecting an option
};

/** Dropdown that allows selecting an option from the list */
export class SelectDropdownView<TOption extends Option> extends DCGView.View<
  Props<TOption>
> {
  private i18n: i18nInterface;
  private filter: string | undefined;
  private shouldShowResults: boolean;
  private uuid: string;

  private focusHelper: FocusTrappingHelper;

  init() {
    this.i18n = this.props.controller();
    this.filter = this.props.defaultValue?.();
    this.shouldShowResults = false;
    this.uuid = uuid();

    this.focusHelper = new FocusTrappingHelper({
      anchorSelector: `#dcg-select-dropdown-container-${this.props.id()} .dcg-dropdown-input`,
      focusTrappingBodySelector: `#dcg-select-dropdown-container-${this.props.id()} .dcg-select-dropdown-list`,
      isOpen: () => this.isOpen(),
      closeMenu: () => this.setResultsOpen(false),
      itemNavigationKey: 'arrow'
    });
  }

  private handleKeyDown(evt: KeyboardEvent) {
    switch (Keys.lookup(evt)) {
      case Keys.DOWN:
        if (!this.isOpen()) {
          this.setResultsOpen(true);
          evt.preventDefault();
          return;
        }
        break;
      case Keys.TAB:
        if (this.isOpen()) {
          const focusedElement = this.focusHelper.getFocusedElement();

          if (focusedElement) {
            this.selectOptionById(
              focusedElement.getAttribute('id') ?? undefined
            );
            evt.preventDefault();
          }
          return;
        }
        break;
    }
    this.focusHelper.handleKeydown(evt);
  }

  template() {
    return (
      <div
        class="dcg-select-dropdown-container"
        onKeyDown={this.bindFn(this.handleKeyDown)}
        didMount={this.bindFn(this.attachTapListener)}
        didUnmount={this.bindFn(this.unmountTapListener)}
        id={() => `dcg-select-dropdown-container-${this.props.id()}`}
      >
        <button
          class={() => ({
            'dcg-dropdown-input': true,
            'dcg-results-hidden': !this.isOpen()
          })}
          aria-haspopup={this.const('listbox')}
          aria-expanded={() => this.isOpen()}
          onTap={this.bindFn(this.toggleResultsOpen)}
          didMount={(node: HTMLButtonElement) => {
            if (!!this.props.focusOnMount?.()) {
              node.focus();
            }
          }}
          id={this.props.id}
          manageFocus={() => this.props.manageFocus?.()}
        >
          <MixedTextMath
            content={this.bindFn(this.getFilterString)}
            controller={this.props.controller}
          />
          {IfElse(() => this.isOpen(), {
            true: () => (
              <i
                class="dcg-icon-caret-up dcg-open-options"
                aria-label={() =>
                  this.i18n.s('shared-calculator-button-hide-options')
                }
              />
            ),
            false: () => (
              <i
                class="dcg-icon-caret-down dcg-open-options"
                aria-label={() =>
                  this.i18n.s('shared-calculator-button-show-options')
                }
              />
            )
          })}
        </button>

        <If predicate={() => this.isOpen()}>
          {() => (
            <div
              class={() => ({
                'dcg-options-dropdown__container': true,
                'dcg-options-dropdown__padded-bottom-container':
                  this.props.addBottomPaddingToDropdown?.()
              })}
            >
              <OptionsDropdownList
                options={() => this.getOptions()}
                onTap={(option) => this.selectOptionById(option.key)}
                class={this.const('dcg-select-dropdown-list')}
                buildFooter={this.props.buildFooter}
                controller={this.props.controller}
              />
            </div>
          )}
        </If>
      </div>
    );
  }

  private getOptions(): DropdownOption[] {
    return this.props.options().map((option) => ({
      key: option.id,
      title: () => option.label,
      selected: () => option.label === this.getFilterString(),
      disabled: option.disabled,
      class: option.class || 'dcg-select-dropdown-option'
    }));
  }

  private isOpen() {
    return !!this.shouldShowResults;
  }

  private setResultsOpen(open: boolean) {
    this.shouldShowResults = open;
    this.update();
    this.props.onOpenChange?.(open);
    if (open) {
      if (this.filter) {
        const option = this.props.options().find((o) => o.id === this.filter);
        this.focusOption(option);
      } else if (this.props.externalControl) {
        const selectedId = this.props.externalControl().getValue();
        const option = this.props.options().find((o) => o.id === selectedId);
        this.focusOption(option);
      } else {
        this.focusHelper.focusFirstItem();
      }
    }
  }

  private toggleResultsOpen() {
    this.setResultsOpen(!this.shouldShowResults);
  }

  private focusOption(option?: TOption) {
    if (!option) {
      return;
    }
    const el = document.querySelector(
      `#dcg-select-dropdown-container-${this.props.id()} .dcg-select-dropdown-list #${option.id}`
    ) as HTMLElement | null;
    el?.focus();
  }

  private onInputChange(filter: string) {
    if (this.props.externalControl) {
      this.props.externalControl().onValueChange(filter);
    } else {
      this.filter = filter;
    }
    this.update();
  }

  private getFilterString() {
    const options = this.props.options();
    const option = options.find(
      (o) =>
        o.id ===
        (this.props.externalControl
          ? this.props.externalControl().getValue()
          : this.filter)
    );
    return option?.label || '';
  }

  private selectOptionById(optionId: string | undefined) {
    const options = this.props.options();
    const option = options.find((o) => o.id === optionId);

    if (!option) return;

    this.onInputChange(option.id);
    this.setResultsOpen(false);

    if (!this.props.dontFocusAnchorOnSelect?.()) {
      this.focusHelper.focusAnchor();
    }

    this.props.onChange?.(option.id);
  }

  unmountTapListener() {
    $(document.body).off(
      `dcg-tapstart.dcg-select-dropdown-container-${this.uuid}`
    );
  }

  attachTapListener() {
    $(document.body).on(
      `dcg-tapstart.dcg-select-dropdown-container-${this.uuid}`,
      this.bindFn(this.tapListener)
    );
  }

  tapListener(evt: TriggeredEvent) {
    if (
      evt.target.closest(`#dcg-select-dropdown-container-${this.props.id()}`)
    ) {
      return;
    }

    this.setResultsOpen(false);
  }
}
