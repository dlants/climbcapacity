import './dropdown-popover.scss';
import './dropdown-popover-arrow.scss';

import * as DCGView from 'dcgview';
import $ from 'jquery';
import * as _ from 'underscore';

import {
  FocusTrappingHelper,
  type ItemNavigationKey
} from './dropdown-focus-helper';

const { IfDefined, If } = DCGView.Components;

/**
 * left: left of the anchor, with arrow near the top of the popover
 * right: right of the anchor, with arrow near the top of the popover
 *
 * bottom-left: popover is on the bottom left of the anchor, arrow points to the bottom edge of the anchor
 * bottom-right: popover is on the bottom right of the anchor, arrow points to the bottom edge of the anchor
 * top-left: popover is on the top left of the anchor, arrow points to the top edge of the anchor
 * top-right: popover is on the top right of the anchor, arrow points to the top edge of the anchor
 */
export type PopoverPosition =
  | 'left'
  | 'right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right';

type PositionStyle = Partial<
  Pick<CSSStyleDeclaration, 'top' | 'left' | 'right' | 'bottom'>
>;

type DropdownPopoverInheritableProps = {
  position: () => PopoverPosition;
  hideArrow?: () => boolean;
  className?: () => string;
  title?: () => string;
  didMount?: (el: HTMLElement) => void;
  constrainHeight?: () => boolean;
};

type DropdownPopoverProps = DropdownPopoverInheritableProps & {
  style?: () => PositionStyle | undefined;
  arrowStyle?: () => PositionStyle | undefined;
  focusHelper?: () => FocusTrappingHelper | undefined;
  popoverBody: () => DCGView.Child;
  focusAnchorOnTap?: () => boolean;
  rootNode?: () => HTMLElement | undefined;
};

export const DEFAULT_DROPDOWN_OFFSET = -7;
const DEFAULT_ARROW_OFFSET = 9;

/**
 * A vertical menu, intended to render when an anchor (not in this class) is clicked
 */
export class DropdownPopover extends DCGView.View<DropdownPopoverProps> {
  getRootNode() {
    return this.props.rootNode?.() ?? document;
  }

  didMountPopover(el: HTMLElement) {
    this.props.didMount?.(el);

    const focusHelper = this.props.focusHelper?.();
    if (focusHelper) {
      this.getRootNode().addEventListener(
        'keydown',
        focusHelper.handleKeydown as EventListener
      );
      if (!this.props.focusAnchorOnTap?.()) {
        focusHelper?.focusFirstItem();
      }
    }
  }

  didUnmountPopover() {
    const focusHelper = this.props.focusHelper?.();
    if (focusHelper) {
      this.getRootNode().removeEventListener(
        'keydown',
        focusHelper.handleKeydown as EventListener
      );
    }
  }

  private getPositionClasses(): Record<string, boolean> {
    const position = this.props.position();

    return {
      'dcg-left': position === 'left',
      'dcg-right': position === 'right',
      'dcg-bottom': position === 'bottom-left' || position === 'bottom-right',
      'dcg-top': position === 'top-left' || position === 'top-right'
    };
  }

  template() {
    return (
      <div
        class={() => ({
          'dcg-dropdown-popover': true,
          'dcg-dropdown-popover--with-arrow': !this.props.hideArrow?.(),
          'dcg-dropdown-popover--constrain-height':
            this.props.constrainHeight?.(),
          ...this.getPositionClasses(),
          [this.props.className?.() || '']: !!this.props.className
        })}
        role="region"
        style={() => ({
          ...(this.props.style?.() || {})
        })}
        didMount={this.bindFn(this.didMountPopover)}
        didUnmount={this.bindFn(this.didUnmountPopover)}
      >
        <div class="dcg-dropdown-popover__interior">
          {IfDefined(
            () => this.props.title?.(),
            (title) => (
              <h2 class="dcg-unstyled-heading dcg-dropdown-popover__title">
                {() => title()}
              </h2>
            )
          )}
          {this.props.popoverBody()}
        </div>
        <If predicate={() => !this.props.hideArrow?.()}>
          {() => (
            <div
              class="dcg-arrow"
              style={() => this.props.arrowStyle?.() || {}}
            />
          )}
        </If>
      </div>
    );
  }
}

