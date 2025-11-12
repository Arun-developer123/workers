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

// fallback helper: accept either a web ReadableStream or Node Readable stream
async function streamToBuffer(stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream): Promise<Buffer> {
  // web ReadableStream (has getReader)
  const webReader = (stream as ReadableStream<any>)?.getReader?.();
  if (webReader) {
    const chunks: Uint8Array[] = [];
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { done, value } = await webReader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  // Node.js Readable stream fallback (async iterable)
  const nodeChunks: Uint8Array[] = [];
  // for-await-of works for Node streams that are async iterable
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of stream as NodeJS.ReadableStream & AsyncIterable<Uint8Array>) {
    if (typeof chunk === "string") {
      nodeChunks.push(Buffer.from(chunk));
    } else {
      nodeChunks.push(Buffer.from(chunk));
    }
  }
  return Buffer.concat(nodeChunks);
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

    // lazy import so module import never throws at top-level
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

    // Accept FormDataEntryValue (File | string) and handle safe narrowing
    const uploadBlob = async (file: FormDataEntryValue | null, folder: string): Promise<{ path: string } | null> => {
      if (!file) return null;

      // file may be a string (shouldn't for files) — guard against that
      if (typeof file === "string") {
        throw new Error("expected a file upload, got string");
      }

      // Now file is a File or Blob-like object
      // Try arrayBuffer() (web File/Blob)
      let buffer: Buffer;
      try {
        if (typeof (file as Blob).arrayBuffer === "function") {
          const ab = await (file as Blob).arrayBuffer();
          buffer = Buffer.from(ab);
        } else if (typeof (file as any).stream === "function") {
          // some runtimes expose stream()
          const s = (file as any).stream();
          buffer = await streamToBuffer(s as ReadableStream<Uint8Array> | NodeJS.ReadableStream);
        } else {
          // last resort: treat as Blob-like and try arrayBuffer
          const ab = await (file as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer?.();
          if (!ab) throw new Error("unsupported file-like object");
          buffer = Buffer.from(ab);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`failed to read file body: ${msg}`);
      }

      const name = typeof (file as { name?: string }).name === "string" ? (file as { name?: string }).name : undefined;
      const ext = safeExt(name);
      const filePath = `${folder}/${user_id}_${now}.${ext}`;
      const contentType = typeof (file as { type?: string }).type === "string" ? (file as { type?: string }).type : "application/octet-stream";

      const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

      if (error) {
        throw new Error(`storage.upload failed (${folder}): ${error.message || JSON.stringify(error)}`);
      }
      return { path: filePath };
    };

    // grab file entries (FormDataEntryValue | null)
    const aadhaarFile = form.get("aadhaar_file") as FormDataEntryValue | null;
    const bankFile = form.get("bank_file") as FormDataEntryValue | null;
    const profileFile = form.get("profile_file") as FormDataEntryValue | null;

    // upload each with its own try/catch to give clearer errors
    try {
      uploads.aadhaar = aadhaarFile ? await uploadBlob(aadhaarFile, "aadhaar") : null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[ekyc/submit] aadhaar upload error:", msg);
      return NextResponse.json({ error: `aadhaar upload failed: ${msg}` }, { status: 500 });
    }

    try {
      uploads.bank = bankFile ? await uploadBlob(bankFile, "bank") : null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[ekyc/submit] bank upload error:", msg);
      return NextResponse.json({ error: `bank upload failed: ${msg}` }, { status: 500 });
    }

    try {
      uploads.profile = profileFile ? await uploadBlob(profileFile, "profile") : null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[ekyc/submit] profile upload error:", msg);
      return NextResponse.json({ error: `profile upload failed: ${msg}` }, { status: 500 });
    }

    const aadhaar_masked = aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : null;
    const bank_account_masked = account_number ? `XXXX-XXXX-${account_number.slice(-4)}` : null;

    const updates: Record<string, unknown> = {
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

    if (name) (updates as Record<string, unknown>).name = name;
    if (phone) (updates as Record<string, unknown>).phone = phone;
    if (aadhaar_masked) (updates as Record<string, unknown>).aadhaar_masked = aadhaar_masked;
    if (bank_account_masked) (updates as Record<string, unknown>).bank_account_masked = bank_account_masked;
    if (bank_name) (updates as Record<string, unknown>).bank_name = bank_name;
    if (ifsc) (updates as Record<string, unknown>).ifsc = ifsc;
    if (upi) (updates as Record<string, unknown>).upi = upi;
    if (uploads.profile?.path) (updates as Record<string, unknown>).profile_image_path = uploads.profile.path;

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(updates, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("[ekyc/submit] profiles upsert error:", upsertErr);
      const msg = (upsertErr as { message?: string }).message;
      if (msg && msg.includes("foreign key")) {
        return NextResponse.json({
          error: "profiles upsert failed (DB foreign-key/type mismatch). Check profiles.user_id vs worker_documents.user_id types (uuid vs text).",
          detail: process.env.NODE_ENV !== "production" ? msg : undefined,
        }, { status: 500 });
      }
      return NextResponse.json({ error: (upsertErr as { message?: string }).message || String(upsertErr) }, { status: 500 });
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
        const msg = (docErr as { message?: string }).message;
        if (msg && msg.includes("foreign key")) {
          return NextResponse.json({
            error: "worker_documents insert failed due to foreign key / type mismatch between worker_documents.user_id and profiles.user_id. Ensure both columns have the same type (uuid vs text).",
            detail: process.env.NODE_ENV !== "production" ? msg : undefined
          }, { status: 500 });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[ekyc/submit] worker_documents insert exception:", msg);
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ error: "worker_documents insert exception", detail: msg }, { status: 500 });
      } else {
        console.warn("[ekyc/submit] continuing despite worker_documents insert exception");
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ekyc/submit] uncaught ERROR:", msg);
    const payload: Record<string, unknown> = { error: msg };
    if (process.env.NODE_ENV !== "production") {
      payload.detail = (err instanceof Error && err.stack) ? err.stack : null;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
