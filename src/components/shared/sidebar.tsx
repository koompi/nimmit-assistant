"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/shared/notification-bell";

// Sidebar context for collapse state
const SidebarContext = createContext<{
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => { } });

export function useSidebar() {
    return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { collapsed, setCollapsed } = useSidebar();

    if (!session?.user) {
        return null;
    }

    const user = session.user;
    const initials = (user.name || user.email || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const dashboardPath =
        user.role === "admin"
            ? "/admin/dashboard"
            : user.role === "worker"
                ? "/worker/dashboard"
                : "/client/dashboard";

    const navItems = getNavItems(user.role, dashboardPath);

    return (
        <aside
            className={`
        flex flex-col h-screen bg-[var(--nimmit-bg-primary)] border-r border-[var(--nimmit-border)]
        transition-all duration-300 ease-in-out shrink-0 overflow-hidden
        ${collapsed ? "w-[60px]" : "w-[240px]"}
      `}
        >
            {/* Header with Logo and Toggle */}
            <div className={`flex items-center h-14 px-3 border-b border-[var(--nimmit-border)] ${collapsed ? "justify-center" : "justify-between"}`}>
                {!collapsed && (
                    <Link
                        href={dashboardPath}
                        className="flex items-center gap-2 group overflow-hidden"
                    >
                        <div className="w-8 h-8 rounded-lg bg-[var(--nimmit-accent-primary)] flex items-center justify-center shrink-0 group-hover:shadow-md transition-shadow">
                            <span className="text-white font-bold text-sm">N</span>
                        </div>
                        <span className="text-lg font-display font-semibold text-[var(--nimmit-text-primary)] whitespace-nowrap">
                            Nimmit
                        </span>
                    </Link>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-[var(--nimmit-text-tertiary)] hover:text-[var(--nimmit-text-primary)] hover:bg-[var(--nimmit-bg-secondary)]"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {collapsed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        )}
                    </svg>
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => (
                    <NavItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        active={item.isActive(pathname)}
                        collapsed={collapsed}
                    />
                ))}
            </nav>

            {/* Spacer with helper text */}
            {!collapsed && (
                <div className="px-4 py-2">
                    <p className="text-[11px] text-[var(--nimmit-text-tertiary)]">
                        Your recent activity
                    </p>
                </div>
            )}

            {/* Bottom Section: User Profile */}
            <div className={`border-t border-[var(--nimmit-border)] p-2 ${collapsed ? "flex justify-center" : ""}`}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={`
                flex items-center w-full rounded-lg
                hover:bg-[var(--nimmit-bg-secondary)] transition-colors
                text-left
                ${collapsed ? "p-2 justify-center" : "gap-3 p-2"}
              `}
                        >
                            <Avatar className="h-8 w-8 shrink-0 border border-[var(--nimmit-border)]">
                                <AvatarFallback className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] font-medium text-sm">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            {!collapsed && (
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-sm font-medium text-[var(--nimmit-text-primary)] truncate">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-[var(--nimmit-text-tertiary)] truncate">
                                        {user.role === "client" ? "Free plan" : user.role}
                                    </p>
                                </div>
                            )}
                            {!collapsed && (
                                <svg className="w-4 h-4 text-[var(--nimmit-text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={collapsed ? "right" : "top"}
                        align="start"
                        className="w-56 bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)] shadow-soft-lg"
                    >
                        <div className="flex items-center gap-3 p-3">
                            <Avatar className="h-10 w-10 border border-[var(--nimmit-border)]">
                                <AvatarFallback className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-[var(--nimmit-text-primary)] truncate">
                                    {user.name}
                                </p>
                                <p className="text-xs text-[var(--nimmit-text-tertiary)] truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                        <DropdownMenuSeparator className="bg-[var(--nimmit-border)]" />
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link
                                href={`/${user.role}/settings`}
                                className="flex items-center gap-2 px-3 py-2 text-[var(--nimmit-text-primary)] hover:bg-[var(--nimmit-bg-secondary)]"
                            >
                                <svg className="w-4 h-4 text-[var(--nimmit-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[var(--nimmit-border)]" />
                        <DropdownMenuItem
                            className="flex items-center gap-2 px-3 py-2 text-[var(--nimmit-error)] cursor-pointer hover:bg-[var(--nimmit-error-bg)]"
                            onClick={() => signOut({ callbackUrl: "/" })}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside >
    );
}

