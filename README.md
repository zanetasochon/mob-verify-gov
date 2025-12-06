# mObywatel – weryfikacja stron gov.pl

## Problem

Oszustwa phishingowe podszywające się pod strony w domenie gov.pl. Użytkownik nie ma prostego, pewnego sposobu, żeby potwierdzić, że strona jest oficjalna.

## Core mechanizm

Użytkownik skanuje w aplikacji mObywatel jednorazowy kod QR wygenerowany na stronie. Backend państwowy sprawdza domenę w oficjalnym rejestrze gov.pl oraz jej certyfikat SSL i zwraca do mObywatel wynik: **strona zaufana / podejrzana**.

## Zasoby

- Lista domen gov.pl (dane.gov.pl)
- Sandbox SSL: badssl.com

## Architektura

- **Verify API (backend)** – serwis `verify.gov.pl`, który:
  - trzyma listę oficjalnych domen gov.pl,
  - generuje jednorazowe tokeny (nonce) do kodów QR,
  - weryfikuje token + domenę + certyfikat i zwraca status: zaufana / podejrzana.

- **Widget gov.pl (frontend-web)** – lekki skrypt JS osadzany na stronach gov.pl:
  - pokazuje CTA „Zweryfikuj stronę w mObywatel”,
  - pobiera token z Verify API,
  - wyświetla kod QR + podstawowe info o bezpieczeństwie.

- **Demo mObywatel (frontend-web / pseudo-mobile)** – prosta webowa imitacja aplikacji:
  - skanowanie / wpisanie tokenu z QR,
  - wysłanie go do Verify API,
  - pokazanie ekranu: „Strona zaufana” / „Uwaga, podejrzana”.
