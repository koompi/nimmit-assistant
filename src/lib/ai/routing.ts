import { getJSONCompletion } from "./openai";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import type { SkillLevel } from "@/types";

// ===========================================
// Types
// ===========================================

export interface JobAnalysis {
  requiredSkills: string[];
  complexity: "simple" | "medium" | "complex";
  estimatedHours: number;
  confidence: number;
}

export interface WorkerScore {
  workerId: string;
  workerName: string;
  score: number;
  breakdown: {
    skillMatch: number;
    availability: number;
    performance: number;
    workload: number;
  };
}

interface WorkerData {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  workerProfile: {
    skills: string[];
    skillLevels?: Map<string, SkillLevel> | Record<string, SkillLevel>;
    availability: "available" | "busy" | "offline";
    currentJobCount: number;
    maxConcurrentJobs: number;
    stats: {
      completedJobs: number;
      avgRating: number;
    };
  };
}

// ===========================================
// Constants
// ===========================================

const SCORE_WEIGHTS = {
  skillMatch: 0.4,
  availability: 0.25,
  performance: 0.2,
  workload: 0.15,
};

const AUTO_ASSIGN_THRESHOLD = 0.7;

const SKILL_LEVEL_MULTIPLIERS: Record<SkillLevel, number> = {
  junior: 0.6,
  mid: 0.8,
  senior: 1.0,
};

const COMPLEXITY_MIN_LEVEL: Record<string, SkillLevel> = {
  simple: "junior",
  medium: "mid",
  complex: "senior",
};

// ===========================================
// Job Analysis
// ===========================================

import { STANDARDIZED_SKILLS } from "@/lib/constants/skills";

// ...

/**
 * Analyze a job description to extract required skills, complexity, and estimated hours
 */
export async function analyzeJob(
  title: string,
  description: string,
  category: string
): Promise<JobAnalysis> {
  const validSkills = STANDARDIZED_SKILLS.map(s => `"${s.id}" (${s.label})`).join(", ");

  const systemPrompt = `You are a job analysis expert. Analyze the given job and extract:
1. Required skills from this specific list: [${validSkills}]. Only use skills from this list. If a required skill is not in the list, choose the closest match or omit it.
2. Complexity level (simple, medium, or complex)
3. Estimated hours to complete
4. Your confidence in this analysis (0-1)

Respond in JSON format with this exact structure:
{
  "requiredSkills": ["skill-id-1", "skill-id-2"],
  "complexity": "simple" | "medium" | "complex",
  "estimatedHours": number,
  "confidence": number
}`;

  const userPrompt = `Category: ${category}
Title: ${title}

Description:
${description}`;

  try {
    const analysis = await getJSONCompletion<JobAnalysis>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2 } // Lower temperature for more deterministic skill selection
    );

    // Validate and normalize the response
    return {
      requiredSkills: Array.isArray(analysis.requiredSkills)
        ? analysis.requiredSkills.filter(s => STANDARDIZED_SKILLS.some(valid => valid.id === s))
        : [],
      complexity: ["simple", "medium", "complex"].includes(analysis.complexity)
        ? analysis.complexity
        : "medium",
      estimatedHours: typeof analysis.estimatedHours === "number" && analysis.estimatedHours > 0
        ? analysis.estimatedHours
        : 4,
      confidence: typeof analysis.confidence === "number"
        ? Math.min(1, Math.max(0, analysis.confidence))
        : 0.5,
    };
  } catch (error) {
    console.error("Job analysis error:", error);
    // Return a safe default
    return {
      requiredSkills: [],
      complexity: "medium",
      estimatedHours: 4,
      confidence: 0.3,
    };
  }
}

// ===========================================
// Worker Scoring
// ===========================================

function getSkillLevel(
  worker: WorkerData,
  skill: string
): SkillLevel | undefined {
  const skillLevels = worker.workerProfile.skillLevels;
  if (!skillLevels) return undefined;

  // Handle both Map and plain object
  if (skillLevels instanceof Map) {
    return skillLevels.get(skill);
  }
  return skillLevels[skill];
}

function calculateSkillMatch(
  worker: WorkerData,
  analysis: JobAnalysis
): number {
  if (analysis.requiredSkills.length === 0) return 0.5;

  const workerSkills = worker.workerProfile.skills.map((s) => s.toLowerCase());
  let matchScore = 0;
  let maxPossibleScore = 0;

  for (const requiredSkill of analysis.requiredSkills) {
    maxPossibleScore += 1;

    // Check if worker has the skill
    const hasSkill = workerSkills.some(
      (ws) => ws.includes(requiredSkill) || requiredSkill.includes(ws)
    );

    if (hasSkill) {
      const level = getSkillLevel(worker, requiredSkill) || "mid";
      const minLevel = COMPLEXITY_MIN_LEVEL[analysis.complexity];

      // Get level multiplier
      let multiplier = SKILL_LEVEL_MULTIPLIERS[level];

      // Bonus for senior on complex, penalty for junior on complex
      if (analysis.complexity === "complex" && level === "junior") {
        multiplier *= 0.7;
      } else if (analysis.complexity === "simple" && level === "senior") {
        // Senior can easily handle simple tasks
        multiplier = 1.0;
      }

      matchScore += multiplier;
    }
  }

  return maxPossibleScore > 0 ? matchScore / maxPossibleScore : 0;
}

