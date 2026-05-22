const { app, BrowserWindow, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "heavy-water";
const APP_HOST = "game";
const DIST_DIR = path.join(__dirname, "..", "dist", "public");
const INDEX_HTML = path.join(DIST_DIR, "index.html");
const SMOKE_TEST = process.argv.includes("--smoke-test");

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function offlineApiResponse() {
  return new Response(JSON.stringify({ message: "Desktop build uses offline local saves." }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

function resolveDistPath(requestUrl) {
  const url = new URL(requestUrl);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  const requested = path.normalize(path.join(DIST_DIR, pathname));
  const relative = path.relative(DIST_DIR, requested);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return INDEX_HTML;
  }

  if (!fs.existsSync(requested) || fs.statSync(requested).isDirectory()) {
    return INDEX_HTML;
  }

  return requested;
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.host !== APP_HOST) {
      return offlineApiResponse();
    }

    if (url.pathname.startsWith("/api/") || url.pathname === "/ws") {
      return offlineApiResponse();
    }

    return net.fetch(pathToFileURL(resolveDistPath(request.url)).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    fullscreenable: true,
    show: !SMOKE_TEST,
    title: "Heavy Water",
    icon: path.join(__dirname, "..", "generated-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (SMOKE_TEST) {
    const timeout = setTimeout(() => {
      console.error("[desktop:smoke] Timed out waiting for the app to load.");
      app.exit(1);
    }, 15_000);

    win.webContents.once("did-fail-load", (_event, code, description) => {
      clearTimeout(timeout);
      console.error(`[desktop:smoke] Load failed (${code}): ${description}`);
      app.exit(1);
    });

    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        win.webContents.executeJavaScript(`
          Boolean(window.heavyWaterDesktop?.isDesktop)
            && Boolean(document.getElementById("root")?.childElementCount)
        `).then((ok) => {
          clearTimeout(timeout);
          if (!ok) {
            console.error("[desktop:smoke] Desktop bridge or React root did not initialize.");
            app.exit(1);
            return;
          }
          console.log("[desktop:smoke] Electron shell loaded successfully.");
          app.exit(0);
        }).catch((err) => {
          clearTimeout(timeout);
          console.error("[desktop:smoke] Smoke assertion failed:", err);
          app.exit(1);
        });
      }, 1_000);
    });
  }

  win.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });
}

app.setName("Heavy Water");
app.setAppUserModelId("com.heavywater.game");

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
