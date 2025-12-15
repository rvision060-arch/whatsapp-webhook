const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;      // Bearer token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;    // from Meta

app.get("/", (req, res) => res.send("Server is running"));

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

async function sendWhatsAppText(to, text) {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

app.post("/webhook", async (req, res) => {
  try {
    // لازم نرجّع 200 بسرعة
    res.sendStatus(200);

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // تجاهل status updates
    const msg = value?.messages?.[0];
    if (!msg) return;

    const from = msg.from; // رقم اللي بعت
    const text = msg.type === "text" ? msg.text?.body : `[${msg.type}]`;

    console.log("📩 Message from:", from);
    console.log("💬 Text:", text);

    // رد بسيط
    await sendWhatsAppText(from, `وصلتني رسالتك ✅\nانت قلت: ${text}`);
    console.log("✅ Replied successfully");
  } catch (err) {
    console.error("❌ Webhook error:", err?.response?.data || err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
