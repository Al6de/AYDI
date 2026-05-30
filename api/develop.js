module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { title, text } = req.body || {};
  if (!title && !text) return res.status(400).json({ error: "Données manquantes" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Clé API manquante" });
  const prompt =
    "Tu es le coach business d'un entrepreneur. Voici une idée capturée :\n\n" +
    "Titre : " + title + "\nIdée : " + text + "\n\n" +
    "Développe cette idée de façon concrète et actionnable. Donne :\n" +
    "1. Une analyse rapide du potentiel\n" +
    "2. Les 3 premières actions concrètes à faire cette semaine\n" +
    "3. Les ressources ou compétences nécessaires\n" +
    "4. Un angle ou variante intéressante à explorer\n\n" +
    "Sois précis, direct, orienté action. Pas de blabla. Réponds en français.";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: "Erreur API", detail: await r.text() });
    const data = await r.json();
    const text_response = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ development: text_response });
  } catch(e) {
    return res.status(500).json({ error: "Echec", detail: String(e) });
  }
};
