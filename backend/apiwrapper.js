const http = require('http');
const https = require('https');
const { URL } = require('url');

class WonkyCMSApiWrapper {
    constructor(baseUrl = "https://elias.ntigskovde.se/") {
        this.indexUrl = baseUrl + "index.php";
        this.fetchUrl = baseUrl + "php/getinfo.php";
        this.baseUrl = baseUrl;
		this.defaultTimeoutMs = 10000; // 10 seconds
    }

    // === Low-level HTTP helpers (Node/Electron backend, no fetch/DOM) ===
    _httpRequest(method, urlString, { headers = {}, body = null, timeoutMs = this.defaultTimeoutMs } = {}) {
        return new Promise((resolve, reject) => {
            let urlObj;
            try {
                urlObj = new URL(urlString);
            } catch (err) {
                return reject(new Error(`Invalid URL: ${urlString}`));
            }

            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;
            const options = {
                method,
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + (urlObj.search || ''),
                headers,
            };

            const req = client.request(options, (res) => {
                const chunks = [];
                res.on('data', (d) => chunks.push(d));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);

                    // const contentType = res.headers['content-type'] || '';
                    // const match = contentType.match(/charset=([^;]+)/i);
                    // const charset = match ? match[1].trim().toLowerCase() : null;

                    // let text;
                    // // If the server explicitly says UTF-8, decode as UTF-8
                    // // Otherwise, assume Latin-1 (ISO-8859-1) and re-encode to UTF-8
                    // if (charset && (charset.includes('utf-8') || charset.includes('utf8'))) {
                    //     text = buffer.toString('utf8');
                    // } else {
                    //     // decode as latin1, then convert to UTF-8 string
                    //     // Node's 'latin1' maps bytes 0–255 directly to Unicode U+0000–U+00FF
                    //     text = Buffer.from(buffer.toString('latin1'), 'utf8').toString();
                    // }

                    const text = buffer.toString('utf8');

                    resolve({ statusCode: res.statusCode || 0, headers: res.headers, text });
                });
            });

            req.on('error', (err) => reject(err));
            req.setTimeout(timeoutMs, () => {
                req.destroy(new Error('Request timed out'));
            });

