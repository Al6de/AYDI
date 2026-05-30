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
    "Développe cette idée. Réponds UNIQUEMENT en JSON valide sans backticks, format exact :\n" +
    '{"subs":[{"title":"sous-idée courte max 6 mots","text":"une phrase d\'explication concrète"}],"tasks":["tâche actionnable courte"]}\n' +
    "Donne 2 à 3 sous-idées (angles, variantes, ressources) et 3 à 5 tâches concrètes pour cette semaine. En français, à la première personne. Reste fidèle à l'idée, n'invente rien.";
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
    const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return res.status(200).json({ subs: parsed.subs || [], tasks: parsed.tasks || [] });
  } catch(e) {
    return res.status(500).json({ error: "Echec", detail: String(e) });
  }
};
