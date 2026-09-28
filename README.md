# Semaphore CLI

[![npm version](https://img.shields.io/npm/v/semaphore-cli?logo=npm)](https://www.npmjs.com/package/semaphore-cli)
[![MIT License](https://img.shields.io/github/license/artemy/semaphore)](LICENSE.md)

![Claude Code](https://img.shields.io/badge/Claude_Code-supported-green) ![Codex](https://img.shields.io/badge/Codex-supported-green) ![opencode](https://img.shields.io/badge/opencode-supported-green)

🚦 Command-line tool for Semaphore, a USB status light. Hook it up to [Claude Code](https://claude.ai/code), [Codex](https://github.com/openai/codex) or [Opencode](https://opencode.ai) and see your agent status on a light indicator.

> [!TIP]
> Needs a board running the [Semaphore firmware](https://github.com/artemy/semaphore-firmware).

## Features

- Light up one color at a time: green, yellow, or red
- Steady or blinking, with a configurable blink speed
- Read back the current state of the light
- Replay the startup animation on demand
- Ready-made hooks for Claude Code, Codex and Opencode (support for more harnesses is in the future)

## Getting started

### Prerequisites

- Node.js 18+
- A Semaphore light connected over USB. See the [firmware README](https://github.com/artemy/semaphore-firmware) for supported boards and flashing instructions.

### Installing

```shell
npm install -g semaphore-cli
```

Or from source:

```shell
git clone https://github.com/artemy/semaphore
cd semaphore
npm install
npm install -g .
```

### How to use

```
semaphore <color> on
semaphore <color> blink [half_period_ms]
semaphore off
semaphore status
semaphore boot
```

- `<color>` is `red`, `yellow` or `green`. The light shows one color at a time.
- The blink half-period is 20–5000 ms (default 500).
- `--soft` (or `-s`) exits silently with code 0 when the light is unplugged or unreachable (recommended for use in hooks).

Examples:

```shell
semaphore red on             # steady red
semaphore green blink 250    # fast blinking green
semaphore off                # turn the light off
semaphore status             # get the current state
```

## Hooks

Hooks make the light follow your agent's session automatically:

| Light        | Meaning                |
|--------------|------------------------|
| green        | Idle, waiting for you  |
| red          | Agent is busy          |
| yellow blink | Agent needs your input |
| off          | No active session      |

⚠️ All hooks call `semaphore` from your `PATH`, so install the CLI globally first (see [Installing](#installing)).

Every hook command uses `--soft`. An unplugged light never breaks your session, and no hook output ends up in the model's context.

### Claude Code

Run from inside Claude Code:

```
/plugin marketplace add artemy/semaphore
/plugin install semaphore-hooks@semaphore
```

To set up the hooks without the plugin, merge the `hooks` key from [`hooks/hooks.json`](hooks/hooks.json) into your `.claude/settings.json`.

<details>
<summary>Hook events</summary>

| Light        | Hook events                                                            |
|--------------|------------------------------------------------------------------------|
| green        | `SessionStart` (after the boot animation), `Stop`, `StopFailure`       |
| red          | `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`                |
| yellow blink | `PermissionRequest`, `Notification` (permission prompts and questions) |
| off          | `SessionEnd`                                                           |

`SessionStart` skips compaction, so an automatic compaction mid-turn does not turn the light green.

Known limitations:

- Claude Code has no hook for user interrupts. If you reject a permission prompt or dismiss a question with Esc, the light keeps blinking yellow until your next prompt.
- Tool calls from background subagents turn the light red, even while a prompt is waiting for you.

</details>

### Codex

Run from your terminal:

```shell
codex plugin marketplace add artemy/semaphore
codex plugin add semaphore-hooks@semaphore
```

⚠️ The next time you start Codex, it asks you to review the new hooks.

To set up the hooks without the plugin, copy the contents of [`hooks/codex-hooks.json`](hooks/codex-hooks.json) into your `.codex/hooks.json`.

<details>
<summary>Hook events</summary>

| Light        | Hook events                                                 |
|--------------|-------------------------------------------------------------|
| green        | `Stop`                                                      |
| red          | `UserPromptSubmit`, `PostToolUse`                           |
| yellow blink | `PermissionRequest`, `PreToolUse` (on `request_user_input`) |

Codex has no session-end hook, so the light stays on after you quit.

</details>

### Opencode

Copy [`.opencode/plugins/semaphore-hooks.js`](.opencode/plugins/semaphore-hooks.js) into `~/.config/opencode/plugins/` to use it in every project, or into a project's `.opencode/plugins/` to use it in that project only. Opencode loads it automatically on the next start.

An npm package for the plugin is planned.

<details>
<summary>Plugin events</summary>

| Light        | Opencode events                                                                                                        |
|--------------|------------------------------------------------------------------------------------------------------------------------|
| green        | `session.created`, `session.idle`, `question.rejected`                                                                 |
| red          | `message.updated` (user messages), `tool.execute.after`, `permission.replied`, `question.replied`                      |
| yellow blink | `permission.asked`, `question.asked`                                                                                   |
| off          | `dispose`                                                                                                              |

The `permission.*` and `question.*` events are also handled in their `v2` forms.

The startup animation plays when Opencode loads the plugin.

</details>

## Built with

- [Node.js](https://nodejs.org/)
- [node-hid](https://github.com/node-hid/node-hid) - USB HID access

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
