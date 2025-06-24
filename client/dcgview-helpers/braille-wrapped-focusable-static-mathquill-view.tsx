import * as DCGView from 'dcgview';
import * as Browser from 'lib/browser';
import * as _ from 'underscore';

import type { FocusLocation } from '../graphing-calc/models/focus';
import type Controller from '../main/controller';
import {
  getBrailleWrapperProps,
  MathquillBrailleWrapper
} from '../shared-components/mathquill-braille-wrapper';

export class BrailleWrappedFocusableStaticMathquillView extends DCGView.View<{
  latex: () => string;
  controller: () => Controller;
  focusLocation: () => FocusLocation | undefined;
  tabbable: () => boolean;
  ariaLabel: () => string;
  brailleAriaLabel?: () => string;
  onKeypress?: (evt: KeyboardEvent) => void;
  //since blur fires before focus, if focus is moving
  //somewhere predictable, we might want to not fire off a blur here
  //example: tabbing through an expanded table shouldn't collapse it
  suppressBlurEvent?: (evt: FocusEvent) => boolean;
  additionalOperators?: () => string[];
}> {
  private controller: Controller;
  init() {
    this.controller = this.props.controller();
  }
  template() {
    return (
      <MathquillBrailleWrapper
        latex={this.props.latex}
        isFocused={this.bindFn(this.isFocused)}
        isStatic={this.const(true)}
        ariaLabel={this.props.brailleAriaLabel || this.props.ariaLabel}
        {...getBrailleWrapperProps(this.controller, {
          additionalOperators: this.props.additionalOperators?.() || []
        })}
        onKeydown={(evt: KeyboardEvent) => this.props.onKeypress?.(evt)}
        tabIndex={() => (this.props.tabbable() ? 0 : -1)}
        selectOnFocus={() => !Browser.IS_MOBILE}
        onFocusedChanged={this.bindFn(this.onFocusChange)}
      />
    );
  }

  isFocused() {
    return (
      !!this.props.focusLocation() &&
      _.isEqual(this.props.focusLocation(), this.controller.getFocusLocation())
    );
  }

  onFocusChange(focused: boolean, evt: FocusEvent) {
    const focusLocation = this.props.focusLocation();
    if (!focusLocation) return;
    if (focused) {
      this.controller.dispatch({
        type: 'set-focus-location',
        location: focusLocation
      });
    } else if (!this.props.suppressBlurEvent?.(evt)) {
      this.controller.dispatch({
        type: 'blur-focus-location',
        location: focusLocation
      });
    }
  }
}
