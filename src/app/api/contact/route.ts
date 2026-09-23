import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { addNotification } from "@/lib/notifications";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendEmail, escapeHtml } from "@/lib/email";

/** Inbox that receives website lead notifications. */
const LEAD_NOTIFICATION_EMAIL = "contact@evrconstructions.com";

// Rate limit: max 5 requests per 10 minutes per caller, enforced in Firestore so
// the budget is shared across every Cloud Run instance.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { allowed, retryAfterSeconds } = await consumeRateLimit(
      ip,
      MAX_REQUESTS_PER_WINDOW,
      RATE_LIMIT_WINDOW_MS
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many inquiries submitted from this connection. Please call us directly at (865) 221-7275." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds ?? 60) },
        }
      );
    }

    const body = await request.json();
    const { firstName, lastName, city, phone, email, message, company_website } = body;

    // Honeypot check for automated bot protection
    if (company_website) {
      // Silently accept to trap bots without sending email or creating records
      return NextResponse.json({ success: true, message: "Inquiry successfully recorded" });
    }

    // Validation
    if (!firstName || !lastName || !city || !email || !message) {
      return NextResponse.json(
        { error: "Missing required contact fields" },
        { status: 400 }
      );
    }

    const cleanFirst = String(firstName).trim();
    const cleanLast = String(lastName).trim();
    const cleanCity = String(city).trim();
    const cleanPhone = String(phone || "Not provided").trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMessage = String(message).trim();

    // Basic email format check
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const timestamp = Date.now();
    const isoDate = new Date(timestamp).toISOString();

    // 1. Persist lead record to Firestore collection 'leads'
    const leadDoc = {
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName: `${cleanFirst} ${cleanLast}`,
      city: cleanCity,
      phone: cleanPhone,
      email: cleanEmail,
      message: cleanMessage,
      status: "new",
      createdAt: isoDate,
      timestamp,
      source: "website_contact_form",
    };

    const leadRef = await adminDb.collection("leads").add(leadDoc);

    // 2. Persist activity log for telemetry
    await adminDb.collection("activity_logs").add({
      event: "form_submit",
      label: "Consultation Request Submitted",
      detail: `${cleanFirst} ${cleanLast} in ${cleanCity} — ${cleanMessage.substring(0, 60)}...`,
      location: `${cleanCity}, TN`,
      device: "Web Client",
      page: "/contact",
      timestamp,
    }).catch((err) => {
      console.warn("Failed to write contact activity log:", err);
    });

    // 3. Create Admin Notification (email is sent directly in step 4)
    try {
      await addNotification({
        type: "alert",
        priority: "high",
        category: "lead",
        title: `New Lead: ${cleanFirst} ${cleanLast} (${cleanCity})`,
        message: `${cleanPhone} · ${cleanEmail}\n"${cleanMessage.substring(0, 100)}"`,
        actionHref: "/admin/analytics",
        triggerEmail: false,
      });
    } catch (notifErr) {
      console.warn("Failed to create admin notification for lead:", notifErr);
    }

    // 4. Deliver the lead notification. The lead is already persisted above, so a
    //    mail failure must not fail the visitor's submission.
    const emailResult = await sendEmail({
      to: LEAD_NOTIFICATION_EMAIL,
      replyTo: cleanEmail,
      subject: `New Lead Inquiry from ${cleanFirst} ${cleanLast} (${cleanCity})`,
      text: `Name: ${cleanFirst} ${cleanLast}\nCity: ${cleanCity}\nPhone: ${cleanPhone}\nEmail: ${cleanEmail}\n\nProject Details:\n${cleanMessage}\n\nSubmitted at: ${isoDate}`,
      html: `
        <h2>New Website Consultation Inquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(`${cleanFirst} ${cleanLast}`)}</p>
        <p><strong>City / Location:</strong> ${escapeHtml(cleanCity)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(cleanPhone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
        <hr />
        <h3>Project Details:</h3>
        <p>${escapeHtml(cleanMessage).replace(/\n/g, "<br/>")}</p>
        <small>Lead ID: ${escapeHtml(leadRef.id)} · Timestamp: ${escapeHtml(isoDate)}</small>
      `,
    });

    if (!emailResult.success) {
      // Surface the outage in admin notifications rather than failing silently.
      console.error(`Lead ${leadRef.id} saved but notification email failed:`, emailResult.error);
    }

    return NextResponse.json({
      success: true,
      id: leadRef.id,
      message: "Inquiry successfully recorded",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("Error processing contact submission:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
