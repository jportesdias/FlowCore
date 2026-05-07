const form = document.querySelector(".contact-form");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const nome = data.get("nome") || "Olá";
  const area = data.get("area") || "Direito";
  const message = `Olá, sou ${nome}. Gostaria de uma análise sobre ${area}.`;
  const encoded = encodeURIComponent(message);

  window.location.href = `https://wa.me/?text=${encoded}`;
});
