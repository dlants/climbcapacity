import * as DCGView from 'dcgview';
import $ from 'jquery';
import * as Browser from 'lib/browser';

import { type TokenController } from '../expressions/geo-token-view';
import { type MQConfig, type MQStaticMath } from '../vendor/mathquill';
import { MathquillFocus } from './mathquill-focus';
import StaticMathquillView from './static-mathquill-view';

type Props = {
  latex: () => string;
  config: () => Omit<MQConfig, 'mouseEvents'>;
  getAriaLabel?: () => string;
  tokenController?: () => TokenController | undefined;
  isFocused: () => boolean;
  onFocusedChanged: (focused: boolean, evt: FocusEvent) => void;
  didMountMathquill?: (mq: MQStaticMath) => void;
  onUserPressedKey?: (key: string, evt?: KeyboardEvent) => void;
  tabbable?: () => boolean;
};

export class FocusableStaticMathquillView extends DCGView.View<Props> {
  private mathquillFocus: MathquillFocus | undefined;

  template() {
    return (
      <StaticMathquillView
        latex={this.props.latex}
        config={this.props.config}
        tabbable={() => (this.props.tabbable ? this.props.tabbable() : true)}
        getAriaLabel={this.props.getAriaLabel}
        tokenController={this.props.tokenController}
        onUserPressedKey={this.props.onUserPressedKey}
        didMountMathquill={(staticMath) => this.didMountMathquill(staticMath)}
      />
    );
  }

  didMountMathquill(staticMath: MQStaticMath) {
    this.mathquillFocus = new MathquillFocus(
      staticMath,
      $(staticMath.el()),
      this.props
    );
    this.didUpdate();
    this.props.didMountMathquill?.(staticMath);

    if (this.props.isFocused()) staticMath.select();

    //select on tap, if nothing is selected
    $(staticMath.el()).on('dcg-tap', () => {
      if (Browser.IS_MOBILE) return;
      const selection = staticMath.selection();
      if (selection.startIndex !== selection.endIndex) return;
      staticMath.select();
    });
  }

  willUnmount() {
    this.mathquillFocus?.willUnmount();
  }

  didUpdate() {
    this.mathquillFocus?.updateMathquillFocused();
  }
}
