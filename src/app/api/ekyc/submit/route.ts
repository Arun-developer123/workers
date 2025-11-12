// src/app/api/ekyc/submit/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const safeExt = (name?: string) => {
  if (!name) return "bin";
  const parts = String(name).split(".");
  if (parts.length === 1) return "bin";
  const raw = parts[parts.length - 1] || "bin";
  return raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
};

// utility to read a ReadableStream to Buffer (fallback)
async function streamToBuffer(stream: any): Promise<Buffer> {
  const reader = stream.getReader?.() ?? null;
  if (!reader) {
    // Node Readable stream fallback
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const msg = "Server misconfiguration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set";
      console.error("[ekyc/submit] " + msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // lazy import so module import never throws and so errors are caught here
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const form = await req.formData();

    const user_id = String(form.get("user_id") || "").trim();
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const name = String(form.get("name") || "").trim() || null;
    const phone = String(form.get("phone") || "").trim() || null;
    const aadhaar = String(form.get("aadhaar") || "").trim() || null;
    const bank_name = String(form.get("bank_name") || "").trim() || null;
    const account_number = String(form.get("account_number") || "").trim() || null;
    const ifsc = String(form.get("ifsc") || "").trim() || null;
    const upi = String(form.get("upi") || "").trim() || null;

    if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
      return NextResponse.json({ error: "Invalid aadhaar format (expect 12 digits)" }, { status: 400 });
    }

    const bucket = "worker-docs";
    const now = Date.now();
    const uploads: Record<string, { path: string } | null> = {};

    const uploadBlob = async (file: any, folder: string) => {
      if (!file) return null;
      // support both web File and Node-like streams
      let buffer: Buffer | null = null;

      if (typeof file.arrayBuffer === "function") {
        const ab = await file.arrayBuffer();
        try {
          buffer = Buffer.from(ab);
        } catch {
          buffer = Buffer.from(new Uint8Array(ab));
        }
      } else if (typeof file.stream === "function") {
        const s = file.stream();
        buffer = await streamToBuffer(s);
      } else if (file instanceof Blob) {
        const ab = await file.arrayBuffer();
        buffer = Buffer.from(ab);
      } else {
        // unsupported file-like object
        throw new Error("unsupported file object");
      }

      const ext = safeExt((file as any).name);
      const filePath = `${folder}/${user_id}_${now}.${ext}`;
      const contentType = (file as any).type || "application/octet-stream";

      const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

      if (error) {
        throw new Error(`storage.upload failed (${folder}): ${error.message || JSON.stringify(error)}`);
      }
      return { path: filePath };
    };

    // get file entries (may be File objects)
    const aadhaarFile = form.get("aadhaar_file") as any | null;
    const bankFile = form.get("bank_file") as any | null;
    const profileFile = form.get("profile_file") as any | null;

    // upload each with its own try/catch to give clearer errors
    try {
      uploads.aadhaar = aadhaarFile ? await uploadBlob(aadhaarFile, "aadhaar") : null;
    } catch (e: any) {
      console.error("[ekyc/submit] aadhaar upload error:", e?.message || e);
      return NextResponse.json({ error: `aadhaar upload failed: ${e?.message || String(e)}` }, { status: 500 });
    }

    try {
      uploads.bank = bankFile ? await uploadBlob(bankFile, "bank") : null;
    } catch (e: any) {
      console.error("[ekyc/submit] bank upload error:", e?.message || e);
      return NextResponse.json({ error: `bank upload failed: ${e?.message || String(e)}` }, { status: 500 });
    }

    try {
      uploads.profile = profileFile ? await uploadBlob(profileFile, "profile") : null;
    } catch (e: any) {
      console.error("[ekyc/submit] profile upload error:", e?.message || e);
      return NextResponse.json({ error: `profile upload failed: ${e?.message || String(e)}` }, { status: 500 });
    }

    const aadhaar_masked = aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : null;
    const bank_account_masked = account_number ? `XXXX-XXXX-${account_number.slice(-4)}` : null;

    const updates: Record<string, any> = {
      user_id,
      updated_at: new Date().toISOString(),
      is_ekyc_complete: true,
      ekyc_status: "pending",
      documents: JSON.stringify({
        aadhaar: uploads.aadhaar?.path || null,
        bank: uploads.bank?.path || null,
        profile: uploads.profile?.path || null,
      }),
    };

    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (aadhaar_masked) updates.aadhaar_masked = aadhaar_masked;
    if (bank_account_masked) updates.bank_account_masked = bank_account_masked;
    if (bank_name) updates.bank_name = bank_name;
    if (ifsc) updates.ifsc = ifsc;
    if (upi) updates.upi = upi;
    if (uploads.profile?.path) updates.profile_image_path = uploads.profile.path;

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(updates, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("[ekyc/submit] profiles upsert error:", upsertErr);
      if ((upsertErr as any).message && (upsertErr as any).message.includes("foreign key")) {
        return NextResponse.json({
          error: "profiles upsert failed (DB foreign-key/type mismatch). Check profiles.user_id vs worker_documents.user_id types (uuid vs text).",
          detail: process.env.NODE_ENV !== "production" ? (upsertErr as any).message : undefined,
        }, { status: 500 });
      }
      return NextResponse.json({ error: upsertErr.message || String(upsertErr) }, { status: 500 });
    }

    // insert audit row (non-fatal)
    try {
      const { error: docErr } = await supabaseAdmin.from("worker_documents").insert([
        {
          user_id,
          aadhaar_path: uploads.aadhaar?.path || null,
          bank_path: uploads.bank?.path || null,
          profile_path: uploads.profile?.path || null,
          uploaded_at: new Date().toISOString(),
        },
      ]);

      if (docErr) {
        console.warn("[ekyc/submit] worker_documents insert warning:", docErr);
        if ((docErr as any).message && (docErr as any).message.includes("foreign key")) {
          return NextResponse.json({
            error: "worker_documents insert failed due to foreign key / type mismatch between worker_documents.user_id and profiles.user_id. Ensure both columns have the same type (uuid vs text).",
            detail: process.env.NODE_ENV !== "production" ? (docErr as any).message : undefined
          }, { status: 500 });
        }
      }
    } catch (e: any) {
      console.warn("[ekyc/submit] worker_documents insert exception:", e);
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ error: "worker_documents insert exception", detail: String(e) }, { status: 500 });
      } else {
        console.warn("[ekyc/submit] continuing despite worker_documents insert exception");
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[ekyc/submit] uncaught ERROR:", err);
    const message = err?.message || "internal_error";
    const payload: any = { error: message };
    if (process.env.NODE_ENV !== "production") {
      payload.detail = err?.stack || null;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
