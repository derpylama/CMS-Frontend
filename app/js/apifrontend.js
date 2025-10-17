class WonkyCMSApiHandlerFrontend {
    constructor(baseUrl) {
        super(baseUrl);
    }

    async GetPageAsHtml(pageKey, lang = "sv") {
    }

    async CreatePageUsingHtml(html, header, mainPageLang = "sv", escapeUnhandled = false, useStandardMeasurement = false) {
    }

    async ReplacePageUsingHtml(pageKey, html, header = null, lang = null, escapeUnhandled = false) {
    }

    async GetAllPagesWithHtml(lang = "sv") { // Returns {"<pageKey>": {"header": "<header>", "html": "<html>"}}
    }
}