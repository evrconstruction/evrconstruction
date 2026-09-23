import { Resend } from "resend";

/**
 * Transactional email via Resend.
 *
 * `RESEND_API_KEY` is supplied through App Hosting secrets and is never read at
 * module scope, so a missing key degrades to a logged failure instead of
 * crashing the route at import time.
 */

/**
 * Sender address.
 *
 * Resend only permits sending from a domain that has been verified in their
 * dashboard. Until `evrconstructions.com` is verified, sending from a custom
 * domain returns HTTP 403, so the default is Resend's sandbox sender. Set
 * `EMAIL_FROM` to e.g. `EVR Construction <contact@evrconstructions.com>` once
 * the domain shows as verified.
 */
const DEFAULT_FROM = "onboarding@resend.dev";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured; email will not be sent.");
    return null;
  }
  return new Resend(apiKey);
}

/** Sender address, overridable per environment. */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

/**
 * Send a transactional email.
 *
 * Never throws — callers receive `{ success: false, error }` so a mail outage
 * cannot take down the surrounding request.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    return { success: false, error: "Email service is not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      console.error("Resend rejected the email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("Resend send failed:", err);
    return { success: false, error: message };
  }
}

/**
 * Escape a value for safe interpolation into an email HTML body.
 *
 * Lead fields are visitor-controlled, so they must never be concatenated into
 * HTML unescaped.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
