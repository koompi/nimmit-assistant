"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/shared/notification-bell";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-50 w-full border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link
            href={dashboardPath}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--nimmit-accent-primary)] flex items-center justify-center group-hover:shadow-md transition-shadow">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-display font-semibold text-[var(--nimmit-text-primary)] hidden sm:inline">
              Nimmit
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={item.isActive(pathname)}
                icon={item.icon}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Real-time Notifications */}
          <NotificationBell
            onNotificationClick={(notification) => {
              // Navigate to job if notification has jobId
              if (notification.data?.jobId) {
                const role = user.role === 'admin' ? 'admin' : user.role;
                window.location.href = `/${role}/jobs/${notification.data.jobId}`;
              }
            }}
          />

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full hover:bg-[var(--nimmit-bg-secondary)] transition-colors"
              >
                <Avatar className="h-10 w-10 border-2 border-[var(--nimmit-border)]">
                  <AvatarFallback className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 bg-[var(--nimmit-bg-elevated)] border-[var(--nimmit-border)] shadow-soft-lg"
            >
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10 border border-[var(--nimmit-border)]">
                  <AvatarFallback className="bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--nimmit-text-primary)] truncate">{user.name}</p>
                  <p className="text-xs text-[var(--nimmit-text-tertiary)] truncate">{user.email}</p>
                </div>
                <RoleBadge role={user.role} />
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
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--nimmit-border)] bg-[var(--nimmit-bg-elevated)] animate-fade-down">
          <nav className="flex flex-col p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.isActive(pathname)
                  ? "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]"
                  : "text-[var(--nimmit-text-secondary)] hover:bg-[var(--nimmit-bg-secondary)]"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
        ? "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]"
        : "text-[var(--nimmit-text-secondary)] hover:text-[var(--nimmit-text-primary)] hover:bg-[var(--nimmit-bg-secondary)]"
        }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
      {children}
    </Link>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-[var(--nimmit-accent-secondary)]/10 text-[var(--nimmit-accent-secondary)]",
    worker: "bg-[var(--nimmit-accent-tertiary)]/10 text-[var(--nimmit-accent-tertiary)]",
    client: "bg-[var(--nimmit-accent-primary)]/10 text-[var(--nimmit-accent-primary)]",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[role]}`}>
      {role}
    </span>
  );
}

// Old NotificationBell removed - now using real-time version from notification-bell.tsx

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
