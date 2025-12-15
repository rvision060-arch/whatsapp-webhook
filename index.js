const express = require("express");
const app = express();

// لازم علشان نقرأ body من WhatsApp
app.use(express.json());

// Route رئيسي للاختبار
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Route الـ Webhook (VERIFY)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Route استقبال الرسائل (POST)
app.post("/webhook", (req, res) => {
  console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Railway بيدي PORT تلقائي
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
