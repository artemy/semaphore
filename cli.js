#!/usr/bin/env node
// Requires: npm i node-hid
//
// Usage:
//   node ./cli.js [--soft|-s] <color> on
//   node ./cli.js [--soft|-s] <color> blink [half_period_ms]
//   node ./cli.js [--soft|-s] off
//   node ./cli.js [--soft|-s] status
//   node ./cli.js [--soft|-s] boot
//
//   <color>: red | yellow | green   (the lamp shows one at a time)
//   blink half-period: 20..5000 ms (default 500)
//   --soft, -s: silently exit 0 on device-connectivity errors (for hooks).

const HID = require("node-hid");

const VID = 0x1209;
const PID = 0x0001;

const COLORS = { green: 0, yellow: 1, red: 2 };
const COLOR_NAMES = ["green", "yellow", "red"];

const CMD_SET = 0x01;
const CMD_GET = 0x02;
const CMD_BOOT_ANIM = 0x03;

const MODE_OFF = 0x00;
const MODE_STEADY = 0x01;
const MODE_BLINK = 0x02;

const STATUS_OK = 0x00;
const STATUS_NAMES = { 0x00: "OK", 0x01: "BAD" };

const MIN_BLINK_MS = 20;
const MAX_BLINK_MS = 5000;
const DEFAULT_BLINK_MS = 500;

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(
    [
      "usage:",
      "  semaphore <color> on",
      "  semaphore <color> blink [half_period_ms]",
      "  semaphore off",
      "  semaphore status",
      "  semaphore boot",
      "",
      "  <color>: red | yellow | green   (the lamp shows one at a time)",
      `  blink half-period: ${MIN_BLINK_MS}..${MAX_BLINK_MS} ms (default ${DEFAULT_BLINK_MS})`,
      "  --soft, -s: silently exit 0 on device-connectivity errors (for hooks)",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv) {
  if (argv.length === 0) usage();

  const [head, ...rest] = argv;

  if (head === "status" || head === "boot") {
    if (rest.length > 0) usage(`${head} takes no arguments, got "${rest[0]}"`);
    const cmd = head === "status" ? CMD_GET : CMD_BOOT_ANIM;
    return { cmd, mode: MODE_OFF, color: 0, period: 0 };
  }

  if (head === "off") {
    if (rest.length > 0) usage(`off takes no arguments, got "${rest[0]}"`);
    return { cmd: CMD_SET, mode: MODE_OFF, color: 0, period: 0 };
  }

  if (!Object.hasOwn(COLORS, head)) usage(`unknown color "${head}"`);
  const color = COLORS[head];
  const [action, periodArg, ...extra] = rest;

  if (action === undefined) usage(`missing action for "${head}" (expected on|blink)`);

  if (action === "on") {
    if (extra.length > 0) usage(`too many arguments for "${head} on"`);
    if (periodArg !== undefined) usage(`"${head} on" takes no period`);
    return { cmd: CMD_SET, mode: MODE_STEADY, color, period: 0 };
  }

  if (action === "blink") {
    if (extra.length > 0) usage(`too many arguments for "${head} blink"`);
    const period = periodArg === undefined ? DEFAULT_BLINK_MS : Number(periodArg);
    if (!Number.isInteger(period) || period < MIN_BLINK_MS || period > MAX_BLINK_MS) {
      usage(`blink half-period must be an integer in ${MIN_BLINK_MS}..${MAX_BLINK_MS}`);
    }
    return { cmd: CMD_SET, mode: MODE_BLINK, color, period };
  }
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

function buildReport({ cmd, mode, color, period }) {
  return [
    0x00,
    cmd, mode, color, period & 0xff, (period >> 8) & 0xff, 0x00, 0x00, 0x00,
  ];
}

function printState(buf) {
  if (!buf || buf.length < 5) {
    throw new Error(`malformed reply from device (${buf ? buf.length : 0} bytes)`);
  }
  const status = buf[0];
  const statusName = STATUS_NAMES[status] ?? "UNKNOWN";
  console.log(
    `status: ${status === STATUS_OK ? "OK" : `${statusName} (0x${status.toString(16)})`}`,
  );

  const mode = buf[1];
  const color = COLOR_NAMES[buf[2]] ?? `?${buf[2]}`;
  const period = buf[3] | (buf[4] << 8);
  switch (mode) {
    case MODE_OFF:
      console.log("  lamp: off");
      break;
    case MODE_STEADY:
      console.log(`  lamp: ${color} on`);
      break;
    case MODE_BLINK:
      console.log(`  lamp: ${color} blink (${period} ms half-period)`);
      break;
    default:
      console.log(`  lamp: ?mode 0x${mode.toString(16)}`);
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

  const command = parseArgs(argv);

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
    const reply = await sendOne(device, command);
    if (!soft) {
      printState(reply);
      if (reply[0] !== STATUS_OK) process.exitCode = 1;
    }
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
