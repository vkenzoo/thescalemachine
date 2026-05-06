"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BannerProvider } from "@/components/layout/top-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Fecha drawer mobile ao mudar rota
  React.useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <BannerProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar — desktop sempre visível */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Drawer mobile com overlay */}
        {mobileOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
            />
            <div className="md:hidden fixed inset-y-0 left-0 z-50">
              <Sidebar onMobileClose={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <Header onMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-bg-base">{children}</main>
        </div>
      </div>
    </BannerProvider>
  );
}
