# First Prompt Quality Gate

Mod (plugin) do Claude Code, który sprawdza **wyłącznie pierwszy prompt nowej sesji**.
Haiku ocenia, czy prompt wystarcza do startu pracy. Jeśli tak, prompt idzie dalej bez zmian.
Jeśli nie, mod zadaje do 3 pytań, pokazuje propozycję ulepszonego promptu i pyta,
co wysłać: ulepszony, oryginalny, albo nic (anuluj).

Inspiracja: [afterever/prompt-upgrade](https://github.com/afterever/prompt-upgrade). Kod jest napisany od zera, nic nie zostało skopiowane.

## Wymagania

- Claude Code **≥ 2.1.287** w terminalu (sprawdzone ręcznie na 2.1.308 i 2.1.309). Wymaga API Mods (`prompt.submit`, `$.ui.ask`, `$.model.complete`).
- Poświadczenia Claude Code (subskrypcja lub klucz API). Osobnego klucza nie trzeba.

## Instalacja

Z marketplace (po opublikowaniu repozytorium):

```
/plugin install prompt-quality-gate --marketplace jm-sky/prompt-quality-gate
```

Lokalnie, bez instalacji:

```
claude --plugin-dir ./prompt-quality-gate
```

## Konfiguracja

Pierwszeństwo: **projekt > użytkownik > domyślne**.

| Klucz | Domyślnie | Znaczenie |
|-------|-----------|-----------|
| `enabled` | `true` | włącza/wyłącza bramkę |
| `model` | `haiku` | alias modelu do oceny i rewrite |
| `maxQuestions` | `3` | pytań 1–3 |
| `timeoutMs` | `20000` | limit na jedno wywołanie modelu |
| `skipExact` | `continue,kontynuuj` | prompty przepuszczane bez sprawdzania (po trim, bez rozróżniania wielkości liter) |
| `contextFiles` | `AGENTS.md,CLAUDE.md,NEXT-SESSION-KICK-OFF-PROMPT.md` | pliki projektu, których początek widzi model |
| `contextMaxChars` | `1500` | ile znaków z każdego pliku (0 = brak kontekstu) |

- **Użytkownik:** wiersze `userConfig` wtyczki w `/config` albo `pluginConfigs` w ustawieniach.
- **Projekt:** plik `.claude/prompt-quality-gate.json`, np. `{ "enabled": false }`.

## Wyłączenie

`{ "enabled": false }` w `.claude/prompt-quality-gate.json` (jeden projekt) albo `enabled` = wyłączone w konfiguracji użytkownika (wszędzie). Można też odinstalować wtyczkę.

## Jak działa

- Bramka dotyczy tylko pierwszego promptu: sesja bez odpowiedzi asystenta i bez prawdziwej wiadomości użytkownika. Wiersze po `/clear` i `/model` nie liczą się jako historia, więc `/clear` zaczyna bramkę od nowa. `--continue` i `/resume` niosą historię, więc bramka ich nie dotyka.
- Błąd, timeout, niepoprawna odpowiedź modelu: **fail-open**, wysyłany jest oryginał, a w interfejsie pojawia się jedna przyciemniona linia bez treści promptu.
- Esc, „Anuluj” albo własny tekst w ostatnim wyborze: nic nie jest wysyłane, a tekst wraca do pola edycji.
- Po anulowaniu ponowne wysłanie tej samej sesji nie jest oceniane drugi raz (ochrona przed pętlą).
- Brak trwałej historii promptów i odpowiedzi; mod nic nie zapisuje na dysku.

## Koszty

Zużycie Haiku liczy się do planu subskrypcji albo rachunku API. Pierwszy prompt to jedno wywołanie (ocena); jeśli odpowiesz na pytania, dochodzi drugie (rewrite). Kolejne prompty nie wywołują modelu.

## Ograniczenia

- Tylko terminal. Tryby `-p`, SDK i bridge przepuszczają prompt bez zmian.
- Pomijane są: komendy slash, prompty z załącznikami, prompty z `@plik`, wiadomości nie z pola edycji.
- Własny tekst („Type something.”) w ostatnim wyborze oznacza anulowanie.
- Przeładowanie wtyczki zeruje pamięć o sesjach już ocenionych, więc po reloadzie pierwszy prompt może zostać oceniony ponownie.
- Jakość pytań i rewrite zależy od Haiku. Krótki, ale konkretny prompt może zostać uznany za wystarczający.
- Reguły `REQUIRE_APPROVAL`, `ON_ERROR`, `FIRST_PROMPT_ONLY` z SPEC są stałym zachowaniem, nie opcjami.

## Testy

```
claude plugin validate prompt-quality-gate
claude plugin test prompt-quality-gate
```

Testy używają zamockowanych zależności (`GateDeps`). Integracja z prawdziwym Claude Code była sprawdzona osobno, ręcznie, w tmux.

## Licencja

MIT
