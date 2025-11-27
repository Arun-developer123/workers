// src/app/safety-fund-details/page.tsx
"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ContributionRow = {
  id: string;
  user_id: string;
  amount: number;
  created_at: string | null;
  note?: string | null;
};

type ClaimRow = {
  id: string;
  user_id: string;
  amount: number;
  created_at: string | null;
  status?: "approved" | "rejected" | "pending" | string | null;
  reason?: string | null;
};

const LOCAL_ACCEPT_KEY = "kaamlink:safetyFund:accepted";
const MONTHLY_AMOUNT = 20;

export default function SafetyFundDetails(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<{ user_id: string; name?: string } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [joined, setJoined] = useState<boolean>(false);
  const [doingJoin, setDoingJoin] = useState<boolean>(false);

  // load profile from localStorage (same key used earlier in your app)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fake_user_profile");
      if (raw) {
        const p = JSON.parse(raw) as { user_id: string; name?: string } | null;
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch (_err) {
      setProfile(null);
    }
  }, []);

  // fetch contributions + claims from supabase (if tables exist)
  useEffect(() => {
    let mounted = true;

    const fetchAll = async (): Promise<void> => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // contributions
        const contribResp = await supabase
          .from("safety_fund_contributions")
          .select("id, user_id, amount, created_at, note")
          .order("created_at", { ascending: false })
          .limit(500);

        if (contribResp.error) {
          console.warn("safety_fund_contributions fetch error:", contribResp.error.message ?? contribResp.error);
          if (mounted) setContributions([]);
        } else if (contribResp.data && mounted) {
          // cast to our typed array
          setContributions((contribResp.data as unknown) as ContributionRow[]);
        }

        // claims / payouts
        const claimsResp = await supabase
          .from("safety_fund_claims")
          .select("id, user_id, amount, created_at, status, reason")
          .order("created_at", { ascending: false })
          .limit(200);

        if (claimsResp.error) {
          console.warn("safety_fund_claims fetch error:", claimsResp.error.message ?? claimsResp.error);
          if (mounted) setClaims([]);
        } else if (claimsResp.data && mounted) {
          setClaims((claimsResp.data as unknown) as ClaimRow[]);
        }
      } catch (err) {
        // Robust logging, friendly message to user
        // eslint-disable-next-line no-console
        console.error("unexpected fetchAll error", err);
        if (mounted) setErrorMsg("डेटा लाने में समस्या आई — बाद में कोशिश करें");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchAll();

    return () => {
      mounted = false;
    };
  }, []);

  // joined state: local acceptance OR any contribution by this user
  useEffect(() => {
    if (!profile) {
      setJoined(false);
      return;
    }
    try {
      const accepted = localStorage.getItem(LOCAL_ACCEPT_KEY) === "true";
      if (accepted) {
        setJoined(true);
        return;
      }
    } catch (_err) {
      // ignore
    }
    const exists = contributions.some((c) => c.user_id === profile.user_id && c.amount > 0);
    setJoined(exists);
  }, [profile, contributions]);

  // computed stats
  const stats = useMemo(() => {
    const uniqueContributors = new Set<string>(contributions.map((c) => c.user_id));
    const contributorsCount = uniqueContributors.size;
    const totalContributed = contributions.reduce((s, c) => s + (typeof c.amount === "number" ? c.amount : 0), 0);
    const totalPayouts = claims.reduce((s, c) => s + (typeof c.amount === "number" ? c.amount : 0), 0);
    const monthlyInflowEstimate = contributorsCount * MONTHLY_AMOUNT;
    const balanceEstimate = Math.max(0, totalContributed - totalPayouts);

    return {
      contributorsCount,
      totalContributed,
      totalPayouts,
      monthlyInflowEstimate,
      balanceEstimate,
    };
  }, [contributions, claims]);

  const fmt = (iso?: string | null): string => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (_err) {
      return iso;
    }
  };

  // Join fund: mark local acceptance + optional Supabase insert record
  const handleJoin = async (): Promise<void> => {
    if (!profile) {
      void router.push("/auth/sign-in");
      return;
    }

    setDoingJoin(true);
    setErrorMsg(null);

    try {
      try {
        localStorage.setItem(LOCAL_ACCEPT_KEY, "true");
      } catch (_err) {
        // ignore storage errors
      }

      // Insert an enrollment/contribution marker — recurring payments still require PSP integration
      const insertResp = await supabase.from("safety_fund_contributions").insert([
        {
          user_id: profile.user_id,
          amount: MONTHLY_AMOUNT,
          note: "Enrolled via app (recurring payment setup pending)",
        },
      ]);

      if (insertResp.error) {
        console.warn("insert contribution failed:", insertResp.error.message ?? insertResp.error);
      } else {
        // refresh contributions
        const refreshedResp = await supabase
          .from("safety_fund_contributions")
          .select("id, user_id, amount, created_at, note")
          .order("created_at", { ascending: false })
          .limit(500);

        if (!refreshedResp.error && refreshedResp.data) {
          setContributions((refreshedResp.data as unknown) as ContributionRow[]);
        }
      }

      setJoined(true);
      // Inform user to setup UPI Autopay separately
      window.alert(
        "आपने Safety Fund के लिए दर्ज़ किया है। कृपया UPI AutoPay/Recurring payment सेट करने के लिए 'Setup UPI AutoPay' विकल्प का उपयोग करें।\n\nNote: यह enrollment रिकॉर्ड है; वास्तविक recurring payments payment-gateway के माध्यम से सेटअप कराएँ।"
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleJoin error", err);
      setErrorMsg("साइनअप करने में समस्या आई — बाद में कोशिश करें");
    } finally {
      setDoingJoin(false);
    }
  };

  const handleLeave = async (): Promise<void> => {
    // user wants to opt-out — we won't attempt to delete historical records (no refunds)
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("क्या आप वाकई Safety Fund से बाहर होना चाहते हैं? पुराने योगदान refundable नहीं होंगे।")) return;

    try {
      try {
        localStorage.removeItem(LOCAL_ACCEPT_KEY);
      } catch (_err) {
        // ignore
      }

      if (profile) {
        // mark opt-out record for admin visibility
        await supabase.from("safety_fund_contributions").insert([
          {
            user_id: profile.user_id,
            amount: 0,
            note: "User opted out",
          },
        ]);
      }

      setJoined(false);
      window.alert("आपने Fund से बाहर होने का अनुरोध कर दिया है।");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleLeave error", err);
      setErrorMsg("बाहर होने में समस्या आई — बाद में कोशिश करें");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Safety Fund — Details</h1>
          <p className="text-sm text-slate-600 mt-1">Community fund to support workers for work-related injuries (voluntary)</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/safety-terms" className="text-sm underline text-slate-600">
            Read Terms &amp; Conditions
          </Link>
          <button
            type="button"
            onClick={() => void router.push("/")}
            className="text-sm bg-slate-100 px-3 py-2 rounded-md"
          >
            Back
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-sm text-slate-500">Contributors</div>
          <div className="text-2xl font-bold">{loading ? "—" : stats.contributorsCount}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-sm text-slate-500">Monthly inflow (est.)</div>
          <div className="text-2xl font-bold">₹{loading ? "—" : stats.monthlyInflowEstimate.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Assumes ₹{MONTHLY_AMOUNT}/month per contributor</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-sm text-slate-500">Total contributed</div>
          <div className="text-2xl font-bold">₹{loading ? "—" : stats.totalContributed.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-sm text-slate-500">Estimated balance</div>
          <div className="text-2xl font-bold">₹{loading ? "—" : stats.balanceEstimate.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Total − Payouts (approx)</div>
        </div>
      </div>

      {/* Join / Manage panel */}
      <div className="bg-white rounded-xl p-4 shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold">Your enrollment</h3>
            <p className="text-sm text-slate-600">
              {profile ? (
                joined ? (
                  <>आप इस Fund के सदस्य हैं — धन्यवाद {profile.name ?? ""}।</>
                ) : (
                  <>आप अभी सदस्य नहीं हैं। ₹{MONTHLY_AMOUNT}/month से जुड़कर आप श्रमिकों की मदद कर सकते हैं।</>
                )
              ) : (
                <>साइन-इन करके जुड़ें — आपको अपने खाते से जुड़ना होगा।</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              joined ? (
                <button type="button" onClick={handleLeave} className="px-4 py-2 rounded-md bg-red-600 text-white">
                  Leave Fund
                </button>
              ) : (
                <>
                  <button type="button" onClick={handleJoin} disabled={doingJoin} className="px-4 py-2 rounded-md bg-sky-600 text-white">
                    {doingJoin ? "Joining…" : `Join for ₹${MONTHLY_AMOUNT}/month`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.alert(
                        "UPI AutoPay setup requires a payment gateway. Go to the Payments page to finish setup (not implemented in this demo)."
                      );
                    }}
                    className="px-4 py-2 rounded-md bg-white border"
                  >
                    Setup UPI AutoPay
                  </button>
                </>
              )
            ) : (
              <button type="button" onClick={() => void router.push("/auth/sign-in")} className="px-4 py-2 rounded-md bg-sky-600 text-white">
                Sign in to join
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent contributions + payouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <section className="bg-white rounded-xl p-4 shadow">
          <h4 className="font-semibold mb-3">Recent contributions</h4>
          {loading ? (
            <div className="text-sm text-slate-500">लोड कर रहे हैं…</div>
          ) : contributions.length === 0 ? (
            <div className="text-sm text-slate-500">कोई योगदान रिकॉर्ड नहीं मिला।</div>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-auto">
              {contributions.slice(0, 40).map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {c.user_id === profile?.user_id ? `${profile.name ?? "You"} (you)` : `User ${shorten(c.user_id)}`}
                    </div>
                    <div className="text-xs text-slate-500">{fmt(c.created_at)} • {c.note ?? "—"}</div>
                  </div>
                  <div className="text-sm font-semibold">₹{c.amount}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl p-4 shadow">
          <h4 className="font-semibold mb-3">Recent payouts / claims</h4>
          {loading ? (
            <div className="text-sm text-slate-500">लोड कर रहे हैं…</div>
          ) : claims.length === 0 ? (
            <div className="text-sm text-slate-500">कोई payout रिकॉर्ड नहीं मिला।</div>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-auto">
              {claims.slice(0, 40).map((cl) => (
                <li key={cl.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {cl.user_id === profile?.user_id ? `${profile.name ?? "You"} (you)` : `User ${shorten(cl.user_id)}`}
                    </div>
                    <div className="text-xs text-slate-500">{fmt(cl.created_at)} • {cl.reason ?? "Claim"}</div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">₹{cl.amount}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Footer / notes */}
      <div className="bg-white rounded-xl p-4 shadow text-sm text-slate-600">
        <p className="mb-2">
          <strong>नोट:</strong> यह पेज सिर्फ़ जानकारी के लिए है। वास्तविक recurring payments और payouts को लागू करने के लिए
          <Link href="/admin" className="underline ml-1">admin tools</Link> और payment gateway (Razorpay / Cashfree / PSP) + webhook ज़रूरी हैं।
        </p>
        {errorMsg && <p className="text-red-600">Error: {errorMsg}</p>}
      </div>
    </div>
  );
}

// small helper to shorten IDs for UI
function shorten(id: string): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}
