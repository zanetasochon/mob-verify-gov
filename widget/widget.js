const API_URL = "https://angella-evolutive-bibi.ngrok-free.dev";

const hostnameSpan = document.getElementById("hostname");
const statusDiv = document.getElementById("status");
const tokenBox = document.getElementById("tokenBox");
const qrBox = document.getElementById("qrBox");
const btn = document.getElementById("verifyBtn");

let qrInstance = null;
let currentToken = null;
let statusInterval = null;

function getCurrentUrl() {
  // pozwala łatwo wymusić domenę z rejestru (.gov.pl) do testów pozytywnego scenariusza
  const urlParam = new URLSearchParams(window.location.search).get("url");
  return urlParam || window.location.href || "https://100sekund.gov.pl";
}

hostnameSpan.textContent = new URL(getCurrentUrl()).hostname;

function buildVerifyPayload(token) {
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

function clearStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

function startStatusPolling() {
  if (!currentToken) return;
  clearStatusPolling();

  statusInterval = setInterval(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/token-status?token=${encodeURIComponent(currentToken)}`
      );
      if (!res.ok) {
        return;
      }
      const data = await res.json();

      if (data.verificationStatus === "VERIFIED" && data.verificationResult) {
        clearStatusPolling();
        const trusted = data.verificationResult.status === "TRUSTED";

        if (trusted) {
          renderAlert(
            "success",
            "Strona potwierdzona w mObywatel",
            "Ta strona została zweryfikowana jako zaufana w aplikacji mObywatel."
          );
        } else {
          let reason =
            "System nie potwierdził autentyczności tej strony. Może to być próba phishingu lub podszycia się pod serwis administracji publicznej.";

          if (
            !data.verificationResult.inRegistry ||
            !data.verificationResult.endsWithGovPl
          ) {
            reason =
              "System nie potwierdził, że domena znajduje się w oficjalnym rejestrze gov.pl.";
          } else if (data.verificationResult.sslStatus !== "OK") {
            reason =
              "Certyfikat SSL tej strony jest nieprawidłowy lub niesprawdzony. Może to być próba podszycia się pod oficjalną witrynę.";
          }

          renderAlert("error", "Uwaga: strona niezaufana", reason);
        }
      }
    } catch (e) {
      console.warn("Token status polling error", e);
      clearStatusPolling();
      renderAlert(
        "error",
        "Błąd połączenia",
        "Nie udało się pobrać wyniku weryfikacji z serwera. Traktuj stronę jako potencjalnie niebezpieczną i spróbuj ponownie później."
      );
    }
  }, 3000);
}

btn.addEventListener("click", async () => {
  renderAlert("info", "Trwa weryfikacja", "Tworzenie jednorazowego tokenu...");
  tokenBox.textContent = "";
  qrBox.innerHTML = "";
  clearStatusPolling();

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
    currentToken = data.token;

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

    startStatusPolling();
  } catch (e) {
    renderAlert(
      "error",
      "Błąd połączenia",
      "Nie udało się skontaktować z serwerem weryfikacji. Spróbuj ponownie później."
    );
  }
});
