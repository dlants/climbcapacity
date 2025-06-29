import { isConst } from './const';

export type GetClassName = () =>
  | string
  | Record<string, boolean | null | undefined>;

function getClassNameString(getClassName: GetClassName) {
  const className = getClassName();

  if (typeof className === 'string') {
    return className;
  }

  if (typeof className !== 'object') {
    throw new Error(
      `Unsupported type returned from class getter: ${typeof className}`
    );
  }

  return Object.keys(className)
    .filter((prop) => className[prop as keyof typeof className])
    .join(' ');
}

const whitespaceRegEx = /\s+/;
function splitStringToSet(className: string): Set<string> {
  const trimmed = className.trim();
  if (trimmed) {
    return new Set(trimmed.split(whitespaceRegEx));
  } else {
    return new Set();
  }
}

export function AttrClass(getClassName: GetClassName) {
  let oldClassString = getClassNameString(getClassName);
  if (isConst(getClassName)) {
    return { value: oldClassString };
  }

  let oldClassSet = splitStringToSet(oldClassString);

  return {
    value: oldClassString,
    bindings: {
      onUpdate: (element: HTMLElement) => {
        const newClassString = getClassNameString(getClassName);

        if (oldClassString === newClassString) {
          return;
        }

        const newClassSet = splitStringToSet(newClassString);
        for (const oldClass of oldClassSet.keys()) {
          if (!newClassSet.has(oldClass)) {
            element.classList.remove(oldClass);
          }
        }

        for (const newClass of newClassSet.keys()) {
          if (!oldClassSet.has(newClass)) {
            element.classList.add(newClass);
          }
        }

        oldClassSet = newClassSet;
        oldClassString = newClassString;
      }
    }
  };
}
