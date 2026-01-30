// app/api/razorpay/verify/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId, amount } =
      body as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        applicationId: string;
        amount: number;
      };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !applicationId) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return NextResponse.json({ error: "server_config_missing" }, { status: 500 });

    const generated = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated !== razorpay_signature) {
      console.warn("signature mismatch", { generated, razorpay_signature });
      return NextResponse.json({ error: "signature_mismatch" }, { status: 403 });
    }

    // signature ok -> persist payment and update applications.status=accepted
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // fetch application row to get related ids for payments table (defensive)
    const { data: appRow, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("id, contractor_id, worker_id, job_id")
      .eq("id", applicationId)
      .single();

    if (appErr || !appRow) {
      console.error("application not found", appErr);
      return NextResponse.json({ error: "application_not_found" }, { status: 404 });
    }

    // insert payment record
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      application_id: applicationId,
      contractor_id: appRow.contractor_id,
      worker_id: appRow.worker_id,
      job_id: appRow.job_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: amount ?? 0,
      currency: "INR",
    });

    if (payErr) {
      console.error("payment insert failed", payErr);
      return NextResponse.json({ error: "payment_insert_failed" }, { status: 500 });
    }

    // update application status -> accepted
    const { error: upErr } = await supabaseAdmin.from("applications").update({ status: "accepted" }).eq("id", applicationId);
    if (upErr) {
      console.error("update application status failed", upErr);
      return NextResponse.json({ error: "update_application_failed" }, { status: 500 });
    }

    // success
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify unexpected", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
