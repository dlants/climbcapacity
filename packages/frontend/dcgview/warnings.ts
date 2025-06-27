import { isView, type ViewInstance } from './view';

type WarningHandler = (warning: Error) => void;

const warningHandlers: WarningHandler[] = [];

export function addWarningHandler(callback: WarningHandler) {
  warningHandlers.push(callback);
}

export function removeWarningHandler(callback: WarningHandler) {
  const newHandlers = warningHandlers.filter((handler) => handler !== callback);
  warningHandlers.length = 0;
  warningHandlers.push(...newHandlers);
}

export function warn(message: string, target?: ViewInstance): void {
  if (isView(target)) {
    const viewName = `[${target._viewName}]`;
    const viewHierarchy = target.traceViewHierarchy();
    const hierarchyMessage =
      viewHierarchy.ancestors.length > 0
        ? `\nView Hierarchy:\n${viewHierarchy.formatted}`
        : '';
    message = `${message} ${viewName}${hierarchyMessage}`;
  }

  const warning = new Error(message);
  console.warn(warning); // eslint-disable-line no-console
  warningHandlers.forEach((handler) => handler(warning));
}
