import './draggable-pane-view.scss';

import { clamp } from 'core/math/builtin';
import * as DCGView from 'dcgview';
import conditionalBlur from 'lib/conditional_blur';
import type Controller from 'main/controller';

import { DragDrop } from './dragdrop';

export type DraggablePanePosition = {
  left: number;
  top: number;
};

export class DraggablePaneView extends DCGView.View<{
  controller: () => Controller;
  children: DCGView.Child | DCGView.Children;
  dragTargetContents: () => DCGView.Child | DCGView.Children;
  getCachedPosition: () => DraggablePanePosition | undefined;
  setCachedPosition: (position: DraggablePanePosition) => void;
  manageFocus: DCGView.HTMLProps<HTMLElement>['manageFocus'];
  // Additional properties to set on the aside container -- note that onMount, manageFocus, and tabIndex will all be overwritten if they are set here.
  containerProps: () => DCGView.HTMLProps<HTMLElement>;
}> {
  private dragDrop: DragDrop;
  private cachedPos?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  private previousCursor: string;
  private resizeObserver: ResizeObserver;
  private paneNode: HTMLElement;

  resizeListener = () => {
    this.clampPosition();
  };

  startDrag(evt: TouchEvent) {
    if ((evt as any).device === 'keyboard') return;
    if (!evt.target) return;

    // prevent text selection within Safari
    evt.preventDefault();
    // Blur any focused input. This is a default browser behavior, but
    // is prevented by evt.preventDefault() above.
    conditionalBlur();
    this.previousCursor = document.body.style.cursor;
    document.body.style.setProperty('cursor', 'move', 'important');

    this.dragDrop.startDrag(evt);
  }

  willUnmount() {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.resizeListener);
  }

  // TODO -- why are we holding onto this locally at all instead of only in the controller?
  cachePosition() {
    const rootNodeRect = this.paneNode?.getBoundingClientRect();
    if (!rootNodeRect) return;
    this.cachedPos = {
      left: rootNodeRect.left,
      top: rootNodeRect.top,
      width: rootNodeRect.width,
      height: rootNodeRect.height
    };
  }

  setPosition(left: number, top: number) {
    const rootNode = this.paneNode;
    if (!rootNode) return;
    rootNode.style.bottom = 'unset';
    rootNode.style.right = 'unset';
    rootNode.style.top = `${top}px`;
    rootNode.style.left = `${left}px`;
  }

  clampPosition() {
    const rootNode = this.paneNode;
    const rootNodeRect = rootNode?.getBoundingClientRect();
    if (!rootNodeRect) return;
    const headerBoundingRect = document
      .getElementById('dcg-header-container')
      ?.getBoundingClientRect();
    const headerOffsetTop = !!headerBoundingRect
      ? headerBoundingRect.height
      : 0;
    if (
      !!rootNode.style.top &&
      rootNode.style.top !== 'unset' &&
      rootNodeRect.top > window.innerHeight - rootNodeRect.height - 5
    ) {
      rootNode.style.top = `${Math.max(
        headerOffsetTop + 5,
        window.innerHeight - rootNodeRect.height - 5
      )}px`;
    }
    if (
      !!rootNode.style.left &&
      rootNode.style.left !== 'unset' &&
      rootNodeRect.left > window.innerWidth - rootNodeRect.width - 5
    ) {
      rootNode.style.left = `${Math.max(
        5,
        window.innerWidth - rootNodeRect.width - 5
      )}px`;
    }
  }

  updatePosition(dx: number, dy: number) {
    if (!this.cachedPos) this.cachePosition();
    if (!this.cachedPos) return;
    const headerBoundingRect = document
      .getElementById('dcg-header-container')
      ?.getBoundingClientRect();
    const headerOffsetTop = !!headerBoundingRect
      ? headerBoundingRect.height
      : 0;
    this.setPosition(
      clamp(
        this.cachedPos.left + dx,
        5,
        window.innerWidth - this.cachedPos.width - 5
      ),
      clamp(
        this.cachedPos.top + dy,
        headerOffsetTop + 5,
        window.innerHeight - this.cachedPos.height - 5
      )
    );
  }

  onMountPane(node: HTMLElement) {
    this.paneNode = node;
    this.dragDrop = new DragDrop();

    const previousPos = this.props.getCachedPosition();
    if (!!previousPos) {
      this.setPosition(previousPos.left, previousPos.top);
      this.cachePosition();
    }

    this.dragDrop.observeEvent('onDrop', () => {
      document.body.style.cursor = this.previousCursor;
      if (!!this.cachedPos) {
        this.props.setCachedPosition(this.cachedPos);
      }

      this.update();
    });

    this.dragDrop.observeEvent('onGrab', () => {
      this.cachePosition();
    });

    this.dragDrop.observeEvent('onDrag', (_evt, data) => {
      this.updatePosition(data.dx, data.dy);
    });

    window.addEventListener('resize', this.resizeListener);

    this.resizeObserver = new ResizeObserver(() => this.resizeListener());
    this.resizeObserver.observe(node);
  }

  getPaneTabIndex() {
    if (!!this.props.manageFocus?.()?.shouldBeFocused()) {
      return 0;
    }
    return undefined;
  }

  didUpdate() {
    // n.b. this mirrors logic in dcgview-shim.ts, which normally runs *before* the update. here we need it
    // to run after the update since that's when the tabindex will have been set to zero.
    const isFocused = document.activeElement === this.paneNode;
    const shouldBeFocused = !!this.props.manageFocus?.()?.shouldBeFocused();
    if (shouldBeFocused && !isFocused) {
      this.paneNode.focus();
    } else if (isFocused && !shouldBeFocused) {
      this.paneNode.blur();
    }
  }

  template() {
    return (
      <aside
        {...this.props.containerProps()}
        onMount={this.bindFn(this.onMountPane)}
        manageFocus={this.props.manageFocus}
        tabIndex={this.bindFn(this.getPaneTabIndex)}
      >
        <div
          onTapStart={this.bindFn(this.startDrag)}
          class="dcg-draggable-pane--target"
        >
          {this.props.dragTargetContents()}
        </div>
        {this.props.children}
      </aside>
    );
  }
}
