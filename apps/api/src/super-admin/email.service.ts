import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  async sendSchoolWelcome(params: {
    to: string;
    schoolName: string;
    schoolId: string;
    adminEmail: string;
    resetUrl: string;
  }) {
    const recipient = process.env.EMAIL_OVERRIDE ?? params.to;
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

    const subject = `ברוכה הבאה למערכת — ${params.schoolName}`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1e293b; font-size: 22px;">ברוכה הבאה למערכת ניהול הציונים!</h1>
        <p style="color: #475569;">נוצר עבורך בית ספר חדש במערכת. להלן הפרטים שלך:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr style="background: #f8fafc;">
            <td style="padding: 12px 16px; font-weight: bold; color: #374151; border: 1px solid #e2e8f0;">שם בית הספר</td>
            <td style="padding: 12px 16px; color: #1e293b; border: 1px solid #e2e8f0;">${params.schoolName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; color: #374151; border: 1px solid #e2e8f0;">מזהה בית הספר</td>
            <td style="padding: 12px 16px; font-family: monospace; color: #1e293b; border: 1px solid #e2e8f0;">${params.schoolId}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px 16px; font-weight: bold; color: #374151; border: 1px solid #e2e8f0;">אימייל</td>
            <td style="padding: 12px 16px; color: #1e293b; border: 1px solid #e2e8f0;">${params.adminEmail}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${params.resetUrl}"
             style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px;
                    text-decoration: none; font-weight: bold; font-size: 16px;">
            הגדרת סיסמה לחשבון
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ חשוב — שמרי את מזהה בית הספר!</p>
          <p style="margin: 8px 0 0; color: #92400e;">תצטרכי אותו בכל כניסה למערכת. ללא המזהה לא תוכלי להתחבר.</p>
        </div>

        <p style="color: #64748b; font-size: 14px;">הקישור להגדרת הסיסמה בתוקף ל-24 שעות.</p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[EMAIL DEV] To: ${recipient} | Subject: ${subject}`);
      this.logger.log(`School: ${params.schoolName} | ID: ${params.schoolId}`);
      return;
    }

    const { error } = await this.resend.emails.send({ from, to: recipient, subject, html });
    if (error) {
      this.logger.error(`Failed to send welcome email: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Welcome email sent to ${recipient}`);
    }
  }

  async sendSchoolUpdate(params: {
    to: string;
    schoolName: string;
    schoolId: string;
    adminEmail: string;
    resetUrl?: string;
    schoolNameChanged: boolean;
  }) {
    const recipient = process.env.EMAIL_OVERRIDE ?? params.to;
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const subject = `עדכון פרטי בית הספר — ${params.schoolName}`;

    const rows = [
      params.schoolNameChanged && `<tr style="background:#f8fafc"><td style="padding:12px 16px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;">שם בית הספר</td><td style="padding:12px 16px;color:#1e293b;border:1px solid #e2e8f0;">${params.schoolName}</td></tr>`,
      `<tr><td style="padding:12px 16px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;">מזהה בית הספר</td><td style="padding:12px 16px;font-family:monospace;color:#1e293b;border:1px solid #e2e8f0;">${params.schoolId}</td></tr>`,
      `<tr style="background:#f8fafc"><td style="padding:12px 16px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;">אימייל</td><td style="padding:12px 16px;color:#1e293b;border:1px solid #e2e8f0;">${params.adminEmail}</td></tr>`,
    ].filter(Boolean).join('');

    const resetSection = params.resetUrl
      ? `<div style="text-align:center;margin:32px 0;"><a href="${params.resetUrl}" style="background:#6366f1;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">הגדרת סיסמה חדשה</a></div><p style="color:#64748b;font-size:14px;text-align:center;">הסיסמה שלך אופסה. הקישור בתוקף ל-24 שעות.</p>`
      : '';
    const html = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#1e293b;font-size:22px;">עדכון פרטי בית הספר</h1>
        <p style="color:#475569;">הפרטים הבאים עודכנו במערכת:</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">${rows}</table>
        ${resetSection}
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:24px 0;">
          <p style="margin:0;color:#92400e;font-weight:bold;">⚠️ שמרי את מזהה בית הספר — תצטרכי אותו בכל כניסה למערכת.</p>
        </div>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[EMAIL DEV] School update to ${recipient} | School: ${params.schoolName}`);
      return;
    }

    const { error } = await this.resend.emails.send({ from, to: recipient, subject, html });
    if (error) this.logger.error(`Failed to send update email: ${JSON.stringify(error)}`);
    else this.logger.log(`Update email sent to ${recipient}`);
  }

  async sendPasswordReset(params: { to: string; resetUrl: string; userName: string }) {
    const recipient = process.env.EMAIL_OVERRIDE ?? params.to;
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const subject = 'איפוס סיסמה — מערכת ניהול הציונים';

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1e293b; font-size: 22px;">איפוס סיסמה</h1>
        <p style="color: #475569;">שלום ${params.userName},</p>
        <p style="color: #475569;">קיבלנו בקשה לאיפוס הסיסמה שלך. לחצי על הכפתור להגדרת סיסמה חדשה:</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${params.resetUrl}"
             style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px;
                    text-decoration: none; font-weight: bold; font-size: 16px;">
            איפוס סיסמה
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #92400e;">⚠️ הקישור בתוקף ל-2 שעות בלבד.</p>
          <p style="margin: 8px 0 0; color: #92400e;">אם לא ביקשת לאפס סיסמה — התעלמי מהמייל הזה.</p>
        </div>

        <p style="color: #94a3b8; font-size: 12px;">
          אם הכפתור לא עובד, העתיקי את הקישור הבא לדפדפן:<br/>
          <a href="${params.resetUrl}" style="color: #6366f1;">${params.resetUrl}</a>
        </p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[EMAIL DEV] Password reset email sent to ${recipient}`);
      return;
    }

    const { error } = await this.resend.emails.send({ from, to: recipient, subject, html });
    if (error) {
      this.logger.error(`Failed to send reset email: ${JSON.stringify(error)}`);
    } else {
      this.logger.log(`Reset email sent to ${recipient}`);
    }
  }
}
