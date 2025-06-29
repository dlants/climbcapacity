import type { Spec } from './create-spec';
import { Show } from './show';
import { View } from './view';

type HideProps = {
  when: () => boolean | undefined;
  children: Spec;
};

export class Hide extends View<HideProps> {
  template() {
    return <Show when={() => !this.props.when()}>{this.props.children}</Show>;
  }
}
