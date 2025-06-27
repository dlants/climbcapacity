import type { HTMLProps } from './jsx';
import { View } from './view';

type CheckboxProps = Omit<
  HTMLProps<
    HTMLInputElement,
    {
      checked: () => boolean;
      onChange: (state: boolean) => void;
      onMount?: (node: HTMLInputElement) => void;
    }
  >,
  'type'
>;

export class Checkbox extends View<CheckboxProps> {
  _viewName = 'Checkbox';
  rootDOM: HTMLInputElement;

  computeChecked() {
    return !!this.props.checked();
  }

  template() {
    if (!this.props.checked) {
      throw new Error('<Checkbox> expects a "checked={}" prop');
    }

    if (!this.props.onChange) {
      throw new Error('<Checkbox> expects an "onChange={}" prop');
    }

    const attributes = {
      ...this.props,
      type: this.const('checkbox'),
      checked: this.const(this.computeChecked() ? true : undefined),
      onChange: (event: InputEvent) => {
        this.props.onChange((event.target as HTMLInputElement).checked);
        if (this._isMounted) {
          this.update();
        }
      },
      onMount: (node: HTMLInputElement) => {
        this.rootDOM = node;
        if (this.props.onMount) {
          this.props.onMount(node);
        }
      }
    };

    return <input {...attributes} />;
  }

  didUpdate() {
    const newChecked = this.computeChecked();

    if (this.rootDOM.checked !== newChecked) {
      this.rootDOM.checked = newChecked;
    }
  }
}
