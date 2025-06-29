import type {
  Spec,
  ValidChildren,
  ValidProp,
  ValidProps
} from '../create-spec';
import type {
  CamelCaseObjectToKebabCaseObject,
  MaybeStringLike,
  UnionToIntersection,
  WritableKeys
} from '../utilities';

export type HTMLElementName = keyof HTMLElementTagNameMap;

/**
 * A void element is an element in HTML that cannot have any child nodes (i.e., nested elements or text nodes). Void
 * elements only have a start tag; end tags must not be specified for void elements.
 *
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Void_element
 */
type VoidHTMLElement =
  | HTMLAreaElement
  | HTMLBRElement
  | HTMLTableColElement
  | HTMLEmbedElement
  | HTMLHRElement
  | HTMLImageElement
  | HTMLInputElement
  | HTMLLinkElement
  | HTMLMetaElement
  | HTMLParamElement
  | HTMLSourceElement
  | HTMLTrackElement;

/**
 * A union of types that are not considered valid HTML element attributes. This includes types like functions and event
 * handlers, the former of which are often attributes like `setAttribute` and the latter of which are defined manually
 * to allow for camelCasing.
 */
type ExcludedHTMLElementAttributeValues =
  | ((...args: any[]) => any)
  | GlobalEventHandlers[keyof GlobalEventHandlers];

/**
 * A map of HTML element attributes, except event handlers and functions.
 *
 * When no generic argument is provided, includes every attribute for every HTML element.
 */
type HTMLElementAttributes<Element extends HTMLElement = never> = [
  Element
] extends [never]
  ? HTMLElementAttributes<HTMLElementTagNameMap[HTMLElementName]>
  : {
      [AttributeName in keyof Element as Element[AttributeName] extends ExcludedHTMLElementAttributeValues
        ? never
        : AttributeName]?: Element[AttributeName];
    };

/**
 * A map of writable HTML element attributes.
 */
type WritableHTMLElementAttributes<Element extends HTMLElement> = Record<
  WritableKeys<HTMLElementAttributes<Element>>,
  HTMLElementAttributes<Element>[WritableKeys<HTMLElementAttributes<Element>>]
>;

type PropertyValue<Value> = ValidProp<MaybeStringLike<Value, number | boolean>>;

/**
 * A map of writable HTML element attribute names to their property values.
 */
type HTMLProperties<Element extends HTMLElement> = {
  [AttributeName in keyof WritableHTMLElementAttributes<Element>]?: PropertyValue<
    Element[AttributeName]
  >;
};

/**
 * A possibly-existent HTML property value.
 */
type MaybeHTMLPropertyValue<
  Element extends HTMLElement,
  Property extends keyof HTMLProperties<Element> | (string & {})
> = Element extends { [Name in Property]: infer Value }
  ? PropertyValue<Value>
  : never;

/**
 * Conditionally maps HTML element attributes to given values.
 *
 * When an attribute is not present in an HTML element, excludes it from the map.
 */
type MaybeMapHTMLAttributes<
  Element extends HTMLElement,
  Attributes extends Partial<
    Record<keyof HTMLElementAttributes, Record<PropertyKey, unknown>>
  >
> = {
  [AttributeName in keyof Attributes as Element extends {
    [Name in AttributeName]: unknown;
  }
    ? AttributeName
    : never]: Partial<Attributes[AttributeName]>;
};

/**
 * Replaces HTML properties with given HTML element attributes.
 *
 * When a given HTML element attribute is not present in the HTML element, it is excluded from the map.
 */
type MapHTMLProperties<
  Element extends HTMLElement,
  Attributes extends Partial<
    Record<keyof HTMLElementAttributes, Record<PropertyKey, unknown>>
  >,
  MaybeMappedHTMLAttributes = MaybeMapHTMLAttributes<Element, Attributes>
> = Omit<HTMLProperties<Element>, keyof Attributes> &
  UnionToIntersection<
    MaybeMappedHTMLAttributes[keyof MaybeMappedHTMLAttributes]
  >;

/**
 * A map of writable HTML property names to their HTML property values.
 */
type RemappedHTMLProperties<Element extends HTMLElement> = MapHTMLProperties<
  Element,
  {
    className: {
      class:
        | MaybeHTMLPropertyValue<Element, 'className'>
        | ValidProp<
            Record<
              Extract<
                MaybeHTMLPropertyValue<Element, 'className'>,
                PropertyKey
              >,
              boolean | undefined
            >
          >;
    };
    style: {
      style: ValidProp<
        | string
        | Partial<
            CamelCaseObjectToKebabCaseObject<
              Exclude<
                MaybeHTMLPropertyValue<Element, 'style'>,
                (...args: any[]) => any
              >
            > &
              Record<`--${string}`, string>
          >
      >;
    };
    htmlFor: {
      for: MaybeHTMLPropertyValue<Element, 'htmlFor'>;
    };
  }
>;

/**
 * A map of handle-event property names to their HTML property values.
 */
