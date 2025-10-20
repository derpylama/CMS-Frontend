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

class WonkyCMSApiWrapperFrontend {
    constructor() {}

    async GetPage(pageKey) {
        return await window.IPC.getPage(pageKey);
    }

    async CreatePage(jsonobj) {
        return await window.IPC.createPage(jsonobj);
    }

    async FetchAllPages(filterDeleted = true){
        return await window.IPC.fetchAllPages(filterDeleted)
    }

    async RemovePage(pageKey, validate = true) {
        await window.IPC.removePage(pageKey, validate);
    }

    async GetPreviewOfPages() {
        return await window.IPC.getPreviews();
    }
}



// Inheritance class WonkyCMSApiHandler which has some other helper methods added
class WonkyCMSApiHandlerFrontend extends WonkyCMSApiWrapperFrontend {
    constructor() {super()}

    // === HTML/JSON FUNCTIONS ===

    JsonToHtml(json, lang = "sv") { // Takes {"pageKey": "header", ...data...} and returns HTML string (no DOM)
        function addDiv(page, divPrefix, pageNumber, lang = "sv", indentLevel = 0) {
            let html = '';
            const indent = '  '.repeat(indentLevel); // Indentation for readability in nested divs
        
            // Get and clean style for this div
            let blockStyle = page['Style' + divPrefix] || '';
            
            blockStyle = blockStyle.replace(/\b[\w-]+:\s*;/g, '').trim(); // Remove any empty CSS properties like "color:;" from the style string  /  Remove empty/invalid CSS properties
            // \b means word boundary, [\w-]+ means one or more word characters or hyphens, :\s*; means a colon followed by optional whitespace and a semicolon, /g means global (all occurrences)
        
            // Only add style attribute if it’s not empty
            const divStyleAttr = blockStyle ? ` style="${blockStyle}"` : '';
            html += `${indent}<div${divStyleAttr}>\n`; // Start div tag with styles if present
        
            // Add text and images
            for (const key in page) {
                // H3 tag (header)
                if (key.startsWith(divPrefix + 'textInfoRubrik') && key.endsWith('_' + lang)) {
                    // Compute the corresponding style key for this header
                    const styleKey = 'Style' + key.replace(divPrefix, '').replace('_' + lang, '');
                    let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim(); // \b means word boundary, [\w-]+ means one or more word characters or hyphens, :\s*; means a colon followed by optional whitespace and a semicolon, /g means global (all occurrences)
                    
                    const styleAttr = style ? ` style="${style}"` : '';
                    html += `${indent}  <h3${styleAttr}>${page[key]}</h3>\n`; // Add h3 element
                }

                // Paragraph
                else if (key.startsWith(divPrefix + 'textInfo') && key.endsWith('_' + lang) && !key.includes('Rubrik')) {
                    // Compute corresponding style key for paragraph
                    const styleKey = 'Style' + key.replace(divPrefix, '').replace('_' + lang, '');
                    let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim(); // \b means word boundary, [\w-]+ means one or more word characters or hyphens, :\s*; means a colon followed by optional whitespace and a semicolon, /g means global (all occurrences)
                    
                    const styleAttr = style ? ` style="${style}"` : '';
                    html += `${indent}  <p${styleAttr}>${page[key]}</p>\n`; // Add paragraph element
                }

                // Image
                else if (key.startsWith(divPrefix + 'image')) {
                    // Compute corresponding style key for image
                    const styleKey = 'Style' + key.replace(divPrefix, '');
                    let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim(); // \b means word boundary, [\w-]+ means one or more word characters or hyphens, :\s*; means a colon followed by optional whitespace and a semicolon, /g means global (all occurrences)
                    
                    const styleAttr = style ? ` style="${style}"` : '';
                    html += `${indent}  <img${styleAttr} src="${page[key]}" alt="Image">\n`; // Add img element
                }
            }
        
            // Detect nested divs within this div
            const nestedDivPrefixes = new Set();
            for (const key in page) {
                // Match keys that represent nested divs, e.g., div1div1, div1div2, etc.
                const match = key.match(new RegExp('^(' + divPrefix + 'div\\d+)')); // ^ means start of string, ( means start capture group,  divPrefix is the current div prefix, div\\d+ means "div" followed by one or more digits, ) means end capture group
                
                if (match) nestedDivPrefixes.add(match[1]);
            }
        
            // Recursively process each nested div
            nestedDivPrefixes.forEach(nestedDivPrefix => {
                html += addDiv(page, nestedDivPrefix, pageNumber, lang, indentLevel + 1);
            });
        
            html += `${indent}</div>\n`; // Close current div
            return html; // Return HTML string for this div and its children
        }

        // divPrefix is where in the wonky-hierarchy we start building (div1 is root body)
        // pageNumber is actually generated by the CMS, we just use it because it had to be applied
        return addDiv(json, 'div1', 'page1', lang);
    }

