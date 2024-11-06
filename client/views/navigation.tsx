import React from "react";

export const Nav = ({ loggedIn }: { loggedIn: boolean }) => {
  return (
    <nav>
      <a href="/">Home</a> <a href="/snapshots">Snapshots</a>{" "}
      <a href="/explore">Explore</a>{" "}
      {loggedIn ? (
        <a href="/api/logout">Logout</a>
      ) : (
        <a href="/send-link">Login</a>
      )}
    </nav>
  );
};
