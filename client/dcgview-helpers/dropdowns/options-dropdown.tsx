import './options-dropdown.scss';

import * as DCGView from 'dcgview';
import * as i18n from 'lib/i18n';

import type { TouchtrackingEvent } from '../../lib/touchtracking';
import type { BrailleController } from '../../shared-components/mathquill-braille-wrapper';
import { MixedTextMath } from '../mixed-text-math';
import type { ItemNavigationKey } from './dropdown-focus-helper';
import {
  DropdownPopoverWithAnchor,
  type DropdownPopoverWithAnchorControlled
} from './dropdown-popover';

const { For, If, IfDefined, Switch } = DCGView.Components;

export type Explanation<F extends string = string> = {
  explanation: i18n.TranslatedString;
  link?: string;
  linkText?: i18n.TranslatedString;
  flag: F;
};

type ActionDropdownOption<F extends string = string> = {
  title: () => i18n.TranslatedString;
  subtitle?: () => i18n.TranslatedString;
  key?: string;
  disabled?: boolean;
  selected?: () => boolean;
  class?: string;
  icon?: string;
  explanations?: Explanation<F>[];
  /**
   * If true, the popover will not close when the item is clicked.
   */
  preventClose?: boolean;
  action?: (evt: TouchtrackingEvent) => void;
};

export interface LinkDropdownOption<F extends string = string>
  extends ActionDropdownOption<F> {
  href: string;
  target?: string;
  /**
   * If set, rel='noreferrer noopener' will be added to the href.  This should be used when linking to non-desmos
   * sites(e.g. Google Classroom).  See https://web.dev/external-anchors-use-rel-noopener/
   */
  noreferrer?: boolean;
}
export type DropdownOption<F extends string = string> =
  | LinkDropdownOption<F>
  | ActionDropdownOption<F>;

/**
 * A vertical dropdown menu with each item consisting of text and (optionally) a small icon.
 * This view simply renders the list of options, with no opening/closing logic or positioning styles.
 * See OptionsDropdown for menu that opens/closes from an anchor element.
 */
export class OptionsDropdownList extends DCGView.View<{
  class?: () => string;
  options: () => DropdownOption[];
  onTap: (option: DropdownOption, evt: TouchtrackingEvent) => void;
  buildFooter?: () => DCGView.Child | DCGView.Children;
  controller: () => BrailleController;
}> {
  template() {
    return (
      <div
        role="list"
        class={() => ({
          'dcg-shared-options-dropdown': true,
          [this.props.class?.() || '']: !!this.props.class
        })}
      >
        <For
          each={this.props.options}
          key={(opt) =>
            `${opt.key ? opt.key : opt.title()}${opt.disabled ? '-disabled' : ''}`
          }
        >
          {(getOption) => {
            const option = getOption();
            return (
              <div role="listitem" class="dropdown-option-container">
                <Switch key={() => option}>
                  {(option) => {
                    if ('href' in option) {
                      return (
                        <a
                          aria-disabled={() => option.disabled}
                          aria-selected={() => option.selected?.()}
                          id={this.const(option.key)}
                          tabIndex={() => this.getTabIndex(option)}
                          class={() => ({
                            [option.class || '']: !!option.class,
                            'dcg-standard-link-styling': !option.class,
                            'dcg-dropdown-choice': true,
                            'dcg-disabled': option.disabled,
                            'dcg-selected': option.selected?.()
                          })}
                          onTap={(evt) =>
                            !option.disabled && this.props.onTap(option, evt)
                          }
                          // We may need to fine tune this if `option.action` does not
                          // *always* open use the behavior to do something in the SPA
                          // but for now this serves current use cases
                          ignoreRealClick={() => !!option.action}
                          href={() => option.href}
                          target={() =>
                            option.target !== undefined ? option.target : ''
                          }
                          rel={() =>
                            option.noreferrer ? 'noreferrer noopener' : ''
                          }
                        >
                          <If predicate={() => option.icon != null}>
                            {() => (
                              <div class="dcg-option-icon-container">
                                <i
                                  aria-hidden="true"
                                  class={() => `${option.icon} dcg-option-icon`}
                                />
                              </div>
                            )}
                          </If>
                          <MixedTextMath
                            content={option.title}
                            controller={this.props.controller}
                          />
                        </a>
                      );
                    } else {
                      return (
                        <div
                          role="link"
                          tabIndex={() => this.getTabIndex(option)}
                          aria-disabled={() => option.disabled}
                          aria-selected={() => option.selected?.()}
                          id={this.const(option.key)}
                          class={() => ({
                            [option.class || '']: !!option.class,
                            'dcg-standard-link-styling': !option.class,
                            'dcg-dropdown-choice': true,
                            'dcg-disabled': option.disabled,
                            'dcg-selected': option.selected?.()
                          })}
                          onTap={(evt) =>
                            !option.disabled && this.props.onTap(option, evt)
                          }
                        >
                          <If predicate={() => option.icon != null}>
                            {() => (
                              <div class="dcg-option-icon-container">
                                <i
                                  aria-hidden="true"
                                  class={() => `${option.icon} dcg-option-icon`}
                                />
                              </div>
                            )}
                          </If>
                          <span class="option-title">
                            <MixedTextMath
                              content={option.title}
                              controller={this.props.controller}
                            />
                          </span>
                          {IfDefined(
                            () => option.subtitle && option.subtitle(),
                            (subtitle: () => i18n.TranslatedString) => (
                              <span class="dcg-option-subtitle">
                                {subtitle}
                              </span>
                            )
                          )}
                        </div>
                      );
                    }
                  }}
                </Switch>

                <If predicate={() => !!option.explanations}>
                  {() => (
                    <div class="dcg-dropdown-explanations">
                      <For
                        each={() => option.explanations || []}
                        key={(explanation) => explanation.flag}
                      >
                        {(getExplanation) => (
                          <div class="dcg-explanation">
                            {() => getExplanation().explanation}{' '}
                            <If predicate={() => !!getExplanation().link}>
                              {() => (
                                <a
                                  class="learn-more"
                                  href={() =>
                                    getExplanation().link !== undefined
                                      ? getExplanation().link
                                      : ''
                                  }
                                  target="_blank"
                                >
                                  {() =>
                                    getExplanation().linkText
                                      ? getExplanation().linkText
                                      : i18n.s(
                                          'shared-button-learn-more-capitalized'
                                        )
                                  }
                                </a>
                              )}
                            </If>
                          </div>
                        )}
                      </For>
                    </div>
                  )}
                </If>
              </div>
            );
          }}
        </For>
        {this.props.buildFooter?.()}
      </div>
    );
  }

  private getTabIndex(option: ActionDropdownOption<string>) {
    if (option.disabled && !option.selected?.()) {
      return -1;
    }
    return 0;
  }
}

