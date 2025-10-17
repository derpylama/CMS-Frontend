const { app, BrowserWindow, ipcMain } = require('electron');
const {  WonkyCMSApiWrapper } = require('./api.js');
const { ConfigManager } = require('./config.js');
const path = require("node:path");

const config = new ConfigManager(false);

const api = new WonkyCMSApiWrapper(config.get("api"));

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    win.loadFile('app/index.html');
}


ipcMain.handle("get-previews", async (event) => {
    return await api.GetPreviewOfPages();
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


app.whenReady().then(() => {
    createWindow();
})
