import './mathquill-view.scss';

import * as DCGView from 'dcgview';
import { type TokenController } from 'expressions/geo-token-view';
import $, { type JQSubset } from 'jquery';
import * as Browser from 'lib/browser';
import * as Keys from 'lib/keys';
import touchtracking, { type TouchtrackingEvent } from 'lib/touchtracking';
import * as _ from 'underscore';
import { MathQuill, type MQConfig, type MQMathField } from 'vendor/mathquill';

import { countLatexTokens } from '../core/lib/count-latex-tokens';
import { MathquillFocus } from './mathquill-focus';
import { MathquillGeoTokenHelper } from './mathquill-geo-token-helper';
import StaticMathquillView from './static-mathquill-view';

const { If } = DCGView.Components;

/**
 * Subset of mathquill config that can be updated dynamically. Ok to add
 * more properties to this as needed
 */
export type DynamicMQConfig = Required<
  Pick<
    MQConfig,
    | 'autoCommands'
    | 'autoOperatorNames'
    | 'infixOperatorNames'
    | 'prefixOperatorNames'
  >
> &
  Pick<
    MQConfig,
    | 'typingAsteriskWritesTimesSymbol'
    | 'typingSlashWritesDivisionSymbol'
    | 'disableCopyPaste'
    | 'leftRightIntoCmdGoes'
  >;
export type CacheableMQConfig = DynamicMQConfig &
  Partial<Pick<MQConfig, 'maxDepth'>>;

type Props = {
  isFocused: () => boolean;
  focusPosition?: () => 'start' | 'end' | undefined;
  latex: () => string;
  capExpressionSize: () => boolean;
  config: () => DynamicMQConfig;
  getAriaLabel: () => string;
  getAriaPostLabel: () => string;
  onUserPressedKey?: (key: string, evt?: KeyboardEvent) => void;
  onUserChangedLatex: (latex: string) => void;
  onFocusedChanged: (focused: boolean, evt: FocusEvent) => void;
  onSelectionChanged?: (selection: {
    latex: string;
    startIndex: number;
    endIndex: number;
  }) => void;
  onReflow?: (mq: MQMathField) => void;
  disableSpace?: () => boolean;
  noFadeout?: () => boolean;
  onExpressionSizeExceeded?: () => void;
  needsSystemKeypad?: () => boolean;
  tokenController?: () => TokenController | undefined;

  // The value of the `data-dcg-label` attribute on the mathquill node. Used in unit tests.
  dataLabelAttributeValue?: () => string;

  // TODO - I'm not sure these belong in the low-level MathquillView
  placeholder?: () => string;
  selectOnFocus?: () => boolean;
  hasError: () => boolean;
};

// EXPRESSION_TOKEN_LIMIT and EXPRESSION_MAX_DEPTH_REDUCED are only enforced
// when the capExpressionSize option is true. EXPRESSION_MAX_DEPTH_DEFAULT
// is enforced otherwise.
export const EXPRESSION_TOKEN_LIMIT = 500;
export const EXPRESSION_MAX_DEPTH_REDUCED = 30;
export const EXPRESSION_MAX_DEPTH_DEFAULT = 100;

export default class MathquillView extends DCGView.View<Props> {
  private $mathField: JQSubset;
  private mathField: MQMathField | undefined;
  private lastLatexProp: string = '';
  private mathquillFocus: MathquillFocus | undefined;
  private mathquillTokenHelper: MathquillGeoTokenHelper | undefined;
  private lastSelection:
    | { latex: string; startIndex: number; endIndex: number }
    | undefined;
  private cachedConfig: CacheableMQConfig;

  template() {
    return (
      <div class="dcg-mq-container">
        <If predicate={() => this.getPlaceholder().trim().length > 0}>
          {() => (
            <span class="dcg-mq-placeholder">
              <StaticMathquillView
                config={() => this.props.config()}
                latex={() => this.getPlaceholder()}
              />
            </span>
          )}
        </If>
        <div
          class={() => ({
            'dcg-math-field': true,
            'dcg-no-fadeout': this.props.noFadeout && this.props.noFadeout(),
            'dcg-invalid': this.props.hasError(),
            'dcg-focus': this.props.isFocused()
          })}
          didMount={(node: HTMLElement) => this.didMountMathquill(node)}
          data-dcg-label={() =>
            this.props.dataLabelAttributeValue
              ? this.props.dataLabelAttributeValue()
              : undefined
          }
        />
      </div>
    );
  }

