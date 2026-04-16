import "server-only";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a confirmation email with the generated PDF attached.
 *
 * Uses onboarding@resend.dev as sender for demo purposes.
 * For production, configure a verified domain in Resend and update the from address.
 */
export async function sendConfirmationEmail(
  to: string,
  referenceNumber: string,
  pdfBuffer: Buffer
): Promise<void> {
  const { error } = await resend.emails.send({
    from: "AUSH DocFlow <onboarding@resend.dev>",
    to,
    subject: `AUSH DocFlow — Submission Confirmation (${referenceNumber})`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #6366F1; font-size: 24px; margin: 0;">AUSH DocFlow</h1>
        </div>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #18181b; font-size: 20px; margin: 0 0 16px 0;">Submission Received</h2>
          <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Thank you for your submission. Your application has been received and is being processed.
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #6366F1;">
            <p style="color: #71717a; font-size: 14px; margin: 0 0 4px 0;">Reference Number</p>
            <p style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0; font-family: monospace;">${referenceNumber}</p>
          </div>
        </div>
        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          A PDF copy of your submission is attached to this email for your records.
          Please keep your reference number for future inquiries.
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
          AUSH DocFlow &mdash; Document Processing System
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${referenceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(`Failed to send confirmation email: ${error.message}`);
  }
}
