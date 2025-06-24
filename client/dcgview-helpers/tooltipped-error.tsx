import './tooltipped-error.scss';

import * as DCGView from 'dcgview';

import { Tooltip, type TooltipGravity } from '../shared-components/tooltip';

type Props = {
  isWhite?: () => boolean;
  error: () => string;
  gravity?: () => TooltipGravity; // defaults to 's'
  size?: () => 'small' | 'medium' | 'medium-small'; // defaults to 'medium'
  instant?: () => boolean; // if true, do not fade error in
  sticky?: () => boolean; // defaults to true
};

export class TooltippedError extends DCGView.View<Props> {
  template() {
    return (
      <Tooltip
        tooltip={this.props.error}
        sticky={() => this.props.sticky?.() ?? true}
        gravity={this.props.gravity}
        additionalClass={this.const('dcg-tooltipped-error-container')}
      >
        <div
          class={() => ({
            'dcg-tooltipped-error': true,
            'dcg-small': this.props.size?.() === 'small',
            'dcg-medium-small': this.props.size?.() === 'medium-small',
            'dcg-white': this.props.isWhite && this.props.isWhite(),
            'dcg-tooltipped-error__instant': this.props.instant?.()
          })}
        >
          <i class="dcg-icon-error" aria-hidden="true" />
        </div>
      </Tooltip>
    );
  }
}
