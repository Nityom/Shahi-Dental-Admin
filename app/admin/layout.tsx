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
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl font-semibold">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl font-semibold">Please login to access this page</div>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden bg-gray-50">
                <AppSidebar/>
                <div className="flex-1 min-w-0 p-4 pt-16 md:p-6 md:pt-6 overflow-y-auto">{children}</div>
            </div>
        </SidebarProvider>
    );
}

