class WonkyCMSApiWrapper {
    constructor(baseUrl = "https://elias.ntigskovde.se/") {
        this.indexUrl = baseUrl + "index.php";
        this.fetchUrl = baseUrl + "php/getinfo.php";
        this.baseUrl = baseUrl;
    }

    // === JSON FUNCTIONS ===

    JsonToUrl(json) {
          let parts = [];
      
          // === Base page info ===
          parts.push(`pageHeader=${json.header.replace(/\s+/g, "+")}+pt2`);
          parts.push(`pageLang=${json.mainPageLang || "sv"}`);
      
          // === Standard Measurements ===
          if (json.useStandardMeasurement === "true") {
            parts.push(`standardUnitWidth=${json.standardUnitWidth}`);
            parts.push(`standardUnitHeight=${json.standardUnitHeight}`);
            parts.push(`standardMeasureUnitMargin=${json.standardMeasureUnitMargin}`);
            parts.push(`standardMeasureUnitBorder=${json.standardMeasureUnitBorder}`);
            parts.push(`standardMeasureUnitFont=${json.standardMeasureUnitFont}`);
          }
      
          // === Divs ===
          const divs = this._extractDivs(json);
          for (const div of divs) {
            parts.push(`addDivToDiv[]=${div.parent}`);
            parts.push(`newDivWidth[]=${div.width}`);
            parts.push(`newDivHeight[]=${div.height}`);
            parts.push(`newDivDisplay[]=${div.display}`);
            parts.push(`newDivColor[]=%23${div.color.replace("#", "")}`);
            if (div.flow) parts.push(`newDivFlow[]=${div.flow}`);
            if (div.justify) parts.push(`newDivJustify[]=${div.justify}`);
            if (div.align) parts.push(`newDivAlign=${div.align}`);
            if (div.paddingBot) parts.push(`newDivPaddingBot[]=${div.paddingBot}`);
          }
      
          // === Text info ===
          const texts = this._extractTexts(json);
          for (const t of texts.headers) parts.push(`addTextInformationHeader[]=${t.replace(/\s+/g, "+")}`);
          for (const t of texts.divHeaders) parts.push(`addTextInformationDivHeader[]=${t}`);
          for (const t of texts.texts) parts.push(`addTextInformation[]=${t.replace(/\s+/g, "+")}`);
          for (const t of texts.textDivs) parts.push(`addTextInformationDiv[]=${t}`);
          for (const t of texts.headerSizes) parts.push(`addTextInformationHeaderSize[]=${t}`);
          for (const t of texts.textSizes) parts.push(`addTextInformationSize[]=${t}`);
          for (const t of texts.headerColors) parts.push(`addTextInformationHeaderColor[]=${t}`);
          for (const t of texts.textColors) parts.push(`addTextInformationColor[]=${t}`);
      
          // === Images ===
          if (json.images) {
            for (const img of json.images) {
              parts.push(`addImage[]=${img.src}`);
              parts.push(`addImageDiv[]=${img.div}`);
              parts.push(`addImageDisplay[]=${img.display}`);
              parts.push(`addImageWidth[]=${img.width}`);
              parts.push(`addImageHeight[]=${img.height}`);
              if (img.borderRadius) parts.push(`addImageBorderRadius[]=${img.borderRadius}`);
            }
          }
      
          return `${this.baseUrl}?${parts.join("&")}`;
        }
      
        _extractDivs(json) {
          const divs = [];
          for (const key in json) {
            if (key.startsWith("Stylediv")) {
              const css = json[key];
              const width = this._getCSSValue(css, "width")?.replace("%", "") || "100";
              const height = this._getCSSValue(css, "height")?.replace("px", "") || "100";
              const display = this._getCSSValue(css, "display") || "flex";
              const color = this._getCSSValue(css, "background-color") || "#ffffff";
              const flow = this._getCSSValue(css, "flex-flow");
              const justify = this._getCSSValue(css, "justify-content");
              const align = this._getCSSValue(css, "align-items");
              const paddingBot = this._getCSSValue(css, "padding-bottom")?.replace("px", "");
      
              let parent = "div1";
              if (key.includes("div1div2div")) parent = "div3";
              else if (key.includes("div1div2")) parent = "div2";
              else if (key.includes("div1div1")) parent = "div2";
      
              divs.push({ parent, width, height, display, color, flow, justify, align, paddingBot });
            }
          }
          return divs;
        }
      