/**
 * A vertical dropdown menu with each item consisting of text and (optionally) a small icon.
 * The popover is opened or closed when the anchor element is clicked. Options may have an icon,
 * href, and action.
 */
export class OptionsDropdown extends DCGView.View<{
  anchor: () => DCGView.Child;
  guid: () => string;
  options: () => DropdownOption[];
  anchorAriaLabel?: () => i18n.TranslatedString;
  dropdownOffset?: () => number;
  disabled?: () => boolean;
  hideArrow?: () => boolean;
  focusTrapping?: () => { itemNavigationKey: ItemNavigationKey };
  containerClassName?: () => string;
  controlled?: () => DropdownPopoverWithAnchorControlled;
  controller: () => BrailleController;
}> {
  private showDropdown: boolean;

  init() {
    this.showDropdown = false;
  }

  template() {
    return (
      <DropdownPopoverWithAnchor
        anchor={this.props.anchor}
        containerClassName={this.props.containerClassName}
        controlled={() =>
          this.props.controlled?.() || {
            isOpen: this.showDropdown,
            setDropdownOpen: this.bindFn(this.setDropdownOpen)
          }
        }
        anchorAriaLabel={this.props.anchorAriaLabel}
        disabled={this.props.disabled}
        guid={this.props.guid}
        dropdownProps={() => ({
          position: this.const('bottom-left'),
          hideArrow: this.props.hideArrow
        })}
        dropdownOffset={this.props.dropdownOffset}
        focusTrapping={
          this.props.focusTrapping ?? this.const({ itemNavigationKey: 'arrow' })
        }
        popoverBody={() => (
          <OptionsDropdownList
            {...this.props}
            onTap={this.bindFn(this.tapOption)}
          />
        )}
      />
    );
  }

  tapOption(option: DropdownOption, evt: TouchtrackingEvent) {
    option.action?.(evt);

    if (option.preventClose) return;

    this.setDropdownOpen(false);
  }

  setDropdownOpen(isOpen: boolean) {
    this.showDropdown = isOpen;
    if (this._isMounted) {
      this.update();
    }
  }
}