  willUnmount() {
    this.mathquillFocus?.willUnmount();
    this.mathField = undefined;
  }

  getPlaceholder(): string {
    if (!this.props.placeholder) return '';
    if (this.props.isFocused()) return '';
    if (this.props.latex()) return '';
    return this.props.placeholder();
  }

  didMountMathquill(node: HTMLElement) {
    this.cachedConfig = this.getCacheableMQConfig();
    const config: MQConfig = {
      ...this.cachedConfig,
      restrictMismatchedBrackets: 'none',
      handlers: {
        reflow: (mq: MathQuill.v3.BaseMathQuill) => {
          if (this.props.onReflow && this.mathField)
            this.props.onReflow(mq as MQMathField);
        }
      },
      onCut: () => {
        if (!this.mathField) return;
        this.props.onUserChangedLatex(this.mathField.latex());
      },
      onPaste: () => {
        if (!this.mathField) return;
        this.props.onUserChangedLatex(this.mathField.latex());
      },
      overrideTypedText: (text: string) => {
        if (!this.mathField) return;

        // Block the character if the Math field is full:
        if (!this.viewCanAcceptText(text)) return;

        this.mathField.typedText(text);
        this.props.onUserChangedLatex(this.mathField.latex());
      },
      overrideKeystroke: (key: string, e: KeyboardEvent) => {
        if (key === 'Backspace') e.preventDefault(); // don't go to previous page
        if (!this.mathField) return;
        if (
          key === 'Spacebar' &&
          this.props.disableSpace &&
          this.props.disableSpace()
        ) {
          return e.preventDefault();
        }

        // Account for the special nonstandard Arrow and Esc keys from iOS
        const lookupKey = Keys.lookup(e);
        if (
          lookupKey === 'Up' ||
          lookupKey === 'Down' ||
          lookupKey === 'Left' ||
          lookupKey === 'Right' ||
          lookupKey === 'Esc'
        ) {
          // Resynthesize the entire key (including modifiers) in a form Mathquill expects.
          // Adapted from MathQuill's stringify method in sane-keyboard-events.js
          const modifiers = [];
          if (e.ctrlKey) modifiers.push('Ctrl');
          if (e.metaKey) modifiers.push('Meta');
          if (e.altKey) modifiers.push('Alt');
          if (e.shiftKey) modifiers.push('Shift');
          if (!modifiers.length) {
            key = lookupKey;
          } else {
            modifiers.push(lookupKey);
            key = modifiers.join('-');
          }
        }

        if (!this.props.onUserPressedKey) {
          this.mathField.keystroke(key, e);
          this.props.onUserChangedLatex(this.mathField.latex());
        } else {
          this.props.onUserPressedKey(key, e);
        }

        this.maybeTriggerOnSelectionChange();
      }
    };

    if (this.props.needsSystemKeypad && this.props.needsSystemKeypad()) {
      config.substituteTextarea = () => {
        const elt = document.createElement('textarea');
        elt.setAttribute('autocorrect', 'off');
        elt.setAttribute('autocapitalize', 'none');
        elt.setAttribute('spellcheck', 'false');
        elt.setAttribute('autocomplete', 'off');
        return elt;
      };
    }
    const tokenController = this.props.tokenController?.();
    if (tokenController) {
      this.mathquillTokenHelper = new MathquillGeoTokenHelper(
        tokenController,
        node,
        false
      );
    }
    this.$mathField = $(node);
    const mathField = MathQuill.MathField(node, config);
    this.mathField = mathField;

    // we need to be able to map from the node to the actual MathField instance. So we store it on the node.
    (node as any)._mqMathFieldInstance = this.mathField;

    // TODO - remove once graphing keypad is converted to dispatcher
    (node as any)._mqViewInstance = this;

    this.mathquillFocus = new MathquillFocus(
      mathField,
      this.$mathField,
      this.props
    );

    this.$mathField.on('paste.view', (evt: JQuery.TriggeredEvent) =>
      this.onPasteEvent(evt)
    );

    if (!Browser.SUPPORTS_INPUTMODE && (Browser.IS_IOS || Browser.IS_ANDROID)) {
      // We define a generic keypress handler so that BT keyboards work in our custom iOS and Android Mathquills.
      this.$mathField.on('keypress.view', (evt: JQuery.TriggeredEvent) =>
        this.onKeypressEvent(evt)
      );
    }

    this.hookupMQTapTouch(mathField);
    this.updateMathquill();
  }

