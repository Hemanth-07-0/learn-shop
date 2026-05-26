const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const processes = [
  {
    name: "backend",
    cwd: path.join(rootDir, "backend"),
    args: ["run", "start"],
  },
  {
    name: "frontend",
    cwd: path.join(rootDir, "frontend"),
    args: ["run", "dev"],
  },
];

let shuttingDown = false;
const children = processes.map(startProcess);

function startProcess(config) {
  const child = spawnCommand(config.args, config.cwd);

  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shuttingDown = true;
      console.error(`[${config.name}] exited with code ${code}`);
      stopChildren(child.pid);
      process.exit(code || 1);
    }
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.error(`[${config.name}] failed to start: ${error.message}`);
    stopChildren(child.pid);
    process.exit(1);
  });

  return child;
}

function spawnCommand(args, cwd) {
  if (isWindows) {
    return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm.cmd ${args.join(" ")}`], {
      cwd,
      stdio: "inherit",
      windowsHide: false,
    });
  }

  return spawn("npm", args, {
    cwd,
    stdio: "inherit",
  });
}

function stopChildren(exceptPid) {
  for (const child of children) {
    if (!child.pid || child.pid === exceptPid) {
      continue;
    }

    stopChild(child.pid);
  }
}

function stopChild(pid) {
  if (isWindows) {
    spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `taskkill /pid ${pid} /t /f`], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopChildren();
  process.exit(signal === "SIGINT" ? 130 : 0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
