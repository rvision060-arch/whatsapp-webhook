const express = require("express");
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

// helper: send message
async function sendWhatsAppText(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) throw new Error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID");

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("Send message failed:", data);
    throw new Error(`Send message failed: ${resp.status}`);
  }
  return data;
}

// Receive webhook events (messages)
app.post("/webhook", async (req, res) => {
  try {
    console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const msg = value?.messages?.[0];
    const from = msg?.from; // رقم العميل بصيغة دولية بدون +
    const text = msg?.text?.body;

    // رد فقط على رسائل النص
    if (from && text) {
      const reply = `تم الاستلام ✅\nرسالتك: ${text}`;
      await sendWhatsAppText(from, reply);
      console.log("Replied to:", from);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200); // لازم 200 عشان Meta ما تعيدش الإرسال
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
