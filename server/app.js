require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

/* ================= DIRETÓRIOS ================= */

const DATA_DIR = path.join(__dirname, "data");
const PEDIDOS_FILE = path.join(DATA_DIR, "pedidos.json");
const FRANQUEADOS_FILE = path.join(DATA_DIR, "franqueados.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(PEDIDOS_FILE)) {
  fs.writeFileSync(PEDIDOS_FILE, "[]");
}

if (!fs.existsSync(FRANQUEADOS_FILE)) {
  fs.writeFileSync(FRANQUEADOS_FILE, "[]");
}

/* ================= FUNÇÃO COMPARTILHADA CADASTRO ================= */

function cadastrarFranqueado(req, res) {
  const { cnpj, senha } = req.body;

  if (!cnpj || !senha) {
    return res.json({ ok: false, message: "Dados inválidos" });
  }

  const franqueados = JSON.parse(fs.readFileSync(FRANQUEADOS_FILE, "utf8"));

  if (franqueados.find(f => f.cnpj === cnpj)) {
    return res.json({ ok: false, message: "CNPJ já cadastrado" });
  }

  franqueados.push({ cnpj, senha });
  fs.writeFileSync(FRANQUEADOS_FILE, JSON.stringify(franqueados, null, 2));

  res.json({ ok: true });
}

/* ================= CADASTRO (AMBOS MANTIDOS) ================= */

app.post("/franqueado/cadastro", cadastrarFranqueado);
app.post("/franqueado/cadastrar", cadastrarFranqueado);

/* ================= LOGIN ================= */

app.post("/franqueado/login", (req, res) => {
  const { cnpj, senha } = req.body;

  const franqueados = JSON.parse(fs.readFileSync(FRANQUEADOS_FILE, "utf8"));

  const franqueado = franqueados.find(
    f => f.cnpj === cnpj && f.senha === senha
  );

  if (!franqueado) {
    return res.json({ ok: false, message: "CNPJ ou senha inválidos" });
  }

  res.json({ ok: true, franqueado });
});

/* ================= TABELA DE PREÇOS ================= */

const PRECOS = {
  "AMACIANTE SOFT PLUS DESCE LAVA FRESH 20L": 430.12,
  "AMACIANTE SOFT PLUS DESCE LAVA BREEZE 20L": 430.12,
  "CHEIRINHO AROMANTIZANTE - 5L": 285.17,
  "DETERGENTE CONCETRADO NEUTRO - 20L": 535.52,
  "DESIFETANTE PARA TECIDOS DE ROUPAS": 285.45,
  "LIMPADOR DE MAQUINAS WASHER JET": 185.45,

  "CONJUNTO MAYTAG": 29435.00,
  "CONJUNTO SPEED QUEEN": 29434.00,
  "CONJUNTO OASIS 20KL": 69990.00,
  "CONJUNTO OASIS 15KL": 64990.00,
  "CONJUNTO OASIS 10KL": 37990.00
};

/* ================= FORMATAR MOEDA ================= */

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* ================= ENVIAR PEDIDO ================= */

app.post("/enpostar", (req, res) => {
  let produtos = [];
  try {
    produtos = JSON.parse(req.body.produtos || "[]");
  } catch {}

  const produtosComValor = produtos.map(p => {
    const nomeLimpo = p.nome.trim();
    const preco = PRECOS[nomeLimpo] || 0;

    return {
      ...p,
      nome: nomeLimpo,
      preco,
      subtotal: preco * p.quantidade
    };
  });

  const total = produtosComValor.reduce((soma, p) => soma + p.subtotal, 0);

  const pedido = {
    id: Date.now(),
    unidade: req.body.unidade,
    responsavel: req.body.responsavel,
    cidade: req.body.cidade,
    telefone: req.body.telefone,
    email: req.body.email,
    observacoes: req.body.observacoes || "",
    produtos: produtosComValor,
    total,
    data: new Date().toLocaleString("pt-BR")
  };

  const pedidos = JSON.parse(fs.readFileSync(PEDIDOS_FILE, "utf8"));
  pedidos.push(pedido);
  fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2));

  res.redirect("sucesso.html");
  enviarEmailBonito(pedido);
});

/* ================= EMAIL BONITO ================= */

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
<table width="100%">
<tr><td align="center" style="padding:30px">
<table width="600" style="background:#fff;border-radius:8px">
<tr>
<td style="background:#0a7cff;color:#fff;padding:20px">
<h2>📦 Novo Pedido Recebido</h2>
</td>
</tr>
<tr>
<td style="padding:20px">
<p><strong>Unidade:</strong> ${pedido.unidade}</p>
<p><strong>Responsável:</strong> ${pedido.responsavel}</p>
<p><strong>Cidade:</strong> ${pedido.cidade}</p>
<p><strong>Telefone:</strong> ${pedido.telefone}</p>

<h3>🧺 Produtos</h3>
<table width="100%" border="1" cellpadding="8" cellspacing="0">
<tr style="background:#eee">
<th>Produto</th>
<th>Qtd</th>
<th>Subtotal</th>
</tr>
${pedido.produtos.map(p => `
<tr>
<td>${p.nome}</td>
<td align="center">${p.quantidade}</td>
<td align="right">${formatarMoeda(p.subtotal)}</td>
</tr>
`).join("")}
</table>

<h3 style="margin-top:20px">
💰 Total do Pedido: ${formatarMoeda(pedido.total)}
</h3>

<p><strong>Observações:</strong><br>${pedido.observacoes || "—"}</p>
</td>
</tr>
<tr>
<td style="background:#f7f7f7;padding:15px;text-align:center;font-size:12px">
Desce Lava • Sistema de Pedidos
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`
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

/* ================= SERVIDOR ================= */

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});

app.get("/teste-email", async (req, res) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Teste Desce Lava",
          email: "no-reply@descelava.com.br"
        },
        to: [{ email: process.env.EMAIL_RECEBER }],
        subject: "✅ TESTE BREVO LOCAL",
        htmlContent: "<h2>Email de teste enviado com sucesso</h2>"
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.send("Email enviado com sucesso");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});

app.get("/teste-email", async (req, res) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Teste Desce Lava",
          email: "no-reply@descelava.com.br"
        },
        to: [{ email: process.env.EMAIL_RECEBER }],
        subject: "✅ TESTE BREVO LOCAL",
        htmlContent: "<h2>Email de teste enviado com sucesso</h2>"
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.send("Email enviado com sucesso");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});
