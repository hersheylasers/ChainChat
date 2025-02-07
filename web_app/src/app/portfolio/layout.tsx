import type { ReactNode } from "react";

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <h1>Portfolio</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
