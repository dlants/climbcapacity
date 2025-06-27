import type { HTMLProps } from './jsx';
import { View } from './view';

type InputProps = HTMLProps<
  HTMLInputElement,
  {
    value: () => string;
    onInput?: (value: string) => void;
    onEnterPressed?: () => void;
    disabled?: () => boolean | undefined;
    readOnly?: () => boolean | undefined;
    onMount?: (node: HTMLInputElement) => void;
  }
>;

export class Input extends View<InputProps> {
  _viewName = 'Input';
  rootDOM: HTMLInputElement;

  computeValue() {
    const value = this.props.value();
    return value === null || value === undefined ? '' : `${value}`;
  }

  template() {
    const { value, onInput, onEnterPressed, disabled, readOnly } = this.props;

    if (!value) {
      throw new Error('<Input> expects a "value={}" prop');
    }

    const attributes: HTMLProps<HTMLInputElement> = {
      ...this.props,
      ...{
        value: this.const(this.computeValue()),
        onInput: ((event: InputEvent) => {
          onInput?.((event.target as HTMLInputElement).value);
          if (this._isMounted) {
            this.update();
          }
        }).bind(this)
      }
    };

    if (onEnterPressed) {
      attributes.onKeyPress = (event) => {
        if (event.which === 13) {
          onEnterPressed();
        }
      };
    }

    if (disabled) {
      attributes.disabled = () => (disabled() ? true : undefined);
    }

    if (readOnly) {
      attributes.readOnly = () => (readOnly() ? true : undefined);
    }

    if (!attributes.hasOwnProperty('tabIndex')) {
      attributes.tabIndex = () => (disabled && disabled() ? '-1' : '0');
    }

    attributes.onMount = (node: HTMLInputElement) => {
      this.rootDOM = node;
      if (this.props.onMount) {
        this.props.onMount(node);
      }
    };

    return <input {...attributes} />;
  }

  didUpdate() {
    const newValue = this.computeValue();
    if (this.rootDOM.value !== newValue) {
      this.rootDOM.value = newValue;
    }
  }
}
