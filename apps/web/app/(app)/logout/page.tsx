"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * /logout — desloga e redireciona pra /login.
 * Como é página visitável (item de sidebar), não usa server action — só client effect.
 */
export default function LogoutPage() {
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    })();
  }, [router]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="text-center max-w-sm space-y-3">
        <div className="size-12 rounded-2xl bg-bg-elevated text-ink-muted grid place-items-center mx-auto">
          <LogOut className="size-5" />
        </div>
        <p className="text-sm text-ink-muted">Saindo…</p>
      </div>
    </div>
  );
}
