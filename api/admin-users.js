const SUPABASE_URL = 'https://unconepyykjytwqsxkov.supabase.co';

function supa(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
}

async function verifyAdmin(token) {
  if (!token) return false;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return token === expected;
}


module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const ok = await verifyAdmin(token);
  if (!ok) return res.status(403).json({ error: 'Accès refusé' });

  const { action, userId, page = 1, search = '' } = req.body || {};

  try {
    if (action === 'stats') {
      const [usersR, premR, ideasR] = await Promise.all([
        supa('/auth/v1/admin/users?per_page=1000&page=1'),
        supa('/rest/v1/profiles?is_premium=eq.true&select=id'),
        supa('/rest/v1/ideas?select=id', {
          headers: { 'Prefer': 'count=exact', 'Range': '0-0' }
        })
      ]);

      const usersData = await usersR.json();
      const users = usersData.users || [];
      const premUsers = await premR.json();
      const contentRange = ideasR.headers.get('content-range') || '0/0';
      const totalIdeas = parseInt(contentRange.split('/')[1]) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = users.filter(u => new Date(u.created_at) >= today).length;

      return res.status(200).json({
        totalUsers: users.length,
        premiumUsers: Array.isArray(premUsers) ? premUsers.length : 0,
        totalIdeas,
        newToday
      });
    }

    if (action === 'users') {
      const PAGE_SIZE = 50;
      const [usersR, profR, ideasR] = await Promise.all([
        supa('/auth/v1/admin/users?per_page=1000&page=1'),
        supa('/rest/v1/profiles?select=id,is_premium,premium_gifted'),
        supa('/rest/v1/ideas?select=user_id')
      ]);

      const usersData = await usersR.json();
      const users = usersData.users || [];
      const profiles = await profR.json();
      const ideas = await ideasR.json();

      const profMap = {};
      if (Array.isArray(profiles)) profiles.forEach(p => { profMap[p.id] = p; });

      const ideaCounts = {};
      if (Array.isArray(ideas)) ideas.forEach(i => {
        if (i.user_id) ideaCounts[i.user_id] = (ideaCounts[i.user_id] || 0) + 1;
      });

      let filtered = [...users];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(u => (u.email || '').toLowerCase().includes(q));
      }
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const total = filtered.length;
      const offset = (page - 1) * PAGE_SIZE;
      const paginated = filtered.slice(offset, offset + PAGE_SIZE);

      return res.status(200).json({
        users: paginated.map(u => ({
          id: u.id,
          email: u.email || '',
          created_at: u.created_at,
          is_premium: !!profMap[u.id]?.is_premium,
          premium_gifted: !!profMap[u.id]?.premium_gifted,
          idea_count: ideaCounts[u.id] || 0
        })),
        total,
        page,
        pageSize: PAGE_SIZE
      });
    }

    if (action === 'gift') {
      if (!userId) return res.status(400).json({ error: 'userId manquant' });
      const r = await supa(`/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ user_metadata: { is_premium: true } })
      });
      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ error: err });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'action inconnue' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
