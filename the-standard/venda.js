const publicCheckoutEndpoint =
  "https://aygqljoobkjccipsqebi.supabase.co/functions/v1/create-pagarme-public-membership-checkout";

const checkoutButtons = [...document.querySelectorAll("[data-checkout-plan]")];
const checkoutFeedback = document.querySelector("#checkoutFeedback");
let checkoutInProgress = false;

checkoutButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (checkoutInProgress) return;

    const planCode = String(button.dataset.checkoutPlan || "");
    const originalLabel = button.textContent;
    checkoutInProgress = true;
    checkoutFeedback.textContent = "Abrindo o checkout seguro do Pagar.me...";
    checkoutFeedback.classList.remove("is-error");
    checkoutButtons.forEach((item) => {
      item.disabled = true;
    });
    button.textContent = "Abrindo checkout...";

    try {
      const response = await fetch(publicCheckoutEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ planCode })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível abrir o checkout.");
      }
      if (!payload.paymentUrl) {
        throw new Error("O Pagar.me não retornou o endereço de pagamento.");
      }

      window.location.assign(payload.paymentUrl);
    } catch (error) {
      checkoutInProgress = false;
      checkoutFeedback.textContent =
        `${error.message || "Não foi possível abrir o checkout."} Tente novamente ou fale conosco pelo WhatsApp.`;
      checkoutFeedback.classList.add("is-error");
      checkoutButtons.forEach((item) => {
        item.disabled = false;
      });
      button.textContent = originalLabel;
    }
  });
});
