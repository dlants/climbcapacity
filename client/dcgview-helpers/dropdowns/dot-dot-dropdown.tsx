import './dot-dot-dropdown.scss';

import * as DCGView from 'dcgview';

export class DotDotDropdown extends DCGView.View {
  template() {
    return (
      <div class="dcg-dot-dot-dropdown">
        <i class="dcg-icon-ellipsis-vertical" aria-hidden="true" />
      </div>
    );
  }
}
