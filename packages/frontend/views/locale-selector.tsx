import * as DCGView from "../dcgview";
const { SwitchUnion, For } = DCGView.Components;
import { Locale, LOCALE_CONFIGS } from "../../iso/locale";
import { assertUnreachable } from "../../iso/utils";
import { Dispatch } from "../types";
import * as typestyle from "typestyle";
import * as csx from "csx";
import * as csstips from "csstips";

const styles = typestyle.stylesheet({
  localeSelector: {
    position: "relative",
    display: "inline-block",
  },
  localeTrigger: {
    display: "flex",
    alignItems: "center",
    gap: csx.px(8),
    padding: `${csx.px(8)} ${csx.px(12)}`,
    border: `1px solid ${csx.rgb(200, 200, 200)}`,
    borderRadius: csx.px(4),
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: csx.em(0.9),
    $nest: {
      "&:hover": {
        backgroundColor: csx.rgb(248, 248, 248),
      },
    },
  },
  localeTriggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: "transparent",
  },
  localeDropdown: {
    ...csstips.vertical,
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    border: `1px solid ${csx.rgb(200, 200, 200)}`,
    borderTop: "none",
    borderBottomLeftRadius: csx.px(4),
    borderBottomRightRadius: csx.px(4),
    boxShadow: `0 2px 8px ${csx.rgba(0, 0, 0, 0.1)}`,
    zIndex: 1000,
  },
  localeOption: {
    ...csstips.content,
    padding: `${csx.px(8)} ${csx.px(12)}`,
    border: "none",
    backgroundColor: "transparent",
    textAlign: "left",
    cursor: "pointer",
    fontSize: csx.em(0.9),
    $nest: {
      "&:hover": {
        backgroundColor: csx.rgb(248, 248, 248),
      },
    },
  },
  localeOptionSelected: {
    backgroundColor: csx.rgb(240, 248, 255),
    $nest: {
      "&:hover": {
        backgroundColor: csx.rgb(230, 240, 250),
      },
    },
  },
});

export type Model =
  | { type: "closed"; selectedLocale: Locale }
  | { type: "open"; selectedLocale: Locale };

export type Msg =
  | { type: "OPEN_DROPDOWN" }
  | { type: "CLOSE_DROPDOWN" }
  | { type: "SELECT_LOCALE"; locale: Locale };

export class LocaleSelectorController {
  state: Model;

  constructor(
    initialLocale: Locale,
    public myDispatch: Dispatch<Msg>,
  ) {
    this.state = { type: "closed", selectedLocale: initialLocale };
  }

  handleDispatch(msg: Msg) {
    switch (msg.type) {
      case "OPEN_DROPDOWN":
        if (this.state.type === "closed") {
          this.state = {
            type: "open",
            selectedLocale: this.state.selectedLocale,
          };
        }
        return;

      case "CLOSE_DROPDOWN":
        if (this.state.type === "open") {
          this.state = {
            type: "closed",
            selectedLocale: this.state.selectedLocale,
          };
        }
        return;

      case "SELECT_LOCALE": {
        const newLocale = msg.locale;
        const changed = newLocale !== this.state.selectedLocale;
        this.state = { type: "closed", selectedLocale: newLocale };

        if (changed) {
          return { type: "locale_changed", newLocale };
        }
        return { type: "no_change" };
      }

      default:
        assertUnreachable(msg);
    }
  }
}

export class LocaleSelectorView extends DCGView.View<{
  controller: () => LocaleSelectorController;
}> {
  private documentClickHandler: ((event: MouseEvent) => void) | null = null;

  template() {
    const controller = this.props.controller;
    const stateProp = () => controller().state;
    const availableLocales = Object.keys(LOCALE_CONFIGS) as Locale[];

    return SwitchUnion(stateProp, "type", {
      closed: (state) => (
        <div class={DCGView.const(styles.localeSelector)}>
          <button
            class={DCGView.const(styles.localeTrigger)}
            onClick={(e) => {
              e.stopPropagation();
              controller().myDispatch({ type: "OPEN_DROPDOWN" });
            }}
          >
            <span>
              {() => LOCALE_CONFIGS[state().selectedLocale].displayName}
            </span>
            <span>▼</span>
          </button>
        </div>
      ),

      open: (state) => (
        <div
          class={DCGView.const(styles.localeSelector)}
          didMount={this.bindFn(this.setupDocumentClickListener)}
          willUnmount={this.bindFn(this.removeDocumentClickListener)}
        >
          <button
            class={() =>
              typestyle.classes(styles.localeTrigger, styles.localeTriggerOpen)
            }
            onClick={() => controller().myDispatch({ type: "CLOSE_DROPDOWN" })}
          >
            <span>
              {() => LOCALE_CONFIGS[state().selectedLocale].displayName}
            </span>
            <span>▲</span>
          </button>
          <div class={DCGView.const(styles.localeDropdown)}>
            <For.Simple each={() => availableLocales}>
              {(locale: Locale) => (
                <button
                  class={() =>
                    typestyle.classes(
                      styles.localeOption,
                      locale === state().selectedLocale
                        ? styles.localeOptionSelected
                        : "",
                    )
                  }
                  onClick={() =>
                    controller().myDispatch({ type: "SELECT_LOCALE", locale })
                  }
                >
                  {() => LOCALE_CONFIGS[locale].displayName}
                </button>
              )}
            </For.Simple>
          </div>
        </div>
      ),
    });
  }

  private setupDocumentClickListener(el: HTMLDivElement) {
    this.removeDocumentClickListener();

    this.documentClickHandler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!el.contains(target)) {
        this.props.controller().myDispatch({ type: "CLOSE_DROPDOWN" });
      }
    };

    document.addEventListener("click", this.documentClickHandler!);
  }

  private removeDocumentClickListener() {
    if (this.documentClickHandler) {
      document.removeEventListener("click", this.documentClickHandler);
      this.documentClickHandler = null;
    }
  }
}

