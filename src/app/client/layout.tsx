"use client";

import { usePathname } from "next/navigation";
import { Sidebar, SidebarProvider, MobileSidebar } from "@/components/shared/sidebar";
import { OnboardingGuard } from "@/components/shared/onboarding-guard";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboardingPage = pathname === "/client/onboarding";

  // Onboarding page has its own layout
  if (isOnboardingPage) {
    return (
      <OnboardingGuard>
        {children}
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard>
      <SidebarProvider>
        {/* Desktop Layout - Google AI Studio Tinted Background */}
        <div className="hidden md:flex h-screen overflow-hidden bg-[#f0f4f9]">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
          </main>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden min-h-screen bg-[#f0f4f9]">
          <MobileSidebar />
          <main className="px-4 py-6">{children}</main>
        </div>
      </SidebarProvider>
    </OnboardingGuard>
  );
}
