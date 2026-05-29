export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const { raw } = req.body || {};
  if (!raw || typeof raw !== "string") return res.status(400).json({ error: "Champ 'raw' manquant" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Clé API non configurée" });
  const prompt =
    "Tu es l'assistant d'un entrepreneur qui capture des idées à l'oral. Voici la transcription brute :\n\n\"\"\"" + raw + "\"\"\"\n\n" +
    "Reformule-la au propre, en français, à la première personne, façon note d'entrepreneur : claire, fidèle au sens (n'invente rien). Enlève les hésitations. Garde concis.\n\n" +
    "Réponds UNIQUEMENT avec un JSON valide, sans backticks, format exact :\n" +
    '{"title":"titre court max 6 mots sans point final","reformulated":"idée reformulée"}';
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) return res.status(502).json({ error: "Erreur API", detail: await r.text() });
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!parsed.title || !parsed.reformulated) throw new Error("format inattendu");
    return res.status(200).json({ title: String(parsed.title).trim(), reformulated: String(parsed.reformulated).trim() });
  } catch (e) {
    return res.status(500).json({ error: "Reformulation échouée", detail: String(e) });
  }
}
