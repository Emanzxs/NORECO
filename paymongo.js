// ─────────────────────────────────────────────
// paymongo.js
// MULTI-PAYMENT TYPE (STATIC LINKS)
// ─────────────────────────────────────────────

// BILL PAYMENT LINK
const BILL_PAYMENT_LINK =
  'https://pm.link/org-ony8gBWFPdktHD9DsFEnxKHP/fkFI8HR';

// CONNECTION / APPLICATION PAYMENT LINK  (Self-Service — ₱3,000)
const CONNECTION_PAYMENT_LINK =
  'https://pm.link/org-ony8gBWFPdktHD9DsFEnxKHP/fuY3sN3';

// ASSISTED CONNECTION PAYMENT LINK  (Assisted Processing — ₱7,000)
const ASSISTED_CONNECTION_PAYMENT_LINK =
  'https://pm.link/org-ony8gBWFPdktHD9DsFEnxKHP/tiMyVRw';


// ─────────────────────────────────────────────
// BILL PAYMENT
// ─────────────────────────────────────────────
export async function createPaymentLink({
  amountPHP = 0,
  description = '',
  meterSN = '',
  billId = ''
} = {}) {

  const amount = parseFloat(amountPHP);

  if (!isNaN(amount) && amount > 0 && amount < 20) {
    throw new Error('Minimum payment amount is ₱20.00');
  }

  window.open(BILL_PAYMENT_LINK, '_blank');

  return {
    checkoutUrl: BILL_PAYMENT_LINK,
    linkId: 'bill-payment-link'
  };
}


// ─────────────────────────────────────────────
// CONNECTION / APPLICATION PAYMENT
// ─────────────────────────────────────────────
export async function createConnectionPaymentLink({
  amountPHP = 0,
  applicationId = '',
  processingMode = 'self'
} = {}) {

  const amount = parseFloat(amountPHP);

  if (!isNaN(amount) && amount > 0 && amount < 20) {
    throw new Error('Minimum payment amount is ₱20.00');
  }

  const link = processingMode === 'assisted'
    ? ASSISTED_CONNECTION_PAYMENT_LINK
    : CONNECTION_PAYMENT_LINK;

  window.open(link, '_blank');

  return {
    checkoutUrl: link,
    linkId: processingMode === 'assisted' ? 'assisted-connection-payment-link' : 'connection-payment-link'
  };
}


// ─────────────────────────────────────────────
export function checkPaymentRedirect() {
  return null;
}