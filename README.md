# mObywatel – weryfikacja stron gov.pl

## 1. Wprowadzenie
Phishing coraz częściej wykorzystuje fałszywe strony stylizowane na portale administracji publicznej. Celem projektu jest umożliwienie obywatelom samodzielnej, wiarygodnej weryfikacji stron w domenach gov.pl (oraz subdomen) przy użyciu aplikacji mObywatel i jednorazowych kodów QR.

## 2. Opis rozwiązania
- **Widget gov.pl (frontend-web)** – lekki skrypt JS do osadzenia na stronach. Pokazuje CTA „Zweryfikuj stronę w mObywatel”, pobiera jednorazowy token z backendu i renderuje kod QR + podstawowe informacje (rozszerzenie .gov.pl, obecność w rejestrze, link do kompendium, status SSL).
- **Verify API (backend)** – serwis Node/Express, który:
  - przechowuje oficjalny rejestr domen (statyczny dump z dane.gov.pl w `backend/src/govDomains.ts`),
  - generuje jednorazowe tokeny (nonce) dla kodów QR,
  - weryfikuje domenę (rozszerzenie .gov.pl, obecność w rejestrze) oraz certyfikat SSL (port 443),
  - zwraca do aplikacji wynik: „TRUSTED” / „UNTRUSTED”.
- **Demo mObywatel (frontend-web / pseudo-mobile)** – symulacja aplikacji mobilnej. Umożliwia skanowanie kodu QR (kamera) lub ręczne wklejenie tokenu, wysyła go do Verify API i prezentuje wynik (pozytywny/negatywny).

## 3. Architektura i integracja
- Widget (hostowany na stronie) komunikuje się z Verify API (`/api/create-token`, `/api/token-status`).
- Aplikacja mObywatel (demo) skanuje kod QR zawierający prefix `GOVVERIFY:{token}` i woła `/api/verify-token`.
- Verify API sprawdza:
  - czy hostname kończy się na `.gov.pl` i jest w rejestrze,
  - status certyfikatu SSL (autoryzacja TLS, dane certyfikatu),
  - ważność i jednorazowość tokenu (nonce).
- Wynik jest dostępny w aplikacji oraz przez polling `/api/token-status` (dla widgetu).

## 4. Mapowanie na wymagania biznesowe
- CTA do weryfikacji strony via QR: przycisk w widgetach (`widget/index.html`, `widget/epuap-mock.html`).
- Moduł bezpieczeństwa: pokazuje rozszerzenie `.gov.pl`, obecność w rejestrze, link do kompendium, status SSL.
- Jednorazowy kod QR (nonce): generowany w `/api/create-token`, walidowany w `/api/verify-token`, TTL 5 minut, jednorazowy.
- Negatywne i pozytywne scenariusze: jasne komunikaty w demie mObywatel i w widgetach.
- Obsługa błędów: kody błędów dla braków, wygaśnięcia, ponownego użycia tokenu, błędów połączenia.
- Bezpieczeństwo: szyfrowana komunikacja (HTTPS po stronie ngrok / prod), walidacja wejścia URL, ograniczona ekspozycja danych (tylko niezbędne pola), odporność na manipulację tokenem dzięki UUID + TTL + status USED.

## 5. Struktura repo
- `backend/` – Verify API (Node + Express, TypeScript).
- `widget/` – lekki widget osadzany na stronach (vanilla JS).
- `mobywatel-demo/` – webowa imitacja aplikacji mObywatel (QR scan/manual).
- `backend/src/govDomains.ts` – statyczna lista domen gov.pl (źródło: dane.gov.pl).

