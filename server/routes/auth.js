// auth.js

function sair() {
  localStorage.removeItem("franqueadoLogado");
  localStorage.removeItem("pedido");
  window.location.href = "login.html";
}

// protege páginas privadas
document.addEventListener("DOMContentLoaded", () => {
  const rotaProtegida =
    location.pathname.includes("index") ||
    location.pathname.includes("pedido");

  if (rotaProtegida) {
    const franqueado = localStorage.getItem("franqueadoLogado");
    if (!franqueado) {
      window.location.href = "login.html";
    }
  }
});
