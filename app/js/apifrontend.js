
class WonkyCMSApiHandlerFrontend {
    constructor(baseUrl) {
        super(baseUrl);

        this.GetAllPagesWithHtml();
    }

    async GetPageAsHtml(pageKey, lang = "sv") {
        var preview = await window.IPC.getPreviews();
        console.log(preview);

    }

    async CreatePageUsingHtml(html, header, mainPageLang = "sv", escapeUnhandled = false, useStandardMeasurement = false) {
    }

    async ReplacePageUsingHtml(pageKey, html, header = null, lang = null, escapeUnhandled = false) {
    }

    async GetAllPagesWithHtml(lang = "sv") { // Returns {"<pageKey>": {"header": "<header>", "html": "<html>"}}
    }
}