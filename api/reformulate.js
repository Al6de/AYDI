module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { raw } = req.body || {};
  if (!raw) return res.status(400).json({ error: "raw manquant" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Clé API manquante" });
  const prompt =
    "Tu es l'assistant d'un entrepreneur qui capture des idées à l'oral. Transcription brute :\n\n\"\"\"" + raw + "\"\"\"\n\n" +
    "Reformule au propre, français, première personne, fidèle au sens, sans hésitations. Concis.\n\n" +
    "Réponds UNIQUEMENT en JSON valide sans backticks :\n" +
    '{"title":"titre max 6 mots sans point final","reformulated":"idée reformulée"}';
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
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: "Erreur API", detail: await r.text() });
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.status(200).json({ title: parsed.title.trim(), reformulated: parsed.reformulated.trim() });
  } catch(e) {
    return res.status(500).json({ error: "Echec", detail: String(e) });
  }
};
