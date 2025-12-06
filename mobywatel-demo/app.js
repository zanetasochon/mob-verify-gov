const API_URL = "https://angella-evolutive-bibi.ngrok-free.dev";

let videoStream = null;
let scanning = false;

const tokenInput = document.getElementById("tokenInput");
const verifyBtn = document.getElementById("verifyBtn");
const resultSection = document.getElementById("resultSection");
const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultDetails = document.getElementById("resultDetails");

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".nav-btn");
const video = document.getElementById("video");
const cameraSection = document.getElementById("cameraSection");

function showScreen(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
  navButtons.forEach((b) => {
    const target = b.dataset.target;
    const isActive =
      target === id || (id === "screen-qr-scan" && target === "screen-qr-menu");
    b.classList.toggle("active", isActive);
  });

  if (id !== "screen-qr-scan") {
    stopCamera();
    if (cameraSection) {
      cameraSection.classList.add("hidden");
    }
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target) showScreen(target);
  });
});

const qrScanBtn = document.getElementById("qrScanBtn");
if (qrScanBtn) {
  qrScanBtn.addEventListener("click", () => {
    showScreen("screen-qr-scan");
    startCameraAndScan();
  });
}

const qrScanBackBtn = document.getElementById("qrScanBack");
if (qrScanBackBtn) {
  qrScanBackBtn.addEventListener("click", () => {
    showScreen("screen-qr-menu");
  });
}

const qrScanHelpBtn = document.getElementById("qrScanHelp");
if (qrScanHelpBtn) {
  qrScanHelpBtn.addEventListener("click", () => {
    alert(
      "Fit the QR within the marked frame to scan it. Make sure the camera has permission to access."
    );
  });
}

const enterCodeBtn = document.getElementById("enterCodeBtn");
const manualSection = document.getElementById("manualSection");
if (enterCodeBtn && manualSection) {
  enterCodeBtn.addEventListener("click", () => {
    manualSection.classList.remove("hidden");
  });
}

function setResultTrusted(data) {
  resultBadge.textContent = "Strona zaufana";
  resultBadge.classList.remove("result-badge--untrusted");
  resultBadge.classList.add("result-badge--trusted");

  resultTitle.textContent = "Możesz bezpiecznie kontynuować";
  resultMessage.textContent =
    "Ta strona znajduje się w oficjalnym rejestrze domen gov.pl i została zweryfikowana przez system mObywatel.";

  resultDetails.innerHTML = `
    <li><strong>${data.hostname}</strong></li>
    <li>Adres URL: ${data.url}</li>
    <li>Rozszerzenie .gov.pl: ${data.details.endsWithGovPl ? "tak" : "nie"}</li>
    <li>Certyfikat SSL: ${
      data.ssl && data.ssl.status === "OK"
        ? "prawidłowy"
        : "problem z certyfikatem"
    }</li>
    <li>Ważny do: ${data.ssl?.validTo || "brak danych"}</li>
  `;

  resultSection.classList.remove("hidden");
}

function setResultUntrusted(data, reason) {
  resultBadge.textContent = "Uwaga: możliwe oszustwo";
  resultBadge.classList.remove("result-badge--trusted");
  resultBadge.classList.add("result-badge--untrusted");

  resultTitle.textContent = "Nie podawaj żadnych danych na tej stronie.";
  resultMessage.textContent =
    "System nie potwierdził autentyczności tej strony. Może to być próba phishingu lub podszycia się pod serwis administracji publicznej.";

  resultDetails.innerHTML = `
    <li>Powód: <strong>${reason}</strong></li>
    ${data && data.hostname ? `<li><strong>${data.hostname}</strong></li>` : ""}
    <li>Zalecenie: zamknij stronę, nie loguj się, nie podawaj numeru konta, danych logowania ani numeru PESEL. W razie wątpliwości zgłoś sprawę do CERT Polska lub swojej instytucji.</li>
  `;

  resultSection.classList.remove("hidden");
}

