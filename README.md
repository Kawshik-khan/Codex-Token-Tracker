# TokenTrack

TokenTrack is a local-first analytics layer for Codex CLI usage. It stores token usage in SQLite, estimates cost, tracks sessions and projects, renders terminal dashboards, and exports CSV/JSON.

## Install

```powershell
npm install
npm run build
npm link
```

## Commands

```powershell
tokentrack stats
tokentrack stats session
tokentrack stats today
tokentrack stats week
tokentrack stats month
tokentrack stats cost
tokentrack stats project
tokentrack stats project zenvy
tokentrack monitor
tokentrack export csv
tokentrack export json
tokentrack budget set 5000000
tokentrack ingest codex-log C:\Users\you\.codex\sessions\session.jsonl
tokentrack run -- codex "explain this repo"
```

The installed binary also provides `codex stats`, `codex monitor`, `codex export`, and `codex budget set`.

## VS Code extension

TokenTrack can also run as a VS Code extension from this same project.

```powershell
npm.cmd install
npm.cmd run build
code .
```

In VS Code, press `F5` and run commands from the Command Palette:

```text
TokenTrack: Open Dashboard
TokenTrack: Show Today
TokenTrack: Show Week
TokenTrack: Show Month
TokenTrack: Show Current Session
TokenTrack: Show Projects
TokenTrack: Set Monthly Budget
TokenTrack: Export JSON
TokenTrack: Export CSV
TokenTrack: Ingest Codex JSONL Log
TokenTrack: Show Database Path
```

By default, the extension stores its SQLite database in VS Code global extension storage. Set `tokentrack.databasePath` in VS Code settings to point the extension at the same SQLite file used by the CLI.

## Transparent Codex workflow

TokenTrack supports transparent tracking in two practical modes:

1. `tokentrack run -- codex ...` launches Codex, proxies stdin/stdout/stderr, and captures usage metadata from JSON/JSONL events when Codex emits it.
2. `tokentrack ingest codex-log <path>` imports Codex JSONL logs from local session files.

If you want the command name to remain `codex`, set the original executable path and let TokenTrack proxy all non-analytics Codex commands:

```powershell
$env:CODEX_REAL_BIN="C:\Users\you\AppData\Roaming\npm\codex-real.cmd"
codex "explain this repo"
```

This preserves the user-facing workflow while keeping TokenTrack outside Codex internals. Analytics commands such as `codex stats` are handled by TokenTrack; any other `codex ...` invocation is forwarded to `CODEX_REAL_BIN`.

## Storage

By default, TokenTrack stores data in:

```text
%LOCALAPPDATA%\TokenTrack\tokentrack.sqlite
```

Override with:

```powershell
$env:TOKENTRACK_DB_PATH="D:\path\tokentrack.sqlite"
```

## Pricing

Pricing defaults are stored in code and can be extended with `TOKENTRACK_PRICING_PATH`, a JSON file shaped like:

```json
{
  "gpt-5": {
    "input": 1.25,
    "output": 10.0,
    "cachedInput": 0.125
  }
}
```

All prices are dollars per one million tokens.

## Test strategy

- Unit test usage extraction against common Codex/OpenAI response shapes.
- Unit test cost calculation with regular and cached input tokens.
- Repository tests should use a temp SQLite file and assert indexes, inserts, aggregations, budget thresholds, and export results.
- CLI smoke tests should run against a temp DB with deterministic fixture logs.
- Monitor tests should keep rendering logic pure and test summary values separately from Ink.
