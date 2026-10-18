// TUI-side half of the semaphore plugin.
//
// The server plugin runs in the shared background service, which keeps
// running after a TUI exits, and its event stream has no "client
// disconnected" event. This plugin runs inside the TUI process instead: it
// sets green when the TUI starts and off when the TUI exits.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// `--soft` makes the CLI exit 0 when the lamp is unplugged. The catch covers
// the rest, such as the `semaphore` binary missing from PATH.
async function semaphore(...args) {
  try {
    await execFileAsync("semaphore", ["--soft", ...args]);
  } catch {}
}

export default {
  id: "semaphore.hooks.tui",
  async setup() {
    // The TUI starts idle. Server events turn the lamp red when a session runs.
    void semaphore("green", "on");

    // OpenCode awaits this on TUI exit and on plugin unload or reload.
    return () => semaphore("off");
  },
};
