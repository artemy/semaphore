# Semaphore CLI

[![npm version](https://img.shields.io/npm/v/semaphore-cli?logo=npm)](https://www.npmjs.com/package/semaphore-cli)
[![MIT License](https://img.shields.io/github/license/artemy/semaphore)](LICENSE.md)

![Antigravity CLI](https://img.shields.io/badge/Antigravity_CLI-supported-green)
![Claude Code](https://img.shields.io/badge/Claude_Code-supported-green) ![Codex](https://img.shields.io/badge/Codex-supported-green) ![GitHub Copilot CLI](https://img.shields.io/badge/GitHub_Copilot_CLI-supported-green) ![OpenCode](https://img.shields.io/badge/OpenCode-supported-green)

🚦 Command-line tool for Semaphore, a USB status light. Hook it up to [Claude Code](https://claude.ai/code), [Codex](https://github.com/openai/codex), [GitHub Copilot CLI](https://github.com/features/copilot/cli), [OpenCode](https://opencode.ai) or [Antigravity CLI](https://antigravity.google) and see your agent status on a light indicator.

> [!TIP]
> Needs a board running the [Semaphore firmware](https://github.com/artemy/semaphore-firmware).

## Features

- Light up one color at a time: green, yellow, or red
- Steady or blinking, with a configurable blink speed
- Read back the current state of the light
- Replay the startup animation on demand
- Ready-made hooks for Claude Code, Codex, GitHub Copilot CLI, OpenCode, and Antigravity (support for more harnesses is in the future)

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

### Antigravity CLI

Run from your terminal:

```shell
agy plugin install https://github.com/artemy/semaphore
```

Or from a local clone:

```shell
agy plugin install ./plugins/semaphore-hooks
```

<details>
<summary>Hook events</summary>

| Light        | Antigravity events                             |
|--------------|------------------------------------------------|
| green        | `Stop`                                         |
| red          | `PreInvocation`, `PostToolUse`                 |
| yellow blink | `PreToolUse` (on `ask_question`, `run_command`)|

Known limitations:

- Antigravity does not have `SessionStart`, `SessionEnd`, or `Interrupt` lifecycle hooks. As a result, the startup boot animation does not play automatically, and the light does not turn off when exiting the CLI session.
- There is no dedicated `PermissionRequest` event hook; yellow blinking is triggered via `PreToolUse` on `ask_question` and `run_command`. Commands that are already permitted will briefly flash yellow before executing.

</details>

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

| Light        | Hook events                                                    |
|--------------|----------------------------------------------------------------|
| green        | `SessionStart` (after the boot animation), `Stop`, `Interrupt` |
| red          | `UserPromptSubmit`, `PostToolUse`                              |
| yellow blink | `PermissionRequest`, `PreToolUse` (on `request_user_input`)    |
| off          | `SessionEnd`                                                   |

`SessionStart` skips compaction, as in Claude Code.

</details>

### GitHub Copilot CLI

Register the Semaphore marketplace and install its Copilot CLI plugin:

```shell
copilot plugin marketplace add artemy/semaphore
copilot plugin install semaphore-hooks@semaphore
```

Restart Copilot CLI after installing the plugin. Every hook uses `--soft` and suppresses command output so the light works without interrupting the session or affecting hook output.

<details>
<summary>Hook events</summary>

| Light        | Hook events                                                                                 |
|--------------|---------------------------------------------------------------------------------------------|
| green        | `agentStop`                                                                                |
| red          | `userPromptSubmitted`, `preToolUse`, `postToolUse`, `postToolUseFailure`                    |
| yellow blink | `permissionRequest`, `notification` (permission prompts and elicitation dialogs)            |
| off          | `sessionEnd`                                                                                |

Known limitations:

- Copilot CLI's `sessionStart` hook runs only after the first prompt, so Copilot CLI does not play a startup animation or set green before the first prompt.

</details>

### OpenCode

Copy [`.opencode/plugins/semaphore-hooks.js`](.opencode/plugins/semaphore-hooks.js) into `~/.config/opencode/plugins/` to use it in every project, or into a project's `.opencode/plugins/` to use it in that project only. OpenCode loads it automatically on the next start.

An npm package for the plugin is planned.

<details>
<summary>Plugin events</summary>

| Light        | OpenCode events                                                                                                        |
|--------------|------------------------------------------------------------------------------------------------------------------------|
| green        | `session.created`, `session.idle`, `question.rejected`                                                                 |
| red          | `message.updated` (user messages), `tool.execute.after`, `permission.replied`, `question.replied`                      |
| yellow blink | `permission.asked`, `question.asked`                                                                                   |
| off          | `dispose`                                                                                                              |

The `permission.*` and `question.*` events are also handled in their `v2` forms.

The startup animation plays when OpenCode loads the plugin.

</details>

## Built with

- [Node.js](https://nodejs.org/)
- [node-hid](https://github.com/node-hid/node-hid) - USB HID access

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
