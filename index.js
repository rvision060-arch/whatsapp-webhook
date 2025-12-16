const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"));

// Verify webhook (Meta)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Receive messages
app.post("/webhook", async (req, res) => {
  try {
    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message?.text?.body || "";

    console.log("📩 Message from:", from);
    console.log("💬 Text:", text);

    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: "✅ أهلاً بيك! استلمت رسالتك، وهنرد عليك فورًا 🙌" },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Reply sent");
    return res.sendStatus(200);
  } catch (err) {
    console.log("❌ Webhook error:", err?.response?.data || err.message);
    return res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
