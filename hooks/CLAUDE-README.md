# Claude Code hooks

Claude Code support uses the documented lifecycle hooks in `hooks/hooks.json`:

| LED state      | Meaning                     | Hook events                         |
|----------------|-----------------------------|-------------------------------------|
| green solid    | Idle / waiting for input    | `SessionStart`, `Stop`              |
| red solid      | Claude is busy              | `UserPromptSubmit`, `PostToolUse`   |
| yellow blink   | Needs human attention       | `PermissionRequest`, `Notification` |
| all off        | No active session           | `SessionEnd`                        |
