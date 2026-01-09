require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();

// ================== MIDDLEWARES ==================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// ================== SMTP GMAIL ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================== ARQUIVO DE PEDIDOS ==================
const DATA_DIR = "public/data";
const ARQUIVO = `${DATA_DIR}/pedidos.json`;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(ARQUIVO)) {
  fs.writeFileSync(ARQUIVO, JSON.stringify([]));
}

// ================== SALVAR PEDIDO ==================
function salvarPedido(pedido) {
  const pedidos = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
  pedidos.push(pedido);
  fs.writeFileSync(ARQUIVO, JSON.stringify(pedidos, null, 2));
}

// ================== ROTA DE ENVIO ==================
app.post("/enpostar", async (req, res) => {

  // 🔒 PROTEÇÃO TOTAL CONTRA JSON INVÁLIDO (EVITA 502)
  let produtos = [];
  try {
    produtos = JSON.parse(req.body.produtos || "[]");
  } catch (err) {
    console.log("Erro ao converter produtos:", err.message);
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

  // salva localmente
  salvarPedido(pedido);

  try {
    // monta tabela de produtos
    const produtosHTML = produtos.map(p => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">${p.nome}</td>
        <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${p.quantidade}</td>
      </tr>
    `).join("");

    const emailHTML = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:12px;overflow:hidden">

      <div style="background:#102a43;padding:20px;text-align:center">
        <h2 style="color:white;margin:0">🧾 Novo Pedido Recebido</h2>
      </div>

      <div style="padding:20px;background:#f5f7fa;color:#102a43">

        <h3>📍 Dados da Unidade</h3>
        <p><strong>Unidade:</strong> ${pedido.unidade}</p>
        <p><strong>Responsável:</strong> ${pedido.responsavel}</p>
        <p><strong>Cidade:</strong> ${pedido.cidade}</p>
        <p><strong>Telefone:</strong> ${pedido.telefone}</p>
        <p><strong>E-mail:</strong> ${pedido.email}</p>
        <p><strong>Data:</strong> ${pedido.data}</p>

        <h3 style="margin-top:20px">🧴 Produtos</h3>
        <table style="width:100%;border-collapse:collapse;background:white">
          <thead>
            <tr style="background:#00d9ff">
              <th style="padding:10px;text-align:left">Produto</th>
              <th style="padding:10px;text-align:center">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${produtosHTML || "<tr><td colspan='2' style='padding:10px;text-align:center'>Nenhum produto informado</td></tr>"}
          </tbody>
        </table>

        <h3 style="margin-top:20px">📝 Observações</h3>
        <p style="background:white;padding:12px;border-radius:8px">
          ${pedido.observacoes || "Nenhuma observação informada."}
        </p>

      </div>

      <div style="background:#102a43;color:white;text-align:center;padding:12px;font-size:12px">
        Sistema Interno de Pedidos • Franquia Desce Lava
      </div>

    </div>
    `;

    await transporter.sendMail({
      from: `"Pedidos Desce Lava" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEBER,
      subject: `🧾 Novo Pedido - ${pedido.unidade}`,
      html: emailHTML
    });

  } catch (err) {
    console.log("Erro ao enviar email:", err.message);
  }

  // redireciona para tela de sucesso
  res.redirect("sucesso.html");
});

// ================== SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
