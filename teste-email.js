const nodemailer = require('nodemailer');

async function testarSMTP() {

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'descelavalavanderia@gmail.com',
      pass: 'knrablgnwxmfeojj'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    let info = await transporter.sendMail({
      from: 'descelavalavanderia@gmail.com',
      to: 'descelavalavanderia@gmail.com',
      subject: 'Teste SMTP Hostinger/Windows',
      text: 'Fernando, seu SMTP Gmail está funcionando corretamente!'
    });

    console.log('✅ SUCESSO SMTP:', info.response);

  } catch (erro) {
    console.log('❌ ERRO SMTP:', erro.message);
  }
}

testarSMTP();
