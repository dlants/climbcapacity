import './checkbox.scss';

import * as DCGView from 'dcgview';

import type { TouchtrackingEvent } from '../lib/touchtracking';

type Props = {
  checked: () => boolean;
  onChange: (checked: boolean, evt: TouchtrackingEvent) => void;
  class?: () => string;
  style?: () => Partial<CSSStyleDeclaration>;
  disabled?: () => boolean;
  tabIndex?: () => number;
  ariaLabel?: () => string;
  labelledBy?: () => string | undefined;
  describedBy?: () => string | undefined;
  small?: () => boolean;
  manageFocus?: () => any;
  required?: () => boolean;
  children: DCGView.Child | DCGView.Children;
  stopPropagationOnTap?: () => boolean;
};

export class Checkbox extends DCGView.View<Props> {
  template() {
    return (
      <div
        role="checkbox"
        tabIndex={() => this.getTabIndex()}
        aria-label={() => this.props.ariaLabel?.()}
        aria-labelledby={() => this.props.labelledBy?.()}
        aria-describedby={() => this.props.describedBy?.()}
        aria-disabled={() =>
          this.props.disabled && this.props.disabled() ? true : undefined
        }
        aria-checked={() => this.props.checked()}
        aria-required={() =>
          this.props.required ? this.props.required() : undefined
        }
        manageFocus={() => this.props.manageFocus?.()}
        class={() => ({
          'dcg-component-checkbox': true,
          'dcg-checked': this.props.checked(),
          'dcg-disabled': this.props.disabled && this.props.disabled(),
          'dcg-small': this.props.small && this.props.small(),
          [this.props.class === undefined ? '' : this.props.class()]:
            this.props.class !== undefined
        })}
        style={() => (this.props.style ? this.props.style() : {})}
        onTap={this.bindFn(this.onChange)}
      >
        <span class="dcg-checkbox">
          <i class="dcg-icon-check" aria-hidden="true" />
        </span>
        <span class="dcg-checkbox-children">{this.props.children}</span>
      </div>
    );
  }

  onChange(evt: TouchtrackingEvent): void {
    //if clicking a link inside of a checkbox area, don't check the box
    const clickTarget = evt.target as HTMLElement;
    if (clickTarget && clickTarget.getAttribute('href')) return;
    if (this.props.disabled && this.props.disabled()) return;
    if (this.props.stopPropagationOnTap?.()) {
      evt.stopPropagation();
    }
    this.props.onChange(!this.props.checked(), evt);
  }

  getTabIndex() {
    if (this.props.tabIndex) {
      return this.props.tabIndex();
    }
    return this.props.disabled && this.props.disabled() ? -1 : 0;
  }
}
