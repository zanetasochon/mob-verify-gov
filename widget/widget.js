const API_URL = "https://angella-evolutive-bibi.ngrok-free.dev";

const hostnameSpan = document.getElementById("hostname");
const statusDiv = document.getElementById("status");
const tokenBox = document.getElementById("tokenBox");
const qrBox = document.getElementById("qrBox");
const btn = document.getElementById("verifyBtn");

let qrInstance = null;

function getCurrentUrl() {
  return window.location.href || "https://100sekund.gov.pl";
}

hostnameSpan.textContent = new URL(getCurrentUrl()).hostname;

function buildVerifyPayload(token) {
  // tu NIE wkładamy URL ani danych osobowych – tylko jednorazowy identyfikator (nonce)
  return `GOVVERIFY:${token}`;
}

function renderAlert(severity, title, message) {
  const variants = {
    success: { icon: "✔", className: "alert--success" },
    info: { icon: "ⓘ", className: "alert--info" },
    warning: { icon: "⚠", className: "alert--warning" },
    error: { icon: "⛔", className: "alert--error" },
  };
  const cfg = variants[severity] || variants.info;

  statusDiv.innerHTML = `
    <div class="alert ${cfg.className}">
      <span class="alert-icon">${cfg.icon}</span>
      <div class="alert-content">
        <div class="alert-title">${title}</div>
        <div class="alert-message">${message}</div>
      </div>
    </div>
  `;
}

btn.addEventListener("click", async () => {
  renderAlert("info", "Trwa weryfikacja", "Tworzenie jednorazowego tokenu...");
  tokenBox.textContent = "";
  qrBox.innerHTML = "";

  try {
    const res = await fetch(`${API_URL}/api/create-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: getCurrentUrl() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      renderAlert("error", "Błąd", err.error || res.status);
      return;
    }

    const data = await res.json();

    if (data.inRegistry) {
      renderAlert(
        "success",
        "Domena zaufana",
        "Domena jest w oficjalnym rejestrze gov.pl. Zeskanuj kod w mObywatel."
      );
    } else {
      renderAlert(
        "warning",
        "Uwaga",
        "Domena nie jest w oficjalnym rejestrze gov.pl. Zachowaj ostrożność."
      );
    }

    const payload = buildVerifyPayload(data.token);
    console.log("Verify token (nonce):", data.token);
    console.log("QR payload:", payload);

    qrBox.style.display = "flex";

    qrInstance = new QRCode(qrBox, {
      text: payload,
      width: 128,
      height: 128,
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    renderAlert(
      "error",
      "Błąd połączenia",
      "Nie udało się skontaktować z serwerem weryfikacji. Spróbuj ponownie później."
    );
  }
});