            if (body) {
                if (typeof body === 'string' || Buffer.isBuffer(body)) {
                    req.write(body);
                } else {
                    return reject(new Error('Body must be string or Buffer'));
                }
            }
            req.end();
        });
    }

    async _getText(url, timeoutMs) {
        const res = await this._httpRequest('GET', url, { timeoutMs });
        if (res.statusCode < 200 || res.statusCode >= 300) {
            throw new Error(`HTTP ${res.statusCode} when GET ${url}`);
        }
        return res.text;
    }

    async _getJson(url, timeoutMs) {
        const text = await this._getText(url, timeoutMs);
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Failed to parse JSON response');
        }
    }

    async _postForm(url, formObj, timeoutMs) {
        const body = Object.entries(formObj)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        };
        const res = await this._httpRequest('POST', url, { headers, body, timeoutMs });
        if (res.statusCode < 200 || res.statusCode >= 300) {
            throw new Error(`HTTP ${res.statusCode} when POST ${url}`);
        }
        return res.text;
    }

    // === JSON FUNCTIONS ===

    // Does not return weburl but creation URL parameters as string
    JsonToUrl(jsonobj) {
        const parts = [];

        const encode = (val) => encodeURIComponent(String(val)).replace(/%20/g, "+");
        const encodeColor = (val) => encodeURIComponent(String(val));

        // === Base page info ===
        const header = jsonobj.header || "";
        parts.push(`pageHeader=${encode(header)}`);
        parts.push(`pageLang=${encode(jsonobj.mainPageLang || "sv")}`);

        // === Standard Measurements flag must always be present ===
        const useStd = String(jsonobj.useStandardMeasurement) === "true";
        parts.push(`useStandardMeasurement=${useStd ? "true" : "false"}`);
        if (useStd) {
            if (jsonobj.standardUnitWidth) parts.push(`standardUnitWidth=${encode(jsonobj.standardUnitWidth)}`);
            if (jsonobj.standardUnitHeight) parts.push(`standardUnitHeight=${encode(jsonobj.standardUnitHeight)}`);
            if (jsonobj.standardMeasureUnitMargin) parts.push(`standardMeasureUnitMargin=${encode(jsonobj.standardMeasureUnitMargin)}`);
            if (jsonobj.standardMeasureUnitBorder) parts.push(`standardMeasureUnitBorder=${encode(jsonobj.standardMeasureUnitBorder)}`);
            if (jsonobj.standardMeasureUnitFont) parts.push(`standardMeasureUnitFont=${encode(jsonobj.standardMeasureUnitFont)}`);
        }

        // === Build div map (prefix -> divN) and parent links ===
        const { orderedPrefixes, prefixToDivName, prefixToParentDivName } = this._buildDivMap(jsonobj);

        // === Divs ===
        for (let i = 0; i < orderedPrefixes.length; i++) {
            const prefix = orderedPrefixes[i];
            const styles = jsonobj[`Style${prefix}`] || "";

            const width = this._getCSSValue(styles, "width");
            const height = this._getCSSValue(styles, "height");
            const display = this._getCSSValue(styles, "display");
            const bgColor = this._getCSSValue(styles, "background-color");
            const flow = this._getCSSValue(styles, "flex-flow");
            const justify = this._getCSSValue(styles, "justify-content");
            const align = this._getCSSValue(styles, "align-items");
            const paddingBot = this._getCSSValue(styles, "padding-bottom");

            // For the first div (root), do NOT add addDivToDiv[]
            if (i > 0) {
                const parentDivName = prefixToParentDivName[prefix];
                parts.push(`addDivToDiv[]=${parentDivName}`);
            }

            if (width) parts.push(`newDivWidth[]=${encode(width)}`);
            if (height) parts.push(`newDivHeight[]=${encode(height)}`);
            if (display) parts.push(`newDivDisplay[]=${encode(display)}`);
            if (bgColor) parts.push(`newDivColor[]=${encodeColor(bgColor)}`);
            if (flow) parts.push(`newDivFlow[]=${encode(flow)}`);
            if (justify) parts.push(`newDivJustify[]=${encode(justify)}`);
            if (align) parts.push(`newDivAlign[]=${encode(align)}`);
            if (paddingBot) parts.push(`newDivPaddingBot[]=${encode(paddingBot)}`);
        }

        // === Text info ===
        const texts = this._extractTexts(jsonobj, prefixToDivName);
        // Maintain the order similar to known-good
        for (const t of texts.headers) parts.push(`addTextInformationHeader[]=${encode(t)}`);
        for (const t of texts.headerSizes) parts.push(`addTextInformationHeaderSize[]=${encode(t)}`);
        for (const t of texts.headerColors) parts.push(`addTextInformationHeaderColor[]=${encodeColor(t)}`);
        for (const t of texts.divHeaders) parts.push(`addTextInformationDivHeader[]=${t}`);

        for (const t of texts.texts) parts.push(`addTextInformation[]=${encode(t)}`);
        for (const t of texts.textDivs) parts.push(`addTextInformationDiv[]=${t}`);
        for (const t of texts.textSizes) parts.push(`addTextInformationSize[]=${encode(t)}`);
        for (const t of texts.textColors) parts.push(`addTextInformationColor[]=${encodeColor(t)}`);

        // === Images (extract from JSON keys + styles) ===
        const images = this._extractImages(jsonobj, prefixToDivName);
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
  
    _extractTexts(jsonobj, prefixToDivName) {
        const headers = [];
        const divHeaders = [];
        const texts = [];
        const textDivs = [];
        const headerSizes = [];
        const textSizes = [];
        const headerColors = [];
        const textColors = [];
    
        const headerRegex = /(textInfoRubrik\d+_sv)$/;
        for (const key in jsonobj) {
            if (headerRegex.test(key)) {
                headers.push(jsonobj[key]);
                const prefix = key.replace(/textInfoRubrik\d+_sv$/, "");
                divHeaders.push(prefixToDivName[prefix] || "div1");
            }
        }
    
        const textRegex = /(textInfo\d+_sv)$/;
        for (const key in jsonobj) {
            if (textRegex.test(key)) {
                texts.push(jsonobj[key]);
                const prefix = key.replace(/textInfo\d+_sv$/, "");
                textDivs.push(prefixToDivName[prefix] || "div1");
            }
        }
    
        // Pull style sizes/colors
        Object.keys(jsonobj).forEach((k) => {
            if (k.startsWith("StyletextInfoRubrik")) {
                const css = jsonobj[k];
                const fs = this._getCSSValue(css, "font-size");
                const col = this._getCSSValue(css, "color");
                if (fs) headerSizes.push(fs);
                if (col) headerColors.push(col);
            } else if (k.startsWith("StyletextInfo")) {
                const css = jsonobj[k];
                const fs = this._getCSSValue(css, "font-size");
                const col = this._getCSSValue(css, "color");
                if (fs) textSizes.push(fs);
                if (col) textColors.push(col);
            }
        });
    
        return { headers, divHeaders, texts, textDivs, headerSizes, textSizes, headerColors, textColors };
    }
  
    _getCSSValue(style, prop) {
        const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`);
        const match = style.match(regex);
        return match ? match[1].trim() : null;
    }
    
    _buildDivMap(jsonobj) {
        const prefixes = new Set();
        for (const key in jsonobj) {
            if (key.startsWith("Stylediv")) {
                const prefix = key.replace(/^Style/, "");
                prefixes.add(prefix);
            }
        }

        // Order by depth (shorter first), then lexicographically
        const orderedPrefixes = Array.from(prefixes).sort((a, b) => {
            const depthA = (a.match(/div\d+/g) || []).length;
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
            const parentPrefix = prefix.replace(/div\d+$/, "");
            if (parentPrefix && prefixToDivName[parentPrefix]) {
                prefixToParentDivName[prefix] = prefixToDivName[parentPrefix];
            } else {
                prefixToParentDivName[prefix] = null;
            }
        });

        return { orderedPrefixes, prefixToDivName, prefixToParentDivName };
    }

    _extractImages(jsonobj, prefixToDivName) {
        const images = [];
        for (const key in jsonobj) {
            const m = key.match(/^(div[\ddiv]+)image(\d+)$/);
            if (m) {
                const prefix = m[1];
                const idx = m[2];
                const src = jsonobj[key];
                const style = jsonobj[`Styleimage${idx}`] || '';
                const width = this._getCSSValue(style, 'width');
                const height = this._getCSSValue(style, 'height');
                const borderRadius = this._getCSSValue(style, 'border-radius');
                const display = this._getCSSValue(style, 'display');
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


    // === Fetch / Post functions ===

    async FetchJson(pageKey) {
        // Rewrite to use http module
        return this._getJson(`${this.fetchUrl}?action=getPageInfo&pageKey=${pageKey}`)
    }

    // Takes in a creation URL (not full weburl) and POSTs it to the CMS, returns nothing
    async PostCreationUrl(url) {
        // To send a creation URL we send a POST request to baseUrl + "index.php"
        // Replicating the bellow HTML form
        /*
        <form id="cretePageFromDataForm" method="post" action="">
            <label>Enter POST-data or JSON-data:</label><br>
                <textarea name="rawData" rows="10" cols="120" placeholder=""></textarea>
            <br>
            <button type="submit">Create new page</button>
        </form>
        */

        // Where `rawData` = url

        await this._postForm(this.indexUrl, { "rawData": url });
    }

    // === HTML FUNCTIONS ===

    JsonToHTML(json, lang = "sv") { // Takes {"pageKey": "header", ...data...} and returns HTML string (no DOM)
        function addDiv(page, divPrefix, pageNumber, indentLevel = 0) {
            let html = '';
            const indent = '  '.repeat(indentLevel); // 2 spaces per indent
        
            // Get and clean style for the current div
            let blockStyle = page['Style' + divPrefix] || '';
            blockStyle = blockStyle.replace(/\b[\w-]+:\s*;/g, '').trim();
        
            html += `${indent}<div style="${blockStyle}">\n`;
        
            // --- Add text and images ---
            for (const key in page) {
                if (key.startsWith(divPrefix + 'textInfoRubrik') && key.endsWith('_' + lang)) {
                    const styleKey = 'Style' + key.replace(divPrefix, '').replace('_' + lang, '');
                    let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim();
                    const value = page[key];
                    html += `${indent}  <h3 style="${style}">${value}</h3>\n`;
                }
                else if (key.startsWith(divPrefix + 'textInfo') && key.endsWith('_' + lang) && !key.startsWith(divPrefix + 'textInfoRubrik')) {
                    const styleKey = 'Style' + key.replace(divPrefix, '').replace('_' + lang, '');
                    let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim();
                    const value = page[key];
                    html += `${indent}  <p style="${style}">${value}</p>\n`;
                }
                else if (key.startsWith(divPrefix + 'image')) {
                    const styleKey = 'Style' + key.replace(divPrefix, '');
                    let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim();
                    html += `${indent}  <img style="${style}" src="${page[key]}" alt="Image">\n`;
                }
            }
        
            // --- Find nested divs ---
            const nestedDivPrefixes = new Set();
            for (const key in page) {
                const match = key.match(new RegExp('^(' + divPrefix + 'div\\d+)'));
                if (match) {
                    nestedDivPrefixes.add(match[1]);
                }
            }
        
            // --- Recursively add nested divs ---
            nestedDivPrefixes.forEach(nestedDivPrefix => {
                html += addDiv(page, nestedDivPrefix, pageNumber, indentLevel + 1);
            });
        
            html += `${indent}</div>\n`;
            return html;
        }

        // divPrefix is where in the wonky-hierarchy we start building (div1 is root body)
        // pageNumber is actually generated by the CMS, we just use it because it had to be applied
        return addDiv(json, 'div1', 'page1');
    }

    // MARK: The only allowed html we currently know is: <div>, <h3>, <p>, <img>
    HTMLToJson(html, header, mainPageLang = "sv", useStandardMeasurement = "false") { // Takes HTML and returns {"header": "<header>", ...data...} (no DOM)
        // Ensure header is defined else throw
        if (typeof header === 'undefined' || header === null || header.trim() === '') {
            throw new Error("Header is required");
        }
		// Generate JSON from HTML
		const result = {};
		// Inject "useStandardMeasurement" set to true
		result.useStandardMeasurement = useStandardMeasurement;
		result.mainPageLang = mainPageLang;
        result.header = header;

		let headerCount = 0;
		let paragraphCount = 0;
		let imageCount = 0;
		const nestedDivCounters = new Map(); // per-prefix counters
		const stack = [];
		let firstDivSeen = false;

		function nextNestedIndex(prefix) {
			const current = nestedDivCounters.get(prefix) || 0;
			const next = current + 1;
			nestedDivCounters.set(prefix, next);
			return next;
		}

		function extractAttr(attrs, name) {
			const m = new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i').exec(attrs) || new RegExp(name + "\\s*=\\s*'([^']*)'", 'i').exec(attrs);
			return m ? m[1] : '';
		}

		const tagRegex = /<(\/)?(div|h3|p|img)([^>]*)>/gi;
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
					const endTag = new RegExp(`</${tag}\\s*>`, 'i');
					const endMatch = endTag.exec(html.substring(tagRegex.lastIndex));
					let innerText = '';
					if (endMatch) {
						const start = tagRegex.lastIndex;
						const end = start + endMatch.index;
						innerText = html.substring(start, end).replace(/<[^>]*>/g, '').trim();
						// move regex index to after closing tag
						tagRegex.lastIndex = end + endMatch[0].length;
					}
					const key = prefix + 'textInfoRubrik' + headerCount + '_sv';
					const styleKey = 'StyletextInfoRubrik' + headerCount;
					result[key] = innerText;
					result[styleKey] = (style || '').trim();
				} else if (lowerTag === 'p') {
					paragraphCount += 1;
					const prefix = stack[stack.length - 1] || 'div1';
					const style = extractAttr(attrs, 'style');
					const endTag = new RegExp(`</${tag}\\s*>`, 'i');
					const endMatch = endTag.exec(html.substring(tagRegex.lastIndex));
					let innerText = '';
					if (endMatch) {
						const start = tagRegex.lastIndex;
						const end = start + endMatch.index;
						innerText = html.substring(start, end).replace(/<[^>]*>/g, '').trim();
						// move regex index to after closing tag
						tagRegex.lastIndex = end + endMatch[0].length;
					}
					const key = prefix + 'textInfo' + paragraphCount + '_sv';
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


    // === GENERAL ACTIONS ===

    async FetchAllPages() { // Returns {"<pageKey>": {"header": "<header>", ...data...}, ...}

        const text = await this._getText(this.baseUrl);
        try {
            const pages = text.split("pages =")[1];
            const pagesJson = pages.split("</script>")[0];
            const lastSemicolonIndex = pagesJson.trim();
            const jsonobj = lastSemicolonIndex.substring(0, lastSemicolonIndex.length - 1);
            return JSON.parse(jsonobj);
        } catch (e) {
            throw new Error('Failed to parse pages JSON');
        }

    }

    async RemovePage(pageKey, validate = false) {
        await this._getText(`${this.baseUrl}php/deletepage.php?action=deletePage&pageKey=${pageKey}`);

        if (validate) {
            const allPages = await this.FetchAllPages();
            if (allPages.hasOwnProperty(pageKey)) {
                // If the page was deleted allPages[pageKey] would be { "deleted": 'true' }
                if (!allPages[pageKey].hasOwnProperty("deleted")) {
                    throw new Error("Failed to delete page, it still exists");
                }
            }
        }
    }

    // Returns null if a matching header is not found (after creating a page)
    async CreatePage(html, header, mainPageLang = "sv", useStandardMeasurement = "false") { // Returns new pageKey (to get new pageKey find matching header in FetchAllPages response)
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
        
        const jsonobj = this.HTMLToJson(html, header, mainPageLang, useStandardMeasurement);

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
    async ReplacePage(pageKey, html) {
        // Ensure pageKey exists in FetchAllPages else return null
        const allPages = await this.FetchAllPages();
        if (!allPages.hasOwnProperty(pageKey)) {
            return null;
        }

        // Delete the page
        await this.RemovePage(pageKey);

        // Create a new page with the same header and lang as the deleted page
        const header = allPages[pageKey].header;
        const mainPageLang = allPages[pageKey].mainPageLang || "sv";
        const useStandardMeasurement = allPages[pageKey].useStandardMeasurement || "false";

        const newPageKey = await this.CreatePage(html, header, mainPageLang, useStandardMeasurement);

        if (newPageKey === null) {
            return null; // Creation failed
        }

        return newPageKey;
    }

    async GetPage(pageKey) {
        const url = `${this.baseUrl}php/getinfo.php?action=getPageInfo&pageKey=${pageKey}`;
        return await this._getJson(url);
    }
}

module.exports = { WonkyCMSApiWrapper };