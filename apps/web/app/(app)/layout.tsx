import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BannerProvider } from "@/components/layout/top-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BannerProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto bg-bg-base">{children}</main>
        </div>
      </div>
    </BannerProvider>
  );
}
