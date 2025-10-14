const { app, BrowserWindow } = require('electron')
const ApiHandler = require("../app/js/apihandler")
const https = require("https")
const fs = require("fs")

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600
    });

    win.loadFile('app/index.html');
}

app.whenReady().then(() => {

    https.get("https://elias.ntigskovde.se", (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });
      
        res.on('end', () => {
          try {
            var pages = data.split("pages =")[1]
            var pagesJson = pages.split("</script>")[0]
            var lastSemicolonIndex = pagesJson.trim()
            var json = lastSemicolonIndex.substring(0, lastSemicolonIndex.length -1)


          } catch (e) {
            console.error('JSON parse error:', e);
          }
        });
      }).on('error', (err) => {
        console.error('Request error:', err);
    })

    createWindow()
})
