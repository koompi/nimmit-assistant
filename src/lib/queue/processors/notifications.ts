import { Job } from "bullmq";
import type { NotificationJobData, NotificationType } from "../types";

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
      subject: "Welcome to Nimmit!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome to Nimmit!</h2>
          <p>Hello,</p>
          <p>Welcome to the Nimmit team! We're excited to have you on board.</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #3b82f6;">
            <h3 style="margin-top: 0;">Getting Started</h3>
            <ul>
              <li>Update your profile and skills</li>
              <li>Set your availability status</li>
              <li>Review the worker guidelines</li>
            </ul>
          </div>
          <p>You'll receive job notifications when tasks are assigned to you.</p>
          <p>Best regards,<br>The Nimmit Team</p>
        </div>
      `,
    },
  };

  return templates[type] || templates.job_status_change;
}

/**
 * Process notification - Send email notification to user
 *
 * Note: This is a placeholder implementation. In production, integrate with
 * an email service like Resend, SendGrid, or AWS SES.
 */
export async function processNotification(job: Job<NotificationJobData>) {
  const { userId, email, type, data } = job.data;

  console.log(`[Notification] Processing ${type} notification for user ${userId} (${email})`);

  try {
    // Get email template
    const template = getEmailTemplate(type, data);

    // TODO: Integrate with email service (Resend, SendGrid, AWS SES, etc.)
    // For now, just log the email content
    console.log(`[Notification] Email would be sent to ${email}`);
    console.log(`[Notification] Subject: ${template.subject}`);
    console.log(`[Notification] HTML length: ${template.html.length} characters`);

    // Example with Resend (when implemented):
    // import { Resend } from "resend";
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: "Nimmit <notifications@nimmit.com>",
    //   to: email,
    //   subject: template.subject,
    //   html: template.html,
    // });

    console.log(`[Notification] ${type} notification sent successfully`);

    return {
      success: true,
      email,
      type,
    };
  } catch (error) {
    console.error(`[Notification] Error processing ${type} notification for ${email}:`, error);
    throw error;
  }
}