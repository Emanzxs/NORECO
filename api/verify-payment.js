export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
  if (!SECRET_KEY) return res.status(500).json({ error: 'PayMongo secret key not configured.' });

  const { linkId } = req.query;
  if (!linkId) return res.status(400).json({ error: 'linkId is required.' });

  try {
    const pmResp = await fetch(`https://api.paymongo.com/v1/links/${linkId}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
    });

    const pmJson = await pmResp.json();
    if (!pmResp.ok) {
      const errMsg = pmJson?.errors?.[0]?.detail || `PayMongo error ${pmResp.status}`;
      return res.status(pmResp.status).json({ error: errMsg });
    }

    const attrs    = pmJson?.data?.attributes;
    const isPaid   = attrs?.status === 'paid';
    const payments = attrs?.payments || [];
    const latest   = payments[payments.length - 1];
    const referenceNumber =
      latest?.attributes?.reference_number ||
      latest?.attributes?.external_reference_number ||
      latest?.id || null;

    return res.status(200).json({
      paid:            isPaid,
      status:          attrs?.status,
      referenceNumber: isPaid ? referenceNumber : null,
      amount:          isPaid ? (attrs?.amount / 100) : null,
      linkId,
    });
  } catch (err) {
    console.error('[verify-payment] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
