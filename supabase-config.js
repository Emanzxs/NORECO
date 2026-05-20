// ── NORECO I ElectService — Supabase Configuration ──────────────
// Handles ALL file uploads for: new-connection.html, bills.html, report.html
//
// BUCKET LAYOUT (all inside the "applications" bucket):
//   new-connections/{uid}/          ← requirement docs + PMES cert
//   connection-receipts/{appId}/    ← PayMongo payment receipts (new-connection)
//   reports/{refNum}/               ← problem-report photos
//   receipts/{meterSN}/{billId}/    ← bill payment receipt images
//
// ─────────────────────────────────────────────────────────────────

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://qwlhjstscnxrlzjriqgl.supabase.co',
  'sb_publishable_s5EVPcnFOG9urr6s3tRBzQ_vIZBrfCk'
);

// ─────────────────────────────────────────────────────────────────
// Core upload helper
// ─────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage (bucket: applications).
 *
 * @param {File}   file        - The File object to upload
 * @param {string} folder      - Folder path inside the bucket
 *                               e.g. 'reports/REQ-2026-1234'
 * @param {object} [opts]
 * @param {string} [opts.customName]  - Override the generated filename
 * @param {number} [opts.maxMB=10]    - Max file size in MB (throws if exceeded)
 * @returns {Promise<string>}         - Public URL of the uploaded file
 */
export async function uploadFile(file, folder, opts = {}) {
  const { customName, maxMB = 10 } = opts;

  // ── 1. Size guard ────────────────────────────────────────────
  if (file.size > maxMB * 1024 * 1024) {
    throw new Error(`File too large. Maximum allowed size is ${maxMB} MB.`);
  }

  // ── 2. Build a collision-safe filename ───────────────────────
  const ext      = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeName = customName
    ? customName.replace(/[^a-zA-Z0-9._-]/g, '_')
    : `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const filePath = `${folder.replace(/\/+$/, '')}/${safeName}`;

  // ── 3. Upload ────────────────────────────────────────────────
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('applications')
    .upload(filePath, file, {
      upsert:       true,           // avoids "row exists" RLS conflicts on retry
      cacheControl: '3600',
      contentType:  file.type || 'application/octet-stream',
    });

  if (uploadError) {
    // ── Friendly RLS error detection ────────────────────────────
    const msg = uploadError.message || JSON.stringify(uploadError);
    if (
      msg.toLowerCase().includes('row-level security') ||
      msg.toLowerCase().includes('violates') ||
      uploadError.statusCode === '403' ||
      uploadError.status === 403
    ) {
      throw new Error(
        'STORAGE_RLS: Upload blocked by Supabase storage policy. ' +
        'See the setup guide (SUPABASE_SETUP.md) to fix this.'
      );
    }
    throw new Error(msg);
  }

  // ── 4. Return public URL ─────────────────────────────────────
  const { data: urlData } = supabase.storage
    .from('applications')
    .getPublicUrl(uploadData?.path ?? filePath);

  return urlData.publicUrl;
}

// ─────────────────────────────────────────────────────────────────
// Page-specific wrappers (optional convenience — keeps call sites clean)
// ─────────────────────────────────────────────────────────────────

/**
 * Upload a requirement document for new-connection applications.
 * Folder: new-connections/{uid}
 */
export async function uploadConnectionDoc(file, uid) {
  return uploadFile(file, `new-connections/${uid || 'anonymous'}`, { maxMB: 10 });
}

/**
 * Upload a PMES certificate for new-connection applications.
 * Folder: new-connections/{uid}
 */
export async function uploadPmesCert(file, uid) {
  return uploadFile(file, `new-connections/${uid || 'anonymous'}`, { maxMB: 10 });
}

/**
 * Upload a PayMongo payment receipt for a new-connection application.
 * Folder: connection-receipts/{applicationId}
 */
export async function uploadConnectionReceipt(file, applicationId) {
  return uploadFile(file, `connection-receipts/${applicationId}`, { maxMB: 5 });
}

/**
 * Upload a bill payment receipt (bills.html).
 * Folder: receipts/{meterSN}/{billId}/ref_{safeRef}
 */
export async function uploadBillReceipt(file, meterSN, billId, refNumber) {
  const safeRef = refNumber.replace(/[^a-zA-Z0-9\-_]/g, '_');
  return uploadFile(file, `receipts/${meterSN}/${billId}/ref_${safeRef}`, { maxMB: 5 });
}

/**
 * Upload a problem-report photo (report.html).
 * Folder: reports/{refNum}
 */
export async function uploadReportPhoto(file, refNum) {
  return uploadFile(file, `reports/${refNum}`, { maxMB: 10 });
}