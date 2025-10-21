const { app, BrowserWindow, ipcMain } = require('electron');
const {  WonkyCMSApiWrapper } = require('./api.js');
const { ConfigManager } = require('./config.js');
const path = require("node:path");
const { dialog } = require('electron');

const config = new ConfigManager(false);

const api = new WonkyCMSApiWrapper(config.get("api"));

let win;

function getPreferedThemeFromConfig() {
    if (config.has("theme")) {
        const theme = config.get("theme");
        if (theme === "light" || theme === "dark") {
            return theme;
        }

        return "system";
    } else {
        return "system";
    }
}

function createWindow () {
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    win.loadFile('app/index.html');
}

ipcMain.handle("get-prefered-theme", async (event) => {
    return getPreferedThemeFromConfig();
});


ipcMain.handle("get-preview-of-pages", async (event, previewLength, previewLang) => {
    return await api.GetPreviewOfPages(previewLength, previewLang);
});

ipcMain.handle("remove-page", async (event, pageKey, validate) => {
    return await api.RemovePage(pageKey, validate);
});

ipcMain.handle("get-page", async (event, pageKey) => {
    return await api.GetPage(pageKey);
});

ipcMain.handle("create-page", async (event, jsonobj) => {
    return await api.CreatePage(jsonobj);
});

ipcMain.handle("fetch-all-pages", async (event, filterDeleted) => {
    return await api.FetchAllPages(filterDeleted);
});

ipcMain.handle("set-base-url", async (event, baseUrl) => {
    return await api.setBaseUrl(baseUrl);
});

ipcMain.handle('show-choice', async (event, { title, message, buttons, defaultId, cancelId }) => {
    const result = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: buttons,
        defaultId: defaultId,
        cancelId: cancelId,
        title,
        message,
    });
  
    return result.response;
});

ipcMain.on('ford-focus-app', () => {
    if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    }
});

ipcMain.on('set-window-title', (event, title) => {
    if (win) {
        win.setTitle(title);
    }
});

app.whenReady().then(() => {
    createWindow();
})
