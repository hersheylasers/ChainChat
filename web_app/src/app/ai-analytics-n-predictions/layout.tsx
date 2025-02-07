import type { ReactNode } from "react";

export default function HomepageLayout({ children }: { children: ReactNode }) {
  return (
    <div>
        <header/>
      <main>{children}</main>
    </div>
  );
}
