
class WonkyCMSApiWrapper {
    constructor(baseUrl = "https://elias.ntigskovde.se/") {
        this.indexUrl = baseUrl + "cmsapi/index.php";
        this.fetchUrl = baseUrl + "php/getinfo.php";
        this.baseUrl = baseUrl;
    }

    // === JSON FUNCTIONS ===

    JsonToUrl(json) {
        const params = new URLSearchParams();

        // Base page info
        params.append("pageHeader", json.header + " pt2");
        params.append("pageLang", json.mainPageLang || "sv");

        // Standard Measurements
        if (json.useStandardMeasurement === "true") {
            params.append("standardUnitWidth", json.standardUnitWidth || "%");
            params.append("standardUnitHeight", json.standardUnitHeight || "px");
            params.append("standardMeasureUnitMargin", json.standardMeasureUnitMargin || "px");
            params.append("standardMeasureUnitBorder", json.standardMeasureUnitBorder || "px");
            params.append("standardMeasureUnitFont", json.standardMeasureUnitFont || "px");
        }

        // Parse style definitions into divs
        const divs = this._extractDivs(json);
        for (const div of divs) {
            params.append("addDivToDiv[]", div.parent);
            params.append("newDivWidth[]", div.width);
            params.append("newDivHeight[]", div.height);
            params.append("newDivDisplay[]", div.display);
            params.append("newDivColor[]", div.color);
            if (div.flow) params.append("newDivFlow[]", div.flow);
            if (div.justify) params.append("newDivJustify[]", div.justify);
            if (div.align) params.append("newDivAlign", div.align);
            if (div.paddingBot) params.append("newDivPaddingBot[]", div.paddingBot);
        }

        // Text Information
        const texts = this._extractTexts(json);
        for (const t of texts) {
            params.append("addTextInformationHeader[]", t.header);
            params.append("addTextInformationDivHeader[]", t.divHeader);
            params.append("addTextInformation[]", t.text);
            params.append("addTextInformationDiv[]", t.div);
            if (t.headerSize) params.append("addTextInformationHeaderSize[]", t.headerSize);
            if (t.textSize) params.append("addTextInformationSize[]", t.textSize);
            if (t.headerColor) params.append("addTextInformationHeaderColor[]", t.headerColor);
            if (t.textColor) params.append("addTextInformationColor[]", t.textColor);
        }

        // Images (optional)
        if (json.images && Array.isArray(json.images)) {
            for (const img of json.images) {
                params.append("addImage[]", img.src);
                params.append("addImageDiv[]", img.div);
                params.append("addImageDisplay[]", img.display || "block");
                params.append("addImageWidth[]", img.width || "100");
                params.append("addImageHeight[]", img.height || "100");
                if (img.borderRadius) params.append("addImageBorderRadius[]", img.borderRadius);
            }
        }

        // Return final URL
        return `${this.indexUrl}?${params.toString()}`;
    }

    // Helper to extract div info from JSON styles
    _extractDivs(json) {
        const divs = [];
        for (const key in json) {
        if (key.startsWith("Stylediv")) {
            const parentMatch = key.match(/^Style(div[\ddiv]*)$/);
            if (!parentMatch) continue;
            const parent = parentMatch[1].replace(/div(\d+)/g, (_, n) => "div" + n);
            const css = json[key];
            const width = this._getCSSValue(css, "width") || "100";
            const height = this._getCSSValue(css, "height") || "100";
            const display = this._getCSSValue(css, "display") || "flex";
            const color = this._getCSSValue(css, "background-color") || "#ffffff";
            const flow = this._getCSSValue(css, "flex-flow");
            const justify = this._getCSSValue(css, "justify-content");
            const align = this._getCSSValue(css, "align-items");
            const paddingBot = this._getCSSValue(css, "padding-bottom");

            divs.push({ parent, width, height, display, color, flow, justify, align, paddingBot });
        }
        }
        return divs;
    }

    // Helper for extracting text info (headers, sizes, colors)
    _extractTexts(json) {
        const texts = [];
        const headerRegex = /^div[\ddiv]*textInfoRubrik(\d+)_sv$/;
        for (const key in json) {
            const match = key.match(headerRegex);
            if (match) {
                const headerId = match[1];
                const header = json[key];
                const divHeader = key.replace(/textInfoRubrik\d+_sv$/, "");
                const div = divHeader;
                const textKey = key.replace("textInfoRubrik", "textInfo");
                const text = json[textKey] || "";
                const styleHeader = json[`StyletextInfoRubrik${headerId}`] || "";
                const headerSize = this._getCSSValue(styleHeader, "font-size");
                const headerColor = this._getCSSValue(styleHeader, "color");
                const styleText = json[`StyletextInfo${headerId}`] || "";
                const textSize = this._getCSSValue(styleText, "font-size");
                const textColor = this._getCSSValue(styleText, "color");

                texts.push({
                    header,
                    divHeader,
                    text,
                    div,
                    headerSize,
                    headerColor,
                    textSize,
                    textColor,
                });
            }
        }
        return texts;
    }

