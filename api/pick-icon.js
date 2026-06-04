module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name manquant" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Clé API manquante" });
  const prompt = "Choisis UN seul emoji, pertinent et un peu fun, pour représenter un classeur d'idées intitulé : \"" + name + "\". Réponds UNIQUEMENT avec l'emoji, sans aucun texte, espace ni ponctuation.";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: "Erreur API" });
    const data = await r.json();
    const emoji = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    return res.status(200).json({ emoji });
  } catch(e) {
    return res.status(500).json({ error: "Echec", detail: String(e) });
  }
};