type HandleEventProperties = {
  // TODO: Type according to `lib/handle-event.ts`.
  handleEvent?: ValidProp<MaybeStringLike<boolean>>;
};

/**
 * A map of nonstandard property names to their HTML property values.
 */
type NonstandardProperties<Element extends HTMLElement> = {
  manageFocus?: () =>
    | {
        shouldBeFocused: () => boolean | undefined;
        onFocusedChanged: (isFocused: boolean, event: FocusEvent) => void;
      }
    | undefined;
  /**
   * Useful for `<a>` tags in the DOM that also have an onTap handler
   * By the time a 'click' event is fired, we don't want the native href handling -- `onTap` will have handled the action (from a 'mouseUp' event)
   * It seems like most (or all?) browsers don't dispatch a click event if the mouseUp event removes the element
   * from the DOM, which often happens (for example, clicking a link in a dropdown, and the dropdown closes immediately).
   * But we want to guard against inconsistent behavior across browsers / handle cases where the element is not removed
   */
  ignoreRealClick?: () => boolean;
  // TODO: `index`, `toggled`, `tooltip`, `tapboundary`, and `disablescroll` are all non-standard. It's worth
  // considering if they should be supported in the future, or if data- attributes should be used instead.
  index?: () => number;
  toggled?: () => boolean;
  tooltip?: () => string;
  // TODO: Should source be updated to just check for the existence of `tapboundary` and `disablescroll` on an element
  // instead of a string?
  tapboundary?: PropertyValue<'true'>;
  disablescroll?: PropertyValue<'true'>;
} & (Element extends VoidHTMLElement ? {} : { children?: ValidChildren });

type HTMLMediaElementEventHandlers = {
  onAbort?: (event: Event) => void;
  onCanPlay?: (event: Event) => void;
  onCanPlayThrough?: (event: Event) => void;
  onDurationChange?: (event: Event) => void;
  onEmptied?: (event: Event) => void;
  onEnded?: (event: Event) => void;
  onLoadedData?: (event: Event) => void;
  onLoadedMetadata?: (event: Event) => void;
  onLoadStart?: (event: Event) => void;
  onPause?: (event: Event) => void;
  onPlay?: (event: Event) => void;
  onPlaying?: (event: Event) => void;
  onProgress?: (event: ProgressEvent) => void;
  onRateChange?: (event: Event) => void;
  onSeeked?: (event: Event) => void;
  onSeeking?: (event: Event) => void;
  onStalled?: (event: Event) => void;
  onSuspend?: (event: Event) => void;
  onTimeUpdate?: (event: Event) => void;
  onVolumeChange?: (event: Event) => void;
  onWaiting?: (event: Event) => void;
};

type HTMLInputElementEventHandlers = {
  onBeforeInput?: (event: InputEvent) => void;
  onChange?: (event: InputEvent) => void;
  onInput?: (event: InputEvent) => void;
  onInvalid?: (event: Event) => void;
  onSelect?: (event: Event) => void;
};

type HTMLTextAreaElementEventHandlers = {
  onBeforeInput?: (event: InputEvent) => void;
  onChange?: (event: InputEvent) => void;
  onInput?: (event: InputEvent) => void;
  onSelect?: (event: Event) => void;
};

type HTMLSelectElementEventHandlers = {
  onChange?: (event: InputEvent) => void;
};

type HTMLFormElementEventHandlers = {
  onFormData?: (event: FormDataEvent) => void;
  onInvalid?: (event: Event) => void;
  onReset?: (event: Event) => void;
  onSubmit?: (event: SubmitEvent) => void;
};

type HTMLTrackElementEventHandlers = {
  onCueChange?: (event: Event) => void;
};

type HTMLDetailsElementEventHandlers = {
  onToggle?: (event: Event) => void;
};

/**
 * A map of HTML event names to their handler functions.
 *
 * `GlobalEventHandlers` could be used to build this as done with `HTMLElementTagNameMap` to build
 * `HTMLElementAttributes`, but its event names are lowercased and don't match the convention used in DCGView.
 *
 * Instead, these event names are manually written out in camelCase with `GlobalEventHandlers` as a reference.
 */
