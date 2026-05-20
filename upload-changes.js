// ═══════════════════════════════════════════════════════════════
//  NORECO I — Upload Call-site Changes per Page
//  Replace the existing import lines shown below in each file.
// ═══════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────
// 1. report.html  (inside the <script type="module"> block)
// ───────────────────────────────────────────────────────────────

// BEFORE:
import { uploadFile } from './supabase-config.js';

// AFTER: (no change needed — uploadFile still works)
import { uploadFile, uploadReportPhoto } from './supabase-config.js';

// Then change the photo upload line from:
photoURL = await uploadFile(photoFile, `reports/${refNum}`);
// To (cleaner, same result):
photoURL = await uploadReportPhoto(photoFile, refNum);


// ───────────────────────────────────────────────────────────────
// 2. new-connection.html  (inside the <script type="module"> block)
// ───────────────────────────────────────────────────────────────

// BEFORE:
import { uploadFile } from './supabase-config.js';

// AFTER:
import {
  uploadFile,
  uploadConnectionDoc,
  uploadPmesCert,
  uploadConnectionReceipt,
} from './supabase-config.js';

// In handlePaymentClick() — change doc upload loop from:
docs[DOC_FIELDS[i]] = await uploadFile(input.files[0], `new-connections/${uid}`);
// To:
docs[DOC_FIELDS[i]] = await uploadConnectionDoc(input.files[0], uid);

// And the PMES cert from:
docs['pmesCertificate'] = await uploadFile(pmesInput.files[0], `new-connections/${uid}`);
// To:
docs['pmesCertificate'] = await uploadPmesCert(pmesInput.files[0], uid);

// In ncSubmitReceipt() — change receipt upload from:
const publicUrl = await uploadFile(ncReceiptFile, folder);
// To:
const publicUrl = await uploadConnectionReceipt(ncReceiptFile, ncApplicationId);


// ───────────────────────────────────────────────────────────────
// 3. bills.html  (inside the <script> block)
// ───────────────────────────────────────────────────────────────

// The dynamic import in submitReceipt() currently is:
const { uploadFile } = await import('./supabase-config.js');
const publicUrl = await uploadFile(_receiptFile, folder);

// Replace those two lines with:
const { uploadBillReceipt } = await import('./supabase-config.js');
const publicUrl = await uploadBillReceipt(_receiptFile, user.meterSN, _receiptBillId, refNumber);
// Note: you can remove the `safeRef` and `folder` variables above it — no longer needed.