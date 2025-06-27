import * as DCGView from "dcgview";

export class Nav extends DCGView.View<{
  loggedIn: () => boolean;
}> {
  template() {
    if (this.props.loggedIn()) {
      return (
        <nav>
          <a href={DCGView.const("/")}>Home</a> <a href={DCGView.const("/snapshots")}>Snapshots</a>{" "}
          <a href={DCGView.const("/report-card")}>Report Card</a> <a href={DCGView.const("/explore")}>Explore</a>{" "}
          <a href={DCGView.const("/api/logout")}>Logout</a>
        </nav>
      );
    } else {
      return (
        <nav>
          <a href={DCGView.const("/")}>Home</a> <a href={DCGView.const("/explore")}>Explore</a>{" "}
          <a href={DCGView.const("/send-link")}>Login</a>
        </nav>
      );
    }
  }
}