  getCacheableMQConfig() {
    const config: CacheableMQConfig = { ...this.props.config() };
    config.maxDepth = this.props.capExpressionSize()
      ? EXPRESSION_MAX_DEPTH_REDUCED
      : EXPRESSION_MAX_DEPTH_DEFAULT;
    return config;
  }

  didUpdate() {
    this.updateMathquill();
  }

  updateMathquill() {
    this.updateMathquillConfig();
    this.updateMathquillAria();
    this.updateMathquillLatex();
    this.mathquillFocus?.updateMathquillFocused();
    this.updateMathquillPostLabel();
    this.mathquillTokenHelper?.updateTokens(this.props.latex());
  }

  // DOM-level paste event, occurs before Mathquill sees it.
  onPasteEvent(evt: JQuery.TriggeredEvent) {
    let text = '';
    const clipboardData = (window as any).clipboardData;
    const originalEvent = evt.originalEvent as ClipboardEvent;
    if (clipboardData && clipboardData.getData) {
      // IE
      text = clipboardData.getData('Text');
    } else if (
      originalEvent &&
      originalEvent.clipboardData &&
      originalEvent.clipboardData.getData
    ) {
      text = originalEvent.clipboardData.getData('text/plain');
    }

    const canAcceptText = this.viewCanAcceptText(text);
    if (!canAcceptText && this.props.onExpressionSizeExceeded)
      this.props.onExpressionSizeExceeded();

    return canAcceptText;
  }

  // Convenience method for this view
  viewCanAcceptText(text: string) {
    return MathquillView.canAcceptText(
      this.mathField,
      this.props.capExpressionSize(),
      text
    );
  }

  // Called from outside, e.g. for assessing whether text typed via the keypad should be accepted
  public static canAcceptText(
    mq: MQMathField | undefined,
    capExpressionSize: boolean,
    text: string
  ) {
    if (!mq) return false;
    if (!capExpressionSize) return true;
    const latex = mq.latex();
    return (
      countLatexTokens(latex) + countLatexTokens(text) <= EXPRESSION_TOKEN_LIMIT
    );
  }

  onKeypressEvent(evt: JQuery.Event) {
    // Allow keypress events to come through, such as those from external Bluetooth keyboards.
    // Note: only called when on a mobile device.
    evt.stopPropagation();
    evt.preventDefault();

    if (!this.mathField) return;
    const char = evt.key && evt.key.length === 1 ? evt.key : undefined;
    if (!char) return;
    if (!this.viewCanAcceptText(char)) return;
    this.mathField.typedText(char);
    this.props.onUserChangedLatex(this.mathField.latex());
  }

  hookupMQTapTouch(mathField: MQMathField) {
    // since we don't get selection change events from MathQuill, we need to check, on tapend, whether the selection
    // was changed via the mouse
    this.$mathField.on('dcg-tapstart.view', () => {
      const globalTapend = 'dcg-tapend.mathquill-selection-change';
      this.maybeTriggerOnSelectionChange();
      $(document).on(globalTapend, () => {
        this.maybeTriggerOnSelectionChange();
        $(document).off(globalTapend);
      });
    });

    mathField.ignoreNextMousedown(() => {
      return touchtracking.shouldIgnoreMouseDown();
    });

    // immediately pass through dcg-tap events
    this.$mathField.on('dcg-tap.view', (jqEvt) => {
      const evt = jqEvt as TouchtrackingEvent;

      if (evt.device !== 'touch') {
        return;
      }

      // ignore token clicks
      // we have a similar check within the actual mousedown handler in
      // mathquill. The goal will be to centralize that some. This used
      // to return if "evt.wasHandled()" and that is problematic for
      // a fix to android we want to do. We tried fixing the android bug
      // but this line got in the way. I want to let this soak a while
      // to verify that we can make this change. If this goes well
      // we can try to implement that android bug fix again.
      //
      // see: https://github.com/desmosinc/knox/issues/14744
      if (evt.target.closest('.dcg-mq-ignore-mousedown')) return;

      const touch = evt.changedTouches[0];

      mathField.clickAt(
        touch.clientX,
        touch.clientY,
        touch.target as HTMLElement
      );

      if (!this.mathquillFocus?.isFocused()) {
        mathField.focus();
      }
    });
  }

