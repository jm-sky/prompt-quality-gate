Zaimplementuj MVP First Prompt Quality Gate w tym repozytorium.

Najpierw przeczytaj:
- AGENTS.md i CLAUDE.md, jeśli istnieją;
- PROMPT-QUALITY-GATE-SPEC.md;
- PROMPT-QUALITY-GATE-RESEARCH.md;
- docs/research.md, szczególnie uzupełnienie o prompt-upgrade.

SPEC jest źródłem wymagań. Research zawiera wskazówki i hipotezy wymagające weryfikacji, a nie gwarancje działania API.

Pracuj etapami:

1. Sprawdź lokalną wersję Claude Code, dostępne typy/API Mods i aktualną oficjalną dokumentację. Wykonaj minimalny PoC najważniejszych mechanizmów: przechwycenie promptu, pytania, zatwierdzenie, wysłanie oraz rozpoznawanie nowej sesji, /clear i /resume.

2. Porównaj adaptację wydzielonego afterever/prompt-upgrade z napisaniem małego własnego Modu. Wybierz prostszą, łatwiejszą w utrzymaniu drogę i krótko uzasadnij wybór. Przy kopiowaniu kodu zachowaj wymagane informacje licencyjne.

3. Zaimplementuj pełne MVP:
- wyłącznie pierwszy prompt nowej sesji;
- kolejne wiadomości i resume bez oceny ani wywołań modelu;
- continue i kontynuuj pomijane lokalnie;
- wystarczający prompt przepuszczany bez zmian i bez rewrite;
- Haiku przez poświadczenia Claude Code, również do rewrite;
- maksymalnie 3 istotne pytania;
- podgląd propozycji oraz wybór: wyślij ulepszony, wyślij oryginalny, anuluj;
- błędy i timeouty: fail-open; świadome anulowanie: nic nie wysyłaj;
- brak trwałej historii promptów i odpowiedzi;
- konfiguracja użytkownika z nadpisaniem per projekt;
- bezpieczne pomijanie nieobsługiwanych trybów i załączników;
- brak podwójnego wysłania oraz ponownego przechwycenia własnego promptu.

Nie rozszerzaj zakresu o OpenRouter, routing modeli ani rozbudowany panel. Nie narzucaj architektury „tej samej tury”, jeśli prostszy przepływ spełnia wymagania.

4. Dodaj testy logiki i przepływu, szczególnie first-only, clear/resume, bypass, anulowania, błędów, ponowień i ochrony przed pętlą. Uruchom walidację pluginu oraz dostępne testy. Oddziel wyniki testów z mockami od rzeczywistego sprawdzenia w interaktywnym Claude Code.

5. Dodaj README: wymagania wersji, instalacja, konfiguracja, wyłączenie, koszty użycia Haiku oraz ograniczenia. Usuń PoC i zbędne pliki z finalnego rozwiązania.

**Uwaga:** Na tej maszynie używam Claude prywatnie i firmowo. Firmowy jest w `~/.claude-company/` a prywatny w `~/.claude-private/`

Nie kończ na planie — kontynuuj do implementacji i weryfikacji. Jeśli środowisko uniemożliwia sprawdzenie kluczowego API, opisz konkretną przeszkodę; nie zastępuj brakującej weryfikacji wymyślonym API ani deklaracją sukcesu.

Pracuj na osobnej gałęzi. Na końcu podsumuj zmiany, wykonane testy i pozostałe ograniczenia. Nie merge’uj samodzielnie.
