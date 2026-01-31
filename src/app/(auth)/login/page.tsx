"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"client" | "worker">("client");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const tabContent = {
    client: {
      title: "Welcome back",
      subtitle: "Sign in to continue to Nimmit",
    },
    worker: {
      title: "Worker Portal",
      subtitle: "Sign in to access your assignments",
    },
  };

  return (
    <Card className="w-full max-w-[380px] bg-white border-none shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:rounded-2xl overflow-hidden animate-fade-up">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "client" | "worker")}
        className="w-full"
      >
        {/* Role Tabs */}
        <div className="px-8 pt-6">
          <TabsList className="w-full h-10 bg-[#F5F2F0] rounded-lg p-1">
            <TabsTrigger
              value="client"
              className="flex-1 h-8 text-[13px] font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-[#1F1F1F] data-[state=active]:shadow-sm text-[#6B6B6B] transition-all duration-200"
            >
              Client
            </TabsTrigger>
            <TabsTrigger
              value="worker"
              className="flex-1 h-8 text-[13px] font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-[#1F1F1F] data-[state=active]:shadow-sm text-[#6B6B6B] transition-all duration-200"
            >
              Worker
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="client" className="mt-0">
          <CardHeader className="space-y-4 text-center pb-2 pt-6">
            {/* Logo/Brand - Minimalist Scale */}
            <div className="mx-auto mb-2">
              <div className="w-9 h-9 rounded-[8px] bg-[#D45A45] flex items-center justify-center text-white font-bold text-lg font-display shadow-sm">
                N
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-[28px] font-[family-name:var(--font-source-serif)] font-normal text-[#1F1F1F] tracking-tight">
                {tabContent.client.title}
              </CardTitle>
              <CardDescription className="text-[#8e8e8e] text-[15px]">
                {tabContent.client.subtitle}
              </CardDescription>
            </div>
          </CardHeader>
        </TabsContent>

        <TabsContent value="worker" className="mt-0">
          <CardHeader className="space-y-4 text-center pb-2 pt-6">
            {/* Logo/Brand - Minimalist Scale */}
            <div className="mx-auto mb-2">
              <div className="w-9 h-9 rounded-[8px] bg-[#D45A45] flex items-center justify-center text-white font-bold text-lg font-display shadow-sm">
                N
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-[28px] font-[family-name:var(--font-source-serif)] font-normal text-[#1F1F1F] tracking-tight">
                {tabContent.worker.title}
              </CardTitle>
              <CardDescription className="text-[#8e8e8e] text-[15px]">
                {tabContent.worker.subtitle}
              </CardDescription>
            </div>
          </CardHeader>
        </TabsContent>
      </Tabs>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-4 px-8">
          {/* KOOMPI ID Button - Primary Call to Action */}
          <Button
            type="button"
            onClick={() => signIn("kid", { callbackUrl })}
            className="w-full h-[44px] text-[15px] font-medium bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)] text-white
                       shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-200 rounded-lg flex items-center justify-center gap-2.5"
          >
            <svg className="w-5 h-5 opacity-90" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            Sign in with KOOMPI ID
          </Button>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#F0F0F0]" />
            </div>
            <div className="relative flex justify-center text-[11px] font-medium tracking-wide uppercase text-[#9CA3AF]">
              <span className="bg-white px-3">
                OR
              </span>
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-[13px] font-medium text-[#4B4B4B]"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@work-email.com"
              autoComplete="email"
              className="h-[44px] bg-[#FFFFFF] border-[#E5E5E5] focus:border-[#A3A3A3] focus:ring-1 focus:ring-[#A3A3A3]
                         placeholder:text-[#A1A1AA] text-[#1F1F1F] rounded-lg transition-all duration-200 shadow-sm"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-500 animate-fade-in pl-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label
                htmlFor="password"
                className="text-[13px] font-medium text-[#4B4B4B]"
              >
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-[12px] font-medium text-[#D45A45] hover:text-[#B0462B] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              className="h-[44px] bg-[#FFFFFF] border-[#E5E5E5] focus:border-[#A3A3A3] focus:ring-1 focus:ring-[#A3A3A3]
                         placeholder:text-[#A1A1AA] text-[#1F1F1F] rounded-lg transition-all duration-200 shadow-sm"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-red-500 animate-fade-in pl-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-100 p-2.5 animate-fade-in">
              <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-[44px] text-[15px] font-medium bg-[#1F1F1F] hover:bg-[#000000] text-white
                       rounded-lg shadow-sm transition-all duration-200
                       disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue with Email"}
          </Button>

        </CardContent>

        <CardFooter className="flex flex-col items-center gap-3 pb-8 pt-2">
          <p className="text-[13px] text-[#6B6B6B]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[#D45A45] hover:text-[#B0462B] transition-colors">
              Sign up
            </Link>
          </p>

          {/* Worker-specific link */}
          {activeTab === "worker" && (
            <Link
              href="/careers"
              className="text-[13px] text-[#6B6B6B] hover:text-[#D45A45] transition-colors animate-fade-in"
            >
              Not a worker yet? <span className="font-medium text-[#D45A45]">Apply to join our team</span> &rarr;
            </Link>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full max-w-[380px] h-[520px] bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#1F1F1F] rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F2F0] p-4 font-[family-name:var(--font-dm-sans)]">
      <Suspense fallback={<LoadingSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
