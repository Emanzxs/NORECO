const API_CREATE_LINK = '/api/create-payment-link';
const API_VERIFY      = '/api/verify-payment';

function _redirectUrls(refKey, refValue, type = 'bill') {
  const base = window.location.origin + window.location.pathname;
  return {
    success: `${base}?pm_status=paid&${refKey}=${encodeURIComponent(refValue)}&type=${type}`,
    failed:  `${base}?pm_status=failed&${refKey}=${encodeURIComponent(refValue)}&type=${type}`,
  };
}

async function _verifySession(sessionId) {
  try {
    const resp = await fetch(`${API_VERIFY}?linkId=${encodeURIComponent(sessionId)}`);
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || `Verify error ${resp.status}`);
    return { paid: json.paid, status: json.status, referenceNumber: json.referenceNumber, amount: json.amount, sessionId };
  } catch (err) {
    console.error('[PayMongo] verify error:', err);
    return { paid: false, error: err.message };
  }
}

// Poll every 5 seconds until paid or timeout (10 minutes)
function _pollUntilPaid(sessionId, onPaid, onTimeout) {
  let attempts = 0;
  const MAX = 120; // 120 x 5s = 10 minutes
  const interval = setInterval(async () => {
    attempts++;
    const result = await _verifySession(sessionId);
    if (result.paid) {
      clearInterval(interval);
      onPaid(result);
    } else if (attempts >= MAX) {
      clearInterval(interval);
      onTimeout();
    }
  }, 5000);
  return interval; // return so caller can cancel if needed
}

export async function createPaymentLink({ amountPHP = 0, description = '', meterSN = '', billId = '', userEmail = '', userName = '' } = {}) {
  const { success, failed } = _redirectUrls('bill_id', billId, 'bill');
  const resp = await fetch(API_CREATE_LINK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountPHP, description: description || `NORECO I Electric Bill – Meter ${meterSN}`, meterSN, billId, type: 'bill', successUrl: success, failedUrl: failed }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`);
  if (!json.checkoutUrl) throw new Error('No checkout URL returned.');

  // ✅ Open in NEW TAB — user stays on bills page
  window.open(json.checkoutUrl, '_blank');

  sessionStorage.setItem('paymongo_pending', JSON.stringify({
    type: 'bill', billId, meterSN, userEmail, userName,
    amount: amountPHP, sessionId: json.linkId, timestamp: Date.now(),
  }));

  return { checkoutUrl: json.checkoutUrl, sessionId: json.linkId, poll: _pollUntilPaid };
}

export async function createConnectionPaymentLink({ amountPHP = 0, applicationId = '', processingMode = 'self', applicantName = '', applicantEmail = '' } = {}) {
  const { success, failed } = _redirectUrls('app_id', applicationId, 'connection');
  const resp = await fetch(API_CREATE_LINK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountPHP, type: 'connection', applicationId, processingMode, successUrl: success, failedUrl: failed }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`);
  if (!json.checkoutUrl) throw new Error('No checkout URL returned.');

  window.open(json.checkoutUrl, '_blank');

  sessionStorage.setItem('paymongo_pending', JSON.stringify({
    type: 'connection', applicationId, processingMode,
    applicantName, applicantEmail, amount: amountPHP,
    sessionId: json.linkId, timestamp: Date.now(),
  }));

  return { checkoutUrl: json.checkoutUrl, sessionId: json.linkId, poll: _pollUntilPaid };
}

export async function checkPaymentRedirect() {
  const params      = new URLSearchParams(window.location.search);
  const pmStatus    = params.get('pm_status');
  const sessionId   = params.get('session_id');
  const billIdParam = params.get('bill_id');
  const appIdParam  = params.get('app_id');
  const typeParam   = params.get('type');

  if (!pmStatus && !sessionId) return null;

  window.history.replaceState({}, '', window.location.pathname);

  let ctx = null;
  try { ctx = JSON.parse(sessionStorage.getItem('paymongo_pending') || 'null'); } catch(e) {}

  const billId = billIdParam || ctx?.billId    || null;
  const sid    = sessionId   || ctx?.sessionId || null;

  if (pmStatus === 'failed' || pmStatus === 'cancelled') {
    sessionStorage.removeItem('paymongo_pending');
    return { status: 'failed', billId, appId: appIdParam, ctx };
  }

  if (sid) {
    const verified = await _verifySession(sid);
    sessionStorage.removeItem('paymongo_pending');
    if (verified.paid) {
      return { status: 'success', billId, appId: appIdParam, type: typeParam || ctx?.type || 'bill', referenceNumber: verified.referenceNumber, amount: verified.amount, sessionId: sid, ctx };
    }
    return { status: 'failed', billId, appId: appIdParam, ctx };
  }

  if (pmStatus === 'paid') {
    sessionStorage.removeItem('paymongo_pending');
    return { status: 'success', billId, appId: appIdParam, type: typeParam || ctx?.type || 'bill', referenceNumber: null, amount: ctx?.amount || null, sessionId: null, ctx };
  }

  sessionStorage.removeItem('paymongo_pending');
  return null;
}

export async function getPaymentLinkStatus(sessionId) {
  return await _verifySession(sessionId);
}

export { _pollUntilPaid };
