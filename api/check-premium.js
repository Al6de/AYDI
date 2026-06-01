const SUPABASE_URL = 'https://unconepyykjytwqsxkov.supabase.co';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = req.body || {};
  if (!userId) return res.status(200).json({ premium: false });

  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return res.status(200).json({ premium: false });

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=is_premium`,
      { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } }
    );
    if (!r.ok) return res.status(200).json({ premium: false });
    const data = await r.json();
    const isPremium = Array.isArray(data) && data.length > 0 && data[0].is_premium === true;
    return res.status(200).json({ premium: isPremium });
  } catch(e) {
    return res.status(200).json({ premium: false });
  }
};
