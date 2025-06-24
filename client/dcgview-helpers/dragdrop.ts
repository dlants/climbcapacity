import { uniqueId } from '@knox/common';
import $ from 'jquery';

import { EventBus } from '../lib/event-bus';

type Point = { x: number; y: number };

type EventData = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  evt: TouchEvent;
};
type ObservableEvents = {
  onDrag: EventData;
  onGrab: EventData;
  onDrop: EventData;
};

export class DragDrop {
  private _destroyed: boolean;
  private _offsetPt: Point;
  private _startPt: Point;
  private frameThrottle: number;
  private _eventBus = new EventBus<ObservableEvents>();
  public dragging: boolean = false;
  public guid = uniqueId('dragdrop-class');

  _evt2pt(evt: TouchEvent) {
    return {
      x: evt.changedTouches[0].pageX - this._offsetPt.x,
      y: evt.changedTouches[0].pageY - this._offsetPt.y
    };
  }

  _dispatch(name: 'onDrop' | 'onGrab' | 'onDrag', evt: TouchEvent) {
    if (this._destroyed) return;

    const thisPt = this._evt2pt(evt);
    this._eventBus.triggerEvent(name, {
      x: thisPt.x,
      y: thisPt.y,
      dx: thisPt.x - this._startPt.x,
      dy: thisPt.y - this._startPt.y,
      evt
    });
  }

  destroy() {
    $(document).off(`.${this.guid}`);
    this._destroyed = true;
  }

  startDrag(evt: TouchEvent, options: { origin?: Point } = {}) {
    if (this.dragging) return;

    $(document).on(`dcg-tapmove.${this.guid}`, (evt) => {
      (evt.originalEvent || evt).preventDefault();
      cancelAnimationFrame(this.frameThrottle);
      this.frameThrottle = requestAnimationFrame(() => this.doDrag(evt as any));
    });

    $(document).on(
      `dcg-tapend.${this.guid} dcg-tapcancel.${this.guid}`,
      (evt) => this.endDrag(evt as any)
    );

    this._offsetPt = {
      x: 0,
      y: 0
    };
    if (options.origin) {
      this._offsetPt = {
        x: this._evt2pt(evt).x - options.origin.x,
        y: this._evt2pt(evt).y - options.origin.y
      };
    }

    this._startPt = this._evt2pt(evt);
    this.dragging = true;
    return this._dispatch('onGrab', evt);
  }

  doDrag(evt: TouchEvent) {
    if (!this.dragging) return;

    this._dispatch('onDrag', evt);
  }

  endDrag(evt: TouchEvent) {
    if (!this.dragging) return;

    $(document).off(`.${this.guid}`);

    // do the very last drag
    this.doDrag(evt);
    this.dragging = false;
    this._dispatch('onDrop', evt);
  }

  observeEvent(
    eventString: string,
    callback: <k extends keyof ObservableEvents>(
      property: k,
      value: ObservableEvents[k]
    ) => void
  ) {
    return this._eventBus.observeEvent(eventString, callback);
  }
}
