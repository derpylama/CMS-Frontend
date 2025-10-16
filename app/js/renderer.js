class WonkyCMSApiWrapper {
    constructor(baseUrl = "https://elias.ntigskovde.se/") {
        this.indexUrl = baseUrl + "index.php";
        this.fetchUrl = baseUrl + "php/getinfo.php";
        this.baseUrl = baseUrl;
    }

    // === JSON FUNCTIONS ===

    // Does not return weburl but creation URL parameters as string
    JsonToUrl(json) {
        const parts = [];

        const encode = (val) => encodeURIComponent(String(val)).replace(/%20/g, "+");
        const encodeColor = (val) => encodeURIComponent(String(val));

        // === Base page info ===
        const header = json.header || "";
        parts.push(`pageHeader=${encode(header)}`);
        parts.push(`pageLang=${encode(json.mainPageLang || "sv")}`);

        // === Standard Measurements flag must always be present ===
        const useStd = String(json.useStandardMeasurement) === "true";
        parts.push(`useStandardMeasurement=${useStd ? "true" : "false"}`);
        if (useStd) {
            if (json.standardUnitWidth) parts.push(`standardUnitWidth=${encode(json.standardUnitWidth)}`);
            if (json.standardUnitHeight) parts.push(`standardUnitHeight=${encode(json.standardUnitHeight)}`);
            if (json.standardMeasureUnitMargin) parts.push(`standardMeasureUnitMargin=${encode(json.standardMeasureUnitMargin)}`);
            if (json.standardMeasureUnitBorder) parts.push(`standardMeasureUnitBorder=${encode(json.standardMeasureUnitBorder)}`);
            if (json.standardMeasureUnitFont) parts.push(`standardMeasureUnitFont=${encode(json.standardMeasureUnitFont)}`);
        }

        // === Build div map (prefix -> divN) and parent links ===
        const { orderedPrefixes, prefixToDivName, prefixToParentDivName } = this._buildDivMap(json);

        // === Divs ===
        for (let i = 0; i < orderedPrefixes.length; i++) {
            const prefix = orderedPrefixes[i];
            const styles = json[`Style${prefix}`] || "";

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
        const texts = this._extractTexts(json, prefixToDivName);
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
        const images = this._extractImages(json, prefixToDivName);
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
  
    _extractDivs(json) {
        // Deprecated by _buildDivMap + inline extraction in JsonToUrl
        const divs = [];
        return divs;
    }
  
    _extractTexts(json, prefixToDivName) {
        const headers = [];
        const divHeaders = [];
        const texts = [];
        const textDivs = [];
        const headerSizes = [];
        const textSizes = [];
        const headerColors = [];
        const textColors = [];
    
        const headerRegex = /(textInfoRubrik\d+_sv)$/;
        for (const key in json) {
            if (headerRegex.test(key)) {
                headers.push(json[key]);
                const prefix = key.replace(/textInfoRubrik\d+_sv$/, "");
                divHeaders.push(prefixToDivName[prefix] || "div1");
            }
        }
    
        const textRegex = /(textInfo\d+_sv)$/;
        for (const key in json) {
            if (textRegex.test(key)) {
                texts.push(json[key]);
                const prefix = key.replace(/textInfo\d+_sv$/, "");
                textDivs.push(prefixToDivName[prefix] || "div1");
            }
        }
    
        // Pull style sizes/colors
        Object.keys(json).forEach((k) => {
            if (k.startsWith("StyletextInfoRubrik")) {
                const css = json[k];
                const fs = this._getCSSValue(css, "font-size");
                const col = this._getCSSValue(css, "color");
                if (fs) headerSizes.push(fs);
                if (col) headerColors.push(col);
            } else if (k.startsWith("StyletextInfo")) {
                const css = json[k];
                const fs = this._getCSSValue(css, "font-size");
                const col = this._getCSSValue(css, "color");
                if (fs) textSizes.push(fs);
                if (col) textColors.push(col);
            }
        });
    
        return { headers, divHeaders, texts, textDivs, headerSizes, textSizes, headerColors, textColors };
    }
  
    _getCSSValue(style, prop) {
        if (!style) return null;
        const parts = String(style).split(';');
        for (let i = 0; i < parts.length; i++) {
            const seg = parts[i];
            const idx = seg.indexOf(':');
            if (idx === -1) continue;
            const key = seg.slice(0, idx).trim();
            if (key === prop) {
                const val = seg.slice(idx + 1).trim();
                return val || null;
            }
        }
        return null;
    }
    
    _buildDivMap(json) {
        const prefixes = new Set();
        for (const key in json) {
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

    _extractImages(json, prefixToDivName) {
        const images = [];
        for (const key in json) {
            const m = key.match(/^(div[\ddiv]+)image(\d+)$/);
            if (m) {
                const prefix = m[1];
                const idx = m[2];
                const src = json[key];
                const style = json[`Styleimage${idx}`] || '';
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
        return fetch(`${this.fetchUrl}?action=getPageInfo&pageKey=${pageKey}`)
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
        await fetch(this.indexUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `rawData=${encodeURIComponent(url)}`,
        })
        .catch(err => {
            throw new Error('Request error:', err);
        });
    }

    // === HTML FUNCTIONS ===

    JsonToHTML(json) { // Takes {"pageKey": "header", ...data...} and returns HTML string
        function addDiv(page, divPrefix, pageNumber, indentLevel = 0) {
            let html = '';
            const indent = '  '.repeat(indentLevel); // 2 spaces per indent
        
            // Get and clean style for the current div
            let blockStyle = page['Style' + divPrefix] || '';
            blockStyle = blockStyle.replace(/\b[\w-]+:\s*;/g, '').trim();
        
            html += `${indent}<div style="${blockStyle}">\n`;
        
            // Detect selected language (default = "sv")
            const selectedLangInput = document.querySelector(`input[name="language-${pageNumber}"]:checked`);
            const lang = selectedLangInput ? selectedLangInput.value : "sv";
        
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
                const base = divPrefix + 'div';
                if (key.startsWith(base)) {
                    let j = base.length;
                    while (j < key.length) {
                        const c = key.charCodeAt(j);
                        if (c < 48 || c > 57) break;
                        j++;
                    }
                    if (j > base.length) {
                        nestedDivPrefixes.add(key.slice(0, j));
                    }
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
    HTMLToJson(html, header, mainPageLang = "sv", useStandardMeasurement = "false") { // Takes HTML and returns {"header": "<header>", ...data...}
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

		if (typeof document === 'undefined') {
			// Environment does not support DOM; return minimal object
			return result;
		}

		const container = document.createElement('div');
		container.innerHTML = html || '';

		const rootDiv = container.querySelector('div');
		if (!rootDiv) return result;

		let headerCount = 0;
		let paragraphCount = 0;
		let imageCount = 0;
		const nestedDivCounters = new Map(); // per-prefix counters

		function getStyle(el) {
			const style = el.getAttribute('style');
			return style ? style.trim() : '';
		}

		function nextNestedIndex(prefix) {
			const current = nestedDivCounters.get(prefix) || 0;
			const next = current + 1;
			nestedDivCounters.set(prefix, next);
			return next;
		}

		function processDiv(divEl, prefix) {
			result['Style' + prefix] = getStyle(divEl);

			for (const child of Array.from(divEl.children)) {
				const tag = child.tagName.toLowerCase();
				if (tag === 'h3') {
					headerCount += 1;
					const key = prefix + 'textInfoRubrik' + headerCount + '_sv';
					const styleKey = 'StyletextInfoRubrik' + headerCount;
					result[key] = child.textContent || '';
					result[styleKey] = getStyle(child);
				} else if (tag === 'p') {
					paragraphCount += 1;
					const key = prefix + 'textInfo' + paragraphCount + '_sv';
					const styleKey = 'StyletextInfo' + paragraphCount;
					result[key] = child.textContent || '';
					result[styleKey] = getStyle(child);
				} else if (tag === 'img') {
					imageCount += 1;
					const key = prefix + 'image' + imageCount;
					const styleKey = 'Styleimage' + imageCount;
					result[key] = child.getAttribute('src') || '';
					result[styleKey] = getStyle(child);
				} else if (tag === 'div') {
					const n = nextNestedIndex(prefix);
					const childPrefix = prefix + 'div' + n;
					processDiv(child, childPrefix);
				}
			}
		}

		processDiv(rootDiv, 'div1');
		return result;
    }


    // === GENERAL ACTIONS ===

    async FetchAllPages() {
        result = {};
        await fetch(this.baseUrl)
            .then(response => response.text())
            .then(data => {
                try {
                    const pages = data.split("pages =")[1];
                    const pagesJson = pages.split("</script>")[0];
                    const lastSemicolonIndex = pagesJson.trim();
                    const json = lastSemicolonIndex.substring(0, lastSemicolonIndex.length - 1);
                    result = JSON.parse(json);
                } catch (e) {
                    throw new Error('Failed to parse pages JSON');
                }
            })
            .catch(err => {
                throw new Error('Request error:', err);
            });

        return result;

    } // Returns {"<pageKey>": {"header": "<header>", ...data...}, ...}

    async RemovePage(pageKey) {
        // GET elias.ntigskovde.se/php/deletepage.php?action=deletePage&pageKey=<string:pageID>

        await fetch(`${this.baseUrl}php/deletepage.php?action=deletePage&pageKey=${pageKey}`)
            .catch(err => {
                throw new Error('Request error:', err);
            });
    }

    // Returns null if a matching header is not found (after creating a page)
    async CreatePage(html, header, mainPageLang = "sv", useStandardMeasurement = "false") { // Returns new pageKey (to get new pageKey find matching header in FetchAllPages response)
        if (typeof header === 'undefined' || header === null || header.trim() === '') {
            throw new Error("Header is required");
        }
        
        const json = this.HTMLToJson(html, header, mainPageLang, useStandardMeasurement);

        const url = this.JsonToUrl(json);

        // POST url
        await this.PostCreationUrl(url);

        // Find new pageKey by fetching all pages and finding matching header
        const allPages = await this.FetchAllPages();
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
}

/*
html = `<div style="width:80%;height:300px;display:flex;background-color:#a3d9a5;flex-flow:column;"><div style="width:90%;height:220px;display:flex;background-color:#ffffff;flex-flow:column;"><h3 style="font-size:24px;color:#003300;">Mini Koala Info</h3><p style="font-size:16px;color:#000000;">Detta är en liten ruta med en rubrik, text och en bild om koalan.</p><img style="width:80%;height:150px;border-radius:10px;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/4/49/Koala_climbing_tree.jpg" alt="Image"></div></div>`;
const api = new WonkyCMSApiWrapper("http://192.168.218.186:8080/cmsapi/");
(async () => {
    console.log("Testing CreatePage...");
    const newPageKey = await api.CreatePage(html, "My Koala Page", "sv");
    console.log("New pageKey:", newPageKey);
})();*/
/*-----------------------------------------*/ 

const viewButton = document.getElementById("top_button_view")
const editButton = document.getElementById("top_button_edit")
const createPageButton = document.getElementById("top_button_create_page")
const defaultCon = document.getElementById("view_container")
const cons = document.querySelectorAll(".cons")

var buttonsCon = document.getElementsByClassName("topbar_button_container")[0]



editButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("edit_container").style.display = "block"
})
viewButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("view_container").style.display = "block"
    
})

createPageButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("create_page_container").style.display = "block"
    
})