    // Helper to get a CSS property value from inline style string
    _getCSSValue(style, prop) {
        const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`);
        const match = style.match(regex);
        return match ? match[1].trim().replace(/;$/, "") : null;
    }

    FetchJson(pageKey) {
        return fetch(`${this.fetchUrl}?action=getPageInfo&pageKey=${pageKey}`)
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
    HTMLToJson(html) { // Takes HTML and returns {"header": "<header>", ...data...}
        // Generate JSON from HTML

        // Inject "useStandardMeasurement" set to true
    }


    // === GENERAL ACTIONS ===

    FetchAllPages() {} // Returns {"<pageKey>": {"header": "<header>", ...data...}, ...}

    RemovePage(pageKey) {}

    CreatePage(html) {} // Returns new pageKey (to get new pageKey find matching header in FetchAllPages response)

    ReplacePage(pageKey, html) {}
}

const test = `
{
    "header": "Allt om Koalor",
    "useStandardMeasurement": "true",
    "standardUnitWidth": "%",
    "standardUnitHeight": "px",
    "standardMeasureUnitMargin": "px",
    "standardMeasureUnitBorder": "px",
    "standardMeasureUnitFont": "px",
    "mainPageLang": "sv",
    "secondaryPageLang": "en",
    "StyletextInfoRubrik1": "font-size:36px;color:#005500;",
    "StyletextInfoRubrik2": "font-size:28px;color:#006633;",
    "StyletextInfoRubrik3": "font-size:24px;color:green;",
    "StyletextInfo1": "font-size:18px;color:#003300;",
    "StyletextInfo2": "font-size:16px;color:#666600;",
    "StyletextInfo3": "font-size:18px;color:#ff6600;",
    "StyletextInfo4": "font-size:16px;color:#005500;",
    "StyletextInfo5": "font-size:14px;",
    "Stylediv1": "width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:space-around;border:5px solid rgb(145,106,145);border-radius:25px;padding:5px;padding-bottom:25px;",
    "Stylediv1div1": "width:80%;height:300px;display:flex;background-color:#a3d9a5;flex-flow:row;border:5px solid rgb(145,106,145);",
    "Stylediv1div2": "width:80%;height:250px;display:flex;background-color:#ffe4b5;flex-flow:column;border:5px solid rgb(145,106,145);",
    "Stylediv1div3": "width:18%;height:100px;display:flex;background-color:#ffe4ff;flex-flow:column;border:5px solid rgb(145,106,145);",
    "Stylediv1div2div1": "width:18%;height:100px;display:flex;background-color:#ffe4ff;flex-flow:column;",
    "Stylediv1div2div2": "width:18%;height:100px;display:flex;background-color:#ffe4ff;flex-flow:column;",
    "Stylediv1div2div3": "width:18%;height:100px;display:flex;background-color:#ffe4ff;flex-flow:column;",
    "Stylediv1div4": "border-radius:25px;",
    "Stylediv1div5": "border-radius:25px;",
    "Stylediv1div6": "border-radius:25px;",
    "Stylediv1div7": "padding:5px;",
    "Stylediv1div8": "padding:5px;",
    "Stylediv1div9": "padding:5px;",
    "div1textInfoRubrik1_sv": "Koalor – Allmänt",
    "div1textInfoRubrik1_en": "Koalas – General",
    "div1div1textInfoRubrik2_sv": "Fakta om Koalor",
    "div1div1textInfoRubrik2_en": "Facts about Koalas",
    "div1div2textInfoRubrik3_sv": "Roliga fakta",
    "div1div2textInfoRubrik3_en": "Fun facts",
    "div1textInfo1_sv": "Koalor är små tåliga trädlevande djur från Australien.",
    "div1textInfo1_en": "Koalas are small, hardy, arboreal animals from Australia.",
    "div1div1textInfo2_sv": "De är kända för att äta eukalyptusblad.",
    "div1div1textInfo2_en": "They are known to eat eucalyptus leaves.",
    "div1div2textInfo3_sv": "Koalor äter nästan uteslutande eukalyptusblad.",
    "div1div2textInfo3_en": "Koalas eat almost exclusively eucalyptus leaves.",
    "div1div3textInfo4_sv": "Koalor sover upp till 20 timmar per dag.",
    "div1div3textInfo4_en": "Koalas sleep up to 20 hours per day.",
    "div1div2div1textInfo5_sv": "Koalor har starka klor för att klättra i träd.",
    "div1div2div1textInfo5_en": "Koalas have strong claws for climbing trees.",
    "div1div2div2textInfo6_sv": "Koalor kommunicerar med olika ljud, från snarkningar till skrik.",
    "div1div2div2textInfo6_en": "Koalas communicate with a variety of sounds, from snoring to screaming.",
    "div1div2div3textInfo7_sv": "test",
    "div1div2div3textInfo7_en": "test"
}
`;

const builder = new CMSUrlBuilder();
console.log(builder.JsonToUrl(JSON.parse(test)));