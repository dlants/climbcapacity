import './static-mathquill-view.scss';

import * as DCGView from 'dcgview';
import { type TokenController } from 'expressions/geo-token-view';
import { MathQuill, type MQConfig, type MQStaticMath } from 'vendor/mathquill';

import { MathquillGeoTokenHelper } from './mathquill-geo-token-helper';

type Props = {
  latex: () => string;
  config?: () => Omit<MQConfig, 'mouseEvents'>;
  onReflow?: () => void;
  getAriaLabel?: () => string;
  tokenController?: () => TokenController | undefined;
  children?: JSX.Element;
  didMountMathquill?: (mq: MQStaticMath) => void;
  onUserPressedKey?: (key: string, evt?: KeyboardEvent) => void;
  tabbable?: () => boolean;
};

export default class StaticMathquillView extends DCGView.View<Props> {
  private staticMath: MQStaticMath | undefined;
  private lastLatex: string;
  private mathquillTokenHelper: MathquillGeoTokenHelper | undefined;

  template() {
    if (!this.props.children) {
      return (
        <div onMount={(node: HTMLElement) => this.onMountMathquill(node)} />
      );
    }

    return this.props.children;
  }

  onMount() {
    if (this.props.children) {
      const rootNodes = this.findAllRootDOMNodes();
      if (rootNodes.length !== 1) {
        throw new Error(
          `StaticMathquillView expects exactly 1 child DOM Node. Got: ${rootNodes.length}`
        );
      }

      const singleRootNode = rootNodes[0];
      if (singleRootNode instanceof HTMLElement) {
        this.onMountMathquill(singleRootNode);
      } else {
        throw new Error(
          'StaticMathquillView expects an HTMLElement as child DOM node'
        );
      }
    }
  }

  private onMountMathquill(node: HTMLElement) {
    const tokenController = this.props.tokenController?.();
    if (tokenController) {
      this.mathquillTokenHelper = new MathquillGeoTokenHelper(
        tokenController,
        node,
        true
      );
    }
    this.staticMath = MathQuill.StaticMath(node, {
      ...this.props.config?.(),
      tabindex: this.props.tabbable?.() ? 0 : -1,
      overrideKeystroke: (key: string, evt: KeyboardEvent) => {
        if (this.props.onUserPressedKey?.(key, evt)) {
          evt.stopPropagation();
        }
      }
    });
    this.updateMathquill();
    node.classList.add('dcg-static-mathquill-view');
    this.props.didMountMathquill?.(this.staticMath!);
  }

  didUpdate() {
    this.updateMathquill();
  }

  private updateMathquill() {
    this.updateTabbable();
    this.updateMathquillAria();
    this.updateMathquillLatex();
    this.mathquillTokenHelper?.updateTokens(this.props.latex());
  }

  private updateTabbable() {
    if (!this.props.tabbable) return;
    this.staticMath?.config({
      tabindex: this.props.tabbable() ? 0 : -1
    });
  }

  private updateMathquillLatex() {
    // Return if the node hasn't been mounted yet
    if (!this.staticMath) return;

    const newLatex = this.props.latex();
    if (this.lastLatex === newLatex) return;

    this.staticMath.latex(newLatex);
    this.lastLatex = newLatex;

    if (this.props.onReflow) this.props.onReflow();
  }

  private updateMathquillAria() {
    if (!this.staticMath) return;
    if (!this.props.getAriaLabel) return;
    this.staticMath.setAriaLabel(this.props.getAriaLabel());
  }
}
