import React from "react";

export const Nav = ({ loggedIn }: { loggedIn: boolean }) => {
  if (loggedIn) {
    return (
      <nav>
        <a href="/">Home</a> <a href="/snapshots">Snapshots</a>{" "}
        <a href="/report-card">Report Card</a> <a href="/explore">Explore</a>{" "}
        <a href="/api/logout">Logout</a>
      </nav>
    );
  } else {
    return (
      <nav>
        <a href="/">Home</a> <a href="/explore">Explore</a>{" "}
        <a href="/send-link">Login</a>
      </nav>
    );
  }
};
