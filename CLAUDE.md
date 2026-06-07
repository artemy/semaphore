# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small CLI (`semaphore.js`) that drives a USB-HID traffic-light device (VID `0x1209`, PID `0x0001`) with red/yellow/green LEDs. Each LED can be off, on, or blinking at a configurable half-period (20–10000 ms). The CLI also has a `status` query and a `boot` animation.

## Commands

```
npm install              # installs node-hid (native build)
node ./semaphore.js …    # see usage in semaphore.js header
npm install -g .         # exposes the `semaphore` bin on PATH (used by hooks.json)
```

The package exposes a `semaphore` bin (see `package.json` `bin` field). `files` is allowlisted to ship only `semaphore.js` — if you add a new runtime file, add it there too or it won't be in the published tarball. Verify with `npm pack --dry-run`.

No build, lint, or test scripts are wired up (`npm test` is a placeholder).

## Architecture

- `semaphore.js` — single-file CLI. Flow: `parseArgs` → `openDevice` → `sendOne` per parsed command → `printState` on the last reply.
- HID protocol: 9-byte output report `[reportId=0, cmd, idx, mode, period_lo, period_hi, 0, 0, 0]`.
  - `cmd`: `0x01` SET, `0x03` GET, `0x04` BOOT_ANIM.
  - `idx`: LED index — green=0, yellow=1, red=2, all=0xff.
  - `mode`: 0 off, 1 on, 2 blink.
  - The leading `0x00` is a report-ID prefix the OS requires even though the device's HID descriptor declares no report ID. Do not "clean it up."
- GET reply layout (parsed by `printState`): byte 0 status, then 3-byte triples per LED `(mode, period_lo, period_hi)` in green/yellow/red order.
- `solo <color>` is implemented client-side as two writes: first an `all off`, then set the chosen LED. `solo` rejects `all` and only accepts `on|blink` (not `off` — use `all off` for that).
- `sendOne` waits up to 1s for a `data` event from the device per write and rejects otherwise. Any new command must produce a reply within that window or the write will appear to fail silently (errors are swallowed — see below).
- Device-absent and mid-run errors are deliberately swallowed (exit 0, no output). This is intentional so the CLI can be wired into hooks that fire whether or not the device is plugged in — preserve this behavior.
- `examples/control.html` is a standalone WebHID page implementing the same protocol; keep it in sync if the report format changes.

## Hook integration

`hooks.json` at the repo root is a Claude Code hooks config that drives the device from session lifecycle events. It's not auto-loaded — copy or symlink into `.claude/settings.json` (or merge) to activate. The hook commands invoke the bare `semaphore` bin, so the package must be globally installed (`npm install -g .` or `npm link`) before the hooks will work.

Current mapping and its intended visual language (preserve this semantic when editing):

- **red solid** = Claude is busy (`UserPromptSubmit`, `PostToolUse`)
- **yellow blink** = needs human attention (`PermissionRequest`, `Notification`)
- **green solid** = idle / done (`SessionStart` after boot animation, `Stop`)
- **all off** = no session (`SessionEnd`)