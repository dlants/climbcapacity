import { createSpec } from './create-spec';
import type { HTMLProps } from './jsx';
import { View } from './view';

type TextareaProps = Omit<
  HTMLProps<
    HTMLTextAreaElement,
    {
      value: () => string;
      onInput: (value: string) => void;
      disabled?: () => boolean | undefined;
      readOnly?: () => boolean | undefined;
      onMount?: (node: HTMLTextAreaElement) => void;
    }
  >,
  'children'
>;

export class Textarea extends View<TextareaProps> {
  _viewName = 'Textarea';
  rootDOM: HTMLTextAreaElement;

  computeValue() {
    const value = this.props.value();
    return value === null || value === undefined ? '' : `${value}`;
  }

  template() {
    const { value, onInput, disabled, readOnly } = this.props;

    if (!value) {
      throw new Error('<Textarea> expects a "value={}" prop');
    }

    if (!onInput) {
      throw new Error('<Textarea> expects an "onInput={}" prop');
    }

    const attributes: HTMLProps<HTMLTextAreaElement> = {
      ...this.props,
      children: this.const(this.computeValue()),
      ...{
        onInput: ((event: InputEvent) => {
          this.props.onInput((event.target as HTMLInputElement).value);
          if (this._isMounted) {
            this.update();
          }
        }).bind(this)
      }
    };

    if (disabled) {
      attributes.disabled = () => (disabled() ? true : undefined);
    }

    if (readOnly) {
      attributes.readOnly = () => (readOnly() ? true : undefined);
    }

    attributes.onMount = (node: HTMLTextAreaElement) => {
      this.rootDOM = node;
      if (this.props.onMount) {
        this.props.onMount(node);
      }
    };

    delete attributes.value;

    return createSpec('textarea', attributes);
  }

  didUpdate() {
    const newValue = this.computeValue();
    if (this.rootDOM.value !== newValue) {
      this.rootDOM.value = newValue;
    }
  }
}
