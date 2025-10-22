// MARK: Should we move out HTML->JSON JSON->HTML to frontend to utualize DOM? If so refactor to take JSON instead of HTML

const nf = require('node-fetch');
const fetch = nf.default || nf;
const escapeHtml = require('escape-html');

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

class WonkyCMSApiWrapper {
    constructor(baseUrl = "https://elias.ntigskovde.se/") {
        this.setBaseUrl(baseUrl);
    }

    setBaseUrl(baseUrl) {
        this.indexUrl = baseUrl + "index.php";
        this.fetchUrl = baseUrl + "php/getinfo.php";
        this.baseUrl = baseUrl;
        this.defaultTimeoutMs = 10000; // 10 seconds
    }

    // === REQUEST HELPERS ===

    async getText(url, timeoutMs) {
        return await fetch(url, { method: 'GET', timeout: timeoutMs || this.defaultTimeoutMs })
            .then(res => {
                if (!res.ok) {
                    throw new ApiError(`HTTP ${res.status} when GET ${url}`);
                }
                return res.text();
            })
            .catch(err => {
                throw new ApiError(`Fetch error: ${err.message}`);
            });
    }

    // If onError incase of parse error of JSON it calls that callback instead, else it throws
    async getJson(url, timeoutMs, onError = null) {
        const text = await this.getText(url, timeoutMs);
        
        try {
            return JSON.parse(text);
        } catch (e) {
            if (onError !== null) {
                return onError ? onError(text) : null;
            }
            throw new ApiError('Failed to parse JSON response');
        }
    }

