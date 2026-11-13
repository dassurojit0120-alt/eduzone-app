"use strict";

const { app, BrowserWindow, Menu, session, shell, dialog } = require("electron");
const path = require("path");
const { startServer } = require("./server");

const PORT = 47831;
let win = null;

function isWeb(url) { return /^(https?:|mailto:)/i.test(url); }

async function start() {
  app.setAppUserModelId("com.surojit.eduzone");
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler(function (wc, perm, cb) { cb(false); });

  let origin;
  try {
    const port = await startServer(path.join(__dirname, "app"), PORT);
    origin = "http://127.0.0.1:" + port;
  } catch (e) {
    dialog.showErrorBox("EduZone", "Could not start the app. Please restart your computer and try again.");
    app.quit();
    return;
  }

  win = new BrowserWindow({
    width: 480,
    height: 840,
    minWidth: 360,
    minHeight: 520,
    title: "EduZone",
    backgroundColor: "#f5f6fa",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });

  win.webContents.setVisualZoomLevelLimits(1, 1);

  // Links to Drive, WhatsApp, Instagram, mail open in the normal browser
  win.webContents.setWindowOpenHandler(function (d) {
    if (isWeb(d.url)) shell.openExternal(d.url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", function (e, url) {
    if (url.indexOf(origin) !== 0) {
      e.preventDefault();
      if (isWeb(url)) shell.openExternal(url);
    }
  });

  win.on("closed", function () { win = null; });
  win.loadURL(origin + "/index.html");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", function () {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(start);
  app.on("window-all-closed", function () { app.quit(); });
}
