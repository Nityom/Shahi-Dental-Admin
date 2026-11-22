"use client";

import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Menu,
  ChevronRight,
  Pill,
  FileText,
  LogOut,
  Wrench,
  TrendingUp,
  CreditCard,
  Calendar,
  ClipboardList,
  Activity,
  UserCheck,
  Crown,
  ReceiptText,
  Link2,
} from "lucide-react";
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut } from "@/services/adminuser";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { clinicConfig } from "@/config/clinic";

interface CustomSidebarProps {
  children: React.ReactNode;
  className?: string;
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({ children, className }) => (
  <aside className={`${className} transition-all duration-300 ease-in-out overflow-hidden`}>
    {children}
    <style jsx>{`
      aside {
        animation: slideIn 0.3s ease forwards;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      aside::-webkit-scrollbar,
      aside :global(*::-webkit-scrollbar) {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0.8; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </aside>
);

interface MenuItemProps {
  icon: React.ElementType;
  title: string;
  url: string;
  isActive: boolean;
  onClick: (id: string, url: string) => void;
  id: string;
  isExpanded: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, title, url, isActive, onClick, id, isExpanded }) => (
  <li className="mb-1 px-2">
    <a
      href="#"
      title={!isExpanded ? title : undefined}
      className={`flex items-center w-full h-9 px-2.5 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/70'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
      } ${!isExpanded ? 'justify-center' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(id, url);
      }}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
      {isExpanded && (
        <>
          <span className="ml-2.5 whitespace-nowrap">{title}</span>
          {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-600 opacity-70" />}
        </>
      )}
    </a>
  </li>
);

interface MenuItemDef {
  id: string;
  title: string;
  url: string;
  icon: React.ElementType;
}

export function AppSidebar({ children }: { children?: React.ReactNode }): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("patient-management");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [animateItems, setAnimateItems] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    const checkViewport = (): void => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      }
    };

    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        if (user.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/auth/login');
      }
    };

    checkAuth();
    checkViewport();
    window.addEventListener('resize', checkViewport);
    setTimeout(() => setAnimateItems(true), 100);
    return () => window.removeEventListener('resize', checkViewport);
  }, [router]);

  const items: MenuItemDef[] = [
    { id: "patient-management", title: "Patient Management", url: "/admin/patients", icon: Inbox },
    { id: "appointments", title: "Appointments", url: "/admin/appointments", icon: Calendar },
    { id: "crown-management", title: "Crowns & Revenue", url: "/admin/crowns", icon: Crown },
    { id: "registers-records", title: "Registers & Records", url: "/admin/registers", icon: ClipboardList },
    ...(isAdmin ? [{ id: "doctor-management", title: "Doctor Management", url: "/admin/doctors", icon: UserCheck }] : []),
    { id: "investigations-opg", title: "Investigation & OPG", url: "/admin/investigations", icon: Activity },
    { id: "medicine-management", title: "Medicine Management", url: "/admin/medicines", icon: Pill },
    { id: "stockist-bills", title: "Stockist Bills & Dues", url: "/admin/stockists", icon: ReceiptText },
    { id: "Inventory-management", title: "Inventory Management", url: "/admin/inventory", icon: Wrench },
    { id: "treatment-links", title: "Treatment Auto-Link", url: "/admin/treatment-links", icon: Link2 },
    ...(isAdmin ? [{ id: "sales-report", title: "Sales Report", url: "/admin/medicines/sales", icon: TrendingUp }] : []),
    { id: "installments", title: "Payment Installments", url: "/admin/installments", icon: CreditCard },
    // { id: "generate-prescription", title: "Generate Prescription", url: "/admin/prescription", icon: FileText },
  ];

  useEffect(() => {
    if (pathname) {
      const current = items.find((item) => pathname.startsWith(item.url));
      if (current) {
        setActiveItem(current.id);
      }
    }
  }, [pathname]);

  const handleItemClick = async (id: string, url: string): Promise<void> => {
    try {
      setActiveItem(id);
      await router.push(url);
      if (isMobile) {
        setIsExpanded(false);
      }
    } catch (error: unknown) {
      console.error('Error during navigation:', error);
      window.location.href = url;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleSidebar = (): void => {
    setIsExpanded(!isExpanded);
  };

  const showExpanded = isMobile || isExpanded;

  return (
    <>
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <CustomSidebar
        className={`
          bg-[#f5f8f5] border-r border-[#e2eae3] text-gray-900
          flex flex-col shrink-0
          ${isMobile ? 'fixed z-30 h-full' : 'relative h-screen'}
          ${isMobile
            ? (isExpanded ? 'translate-x-0 w-60' : '-translate-x-full w-60')
            : (isExpanded ? 'w-60 translate-x-0' : 'w-16 translate-x-0')
          }
          shadow-xs
        `}
      >
        {/* Logo/header with toggle always inside sidebar */}
        <div
          className={`relative flex items-center border-b border-gray-100 shrink-0 transition-all duration-200 ${
            showExpanded ? 'h-[76px] px-4 justify-start' : 'h-16 px-3 justify-center'
          }`}
        >
          {showExpanded ? (
            <>
              <button
                type="button"
                className="flex min-w-0 items-center gap-2.5 pr-8 text-left cursor-pointer"
                onClick={() => router.push(items[0]?.url || '/admin/patients')}
                title="Svaasth HMS workspace"
              >
                <img
                  src={clinicConfig.branding.svasthLogoUrl}
                  alt="Svaasth HMS"
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <div className="flex flex-col min-w-0">
                  <span className="whitespace-nowrap text-[13px] font-extrabold tracking-[0.12em] text-[#34785b]">
                    SVAASTH HMS
                  </span>
                  <span className="whitespace-nowrap text-[11px] font-medium text-slate-500 truncate">
                    {clinicConfig.name}
                  </span>
                </div>
              </button>
              <button
                onClick={toggleSidebar}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                title="Collapse sidebar"
              >
                <Menu size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
              title="Expand sidebar"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-3 px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-1">
            {showExpanded && (
              <h3 className="px-3 pb-1.5 pt-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Workspace
              </h3>
            )}
            <ul>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={animateItems ? 'fade-slide-up' : 'opacity-0'}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <MenuItem
                    icon={item.icon}
                    title={item.title}
                    url={item.url}
                    isActive={activeItem === item.id}
                    onClick={handleItemClick}
                    id={item.id}
                    isExpanded={showExpanded}
                  />
                </div>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer / user section */}
        <div className={`border-t border-gray-100 shrink-0 ${showExpanded ? 'p-3' : 'p-2 flex flex-col items-center gap-3'}`}>
          {showExpanded ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 truncate font-medium">{userEmail}</p>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                      isAdmin
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors text-xs font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
              {clinicConfig.branding.poweredBySvasth && (
                <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 select-none">
                  <span>Powered by</span>
                  <img
                    src={clinicConfig.branding.svasthLogoUrl}
                    alt="Svaasth HMS"
                    className="h-4 w-4 rounded-xs object-contain"
                  />
                  <span className="font-semibold text-gray-600">Svaasth HMS</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center cursor-pointer"
                title={userEmail}
              >
                <span className="text-xs font-semibold text-white">
                  {userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              {clinicConfig.branding.poweredBySvasth && (
                <div
                  className="pt-1 border-t border-gray-100 flex items-center justify-center select-none"
                  title="Powered by Svaasth HMS"
                >
                  <img
                    src={clinicConfig.branding.svasthLogoUrl}
                    alt="Svaasth HMS"
                    className="h-5 w-5 rounded-xs object-contain opacity-70 hover:opacity-100 transition"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </CustomSidebar>

      {/* Mobile toggle button (shown when sidebar is closed) */}
      {isMobile && !isExpanded && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-20 bg-white text-gray-700 p-2 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeSlideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .fade-slide-up {
          animation: fadeSlideUp 0.35s ease forwards;
        }
      `}</style>
    </>
  );
}