    // MARK: The only allowed html we currently know is: <div>, <h3>, <p>, <img>
    // MARK: escapeUnhandled is not implemented
    HtmlToJson(html, header, mainPageLang = "sv", escapeUnhandled = false, useStandardMeasurement = false) { // Takes HTML and returns {"header": "<header>", ...data...} (no DOM)

        const nestedDivCounters = new Map(); // per-prefix counters

        function nextNestedIndex(prefix) {
            const current = nestedDivCounters.get(prefix) || 0;
            const next = current + 1;
            nestedDivCounters.set(prefix, next);
            return next;
        }

        function extractAttr(attrs, name) {
            const m = new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i').exec(attrs) ||
                      new RegExp(name + "\\s*=\\s*'([^']*)'", 'i').exec(attrs); // \s means whitespace, * means zero or more, [^"]* means zero or more characters that are not double quotes, [^']* means zero or more characters that are not single quotes
            return m ? m[1] : '';
        }

        // Ensure header is defined else throw
        if (typeof header === 'undefined' || header === null || header.trim() === '') {
            throw new ApiError("Header is required");
        }

        // Generate JSON from HTML
        const result = {};
        result.useStandardMeasurement = (useStandardMeasurement === true || String(useStandardMeasurement).toLowerCase() === "true") ? "true" : "false"; 
        result.mainPageLang = mainPageLang;
        result.header = header;

        let headerCount = 0;
        let paragraphCount = 0;
        let imageCount = 0;

        const stack = [];
        let firstDivSeen = false;

        const tagRegex = /<(\/)?(div|h3|p|img)([^>]*)>/gi; // < means start of tag, (\/)? means optional / for closing tags, (div|h3|p|img) means tag name (div, h3, p, or img), ([^>]*) means zero or more characters that are not > (attributes), > means end of tag, /gi means global and case-insensitive
        
        let lastIndex = 0;
        let match;

        while ((match = tagRegex.exec(html)) !== null) {
            const [full, closingSlash, tag, attrs] = match;
            const isClosing = Boolean(closingSlash);
            const lowerTag = tag.toLowerCase();

            if (!isClosing) {
                if (lowerTag === 'div') {
                    let prefix;
                    
                    if (!firstDivSeen) {
                        firstDivSeen = true;
                        prefix = 'div1';
                        stack.push(prefix);
                    } else {
                        const parent = stack[stack.length - 1] || 'div1';
                        const n = nextNestedIndex(parent);
                        prefix = parent + 'div' + n;
                        stack.push(prefix);
                    }

                    const style = extractAttr(attrs, 'style');
                    result['Style' + prefix] = (style || '').trim();

                } else if (lowerTag === 'h3') {
                    headerCount += 1;
                    const prefix = stack[stack.length - 1] || 'div1';
                    const style = extractAttr(attrs, 'style');
                    const endTag = new RegExp(`</${tag}\\s*>`, 'i'); // \s* means zero or more whitespace characters, </${tag} means the closing tag, > means end of tag, /i means case-insensitive
                    const endMatch = endTag.exec(html.substring(tagRegex.lastIndex));

                    let innerText = '';
                    if (endMatch) {
                        const start = tagRegex.lastIndex;
                        const end = start + endMatch.index;
                        innerText = html.substring(start, end).replace(/<[^>]*>/g, '').trim(); // <[^>]*> means any tag, g means global (all occurrences)
                        // move regex index to after closing tag
                        tagRegex.lastIndex = end + endMatch[0].length;
                    }

                    const key = prefix + 'textInfoRubrik' + headerCount + '_' + mainPageLang;
                    const styleKey = 'StyletextInfoRubrik' + headerCount;
                    result[key] = innerText;
                    result[styleKey] = (style || '').trim();

                } else if (lowerTag === 'p') {
                    paragraphCount += 1;
                    const prefix = stack[stack.length - 1] || 'div1';
                    const style = extractAttr(attrs, 'style');
                    const endTag = new RegExp(`</${tag}\\s*>`, 'i'); // \s* means zero or more whitespace characters, </${tag} means the closing tag, > means end of tag, /i means case-insensitive
                    const endMatch = endTag.exec(html.substring(tagRegex.lastIndex));

                    let innerText = '';
                    if (endMatch) {
                        const start = tagRegex.lastIndex;
                        const end = start + endMatch.index;
                        innerText = html.substring(start, end).replace(/<[^>]*>/g, '').trim(); // <[^>]*> means any tag, g means global (all occurrences)
                        // move regex index to after closing tag
                        tagRegex.lastIndex = end + endMatch[0].length;
                    }

                    const key = prefix + 'textInfo' + paragraphCount + '_' + mainPageLang;
                    const styleKey = 'StyletextInfo' + paragraphCount;
                    result[key] = innerText;
                    result[styleKey] = (style || '').trim();
                    
                } else if (lowerTag === 'img') {
                    imageCount += 1;

                    const prefix = stack[stack.length - 1] || 'div1';
                    const style = extractAttr(attrs, 'style');
                    const src = extractAttr(attrs, 'src');
                    const key = prefix + 'image' + imageCount;
                    const styleKey = 'Styleimage' + imageCount;

                    result[key] = src || '';
                    result[styleKey] = (style || '').trim();
                    
                }
            } else {
                // closing tag
                if (lowerTag === 'div') {
                    stack.pop();
                }
            }

            lastIndex = tagRegex.lastIndex;
        }

        return result;
    }

