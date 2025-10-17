const { contextBridge, ipcRenderer} = require("electron/renderer")


contextBridge.exposeInMainWorld("IPC", {
    getPreviews: (previews) => ipcRenderer.invoke("get-previews", previews),
    removePage: (pageKey, validate) => ipcRenderer.invoke("remove-page", pageKey, validate),
    getPage: (pageKey) => ipcRenderer.invoke("get-page", pageKey),
    createPage: (jsonobj) => ipcRenderer.invoke("create-page", jsonobj),
    fetchAllPages: (filterDeleted) => ipcRenderer("fetch-all-pages", filterDeleted),
    setBaseUrl: (baseUrl) => ipcRenderer("base-url", baseUrl),
});