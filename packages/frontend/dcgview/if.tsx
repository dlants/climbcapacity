import { isConst } from './const';
import { createSpec, isSpec, type Spec } from './create-spec';
import { Switch } from './switch';
import { View } from './view';

type IfProps = {
  predicate: () => boolean;
  children: () => Spec;
};

export class If extends View<IfProps> {
  _viewName = 'If';

  template() {
    const { predicate } = this.props;
    if (typeof predicate !== 'function') {
      throw new Error('<If predicate={}> must be a function');
    }

    if (!('children' in this.props)) {
      throw new Error('<If> expects a child.');
    }

    if (Array.isArray(this.props.children)) {
      throw new Error(
        `<If> expects a single child. You passed ${this.props.children.length}.`
      );
    }

    const _viewFunction = this.props.children;
    if (isSpec(_viewFunction)) {
      throw new Error(
        '<If> expects a function that constructs a DCGElement. You passed a DCGElement directly'
      );
    }

    if (typeof _viewFunction !== 'function') {
      const json = JSON.stringify(_viewFunction);
      throw new Error(
        `<If> expects a function that constructs a DCGElement. You passed ${json}`
      );
    }

    if (isConst(_viewFunction)) {
      throw new Error(
        '<If> expects a function that constructs a DCGElement. You passed a constant'
      );
    }

    const keyFunction = () => !!predicate();
    const viewFunction = (predicate: boolean) =>
      predicate ? _viewFunction() : undefined;

    // Generate and return the initial view
    return createSpec<typeof Switch<boolean>>(Switch, {
      key: keyFunction,
      children: viewFunction
    });
  }
}
