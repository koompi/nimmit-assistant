import { BriefingChat } from "@/components/chat/briefing-chat";

export default function BriefPage() {
  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="flex-none py-3 px-4 border-b border-[var(--nimmit-border)] bg-[var(--nimmit-bg-primary)]">
        <h1 className="text-lg font-semibold font-display text-[var(--nimmit-text-primary)]">Briefing Room</h1>
        <p className="text-xs text-[var(--nimmit-text-tertiary)]">
          Tell us what you need and we'll take care of the rest.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <BriefingChat />
      </div>
    </div>
  );
}
