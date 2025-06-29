import * as DCGView from "dcgview";
import { LocaleSelectorController, LocaleSelectorView } from "./locale-selector";
import * as typestyle from "typestyle";
import * as csstips from "csstips";

const styles = typestyle.stylesheet({
  nav: {
    ...csstips.horizontal,
    justifyContent: "space-between",
    alignItems: "center",
  },
  links: {
    ...csstips.horizontal,
  },
});

export class Nav extends DCGView.View<{
  loggedIn: () => boolean;
  localeSelectorController: () => LocaleSelectorController;
}> {
  template() {
    if (this.props.loggedIn()) {
      return (
        <nav class={DCGView.const(styles.nav)}>
          <div class={DCGView.const(styles.links)}>
            <a href="/">Home</a> <a href="/snapshots">Snapshots</a>{" "}
            <a href="/report-card">Report Card</a> <a href="/explore">Explore</a>{" "}
            <a href="/api/logout">Logout</a>
          </div>
          <LocaleSelectorView controller={this.props.localeSelectorController} />
        </nav>
      );
    } else {
      return (
        <nav class={DCGView.const(styles.nav)}>
          <div class={DCGView.const(styles.links)}>
            <a href="/">Home</a> <a href="/explore">Explore</a>{" "}
            <a href="/send-link">Login</a>
          </div>
          <LocaleSelectorView controller={this.props.localeSelectorController} />
        </nav>
      );
    }
  }
}
