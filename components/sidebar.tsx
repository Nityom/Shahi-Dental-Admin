"use client"
import React, { useState, useEffect } from 'react';
import { Inbox, Menu, X, ChevronRight, Pill, FileText, LogOut, Wrench, TrendingUp, CreditCard, Package} from "lucide-react";
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
  <div className="mb-6">
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
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, title, url, isActive, onClick, id }) => (
  <li className="mb-2 px-2">
    <a
      href="#"
      className={`flex items-center justify-start w-full p-3 rounded-lg transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md'
          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
      }`}
      onClick={(e) => {
        e.preventDefault();
        onClick(id, url);
      }}
    >
      <div className={`relative ${isActive ? 'mr-3' : 'mr-3'}`}>
        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
        {isActive && (
          <span className="absolute -inset-1 rounded-full bg-blue-400/20 pulse-animation"></span>
        )}
      </div>
      <span className="whitespace-nowrap font-medium">{title}</span>
      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
    </a>
    <style jsx>{`
      li {
        transition: transform 0.2s ease;
      }
      
      li:hover {
        transform: scale(1.02);
      }
      
      li:active {
        transform: scale(0.98);
      }
      
      .pulse-animation {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.2); }
        100% { opacity: 0.2; transform: scale(1); }
      }
    `}</style>
  </li>
);

interface MenuItem {
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

  const items: MenuItem[] = [
    { id: "patient-management", title: "Patient Management", url: "/admin/patients", icon: Inbox },
    { id: "medicine-management", title: "Medicine Management", url: "/admin/medicines", icon: Pill },
    { id: "Inventory-management", title: "Inventory Management", url: "/admin/inventory", icon: Wrench },
    { id: "consumable-settings", title: "Consumable Settings", url: "/admin/consumable-settings", icon: Package },
    { id: "sales-report", title: "Sales Report", url: "/admin/medicines/sales", icon: TrendingUp },
    { id: "installments", title: "Payment Installments", url: "/admin/installments", icon: CreditCard },
    { id: "generate-prescription", title: "Generate Prescription", url: "/admin/prescription", icon: FileText },
  ];

  const handleItemClick = async (id: string, url: string): Promise<void> => {
    try {
      // Set active item
      setActiveItem(id);
      
      // Use router.push with proper error handling
      await router.push(url);
      
      // Close sidebar on mobile after navigation
      if (isMobile) {
        setIsExpanded(false);
      }
    } catch (error: unknown) {
      console.error('Error during navigation:', error);
      // Fallback to window.location if there's an error
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

  return (
    <>
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-white/10 z-20"
          onClick={() => setIsExpanded(false)}
          style={{animation: 'fadeIn 0.3s ease forwards'}}
        />
      )}

      <CustomSidebar
        className={`
          bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
          border-r border-gray-800/50 text-white
          flex flex-col shrink-0
          ${isMobile ? 'fixed z-30 h-full' : 'relative h-screen'}
          ${isMobile ? (isExpanded ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (isExpanded ? 'w-64 translate-x-0' : 'w-20 translate-x-0')}
          shadow-xl
        `}
      >
        <div className={`p-4 flex items-center ${isMobile || isExpanded ? 'justify-between' : 'justify-center'} mb-6`}>
          {isMobile || isExpanded ? (
            <div className="flex items-center gap-3 fade-slide-in">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center shadow-lg p-2">
                <img src="/dental_logo.svg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col ml-1 w-auto">
                <div className="flex items-baseline mb-0.5 gap-2">
                  <span className="text-[#4EBAED] text-2xl font-black uppercase tracking-tight leading-none">
                    KS DENTAL
                  </span>
                </div>
                <div className="flex items-center w-full mt-1">
                  <div className="h-[1.5px] w-6 bg-gradient-to-r from-transparent to-[#4EBAED]"></div>
                  <span className="text-[#4EBAED] text-[7px] font-bold tracking-[0.05em] mx-1.5 whitespace-nowrap">
                    & AESTHETIC CLINIC
                  </span>
                  <div className="h-[1.5px] w-6 bg-gradient-to-r from-[#4EBAED] to-transparent"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center shadow-lg p-2">
              <img src="/dental_logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        <div className="flex-1 px-2 py-4">
          <MenuGroup label={isMobile || isExpanded ? "MENU" : ""}>
            <ul>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={animateItems ? 'fade-slide-up' : 'opacity-0'}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <MenuItem
                    icon={item.icon}
                    title={isMobile || isExpanded ? item.title : ""}
                    url={item.url}
                    isActive={activeItem === item.id}
                    onClick={handleItemClick}
                    id={item.id}
                  />
                </div>
              ))}
            </ul>
          </MenuGroup>
        </div>

        {isMobile || isExpanded ? (
          <div className="mt-auto p-4 border-t border-gray-700/50">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/30">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                  <span className="font-medium text-sm text-white">{userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{userEmail}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 p-3 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto p-4 flex flex-col items-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center cursor-pointer" title={userEmail}>
              <span className="font-medium text-sm text-white">{userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}

      </CustomSidebar>

      {isMobile && !isExpanded && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-20 bg-white/90 backdrop-blur-sm text-gray-800 p-2.5 rounded-md shadow-md border border-gray-200 hover:bg-gray-100 transition-all duration-300"
        >
          <Menu size={24} />
        </button>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeSlideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeSlideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes floatButton {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes highlightTransition {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .fade-in {
          animation: fadeIn 0.3s ease forwards;
        }
        
        .fade-slide-in {
          animation: fadeSlideIn 0.3s ease forwards;
        }
        
        .fade-slide-up {
          animation: fadeSlideUp 0.5s ease forwards;
        }
        
        .scale-in {
          animation: scaleIn 0.3s ease forwards;
        }
        
        .float-button {
          animation: floatButton 0.5s ease forwards;
        }
      `}</style>
    </>
  );
}