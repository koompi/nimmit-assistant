import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
    code?: "404" | "500" | "403";
    title?: string;
    description?: string;
    showHome?: boolean;
}

const errorConfig = {
    "404": {
        title: "Page not found",
        description: "Sorry, we couldn't find the page you're looking for.",
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        ),
    },
    "500": {
        title: "Something went wrong",
        description: "We're having trouble processing your request. Please try again.",
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        ),
    },
    "403": {
        title: "Access denied",
        description: "You don't have permission to view this page.",
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        ),
    },
};

export function ErrorPage({ code = "404", title, description, showHome = true }: ErrorPageProps) {
    const config = errorConfig[code];

    return (
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
            {/* Decorative background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[var(--nimmit-accent-primary)]/5 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[var(--nimmit-accent-tertiary)]/5 blur-3xl" />
            </div>

            <div className="relative text-center max-w-md animate-scale-in">
                {/* Error code visual */}
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--nimmit-error-bg)] mb-4">
                        <svg
                            className="w-10 h-10 text-[var(--nimmit-error)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {config.icon}
                        </svg>
                    </div>
                    <p className="text-6xl font-display font-bold text-[var(--nimmit-text-primary)]">
                        {code}
                    </p>
                </div>

                {/* Error message */}
                <h1 className="text-2xl font-display font-semibold text-[var(--nimmit-text-primary)] mb-3">
                    {title || config.title}
                </h1>
                <p className="text-[var(--nimmit-text-secondary)] mb-8">
                    {description || config.description}
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto border-[var(--nimmit-border)]"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go back
                    </Button>
                    {showHome && (
                        <Link href="/">
                            <Button className="w-full sm:w-auto bg-[var(--nimmit-accent-primary)] hover:bg-[var(--nimmit-accent-primary-hover)]">
                                Return home
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

// Export for Next.js error pages
export function NotFound() {
    return <ErrorPage code="404" />;
}

export function ServerError() {
    return <ErrorPage code="500" />;
}

export function Forbidden() {
    return <ErrorPage code="403" />;
}
