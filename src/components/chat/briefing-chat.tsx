"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RotateCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { JobCategory, JobPriority } from "@/types";
import type { ExtractedBrief } from "@/lib/db/models/briefing";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface BriefingState {
  briefingId: string | null;
  messages: Message[];
  extractedBrief: ExtractedBrief | null;
  isComplete: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
}

const categoryLabels: Record<JobCategory, string> = {
  video: "Video Editing",
  design: "Graphic Design",
  web: "Web Development",
  social: "Social Media",
  admin: "Admin Tasks",
  other: "Other",
};

const priorityLabels: Record<JobPriority, string> = {
  standard: "Standard (48 hours)",
  priority: "Priority (24 hours)",
  rush: "Rush (12 hours)",
};

export function BriefingChat() {
  const router = useRouter();
  const [state, setState] = useState<BriefingState>({
    briefingId: null,
    messages: [],
    extractedBrief: null,
    isComplete: false,
    isLoading: true,
    isSubmitting: false,
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Focus input when loading is done
  useEffect(() => {
    if (!state.isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isLoading]);

  // Load existing briefing session on mount
  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    try {
      const response = await fetch("/api/briefing");
      const result = await response.json();

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          briefingId: result.data.briefingId,
          messages: result.data.messages.map((m: Message, i: number) => ({
            ...m,
            id: `msg-${i}`,
          })),
          extractedBrief: result.data.extractedBrief || null,
          isLoading: false,
        }));
      } else {
        // No active briefing - start fresh with welcome message
        setState((prev) => ({
          ...prev,
          messages: [
            {
              id: "welcome",
              role: "assistant",
              content:
                "Hi! I'm here to help capture your task. What do you need done today?",
            },
          ],
          isLoading: false,
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        messages: [
          {
            id: "welcome",
            role: "assistant",
            content:
              "Hi! I'm here to help capture your task. What do you need done today?",
          },
        ],
        isLoading: false,
      }));
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || state.isLoading || state.isSubmitting) return;

    const userMessage = input.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistically add user message
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { id: tempId, role: "user", content: userMessage },
      ],
      isLoading: true,
    }));
    setInput("");

    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          briefingId: state.briefingId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.error || "Failed to send message");
      }

      setState((prev) => ({
        ...prev,
        briefingId: result.data.briefingId,
        messages: [
          ...prev.messages,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.data.message,
          },
        ],
        extractedBrief: result.data.extractedBrief || null,
        isComplete: result.data.isComplete || false,
        isLoading: false,
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!state.briefingId || !state.extractedBrief) {
      toast.error("Please complete the briefing first");
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch("/api/briefing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingId: state.briefingId }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.code === "INSUFFICIENT_CREDITS") {
          toast.error(
            `Not enough credits. Required: ${result.error.details.required}, Available: ${result.error.details.available}`
          );
        } else {
          throw new Error(result.error?.message || result.error || "Failed to submit");
        }
        setState((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      toast.success("Task created successfully!");

      // Add success message
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: `success-${Date.now()}`,
            role: "assistant",
            content: `Your task has been created! Redirecting to job details...`,
          },
        ],
      }));

      // Redirect to job
      setTimeout(() => {
        router.push(`/client/jobs/${result.data.jobId}`);
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create task"
      );
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleReset = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await fetch("/api/briefing", { method: "DELETE" });

      setState({
        briefingId: null,
        messages: [
          {
            id: "welcome",
            role: "assistant",
            content:
              "No problem! Let's start fresh. What do you need done today?",
          },
        ],
        extractedBrief: null,
        isComplete: false,
        isLoading: false,
        isSubmitting: false,
      });
      setInput("");
    } catch {
      toast.error("Failed to reset. Please try again.");
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render loading state
  if (state.isLoading && state.messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-2xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {state.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {state.isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action buttons when brief is complete */}
      {state.isComplete && state.extractedBrief && !state.isSubmitting && (
        <div className="border-t p-4">
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={state.isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button onClick={handleSubmit} disabled={state.isLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Task
            </Button>
          </div>
        </div>
      )}

      {/* Input - only show when not complete or submitting */}
      {!state.isComplete && !state.isSubmitting && (
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your task..."
              disabled={state.isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || state.isLoading}
              size="icon"
            >
              {state.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Brief preview card */}
      {state.extractedBrief && (
        <div className="border-t p-4 bg-muted/50">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Brief Preview</h4>
              <Badge variant={state.isComplete ? "default" : "secondary"}>
                {Math.round(state.extractedBrief.confidence * 100)}% complete
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              {state.extractedBrief.title && (
                <p>
                  <span className="text-muted-foreground">Title:</span>{" "}
                  {state.extractedBrief.title}
                </p>
              )}
              {state.extractedBrief.category && (
                <p>
                  <span className="text-muted-foreground">Category:</span>{" "}
                  {categoryLabels[state.extractedBrief.category]}
                </p>
              )}
              {state.extractedBrief.priority && (
                <p>
                  <span className="text-muted-foreground">Priority:</span>{" "}
                  {priorityLabels[state.extractedBrief.priority]}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Reset button at bottom */}
      {state.messages.length > 1 && !state.isComplete && (
        <div className="border-t p-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={state.isLoading}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}
