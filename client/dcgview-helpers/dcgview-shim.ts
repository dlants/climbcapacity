import 'style_dir/dcgview-shim.scss';

import * as Bugsnag from 'analytics/bugsnag';
import * as DCGView from 'dcgview/index';
import $ from 'jquery';

import { retainBrowserLang } from '../lib/retain-browser-lang';

DCGView.addWarningHandler((warning) => Bugsnag.notify(warning));

DCGView.addCustomAttribute<() => string>('href', (getter) => {
  let previousValue = retainBrowserLang(getter());
  return {
    value: `${retainBrowserLang(getter())}`,
    bindings: {
      onMount(node) {
        if (!['a', 'use'].includes(node.tagName.toLowerCase())) {
          throw new Error('Cannot have an href on a non-link element.');
        }
      },
      onUpdate(node) {
        const href = retainBrowserLang(getter());
        if (previousValue === href) {
          return;
        }

        previousValue = href;
        node.setAttribute('href', href);
      }
    }
  };
});

DCGView.addCustomAttribute('onTap', (fn) => ({
  value: '',
  bindings: {
    onMount(node) {
      $(node).on('dcg-tap', fn);
    }
  }
}));

DCGView.addCustomAttribute('onTapStart', (fn) => ({
  bindings: {
    onMount(node) {
      $(node).on('dcg-tapstart', fn);
    }
  }
}));

DCGView.addCustomAttribute('onTapMove', (fn) => ({
  bindings: {
    onMount(node) {
      $(node).on('dcg-tapmove', fn);
    }
  }
}));

DCGView.addCustomAttribute('onTapEnd', (fn) => ({
  bindings: {
    onMount(node) {
      $(node).on('dcg-tapend', fn);
    }
  }
}));

DCGView.addCustomAttribute('onLongHold', (fn) => ({
  bindings: {
    onMount(node) {
      $(node).on('dcg-longhold', fn);
    }
  }
}));

DCGView.addCustomAttribute<() => boolean>('ignoreRealClick', (fn) => ({
  bindings: {
    onMount(node) {
      $(node).on('click', (evt) => {
        const hasModifier = evt.altKey || evt.shiftKey || evt.metaKey;
        if (!hasModifier && fn()) {
          evt.preventDefault();
        }
      });
    }
  }
}));

DCGView.addCustomAttribute<
  () => NonNullable<ReturnType<NonNullable<DCGView.HTMLProps['manageFocus']>>>
>('manageFocus', (fn) => {
  if (fn() === undefined) {
    return {};
  }

  return {
    bindings: {
      onMount(node) {
        if (fn().shouldBeFocused()) {
          node.focus();
        }

        node.onfocus = function (evt) {
          if (!fn().shouldBeFocused()) {
            fn().onFocusedChanged(true, evt);
          }
        };

        node.onblur = function (evt) {
          if (
            !!fn().shouldBeFocused() &&
            evt.target !== document.activeElement
          ) {
            fn().onFocusedChanged(false, evt);
          }
        };
      },

      onUpdate(node) {
        const shouldFocus = fn().shouldBeFocused();
        const isFocused = document.activeElement === node;
        if (shouldFocus && !isFocused) {
          node.focus();
        } else if (isFocused && !shouldFocus) {
          node.blur();
        }
      },

      willUnmount(node) {
        node.onfocus = null;
        node.onblur = null;
      }
    }
  };
});

export = DCGView;
