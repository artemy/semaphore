#!/usr/bin/env node
// Requires: npm i node-hid
//
// Usage:
//   node ./semaphore.js [--soft|-s] <led> off
//   node ./semaphore.js [--soft|-s] <led> on
//   node ./semaphore.js [--soft|-s] <led> blink [half_period_ms]
//   node ./semaphore.js [--soft|-s] solo <color> on
//   node ./semaphore.js [--soft|-s] solo <color> blink [half_period_ms]
//   node ./semaphore.js [--soft|-s] status
//   node ./semaphore.js [--soft|-s] boot
//
//   <led>:   red | yellow | green | all
//   <color>: red | yellow | green       (solo turns off the other two)
//   blink half-period: 20..10000 ms (default 500)
//   --soft, -s: silently exit 0 on device-connectivity errors (for hooks).

const HID = require("node-hid");

const VID = 0x1209;
const PID = 0x0001;

const LEDS = { green: 0, yellow: 1, red: 2, all: 0xff };
const LED_NAMES = ["green", "yellow", "red"];
const MODE_NAMES = ["off", "on", "blink"];

const CMD_SET = 0x01;
const CMD_GET = 0x03;
const CMD_BOOT_ANIM = 0x04;

const MODE_OFF = 0x00;
const MODE_ON = 0x01;
const MODE_BLINK = 0x02;

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(
    [
      "usage:",
      "  semaphore.js <led> off",
      "  semaphore.js <led> on",
      "  semaphore.js <led> blink [half_period_ms]",
      "  semaphore.js solo <color> on",
      "  semaphore.js solo <color> blink [half_period_ms]",
      "  semaphore.js status",
      "  semaphore.js boot",
      "",
      "  <led>:   red | yellow | green | all",
      "  <color>: red | yellow | green   (solo turns off the other two)",
      "  blink half-period: 20..10000 ms (default 500)",
      "  --soft, -s: silently exit 0 on device-connectivity errors (for hooks)",
    ].join("\n"),
  );
  process.exit(2);
}

function parseAction(action, periodArg, idx) {
  if (action === "off") return { cmd: CMD_SET, idx, mode: MODE_OFF, period: 0 };
  if (action === "on") return { cmd: CMD_SET, idx, mode: MODE_ON, period: 0 };
  if (action === "blink") {
    const period = periodArg === undefined ? 500 : Number.parseInt(periodArg, 10);
    if (!Number.isFinite(period) || period < 20 || period > 10000) {
      usage("blink half-period must be an integer in 20..10000");
    }
    return { cmd: CMD_SET, idx, mode: MODE_BLINK, period };
  }
  usage(`unknown action "${action}"`);
}

function parseArgs(argv) {
  if (argv.length === 0) usage();

  if (argv[0] === "status") return [{ cmd: CMD_GET, idx: 0, mode: 0, period: 0 }];
  if (argv[0] === "boot") return [{ cmd: CMD_BOOT_ANIM, idx: 0, mode: 0, period: 0 }];

  if (argv[0] === "solo") {
    const color = argv[1];
    if (!(color in LEDS) || color === "all") usage(`solo needs a color (red|yellow|green), got "${color}"`);
    const idx = LEDS[color];
    const action = argv[2];
    if (action !== "on" && action !== "blink") usage(`solo only supports on|blink, got "${action}"`);
    // First clear all, then set the chosen one.
    return [
      { cmd: CMD_SET, idx: LEDS.all, mode: MODE_OFF, period: 0 },
      parseAction(action, argv[3], idx),
    ];
  }

  const ledName = argv[0];
  if (!(ledName in LEDS)) usage(`unknown LED "${ledName}"`);
  return [parseAction(argv[1], argv[2], LEDS[ledName])];
}

function openDevice() {
  const match = HID.devices().find(
    (d) => d.vendorId === VID && d.productId === PID,
  );
  if (!match) {
    const err = new Error(
      `device not connected (VID 0x${VID.toString(16)} PID 0x${PID.toString(16)})`,
    );
    err.code = "ENODEVICE";
    throw err;
  }
  return new HID.HID(match.path);
}

function buildReport({ cmd, idx, mode, period }) {
  // Leading 0 = report ID (descriptor uses none, so OS expects 0 prefix).
  return [
    0x00,
    cmd, idx, mode, period & 0xff, (period >> 8) & 0xff, 0x00, 0x00, 0x00,
  ];
}

function printState(buf) {
  const status = buf[0];
  console.log(`status: ${status === 0 ? "OK" : `BAD (0x${status.toString(16)})`}`);
  for (let i = 0; i < 3; i++) {
    const o = 1 + i * 3;
    const m = buf[o];
    const p = buf[o + 1] | (buf[o + 2] << 8);
    const name = MODE_NAMES[m] ?? `?0x${m.toString(16)}`;
    const suffix = m === MODE_BLINK ? ` (${p} ms half-period)` : "";
    console.log(`  ${LED_NAMES[i]}: ${name}${suffix}`);
  }
}

function sendOne(device, parsed) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("no response from device within 1s")), 1000);
    const onData = (buf) => {
      clearTimeout(timeout);
      device.removeListener("data", onData);
      resolve(buf);
    };
    device.on("data", onData);
    try {
      device.write(buildReport(parsed));
    } catch (e) {
      clearTimeout(timeout);
      device.removeListener("data", onData);
      reject(e);
    }
  });
}

async function main() {
  const argv = process.argv.slice(2);
  let soft = false;
  for (let i = argv.length - 1; i >= 0; i--) {
    if (argv[i] === "--soft" || argv[i] === "-s") {
      soft = true;
      argv.splice(i, 1);
    }
  }

  const commands = parseArgs(argv);

  let device;
  try {
    device = openDevice();
  } catch (e) {
    if (soft) return;
    console.error(`error: ${e.message}`);
    process.exit(1);
  }

  device.on("error", (e) => {
    try { device.close(); } catch {}
    if (soft) process.exit(0);
    console.error(`error: ${e.message ?? e}`);
    process.exit(1);
  });

  try {
    let last;
    for (const cmd of commands) last = await sendOne(device, cmd);
    if (!soft) printState(last);
  } catch (e) {
    if (!soft) {
      console.error(`error: ${e.message ?? e}`);
      process.exitCode = 1;
    }
  } finally {
    try { device.close(); } catch {}
  }
}

main();
