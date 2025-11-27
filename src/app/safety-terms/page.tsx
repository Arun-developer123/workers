// src/app/safety-terms/page.tsx
"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * KaamLink Safety Terms page (client)
 *
 * - Drop into src/app/safety-terms/page.tsx
 * - Requires Tailwind CSS in the project.
 * - Stores acceptance in localStorage key: "kaamlink:safetyFund:accepted"
 *
 * Edit ROUTE_AFTER_ACCEPT if you want to redirect somewhere else after accept.
 */

const ROUTE_AFTER_ACCEPT = "/home"; // change if your home route differs
const LOCALSTORAGE_KEY = "kaamlink:safetyFund:accepted";

export default function SafetyTermsPage(): JSX.Element {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const printableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // check if user already accepted
    try {
      const val = localStorage.getItem(LOCALSTORAGE_KEY);
      if (val === "true") {
        // if already accepted, optionally redirect
        // router.push(ROUTE_AFTER_ACCEPT);
      }
    } catch (_err) {
      // ignore localStorage errors (e.g., privacy mode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setChecked(e.target.checked);
  };

  const handleAccept = (): void => {
    if (!checked) return;
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, "true");
    } catch (_err) {
      // ignore storage errors
    }
    void router.push(ROUTE_AFTER_ACCEPT);
  };

  const handlePrint = (): void => {
    const node = printableRef.current;
    if (!node) {
      window.print();
      return;
    }

    const content = node.innerHTML;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      window.print();
      return;
    }

    // Build a minimal, printable HTML document
    const doc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>KaamLink Worker Safety Fund - Terms & Conditions</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; margin: 20px; color: #111827; }
            h1,h2,h3 { color: #0f172a; }
            p { line-height: 1.55; margin-bottom: 0.9rem; }
            .container { max-width: 900px; margin: auto; }
            ul, ol { margin-left: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            ${content}
          </div>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(doc);
    w.document.close();
    w.focus();

    // allow small delay for rendering
    setTimeout(() => {
      try {
        w.print();
      } catch (_err) {
        w.close();
      }
    }, 450);
  };

  const handleCopy = async (): Promise<void> => {
    const node = printableRef.current;
    if (!node) return;

    const text = node.innerText ?? node.textContent ?? "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (_err) {
        // fallthrough to textarea fallback
      }
    }

    // Fallback copy method for older environments
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // ignore
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white shadow-md rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between p-6 border-b">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">KaamLink Worker Safety Fund</h1>
            <p className="text-sm text-slate-500 mt-1">Terms &amp; Conditions — Voluntary Contribution Program</p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm underline text-slate-600">← Back to Landing</Link>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md text-sm"
              aria-label="Print or save terms as PDF"
            >
              Print / Save as PDF
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md text-sm"
              aria-label="Copy terms"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left column: content */}
          <section className="md:col-span-3 p-6">
            <div ref={printableRef}>
              <h2 className="text-xl font-semibold mb-4">KaamLink Worker Safety Fund – Terms &amp; Conditions</h2>
              <p className="text-sm text-slate-500 mb-6">Last Updated: 26 November 2025 — Issued by: Both Innovations Pvt. / KaamLink</p>

              <article className="prose prose-slate max-w-none">
                <h3>1. Introduction</h3>
                <p>
                  KaamLink Worker Safety Fund (“Fund”) is a <strong>voluntary contribution program</strong> created by KaamLink to support workers
                  in case of accidental injury during verified KaamLink job tasks. This Fund is <strong>NOT an insurance product</strong> and
                  KaamLink is <strong>NOT an insurance company</strong>.
                </p>
                <p>
                  Joining the Fund does <strong>not</strong> give any worker a legal right to guaranteed financial compensation.
                </p>

                <h3>2. Nature of the Fund</h3>
                <p>
                  The Fund is a <em>community support initiative</em>, not a licensed insurance scheme. Contributions collected from workers
                  are stored in a separate fund account managed solely by KaamLink. All payouts are <strong>discretionary</strong> and depend on
                  the availability of funds and management approval.
                </p>

                <h3>3. Monthly Contribution</h3>
                <p>
                  Workers may join the Fund by paying <strong>₹20 per month</strong> as a voluntary contribution. Payment is collected via UPI
                  AutoPay or other approved digital methods. The contribution amount may be revised by KaamLink with notice.
                </p>

                <h3>4. No Guaranteed Benefits</h3>
                <p>
                  By joining the Fund, the worker agrees that KaamLink is <strong>not obligated</strong> to provide compensation in every case.
                  Approval or rejection of a claim is <strong>solely at the discretion</strong> of KaamLink management. Support amounts, if given,
                  may vary based on severity, documentation, job verification, and fund availability.
                </p>
                <p>
                  Workers understand that <strong>this is not an insurance policy</strong>, therefore <strong>no fixed, assured or legally enforceable compensation</strong> exists.
                </p>

                <h3>5. Eligibility for Support</h3>
                <p>Support may be granted in the following situations:</p>
                <ol>
                  <li>Accidental injury during a KaamLink job.</li>
                  <li>Hospitalization required due to a work-related accident.</li>
                  <li>Death caused during an active KaamLink task (verified through platform data + employer confirmation).</li>
                </ol>
                <p>
                  KaamLink reserves the right to demand documents such as Job ID, employer confirmation, medical reports, hospital bills,
                  and police report (if applicable). KaamLink may deny support if improper or insufficient documents are provided.
                </p>

                <h3>6. Discretionary Payout Amounts</h3>
                <p>Indicative (but not guaranteed) support amounts:</p>
                <ul>
                  <li>Minor Injury Support: ₹500 – ₹2,000</li>
                  <li>Major Injury Support: ₹2,000 – ₹10,000</li>
                  <li>Death Support (Goodwill Grant): up to ₹1,50,000</li>
                </ul>
                <p><strong>These amounts are not assured</strong>, and may be increased, decreased, or denied entirely based on fund availability and management discretion.</p>

                <h3>7. No Refund Policy</h3>
                <p>
                  Worker agrees and understands: monthly contributions are <strong>non-refundable</strong>. No worker can demand contribution refund after any duration.
                  Contribution amounts cannot be withdrawn, reversed, or claimed back. Leaving the platform or deleting the account does not entitle the worker to any refund.
                </p>

                <h3>8. No Legal Claims Allowed</h3>
                <p>
                  Since the Fund is a <strong>voluntary welfare program</strong>, not an insurance product:
                </p>
                <ul>
                  <li>No worker can file a legal complaint for payout enforcement.</li>
                  <li>No consumer court, insurance court, IRDA, or civil claim applies.</li>
                  <li>KaamLink’s decision on the Fund is final and binding.</li>
                </ul>
                <p>Any legal action attempted contrary to these terms will be treated as invalid.</p>

                <h3>9. Contribution Usage</h3>
                <p>
                  Workers understand that contributions may be used for payouts, fund operations, management expenses, admin work, verification,
                  fraud detection, and other fund-related activities. KaamLink may also contribute additional money to the Fund voluntarily.
                  Contribution usage data is internal and not required to be publicly disclosed.
                </p>

                <h3>10. Fraud / Misuse</h3>
                <p>KaamLink may deny support if a worker:</p>
                <ul>
                  <li>Provides fake documents.</li>
                  <li>Fakes injury or accident.</li>
                  <li>Attempted misuse of the program.</li>
                </ul>
                <p>Such users may be permanently banned from KaamLink.</p>

                <h3>11. Fund Suspension / Termination</h3>
                <p>
                  KaamLink reserves full rights to modify the Fund, increase or decrease contribution amount, temporarily pause payouts,
                  permanently shut down the Fund, or reject any claim. If the Fund is shut down, no refunds will be issued.
                </p>

                <h3>12. Worker Agreement</h3>
                <p>
                  By joining and paying the monthly contribution, the worker agrees that they have read and understood these Terms; they
                  understand the voluntary and non-insurance nature of the program; they accept the no-refund and no-guarantee policy; they
                  accept that KaamLink’s decision is final; and they accept that this is goodwill support, not a contractual obligation.
                </p>

                <h3>13. Contact</h3>
                <p>For queries related to the Fund: <a href="mailto:support@bothinnovations.in" className="text-blue-600 underline">support@bothinnovations.in</a></p>

                <hr />

                <p className="text-sm text-slate-500">This document is a voluntary program description for the KaamLink Worker Safety Fund and is not a substitute for legal or insurance advice. KaamLink recommends consulting a lawyer before relying on or offering this program as a formal product.</p>
              </article>
            </div>
          </section>

          {/* Right column: actions */}
          <aside className="md:col-span-1 p-6 border-l">
            <div className="sticky top-6">
              <h4 className="font-medium mb-3">Actions</h4>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    id="agree"
                    type="checkbox"
                    checked={checked}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 mt-1 accent-sky-600"
                  />
                  <label htmlFor="agree" className="text-sm">
                    I have read and agree to the Terms &amp; Conditions.
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={!checked}
                  className={`w-full px-4 py-2 rounded-md text-white font-medium ${checked ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                >
                  Accept &amp; Continue
                </button>

                <button
                  type="button"
                  onClick={() => void router.push("/safety-fund-details")}
                  className="w-full px-4 py-2 rounded-md bg-white border text-sm"
                >
                  View Fund Details
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full px-4 py-2 rounded-md bg-white border text-sm"
                >
                  Print / Save as PDF
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-4 py-2 rounded-md bg-white border text-sm"
                >
                  {copied ? "Copied" : "Copy T&C"}
                </button>

                <div className="mt-4 text-xs text-slate-500">
                  <p><strong>Note:</strong> This Fund is voluntary. Contributions are non-refundable. This is not an insurance policy.</p>
                </div>

                <div className="mt-4">
                  <Link href="/" className="block text-center text-sm underline">Back to app</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="p-6 border-t text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Both Innovations Pvt. / KaamLink — Worker Safety Fund
        </footer>
      </div>
    </main>
  );
}
