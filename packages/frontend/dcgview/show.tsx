import type { Spec } from './create-spec';
import { Switch } from './switch';
import { View } from './view';

type ShowProps = {
  when: () => boolean | undefined;
  children: Spec;
};

export class Show extends View<ShowProps> {
  template() {
    return (
      <Switch key={() => this.props.when()}>
        {(when) => (when ? this.props.children : undefined)}
      </Switch>
    );
  }
}
