class ApiError extends Error {
    constructor(message = "API Error") {
        super(message); // call the parent constructor
        this.name = this.constructor.name; // set the error name
        Error.captureStackTrace?.(this, this.constructor); // optional, for cleaner stack traces
    }
}

class PageNotFoundError extends ApiError {
    constructor(message = "Page not found") {
        super(message); // call the parent constructor
        this.name = this.constructor.name; // set the error name
        Error.captureStackTrace?.(this, this.constructor); // optional, for cleaner stack traces
    }
}

class PageDeletedError extends ApiError {
    constructor(message = "Page is deleted") {
        super(message); // call the parent constructor
        this.name = this.constructor.name; // set the error name
        Error.captureStackTrace?.(this, this.constructor); // optional, for cleaner stack traces
    }
} 

class WonkyCMSApiHandlerFrontend {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;

    }

    async GetPageAsHtml(pageKey, lang = "sv") { 
        var pageHtml = await window.IPC.getPageAsHtml(pageKey, lang);
        
        return pageHtml;
    }

    async CreatePageUsingHtml(html, header, mainPageLang = "sv", escapeUnhandled = false, useStandardMeasurement = false) {
        var createdPage = await window.IPC.createPageUsingHtml(html, header, mainPageLang);
        return createdPage;
    }

    async ReplacePageUsingHtml(pageKey, html, header = null, lang = null, escapeUnhandled = false) {
        var replacedPage = await window.IPC.replacePageUsingHtml(pageKey, html, header, lang);
        return replacedPage;
    }

    async GetAllPagesWithHtml(lang = "sv") { // Returns {"<pageKey>": {"header": "<header>", "html": "<html>"}}
        var allPages = await window.IPC.getAllPagesWithHtml(lang);
        return allPages;
    }

    async removePage(pageKey, validate = true){
        await window.IPC.removePage(pageKey, validate);
    }

    async getPreviewPages(){
        var preview = await window.IPC.getPreviews();
        return preview;
    }
}