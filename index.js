// index.js
require("dotenv").config(); // اختياري لو شغال محليًا فقط

const express = require("express");
const axios = require("axios");

const app = express();

// لازم علشان نقرأ body من WhatsApp
app.use(express.json());

// Route رئيسي للاختبار
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ✅ Webhook Verify (GET)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ✅ استقبال رسائل واتساب (POST) + رد تلقائي
app.post("/webhook", async (req, res) => {
  try {
    console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // الرسالة اللي جت
    const message = value?.messages?.[0];
    if (!message) return res.sendStatus(200); // ممكن يكون status update

    const from = message.from; // رقم العميل (wa_id)
    const text = message?.text?.body || "";

    console.log("📩 Message from:", from);
    console.log("💬 Text:", text);

    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

    if (!PHONE_NUMBER_ID || !WHATSAPP_TOKEN) {
      console.log("⚠️ Missing PHONE_NUMBER_ID or WHATSAPP_TOKEN in env variables");
      return res.sendStatus(200);
    }

    // ✅ رد تلقائي (Echo)
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: `وصلت رسالتك ✅\nقلت: ${text}` },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    return res.sendStatus(200);
  }
});

// Railway بيدي PORT تلقائي
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
