"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isChecking, setIsChecking] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      if (status === "loading") return;

      // Only check for clients
      if (!session?.user || session.user.role !== "client") {
        setIsChecking(false);
        return;
      }

      // Skip check if already on onboarding page
      if (pathname === "/client/onboarding") {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch("/api/onboarding");
        const data = await response.json();

        if (data.success) {
          setOnboardingCompleted(data.data.onboardingCompleted);

          // Redirect to onboarding if not completed
          if (!data.data.onboardingCompleted) {
            router.push("/client/onboarding");
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
      } finally {
        setIsChecking(false);
      }
    }

    checkOnboarding();
  }, [session, status, pathname, router]);

  // Show loading state while checking
  if (status === "loading" || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--nimmit-bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--nimmit-accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--nimmit-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If on onboarding page, always show content
  if (pathname === "/client/onboarding") {
    return <>{children}</>;
  }

  // If onboarding not completed, don't render children (redirect will happen)
  if (onboardingCompleted === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--nimmit-bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--nimmit-accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--nimmit-text-secondary)]">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