function getVerificationErrorMessage(code) {
  switch (code) {
    case "MISSING_TOKEN":
      return "Brak kodu. Spróbuj zeskanować QR ponownie.";
    case "TOKEN_NOT_FOUND":
      return "Kod nie istnieje w systemie. Mógł zostać wygenerowany na innej stronie lub jest sfałszowany.";
    case "TOKEN_EXPIRED":
      return "Kod wygasł. Kody QR są ważne tylko przez krótki czas – zeskanuj nowy kod na stronie.";
    case "TOKEN_ALREADY_USED":
      return "Kod został już użyty. Każdy kod QR może być wykorzystany tylko raz. Wygeneruj nowy kod na stronie.";
    default:
      return "Nieznany błąd weryfikacji.";
  }
}

async function verifyToken() {
  const token = tokenInput.value.trim();
  if (!token) return;

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Sprawdzanie...";

  resultSection.classList.add("hidden");
  resultDetails.innerHTML = "";

  try {
    const res = await fetch(`${API_URL}/api/verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      try {
        const err = await res.json();
        const reason = getVerificationErrorMessage(err.error);
        setResultUntrusted(null, reason);
      } catch (e) {
        console.warn("Error parsing verification error response", e);
        setResultUntrusted(
          null,
          "Nieznany błąd weryfikacji. Traktuj stronę jako potencjalnie niebezpieczną."
        );
      }
      return;
    }

    const data = await res.json();

    if (data.status !== "TRUSTED") {
      setResultUntrusted(
        data,
        "System nie potwierdził, że domena znajduje się w oficjalnym rejestrze gov.pl."
      );
      return;
    }

    if (!data.ssl || data.ssl.status !== "OK") {
      setResultUntrusted(
        data,
        "Certyfikat SSL tej strony jest nieprawidłowy lub niesprawdzony. Może to być próba podszycia się pod oficjalną witrynę."
      );
      return;
    }

    setResultTrusted(data);
  } catch (e) {
    setResultUntrusted(
      null,
      "Brak połączenia z serwerem weryfikacji. Traktuj stronę jako potencjalnie niebezpieczną."
    );
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Sprawdź stronę";
  }
}

verifyBtn.addEventListener("click", verifyToken);

tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    verifyToken();
  }
});

async function startCameraAndScan() {
  if (scanning) return;
  if (!video || !cameraSection) return;

  scanning = true;
  cameraSection.classList.remove("hidden");

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = videoStream;
    await video.play();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const scanFrame = () => {
      if (!scanning) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const qr = jsQR(imageData.data, canvas.width, canvas.height);
        if (qr && qr.data) {
          handleQRData(qr.data);
          return;
        }
      }

      requestAnimationFrame(scanFrame);
    };

    requestAnimationFrame(scanFrame);
  } catch (err) {
    console.error("Camera error", err);
    scanning = false;
    cameraSection.classList.add("hidden");
    alert(
      "Nie udało się uruchomić aparatu. Upewnij się, że przeglądarka ma dostęp do kamery."
    );
  }
}

function stopCamera() {
  scanning = false;
  if (videoStream) {
    videoStream.getTracks().forEach((t) => t.stop());
    videoStream = null;
  }
}

function handleQRData(data) {
  let token = null;

  const prefix = "GOVVERIFY:";
  if (typeof data === "string" && data.startsWith(prefix)) {
    token = data.slice(prefix.length).trim();
  } else {
    try {
      const url = new URL(data);
      token = url.searchParams.get("token");
    } catch {}
  }

  if (!token) {
    alert("Nieprawidłowy kod QR. To nie jest kod weryfikacji gov.pl.");
    return;
  }

  stopCamera();
  if (cameraSection) {
    cameraSection.classList.add("hidden");
  }

  tokenInput.value = token;
  verifyToken();
}
