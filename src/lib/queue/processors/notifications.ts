import { Job } from "bullmq";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import type { NotificationJobData, NotificationType } from "../types";

// ===========================================
// Resend Client
// ===========================================

const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Nimmit <notifications@nimmit.com>";

// Initialize Resend client (lazy - only when API key is available)
let resend: Resend | null = null;
function getResendClient(): Resend | null {
  if (!EMAIL_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(EMAIL_API_KEY);
  }
  return resend;
}

// ===========================================
// Email Templates
// ===========================================

interface EmailTemplate {
  subject: string;
  html: string;
}

function getEmailTemplate(type: NotificationType, data: NotificationJobData["data"]): EmailTemplate {
  const templates: Record<NotificationType, EmailTemplate> = {
    job_assigned: {
      subject: `New Job Assigned: ${data.jobTitle || "Untitled"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Job Assigned</h2>
          <p>Hello,</p>
          <p>You have been assigned a new job from <strong>${data.clientName || "a client"}</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.jobTitle || "Untitled Job"}</h3>
            ${data.status ? `<p><strong>Status:</strong> ${data.status}</p>` : ""}
          </div>
          <p>Please log in to your dashboard to view the job details and start working.</p>
          <p>Best regards,<br>The Nimmit Team</p>
        </div>
      `,
    },
    job_status_change: {
      subject: `Job Status Updated: ${data.jobTitle || "Untitled"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Job Status Updated</h2>
          <p>Hello,</p>
          <p>The status of your job <strong>${data.jobTitle || "Untitled"}</strong> has been updated.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.jobTitle || "Untitled Job"}</h3>
            <p><strong>New Status:</strong> ${data.status || "Unknown"}</p>
          </div>
          <p>Log in to your dashboard for more details.</p>
          <p>Best regards,<br>The Nimmit Team</p>
        </div>
      `,
    },
    job_completed: {
      subject: `Job Completed: ${data.jobTitle || "Untitled"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Job Completed</h2>
          <p>Hello,</p>
          <p>Your job <strong>${data.jobTitle || "Untitled"}</strong> has been completed by <strong>${data.workerName || "your worker"}</strong>.</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #22c55e;">
            <h3 style="margin-top: 0;">${data.jobTitle || "Untitled Job"}</h3>
            <p>Please review the deliverables and provide your feedback.</p>
          </div>
          <p>Log in to your dashboard to review and approve the work.</p>
          <p>Best regards,<br>The Nimmit Team</p>
        </div>
      `,
    },
    job_revision: {
      subject: `Revision Requested: ${data.jobTitle || "Untitled"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #eab308;">Revision Requested</h2>
          <p>Hello,</p>
          <p>A revision has been requested for the job <strong>${data.jobTitle || "Untitled"}</strong>.</p>
          <div style="background: #fef9c3; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eab308;">
            <h3 style="margin-top: 0;">${data.jobTitle || "Untitled Job"}</h3>
            <p>Please review the client's feedback and make the necessary changes.</p>
          </div>
          <p>Log in to your dashboard to see the feedback and start working on the revision.</p>
          <p>Best regards,<br>The Nimmit Team</p>
        </div>
      `,
    },
    worker_welcome: {
      subject: "Welcome to Nimmit - Your Account is Ready!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D45A45;">Welcome to Nimmit!</h2>
          <p>Hello ${data.firstName || "there"},</p>
          <p>Congratulations! Your application has been approved, and you're now part of the Nimmit team.</p>

          ${data.tempPassword ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">Your Login Credentials</h3>
            <p><strong>Email:</strong> ${data.email || ''}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${data.tempPassword}</code></p>
            <p style="color: #92400e; font-size: 14px;"><strong>Important:</strong> Please change your password after your first login.</p>
          </div>
          ` : ''}

          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #3b82f6;">
            <h3 style="margin-top: 0;">Getting Started</h3>
            <ol>
              <li>Log in at <a href="https://nimmit.com/login">nimmit.com/login</a></li>
              <li>Update your profile and skills</li>
              <li>Set your availability to "Available"</li>
              <li>Wait for job assignments</li>
            </ol>
          </div>
          <p>You'll receive email notifications when tasks are assigned to you.</p>
          <p>Best regards,<br>The Nimmit Team</p>
        </div>
      `,
    },
  };

  return templates[type] || templates.job_status_change;
}

/**
 * Process notification - Send email notification to user via Resend
 *
 * If EMAIL_API_KEY is not configured, logs the email instead of sending.
 */
export async function processNotification(job: Job<NotificationJobData>) {
  const { userId, email, type, data } = job.data;

  logger.info("Notification", `Processing ${type} notification for user ${userId}`, { email });

  try {
    // Get email template
    const template = getEmailTemplate(type, data);

    const client = getResendClient();

    if (client) {
      // Send email via Resend
      const result = await client.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      if (result.error) {
        logger.error("Notification", "Resend error", { error: result.error.message });
        throw new Error(`Resend error: ${result.error.message}`);
      }

      logger.info("Notification", `Email sent to ${email}`, { emailId: result.data?.id });
    } else {
      // No API key configured - log instead
      logger.info("Notification", "EMAIL_API_KEY not configured, email logged only", {
        to: email,
        subject: template.subject,
        htmlLength: template.html.length,
      });
    }

    logger.debug("Notification", `${type} notification processed successfully`);

    return {
      success: true,
      email,
      type,
      sent: !!client,
    };
  } catch (error) {
    logger.error("Notification", `Error processing ${type} notification for ${email}`, { error: String(error) });
    throw error;
  }
}