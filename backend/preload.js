const { contextBridge, ipcRenderer} = require("electron/renderer")

contextBridge.exposeInMainWorld("IPC", {
    getPreviews: (previews) => ipcRenderer.invoke("get-previews", previews)
})