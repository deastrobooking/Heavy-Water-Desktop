const { spawn } = require("node:child_process");
const electronPath = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [".", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("[run-electron] Failed to start Electron:", err);
  process.exit(1);
});
