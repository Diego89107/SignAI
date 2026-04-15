const { app, BrowserWindow } = require("electron");
const path = require("path");

function getWindowsIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico");
  }
  return path.join(__dirname, "../build/SignAI.ico");
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: getWindowsIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
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

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
