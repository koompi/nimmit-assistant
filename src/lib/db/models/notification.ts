
import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
    {
        userId: { type: String, required: true, index: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        data: { type: Schema.Types.Mixed },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Index for efficient querying by user and read status
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
