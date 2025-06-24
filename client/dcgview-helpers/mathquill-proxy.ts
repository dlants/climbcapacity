// Proxy around a mathquill object used to implement focusedMathQuill
// in the API. Allows us to present the same public interface as a
// mathquill editable field, but attach additional actions, like
// simulateUserChangedLatex.

import MathQuillView from 'dcgview-helpers/mathquill-view';
import { type MQConfig, type MQMathField } from 'vendor/mathquill';

export class MathQuillProxy implements MQMathField {
  private mq: MQMathField;
  readonly id: MQMathField['id'];
  readonly data: MQMathField['data'];

  constructor(mq: MQMathField) {
    this.mq = mq;
    this.id = mq.id;
    this.data = mq.data;
  }

  private simulateUserChangedLatex() {
    MathQuillView.simulateUserChangedLatex(this.mq);
  }
  private simulateKeypress(key: string) {
    MathQuillView.simulateKeypressFromKeypad(this.mq, key);
  }
  config(config: MQConfig): this {
    this.mq.config(config);
    return this;
  }

  latex(latex: string): this;
  latex(): string;
  latex(latex?: string): string | MQMathField {
    if (latex === undefined) {
      return this.mq.latex();
    } else {
      this.mq.latex(latex);
      this.simulateUserChangedLatex();
      return this;
    }
  }
  reflow() {
    this.mq.reflow();
  }
  el() {
    return this.mq.el();
  }
  getAriaLabel() {
    return this.mq.getAriaLabel();
  }
  setAriaLabel(str: string): this {
    return this.mq.setAriaLabel(str) as this;
  }
  html() {
    return this.mq.html();
  }
  mathspeak() {
    return this.mq.mathspeak();
  }
  text() {
    return this.mq.text();
  }
  selection() {
    return this.mq.selection();
  }
  select() {
    this.mq.select();
    return this;
  }
  moveToRightEnd() {
    this.mq.moveToRightEnd();
    return this;
  }
  moveToLeftEnd() {
    this.mq.moveToLeftEnd();
    return this;
  }
  cmd(latex: string) {
    this.mq.cmd(latex);
    this.simulateUserChangedLatex();
    return this;
  }
  write(latex: string) {
    this.mq.write(latex);
    this.simulateUserChangedLatex();
    return this;
  }
  keystroke(key: string) {
    this.simulateKeypress(key);
    return this;
  }
  typedText(text: string) {
    this.mq.typedText(text);
    this.simulateUserChangedLatex();
    return this;
  }
  clearSelection() {
    this.mq.clearSelection();
    return this;
  }
  getAriaPostLabel() {
    return this.mq.getAriaPostLabel();
  }
  setAriaPostLabel(str: string, timeout?: number) {
    this.mq.setAriaPostLabel(str, timeout);
    return this;
  }

  // Don't expect users to actually call any of the following methods.
  // Maybe we shouldn't implement them at all?
  blur() {
    this.mq.blur();
    return this;
  }
  focus() {
    this.mq.focus();
    return this;
  }
  revert() {
    return this.mq.revert();
  }
  ignoreNextMousedown(func: () => boolean) {
    this.mq.ignoreNextMousedown(func);
    return this;
  }
  clickAt(x: number, y: number, el: HTMLElement) {
    this.mq.clickAt(x, y, el);
    return this;
  }
}
