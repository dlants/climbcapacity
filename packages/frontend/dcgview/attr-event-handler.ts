export function AttrEventHandler(
  event: string,
  data: ((...args: any[]) => any) | null | undefined
) {
  if (data === null || data === undefined) {
    return undefined;
  }

  if (typeof event !== 'string') {
    throw new Error('Must pass a string for an EventHandler name');
  }

  if (typeof data !== 'function') {
    throw new Error('Must pass a function for an EventHandler callback');
  }

  return {
    bindings: {
      onMount(node?: HTMLElement) {
        if (!node) {
          return;
        }

        // TODO: Type `event` as a `DCGElementAttribute` once ambient types are in source.
        // @ts-expect-error
        node[event.toLowerCase()] = (event: Event, ...args: unknown[]) => {
          if (!event) {
            // No event was passed in. Edge sometimes does this.
            return;
          }

          data.apply(node, [event, ...args]);
        };
      }
    }
  };
}
