import './slider.scss';

import * as DCGView from 'dcgview';
import $ from 'jquery';
import conditionalBlur from 'lib/conditional_blur';
import * as Keys from 'lib/keys';
/* TODO - split out the css rules from slider.scss */
import * as Rounding from 'lib/rounding';

import { clamp } from '../core/math/builtin';
import { type SliderKeyboardAdjustment } from '../graphing-calc/models/expression';
import { DragDrop } from './dragdrop';

const { If } = DCGView.Components;

type Props = {
  step: () => number | undefined;
  min: () => number;
  max: () => number;
  value: () => number;
  ariaLabel: () => string;
  ariaPercent?: () => boolean; // communicate values as percentages through ARIA?
  onGrab?: () => void;
  onDrop?: () => void;
  onDragUpdate: (num: number) => void;
  onKeyboardUpdate: (type: SliderKeyboardAdjustment) => void;
  onUpPress?: () => void;
  onDownPress?: () => void;
  onEnterPress?: () => void;
  isFocused?: () => boolean;
  onFocusedChanged?: (focused: boolean) => void;
};
export default class SliderView extends DCGView.View<Props> {
  private rootNode: HTMLElement;
  private tickMarksNode: HTMLElement;

  private dragDrop: DragDrop;
  private isMounted: boolean;
  private isDragging: boolean;
  private lastTickMarksPercent: number;

  template() {
    return (
      <div
        class={() => ({
          'dcg-slider-interior': true,
          'dcg-disable-slider': this.shouldDisableSlider()
        })}
        didMount={this.bindFn(this.didMountRoot)}
        onTapStart={this.bindFn(this.onStartDrag)}
      >
        <div class="dcg-track">
          <div
            class="dcg-ticks"
            onMount={this.bindFn(this.didMountTickMarks)}
          />
          <div class="dcg-graphic" />
        </div>
        <If predicate={this.bindFn(this.shouldShowZeroMarker)}>
          {() => (
            <div
              class="dcg-zeroMarker"
              style={() => ({
                left: this.getZeroMarkerPercent() + '%'
              })}
            />
          )}
        </If>
        <div
          class={() => ({
            'dcg-thumb': true,
            'dcg-down': this.isDragging
          })}
          role="slider"
          tabIndex="0"
          disablescroll="true"
          style={() => ({
            left: this.getThumbPercent() + '%'
          })}
          onKeyDown={this.bindFn(this.onKeyDown)}
          aria-label={this.props.ariaLabel}
          aria-valuemin={() =>
            this.props.ariaPercent?.() ? 0 : this.props.min()
          }
          aria-valuemax={() =>
            this.props.ariaPercent?.() ? 100 : this.props.max()
          }
          aria-valuenow={() =>
            this.props.ariaPercent?.() ? undefined : this.props.value()
          }
          aria-valuetext={() =>
            this.props.ariaPercent?.()
              ? `${Math.floor(this.getThumbPercent())}%`
              : undefined
          }
          manageFocus={this.buildFocusManager()}
        >
          <div class="dcg-graphic" />
          <div class="dcg-center" />
        </div>
      </div>
    );
  }

  willUnmount() {
    this.dragDrop.destroy();
  }

  didMountRoot(node: HTMLElement) {
    this.rootNode = node;
    this.dragDrop = new DragDrop();

    this.isMounted = true;

    this.dragDrop.observeEvent('onDrop', () => {
      this.isDragging = false;
      this.update();
      if (this.props.onDrop) this.props.onDrop();
    });

    this.dragDrop.observeEvent('onGrab', () => {
      this.isDragging = true;
      this.update();
      if (this.props.onGrab) this.props.onGrab();
    });

    this.dragDrop.observeEvent('onDrag', (_evt, data) => {
      this.props.onDragUpdate(this.valueFromPixels(data.x));
    });
  }

  didMountTickMarks(node: HTMLElement) {
    this.tickMarksNode = node;
    this.renderTickMarks();
  }

  didUpdate() {
    this.renderTickMarks();
  }

  shouldDisableSlider() {
    return this.props.min() === this.props.max();
  }

