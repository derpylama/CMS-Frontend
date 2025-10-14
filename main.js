const { app, BrowserWindow } = require('electron')
const ApiHandler = require("./apihandler")

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  var api = new ApiHandler
  api.GetPage(1)
})