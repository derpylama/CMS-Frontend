// MARK: Should we move out HTML->JSON JSON->HTML to frontend to utualize DOM? If so refactor to take JSON instead of HTML

const nf = require('node-fetch');
const fetch = nf.default || nf;

class WonkyCMSApiWrapper {
    constructor(baseUrl = "https://elias.ntigskovde.se/") {
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
                    throw new Error(`HTTP ${res.status} when GET ${url}`);
                }
                return res.text();
            })
            .catch(err => {
                throw new Error(`Fetch error: ${err.message}`);
            });
    }

    async getJson(url, timeoutMs) {
        const text = await this.getText(url, timeoutMs);

        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Failed to parse JSON response');
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
                    throw new Error(`HTTP ${res.status} when POST ${url}`);
                }
                return res.text();
            })
            .catch(err => {
                throw new Error(`Fetch error: ${err.message}`);
            });
    }

    // === JSON FUNCTIONS ===

    // Does not return weburl but creation URL parameters as string
    JsonToUrl(jsonobj) {
        function getCSSValue(style, prop) {
            const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`); // \s means whitespace, * means zero or more, [^;]+ means one or more characters that are not semicolon
            const match = style.match(regex);
            return match ? match[1].trim() : null;
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

        const parts = [];

        // %20 is space, + is space in x-www-form-urlencoded
        const encode = (val) => encodeURIComponent(String(val)).replace(/%20/g, "+");

        const encodeColor = (val) => encodeURIComponent(String(val));

        // Base page info
        const header = jsonobj.header || "";
        parts.push(`pageHeader=${encode(header)}`);
        parts.push(`pageLang=${encode(jsonobj.mainPageLang || "sv")}`);

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
            const flow = getCSSValue(styles, "flex-flow");
            const justify = getCSSValue(styles, "justify-content");
            const align = getCSSValue(styles, "align-items");
            const paddingBot = getCSSValue(styles, "padding-bottom");

            // For the first div (root), do NOT add addDivToDiv[]
            if (i > 0) {
                const parentDivName = prefixToParentDivName[prefix];
                parts.push(`addDivToDiv[]=${parentDivName}`);
            }

            if (width)      parts.push(`newDivWidth[]=${encode(width)}`);
            if (height)     parts.push(`newDivHeight[]=${encode(height)}`);
            if (display)    parts.push(`newDivDisplay[]=${encode(display)}`);
            if (bgColor)    parts.push(`newDivColor[]=${encodeColor(bgColor)}`);
            if (flow)       parts.push(`newDivFlow[]=${encode(flow)}`);
            if (justify)    parts.push(`newDivJustify[]=${encode(justify)}`);
            if (align)      parts.push(`newDivAlign[]=${encode(align)}`);
            if (paddingBot) parts.push(`newDivPaddingBot[]=${encode(paddingBot)}`);
        }

        // Text info
        const texts = extractTexts(jsonobj, prefixToDivName);
        
        for (const t of texts.headers) parts.push(`addTextInformationHeader[]=${encode(t)}`);
        for (const t of texts.headerSizes) parts.push(`addTextInformationHeaderSize[]=${encode(t)}`);
        for (const t of texts.headerColors) parts.push(`addTextInformationHeaderColor[]=${encodeColor(t)}`);
        for (const t of texts.divHeaders) parts.push(`addTextInformationDivHeader[]=${t}`);

        for (const t of texts.texts) parts.push(`addTextInformation[]=${encode(t)}`);
        for (const t of texts.textDivs) parts.push(`addTextInformationDiv[]=${t}`);
        for (const t of texts.textSizes) parts.push(`addTextInformationSize[]=${encode(t)}`);
        for (const t of texts.textColors) parts.push(`addTextInformationColor[]=${encodeColor(t)}`);

        // Images (extract from JSON keys + styles)
        const images = extractImages(jsonobj, prefixToDivName);
        for (const img of images) {
            parts.push(`addImage[]=${encode(img.src)}`);
            parts.push(`addImageDiv[]=${img.div}`);
            if (img.display) parts.push(`addImageDisplay[]=${encode(img.display)}`);
            if (img.width) parts.push(`addImageWidth[]=${encode(img.width)}`);
            if (img.height) parts.push(`addImageHeight[]=${encode(img.height)}`);
            if (img.borderRadius) parts.push(`addImageBorderRadius[]=${encode(img.borderRadius)}`);
        }

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
            throw new Error('Failed to parse pages JSON');
        }

    }

    async RemovePage(pageKey, validate = false) {
        await this.getText(`${this.baseUrl}php/deletepage.php?action=deletePage&pageKey=${pageKey}`);

        if (validate) {
            const allPages = await this.FetchAllPages(false); // Fetch all including deleted

            if (allPages.hasOwnProperty(pageKey)) {
                // If the page was deleted allPages[pageKey] would be { "deleted": 'true' }
                if (!allPages[pageKey].hasOwnProperty("deleted")) {
                    throw new Error("Failed to delete page, it still exists");
                }
            }
        }
    }

    // Returns null if a matching header is not found (after creating a page)
    async CreatePage(jsonobj, header) { // Returns new pageKey (to get new pageKey find matching header in FetchAllPages response)
        if (typeof header === 'undefined' || header === null || header.trim() === '') {
            throw new Error("Header is required");
        }

        // Ensure header is unique in FetchAllPages else throw
        let allPages = await this.FetchAllPages();
        for (const key in allPages) {
            if (allPages[key].header === header) {
                throw new Error("Header must be unique");
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
            throw new Error("Page key does not exist");
        }

        // Check if page is deleted
        if (allPages[pageKey].hasOwnProperty("deleted")) {
            throw new Error("Cannot replace a deleted page");
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
        return await this.getJson(url);
    }

    async GetPreviewOfPages(previewLength = 100, previewLang = "sv"){ //returns {pageKey: { header: "pageHeader", preview: "content from page that is as long as the set limit"}}

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
                header: values["header"] || "",
                preview: combinedPreview
            };
        }
    
        console.log(pagePreviews);
        return pagePreviews;
    }
}

// Inheritance class WonkyCMSApiHandler which has some other helper methods added
class WonkyCMSApiHandler extends WonkyCMSApiWrapper {
    constructor(baseUrl) {
        super(baseUrl);
    }


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
    HtmlToJson(html, header, mainPageLang = "sv", useStandardMeasurement = "false") { // Takes HTML and returns {"header": "<header>", ...data...} (no DOM)
		const nestedDivCounters = new Map(); // per-prefix counters

		function nextNestedIndex(prefix) {
			const current = nestedDivCounters.get(prefix) || 0;
			const next = current + 1;
			nestedDivCounters.set(prefix, next);
			return next;
		}

		function extractAttr(attrs, name) {
			const m = new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i').exec(attrs) || new RegExp(name + "\\s*=\\s*'([^']*)'", 'i').exec(attrs); // \s means whitespace, * means zero or more, [^"]* means zero or more characters that are not double quotes, [^']* means zero or more characters that are not single quotes
			return m ? m[1] : '';
		}

        // Ensure header is defined else throw
        if (typeof header === 'undefined' || header === null || header.trim() === '') {
            throw new Error("Header is required");
        }

		// Generate JSON from HTML
		const result = {};
		result.useStandardMeasurement = useStandardMeasurement; // Inject "useStandardMeasurement"
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

    async CreatePageUsingHtml(html, header, mainPageLang = "sv", useStandardMeasurement = "false") {
        const jsonobj = this.HtmlToJson(html, header, mainPageLang, useStandardMeasurement);
        return await this.CreatePage(jsonobj, header, mainPageLang, useStandardMeasurement);
    }

    async ReplacePageUsingHtml(pageKey, html, header = null) {
        // Ensure pageKey exists in FetchAllPages else return null
        const allPages = await this.FetchAllPages(false); // Fetch all including deleted
        if (!allPages.hasOwnProperty(pageKey)) {
            throw new Error("Page key does not exist");
        }
        
        // Check if page is deleted
        if (allPages[pageKey].hasOwnProperty("deleted")) {
            throw new Error("Cannot replace a deleted page");
        }

        // Delete the page
        await this.RemovePage(pageKey);

        // Create a new page with the same header and lang as the deleted page
        if (header === null) {
            header = allPages[pageKey].header;
        }
        const mainPageLang = allPages[pageKey].mainPageLang || "sv";
        const useStandardMeasurement = allPages[pageKey].useStandardMeasurement || "false";

        const jsonobj = this.HtmlToJson(html, header, mainPageLang, useStandardMeasurement);

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

module.exports = { WonkyCMSApiWrapper, WonkyCMSApiHandler };