import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  budgetName: string;
  inviteUrl: string;
  expiresAt: Date;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  budgetName,
  inviteUrl,
  expiresAt,
}: SendInvitationEmailParams) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Savey <noreply@saveymcsaveface.com>",
    to,
    subject: `${inviterName} invited you to collaborate on "${budgetName}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #228be6; margin-bottom: 24px;">You're Invited!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            <strong>${inviterName}</strong> has invited you to collaborate on the budget <strong>"${budgetName}"</strong>.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Click the button below to accept the invitation and start collaborating.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background-color: #228be6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500;">
            Accept Invitation
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 24px;">
            This invitation expires on ${expiresAt.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}.
          </p>
          <p style="font-size: 14px; color: #666;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 12px; color: #999;">
            Savey McSaveface - Collaborative Budgeting Made Simple
          </p>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error("Failed to send invitation email");
  }

  return data;
}
