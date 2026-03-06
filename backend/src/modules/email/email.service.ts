import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as sgMail from "@sendgrid/mail";

/**
 * Email Service - Provider-agnostic email sending abstraction
 * 
 * This service provides a clean interface for sending emails that can be
 * swapped between providers (SendGrid, AWS SES, etc.) without changing
 * business logic.
 * 
 * Email is secondary to mailbox notifications and must never block execution.
 */
@Injectable()
export class EmailService {
  private readonly emailProviderEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // Check if email provider is enabled via environment variable
    this.emailProviderEnabled =
      this.configService.get<string>("EMAIL_PROVIDER_ENABLED") === "true";

    // Initialize SendGrid API key if email provider is enabled
    if (this.emailProviderEnabled) {
      const sendGridApiKey = this.configService.get<string>("SENDGRID_API_KEY");
      if (sendGridApiKey) {
        sgMail.setApiKey(sendGridApiKey);
      } else {
        console.warn(
          "[EmailService] EMAIL_PROVIDER_ENABLED is true but SENDGRID_API_KEY is not set. Emails will not be sent.",
        );
      }
    }
  }

  /**
   * Send an email (provider-agnostic interface)
   * 
   * If EMAIL_PROVIDER_ENABLED is not true, this method will log the email
   * payload but not actually send it. This allows development/testing without
   * requiring email provider credentials.
   * 
   * @param params - Email parameters
   * @returns Promise that resolves when email is sent (or logged if disabled)
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!this.emailProviderEnabled) {
      // Email provider disabled - log payload for development/testing
      console.log(`[EmailService] Email provider disabled - would send:`, {
        to: params.to,
        subject: params.subject,
        textPreview: params.text.substring(0, 200) + "...",
        hasHtml: !!params.html,
      });
      return;
    }

    // Email provider enabled - send via actual provider
    try {
      await this.sendViaProvider(params);
    } catch (error) {
      // Log error but never throw - email is optional, must not block execution
      console.error(`[EmailService] Failed to send email to ${params.to}:`, error);
      // Do NOT rethrow - email failures must not affect business logic
    }
  }

  /**
   * Send email via actual provider (SendGrid)
   * 
   * Uses SendGrid for transactional email sending.
   * Sends both text/plain and text/html when HTML is provided.
   */
  private async sendViaProvider(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const sendGridApiKey = this.configService.get<string>("SENDGRID_API_KEY");
    if (!sendGridApiKey) {
      console.error(
        "[EmailService] SENDGRID_API_KEY is not set. Cannot send email.",
      );
      return;
    }

    const fromEmail =
      this.configService.get<string>("EMAIL_FROM") || "noreply@showgeo.app";

    try {
      const emailPayload: any = {
        to: params.to,
        from: fromEmail,
        subject: params.subject,
        text: params.text,
      };

      // Include HTML if provided (Phase 2A: branded HTML emails)
      if (params.html) {
        emailPayload.html = params.html;
      }

      await sgMail.send(emailPayload);
    } catch (error: any) {
      // Log detailed error for debugging
      console.error(`[EmailService] SendGrid error:`, {
        to: params.to,
        subject: params.subject,
        error: error.message,
        code: error.code,
        response: error.response?.body,
      });
      // Re-throw to be caught by sendEmail() wrapper
      throw error;
    }
  }

  /**
   * Build branded HTML email template for LIVE NOW notifications (Phase 2A)
   * 
   * Creates a mobile-friendly, dark-themed HTML email with inline styles.
   * Conveys the same meaning as the plain-text version.
   * 
   * Public method to allow RegistrationsService to generate HTML emails.
   * 
   * @param params - Email parameters
   * @returns HTML email content
   */
  buildLiveNowHtmlEmail(params: {
    eventName: string;
    watchUrl: string;
    accessCode?: string;
  }): string {
    const hasAccessCode = !!params.accessCode;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LIVE NOW: ${this.escapeHtml(params.eventName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">
                ${this.escapeHtml(params.eventName)}
              </h1>
              <p style="margin: 12px 0 0 0; font-size: 18px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                LIVE NOW
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: #e0e0e0;">
                ${this.escapeHtml(params.eventName)} is live now.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                You can watch immediately by logging into Showgeo.
              </p>
              
              ${hasAccessCode ? `
              <!-- Access Code Section -->
              <div style="background-color: #2a2a2a; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                  One-time Access Code
                </p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                  If you are not logged in, you may use this one-time access code:
                </p>
                <div style="background-color: #0a0a0a; padding: 16px; border-radius: 6px; text-align: center; margin: 16px 0;">
                  <code style="font-size: 24px; font-weight: 700; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                    ${this.escapeHtml(params.accessCode!)}
                  </code>
                </div>
                <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #b0b0b0;">
                  This code can only be used once.
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 24px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                For the best experience, we recommend signing in to Showgeo.<br>
                Logging in secures your access and enables additional features during the stream.
              </p>
              
              ${hasAccessCode ? `
              <p style="margin: 24px 0; font-size: 14px; line-height: 1.6; color: #888888;">
                Access codes are designed for offline or guest viewing. If you continue watching through Showgeo, the access code will no longer be active.
              </p>
              ` : ''}
              
              <!-- Watch Now Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 30px 0 20px 0;">
                    <a href="${this.escapeHtml(params.watchUrl)}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 600; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                      Watch Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link (for email clients that don't support buttons) -->
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${this.escapeHtml(params.watchUrl)}" style="color: #667eea; text-decoration: underline; word-break: break-all;">
                  ${this.escapeHtml(params.watchUrl)}
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #0a0a0a; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                This email was sent by Showgeo. Mailbox notifications are the source of truth.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Build branded HTML email template for LIVE reminder notifications (Phase 2B)
   * 
   * Creates a mobile-friendly, dark-themed HTML email with inline styles.
   * Similar styling to LIVE NOW emails but with reminder-specific copy.
   * 
   * Public method to allow RegistrationsService to generate HTML emails.
   * 
   * @param params - Email parameters
   * @returns HTML email content
   */
  buildLiveReminderHtmlEmail(params: {
    eventName: string;
    watchUrl: string;
    accessCode?: string;
    reminderType: string;
  }): string {
    const hasAccessCode = !!params.accessCode;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(params.eventName)} is live now</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">
                ${this.escapeHtml(params.eventName)}
              </h1>
              <p style="margin: 12px 0 0 0; font-size: 18px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                Still Live
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: #e0e0e0;">
                ${this.escapeHtml(params.eventName)} is live now.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                The event has already started and you can still join.
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                Log into Showgeo for the best experience.
              </p>
              
              ${hasAccessCode ? `
              <!-- Access Code Section -->
              <div style="background-color: #2a2a2a; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                  One-time Access Code
                </p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                  Or use your one-time access code below.
                </p>
                <div style="background-color: #0a0a0a; padding: 16px; border-radius: 6px; text-align: center; margin: 16px 0;">
                  <code style="font-size: 24px; font-weight: 700; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                    ${this.escapeHtml(params.accessCode!)}
                  </code>
                </div>
                <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #b0b0b0;">
                  This code can only be used once.
                </p>
              </div>
              ` : ''}
              
              <!-- Watch Now Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 30px 0 20px 0;">
                    <a href="${this.escapeHtml(params.watchUrl)}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 600; text-align: center; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                      Watch Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link (for email clients that don't support buttons) -->
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${this.escapeHtml(params.watchUrl)}" style="color: #667eea; text-decoration: underline; word-break: break-all;">
                  ${this.escapeHtml(params.watchUrl)}
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #0a0a0a; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                This email was sent by Showgeo. Mailbox notifications are the source of truth.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}


