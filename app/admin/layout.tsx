'use client';

import React, { useEffect, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSession, signOut } from "@/services/adminuser";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, expiresAt } = await getSession();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        setIsAuthenticated(true);

        // Force logout the moment the session expires, even if the tab stays open.
        if (expiresAt) {
          const msUntilExpiry = expiresAt - Date.now();
          if (msUntilExpiry <= 0) {
            signOut();
            return;
          }
          const timer = setTimeout(() => signOut(), msUntilExpiry);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f7f3]">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500 font-semibold">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f7f3]">
        <div className="text-sm font-semibold text-slate-600">Please login to access this page</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#f3f7f3]">
        <AppSidebar />
        <div className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-6 overflow-y-auto">{children}</div>
      </div>
    </SidebarProvider>
  );
}
