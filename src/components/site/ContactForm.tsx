"use client";

import { useState } from "react";

const FORMSUBMIT_EMAIL = "contact@evrconstructions.com";

type FormStatus = "idle" | "submitting" | "success" | "error";

const initialForm = {
  firstName: "",
  lastName: "",
  city: "",
  phone: "",
  email: "",
  message: "",
};

const inputClasses =
  "w-full rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none focus:border-amber-brand";

export function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<FormStatus>("idle");

  const updateField = (name: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch(
        `https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: `${form.firstName} ${form.lastName}`.trim(),
            firstName: form.firstName,
            lastName: form.lastName,
            city: form.city,
            phone: form.phone || "Not provided",
            email: form.email,
            message: form.message,
            _subject: "New EVR Construction Website Inquiry",
            _template: "table",
            _captcha: "false",
            _replyto: form.email,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setForm(initialForm);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex h-full flex-col rounded-sm border border-gray-100 bg-white p-7 shadow-sm">
      <h2 className="font-heading text-lg font-bold text-charcoal">
        Send a Message
      </h2>

      {status === "success" ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-3 rounded-sm bg-cloud p-8 text-center">
          <p className="font-heading text-lg font-bold text-charcoal">
            Message sent!
          </p>
          <p className="text-sm leading-6 text-muted">
            Thank you for reaching out. We&apos;ll get back to you within one
            business day.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
              First Name
            </span>
            <input
              type="text"
              name="firstName"
              required
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
              Last Name
            </span>
            <input
              type="text"
              name="lastName"
              required
              autoComplete="family-name"
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
              City / County
            </span>
            <input
              type="text"
              name="city"
              required
              autoComplete="address-level2"
              placeholder="e.g. Knoxville, Knox County"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              className={`${inputClasses} placeholder:text-muted/50`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
              Phone
            </span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="flex min-h-0 flex-1 flex-col gap-1.5">
            <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
              Tell us about your project
            </span>
            <textarea
              name="message"
              required
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              className={`${inputClasses} min-h-32 flex-1 resize-none`}
            />
          </label>

          {status === "error" && (
            <p className="rounded-sm bg-red-50 px-4 py-3 text-sm text-red-700">
              Something went wrong sending your message. Please try again, or
              call us directly.
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center justify-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Sending…" : "Send Message"}
          </button>
          <p className="text-xs text-muted">
            Free estimate · No obligation · We reply within one business day
          </p>
        </form>
      )}
    </div>
  );
}