  renderTickMarks() {
    if (!this.tickMarksNode) return;

    const step = this.props.step();
    const min = this.props.min();
    const max = this.props.max();
    let percent;

    if (step === undefined) {
      percent = 0;
    } else {
      percent = (100 * step) / (max - min);
    }

    if (percent < 3) percent = 0; // don't draw too many ticks
    if (percent > 100) percent = 0;
    if (isNaN(percent)) percent = 0;

    if (this.lastTickMarksPercent === percent) return;
    this.lastTickMarksPercent = percent;

    let html = '';
    if (percent > 0 && percent < 100) {
      for (let i = percent; i < 100; i += percent) {
        html += '<div class="dcg-tick" style="left:' + i + '%"></div>';
      }
    }

    this.tickMarksNode.innerHTML = html;
  }

  shouldShowZeroMarker() {
    return this.props.min() <= 0 && this.props.max() >= 0;
  }

  getZeroMarkerPercent() {
    const min = this.props.min();
    const max = this.props.max();

    return (100 * (0 - min)) / (max - min);
  }

  getThumbPercent() {
    return 100 * this.percentFromValue(this.props.value());
  }

  valueFromPixels(pixels: number) {
    if (!this.isMounted) return 0;

    const min = this.props.min();
    const max = this.props.max();
    const width = this.rootNode.getBoundingClientRect().width;
    const fraction = clamp(pixels / width, 0, 1);
    const val = min + (max - min) * fraction;
    const pixel_units = (max - min) / width;

    return Rounding.shortestDecimalBetween(
      val - pixel_units,
      val + pixel_units
    );
  }

  percentFromValue(value: number) {
    const min = this.props.min();
    const max = this.props.max();
    return clamp((value - min) / (max - min), 0, 1);
  }

  pixelsFromValue(value: number) {
    if (!this.isMounted) return 0;
    const fraction = this.percentFromValue(value);
    return this.rootNode.getBoundingClientRect().width * fraction;
  }

  onKeyDown(evt: KeyboardEvent) {
    switch (Keys.lookup(evt)) {
      case Keys.UP:
        if (this.props.onUpPress) {
          this.props.onUpPress();
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case Keys.DOWN:
        if (this.props.onDownPress) {
          this.props.onDownPress();
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case Keys.ENTER:
        if (this.props.onEnterPress) {
          this.props.onEnterPress();
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
      case Keys.ESCAPE:
        // TODO - conditionalBlur() is not bluring the div
        // because the div is not considered a focusable
        // element. What is conditionalBlur() for again?
        if (document.activeElement) $(document.activeElement).trigger('blur');
        break;
      case Keys.LEFT:
        this.props.onKeyboardUpdate('down');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case Keys.RIGHT:
        this.props.onKeyboardUpdate('up');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case Keys.PAGEDOWN:
        this.props.onKeyboardUpdate('bigdown');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case Keys.PAGEUP:
        this.props.onKeyboardUpdate('bigup');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case Keys.HOME:
        this.props.onKeyboardUpdate('min');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      case Keys.END:
        this.props.onKeyboardUpdate('max');
        evt.preventDefault();
        evt.stopPropagation();
        break;
    }
  }

  onStartDrag(evt: TouchEvent) {
    if ((evt as any).device === 'keyboard') return;
    if (!evt.target) return;

    // prevent text selection within Safari
    evt.preventDefault();
    // Blur any focused input. This is a default browser behavior, but
    // is prevented by evt.preventDefault() above.
    conditionalBlur();

    const origin = {
      x: 0,
      y: 0
    };

    if ((evt.target as Element).closest('.dcg-thumb')) {
      // moused down on thumb:
      // keeps offset between thumb and mouse
      origin.x = this.pixelsFromValue(this.props.value());
    } else {
      // moused down on track:
      // keeps thumb completely centered on the mouse
      origin.x =
        evt.changedTouches[0].clientX -
        this.rootNode.getBoundingClientRect().left;
    }

    this.dragDrop.startDrag(evt, { origin: origin });
  }

  buildFocusManager() {
    if (!this.props.onFocusedChanged || !this.props.isFocused) {
      return this.const(undefined);
    } else {
      return this.const({
        shouldBeFocused: this.props.isFocused,
        onFocusedChanged: this.props.onFocusedChanged
      });
    }
  }
}
