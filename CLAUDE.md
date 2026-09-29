# CLAUDE.md

## What this is

`cli.js` is a single-file CLI for a USB-HID semaphore lamp (VID `0x1209`, PID `0x0001`). The lamp shows **one color at a time** (red, yellow or green), either steady or blinking, or it is off. The CLI also has `status` and `boot` (startup animation). Usage is in the header comment of `cli.js`.

## Commands

```
npm install              # installs node-hid (native build)
node ./cli.js …          # run locally
npm install -g .         # puts the `semaphore` bin on PATH (all hooks call it)
npm pack --dry-run       # check package contents before publishing
```

There are no build, lint or test scripts (`npm test` is a placeholder).

`package.json` `files` only allows `cli.js` and `scripts/`. If you add a runtime file, add it to `files` too.

## CLI

- Flow: `parseArgs` → `openDevice` → `sendOne` → `printState`. Every command sends exactly one report.
- `sendOne` waits up to 1 s for the device's reply. A new command must get a reply within that window.
- Errors (device absent, open failure, no reply) print `error: ...` to stderr and exit 1. With `--soft`/`-s` anywhere on the command line, device-connectivity errors are swallowed instead: no output, exit 0. Keep both modes when you edit error handling.

## HID protocol

SET writes the device's state and GET reads it back. Both use the same 4-byte STATE block:

```
STATE  [mode, color, period_lo, period_hi]
OUT    [0x00, cmd, <STATE>, 0, 0, 0]      9 bytes
IN     [status, <STATE>, 0, 0, 0]         8 bytes
```

- `mode`: `0x00` off (color and period ignored), `0x01` steady (CLI `on`), `0x02` blink.
- `color`: green=0, yellow=1, red=2. There is no "all".
- `period`: u16 LE blink half-period in ms, 20–5000. It only matters for blink.
- `cmd`: `0x01` SET, `0x02` GET, `0x03` BOOT_ANIM.
- `status`: `0x00` OK, `0x01` BAD. The firmware answers BAD to anything it can't decode: an unknown cmd or mode, `color > 2`, or an out-of-range period.
- The leading `0x00` in OUT is a report-ID prefix that the OS requires, even though the HID descriptor declares no report ID. Do not remove it.

## Agent hooks

Each coding agent drives the lamp through its own integration. `README.md` has the install steps and the event tables.

| Agent          | Hooks                                                     | Packaging                                       |
|----------------|-----------------------------------------------------------|-------------------------------------------------|
| Antigravity    | `plugins/semaphore-hooks/hooks.json`                       | `plugins/semaphore-hooks/`                       |
| Claude Code    | `hooks/hooks.json`                                        | `.claude-plugin/marketplace.json`               |
| Codex          | `hooks/codex-hooks.json`                                  | `.codex-plugin/plugin.json`, `.agents/plugins/` |
| GitHub Copilot | `plugins/copilot-cli/com.github.copilot/hooks/hooks.json` | `plugins/copilot-cli/`                           |
| OpenCode       | `.opencode/plugins/semaphore-hooks.js`                    | copied by the user                              |

`scripts/postinstall.js` reminds the user once, after a global install, to enable the plugin.

When you add or edit a hook in any integration:

- **Always pass `--soft`.** Hooks must not fail when the lamp is unplugged. Some agents (for example Claude Code on `SessionStart`/`UserPromptSubmit`) also feed hook stdout into the model's context, so hooks must print nothing.
- **Keep the same colors in every agent:**
  - red steady = agent is busy
  - yellow blink = needs the user (permission prompt, question)
  - green steady = idle / done (after `boot` at session start)
  - off = no session
