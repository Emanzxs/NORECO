export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
  if (!SECRET_KEY) return res.status(500).json({ error: 'PayMongo secret key not configured.' });

  const { amountPHP, description, meterSN, billId, type, applicationId, processingMode, successUrl, failedUrl } = req.body;

  const amount = 1; // 🧪 TRIAL: fixed at ₱1
  

  const amountCentavos = Math.round(amount * 100);
  const remarks = type === 'connection'
    ? `AppID:${applicationId} | Mode:${processingMode}`
    : `BillID:${billId} | Meter:${meterSN}`;
  const linkDescription = description ||
    (type === 'connection'
      ? `NORECO I New Connection – ${processingMode === 'assisted' ? 'Assisted' : 'Self-Service'}`
      : `NORECO I Electric Bill – Meter ${meterSN}`);

  try {
    const pmResp = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            currency: 'PHP',
            description: linkDescription,
            remarks,
            redirect: { success: successUrl, failed: failedUrl },
          },
        },
      }),
    });

    const pmJson = await pmResp.json();
    if (!pmResp.ok) {
      const errMsg = pmJson?.errors?.[0]?.detail || `PayMongo error ${pmResp.status}`;
      return res.status(pmResp.status).json({ error: errMsg });
    }

    const linkData    = pmJson?.data;
    const checkoutUrl = linkData?.attributes?.checkout_url;
    const linkId      = linkData?.id;
    if (!checkoutUrl) return res.status(500).json({ error: 'PayMongo did not return a checkout URL.' });

    return res.status(200).json({ checkoutUrl, linkId });
  } catch (err) {
    console.error('[create-payment-link] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