type HTMLEventHandlers<Element extends HTMLElement> = {
  onAnimationCancel?: (event: AnimationEvent) => void;
  onAnimationEnd?: (event: AnimationEvent) => void;
  onAnimationIteration?: (event: AnimationEvent) => void;
  onAnimationStart?: (event: AnimationEvent) => void;
  onAuxClick?: (event: MouseEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onCancel?: (event: Event) => void;
  onClick?: (event: MouseEvent) => void;
  onClose?: (event: Event) => void;
  onContextMenu?: (event: MouseEvent) => void;
  onCopy?: (event: ClipboardEvent) => void;
  onCut?: (event: ClipboardEvent) => void;
  onDblClick?: (event: MouseEvent) => void;
  onDrag?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
  onDragEnter?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDragStart?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onError?: (
    event: Event | string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ) => void;
  onFocus?: (event: FocusEvent) => void;
  onFocusIn?: (event: FocusEvent) => void;
  onFocusOut?: (event: FocusEvent) => void;
  onGotPointerCapture?: (event: PointerEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyPress?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onLoad?: (event: Event) => void;
  onLostPointerCapture?: (event: PointerEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onMouseOut?: (event: MouseEvent) => void;
  onMouseOver?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onPaste?: (event: ClipboardEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerEnter?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerOut?: (event: PointerEvent) => void;
  onPointerOver?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onResize?: (event: UIEvent) => void;
  onScroll?: (event: Event) => void;
  onScrollEnd?: (event: Event) => void;
  onSecurityPolicyViolation?: (event: SecurityPolicyViolationEvent) => void;
  onSelectionChange?: (event: Event) => void;
  onSelectStart?: (event: Event) => void;
  onSlotChange?: (event: Event) => void;
  onTouchCancel?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTransitionCancel?: (event: TransitionEvent) => void;
  onTransitionEnd?: (event: TransitionEvent) => void;
  onTransitionRun?: (event: TransitionEvent) => void;
  onTransitionStart?: (event: TransitionEvent) => void;
  onWebKitAnimationEnd?: (event: AnimationEvent) => void;
  onWebKitAnimationIteration?: (event: AnimationEvent) => void;
  onWebKitAnimationStart?: (event: AnimationEvent) => void;
  onWebKitTransitionEnd?: (event: TransitionEvent) => void;
  onWheel?: (event: WheelEvent) => void;
  onAfterPrint?: (event: Event) => void;
  onBeforePrint?: (event: Event) => void;
  onBeforeUnload?: (event: BeforeUnloadEvent) => void;
  onGamepadConnected?: (event: GamepadEvent) => void;
  onGamepadDisconnected?: (event: GamepadEvent) => void;
  onHashChange?: (event: HashChangeEvent) => void;
  onLanguageChange?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onMessageError?: (event: MessageEvent) => void;
  onOffline?: (event: Event) => void;
  onOnline?: (event: Event) => void;
  onPageHide?: (event: PageTransitionEvent) => void;
  onPageShow?: (event: PageTransitionEvent) => void;
  onPopState?: (event: PopStateEvent) => void;
  onRejectionHandled?: (event: PromiseRejectionEvent) => void;
  onStorage?: (event: StorageEvent) => void;
  onUnhandledRejection?: (event: PromiseRejectionEvent) => void;
  onUnload?: (event: Event) => void;
} & (Element extends HTMLMediaElement ? HTMLMediaElementEventHandlers : {}) &
  (Element extends HTMLInputElement ? HTMLInputElementEventHandlers : {}) &
  (Element extends HTMLTextAreaElement
    ? HTMLTextAreaElementEventHandlers
    : {}) &
  (Element extends HTMLSelectElement ? HTMLSelectElementEventHandlers : {}) &
  (Element extends HTMLFormElement ? HTMLFormElementEventHandlers : {}) &
  (Element extends HTMLTrackElement ? HTMLTrackElementEventHandlers : {}) &
  (Element extends HTMLDetailsElement ? HTMLDetailsElementEventHandlers : {});

/**
 * A map of nonstandard event names to their handler functions.
 */
export type NonstandardEventHandlers<
  Element extends HTMLElement = HTMLElement
> = {
  willMount?: () => void;
  onMount?: (element: Element) => void;
  didMount?: (element: Element) => void;
  willUnmount?: (element: Element) => void;
  onUnmount?: () => void;
  didUnmount?: (element: Element) => void;
  willUpdate?: () => void;
  onUpdate?: (element: Element) => void;
  didUpdate?: () => void;
  // TODO: `event` should be typed as a `TouchEvent` or a `TouchTrackingEvent`, but `TouchTrackingEvent` is only
  // available in `knox`.
  onTap?: (event: any) => void;
  onTapStart?: (event: any) => void;
  onTapMove?: (event: any) => void;
  onTapEnd?: (event: any) => void;
  onLongHold?: (event: any) => void;
};

export type HTMLProps<
  Element extends
    HTMLElement = HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
  ViewProps extends ValidProps = never,
  HTMLProperties = RemappedHTMLProperties<Element> &
    HandleEventProperties &
    NonstandardProperties<Element> &
    HTMLEventHandlers<Element> &
    NonstandardEventHandlers<Element>
> = [ViewProps] extends [never]
  ? HTMLProperties
  : Omit<HTMLProperties, keyof ViewProps> & ViewProps;

declare global {
  /**
   * @see https://github.com/microsoft/TypeScript/issues/31532
   */
  interface HTMLMediaElement {
    controlsList: string;
  }

  namespace JSX {
    type Element = Spec;

    interface ElementChildrenAttribute {
      children: {};
    }

    interface ElementAttributesProperty {
      props: {};
    }

    interface IntrinsicElements
      extends Omit<
        {
          [ElementName in keyof HTMLElementTagNameMap]: HTMLProps<
            HTMLElementTagNameMap[ElementName]
          >;
        },
        'p' | 'textarea'
      > {}
  }
}
