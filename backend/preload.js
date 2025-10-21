const { contextBridge, ipcRenderer} = require("electron/renderer")


contextBridge.exposeInMainWorld("IPC", {
    getPreviewOfPages: (previewLength, previewLang) => ipcRenderer.invoke("get-preview-of-pages", previewLength, previewLang),
    removePage: (pageKey, validate) => ipcRenderer.invoke("remove-page", pageKey, validate),
    getPage: (pageKey) => ipcRenderer.invoke("get-page", pageKey),
    createPage: (jsonobj) => ipcRenderer.invoke("create-page", jsonobj),
    fetchAllPages: (filterDeleted) => ipcRenderer.invoke("fetch-all-pages", filterDeleted),
    setBaseUrl: (baseUrl) => ipcRenderer.invoke("base-url", baseUrl),
    showChoice: ({ title, message, buttons, defaultId, cancelId }) => ipcRenderer.invoke('show-choice', { title, message, buttons, defaultId, cancelId }),
    focusApp: () => ipcRenderer.send('ford-focus-app'),
    getPreferedTheme: () => ipcRenderer.invoke("get-prefered-theme"),
    setWindowTitle: (title) => ipcRenderer.send('set-window-title', title),
});