    // === GENERAL ACTIONS (with HTML) ===

    async GetPageAsHtml(pageKey, lang = "sv") {
        const json = await this.GetPage(pageKey);
        return this.JsonToHtml(json, lang);
    }

    async CreatePageUsingHtml(html, header, mainPageLang = "sv", escapeUnhandled = false, useStandardMeasurement = false) {
        const jsonobj = this.HtmlToJson(html, header, mainPageLang, escapeUnhandled, useStandardMeasurement);
        return await this.CreatePage(jsonobj);
    }

    async ReplacePageUsingHtml(pageKey, html, header = null, lang = null, escapeUnhandled = false) {
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
        if (header === null) {
            header = allPages[pageKey].header;
        }
        if (lang === null) {
            lang = allPages[pageKey].mainPageLang || "sv";
        }
        let useStandardMeasurement = allPages[pageKey].useStandardMeasurement || "false";
        useStandardMeasurement = (useStandardMeasurement === true || String(useStandardMeasurement).toLowerCase() === "true") ? true : false;

        const jsonobj = this.HtmlToJson(html, header, lang, escapeUnhandled, useStandardMeasurement);

        const newPageKey = await this.CreatePage(jsonobj, header);

        if (newPageKey === null) {
            return null; // Creation failed
        }

        return newPageKey;
    }

    async GetAllPagesWithHtml(lang = "sv") { // Returns {"<pageKey>": {"header": "<header>", "html": "<html>"}}
        const allPages = await this.FetchAllPages();

        const result = {};
        for (const key in allPages) {
            const page = allPages[key];
            const json = await this.GetPage(key);
            const html = this.JsonToHtml(json, lang);
            result[key] = {
                header: page.header,
                html: html
            };
        }

        return result;
    }
}
