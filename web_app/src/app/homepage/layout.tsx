import type { ReactNode } from "react";

export default function HomepageLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <h1>Welcome to the Homepage</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