function calculateAvailabilityScore(worker: WorkerData): number {
  switch (worker.workerProfile.availability) {
    case "available":
      return 1.0;
    case "busy":
      return 0.3;
    case "offline":
      return 0;
    default:
      return 0;
  }
}

function calculatePerformanceScore(worker: WorkerData): number {
  const { completedJobs, avgRating } = worker.workerProfile.stats;

  // Base score from rating (0-5 scale normalized to 0-1)
  let score = avgRating / 5;

  // Experience bonus (up to 20%)
  const experienceBonus = Math.min(completedJobs / 50, 0.2);
  score += experienceBonus;

  return Math.min(1, score);
}

function calculateWorkloadScore(worker: WorkerData): number {
  const { currentJobCount, maxConcurrentJobs } = worker.workerProfile;

  // Full score if no jobs, decreasing as jobs increase
  const utilization = currentJobCount / maxConcurrentJobs;

  // Can't assign if at capacity
  if (currentJobCount >= maxConcurrentJobs) return 0;

  return 1 - utilization;
}

/**
 * Score all available workers for a job
 */
export async function scoreWorkers(
  analysis: JobAnalysis
): Promise<WorkerScore[]> {
  await connectDB();

  // Get all active workers who are not at capacity
  const workers = (await User.find({
    role: "worker",
    isActive: true,
    "workerProfile.availability": { $ne: "offline" },
    // Enforce concurrent job limit - only include workers with capacity
    $expr: {
      $lt: [
        "$workerProfile.currentJobCount",
        "$workerProfile.maxConcurrentJobs"
      ]
    }
  }).lean()) as unknown as WorkerData[];

  const scores: WorkerScore[] = [];

  for (const worker of workers) {
    // Double-check capacity (belt and suspenders)
    if (worker.workerProfile.currentJobCount >= worker.workerProfile.maxConcurrentJobs) {
      continue;
    }
    const breakdown = {
      skillMatch: calculateSkillMatch(worker, analysis),
      availability: calculateAvailabilityScore(worker),
      performance: calculatePerformanceScore(worker),
      workload: calculateWorkloadScore(worker),
    };

    // Calculate weighted score
    const score =
      breakdown.skillMatch * SCORE_WEIGHTS.skillMatch +
      breakdown.availability * SCORE_WEIGHTS.availability +
      breakdown.performance * SCORE_WEIGHTS.performance +
      breakdown.workload * SCORE_WEIGHTS.workload;

    scores.push({
      workerId: worker._id.toString(),
      workerName: `${worker.profile.firstName} ${worker.profile.lastName}`,
      score,
      breakdown,
    });
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

// ===========================================
// Auto Assignment
// ===========================================

export interface AutoAssignResult {
  assigned: boolean;
  workerId?: string;
  workerName?: string;
  score?: number;
  reason: string;
}

/**
 * Attempt to auto-assign a job to the best matching worker
 */
export async function autoAssignJob(
  title: string,
  description: string,
  category: string
): Promise<AutoAssignResult> {
  try {
    // Analyze the job
    const analysis = await analyzeJob(title, description, category);

    // If low confidence, don't auto-assign
    if (analysis.confidence < 0.5) {
      return {
        assigned: false,
        reason: "Job analysis confidence too low for auto-assignment",
      };
    }

    // Score workers
    const workerScores = await scoreWorkers(analysis);

    if (workerScores.length === 0) {
      return {
        assigned: false,
        reason: "No available workers found",
      };
    }

    const topWorker = workerScores[0];

    // Check if top worker meets threshold
    if (topWorker.score >= AUTO_ASSIGN_THRESHOLD) {
      return {
        assigned: true,
        workerId: topWorker.workerId,
        workerName: topWorker.workerName,
        score: topWorker.score,
        reason: `Auto-assigned to ${topWorker.workerName} (score: ${(topWorker.score * 100).toFixed(0)}%)`,
      };
    }

    return {
      assigned: false,
      reason: `Best match score (${(topWorker.score * 100).toFixed(0)}%) below threshold (${AUTO_ASSIGN_THRESHOLD * 100}%)`,
    };
  } catch (error) {
    console.error("Auto-assign error:", error);
    return {
      assigned: false,
      reason: "Auto-assignment failed due to an error",
    };
  }
}
