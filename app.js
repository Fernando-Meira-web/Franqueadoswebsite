require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");

const app = express();

// ================= DEBUG INICIAL =================
console.log("🔑 BREVO_API_KEY existe?", !!process.env.BREVO_API_KEY);
console.log("📧 EMAIL_RECEBER:", process.env.EMAIL_RECEBER);

// ================= MIDDLEWARES =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// ================= PEDIDOS =================
const DATA_DIR = "public/data";
const ARQUIVO = `${DATA_DIR}/pedidos.json`;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ARQUIVO)) fs.writeFileSync(ARQUIVO, "[]");

// ================= ROTA DE TESTE =================
app.get("/", (req, res) => {
  res.send("API Desce Lava - Online 🚀");
});

// ================= ROTA DE ENVIO =================
app.post("/enpostar", (req, res) => {
  let produtos = [];

  try {
    produtos = JSON.parse(req.body.produtos || "[]");
  } catch {
    produtos = [];
  }

  const pedido = {
    unidade: req.body.unidade,
    responsavel: req.body.responsavel,
    cidade: req.body.cidade,
    telefone: req.body.telefone,
    email: req.body.email,
    observacoes: req.body.observacoes || "",
    produtos,
    data: new Date().toLocaleString("pt-BR")
  };

  // salva pedido
  const pedidos = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
  pedidos.push(pedido);
  fs.writeFileSync(ARQUIVO, JSON.stringify(pedidos, null, 2));

  // responde imediato ao usuário
  res.redirect("sucesso.html");

  // ================= EMAIL BREVO =================
  setImmediate(async () => {
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: {
            name: "Pedidos Desce Lava",
            email: "no-reply@descelava.com.br"
          },
          to: [
            {
              email: process.env.EMAIL_RECEBER,
              name: "Admin Desce Lava"
            }
          ],
          subject: `🧾 Novo Pedido - ${pedido.unidade}`,
          htmlContent: `
            <h2>Novo Pedido Recebido</h2>
            <p><b>Unidade:</b> ${pedido.unidade}</p>
            <p><b>Responsável:</b> ${pedido.responsavel}</p>
            <p><b>Cidade:</b> ${pedido.cidade}</p>
            <p><b>Telefone:</b> ${pedido.telefone}</p>

            <h3>Produtos</h3>
            <ul>
              ${produtos
                .map(p => `<li>${p.nome} - ${p.quantidade}</li>`)
                .join("")}
            </ul>

            <p><b>Observações:</b> ${pedido.observacoes}</p>
          `
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
            "accept": "application/json"
          }
        }
      );

      console.log("📧 Email enviado via Brevo API");
    } catch (err) {
      console.error(
        "❌ Erro Brevo API:",
        err.response?.data || err.message
      );
    }
  });
});

// ================= SERVIDOR =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
