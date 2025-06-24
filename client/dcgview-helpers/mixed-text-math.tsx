import './mixed-text-math.scss';

import {
  chunkLabel,
  classifyLabelText
} from 'core/math/parse-backtick-interpolation';
import * as DCGView from 'dcgview';
import {
  type BrailleController,
  getBrailleWrapperProps,
  MathquillBrailleWrapper
} from 'shared-components/mathquill-braille-wrapper';

import { type DynamicMQConfig } from './mathquill-view';

const { For, IfElse } = DCGView.Components;

export class MixedTextMath extends DCGView.View<{
  //this is a string that intermixes text and math, separated by backticks, so e.g.:
  //    This is my equation: `y=x^2` would render "This is my equation: " as a string and "y=x^2" as LaTeX
  content: () => string;
  mqConfig?: () => Partial<DynamicMQConfig>;
  controller: () => BrailleController;
}> {
  private controller = this.props.controller();

  template() {
    return (
      <span class="dcg-mixed-text-math">
        <For
          each={() => chunkLabel(this.props.content())}
          key={(str, idx) => {
            //we need to recompute if str changes, and we also need to enforce uniqueness, so can't just use {str}
            //see https://github.com/desmosinc/knox/pull/16852#discussion_r1695342189
            return `${str}|${idx}`;
          }}
        >
          {(getChunk) => {
            const chunk = getChunk();
            return IfElse(() => classifyLabelText(chunk) === 'latex', {
              true: () => (
                <MathquillBrailleWrapper
                  latex={() => chunk.substring(1, chunk.length - 1)}
                  isFocused={this.const(false)}
                  tabIndex={this.const(-1)}
                  isStatic={this.const(true)}
                  selectOnFocus={this.const(false)}
                  {...getBrailleWrapperProps(this.controller)}
                />
              ),
              false: () => <span class="dcg-label-raw-text">{() => chunk}</span>
            });
          }}
        </For>
      </span>
    );
  }
}
