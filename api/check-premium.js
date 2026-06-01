const SUPABASE_URL = 'https://unconepyykjytwqsxkov.supabase.co';

// Emails toujours premium (indépendant de la base de données)
// Ajouter aussi dans la variable Vercel PREMIUM_EMAILS (séparés par virgule)
const HARDCODED_PREMIUM = [
  'althogaming@gmail.com',
  'marty.thiery@club-internet.fr'
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, email } = req.body || {};
  if (!userId) return res.status(200).json({ premium: false });

  // 1. Check hardcoded list + PREMIUM_EMAILS env var
  const envEmails = (process.env.PREMIUM_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const allPremiumEmails = [...HARDCODED_PREMIUM.map(e => e.toLowerCase()), ...envEmails];
  if (email && allPremiumEmails.includes(email.toLowerCase())) {
    return res.status(200).json({ premium: true });
  }

  // 2. Check profiles table
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
