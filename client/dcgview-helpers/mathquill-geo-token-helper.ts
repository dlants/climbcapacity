import * as DCGView from 'dcgview';
import { GeoTokenView, type TokenController } from 'expressions/geo-token-view';

export type LastTokenInfoType = {
  latex: string;
  tokens: Element[];
};

// Shim here, copying makeConst from dcgview.ts because we need it to pass
// into the constructed DCGView objects and this seems cleaner than
// passing in `this.const` from the class using this helper.
type MakeConst = <T>(v: T) => () => T;
const makeConst: MakeConst = (val) => {
  const returnFunction = function () {
    return val;
  };
  returnFunction.isDcgViewConst = true;
  return returnFunction;
};

/**
 * Helper class to hook onto a MathQuill element (static or editable) and attach
 * GeoTokenView elements in place of each \\token{}.
 */
export class MathquillGeoTokenHelper {
  private readonly tokenController: TokenController;
  private readonly isStatic: boolean;
  private mathNode: HTMLElement;
  private lastTokenInfo: LastTokenInfoType;

  /**
   * Construct new MathquillGeoTokenHelper
   *
   * @param tokenController  parent token controller
   * @param mathNode  HTML element to which MathQuill is attached.
   * @param isStatic  if true, the resulting token views will behave as a static
   *   part of the mathquill view (e.g. won't respond to hover or tap events)
   */
  constructor(
    tokenController: TokenController,
    mathNode: HTMLElement,
    isStatic: boolean
  ) {
    this.tokenController = tokenController;
    this.mathNode = mathNode;
    this.isStatic = isStatic;
  }

  /**
   * Create or update rendered tokens on the existing node based on latex.
   *
   * @param latex
   */
  updateTokens(latex: string) {
    if (!this.mathNode) return;

    if (!this.lastTokenInfo || this.lastTokenInfo.latex !== latex) {
      // sanity check to make sure we even expect a token to show up in DOM
      if (!this.tokenController.doesLatexContainToken(latex)) {
        this.lastTokenInfo = {
          latex,
          tokens: []
        };
      } else {
        const foundTokens: Element[] = [];
        this.mathNode
          .querySelectorAll('.dcg-mq-token')
          .forEach((el: Element) => {
            foundTokens.push(el);
          });
        this.lastTokenInfo = {
          latex,
          tokens: foundTokens
        };
      }
    }

    const tokens = this.lastTokenInfo.tokens;
    for (const el of tokens) {
      const view = (el as any).dcgTokenView;
      if (view) {
        view.update();
      } else {
        const tokenId = el.getAttribute('data-dcg-mq-token') || '';
        const view = DCGView.mountToNode(GeoTokenView, el as HTMLElement, {
          controller: makeConst(this.tokenController as any),
          identifier: makeConst('$' + tokenId),
          insideMQ: makeConst(true),
          insideGroup: makeConst(false),
          putInTabOrder: makeConst(false),
          isStatic: makeConst(this.isStatic)
        });
        (el as any).dcgTokenView = view;
      }
    }
  }
}
