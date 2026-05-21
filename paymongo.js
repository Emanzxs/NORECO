// ─────────────────────────────────────────────────────────────────
// paymongo.js  ·  NORECO I ElectService ECMS
// Frontend-safe — calls your own Vercel /api/ proxy routes.
// Secret key lives in Vercel env vars, NEVER here.
// ─────────────────────────────────────────────────────────────────

// Your Vercel API routes (same origin — no CORS issues)
const API_CREATE_LINK  = '/api/create-payment-link';
const API_VERIFY       = '/api/verify-payment';


// ─────────────────────────────────────────────────────────────────
// INTERNAL: Build success/failed redirect URLs for this page
// ─────────────────────────────────────────────────────────────────
function _redirectUrls(refKey, refValue, type = 'bill') {
  const base = window.location.origin + window.location.pathname;
  return {
    success: `${base}?pm_status=paid&${refKey}=${encodeURIComponent(refValue)}&type=${type}`,
    failed:  `${base}?pm_status=failed&${refKey}=${encodeURIComponent(refValue)}&type=${type}`,
  };
}


// ─────────────────────────────────────────────────────────────────
// INTERNAL: Verify a payment link via your Vercel serverless route
// ─────────────────────────────────────────────────────────────────
async function _verifyLink(linkId) {
  try {
    const resp = await fetch(`${API_VERIFY}?linkId=${encodeURIComponent(linkId)}`);
    const json = await resp.json();

    if (!resp.ok) throw new Error(json.error || `Verify error ${resp.status}`);

    return {
      paid:            json.paid,
      status:          json.status,
      referenceNumber: json.referenceNumber,
      amount:          json.amount,
      linkId,
    };
  } catch (err) {
    console.error('[PayMongo] _verifyLink error:', err);
    return { paid: false, error: err.message };
  }
}


// ─────────────────────────────────────────────────────────────────
// CREATE BILL PAYMENT LINK
// Calls your Vercel /api/create-payment-link → PayMongo API
// Returns a unique checkout URL for this exact bill & amount.
// Then navigates same-tab so PayMongo can redirect back.
// ─────────────────────────────────────────────────────────────────
export async function createPaymentLink({
  amountPHP   = 0,
  description = '',
  meterSN     = '',
  billId      = '',
  userEmail   = '',
  userName    = '',
} = {}) {

  const amount = parseFloat(amountPHP);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid payment amount.');
  if (amount < 20)                  throw new Error('Minimum payment amount is ₱20.00');

  const { success, failed } = _redirectUrls('bill_id', billId, 'bill');

  const resp = await fetch(API_CREATE_LINK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountPHP,
      description: description || `NORECO I Electric Bill – Meter ${meterSN}`,
      meterSN,
      billId,
      type: 'bill',
      successUrl: success,
      failedUrl:  failed,
    }),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`);

  const { checkoutUrl, linkId } = json;
  if (!checkoutUrl) throw new Error('No checkout URL returned.');

  // Persist context for recovery on redirect return
  sessionStorage.setItem('paymongo_pending', JSON.stringify({
    type: 'bill', billId, meterSN, userEmail, userName,
    amount, linkId, timestamp: Date.now(),
  }));

  // Navigate same-tab → PayMongo will redirect back with pm_status param
  window.location.href = checkoutUrl;

  return { checkoutUrl, linkId };
}


// ─────────────────────────────────────────────────────────────────
// CREATE CONNECTION / APPLICATION PAYMENT LINK
// Self-Service ₱3,000  |  Assisted ₱7,000
// ─────────────────────────────────────────────────────────────────
export async function createConnectionPaymentLink({
  amountPHP       = 0,
  applicationId   = '',
  processingMode  = 'self',
  applicantName   = '',
  applicantEmail  = '',
} = {}) {

  const amount = parseFloat(amountPHP);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid payment amount.');
  if (amount < 20)                  throw new Error('Minimum payment amount is ₱20.00');

  const { success, failed } = _redirectUrls('app_id', applicationId, 'connection');

  const resp = await fetch(API_CREATE_LINK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountPHP,
      type:          'connection',
      applicationId,
      processingMode,
      successUrl:    success,
      failedUrl:     failed,
    }),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`);

  const { checkoutUrl, linkId } = json;
  if (!checkoutUrl) throw new Error('No checkout URL returned.');

  sessionStorage.setItem('paymongo_pending', JSON.stringify({
    type: 'connection', applicationId, processingMode,
    applicantName, applicantEmail, amount, linkId, timestamp: Date.now(),
  }));

  window.location.href = checkoutUrl;

  return { checkoutUrl, linkId };
}


