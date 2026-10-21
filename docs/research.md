# Research: Claude Code First Prompt Quality Gate

**Data weryfikacji:** 2026-10-21  
**Status:** desk research; bez implementacji i bez testów na lokalnej instalacji Claude Code.  
**Zakres:** zgodny z [SPEC](../PROMPT-QUALITY-GATE-SPEC.md) i [briefem](../PROMPT-QUALITY-GATE-RESEARCH.md). Bez OpenRouter, nowych kluczy API i analizy kolejnych wiadomości.

## 1. Executive summary

**Wniosek: brak zweryfikowanego gotowca pokrywającego całe MVP.** Jest jednak bardzo bliski technicznie [prompt-bouncer](https://github.com/ray-amjad/claude-code-mods/tree/main/plugins/prompt-bouncer): działający **Mod** z `prompt.submit`, `$.model.complete({ model: 'haiku' })`, kontekstem projektu i obsługą błędów typu fail-open. Sprawdza jednak **każdy** prompt, odrzuca niejasne polecenia zamiast zadawać do trzech pytań i nie ma wymaganego przepływu akceptacji zamiennika.

**Rekomendacja: BUILD (mały własny Mod), REUSE wzorców z prompt-bouncer; nie fork całego repozytorium.** Oficjalne Mods pozwalają rzeczywiście podmienić tekst promptu, wyświetlić UI i użyć Haiku na poświadczeniach aktualnej sesji. Klasyczny hook `UserPromptSubmit` nie zastąpi Modu w pełnym UX. Złożoność MVP: **średnia**, z dwoma elementami do praktycznej walidacji: **wyłącznie pierwszy prompt mimo `/clear`/`/resume`** oraz **interaktywne pytania + świadome potwierdzenie w `prompt.submit`**.

Zakładana platforma: **interaktywny terminal Claude Code >= 2.1.287**. VS Code/desktop tylko po osobnej weryfikacji. Nieinteraktywny `claude -p`/SDK: domyślnie przepuszczać oryginał (brak UI).

## 2. Porównanie istniejących projektów (maks. 5)

Daty poniżej to **ostatnie zweryfikowane commity repozytorium**, nie gwarancja aktywnego utrzymania konkretnego modułu. Kod/README i licencje sprawdzono 2026-10-21.

| Projekt | Aktualizacja / aktywność / licencja | Instalacja | Mocne strony | Luki względem MVP |
|---|---|---|---|---|
| [ray-amjad / prompt-bouncer](https://github.com/ray-amjad/claude-code-mods/tree/main/plugins/prompt-bouncer) | [2026-10-18, commit całego katalogu](https://github.com/ray-amjad/claude-code-mods/commit/6db48a3af54f1b681e4d21e6d4f54ff497389fad); rozwijany katalog Mods; **MIT** | `claude plugin marketplace add ray-amjad/claude-code-mods`, następnie `claude plugin install prompt-bouncer@claude-code-mods` | Natywny Mod; przechwycenie `prompt.submit`, sprawdzenie pochodzenia, `Haiku`/lokalne reguły, `{ drop }`, fail-open, `userConfig`, testowany wg autora na 2.1.296 | Weryfikuje każdą wiadomość; tryb quick używa długości/regexów; brak dialogu 3 pytań, akceptacji oraz zastąpienia promptu; sam ocenia „pierwszość” przez pustą historię, co wymaga testów |
| [harshivpgajjar / fixmyprompt](https://github.com/harshivpgajjar/fixmyprompt) | [2026-07-08](https://github.com/harshivpgajjar/fixmyprompt/commit/e16e734d95789fafd91727c13820d117b901b83c); 39 commitów; **MIT** | Marketplace plugin / `python3 install.py` (osobne instalowanie CLI) | Coach, opt-in, scoring lokalny, wskazówki, personalizacja i testy | Klasyczne hooki; generalnie wiele wiadomości, nie tylko pierwsza; brak gwarantowanej natywnej podmiany z akceptacją; dodatkowe komponenty/artefakty i opcjonalny model zewnętrznym procesem — zbędne dla MVP |
| [0-to-1-Labs / claude-code-prompt-optimizer](https://github.com/0-to-1-Labs/claude-code-prompt-optimizer) | [2026-09-30](https://github.com/0-to-1-Labs/claude-code-prompt-optimizer/commit/7675de712084cd6e6a6a658c12b3291a5722655b); 27 commitów; **MIT** | Marketplace: `0-to-1-Labs/claude-marketplace`; plugin `claude-code-prompt-optimizer` | Opt-in, model do rozwijania promptu, integracja z hooks | Klasyczny `UserPromptSubmit` i dodatkowy kontekst, a nie zastąpienie oryginału; bazowo silniejszy model / Agent SDK; bez first-only, 3 pytań i natywnego potwierdzenia |
| [Hocine-Bourouih / claude-prompt-optimizer](https://github.com/Hocine-Bourouih/claude-prompt-optimizer) | [2026-03-31](https://github.com/Hocine-Bourouih/claude-prompt-optimizer/commit/08b557a28c4f13ff5eabd8387de8d08e97dcf853); 5 commitów; **MIT** | Instalator z repo / plugin Claude Code | Automatyczne propozycje, kontekst projektu, elementy zatwierdzania | Klasyczne skrypty/hooki, szersza funkcjonalność pamięci sesji; brak dowodu na bezpośrednią, bezstratną podmianę tekstu w tym samym `prompt.submit`; słabszy sygnał utrzymania |
| [neelshah4 / claude-prompt-optimizer](https://github.com/neelshah4/claude-prompt-optimizer) | [2026-10-17](https://github.com/neelshah4/claude-prompt-optimizer/commit/25a6b8210f55309dffb170bf5ca6933c40d7112a); świeża aktywność; **MIT** | Skill/plugin wg README projektu | Strukturyzacja promptów, kontrole poprawności i doprecyzowanie zadania | Działa przy kolejnych istotnych zadaniach, optymalizuje zachowanie odpowiedzi Claude, nie jest natywną bramką pierwszego promptu z UI i atomową zamianą |

**Ocena reuse/fork/build:**
- **Reuse instalowanego gotowca — niska złożoność, ale niedostateczna zgodność**: `prompt-bouncer` może działać jako osobny eksperyment, lecz nie spełni kryteriów akceptacji.
- **Fork `prompt-bouncer` — średnia złożoność**: techniczne API jest bliskie, ale trzeba wymienić istotę klasyfikacji, logikę sesji i UI; fork całego wielomodułowego katalogu zwiększy koszt aktualizacji.
- **Build małego Modu — średnia złożoność (zalecane)**: kilka plików pluginu, bez zewnętrznej infrastruktury i bez Node/bundlera; projektować na podstawie oficjalnych typów oraz zweryfikowanych fragmentów `prompt-bouncer` (licencja MIT z zachowaniem notice przy kopiowaniu).

Nie znaleziono wiarygodnego, utrzymywanego `prompt-coach` / enhancera spełniającego **łącznie**: first-only + `/clear`/`/resume` + max 3 pytania + wybór nowy/oryginalny/anuluj + podmiana w tej samej turze + Haiku przez sesję.

## 3. Weryfikacja oficjalnego API Claude Code

| Wymaganie | Aktualny mechanizm | Ocena |
|---|---|---|
| Przechwycić pierwszy wpis użytkownika przed uruchomieniem agenta | Mod: `on('prompt.submit', handler)`; filtrowanie `e.origin.kind` (np. `composer`) | **Tak** dla przechwycenia; sam znacznik *pierwszego* nie jest osobnym potwierdzonym polem |
| Przepuścić dosłownie niezmieniony | `next(e)` | **Tak** |
| Podmienić rzeczywisty prompt w historii/turze | `next({ ...e, text: approvedText })` | **Tak** w Mod; nie to samo co dodatkowy kontekst |
| Zatrzymać wysłanie i zachować tekst | `{ drop: reason }`; oryginał wraca do pola edycji | **Tak**; sprawdzić praktycznie zachowanie przy wybraniu Anuluj |
| Pytania, wybór i approval | `$.ui.ask`, ewentualnie własny render/pane przez `$.ui.open` | **API dostępne**; szczegółowy dialog 3 pytań i jego zachowanie w hooku wymagają smoke testu |
| Wywołać Haiku bez osobnego API key | `$.model.complete({ model: 'haiku', system, prompt, maxTokens, timeoutMs })` | **Tak**, na poświadczeniach sesji |
| Historia / bieżąca sesja | `$.session.id()`, `$.session.turns()`, `$.session.messages()` | **Dostępne**; semantykę licznika na granicy `prompt.submit` przetestować |
| Zdarzenia sesji | Mod: `session.start`/`session.end`; klasyczne `SessionStart` z `source` | **Dostępne**, ale mają *różne* semantyki |
| Globalna konfiguracja i projekt | Plugin `userConfig`/`options` oraz ustawienia Claude Code; ewentualnie mały własny plik per projekt | **Tak jako mechanizmy**, ale konkretne klucze `PROMPT_GATE_*` ze specyfikacji **nie są natywnym API** |
| Fail-open | Obsługa błędów Mod przez `.catch(($ ,e,next) => next(e))`, plus kontrola `isAnswered` i parsowania | **Tak**, wymaga rozróżnienia błędu od świadomego Anuluj |

Źródła: [Mods overview](https://code.claude.com/docs/en/plugins/mods/overview), [event hooks](https://code.claude.com/docs/en/plugins/mods/events), [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference), [Mods API](https://code.claude.com/docs/en/plugins/mods/api), [manifest/userConfig](https://code.claude.com/docs/en/plugins-reference).

**Ważne ograniczenia wersji i środowiska:** CLI Mods od **2.1.287**, lokalny Claude Desktop Code od **2.1.286**, VS Code od **2.1.299** (bez feature flags od **2.1.304**). `claude -p` i Agent SDK mogą wykonywać hooki Mod, ale **nie renderują UI**. `--bare` ogranicza ładowanie modyfikacji i ma odmienne wymagania autoryzacji — nie stanowi ścieżki MVP. Interaktywną obsługę najpierw weryfikować w terminalu, nie zakładać identyczności front-endów.

**Klasyczny `UserPromptSubmit`:** wykonuje się dla promptów użytkownika i może zezwolić na dalsze wykonanie, zablokować albo dodać `additionalContext`, lecz **nie oferuje udokumentowanej atomowej podmiany `prompt`** przez modyfikację stdin JSON ani tego samego natywnego UI. Użycie `claude -p` z jego poziomu jako „podhook” zwiększa latencję, koszty i ryzyko pętli rekurencyjnej. [Hooks reference](https://code.claude.com/docs/en/hooks).

## 4. `/clear`, `/resume` i definicja pierwszej wiadomości

**To główna nieweryfikowana w praktyce część projektu.**

- Mod `session.start` odpala się dla załadowanego Modu i hot reloadu, **nie uruchamia się ponownie po `/clear`, `/resume` ani `/branch`**. Wewnętrzny licznik inicjowany tylko w tym evencie **nie wystarczy**.
- Mod `session.end` występuje także przy `/clear`/`/resume`/`/branch`, a `e.reason` rozróżnia m.in. `clear` i `resume` (`/branch` raportuje `resume`). Nie utożsamiać `resume` z „nową sesją”.
- Klasyczny `SessionStart` podaje precyzyjne `source`: `startup`, `resume`, `clear`, `compact`, `fork`. Może być pomocniczym sygnałem (ew. `classic.SessionStart` w Modzie), lecz samodzielna integracja z logiką Modu i kolejność eventów wymagają testów.
- `$.session.turns()` i `$.session.messages()` pozwalają sprawdzać historię bieżącej rozmowy; **brak w dostępnej dokumentacji gwarantowanego atomowego `isFirstUserPrompt`**. Nie uznawać samej długości tablicy za dowód dla `/clear`, autoretry, resume, komend i równoległych zdarzeń.

**Proponowana reguła do testów:** wyłącznie prompt od użytkownika + stan rozmowy bez wcześniejszej *wysłanej* wiadomości użytkownika + per-session „gate consumed” po pierwszym udanym wysłaniu (w tym bypass). Priorytetem jest dowód, że `/resume` istniejącego kontekstu zawsze omija gate, a `/clear` pozwala na nowy gate. Przy niepewności **fail-open**, nigdy blokada pracy. Wznowienie opuszczonej pustej sesji i `/branch` potraktować jako wymagające ustalenia semantyki.

## 5. Haiku, opłaty i prywatność

**Model:** `$.model.complete` uruchamia osobne zapytanie o ocenę/JSON; dokumentacja podaje wprost `model: 'haiku'`. Nie używać `$.model.fork`: dziedziczy model sesji i pełny kontekst, nie gwarantuje Haiku i jest szerszy niż potrzeba. Odpowiedź oceniać przez `r.isAnswered`; przy błędach API, timeoutach, niepoprawnym JSON lub braku pewności — zachować oryginał. Osobne kolejne wywołanie Haiku do finalnego przepisu promptu tylko **po** zebraniu odpowiedzi, jeśli prosty deterministyczny szablon nie wystarczy.

**Rozliczenie potwierdzone przez Anthropic:** `$.model.complete` wykorzystuje **poświadczenia aktualnej sesji** i obciąża używany plan subskrypcyjny, klucz API albo dostawcę chmurowego. Przy zalogowaniu przez Claude subskrypcję **nie trzeba osobnego klucza ani osobnego konta API**, ale wywołania zużywają **limity / budżet użycia subskrypcji**. Przy pracy na API key są rozliczane wg API; nie obiecywać „za darmo” lub określonego kosztu bez znajomości autoryzacji i liczby tokenów. Źródło: [Mods API — Call a model](https://code.claude.com/docs/en/plugins/mods/api#call-a-model).

**Kontekst:** `model.complete` **nie dostaje automatycznie `CLAUDE.md`, `AGENTS.md` ani narzędzi/repozytorium**. Wystarcza oryginalny prompt + krótkie, wybrane fragmenty plików tylko gdy potrzebne; nie czytać całego repo. Dokładne `continue` i `kontynuuj` ignorować **przed** jakimkolwiek wywołaniem modelu. Pytania Haiku nie mogą dotyczyć rzeczy, które agent bezpiecznie sam ustali z repozytorium.

**Prywatność:** sam Mod działa lokalnie, ale ocena Haiku jest dodatkowym wysłaniem treści do endpointu modelu zgodnie z konfiguracją Claude Code (Anthropic / firma / cloud); nie jest to analiza całkowicie lokalna. Unikać HTTP do stron trzecich, telemetryki i logowania promptów/odpowiedzi, odczytu sekretów i nieograniczonych wildcardów. Kod Modu ma znaczące uprawnienia; przed instalacją sprawdzić `claude plugin validate` i audyt `$.fs`/`$.http`/`$.process`. Projektowe pliki kontekstowe traktować jako **dane niezaufane** (prompt injection), nie instrukcje wykonawcze dla gate.

## 6. Rekomendowana ścieżka MVP (plan, bez implementacji)

**Wariant A: mały Mod — złożoność średnia.**

1. **PoC API (warunek startowy):** na docelowym `claude --version` zweryfikować `prompt.submit` → `next({ ...e, text })`, `$.ui.ask`, `$.model.complete(haiku)`, `{ drop }`, `$.session.turns/messages` oraz eventy przy `/clear`/`/resume`. Osobno przypadki anulowania, hot reload i status UX.
2. **Szkielet pluginu:** manifest, `hooks.json` i `register.js` bez Node/bundlera. Lokalne uruchomienie przez `claude --plugin-dir ./...`; walidacja `claude plugin validate`. Nie dodawać zależności dla samego MVP.
3. **Filtr deterministyczny:** enabled/disabled; tylko realna pierwsza wiadomość; exact skip (z opcjonalną polityką trim/case, domyślnie dopasowanie dokładne), obsługa `continue`; bypass nie generuje kosztu i **zużywa** pierwszą turę.
4. **Ocena Haiku:** JSON `pass` albo maks. trzy istotne, nieredundantne pytania, ograniczenia czasu i tokenów; nie oceniaj wyłącznie długości. Kontrolować brakujące decyzje użytkownika, nie próbować wymusić idealnie rozbudowanego promptu.
5. **Interakcja:** 0 pytań → `next(e)`; przy pytaniach → zebrać odpowiedzi i wyświetlić finalny prompt; trzy jawne wybory **Wyślij ulepszony** → zmiana `e.text`, **Wyślij oryginalny** → `next(e)`, **Anuluj** → `{ drop }`. Świadome anulowanie ≠ awaria; nie zamieniać go w fail-open. Niejasna/odrzucona odpowiedź UI traktować jako anulowanie lub bezpieczny fallback **według potwierdzonej semantyki API**.
6. **Konfiguracja:** `userConfig` (np. domyślne enabled, model, max questions) + opcjonalny jawny plik projektu z nadpisaniem wartości; jawna kolejność `project > user > default`. Stosować minimalne uprawnienia pliku i nie interpretować tekstu konfiguracji jako kodu. Najpierw sprawdzić, czy `pluginConfigs` w ustawieniach projektu wystarczy bez własnego parsera. Bez wymyślonego „natywnego” .env.
7. **Test matrix:** pierwsza dobra/niejasna wiadomość; `continue` / `kontynuuj`; drugi prompt; `/clear`; `/resume`; nowa sesja; `/branch`; ponowienie po drop; wybór każdej z 3 akcji; błąd API, timeout, JSON, brak modelu, wyłączony Mod; kontekst repo; headless; różne terminale. W testach sprawdzać **tekst rzeczywiście przekazany do Claude**, nie tylko zawartość UI.

**Dystrybucja:** na start katalog pluginu + `--plugin-dir`; po testach własne repo/marketplace plugin, instalacja globalna per użytkownik i możliwość wyłączenia w projekcie. Włączenie tylko dla obsługiwanych interaktywnych klientów.

**Wariant B: gdy Mods/API interakcji nie działa — złożoność niska, ale zredukowany UX.** Pozostać przy klasycznym `UserPromptSubmit`/`SessionStart`: wykryć pierwszy prompt, ewentualnie wyświetlić komunikat lub *zablokować i oddać tekst do ponownego wprowadzenia*, alternatywnie udostępnić jawną komendę/skill `/refine`. **Nie udawać**, że `additionalContext` zamienia wiadomość użytkownika. Wymóg *zaakceptuj ulepszony / wyślij oryginalny w tej samej turze* pozostaje **niespełniony**. Jeśli ten UX jest obowiązkowy, wymaga działających Mods lub aktualizacji klienta.

## 7. Otwarte ryzyka / warunki decyzji

1. **First-only**: brak oficjalnego atomowego znacznika; kolejność `prompt.submit` vs aktualizacja historii, semantyka `turns`, `/clear`/`/resume`/`/branch`, praca wielu sesji i hot reload — wymagany smoke test na aktualnej wersji.
2. **UI**: dokładna sygnatura `$.ui.ask`, free-text, zachowanie po Esc i możliwość pytań sekwencyjnych w `prompt.submit` do potwierdzenia w typach lokalnej wersji i testem. Nie zakładać automatycznie jednego formularza z 3 polami.
3. **Błędy**: konflikt innych Mods modyfikujących `prompt.submit`, timeouts, równoczesne zdarzenia; zachować wejście bez zmian i czytelne wyjście z interakcji.
4. **Licencje i utrzymanie**: MIT pozwala na reuse z notice, ale gotowce są małymi społecznościowymi projektami; aktywny commit repo nie gwarantuje kompatybilności po aktualizacji Claude Code.
5. **Model i dane**: dostępność aliasu `haiku` / ograniczenia organizacyjne i budżet zależą od zalogowanego konta; koszt i zachowanie należy obserwować w docelowym środowisku, bez domniemywania „bezpłatności”.
6. **Klienci**: interaktywny CLI jako podstawowy cel; `-p`/SDK bez GUI, desktop/VS Code i WSL mogą zachowywać się odmiennie.

## 8. Źródła (sprawdzone 2026-10-21)

**Oficjalna dokumentacja Anthropic / Claude Code:**

- [Mods overview — możliwości, wersje, środowiska i bezpieczeństwo](https://code.claude.com/docs/en/plugins/mods/overview)
- [Mods reference — zdarzenia, `session.start`/`session.end`, `prompt.submit`, API, limity](https://code.claude.com/docs/en/plugins/mods/reference)
- [React to events — `next({...e, text})` i modyfikacja promptu](https://code.claude.com/docs/en/plugins/mods/events)
- [Use the mods API — `$.model.complete`, credentials, ograniczenia kontekstu](https://code.claude.com/docs/en/plugins/mods/api)
- [Create a mod — wymagane pliki i uruchamianie](https://code.claude.com/docs/en/plugins/mods/create)
- [Plugin manifest — `userConfig` i `pluginConfigs`](https://code.claude.com/docs/en/plugins-reference)
- [Settings files and precedence](https://code.claude.com/docs/en/settings)
- [Hooks reference — `SessionStart.source` i klasyczny `UserPromptSubmit`](https://code.claude.com/docs/en/hooks)

**Gotowe rozwiązania i bezpośrednie dowody aktywności:**

- [prompt-bouncer — źródła](https://github.com/ray-amjad/claude-code-mods/tree/main/plugins/prompt-bouncer), [publiczny opis i instalacja](https://claudecodemod.com/mods/prompt-bouncer), [ostatni zweryfikowany commit katalogu 2026-10-18](https://github.com/ray-amjad/claude-code-mods/commit/6db48a3af54f1b681e4d21e6d4f54ff497389fad)
- [fixmyprompt](https://github.com/harshivpgajjar/fixmyprompt), [commit 2026-07-08](https://github.com/harshivpgajjar/fixmyprompt/commit/e16e734d95789fafd91727c13820d117b901b83c)
- [0-to-1-Labs/claude-code-prompt-optimizer](https://github.com/0-to-1-Labs/claude-code-prompt-optimizer), [commit 2026-09-30](https://github.com/0-to-1-Labs/claude-code-prompt-optimizer/commit/7675de712084cd6e6a6a658c12b3291a5722655b)
- [Hocine-Bourouih/claude-prompt-optimizer](https://github.com/Hocine-Bourouih/claude-prompt-optimizer), [commit 2026-03-31](https://github.com/Hocine-Bourouih/claude-prompt-optimizer/commit/08b557a28c4f13ff5eabd8387de8d08e97dcf853)
- [neelshah4/claude-prompt-optimizer](https://github.com/neelshah4/claude-prompt-optimizer), [commit 2026-10-17](https://github.com/neelshah4/claude-prompt-optimizer/commit/25a6b8210f55309dffb170bf5ca6933c40d7112a)

**Zastrzeżenie:** analiza dokumentacji i kodu repozytoriów, bez instalowania obcego kodu, bez wykonania Claude Code i bez benchmarków; punkty wymagające sprawdzenia operacyjnego są jawnie oznaczone.
