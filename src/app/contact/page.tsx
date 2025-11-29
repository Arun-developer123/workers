"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);

  // Honeypot for bots
  const [hp, setHp] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hp) return; // bot detected
    if (!name || !email || !message) {
      setStatus({ ok: false, msg: "Please fill name, email and message." });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) throw new Error("Server returned an error");

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setStatus({ ok: true, msg: "Message sent — we will reply within 24 hours." });
    } catch (err) {
      // Fallback: open mail client with prefilled data
      try {
        const mailto = `mailto:bothinnovations@gmail.com?subject=${encodeURIComponent(subject || "Contact from KaamLink")}&body=${encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\n\n${message}`
        )}`;
        window.location.href = mailto;
        setStatus({ ok: true, msg: "Opening your mail client as a fallback..." });
      } catch (e) {
        setStatus({ ok: false, msg: "Failed to send message. Please email bothinnovations@gmail.com directly." });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Left: Contact form */}
          <section className="bg-white p-6 rounded-2xl shadow">
            <h1 className="text-2xl font-semibold mb-2">Contact Us</h1>
            <p className="text-sm text-gray-600 mb-6">Questions, partnership requests or support — hum yahin madad karenge. Email: <a href="mailto:bothinnovations@gmail.com" className="text-green-600 underline">bothinnovations@gmail.com</a></p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot field (hidden from users) */}
              <input aria-hidden type="text" name="company" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" />

              <div>
                <label className="text-sm font-medium">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="Your name" />
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="you@example.com" />
              </div>

              <div>
                <label className="text-sm font-medium">Subject (optional)</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="Quick subject" />
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="How can we help?" />
              </div>

              <div className="flex items-center gap-3">
                <button disabled={sending} type="submit" className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white font-medium shadow ${sending ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
                  {sending ? "Sending..." : "Send Message"}
                </button>

                <Link href="/auth/sign-up" className="text-sm text-gray-700 underline">Join as Worker</Link>
              </div>

              {status && (
                <div className={`mt-2 text-sm ${status.ok ? "text-green-700" : "text-red-600"}`}>{status.msg}</div>
              )}
            </form>
          </section>

          {/* Right: Contact details + map */}
          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow">
              <h3 className="font-semibold mb-2">Office & Contact</h3>
              <p className="text-sm text-gray-600">KaamLink (Pilots in selected cities)</p>

              <ul className="mt-3 text-sm text-gray-700 space-y-2">
                <li>
                  <strong>Email:</strong> <a href="mailto:bothinnovations@gmail.com" className="text-green-600 underline">bothinnovations@gmail.com</a>
                </li>
                <li>
                  <strong>Phone:</strong> <a href="tel:+919205645691" className="text-gray-700 underline">+91 9205645691</a>
                </li>
                <li>
                  <strong>Support:</strong> Typical response time 24 hours
                </li>
              </ul>

              <div className="mt-4 text-xs text-gray-500">For partnerships and enterprise integrations, please include company details in your message.</div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow">
              {/* Small responsive Google Map iframe - replace the src query as needed */}
              <div className="h-56 w-full relative">
                <iframe
                  title="KaamLink location"
                  src="https://www.google.com/maps?q=Tapsyahouse,sector-45,Gurugram&amp;output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
              <div className="p-4 text-sm text-gray-600">Region shown: Tapsya house , sector-45 , Gurugram.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/*
  Notes:
  - This page expects a serverless endpoint at POST /api/contact that accepts JSON { name, email, subject, message } and returns 200 on success.
  - If you prefer a zero-backend approach, the client falls back to opening the user's mail client via mailto when server call fails.
  - To make this fully production-ready create a secure serverless route that validates input and sends mail using a transactional email provider (SendGrid, Postmark) or stores leads in your database.
*/