## 6. Wymagania techniczne (spełnienie)
- Integracja: REST API + QR nonce.
- Szyfrowana komunikacja: używaj HTTPS (ngrok/produkcyjny reverse proxy).
- Lekki moduł: widget to czysty JS + QRCode CDN, bez frameworków.
- Jednorazowe kody: UUID, 5 min TTL, status USED po weryfikacji.
- Cyberbezpieczeństwo: walidacja URL, brak trustu do hosta TLS (własny check), ograniczony payload, obsługa błędów i timeoutów.
- Obsługa błędów: kody `MISSING_TOKEN`, `TOKEN_NOT_FOUND`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`, `VERIFY_FAILED`.

## 7. Jak uruchomić backend (Verify API)
Wymagania: Node 18+, npm.

```bash
cd backend
npm install
npm run dev          # start na http://localhost:4000
```

Ngrok (tunel HTTPS, potrzebny do widgetu i demo, które wskazują na publiczny URL):
```bash
ngrok http 4000
# zapamiętaj adres https://<subdomain>.ngrok-free.dev
```
Podmień w plikach frontendowych wartość `API_URL`:
- `widget/widget.js`
- `mobywatel-demo/app.js`

## 8. Jak uruchomić widget (lokalnie jako statyczne pliki)
```bash
cd widget
python -m http.server 8080  # lub dowolny static server
# otwórz http://localhost:8080/index.html
```
Widget odpyta `API_URL` (ngrok/prod) o token i pokaże kod QR oraz podstawowe informacje.

## 9. Jak uruchomić demo mObywatel
```bash
cd mobywatel-demo
python -m http.server 8081  # lub dowolny static server
# otwórz http://localhost:8081/
```
Scenariusz:
1) Na stronie z widgetem kliknij „Zweryfikuj” i zeskanuj QR w demie (przycisk „Scan the QR code”).
2) Alternatywnie skopiuj token z QR i wklej w pole manualne.
3) Zobacz wynik: „Strona zaufana” albo ostrzeżenie z powodem (brak w rejestrze/SSL/błąd tokenu).

## 10. Endpoints (Verify API)
- `GET /health` – status serwisu.
- `POST /api/is-trusted-domain` – body `{ url }`, zwraca metadane domeny (czy .gov.pl, czy w rejestrze).
- `POST /api/create-token` – body `{ url }`, tworzy nonce, zwraca token + flaga rejestru + końcówka .gov.pl.
- `POST /api/verify-token` – body `{ token }`, weryfikuje domenę i certyfikat, zwraca status TRUSTED/UNTRUSTED.
- `GET /api/token-status?token=` – polling wyników dla widgetu.

## 11. Testowanie scenariuszy
- Pozytywny: domena z rejestru `.gov.pl` z poprawnym SSL (np. `https://100sekund.gov.pl`).
- Negatywne:
  - domena spoza rejestru,
  - brak/nieprawidłowy SSL (status INVALID/NO_SSL/ERROR),
  - token wygasły (po 5 min),
  - token użyty ponownie (status USED).
- Brak połączenia: aplikacja i widget pokazują komunikat o błędzie sieci.

## 12. Materiały do dostarczenia (zgodnie z wymaganiami formalnymi)
- Szczegółowy opis i tytuł projektu: niniejszy README.
- Prezentacja PDF (≤10 slajdów): umieść w `docs/presentation.pdf`.
- Makiety (lo-fi): umieść w `docs/mockups/`.
- Film demo (≤3 min) z linkiem do repo: umieść link w `docs/VIDEO.md`.
- Dodatkowo:
  - Repozytorium kodu (to repo).
  - Zrzuty ekranu: umieść w `docs/screenshots/` (tu dodaj swoje PNG/JPG).
  - Linki do demonstracji: `docs/DEMO_LINKS.md` (np. ngrok URL, nagranie).
  - Materiały graficzne: `docs/assets/`.

## 13. Kryteria oceny (waga 100%)
- Związek z wyzwaniem — 25%
- Wdrożeniowy potencjał rozwiązania — 25%
- Walidacja i bezpieczeństwo danych — 20%
- UX i ergonomia pracy — 15%
- Innowacyjność i prezentacja — 15%

## 14. Dostępne zasoby
- Lista oficjalnych domen i subdomen gov.pl: patrz `backend/src/govDomains.ts`.
- Przykładowe metadane SSL: można łatwo podmienić w `sslChecker.ts` lub dodać źródło.
- Sandbox testowy (fałszywe witryny): podłączając inne hosty do API (`url` w widget/demo).

## 15. Kontekst wdrożeniowy i dalsze kroki
- Możliwość pilotażu w mObywatel po hackathonie.
- Rozszerzenia produkcyjne: trwałe storage tokenów, revocation listy, telemetry/alerting, hardening TLS (OCSP, pinning), cache rejestru domen, rate limiting, obserwowalność.

## 16. Kontakt
Podczas wydarzenia: mentorzy techniczni i merytoryczni (punkt konsultacyjny) oraz kanał Discord (informacja organizatora).