  updateMathquillConfig(configChanges: Partial<DynamicMQConfig> = {}) {
    if (!this.mathField) return;
    const config = { ...this.getCacheableMQConfig(), ...configChanges };
    if (_.isEqual(config, this.cachedConfig)) return;
    this.cachedConfig = config;
    this.mathField.config(config);
  }

  updateMathquillAria() {
    if (!this.mathField) return;
    const label = this.props.getAriaLabel();
    if (label !== this.mathField.getAriaLabel()) {
      this.mathField.setAriaLabel(label);
    }
  }

  updateMathquillPostLabel() {
    if (!this.mathField) return;
    this.mathField.setAriaPostLabel(this.props.getAriaPostLabel(), 1000);
  }

  updateMathquillLatex() {
    const latex = this.props.latex();
    if (!this.mathField) return; // we are requesting the exact same latex as last time // nothing to do here.

    if (this.lastLatexProp === latex) return;

    // If the capExpressionSize flag is set and latex length has exceeded
    // the cap size, don't write it.
    if (
      this.props.capExpressionSize() &&
      countLatexTokens(latex) > EXPRESSION_TOKEN_LIMIT
    )
      return;

    this.lastLatexProp = latex;

    // the requested latex has changed. It's possible we
    // still do not want to set the latex though. It's
    // possible the latex is already set correctly. This happens
    // when the user types. We carry the action out on the mathField
    // then read the value of the mathfield. So let's check if the
    // mathquill is already in the right state. If so, do nothing.
    // Without this check we'd lose the current caret position.
    if (this.mathField.latex() === latex) return;

    this.mathField.latex(latex);
  }

  maybeTriggerOnSelectionChange() {
    const onSelectionChangedCallback = this.props.onSelectionChanged;
    if (!onSelectionChangedCallback) return;
    if (!this.mathField) return;
    const selection = this.mathField.selection();
    if (_.isEqual(selection, this.lastSelection)) return;
    this.lastSelection = selection;

    onSelectionChangedCallback(selection);
  }

  public static getFocusedMathquill(): MQMathField | undefined {
    if (!document.activeElement) return undefined;
    const el = document.activeElement.closest('.dcg-mq-editable-field');
    if (el) {
      return (el as any)._mqMathFieldInstance;
    } else {
      return undefined;
    }
  }

  public static getMQViewInstance(mq: MQMathField): MathquillView | undefined {
    const el = mq.el();
    if (el) {
      return (el as any)._mqViewInstance;
    } else {
      return undefined;
    }
  }

  public static applyArrowKeyAndReturnIfWasAtBounds(
    mq: MQMathField,
    key:
      | 'Up'
      | 'Down'
      | 'Left'
      | 'Right'
      | 'Shift-Up'
      | 'Shift-Down'
      | 'Shift-Left'
      | 'Shift-Right',
    evt?: KeyboardEvent
  ): boolean {
    const selection = mq.selection();

    const entireMathquillSelected =
      selection.startIndex === 0 &&
      selection.endIndex === selection.latex.length;

    // the entire contents is selected. We're at the bounds. Only consider
    // Up and Down keys to be at the bounds if the entire mathquill is selected.
    // Left and Right should move focus to either the left or right side of the
    // mathquill instead of moving focus out of the mathquill.
    if (/(Up|Down)$/.test(key) && entireMathquillSelected) {
      mq.keystroke(key, evt);
      return true;
    }

    mq.keystroke(key, evt);

    const afterSelection = mq.selection();
    const selectionChanged =
      afterSelection.latex !== selection.latex ||
      afterSelection.startIndex !== selection.startIndex ||
      afterSelection.endIndex !== selection.endIndex;
    return !selectionChanged;
  }

