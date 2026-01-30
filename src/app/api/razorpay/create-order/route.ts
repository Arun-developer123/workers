// app/api/razorpay/create-order/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, amount } = body as { applicationId: string; amount: number };

    if (!applicationId || !amount || !(amount > 0)) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "server_config_missing" }, { status: 500 });
    }

    // Razorpay expects integer amount in paise
    const amountPaise = Math.round(amount * 100);

    // create order via Razorpay REST API
    const resp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `app:${applicationId}`,
        notes: {
          application_id: applicationId,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("razorpay create-order failed", resp.status, txt);
      return NextResponse.json({ error: "razorpay_create_failed", details: txt }, { status: 502 });
    }

    const data = await resp.json();
    // return order id + key_id to client (key_id is safe to send)
    return NextResponse.json({
      order: {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
      },
      keyId,
    });
  } catch (err) {
    console.error("create-order unexpected", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
