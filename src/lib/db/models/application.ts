import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    portfolioUrl?: string;
    linkedinUrl?: string;
    primaryCategory: string;
    selectedSkills: string[];
    experienceYears: number;
    bio: string;
    motivation: string;

    status: "pending" | "approved" | "rejected";
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    convertedUserId?: mongoose.Types.ObjectId;

    // AI analysis of the application
    aiAnalysis?: {
        score: number;
        notes: string;
        suggestedLevel: "junior" | "mid" | "senior";
    };

    createdAt: Date;
    updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        portfolioUrl: { type: String },
        linkedinUrl: { type: String },

        primaryCategory: { type: String, required: true },
        selectedSkills: [{ type: String }],
        experienceYears: { type: Number, required: true },

        bio: { type: String, required: true },
        motivation: { type: String, required: true },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewedAt: { type: Date },
        convertedUserId: { type: Schema.Types.ObjectId, ref: "User" },

        aiAnalysis: {
            score: { type: Number },
            notes: { type: String },
            suggestedLevel: { type: String, enum: ["junior", "mid", "senior"] },
        },
    },
    { timestamps: true }
);

// Prevent duplicate applications
ApplicationSchema.index({ email: 1 }, { unique: true });

export const Application =
    mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);
