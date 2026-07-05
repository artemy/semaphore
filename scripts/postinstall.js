#!/usr/bin/env node
// Printed once after `npm install`. npm runs postinstall non-interactively (no
// reliable TTY), so we print guidance rather than prompt. Only nag on a global
// install — when pulled in as a dependency this would just be noise.

if (!process.env.npm_config_global) process.exit(0);

console.log(
  [
    "",
    "semaphore-cli installed.",
    "",
    "Optional — traffic-light LED feedback for Claude Code sessions:",
    "  /plugin marketplace add artemy/semaphore",
    "  /plugin install semaphore-hooks@semaphore"
  ].join("\n"),
);
