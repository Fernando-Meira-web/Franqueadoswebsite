require("dotenv").config();
const axios = require("axios");

axios.post(
  "https://api.brevo.com/v3/smtp/email",
  {
    sender: {
      name: "Teste API",
      email: "no-reply@descelava.com.br"
    },
    to: [{ email: process.env.EMAIL_RECEBER }],
    subject: "Teste Brevo API",
    htmlContent: "<p>Funcionou 🎉</p>"
  },
  {
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json"
    }
  }
)
.then(() => console.log("✅ API funcionando"))
.catch(err => console.error("❌ ERRO:", err.response?.data || err.message));
