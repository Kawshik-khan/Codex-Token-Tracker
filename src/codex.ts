#!/usr/bin/env node
process.env.TOKENTRACK_COMMAND_NAME = "codex";
await import("./cli.js");
