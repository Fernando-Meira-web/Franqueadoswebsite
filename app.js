require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

const DATA_DIR = "public/data";
const ARQUIVO = `${DATA_DIR}/pedidos.json`;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ARQUIVO)) fs.writeFileSync(ARQUIVO, "[]");

/* ================= ENVIAR PEDIDO ================= */
app.post("/enpostar", (req, res) => {

  let produtos = [];
  try {
    produtos = JSON.parse(req.body.produtos || "[]");
  } catch {}

  const pedido = {
    id: Date.now(),
    unidade: req.body.unidade,
    responsavel: req.body.responsavel,
    cidade: req.body.cidade,
    telefone: req.body.telefone,
    email: req.body.email,
    observacoes: req.body.observacoes || "",
    produtos,
    data: new Date().toLocaleString("pt-BR")
  };

  const pedidos = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
  pedidos.push(pedido);
  fs.writeFileSync(ARQUIVO, JSON.stringify(pedidos, null, 2));

  res.redirect("sucesso.html");

  enviarEmailBonito(pedido);
});

/* ================= EMAIL BONITO (IGUAL ANTES) ================= */
async function enviarEmailBonito(pedido) {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Pedidos Desce Lava",
          email: "no-reply@descelava.com.br"
        },
        to: [{ email: process.env.EMAIL_RECEBER }],
        subject: `🧾 Novo Pedido – ${pedido.unidade}`,
        htmlContent: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:30px">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
          
          <tr>
            <td style="background:#0a7cff;color:#fff;padding:20px">
              <h2 style="margin:0">📦 Novo Pedido Recebido</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:20px;color:#333">
              <p><strong>Unidade:</strong> ${pedido.unidade}</p>
              <p><strong>Responsável:</strong> ${pedido.responsavel}</p>
              <p><strong>Cidade:</strong> ${pedido.cidade}</p>
              <p><strong>Telefone:</strong> ${pedido.telefone}</p>
              <p><strong>Email:</strong> ${pedido.email}</p>

              <h3 style="margin-top:30px">🧺 Produtos</h3>

              <table width="100%" border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
                <tr style="background:#f0f0f0">
                  <th align="left">Produto</th>
                  <th align="center">Qtd</th>
                </tr>
                ${pedido.produtos.map(p => `
                  <tr>
                    <td>${p.nome}</td>
                    <td align="center">${p.quantidade}</td>
                  </tr>
                `).join("")}
              </table>

              <p style="margin-top:20px">
                <strong>Observações:</strong><br>
                ${pedido.observacoes || "—"}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f7f7f7;padding:15px;text-align:center;font-size:12px;color:#777">
              Desce Lava • Sistema de Pedidos
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.error("Erro email:", err.response?.data || err.message);
  }
}

/* ================= APAGAR PEDIDOS SELECIONADOS ================= */
app.post("/admin/apagar-pedidos", (req, res) => {
  try {
    const ids = req.body.ids || [];
    const pedidos = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
    const filtrados = pedidos.filter(p => !ids.includes(p.id));
    fs.writeFileSync(ARQUIVO, JSON.stringify(filtrados, null, 2));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

/* ================= SERVIDOR ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});