function NavItem({
    href,
    icon,
    label,
    active,
    collapsed,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    collapsed: boolean;
}) {
    return (
        <Link
            href={href}
            className={`
        flex items-center gap-3 px-4 py-3 mx-2 rounded-full text-sm font-medium
        transition-colors group relative
        ${active
                    ? "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]"
                    : "text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-text-primary)] hover:bg-[var(--nimmit-bg-secondary)]"
                }
      `}
            title={collapsed ? label : undefined}
        >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {icon}
            </svg>
            {!collapsed && <span>{label}</span>}

            {/* Tooltip for collapsed state */}
            {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--nimmit-text-primary)] text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {label}
                </span>
            )}
        </Link>
    );
}

// Mobile sidebar overlay
export function MobileSidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    if (!session?.user) {
        return null;
    }

    const user = session.user;
    const dashboardPath =
        user.role === "admin"
            ? "/admin/dashboard"
            : user.role === "worker"
                ? "/worker/dashboard"
                : "/client/dashboard";

    const navItems = getNavItems(user.role, dashboardPath);

    return (
        <>
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[var(--nimmit-bg-primary)] border-b border-[var(--nimmit-border)] sticky top-0 z-40">
                <button
                    onClick={() => setOpen(true)}
                    className="p-2 -ml-2 text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-text-primary)]"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Link href={dashboardPath} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--nimmit-accent-primary)] flex items-center justify-center">
                        <span className="text-white font-bold text-xs">N</span>
                    </div>
                    <span className="text-base font-display font-semibold text-[var(--nimmit-text-primary)]">
                        Nimmit
                    </span>
                </Link>
                <NotificationBell onNotificationClick={() => { }} />
            </header>

            {/* Overlay */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={() => setOpen(false)}
                >
                    <aside
                        className="w-[280px] h-full bg-[var(--nimmit-bg-primary)] animate-slide-in-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--nimmit-border)]">
                            <Link href={dashboardPath} className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[var(--nimmit-accent-primary)] flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">N</span>
                                </div>
                                <span className="text-lg font-display font-semibold text-[var(--nimmit-text-primary)]">
                                    Nimmit
                                </span>
                            </Link>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-2 text-[var(--nimmit-text-tertiary)] hover:text-[var(--nimmit-text-primary)]"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <nav className="p-4 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                    transition-colors
                    ${item.isActive(pathname)
                                            ? "bg-[var(--nimmit-bg-secondary)] text-[var(--nimmit-text-primary)]"
                                            : "text-[var(--nimmit-text-secondary)] hover:bg-[var(--nimmit-bg-secondary)]"
                                        }
                  `}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {item.icon}
                                    </svg>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </>
    );
}

function getNavItems(role: string, dashboardPath: string) {
    const items = [
        {
            href: dashboardPath,
            label: "Dashboard",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
            isActive: (p: string) => p.includes("/dashboard"),
        },
    ];

    if (role === "client") {
        items.push(
            {
                href: "/client/brief",
                label: "New Brief",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
                isActive: (p: string) => p === "/client/brief",
            },
            {
                href: "/client/jobs",
                label: "Jobs",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
                isActive: (p: string) => p.includes("/jobs") && !p.includes("/brief"),
            }
        );
    }

    if (role === "worker") {
        items.push({
            href: "/worker/jobs",
            label: "Jobs",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
            isActive: (p: string) => p.includes("/jobs"),
        });
    }

    if (role === "admin") {
        items.push(
            {
                href: "/admin/jobs",
                label: "All Jobs",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
                isActive: (p: string) => p === "/admin/jobs",
            },
            {
                href: "/admin/team",
                label: "Team",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
                isActive: (p: string) => p === "/admin/team",
            },
            {
                href: "/admin/analytics",
                label: "Analytics",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                isActive: (p: string) => p === "/admin/analytics",
            }
        );
    }

    return items;
}
