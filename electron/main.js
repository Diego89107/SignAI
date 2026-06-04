const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let serverProc = null;

function getWindowsIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico");
  }
  return path.join(__dirname, "../build/SignAI.ico");
}

// Lanza el servidor local de inferencia (Python).
//  - En desarrollo: ejecuta "SignAI Server.py" con el lanzador `py`.
//  - Empaquetado: ejecuta el .exe generado con PyInstaller en resources/.
function startInferenceServer() {
  try {
    if (app.isPackaged) {
      const exe = path.join(process.resourcesPath, "signai-server", "signai-server.exe");
      serverProc = spawn(exe, [], { windowsHide: true });
    } else {
      const script = path.join(__dirname, "../Avances/Modelo Transformer/SignAI Server.py");
      serverProc = spawn("py", [script], {
        cwd: path.join(__dirname, "../Avances/Modelo Transformer"),
        windowsHide: true,
      });
    }

    serverProc.stdout?.on("data", (d) => console.log(`[server] ${d}`.trim()));
    serverProc.stderr?.on("data", (d) => console.log(`[server] ${d}`.trim()));
    serverProc.on("error", (err) => console.error("[server] no se pudo iniciar:", err));
    serverProc.on("exit", (code) => {
      console.log(`[server] terminó (code=${code})`);
      serverProc = null;
    });
  } catch (err) {
    console.error("[server] error al lanzar:", err);
  }
}

function stopInferenceServer() {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {}
    serverProc = null;
  }
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: getWindowsIconPath(),
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.signai.app");
  }

  startInferenceServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopInferenceServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopInferenceServer);
