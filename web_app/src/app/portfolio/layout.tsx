import type { ReactNode } from "react";

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <main>{children}</main>
    </div>
  );
}