    async postForm(url, formObj, timeoutMs) {
        const body = new URLSearchParams();

        for (const [k, v] of Object.entries(formObj)) {
            body.append(k, String(v));
        }

        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            timeout: timeoutMs || this.defaultTimeoutMs
        })
            .then(res => {
                if (!res.ok) {
                    throw new ApiError(`HTTP ${res.status} when POST ${url}`);
                }
                return res.text();
            })
            .catch(err => {
                throw new ApiError(`Fetch error: ${err.message}`);
            });
    }

    // === JSON FUNCTIONS ===

    // Does not return weburl but creation URL parameters as string
    JsonToUrl(jsonobj, htmlencodeContent = true, urlencodeBrackets = false, procspaces = true, lang = null) { // If urlencodeBrackets is true, [] becomes %5B%5D else it stays as [], if procspaces is true spaces become %20 else they become +
        function getCSSValue(style, prop) {
            const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`); // \s means whitespace, * means zero or more, [^;]+ means one or more characters that are not semicolon
            const match = style.match(regex);
            return match ? match[1].trim() : null;
        }

        function htmlencodeWithExtras(str, extras = []) {
            // Perform standard HTML escaping
            let encoded = escapeHtml(str);
          
            // Encode any additional characters from the extras array
            extras.forEach(ch => {
              const entity = `&#${ch.charCodeAt(0)};`;
              const pattern = new RegExp(ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              encoded = encoded.replace(pattern, entity);
            });
          
            return encoded;
        }

        function extractTexts(jsonobj, prefixToDivName, lang = "sv") {
            const headers = [];
            const divHeaders = [];
            const texts = [];
            const textDivs = [];
            const headerSizes = [];
            const textSizes = [];
            const headerColors = [];
            const textColors = [];
        
            // Create dynamic regex based on lang
            const headerRegex = new RegExp(`(textInfoRubrik\\d+_${lang})$`);
            const textRegex = new RegExp(`(textInfo\\d+_${lang})$`);
        
            for (const key in jsonobj) {
                if (headerRegex.test(key)) {
                    headers.push(jsonobj[key]);
                    const prefix = key.replace(new RegExp(`textInfoRubrik\\d+_${lang}$`), "");
                    divHeaders.push(prefixToDivName[prefix] || "div1");
                } else if (textRegex.test(key)) {
                    texts.push(jsonobj[key]);
                    const prefix = key.replace(new RegExp(`textInfo\\d+_${lang}$`), "");
                    textDivs.push(prefixToDivName[prefix] || "div1");
                }
            }
        
            // Pull style sizes/colors
            Object.keys(jsonobj).forEach((k) => {
                if (k.startsWith("StyletextInfoRubrik")) {
                    const css = jsonobj[k];
                    const fs = getCSSValue(css, "font-size");
                    const col = getCSSValue(css, "color");
                    if (fs) headerSizes.push(fs);
                    if (col) headerColors.push(col);
                } else if (k.startsWith("StyletextInfo")) {
                    const css = jsonobj[k];
                    const fs = getCSSValue(css, "font-size");
                    const col = getCSSValue(css, "color");
                    if (fs) textSizes.push(fs);
                    if (col) textColors.push(col);
                }
            });
        
            return { headers, divHeaders, texts, textDivs, headerSizes, textSizes, headerColors, textColors };
        }
        
        function buildDivMap(jsonobj) {
            const prefixes = new Set();
            for (const key in jsonobj) {
                if (key.startsWith("Stylediv")) {
                    const prefix = key.replace(/^Style/, "");
                    prefixes.add(prefix);
                }
            }
    
            // Order by depth (shorter first), then lexicographically
            const orderedPrefixes = Array.from(prefixes).sort((a, b) => {
                const depthA = (a.match(/div\d+/g) || []).length; // \d means digit, + means one or more, g means global (all occurrences)
                const depthB = (b.match(/div\d+/g) || []).length;
                if (depthA !== depthB) return depthA - depthB;
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });
    
            const prefixToDivName = {};
            const prefixToParentDivName = {};
            orderedPrefixes.forEach((prefix, idx) => {
                const divName = `div${idx + 1}`;
                prefixToDivName[prefix] = divName;
    
                // Determine parent by removing the last 'divN' segment
                const parentPrefix = prefix.replace(/div\d+$/, ""); // $ means end of string
                if (parentPrefix && prefixToDivName[parentPrefix]) {
                    prefixToParentDivName[prefix] = prefixToDivName[parentPrefix];
                } else {
                    prefixToParentDivName[prefix] = null;
                }
            });
    
            return { orderedPrefixes, prefixToDivName, prefixToParentDivName };
        }
    
        function extractImages(jsonobj, prefixToDivName) {
            const images = [];
            for (const key in jsonobj) {
                const m = key.match(/^(div[\ddiv]+)image(\d+)$/); // \d means digit, + means one or more, [] means character class, ^ means start of string, $ means end of string
                if (m) {
                    const prefix = m[1];
                    const idx = m[2];
                    const src = jsonobj[key];
                    const style = jsonobj[`Styleimage${idx}`] || '';
                    const width = getCSSValue(style, 'width');
                    const height = getCSSValue(style, 'height');
                    const borderRadius = getCSSValue(style, 'border-radius');
                    const display = getCSSValue(style, 'display');
                    images.push({
                        src,
                        div: prefixToDivName[prefix] || 'div1',
                        width,
                        height,
                        borderRadius,
                        display
                    });
                }
            }
            return images;
        }

        const brackets = urlencodeBrackets ? '%5B%5D' : '[]'; // %5B is [, %5D is ]

        const parts = [];

        // %20 is space, + is space in x-www-form-urlencoded
        const encode = (val) => {
            if (htmlencodeContent) {
                val = htmlencodeWithExtras(val, ['"', "'", "<", ">", "=", "[", "]"]);
            }
            //encodeURIComponent(String(val)).replace(/%20/g, "+");
            return procspaces ? encodeURIComponent(String(val)) : encodeURIComponent(String(val)).replace(/%20/g, "+");
        }

        const encodeColor = (val) => encodeURIComponent(String(val));

        // Base page info
        if (lang === null) {
            lang = jsonobj.mainPageLang || "sv";
        }
        const header = jsonobj.header || "";
        parts.push(`pageHeader=${encode(header)}`);
        parts.push(`pageLang=${encode(lang)}`);

        // Standard Measurements flag must always be present
        const useStd = String(jsonobj.useStandardMeasurement) === "true";
        parts.push(`useStandardMeasurement=${useStd ? "true" : "false"}`);
        if (useStd) {
            if (jsonobj.standardUnitWidth) parts.push(`standardUnitWidth=${encode(jsonobj.standardUnitWidth)}`);
            if (jsonobj.standardUnitHeight) parts.push(`standardUnitHeight=${encode(jsonobj.standardUnitHeight)}`);
            if (jsonobj.standardMeasureUnitMargin) parts.push(`standardMeasureUnitMargin=${encode(jsonobj.standardMeasureUnitMargin)}`);
            if (jsonobj.standardMeasureUnitBorder) parts.push(`standardMeasureUnitBorder=${encode(jsonobj.standardMeasureUnitBorder)}`);
            if (jsonobj.standardMeasureUnitFont) parts.push(`standardMeasureUnitFont=${encode(jsonobj.standardMeasureUnitFont)}`);
        }

        // Build div map (prefix -> divN) and parent links
        const { orderedPrefixes, prefixToDivName, prefixToParentDivName } = buildDivMap(jsonobj);

        // Divs
        for (let i = 0; i < orderedPrefixes.length; i++) {
            const prefix = orderedPrefixes[i];
            const styles = jsonobj[`Style${prefix}`] || "";

            const width = getCSSValue(styles, "width");
            const height = getCSSValue(styles, "height");
            const display = getCSSValue(styles, "display");
            const bgColor = getCSSValue(styles, "background-color");
            const bgImage = getCSSValue(styles, "background-image");
            const flow = getCSSValue(styles, "flex-flow");
            const justify = getCSSValue(styles, "justify-content");
            const align = getCSSValue(styles, "align-items");
            const border = getCSSValue(styles, "border");
            const borderRadius = getCSSValue(styles, "border-radius");
            const margin = getCSSValue(styles, "margin");
            const marginTop = getCSSValue(styles, "margin-top");
            const marginBottom = getCSSValue(styles, "margin-bottom");
            const marginLeft = getCSSValue(styles, "margin-left");
            const marginRight = getCSSValue(styles, "margin-right");
            const padding = getCSSValue(styles, "padding");
            const paddingTop = getCSSValue(styles, "padding-top");
            const paddingBottom = getCSSValue(styles, "padding-bottom");
            const paddingLeft = getCSSValue(styles, "padding-left");
            const paddingRight = getCSSValue(styles, "padding-right");

            // For the first div (root), do NOT add addDivToDiv[]
            if (i > 0) {
                const parentDivName = prefixToParentDivName[prefix];
                parts.push(`addDivToDiv${brackets}=${parentDivName}`);
            }

            if (width)         parts.push(`newDivWidth${brackets}=${encode(width)}`);
            if (height)        parts.push(`newDivHeight${brackets}=${encode(height)}`);
            if (display)       parts.push(`newDivDisplay${brackets}=${encode(display)}`);
            if (bgColor)       parts.push(`newDivColor${brackets}=${encodeColor(bgColor)}`);
            if (flow)          parts.push(`newDivFlow${brackets}=${encode(flow)}`);
            if (align)         parts.push(`newDivAlign${brackets}=${encode(align)}`);
            if (justify)       parts.push(`newDivJustify${brackets}=${encode(justify)}`);
            if (border)        parts.push(`newDivBorder${brackets}=${encode(border)}`);
            if (borderRadius)  parts.push(`newDivBorderRadius${brackets}=${encode(borderRadius)}`);
            if (margin)        parts.push(`newDivMargin${brackets}=${encode(margin)}`);
            if (marginTop)     parts.push(`newDivMarginTop${brackets}=${encode(marginTop)}`);
            if (marginBottom)  parts.push(`newDivMarginBot${brackets}=${encode(marginBottom)}`);
            if (marginLeft)    parts.push(`newDivMarginLeft${brackets}=${encode(marginLeft)}`);
            if (marginRight)   parts.push(`newDivMarginRight${brackets}=${encode(marginRight)}`);
            if (padding)       parts.push(`newDivPadding${brackets}=${encode(padding)}`);
            if (paddingTop)    parts.push(`newDivPaddingTop${brackets}=${encode(paddingTop)}`);
            if (paddingBottom) parts.push(`newDivPaddingBot${brackets}=${encode(paddingBottom)}`);
            if (paddingLeft)   parts.push(`newDivPaddingLeft${brackets}=${encode(paddingLeft)}`);
            if (paddingRight)  parts.push(`newDivPaddingRight${brackets}=${encode(paddingRight)}`);
            if (bgImage)       parts.push(`newDivGradient${brackets}=${encode(bgImage)}`);
        }

        // Text info
        const texts = extractTexts(jsonobj, prefixToDivName, lang);
        
        for (const t of texts.headers) parts.push(`addTextInformationHeader${brackets}=${encode(t)}`);
        for (const t of texts.headerSizes) parts.push(`addTextInformationHeaderSize${brackets}=${encode(t)}`);
        for (const t of texts.headerColors) parts.push(`addTextInformationHeaderColor${brackets}=${encodeColor(t)}`);
        for (const t of texts.divHeaders) parts.push(`addTextInformationDivHeader${brackets}=${t}`);

        for (const t of texts.texts) parts.push(`addTextInformation${brackets}=${encode(t)}`);
        for (const t of texts.textDivs) parts.push(`addTextInformationDiv${brackets}=${t}`);
        for (const t of texts.textSizes) parts.push(`addTextInformationSize${brackets}=${encode(t)}`);
        for (const t of texts.textColors) parts.push(`addTextInformationColor${brackets}=${encodeColor(t)}`);

        // Images (extract from JSON keys + styles)
        const images = extractImages(jsonobj, prefixToDivName);
        for (const img of images) {
            parts.push(`addImage${brackets}=${encode(img.src)}`);
            parts.push(`addImageDiv${brackets}=${img.div}`);
            if (img.display) parts.push(`addImageDisplay${brackets}=${encode(img.display)}`);
            if (img.width) parts.push(`addImageWidth${brackets}=${encode(img.width)}`);
            if (img.height) parts.push(`addImageHeight${brackets}=${encode(img.height)}`);
            if (img.borderRadius) parts.push(`addImageBorderRadius${brackets}=${encode(img.borderRadius)}`);
        }

        console.log(parts);

        return `${parts.join("&")}`;
    }


    // === Fetch / Post functions ===

    async FetchJson(pageKey) {
        // Rewrite to use http module
        return this.getJson(`${this.fetchUrl}?action=getPageInfo&pageKey=${pageKey}`)
    }

    // Takes in a creation URL (not full weburl) and POSTs it to the CMS, returns nothing
    async PostCreationUrl(url) {
        // To send a creation URL we send a POST request to baseUrl + "index.php" as x-www-form-urlencoded with the field `rawData` set to the creation URL
        await this.postForm(this.indexUrl, { "rawData": url });
    }


    // === GENERAL ACTIONS (with JSON) ===

    async FetchAllPages(filterDeleted = true) { // Returns {"<pageKey>": {"header": "<header>", ...data...}, ...}
        const text = await this.getText(this.baseUrl);
        try {
            const pages = text.split("pages =")[1];
            const pagesJson = pages.split("</script>")[0];
            const lastSemicolonIndex = pagesJson.trim();
            const jsonstr = lastSemicolonIndex.substring(0, lastSemicolonIndex.length - 1);
            const jsonobj = JSON.parse(jsonstr);

            if (filterDeleted) {
                // Remove deleted pages
                for (const key in jsonobj) {
                    //if (jsonobj[key].hasOwnProperty("deleted") && jsonobj[key].deleted === 'true') { //MARK: Should we true check or is it redundant?
                    if (jsonobj[key].hasOwnProperty("deleted")) {
                        delete jsonobj[key];
                    }
                }
            }

            return jsonobj;

        } catch (e) {
            throw new ApiError('Failed to parse pages JSON');
        }

    }

    async RemovePage(pageKey, validate = true) {
        // Ensure pageKey exists in FetchAllPages else throw
        const allPages = await this.FetchAllPages(false); // Fetch all including deleted
        if (!allPages.hasOwnProperty(pageKey)) {
            throw new PageNotFoundError();
        }
        // Check if page is already deleted
        if (allPages[pageKey].hasOwnProperty("deleted")) {
            throw new PageDeletedError("Page is already deleted");
        }

        await this.getText(`${this.baseUrl}php/deletepage.php?action=deletePage&pageKey=${pageKey}`);

        if (validate) {
            const allPages = await this.FetchAllPages(false); // Fetch all including deleted

            if (allPages.hasOwnProperty(pageKey)) {
                // If the page was deleted allPages[pageKey] would be { "deleted": 'true' }
                if (!allPages[pageKey].hasOwnProperty("deleted")) {
                    throw new ApiError("Failed to delete page, it still exists");
                }
            }
        }
    }

    // Returns null if a matching header is not found (after creating a page)
    async CreatePage(jsonobj, header = null) { // Returns new pageKey (to get new pageKey find matching header in FetchAllPages response)
        if (header === null) {
            header = jsonobj.header;
        }

        if (typeof header === 'undefined' || header === null || header.trim() === '') {
            throw new ApiError("Header is required");
        }

        // Ensure header is unique in FetchAllPages else throw
        let allPages = await this.FetchAllPages();
        for (const key in allPages) {
            if (allPages[key].header === header) {
                throw new ApiError("Header must be unique");
            }
        }

        const url = this.JsonToUrl(jsonobj);

        // POST url
        await this.PostCreationUrl(url);

        // Find new pageKey by fetching all pages and finding matching header
        allPages = await this.FetchAllPages();
        for (const key in allPages) {
            if (allPages[key].header === header) {
                return key;
            }
        }

        return null; // Not found
    }

    // Returns a new pageKey if successful, else null
    async ReplacePage(pageKey, jsonobj) {
        // Ensure pageKey exists in FetchAllPages else return null
        const allPages = await this.FetchAllPages(false); // Fetch all including deleted
        if (!allPages.hasOwnProperty(pageKey)) {
            throw new PageNotFoundError();
        }

        // Check if page is deleted
        if (allPages[pageKey].hasOwnProperty("deleted")) {
            throw new PageDeletedError("Cannot replace a deleted page");
        }

        // Delete the page
        await this.RemovePage(pageKey);

        // Create a new page with the same header and lang as the deleted page
        const header = allPages[pageKey].header;

        const newPageKey = await this.CreatePage(jsonobj, header);

        if (newPageKey === null) {
            return null; // Creation failed
        }

        return newPageKey;
    }

    async GetPage(pageKey) {
        const url = `${this.baseUrl}php/getinfo.php?action=getPageInfo&pageKey=${pageKey}`;

        return await this.getJson(url, this.defaultTimeoutMs, (text) => {
            // Does text include `<b>Warning</b>:  Undefined array key "<pageKey>"` if so throw Page not found else throw new Error('Failed to parse JSON response');
            if (text.includes("<b>Warning</b>:  Undefined array key \"" + pageKey + "\"")) {
                throw new PageNotFoundError();
            } else {
                throw new ApiError('Failed to parse JSON response');
            }
        });
    }

    async GetPreviewOfPages(previewLength = 100, previewLang = "sv") { //returns {pageKey: { header: "pageHeader", preview: "content from page that is as long as the set limit"}}

        const pages = await this.FetchAllPages();
        const pagePreviews = {};
    
        for (const [pageKey, values] of Object.entries(pages)) {
            let combinedPreview = "";
            


            // Get all matching textInfo keys
            const matchingKeys = Object.keys(values)
            .filter(key => key.includes("textInfo") && key.endsWith(`_${previewLang}`));
            
            //sort keys for consistent order
            matchingKeys.sort();
    
            for (const key of matchingKeys) {
                const content = values[key];
    
                if (combinedPreview.length < previewLength) {
                    const remaining = previewLength - combinedPreview.length;
    
                    if (content.length <= remaining) {
                        var trimmedContent = content.trim();
                        if(trimmedContent.length > 0 && trimmedContent.endsWith(".")){
                            trimmedContent = trimmedContent.replace(/[.!?]$/, ", ");
                            combinedPreview += trimmedContent;
                        }

                    } else {
                        combinedPreview += content.slice(0, remaining) + "...";
                        break; // Stop once limit is reached
                    }
                } else {
                    break;
                }
            }
    
            // 3. Add preview to result, even if it's empty
            pagePreviews[pageKey] = {
                header: values["header"] || pageKey.charAt(0).toUpperCase() + pageKey.slice(1),
                preview: combinedPreview.length !== 0 ? combinedPreview : (previewLang === "en" ? "Empty content" : "Inget innehåll")
            };
        }

        return pagePreviews;
    }
}

module.exports = { WonkyCMSApiWrapper };