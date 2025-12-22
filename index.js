/**
 * index.js - WhatsApp Cloud API Webhook on Railway (Node + Express)
 * Required env:
 *  - VERIFY_TOKEN
 *  - ACCESS_TOKEN
 *  - PHONE_NUMBER_ID   (production phone number id; can be empty until active)
 * Optional:
 *  - GRAPH_API_VERSION (default v22.0)
 */

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== ENV =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v22.0";

// ===== Dedup to avoid duplicate replies (Meta may retry) =====
const processedMessageIds = new Set();
setInterval(() => processedMessageIds.clear(), 30 * 60 * 1000); // clear every 30 min

// ===== Health =====
app.get("/", (req, res) => {
  res.status(200).send("Server is running ✅");
});

// ===== Webhook Verify (Meta) =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verify failed", { mode, tokenProvided: !!token, hasVerifyToken: !!VERIFY_TOKEN });
  return res.sendStatus(403);
});

// ===== Receive Webhook Events =====
app.post("/webhook", async (req, res) => {
  // ACK fast
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Could be statuses updates, not messages
    const message = value?.messages?.[0];
    if (!message) {
      // console.log("ℹ️ No message in webhook (maybe status update)");
      return;
    }

    // Ignore non-text messages (optional)
    const text = message?.text?.body?.trim();
    if (!text) {
      console.log("ℹ️ Non-text message received, ignoring");
      return;
    }

    // Dedup
    const msgId = message?.id;
    if (msgId) {
      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);
    }

    const from = message.from; // sender WA number as string
    console.log("📩 Incoming:", { from, text, msgId });

    // If not ready to send (no production creds), stop safely
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.log("⚠️ Missing PHONE_NUMBER_ID or ACCESS_TOKEN. Not replying.", {
        hasPhoneNumberId: !!PHONE_NUMBER_ID,
        hasAccessToken: !!ACCESS_TOKEN,
      });
      return;
    }

    // Send reply
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
    console.log("❌ Webhook handler error:", err?.response?.data || err.message);
  }
});

// ===== Railway Port =====
console.log("ENV PORT =", process.env.PORT); // helps debug Railway binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
