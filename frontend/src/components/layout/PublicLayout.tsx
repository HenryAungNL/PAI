import { Outlet, ScrollRestoration } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/** Marketing / public shell: navbar, page content, footer. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
