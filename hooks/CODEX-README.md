# Codex hooks

Codex support uses the documented Codex lifecycle hooks in `hooks/codex-hooks.json`:

| LED state      | Meaning                  | Hook events                            |
|----------------|--------------------------|----------------------------------------|
| green solid    | Idle / waiting for input | `Stop`                 |
| red solid      | Codex is busy            | `UserPromptSubmit`, `PostToolUse`      |
| yellow blink   | Needs human attention       | `PreToolUse` (on `request_user_input`) |
| yellow blink   | Needs human approval     | `PermissionRequest`                    |
