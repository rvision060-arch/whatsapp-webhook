const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ====== ENV ======
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;        // for webhook verification
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;        // permanent token (System User)
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;  // production phone_number_id (when Active)
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v22.0";

// ====== Simple in-memory dedup (prevents double replies from retries) ======
const processedMessageIds = new Set();
setInterval(() => {
  // clear periodically to avoid memory growth (every 30 minutes)
  processedMessageIds.clear();
}, 30 * 60 * 1000);

// Health check
app.get("/", (req, res) => res.send("Server is running ✅"));

// Webhook verification (Meta)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Receive webhook events
app.post("/webhook", async (req, res) => {
  // Always ACK quickly to Meta
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Messages array might not exist (e.g. status updates)
    const message = value?.messages?.[0];
    if (!message) return;

    // Skip if this is not a text message (optional)
    const text = message?.text?.body?.trim();
    if (!text) return;

    // Deduplicate by message.id
    const msgId = message?.id;
    if (msgId) {
      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);
    }

    const from = message.from; // user's WA number (string)
    console.log("📩 Incoming message:", { from, text, msgId });

    // If production credentials are not ready, just log and stop
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.log(
        "⚠️ Missing PHONE_NUMBER_ID or ACCESS_TOKEN. Not replying yet.",
        { hasPhoneNumberId: !!PHONE_NUMBER_ID, hasAccessToken: !!ACCESS_TOKEN }
      );
      return;
    }

    // Send auto-reply
    await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: "✅ أهلاً بيك! استلمت رسالتك، وهنرد عليك فورًا 🙌" },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("✅ Reply sent to:", from);
  } catch (err) {
    const data = err?.response?.data;
    console.log("❌ Webhook handler error:", data || err.message);
  }
});

// Railway PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
