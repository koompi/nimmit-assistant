import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/connection";
import { Briefing, Job, User } from "@/lib/db/models";
import { logger } from "@/lib/logger";
import {
  generateBriefingResponse,
  extractBriefFromConversation,
  fetchClientContext,
  generateSummaryMessage,
} from "@/lib/ai/briefing-engine";
import { calculateJobCost, checkCredits } from "@/lib/payments/credits";

// ===========================================
// POST /api/briefing - Send a message
// ===========================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { message, briefingId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find or create briefing session
    let briefing;
    if (briefingId) {
      briefing = await Briefing.findOne({
        _id: briefingId,
        clientId: session.user.id,
        status: "active",
      });
      if (!briefing) {
        return NextResponse.json(
          { success: false, error: "Briefing session not found" },
          { status: 404 }
        );
      }
    } else {
      // Check for existing active briefing
      briefing = await Briefing.findOne({
        clientId: session.user.id,
        status: "active",
      });

      if (!briefing) {
        // Create new briefing session
        briefing = new Briefing({
          clientId: session.user.id,
          messages: [
            {
              role: "assistant",
              content: "Hi! I'm here to help capture your task. What do you need done today?",
              timestamp: new Date(),
            },
          ],
          status: "active",
        });
        await briefing.save();
      }
    }

    // Add user message
    briefing.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    // Fetch client context for personalization
    const contextItems = await fetchClientContext(session.user.id, message);
    if (contextItems.length > 0) {
      briefing.contextSummary = contextItems
        .map((c) => c.content.slice(0, 100))
        .join("\n");
    }

    // Extract brief from conversation so far
    const extractionResult = await extractBriefFromConversation(briefing.messages);

    // Update extracted brief if we got one
    if (extractionResult.brief) {
      briefing.extractedBrief = extractionResult.brief;
    }

    // Generate AI response
    let assistantResponse: string;

    if (extractionResult.isComplete && extractionResult.brief) {
      // Brief is complete - generate summary
      assistantResponse = generateSummaryMessage(extractionResult.brief);
    } else {
      // Continue conversation
      assistantResponse = await generateBriefingResponse({
        clientId: session.user.id,
        messages: briefing.messages,
        contextItems,
        currentBrief: extractionResult.brief || undefined,
      });
    }

    // Add assistant response
    briefing.messages.push({
      role: "assistant",
      content: assistantResponse,
      timestamp: new Date(),
    });

    await briefing.save();

    return NextResponse.json({
      success: true,
      data: {
        briefingId: briefing._id.toString(),
        message: assistantResponse,
        extractedBrief: briefing.extractedBrief,
        isComplete: extractionResult.isComplete,
        missingFields: extractionResult.missingFields,
      },
    });
  } catch (error) {
    logger.error("Briefing", "Error processing message", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET /api/briefing - Get current briefing session
// ===========================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find active briefing for this client
    const briefing = await Briefing.findOne({
      clientId: session.user.id,
      status: "active",
    }).lean();

    if (!briefing) {
      // Return empty state - client can start a new briefing
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        briefingId: briefing._id.toString(),
        messages: briefing.messages,
        extractedBrief: briefing.extractedBrief,
        status: briefing.status,
      },
    });
  } catch (error) {
    logger.error("Briefing", "Error fetching briefing", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE /api/briefing - Abandon/reset briefing
// ===========================================

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Mark current active briefing as abandoned
    await Briefing.updateOne(
      { clientId: session.user.id, status: "active" },
      { status: "abandoned" }
    );

    return NextResponse.json({
      success: true,
      message: "Briefing session reset",
    });
  } catch (error) {
    logger.error("Briefing", "Error resetting briefing", { error: String(error) });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
