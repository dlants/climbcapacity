import './learn-more-link.scss';

import type BasicController from 'basic/controller';
import * as DCGView from 'dcgview';
import type Controller from 'main/controller';

import { Tooltip } from '../shared-components/tooltip';

type Props = {
  href: () => string;
  controller: () => Controller | BasicController;
};

export class LearnMoreLink extends DCGView.View<Props> {
  template() {
    return (
      <Tooltip
        tooltip={() =>
          this.props.controller().s('shared-calculator-label-toast-learn-more')
        }
      >
        <a
          aria-label={() =>
            this.props
              .controller()
              .s('shared-calculator-label-toast-learn-more')
          }
          class="dcg-learn-more-link"
          href={this.props.href}
          target="_blank"
        >
          <i class="dcg-icon-question-sign" aria-hidden="true" />
        </a>
      </Tooltip>
    );
  }
}
