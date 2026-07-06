# Opencode hooks

Opencode support uses the native plugin system — the plugin at
`.opencode/plugins/semaphore-hooks.js` is auto-discovered and maps Opencode lifecycle events to the semaphore device:

| LED state    | Meaning                  | Opencode events                                           |
|--------------|--------------------------|-----------------------------------------------------------|
| green solid  | Idle / waiting for input | `session.created`, `session.idle`                         |
| red solid    | Opencode is busy         | `message.updated` (`role=user`), `tool.execute.after`     |
| yellow blink | Needs human attention    | `permission.asked`, `tool.execute.before` (on `question`) |
| all off      | No active session        | `session.deleted`, `dispose`                              |
