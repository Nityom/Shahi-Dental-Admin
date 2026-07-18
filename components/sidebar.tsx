"use client"
import React, { useState, useEffect } from 'react';
import { Inbox, Menu, ChevronRight, Pill, FileText, LogOut, Wrench, TrendingUp, CreditCard, Package, Calendar } from "lucide-react";
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from "@/services/adminuser";

interface CustomSidebarProps {
  children: React.ReactNode;
  className?: string;
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({ children, className }) => (
  <aside className={`${className} transition-all duration-300 ease-in-out`}>
    {children}
    <style jsx>{`
      aside {
        animation: slideIn 0.3s ease forwards;
      }
      
      @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0.8; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </aside>
);

interface MenuGroupProps {
  label?: string;
  children: React.ReactNode;
}

const MenuGroup: React.FC<MenuGroupProps> = ({ label, children }) => (
  <div className="mb-4">
    {label && <h3 className="text-gray-400 text-xs uppercase tracking-wider px-4 mb-2 font-semibold">{label}</h3>}
    <div>{children}</div>
  </div>
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
      className={`flex items-center w-full py-2.5 px-3 rounded-lg transition-all duration-200 ${isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        } ${!isExpanded ? 'justify-center' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(id, url);
      }}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
      {isExpanded && (
        <>
          <span className="ml-3 whitespace-nowrap font-medium text-sm">{title}</span>
          {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
        </>
      )}
    </a>
    <style jsx>{`
      li {
        transition: transform 0.15s ease;
      }
      li:hover {
        transform: scale(1.01);
      }
      li:active {
        transform: scale(0.99);
      }
    `}</style>
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
  const [activeItem, setActiveItem] = useState<string>("patient-management");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [animateItems, setAnimateItems] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");

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
    { id: "medicine-management", title: "Medicine Management", url: "/admin/medicines", icon: Pill },
    { id: "Inventory-management", title: "Inventory Management", url: "/admin/inventory", icon: Wrench },
    { id: "consumable-settings", title: "Consumable Settings", url: "/admin/consumable-settings", icon: Package },
    { id: "sales-report", title: "Sales Report", url: "/admin/medicines/sales", icon: TrendingUp },
    { id: "installments", title: "Payment Installments", url: "/admin/installments", icon: CreditCard },
    { id: "generate-prescription", title: "Generate Prescription", url: "/admin/prescription", icon: FileText },
  ];

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
          bg-white border-r border-gray-200 text-gray-900
          flex flex-col shrink-0
          ${isMobile ? 'fixed z-30 h-full' : 'relative h-screen'}
          ${isMobile
            ? (isExpanded ? 'translate-x-0 w-60' : '-translate-x-full w-60')
            : (isExpanded ? 'w-60 translate-x-0' : 'w-16 translate-x-0')
          }
          shadow-sm
        `}
      >
        {/* Logo/header with toggle always inside sidebar */}
        <div className={`flex items-center border-b border-gray-100 shrink-0 h-16 px-3 ${showExpanded ? 'justify-between' : 'justify-center'}`}>
          {showExpanded ? (
            <>
              <img
                src="/dental_logo.webp"
                alt="Shahi Dental"
                className="h-9 w-auto object-contain"
              />
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 shrink-0"
                title="Collapse sidebar"
              >
                <Menu size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
              title="Expand sidebar"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-0">
          <MenuGroup label={showExpanded ? "MENU" : ""}>
            <ul>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={animateItems ? 'fade-slide-up' : 'opacity-0'}
                  style={{ animationDelay: `${index * 60}ms` }}
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
          </MenuGroup>
        </div>

        {/* Footer / user section */}
        <div className={`border-t border-gray-100 shrink-0 ${showExpanded ? 'p-4' : 'p-2 flex flex-col items-center gap-3'}`}>
          {showExpanded ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white">{userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}</span>
                </div>
                <p className="text-xs text-gray-700 truncate flex-1">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer"
                title={userEmail}
              >
                <span className="text-xs font-semibold text-white">{userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </CustomSidebar>

      {/* Mobile toggle button (shown when sidebar is closed) */}
      {isMobile && !isExpanded && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-20 bg-white text-gray-700 p-2 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-200"
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