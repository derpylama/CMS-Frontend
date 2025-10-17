const { contextBridge, ipcRenderer} = require("electron/renderer")

contextBridge.exposeInMainWorld("IPC", {
    getPreviews: (previews) => ipcRenderer.invoke("get-previews", previews),
    getPageAsHtml: (pageKey, lang) => ipcRenderer.invoke("get-page-as-html", pageKey, lang),
    createPageUsingHtml: (html, header, mainPageLang) => ipcRenderer.invoke("create-page-using-html", html, header, mainPageLang),
    replacePageUsingHtml: (pageKey, html, header, lang) => ipcRenderer.invoke("replace-page-using-html", pageKey, html, header, lang),
    getAllPagesWithHtml: (lang) => ipcRenderer.invoke("get-all-pages-with-html", lang),
    removePage: (pageKey, validate) => ipcRenderer.invoke("remove-page", pageKey, validate),
    
})