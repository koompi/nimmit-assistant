import { getChatCompletion, getJSONCompletion, type ChatMessage } from "./openai";
import { retrieveContext, type ContextItem } from "./context";
import type { BriefingMessage, ExtractedBrief } from "@/lib/db/models/briefing";
import type { JobCategory } from "@/types";

// ===========================================
// Category-Specific Questions
// ===========================================

const CATEGORY_QUESTIONS: Record<JobCategory, string[]> = {
  video: [
    "What's the target length of the video?",
    "Do you have raw footage, or do you need stock footage?",
    "What style are you going for? (e.g., fast-paced, cinematic, tutorial)",
    "Where will this video be published?",
    "Do you have any brand guidelines or color preferences?",
  ],
  design: [
    "What are the dimensions/size requirements?",
    "Do you have brand colors and fonts to use?",
    "What's the main message or call-to-action?",
    "Where will this design be used? (print, web, social)",
    "Any reference designs or styles you like?",
  ],
  web: [
    "Is this a new page or updates to an existing one?",
    "What platform is the site built on?",
    "Do you have the content ready, or do you need copy as well?",
    "Any specific functionality needed? (forms, animations, etc.)",
    "Do you have designs/mockups, or need design too?",
  ],
  social: [
    "Which platforms is this for?",
    "How many posts/pieces do you need?",
    "What's the posting schedule or deadline?",
    "Do you have brand voice guidelines?",
    "Any specific topics or themes to cover?",
  ],
  admin: [
    "What format should the output be in?",
    "How much data are we working with?",
    "Are there any specific tools or templates to use?",
    "What's the level of detail needed?",
    "Any recurring aspects to this task?",
  ],
  other: [
    "Can you describe the expected output in more detail?",
    "What tools or software might be involved?",
    "Any specific requirements or constraints?",
    "Who is the audience for this deliverable?",
  ],
};

// ===========================================
// System Prompts
// ===========================================

function buildSystemPrompt(
  contextItems: ContextItem[],
  currentBrief?: Partial<ExtractedBrief>
): string {
  let prompt = `You are a helpful briefing assistant for Nimmit, a virtual assistant service. Your job is to have a natural conversation with the client to understand their task requirements.

## Your Role
- Ask clarifying questions ONE at a time
- Be conversational and friendly, but efficient
- Extract key information: what they need, format, deadline, specific requirements
- Once you have enough information, provide a clear summary

## Guidelines
- Keep responses concise (2-3 sentences max, unless summarizing)
- Ask the most important clarifying question based on what's missing
- If you can detect the category, ask category-specific questions
- Don't repeat information the client has already provided
- When you have enough info (after 3-5 exchanges), offer to summarize

## Categories
- video: Video editing, motion graphics, YouTube content
- design: Graphic design, logos, banners, presentations
- web: Website development, landing pages, web apps
- social: Social media content, captions, scheduling
- admin: Data entry, research, spreadsheets, documents
- other: Anything that doesn't fit above`;

  // Add client context if available
  if (contextItems.length > 0) {
    prompt += `\n\n## Client Context (from past work)
This client has worked with Nimmit before. Here's relevant context:
`;
    contextItems.forEach((item) => {
      prompt += `\n- ${item.content.slice(0, 200)}`;
    });
    prompt += `\n\nUse this context to personalize your questions and avoid asking for information we already know.`;
  }

  // Add current brief state if available
  if (currentBrief) {
    prompt += `\n\n## Currently Extracted Information
`;
    if (currentBrief.title) prompt += `- Title: ${currentBrief.title}\n`;
    if (currentBrief.category) prompt += `- Category: ${currentBrief.category}\n`;
    if (currentBrief.keyRequirements?.length) {
      prompt += `- Requirements: ${currentBrief.keyRequirements.join(", ")}\n`;
    }
    prompt += `\nAsk about what's still missing or unclear.`;
  }

  return prompt;
}

// ===========================================
// Generate Next Response
// ===========================================

export interface GenerateResponseParams {
  clientId: string;
  messages: BriefingMessage[];
  contextItems?: ContextItem[];
  currentBrief?: Partial<ExtractedBrief>;
}

export async function generateBriefingResponse(
  params: GenerateResponseParams
): Promise<string> {
  const { clientId, messages, contextItems = [], currentBrief } = params;

  const systemPrompt = buildSystemPrompt(contextItems, currentBrief);

  // Convert messages to OpenAI format
  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await getChatCompletion(chatMessages, {
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 300,
  });

  return response;
}

// ===========================================
// Extract Brief from Conversation
// ===========================================

export interface ExtractBriefResult {
  brief: ExtractedBrief | null;
  isComplete: boolean;
  missingFields: string[];
}

