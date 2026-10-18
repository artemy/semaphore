// Semaphore USB-HID traffic-light hooks for OpenCode 2.x.
// Uses the V2 plugin API: setup(ctx) with the event stream.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Wrapper function to force `--soft` flag and swallow errors.
async function semaphore(...args) {
  try {
    await execFileAsync("semaphore", ["--soft", ...args]);
  } catch {}
}

const GREEN = ["green", "on"];
const RED = ["red", "on"];
const YELLOW = ["yellow", "blink", "500"];

const LIGHT_FOR = {
  "session.created": GREEN,
  "session.execution.succeeded": GREEN,
  "session.execution.failed": GREEN,
  "session.execution.interrupted": GREEN,
  "session.execution.started": RED,
  "session.step.started": RED,
  "permission.asked": YELLOW,
  // OpenCode asks questions as forms.
  "form.created": YELLOW,
  "form.replied": RED,
  "form.cancelled": GREEN,
};

// Subagent (child) sessions emit the same lifecycle events as their parent, so
// a finishing subagent would turn the lamp green while the parent still runs.
// Child session.* events are ignored. Their permission and form events still
// count, because a subagent's prompt waits on the user too. Tracking starts
// when the plugin loads, so a child spawned before a plugin reload is not
// filtered.
function makeEventHandler() {
  const childSessions = new Set();

  return async function handleEvent(event) {
    const type = event?.type;
    const sessionID = event?.data?.sessionID;

    if (type === "session.deleted") {
      childSessions.delete(sessionID);
      return;
    }

    // A session created with a parent is a subagent.
    if (type === "session.created" && event?.data?.parentID !== undefined) {
      childSessions.add(sessionID);
      return;
    }

    if (childSessions.has(sessionID) && type.startsWith("session.")) return;

    const light =
      type === "permission.replied"
        ? event?.data?.reply === "reject" ? GREEN : RED
        : LIGHT_FOR[type];
    if (light) await semaphore(...light);
  };
}

async function setup(ctx) {
  await semaphore("boot");

  const handleEvent = makeEventHandler();

  const controller = new AbortController();
  void (async () => {
    for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
      await handleEvent(event);
    }
  })().catch(() => {}); // The loop rejects on abort.

  return () => {
    controller.abort();
    return semaphore("off");
  };
}

export default {
  id: "semaphore.hooks",
  setup,
};
