app.post("/webhook", (req, res) => {
  const entry = req.body.entry;

  if (entry && entry.length > 0) {
    const changes = entry[0].changes;

    if (changes && changes.length > 0) {
      const value = changes[0].value;

      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];

        const from = message.from; // رقم اللي باعت
        const text = message.text?.body;

        console.log("📩 Message from:", from);
        console.log("💬 Text:", text);
      }
    }
  }

  res.sendStatus(200);
});