export async function extractBriefFromConversation(
  messages: BriefingMessage[]
): Promise<ExtractBriefResult> {
  const extractionPrompt = `Analyze this conversation and extract job brief information.

## Conversation
${messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}

## Instructions
Extract as much information as possible. Return JSON with:
{
  "title": "Short descriptive title (max 100 chars)",
  "description": "Full description with all requirements",
  "category": "video|design|web|social|admin|other",
  "priority": "standard|priority|rush",
  "estimatedHours": null or number,
  "keyRequirements": ["requirement 1", "requirement 2"],
  "deliverables": ["expected output 1", "expected output 2"],
  "confidence": 0.0-1.0 (how complete is the brief?),
  "missingFields": ["what's still needed to know"]
}

If any field cannot be determined, use reasonable defaults or null.
Priority defaults to "standard" unless urgency is mentioned.`;

  const result = await getJSONCompletion<{
    title: string;
    description: string;
    category: JobCategory;
    priority: "standard" | "priority" | "rush";
    estimatedHours: number | null;
    keyRequirements: string[];
    deliverables: string[];
    confidence: number;
    missingFields: string[];
  }>(
    [
      { role: "system", content: "You are a JSON extraction assistant. Always return valid JSON." },
      { role: "user", content: extractionPrompt },
    ],
    { temperature: 0.2 }
  );

  // Determine if brief is complete enough
  const isComplete = Boolean(
    result.confidence >= 0.7 &&
    result.title &&
    result.description &&
    result.category
  );

  if (!result.title || !result.description || !result.category) {
    return {
      brief: null,
      isComplete: false,
      missingFields: result.missingFields || ["title", "description", "category"],
    };
  }

  return {
    brief: {
      title: result.title,
      description: result.description,
      category: result.category,
      priority: result.priority || "standard",
      estimatedHours: result.estimatedHours || undefined,
      keyRequirements: result.keyRequirements || [],
      deliverables: result.deliverables || [],
      confidence: result.confidence,
    },
    isComplete,
    missingFields: result.missingFields || [],
  };
}

// ===========================================
// Get Suggested Follow-up
// ===========================================

export function getSuggestedQuestion(
  category: JobCategory | undefined,
  extractionResult: ExtractBriefResult
): string | null {
  const { missingFields } = extractionResult;

  if (missingFields.length === 0) return null;

  // If we know the category, use category-specific questions
  if (category && CATEGORY_QUESTIONS[category]) {
    const questions = CATEGORY_QUESTIONS[category];
    // Return first question that might address a missing field
    return questions[0];
  }

  // Generic questions based on missing fields
  if (missingFields.includes("deadline") || missingFields.includes("timeline")) {
    return "When do you need this completed?";
  }
  if (missingFields.includes("format") || missingFields.includes("specifications")) {
    return "What format or specifications do you need for the final deliverable?";
  }
  if (missingFields.includes("audience") || missingFields.includes("purpose")) {
    return "Who is the target audience for this?";
  }

  return null;
}

// ===========================================
// Fetch Client Context
// ===========================================

export async function fetchClientContext(
  clientId: string,
  currentMessage: string
): Promise<ContextItem[]> {
  try {
    const context = await retrieveContext(clientId, currentMessage, 3);
    return context;
  } catch {
    // If context retrieval fails (e.g., Pinecone not configured), return empty
    return [];
  }
}

// ===========================================
// Generate Summary Message
// ===========================================

export function generateSummaryMessage(brief: ExtractedBrief): string {
  const priorityLabels = {
    standard: "Standard (48 hours)",
    priority: "Priority (24 hours)",
    rush: "Rush (12 hours)",
  };

  const categoryLabels: Record<JobCategory, string> = {
    video: "Video Editing",
    design: "Graphic Design",
    web: "Web Development",
    social: "Social Media",
    admin: "Admin Tasks",
    other: "Other",
  };

  let summary = `Here's what I've captured:\n\n`;
  summary += `**${brief.title}**\n\n`;
  summary += `${brief.description}\n\n`;
  summary += `**Category:** ${categoryLabels[brief.category]}\n`;
  summary += `**Priority:** ${priorityLabels[brief.priority]}\n`;

  if (brief.keyRequirements.length > 0) {
    summary += `\n**Key Requirements:**\n`;
    brief.keyRequirements.forEach((req) => {
      summary += `• ${req}\n`;
    });
  }

  if (brief.deliverables.length > 0) {
    summary += `\n**Deliverables:**\n`;
    brief.deliverables.forEach((del) => {
      summary += `• ${del}\n`;
    });
  }

  if (brief.estimatedHours) {
    summary += `\n**Estimated Time:** ${brief.estimatedHours} hours\n`;
  }

  summary += `\nDoes this look right? You can submit or start over.`;

  return summary;
}
