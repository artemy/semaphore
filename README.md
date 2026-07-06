# Semaphore CLI

![MIT License](https://img.shields.io/github/license/artemy/semaphore)

🚦 CLI for a USB-HID traffic-light device that turns your desk light into a live session indicator for [Claude Code](https://claude.ai/code), [Codex](https://github.com/openai/codex), and [Opencode](https://opencode.ai).

## Features

- Control red, yellow, and green LEDs individually or all at once
- Three modes per LED: `off`, `on`, and `blink` with configurable speed
- `solo` command lights one LED and clears the other two
- `status` query reads current device state
- `boot` plays a startup animation
- Claude Code, Codex, and Opencode hook integration — the light follows session events automatically where supported

## Getting started

### Prerequisites

- Node.js 18+
- The semaphore device (VID `0x1209`, PID `0x0001`) connected via USB

### Installing

```shell
npm install -g semaphore-cli
```

Or from source:

```shell
git clone https://github.com/artemy/semaphore
cd semaphore/software
npm install
npm install -g .
```

## Usage

```
semaphore <led> off
semaphore <led> on
semaphore <led> blink [half_period_ms]
semaphore solo <color> on
semaphore solo <color> blink [half_period_ms]
semaphore status
semaphore boot
```

- `<led>`: `red` | `yellow` | `green` | `all`
- `<color>`: `red` | `yellow` | `green` (solo turns off the other two)
- blink half-period: 20–5000 ms (default 500)
- `--soft` / `-s`: silently exit 0 on device-connectivity errors (for hooks)

### Examples

```shell
semaphore red on             # turn red LED on
semaphore green blink 250    # fast-blink green (250 ms half-period)
semaphore solo yellow on     # yellow on, red and green off
semaphore all off            # turn everything off
semaphore status             # read and print current device state
```


## Hooks installation

> ⚠️ Every hook command uses `--soft`. This keeps the LED best-effort when the device is unplugged, and suppresses stdout so hook output is not injected into the model's context.

### Claude Code

#### Plugin (recommended)

Make sure the package is installed globally first, then run from inside Claude Code:

```
/plugin marketplace add artemy/semaphore
/plugin install semaphore-hooks@semaphore
```

#### Manual

Merge the `hooks` key from `hooks/hooks.json` into your `.claude/settings.json`.

Claude Code hooks lifecycle is documented in [CLAUDE-README.md](hooks/CLAUDE-README.md)

## OpenAI Codex

#### Plugin (recommended)

Make sure the package is installed globally first, then run from your terminal:


```shell
codex plugin marketplace add artemy/semaphore
codex plugin add semaphore-hooks@semaphore
```

> ⚠️ Codex will prompt you to review the newly installed hooks after you run it next time.

### Manual

Copy the contents of `hooks/hooks-codex.json` into your `.codex/hooks.json`.

Codex hooks lifecycle is documented in [CODEX-README.md](hooks/CODEX-README.md)

## Opencode

#### Plugin

TODO

Opencode hooks lifecycle is documented in [OPENCODE-README.md](hooks/OPENCODE-README.md)

## Built With

- [Node.js](https://nodejs.org/)
- [node-hid](https://github.com/node-hid/node-hid) — USB HID device access

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License — see the [LICENSE.md](LICENSE.md) file for details
