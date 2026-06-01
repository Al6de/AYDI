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
  if (!key) return res.status(200).json({ premium: false, error: 'no_key' });

  try {
    // Read user metadata directly via admin API (always current, bypasses JWT cache)
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(200).json({ premium: false, error: err });
    }
    const user = await r.json();
    const isPremium = user?.user_metadata?.is_premium === true;
    // debug: return raw metadata so we can see the actual field names
    return res.status(200).json({
      premium: isPremium,
      debug_meta: user?.user_metadata,
      debug_raw: user?.raw_user_meta_data,
      debug_app: user?.app_metadata
    });
  } catch(e) {
    return res.status(200).json({ premium: false, error: String(e) });
  }
};