export type DropdownPopoverWithAnchorControlled = {
  /** In controlled mode, the parent component keeps track of whether the component is open. */
  isOpen: boolean;
  /** In controlled mode, setDropdownOpen will fire when the component requests changing its open state. */
  setDropdownOpen: (isOpen: boolean) => void;
};

/** Renders a specified anchor that, when clicked, opens a popover. Handles expected focus logic and positioning */
export class DropdownPopoverWithAnchor extends DCGView.View<{
  guid: () => string;
  anchor: () => DCGView.Child;
  disabled?: () => boolean;
  containerClassName?: () => string;
  containerClassMap?: () => Record<string, boolean>;
  additionalContainerAttributes?: Partial<
    Omit<DCGView.HTMLProps<HTMLElement>, 'class'>
  >;
  anchorAriaLabel?: () => string;
  /** If controlled is provided, puts component in controlled mode, where parent controls whether dropdown is open. */
  controlled?: () => DropdownPopoverWithAnchorControlled;
  dropdownProps: () => DropdownPopoverInheritableProps;
  /**
   * When the dropdown needs to be shifted, set it here so that when repositioned via `positionDynamically`
   * the arrow points to the same spot on the anchor
   */
  dropdownOffset?: () => number;
  /**
   * Keep dropdown within the bounds of this element. When not specified, uses the window.
   * In most contexts, should be set to the API container when this view is being used within the API
   */
  boundingParentElement?: () => HTMLElement | undefined;
  /** Leave unset to preserve default keyboard navigation */
  focusTrapping?: () => { itemNavigationKey: ItemNavigationKey };
  /** to hook up, for example, the main calculator's focus manager. This sets manage focus for the anchor. */
  manageFocus?: DCGView.HTMLProps<HTMLElement>['manageFocus'];
  /** if true, will stop the tap event propagation to parent element of DropdownPopoverWithAnchor */
  stopPropagationOnTap?: () => boolean;
  popoverBody: () => DCGView.Child;
  focusAnchorOnTap?: () => boolean;
  /** Override default tabindex of 0 **/
  tabIndex?: () => number;
}> {
  private showDropdown: boolean = false;
  private guid: string = this.props.guid();
  private focusHelper: FocusTrappingHelper | undefined;

  private rootNode: HTMLElement | undefined;
  private dropdownNode: HTMLElement | undefined;

  private dropdownStyle: Partial<CSSStyleDeclaration> = {};
  private arrowStyle: Partial<CSSStyleDeclaration> | undefined = undefined;
  private debouncedPositionDynamically = _.debounce(
    this.bindFn(this.positionDynamically),
    200
  );
  private resizeObserver: ResizeObserver | undefined;

  init() {
    const focusTrapping = this.props.focusTrapping?.();
    if (focusTrapping) {
      this.focusHelper = new FocusTrappingHelper({
        anchorSelector: `.dcg-popover-with-anchor__anchor--${this.guid}`,
        focusTrappingBodySelector: `.dcg-popover-with-anchor__popover--${this.guid}`,
        isOpen: () => this.isDropdownOpen(),
        closeMenu: () => this.setDropdownOpen(false),
        itemNavigationKey: focusTrapping.itemNavigationKey
      });
    }
  }

  private isDropdownOpen() {
    if (this.props.controlled) {
      return this.props.controlled().isOpen;
    }

    return this.showDropdown;
  }

  private setDropdownOpen(isOpen: boolean) {
    if (this.props.disabled?.()) {
      return;
    }

    if (this.props.controlled) {
      this.props.controlled().setDropdownOpen(isOpen);
    } else {
      this.showDropdown = isOpen;
      this.update();
    }

    if (isOpen) {
      this.resetPosition();
      this.positionDynamically();
    }
  }

  didMountWrapper(node: HTMLElement) {
    this.rootNode = node;
    window.addEventListener('resize', this.debouncedPositionDynamically);
    const parentEl = this.props.boundingParentElement?.();
    if (parentEl) {
      this.resizeObserver = new ResizeObserver(
        this.debouncedPositionDynamically
      );
      this.resizeObserver.observe(parentEl);
    }

    $(document.body).on(`dcg-tapstart.${this.guid}`, (event) => {
      if (event.target === node || $.contains(node, event.target)) {
        return; // clicked part of the anchor
      }
      if (this.isDropdownOpen()) {
        const dropdownContainer = node.querySelector(
          '.dcg-popover-with-anchor__popover'
        )!;
        if ($.contains(dropdownContainer, event.target)) {
          return; // clicked part of the open options dropdown
        }

        const rect = dropdownContainer.getBoundingClientRect();
        if (
          event.clientX !== undefined &&
          event.clientY !== undefined &&
          event.clientX > rect.left &&
          event.clientX < rect.right &&
          event.clientY > rect.top &&
          event.clientY < rect.bottom
        ) {
          return;
        }
        this.setDropdownOpen(false);
        return;
      }
    });
  }

  didUnmountWrapper() {
    this.showDropdown = false;
    $(document.body).off(`.${this.guid}`);
    $(document).off(`.${this.guid}`);
    window.removeEventListener('resize', this.debouncedPositionDynamically);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  didMountDropdown(el: HTMLElement) {
    this.dropdownNode = el;

    const arrowElement = this.rootNode?.querySelector(
      '.dcg-arrow'
    ) as HTMLElement | null;
    if (arrowElement) {
      this.arrowStyle = {};
    }
    this.resetPosition();
    this.positionDynamically();

    this.props.dropdownProps().didMount?.(el);
  }

  private getDropdownOffset() {
    return this.props.dropdownOffset !== undefined
      ? this.props.dropdownOffset()
      : DEFAULT_DROPDOWN_OFFSET;
  }

  private resetPosition() {
    const position = this.props.dropdownProps().position();

    this.dropdownStyle = {};
    const arrowElement = this.rootNode?.querySelector(
      '.dcg-arrow'
    ) as HTMLElement | null;
    if (arrowElement) {
      this.arrowStyle = {};
    } else {
      this.arrowStyle = undefined;
    }

    const dropdownOffset = this.getDropdownOffset();
    switch (position) {
      case 'left':
      case 'right':
        this.dropdownStyle.top = `${dropdownOffset}px`;
        if (this.arrowStyle) {
          this.arrowStyle.top = `${DEFAULT_ARROW_OFFSET}px`;
        }
        break;
      case 'top-right':
      case 'bottom-right':
        this.dropdownStyle.left = `${dropdownOffset}px`;
        if (this.arrowStyle) {
          this.arrowStyle.left = `${DEFAULT_ARROW_OFFSET}px`;
        }
        break;
      case 'top-left':
      case 'bottom-left':
        this.dropdownStyle.right = `${dropdownOffset}px`;
        if (this.arrowStyle) {
          this.arrowStyle.right = `${DEFAULT_ARROW_OFFSET}px`;
        }
        break;
    }
    this.update();
  }

  /**
   * Attempts to reposition the position of the dropdown container based on if its content is overflowing the window.
   *
   * For left/right-positioned popovers, if overflowing the bottom of the screen, move the container up
   * For top-left/bottom-left positioned popovers, if overflowing the left edge of the screen, move the container to the right
   * For top-right/bottom-right positioned popovers, if overflowing the right edge of the screen, move the container to the left
   */
  private positionDynamically() {
    const dropdownElement = this.dropdownNode;
    const anchorElement = this.rootNode;

    if (!anchorElement || !dropdownElement) {
      return;
    }

    if (!this.isDropdownOpen()) {
      return;
    }

    const dropdownContainerRect = dropdownElement.getBoundingClientRect();

    const parentRect = this.props
      .boundingParentElement?.()
      ?.getBoundingClientRect();
    const parentRight = parentRect
      ? parentRect.x + parentRect.width
      : window.innerWidth;
    const parentBottom = parentRect
      ? parentRect.y + parentRect.height
      : window.innerHeight;
    const parentLeft = parentRect?.left ?? 0;

    const overflowsBottom = dropdownContainerRect.bottom > parentBottom;
    const overflowsRight = dropdownContainerRect.right > parentRight;
    const overflowsLeft = dropdownContainerRect.left < parentLeft;

    const position = this.props.dropdownProps().position();
    const anchorRect = anchorElement.getBoundingClientRect();
    const parentPadding = 15;
    const arrowOffset = DEFAULT_ARROW_OFFSET + this.getDropdownOffset();

    // Note that offset calculations are not dependent on dropdownContainer positioning itself, because that is not
    // compatible with calling this when resizing (especially debounced)

    if ((position === 'left' || position === 'right') && overflowsBottom) {
      const anchorTopToParentBottom =
        parentBottom - anchorRect.y - parentPadding;
      const offset = dropdownContainerRect.height - anchorTopToParentBottom;

      this.dropdownStyle.top = `${-1 * offset}px`;
      if (this.arrowStyle) {
        this.arrowStyle.top = `${offset + arrowOffset}px`;
      }
    } else if (
      (position === 'bottom-right' || position === 'top-right') &&
      overflowsRight
    ) {
      const anchorLeftToParentRight =
        parentRight - anchorRect.x - parentPadding;
      const offset = dropdownContainerRect.width - anchorLeftToParentRight;

      this.dropdownStyle.left = `${-1 * offset}px`;
      if (this.arrowStyle) {
        this.arrowStyle.left = `${offset + arrowOffset}px`;
      }
    } else if (
      (position === 'bottom-left' || position === 'top-left') &&
      overflowsLeft
    ) {
      const anchorRightToParentLeft =
        anchorRect.x + anchorRect.width - parentPadding - parentLeft;
      const offset = dropdownContainerRect.width - anchorRightToParentLeft;

      this.dropdownStyle.right = `${-1 * offset}px`;
      if (this.arrowStyle) {
        this.arrowStyle.right = `${offset + arrowOffset}px`;
      }
    }
    this.update();
  }

  private getDropdownClassNames() {
    const customClassName = this.props.dropdownProps().className?.() || '';
    return `dcg-popover-with-anchor__popover dcg-popover-with-anchor__popover--${this.guid} ${customClassName}`;
  }

  getContainerClasses() {
    return {
      'dcg-popover-with-anchor': true,
      [this.props.containerClassName?.() || '']:
        !!this.props.containerClassName,
      ...(this.props.containerClassMap?.() ?? {})
    };
  }

  template() {
    return (
      <div
        class={this.bindFn(this.getContainerClasses)}
        didMount={this.bindFn(this.didMountWrapper)}
        didUnmount={this.bindFn(this.didUnmountWrapper)}
        onTap={(evt) => {
          if (this.props.stopPropagationOnTap?.()) {
            evt.stopPropagation();
          }
        }}
        {...this.props.additionalContainerAttributes?.()}
      >
        <div
          role="link"
          tabIndex={() => this.props.tabIndex?.() ?? 0}
          aria-label={() => this.props.anchorAriaLabel?.()}
          aria-expanded={this.bindFn(this.isDropdownOpen)}
          aria-haspopup="true"
          class={() => ({
            'dcg-popover-with-anchor__anchor': true,
            [`dcg-popover-with-anchor__anchor--${this.guid}`]: true,
            'dcg-popover-with-anchor__open': this.isDropdownOpen()
          })}
          onTap={() => {
            this.setDropdownOpen(!this.isDropdownOpen());
            if (this.props.focusAnchorOnTap?.()) {
              this.focusHelper?.focusAnchor();
            }
          }}
          manageFocus={() => this.props.manageFocus?.()}
        >
          {this.props.anchor()}
        </div>
        <If predicate={() => this.isDropdownOpen()}>
          {() => (
            <DropdownPopover
              {...this.props.dropdownProps()}
              className={this.bindFn(this.getDropdownClassNames)}
              focusHelper={() => this.focusHelper}
              didMount={(el) => this.didMountDropdown(el)}
              arrowStyle={() => this.arrowStyle}
              style={() => this.dropdownStyle}
              popoverBody={this.props.popoverBody}
              focusAnchorOnTap={this.props.focusAnchorOnTap}
              rootNode={() => this.rootNode}
            />
          )}
        </If>
      </div>
    );
  }
}
