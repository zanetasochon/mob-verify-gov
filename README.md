# mObywatel – weryfikacja stron gov.pl

## Problem

Oszustwa phishingowe podszywające się pod strony w domenie gov.pl. Użytkownik nie ma prostego, pewnego sposobu, żeby potwierdzić, że strona jest oficjalna.

## Core mechanizm

Użytkownik skanuje w aplikacji mObywatel jednorazowy kod QR wygenerowany na stronie. Backend państwowy sprawdza domenę w oficjalnym rejestrze gov.pl oraz jej certyfikat SSL i zwraca do mObywatel wynik: **strona zaufana / podejrzana**.

## Zasoby

- Lista domen gov.pl (dane.gov.pl)
- Sandbox SSL: badssl.com