// ─────────────────────────────────────────────────────────────────
// AUTO-VERIFICATION ON RETURN FROM PAYMONGO CHECKOUT
// Reads URL params PayMongo appended, verifies via /api/verify-payment,
// returns { status, billId, referenceNumber, amount, ctx } to caller.
// The caller (bills.html / new-connection.html) handles Firestore update.
// ─────────────────────────────────────────────────────────────────
export async function checkPaymentRedirect() {
  const params = new URLSearchParams(window.location.search);

  const pmStatus    = params.get('pm_status');         // 'paid' | 'failed'
  const pmLinkId    = params.get('payment_link_id');   // pl_xxxx (PayMongo appends this)
  const billIdParam = params.get('bill_id');
  const appIdParam  = params.get('app_id');
  const typeParam   = params.get('type');

  // Not a PayMongo return
  if (!pmStatus && !pmLinkId) return null;

  // Strip all PayMongo params from URL immediately (prevent re-processing on refresh)
  window.history.replaceState({}, '', window.location.pathname);

  // Recover persisted context
  let ctx = null;
  try { ctx = JSON.parse(sessionStorage.getItem('paymongo_pending') || 'null'); }
  catch(e) {}

  const billId = billIdParam || ctx?.billId || null;
  const linkId = pmLinkId   || ctx?.linkId  || null;

  // ── FAILED ────────────────────────────────────────────────────
  if (pmStatus === 'failed' || pmStatus === 'cancelled') {
    sessionStorage.removeItem('paymongo_pending');
    return { status: 'failed', billId, appId: appIdParam, ctx };
  }

  // ── PAID — verify server-side before trusting ─────────────────
  if (pmStatus === 'paid' || pmStatus === 'success') {
    if (linkId) {
      const verified = await _verifyLink(linkId);
      sessionStorage.removeItem('paymongo_pending');

      if (verified.paid) {
        return {
          status:          'success',
          billId,
          appId:           appIdParam,
          type:            typeParam || ctx?.type || 'bill',
          referenceNumber: verified.referenceNumber,
          amount:          verified.amount,
          linkId,
          ctx,
        };
      }
      // API says not paid — reject
      return { status: 'failed', billId, appId: appIdParam, ctx };
    }

    // No link ID to verify (edge case) — trust the URL param
    sessionStorage.removeItem('paymongo_pending');
    return {
      status: 'success', billId, appId: appIdParam,
      type: typeParam || ctx?.type || 'bill',
      referenceNumber: null, amount: ctx?.amount || null, linkId: null, ctx,
    };
  }

  // ── Ambiguous — has payment_link_id but no pm_status ─────────
  if (linkId) {
    const verified = await _verifyLink(linkId);
    sessionStorage.removeItem('paymongo_pending');
    if (verified.paid) {
      return {
        status: 'success', billId, appId: appIdParam,
        type: typeParam || ctx?.type || 'bill',
        referenceNumber: verified.referenceNumber,
        amount: verified.amount, linkId, ctx,
      };
    }
  }

  sessionStorage.removeItem('paymongo_pending');
  return null;
}


// ─────────────────────────────────────────────────────────────────
// UTILITY: Manually check any payment link status
// ─────────────────────────────────────────────────────────────────
export async function getPaymentLinkStatus(linkId) {
  return await _verifyLink(linkId);
}