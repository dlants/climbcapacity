import { type JQSubset } from 'jquery';

type Props = {
  selectOnFocus?: () => boolean;
  isFocused: () => boolean;
  onFocusedChanged: (focused: boolean, evt: FocusEvent) => void;
  focusPosition?: () => 'start' | 'end' | undefined;
};

/**
 * Helper class to hook onto a MathQuill field (static or editable)
 * and manage focus, based on the Props like would be passed to a DCGView component.
 * Call `willUnmount` when removed.
 */
export class MathquillFocus {
  private wasFocusedLastUpdate: boolean = false;

  constructor(
    private mathField: MathQuill.v3.BaseMathQuill,
    private $mathField: JQSubset,
    private props: Props
  ) {
    this.$mathField.on('focusin.view focusout.view', (evt) =>
      this.onFocusEvent(evt as unknown as FocusEvent)
    );
  }

  willUnmount() {
    this.$mathField.off('.view');
  }

  updateMathquillFocused() {
    if (!this.mathField) return;

    const isFocused = this.isFocused();
    const shouldBeFocused = this.shouldBeFocused();

    if (shouldBeFocused && shouldBeFocused !== this.wasFocusedLastUpdate) {
      if (this.props.selectOnFocus?.()) {
        // Non-editable mathfields automatically select on focus.
        (this.mathField as MathQuill.v3.EditableMathQuill).select?.();
      }
    }

    this.wasFocusedLastUpdate = shouldBeFocused;
    if (isFocused !== shouldBeFocused) {
      if (shouldBeFocused) {
        this.mathField.focus();
      } else {
        this.mathField.blur();
      }
    }

    if (shouldBeFocused) {
      const startingLocation = this.props.focusPosition?.();
      if (startingLocation === 'start') {
        (this.mathField as MathQuill.v3.EditableMathQuill).moveToLeftEnd();
      } else if (startingLocation === 'end') {
        (this.mathField as MathQuill.v3.EditableMathQuill).moveToRightEnd();
      }
    }
  }

  isFocused(): boolean {
    // TODO - maybe mathquill has a more efficient check for this
    return !!(
      document.activeElement &&
      this.mathField?.el().contains(document.activeElement)
    );
  }

  shouldBeFocused() {
    return this.props.isFocused();
  }

  onFocusEvent(evt: FocusEvent) {
    const focused = this.isFocused();
    if (focused === this.shouldBeFocused()) return;

    this.props.onFocusedChanged(focused, evt);
  }
}