  /**
   * Force override leftRightIntoCommandGoes config on a mathquill view before
   * taking an action. Primarily used for accessibility keypad.
   *
   * @returns callback which resets config to previous value.
   */
  public static temporarilyOverrideLeftRightIntoCommandGoes(
    mq: MQMathField,
    newValue: MQConfig['leftRightIntoCmdGoes']
  ): () => void {
    const view = MathquillView.getMQViewInstance(mq);
    if (!view) return () => {};
    const oldLeftRightIntoCommandGoes =
      view.getCacheableMQConfig().leftRightIntoCmdGoes ?? 'up';
    view.updateMathquillConfig({ leftRightIntoCmdGoes: newValue });

    return () =>
      view.updateMathquillConfig({
        leftRightIntoCmdGoes: oldLeftRightIntoCommandGoes
      });
  }

  public static simulateKeypressFromKeypad(mq: MQMathField, key: string) {
    const view = MathquillView.getMQViewInstance(mq);
    if (!view) return;

    // From the keypad specifically, we want left/right to go into commands,
    // so need to temporarily change the mathquill config before emitting keypress.
    // see https://github.com/desmosinc/knox/issues/16700

    // Our controllers don't actually specify this value currently so it's not in cacheableMQConfig for the
    // most part, so we want this to default to `up` rather than `undefined`.
    const oldLeftRightIntoCommandGoes =
      view.getCacheableMQConfig().leftRightIntoCmdGoes ?? 'up';
    if (key === 'Left' || key === 'Right') {
      view.updateMathquillConfig({ leftRightIntoCmdGoes: undefined });
    }
    if (!view.props.onUserPressedKey) {
      mq.keystroke(key);
      const latex = mq.latex();

      view.props.onUserChangedLatex(latex);
    } else {
      view.props.onUserPressedKey(key);
    }
    view.maybeTriggerOnSelectionChange();
    if (key === 'Left' || key === 'Right') {
      view.updateMathquillConfig({
        leftRightIntoCmdGoes: oldLeftRightIntoCommandGoes
      });
    }
  }

  public static simulateUserChangedLatex(mq: MQMathField) {
    const view = MathquillView.getMQViewInstance(mq);
    if (!view) return;

    if (view.mathField) {
      const latex = view.mathField.latex();
      view.props.onUserChangedLatex(latex);
    }
  }

  public static handleKeystrokeAndDecideIfSpecialEvent(
    mq: MQMathField,
    key: string,
    evt?: KeyboardEvent
  ): boolean {
    if (key === 'Enter') {
      return true;
    } else if (key === 'Delete' && mq.latex() === '') {
      return true;
    } else if (key === 'Backspace' && mq.latex() === '') {
      return true;
    } else if (key === 'Up') {
      return MathquillView.applyArrowKeyAndReturnIfWasAtBounds(mq, key, evt);
    } else if (key === 'Down') {
      return MathquillView.applyArrowKeyAndReturnIfWasAtBounds(mq, key, evt);
    } else if (key === 'Left') {
      return MathquillView.applyArrowKeyAndReturnIfWasAtBounds(mq, key, evt);
    } else if (key === 'Right') {
      return MathquillView.applyArrowKeyAndReturnIfWasAtBounds(mq, key, evt);
    } else {
      mq.keystroke(key, evt);
      return false;
    }
  }

  /**
   * Feed the given latex through an offscreen MathQuill instance and then get it back out.
   * This ensures that we have latex that will not get changed the moment you put it into a MathQuill and
   * touch a key.
   */
  public static normalizeLatex(latex: string, config: DynamicMQConfig) {
    const div = document.createElement('div');
    const mq = MathQuill.MathField(div, config);
    mq.latex(latex);
    return mq.latex();
  }
}