        _extractTexts(json) {
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
              divHeaders.push(key.replace(/textInfoRubrik\d+_sv$/, ""));
            }
          }
      
          const textRegex = /(textInfo\d+_sv)$/;
          for (const key in json) {
            if (textRegex.test(key)) {
              texts.push(json[key]);
              textDivs.push(key.replace(/textInfo\d+_sv$/, ""));
            }
          }
      
          // Pull style sizes/colors
          Object.keys(json).forEach((k) => {
            if (k.startsWith("StyletextInfoRubrik")) {
              const css = json[k];
              const fs = this._getCSSValue(css, "font-size")?.replace("px", "");
              const col = this._getCSSValue(css, "color");
              if (fs) headerSizes.push(fs);
              if (col) headerColors.push(col);
            } else if (k.startsWith("StyletextInfo")) {
              const css = json[k];
              const fs = this._getCSSValue(css, "font-size")?.replace("px", "");
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
      

    async FetchJson(pageKey) {
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
		const result = {};
		// Inject "useStandardMeasurement" set to true
		result.useStandardMeasurement = "true";
		result.mainPageLang = "sv";

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
                    console.error('JSON parse error:', e);
                }
            })
            .catch(err => {
                console.error('Request error:', err);
            });

        return result;

    } // Returns {"<pageKey>": {"header": "<header>", ...data...}, ...}

    async RemovePage(pageKey) {}

    async CreatePage(html) {} // Returns new pageKey (to get new pageKey find matching header in FetchAllPages response)

    async ReplacePage(pageKey, html) {}
}

// Test HTMLToJson

HTML = `
<div style="width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:space-around;padding-bottom:25px;">
    <h3 style="font-size:36px;color:#005500;">Koalor – Allmänt</h3>
    <p style="font-size:18px;color:#003300;">Koalor är små tåliga trädlevande djur från Australien.</p>
    <img style="width:100%;height:250px;height:250;border-radius:10;border-radius:10;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/4/49/Koala_climbing_tree.jpg" alt="Image">
    <div style="width:80%;height:300px;display:flex;background-color:#a3d9a5;flex-flow:row;">
        <h3 style="font-size:28px;color:#006633;">Fakta om Koalor</h3>
        <p style="font-size:16px;color:#666600;">De är kända för att äta eukalyptusblad.</p>
        <p style="font-size:18px;color:#ff6600;">Koalor äter nästan uteslutande eukalyptusblad.</p>
        <img style="width:80%;height:200px;height:200;border-radius:15;border-radius:15;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Koala_eating_eucalyptus_leaf.jpg" alt="Image">
    </div>
    <div style="width:80%;height:250px;display:flex;background-color:#ffe4b5;flex-flow:column;">
        <h3 style="font-size:24px;color:green;">Roliga fakta</h3>
        <p style="font-size:16px;color:#005500;">Koalor sover upp till 20 timmar per dag.</p>
        <p style="font-size:14px;">Koalor har starka klor för att klättra i träd.</p>
        <p style="">Koalor kommunicerar med olika ljud, från snarkningar till skrik.</p>
        <p style="">test</p>
        <img style="width:90%;height:180px;height:180;border-radius:20;border-radius:20;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/0/08/Koala_sleeping_in_tree.jpg" alt="Image"><img style="width:70%;height:140px;height:140;border-radius:25;border-radius:25;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/1/14/Koala_close_up.jpg" alt="Image">
    </div>
</div>
`;

const wrapper = new WonkyCMSApiWrapper();
// const json = wrapper.HTMLToJson(HTML);
// const url = wrapper.JsonToUrl(json);

// // Show url in pre tag appended to body
// const pre = document.createElement('pre');
// pre.textContent = url;
// // If document is not loaded schedule an anonymous function to run on load
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => {
//         document.body.appendChild(pre);
//     });
// }

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

const url = wrapper.JsonToUrl(JSON.parse(test));

const pre = document.createElement('pre');
pre.textContent = url;
// If document is not loaded schedule an anonymous function to run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(pre);
    });
}
// Else append immediately
else {
    document.body.appendChild(pre);
}