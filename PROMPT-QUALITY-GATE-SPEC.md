# Claude Code — First Prompt Quality Gate

**Status:** założenia MVP do weryfikacji technicznej i implementacji  
**Cel:** pomóc doprecyzować wyłącznie pierwszy prompt nowej sesji Claude Code, bez ingerowania w dalszą rozmowę.

## Inspiracja i świadome różnice

Inspiracja: Tristen O’Brien, [5 More Claude Code Mods You Need](https://www.youtube.com/watch?v=aD-h7Bcn5OY), segment **Prompt Upgrade, ok. 03:01–04:09**. Według dostępnej [transkrypcji filmu](https://moderncreator.app/2026-10-12-tristen-o-brien-5-more-claude-code-mods-you-need) przepływ obejmuje pytania, podgląd oryginału i propozycji oraz edycję, kopiowanie lub uruchomienie propozycji. Bezpośredni odczyt YouTube był niedostępny podczas weryfikacji 2026-10-21; nie jest to audyt kodu autora.

Ten projekt świadomie zawęża ideę: **tylko pierwszy prompt, ocena adekwatności zamiast obowiązkowego przepisywania, Haiku, brak trwałej historii treści**. Ograniczenia first-only i Haiku są wymaganiami tego projektu, nie ustaleniami wynikającymi z demonstracji. Dłuższy prompt sam w sobie nie jest kryterium jakości.

Istnieje społecznościowa implementacja [afterever / prompt-upgrade](https://github.com/afterever/claude-mods/tree/a427b0225e091eb8c85c373d70e5de43043b3b3a/prompt-upgrade), której README przypisuje pomysł i specyfikację stronie autora filmu. Nie potwierdzono, że to kod użyty w filmie. Przed implementacją porównać adaptację tego modułu z małym własnym Modem; szczegóły i rozbieżności w [researchu](docs/research.md#9-uzupełnienie-prompt-upgrade-i-inspiracja-z-filmu).

## 1. Problem

Pierwszy prompt nowej sesji bywa zbyt ogólny, np. „napraw logowanie”. Zamiast od razu uruchamiać pracę nad niejasnym zadaniem, chcemy opcjonalnie doprecyzować oczekiwany efekt i ograniczenia. Krótkie prompty mogą jednak być w pełni poprawne, jeśli ich znaczenie wynika z kontekstu projektu, np. `continue`, gdy repozytorium zawiera instrukcje dalszej pracy.

## 2. Zasady funkcjonalne

1. Gate dotyczy **wyłącznie pierwszej wiadomości użytkownika w nowej sesji**. Wszystkie następne wiadomości przechodzą bez oceny i bez wywołań modelu.
2. Przy wznowieniu istniejącej sesji (`resume`) gate nie powinien uruchamiać się ponownie. Po rozpoczęciu rzeczywiście nowej sesji, również przez `/clear`, powinien móc zadziałać ponownie. Dokładną semantykę identyfikatorów sesji należy zweryfikować.
3. Najpierw działają lokalne reguły pomijania, konfigurowane per projekt. Przykład: dokładnie `continue` i `kontynuuj` → przepuść bez zmian.
4. **Nie oceniamy promptu jedynie po długości.** Ocena bierze pod uwagę, czy użytkownik podał konkretny cel, czy brak istotnych informacji i czy zadanie może być świadomie delegowane do instrukcji projektu.
5. Dla promptu niewymagającego doprecyzowania gate przepuszcza **oryginalną wiadomość bez zmian**.
6. Dla niejasnego promptu Claude Haiku przygotowuje maksymalnie **3 krótkie, istotne pytania**. Unikamy pytań, na które odpowiedź może ustalić sam Claude, analizując repozytorium.
7. Po odpowiedziach użytkownika gate buduje lepszy prompt, zachowując oryginalny zamiar. Użytkownik może zaakceptować ulepszony prompt, wysłać oryginalny albo anulować.
8. Pomyłki gate nie mogą blokować normalnej pracy: przy błędzie lub timeout oryginalny prompt przechodzi dalej (**fail-open**).
9. MVP wykorzystuje **Haiku przez mechanizmy Claude Code**, bez OpenRouter, osobnych kluczy API i porównywania dostawców.
10. Gate działa tylko w kliencie/sposobie uruchomienia, w którym da się bezpiecznie uzyskać pytania i odpowiedzi użytkownika. Jeśli interaktywny mod nie jest wspierany w danym trybie, zachowanie musi być jasno określone.

## 3. Przykładowe scenariusze

| Pierwszy prompt | Oczekiwane zachowanie |
| --- | --- |
| `continue` | Pomiń gate; normalny workflow projektu (np. instrukcje w `AGENTS.md`, `CLAUDE.md` i odwołania do `NEXT-SESSION-KICK-OFF-PROMPT.md`). |
| `kontynuuj` | Pomiń gate. |
| `napraw logowanie` | Zapytaj o brakujące wymagania, o ile nie wynikają z podanego kontekstu. |
| `dodaj logowanie OAuth` | Oceń kontekst; ewentualnie dopytaj tylko o decyzje wymagane od użytkownika. |
| Szczegółowy opis zadania | Przepuść bez zmian. |
| Druga i kolejna wiadomość | Zawsze pomiń gate, nawet gdy wiadomość jest krótka. |
| Wznowienie sesji | Nie uruchamiaj nowego gate. |

## 4. Preferowany przepływ

```text
Pierwszy prompt nowej sesji
  ├─ gate wyłączony / prompt na liście wyjątków → oryginał
  └─ Haiku: ocena adekwatności promptu
       ├─ wystarczający → oryginał
       └─ niejasny → maks. 3 pytania → propozycja nowego promptu
                                      ├─ akceptuj → nowy prompt
                                      ├─ wyślij oryginał → oryginał
                                      └─ anuluj → bez wysyłania

Kolejne prompty sesji → bez interwencji
```

## 5. Konfiguracja (proponowany format, NIE natywna składnia Claude Code)

Domyślna konfiguracja użytkownika z możliwością nadpisania przez konfigurację projektu. Ścieżkę, sposób ładowania i bezpieczeństwo pliku ustalić po researchu.

```dotenv
PROMPT_GATE_ENABLED=true
PROMPT_GATE_FIRST_PROMPT_ONLY=true
PROMPT_GATE_MODE=smart
PROMPT_GATE_MODEL=haiku
PROMPT_GATE_MAX_QUESTIONS=3
PROMPT_GATE_REQUIRE_APPROVAL=true
PROMPT_GATE_ON_ERROR=pass
PROMPT_GATE_SKIP_EXACT=continue,kontynuuj
PROMPT_GATE_CONTEXT_FILES=AGENTS.md,CLAUDE.md,NEXT-SESSION-KICK-OFF-PROMPT.md
```

**Uwaga:** lista `CONTEXT_FILES` określa potencjalne źródła instrukcji, ale **nie oznacza obowiązkowego odczytywania ich całej zawartości przy każdej ocenie**. Należy unikać niepotrzebnego zużycia tokenów, dużych plików i wycieku poufnych danych. W pierwszej kolejności wystarczają deterministyczne reguły i niezbędny kontekst.

## 6. Wymagania niefunkcjonalne

- Mały narzut czasowy na start sesji i brak kosztu dla kolejnych wiadomości.
- Brak osobnej infrastruktury, serwera i zewnętrznych tokenów API w MVP.
- Łatwe wyłączenie globalnie i per projekt.
- Krótki, czytelny interfejs terminalowy; brak pętli pytań.
- Nie nadpisywać treści promptu bez zgody użytkownika.
- Nie logować treści promptów ani odpowiedzi domyślnie.
- Testy: nowe sesje, resume, clear, bypass, błędy, anulowanie, zatwierdzanie.

## 7. Sprawy otwarte do weryfikacji w osobnym researchu

1. Czy aktualna wersja Claude Code rzeczywiście umożliwia przez **Mods / inny mechanizm**: przechwycenie promptu, interaktywne pytania i zastąpienie jego treści? Jakie są dokładne API i ograniczenia? Nie zakładać, że starsze przykłady działają.
2. Czy można niezawodnie wykryć **pierwszą wiadomość nowej sesji**, `/clear` oraz `/resume` bez kruchego lokalnego stanu?
3. Jak wywołać **Haiku w kontekście Claude Code** i jak rozliczane są takie wywołania?
4. Czy istnieje gotowy plugin/mod podobny do `prompt-coach`, który rozwiązuje całość lub część problemu?
5. Jakie są ryzyka interakcji z workflow `continue`, instrukcjami projektu, hookami i trybem nieinteraktywnym?
6. Jaki najprostszy model dystrybucji i konfiguracji: globalnie oraz per projekt?

## 8. Zakres poza MVP

- OpenRouter i inne zewnętrzne modele.
- Ranking, benchmarki modeli i automatyczny model routing.
- Analizowanie każdej wiadomości rozmowy.
- Zapisywanie wygenerowanych tasków w repozytorium.
- Rozbudowany interfejs i baza historii.

## 9. Kryteria akceptacji MVP

- `continue` w projekcie z odpowiednimi instrukcjami przechodzi bez interwencji.
- Pierwszy niejasny prompt może wywołać pytania i akceptację ulepszonej wersji.
- Pierwszy dobry prompt przechodzi bez zmian.
- Każdy kolejny prompt sesji przechodzi bez udziału gate.
- Wznowienie sesji nie traktuje kolejnego promptu jako pierwszego.
- Awaria mechanizmu nie powoduje utraty oryginalnej wiadomości ani blokady pracy.
- Konfiguracja projektowa nadpisuje domyślną.
