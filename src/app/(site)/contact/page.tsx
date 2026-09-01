import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact EVR Construction LLC for a free estimate. Call (865) 367-9501 (English) or (865) 275-6672 (Español), or send us a message.",
};

export default function ContactPage() {
  return (
    <div>
      {/* Page hero */}
      <section className="bg-charcoal-deep py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
            Contact Us
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">
            Book a Free Consultation
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
            Use the contact form or call us. We&apos;ll listen to your ideas,
            discuss your goals, and explore how to bring your vision to life.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-stretch lg:px-8">
        {/* Phone options */}
        <div className="flex flex-col gap-6">
          <div className="rounded-sm border border-gray-100 bg-white p-7 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-charcoal">
              Call or Text
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <a
                href={SITE.phone.englishHref}
                className="inline-flex items-center justify-center rounded-sm bg-amber-brand px-6 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
              >
                English: {SITE.phone.english}
              </a>
              <a
                href={SITE.phone.spanishHref}
                className="inline-flex items-center justify-center rounded-sm border-2 border-charcoal px-6 py-3 font-heading text-sm font-semibold text-charcoal transition-colors hover:border-amber-brand hover:text-amber-dark"
              >
                Español: {SITE.phone.spanish}
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Se habla español — llamenos y con gusto le atendemos.
            </p>
          </div>

          <div className="rounded-sm border border-gray-100 bg-white p-7 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-charcoal">
              Service Areas
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Proudly serving communities across {SITE.region}.
            </p>
            <div className="mt-4 overflow-hidden rounded-sm border border-gray-200">
              <iframe
                src="https://maps.google.com/maps?q=East+Tennessee,+TN&t=m&z=8&output=embed&iwloc=near"
                width="100%"
                height="300"
                className="border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="EVR Construction — East Tennessee Service Area"
              ></iframe>
            </div>
            <a
              href={SITE.directionsUrl}
              className="mt-4 inline-flex font-heading text-sm font-semibold text-charcoal underline decoration-amber-brand decoration-2 underline-offset-4 hover:text-amber-dark"
            >
              Get Directions →
            </a>
          </div>
        </div>

        {/* Form (wired to backend in a later phase) */}
        <div className="flex h-full flex-col rounded-sm border border-gray-100 bg-white p-7 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-charcoal">
            Send a Message
          </h2>
          <form className="mt-5 flex flex-1 flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
                  First Name
                </span>
                <input
                  type="text"
                  name="firstName"
                  required
                  autoComplete="given-name"
                  className="rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none focus:border-amber-brand"
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
                  className="rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none focus:border-amber-brand"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  className="rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none placeholder:text-muted/50 focus:border-amber-brand"
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
                  className="rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none focus:border-amber-brand"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                className="rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none focus:border-amber-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted">
                Tell us about your project
              </span>
              <textarea
                name="message"
                rows={5}
                required
                className="min-h-28 flex-1 rounded-sm border border-gray-200 px-3.5 py-2.5 text-sm text-charcoal outline-none focus:border-amber-brand"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
            >
              Send Message
            </button>
            <p className="text-xs text-muted">
              Free estimate · No obligation · We reply within one business day
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
