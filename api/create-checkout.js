module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const { email } = req.body || {};
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: 'https://aydi-seven.vercel.app?subscribed=true',
      cancel_url: 'https://aydi-seven.vercel.app?cancelled=true',
    });
    return res.status(200).json({ url: session.url });
  } catch(e) {
    return res.status(500).json({ error: String(e) });
  }
};
