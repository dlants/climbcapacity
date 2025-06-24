import TriggeredEvent = JQuery.TriggeredEvent;
import * as Keys from 'lib/keys';
import { getFocusableChildren, tabbable, tabNext, tabPrev } from 'lib/tabbable';

export type ItemNavigationKey = 'arrow' | 'tab';
type DropdownPopoverFocusHelperOptions = {
  isOpen: () => boolean;
  closeMenu: () => void;
  anchorSelector?: string;
  focusTrappingBodySelector: string;
  /**
   * When set to 'arrow', use arrow keys to navigate between items, and tab to close the open popover
   * When set to 'tab', use tab to navigate between items. User has to explicitly close the popover
   * to tab to the rest of the page
   */
  itemNavigationKey: ItemNavigationKey;
};

/** Helper for trapping focus within a dropdown */
export class FocusTrappingHelper {
  private readonly isOpen: () => boolean;
  private readonly closeMenu: () => void;
  private readonly anchorSelector?: string;
  private readonly focusTrappingBodySelector: string;
  private readonly itemNavigationKey: ItemNavigationKey;

  constructor({
    isOpen,
    closeMenu,
    anchorSelector,
    focusTrappingBodySelector,
    itemNavigationKey
  }: DropdownPopoverFocusHelperOptions) {
    this.isOpen = isOpen;
    this.closeMenu = closeMenu;
    this.anchorSelector = anchorSelector;
    this.focusTrappingBodySelector = focusTrappingBodySelector;
    this.itemNavigationKey = itemNavigationKey;
  }

  private getPopoverView() {
    return document.querySelector(this.focusTrappingBodySelector) ?? undefined;
  }

  private getFocusableItems(): HTMLElement[] {
    const popoverView = this.getPopoverView();
    if (!popoverView) return [];
    return getFocusableChildren(popoverView, tabbable);
  }

  public focusAnchor() {
    if (!this.anchorSelector) return;
    (
      document.querySelector(this.anchorSelector) as HTMLElement | null
    )?.focus();
  }

  private focusItemAtIdx(idx: number) {
    const items = this.getFocusableItems();
    if (items.length && items.length > idx) {
      items[idx].focus();
      return true;
    }
    return false;
  }

  public focusFirstItem() {
    this.focusItemAtIdx(0);
  }

  public focusLastItem() {
    this.focusItemAtIdx(this.getFocusableItems().length - 1);
  }

  public getFocusedElement(): HTMLElement | undefined {
    return this.getFocusableItems().find((e) => e.matches(':focus'));
  }

  private isAnchorFocused() {
    if (!this.anchorSelector) return false;
    return (
      document.querySelector(this.anchorSelector) as HTMLElement | null
    )?.matches(':focus');
  }

  private isFirstItemFocused() {
    const items = this.getFocusableItems();
    return items.length > 0 && items[0]?.matches(':focus');
  }

  private isLastItemFocused() {
    const items = this.getFocusableItems();
    return items.length > 0 && items[items.length - 1]?.matches(':focus');
  }

  private onKeydownWithArrowTrapping(evt: KeyboardEvent) {
    if (!this.isOpen()) {
      return;
    }
    switch (Keys.lookup(evt)) {
      case Keys.UP:
        if (tabPrev(this.getPopoverView())) {
          // arrowing in the dropdown causes it to scroll. Don't do that
          evt.preventDefault();
        }
        break;

      case Keys.DOWN:
        if (tabNext(this.getPopoverView())) {
          // arrowing in the dropdown causes it to scroll. Don't do that
          evt.preventDefault();
        }
        break;

      case Keys.END:
        evt.preventDefault();
        this.focusLastItem();
        break;
      case Keys.TAB:
        evt.preventDefault();
        this.closeMenu();
        break;
      case Keys.ESCAPE:
        evt.preventDefault();
        evt.stopPropagation();
        this.closeMenu();
        this.focusAnchor();
        break;
    }
  }

  private onKeydownWithTabTrapping(evt: KeyboardEvent) {
    if (!this.isOpen()) {
      return;
    }

    const lookupKey = Keys.lookup(evt);

    if (lookupKey === Keys.ESCAPE) {
      evt.preventDefault();
      evt.stopPropagation();
      this.focusAnchor();
      this.closeMenu();
      return;
    }

    const isTab =
      lookupKey === 'Tab' && !evt.altKey && !evt.ctrlKey && !evt.metaKey;

    if (!isTab) return;
    if (this.isAnchorFocused()) {
      if (evt.shiftKey) {
        this.focusLastItem();
      } else {
        this.focusFirstItem();
      }
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (this.isLastItemFocused() && !evt.shiftKey) {
      if (this.anchorSelector) this.focusAnchor();
      else this.focusFirstItem();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (this.isFirstItemFocused() && evt.shiftKey) {
      if (this.anchorSelector) this.focusAnchor();
      else this.focusLastItem();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
  }

  public handleKeydown = (evt: KeyboardEvent) => {
    switch (this.itemNavigationKey) {
      case 'arrow':
        return this.onKeydownWithArrowTrapping(evt);
      case 'tab':
        return this.onKeydownWithTabTrapping(evt);
    }
  };

  public handleTap = (
    evt: TriggeredEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ) => {
    const popoverContentView = document.querySelector(
      this.focusTrappingBodySelector
    );
    if (!popoverContentView) return;
    const { target } = evt;

    // close this unless:
    // we click on the icon (will handle that separately)
    const activeIconSelector = this.anchorSelector;
    if (activeIconSelector && target.closest(activeIconSelector)) return;
    // we click within this view
    if (popoverContentView.contains(target)) {
      return;
    }
    // we click within the onscreen keypad
    const isWithinKeypad = Array.from(
      document.querySelectorAll('.dcg-keypad,.dcg-show-keypad-container')
    ).some((el) => el.contains(target));
    if (isWithinKeypad) return;

    this.closeMenu();
  };
}
