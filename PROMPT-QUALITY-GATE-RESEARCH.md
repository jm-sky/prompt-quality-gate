# Zadanie researchowe: gotowe rozwiązania dla Claude Code Prompt Quality Gate

Przeprowadź **niezależny research w internecie** na podstawie `PROMPT-QUALITY-GATE-SPEC.md`. Najpierw sprawdź aktualność i realną dostępność API. Nie zakładaj prawdziwości nazw i metod użytych w istniejących rozmowach; potwierdź je w bieżącej oficjalnej dokumentacji Claude Code.

## Cel

Ustalić, czy istnieje **gotowy, utrzymywany plugin/mod/hook**, który realizuje lub pozwala prosto zaadaptować ocenę **tylko pierwszego promptu nowej sesji**, ewentualne pytania doprecyzowujące oraz podmianę promptu po zgodzie użytkownika, z Haiku jako modelem oceny.

## Zakres

1. Oficjalne możliwości Claude Code (hook `UserPromptSubmit`, ewentualne Mods, plugins, API UI i API modeli); podaj dokładne źródła i daty lub wersje, jeśli dostępne.
2. Faktyczne zachowanie wobec `/clear`, `/resume`, nowych i istniejących sesji; czy istnieje niezawodny znacznik „pierwszej wiadomości”.
3. Przeszukaj GitHub, dokumentację i aktualne przykłady w poszukiwaniu rozwiązań typu: `prompt-coach`, prompt optimizer/enhancer, prompt validation, interactive user prompt hooks/mods.
4. Porównaj maksymalnie 5 najbliższych projektów: ostatnia aktualizacja, aktywność, licencja, utrzymanie, sposób instalacji, obsługiwane funkcje, możliwości modyfikacji, ograniczenia.
5. Sprawdź, jak uruchamiać Haiku wewnątrz Claude Code i czy ten wariant mieści się w abonamencie czy rodzi dodatkowe koszty. Nie wnioskuj o kosztach bez podstawy w dokumentacji.
6. Zaproponuj **reuse/fork/build** z konkretnym uzasadnieniem, estymacją złożoności jakościową (niska/średnia/wysoka) i minimalnym planem implementacji.
7. Oceń ryzyko prywatności i przesyłania promptów poza środowisko Claude Code.

## Wynik

Zwróć zwięzły raport Markdown:
- **Executive summary**: czy istnieje gotowiec wart użycia.
- **Tabela porównawcza** projektów i ich ograniczeń.
- **Weryfikacja API**: które operacje są faktycznie możliwe i w jaki sposób.
- **Rekomendowana droga MVP** oraz alternatywa, jeśli nowsze API Mods nie działa.
- **Pytania/ryzyka**, których nie udało się rozstrzygnąć.
- **Źródła**: bezpośrednie linki do docs/repo/issues/commits, z datą sprawdzenia.

Nie implementuj jeszcze kodu ani nie dodawaj zależności. Nie rozszerzaj MVP o OpenRouter. Jeśli informacje są sprzeczne, oznacz je w raporcie zamiast zgadywać.
