const frapi = new WonkyCMSApiHandlerFrontend();
let editor;
function alertW(msg) {
    window.IPC.showChoice({
        "title": "CMS Frontend",
        "message": msg,
        "buttons": ["OK"],
        "defaultId": 0,
        "cancelId": 1
    }).then((response) => {
        return;
    });
}

window.addEventListener("DOMContentLoaded", async (e) => {
    // Setup theme
    const preferedTheme = await window.IPC.getPreferedTheme();
    if (preferedTheme === "system") {
        // Use system theme
        document.documentElement.setAttribute("data-theme", window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
    } else {
        document.documentElement.setAttribute("data-theme", preferedTheme);
    }

    // When system theme changes and preferedTheme is system update theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (preferedTheme === "system") {
            document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
            
            if (editor){
                monaco.editor.setTheme(e.matches ? "vs-dark" : "vs");
            }
            
        }
    });


    // Setup navigation buttons
    const navGoBackBtn = document.getElementById("nav-go-back");
    const navToggleViewerEditor = document.getElementById("nav-toggle-viewer-editor");
    const navToggleViewerEditorLabel = document.getElementById("nav-toggle-viewer-editor-text");   
    const navToggleLang = document.getElementById("nav-toggle-lang");
    const navCreatePageBtn = document.getElementById("nav-create-page");

    const editorInputHeader = document.getElementById("editor-input-header");
    const editorHtml = document.getElementById("editor-html");
    const editorPreview = document.getElementById("editor-preview");
    const editorDeletePage = document.getElementById("editor-delete-page");

    async function loadViewer(key, lang) {
        document.documentElement.dataset.openpage = key;

        const contentCon = document.getElementById("content-container");

        const data = await frapi.GetPage(key);
                
        //header.innerText = data.header;
        // Get the content of the first title element under head
        const titleElement = document.getElementsByTagName("title")[0];
        let usedHeader = data.header;
        if (!data.header || data.header.trim() === "") {
            usedHeader = key.charAt(0).toUpperCase() + key.slice(1);
        }
        window.IPC.setWindowTitle(titleElement.innerText + " - " + usedHeader);

        var html = frapi.JsonToHtml(data, lang);
        contentCon.innerHTML = html;
        editor.setValue(html);
        editorInputHeader.value = data.header;
    }

    async function loadPreviews(lang) {
        const previewContainer = document.getElementById("previews-container");
    
        previewContainer.innerHTML = "";
        
        var previews = await frapi.GetPreviewOfPages(100, lang);
        
        for (const [key, contentPreview] of Object.entries(previews)) {
            const div = document.createElement("div");
            div.classList.add("preview");
            div.dataset.id = key;
            
            div.addEventListener("click", async (e) => {
                await loadViewer(key, lang);

                navToggleViewerEditorLabel.innerText = "Editor";
                document.documentElement.setAttribute("data-page", "viewer");
                window.scrollTo(0, 0); // Scroll to page top
            });
    
            const h2 = document.createElement("h2");
            h2.innerText = contentPreview["header"];
    
            const p = document.createElement("p");
            p.innerText = contentPreview["preview"];
    
            div.appendChild(h2);
            div.appendChild(p);
    
            previewContainer.appendChild(div);
        }
    }



    navToggleLang.addEventListener("change", async (e) => {
        // If in edit ask first
        if (document.documentElement.getAttribute("data-page") === "editor" || document.documentElement.getAttribute("data-page") === "editor-edit") {
            window.IPC.showChoice({
                "title": "Save before changing language?",
                "message": "Changing the language will discard unsaved changes. Do you want to save before proceeding?",
                "buttons": ["Yes", "No"],
                "defaultId": 0,
                "cancelId": 1
            }).then(async (response) => {
                // 0 = Yes
                // 1 = Cancel/ClosedPopup

                if (response === 0) {
                    // MARK: Save changes
                    // update document.documentElement.dataset.openpage with new page id
                    var newPageId = await frapi.ReplacePageUsingHtml(document.documentElement.dataset.openpage, editor.getValue(), ((editorInputHeader.value === null || editorInputHeader.value.trim() === "") ? null : editorInputHeader.value.trim()), navToggleLang.checked ? "sv" : "en");
                    console.log(frapi.HtmlToJson(editor.getValue(), editorInputHeader.value))
                    
                    document.documentElement.dataset.openpage = newPageId;
                    // Switch language
                    await loadViewer(document.documentElement.dataset.openpage, navToggleLang.checked ? "sv" : "en");
                    editorPreview.srcdoc = editor.getValue()
                } else {
                    // Switch language
                    await loadViewer(document.documentElement.dataset.openpage, navToggleLang.checked ? "sv" : "en");
                    editorPreview.srcdoc = editor.getValue()
                }
            });
        }

        // If in pages reload previews in selected language
        if (document.documentElement.getAttribute("data-page") === "pages") {
            await loadPreviews(navToggleLang.checked ? "sv" : "en");
        }

        // If in viewer reload viewer with selected language and document.documentElement.dataset.openpage = key;
        if (document.documentElement.getAttribute("data-page") === "viewer") {
            await loadViewer(document.documentElement.dataset.openpage, navToggleLang.checked ? "sv" : "en");
        }

        if (navToggleLang.checked) {
            document.documentElement.setAttribute("data-lang", "sv");
        } else {
            document.documentElement.setAttribute("data-lang", "en");
        }
    });

    navToggleViewerEditor.addEventListener("change", async (e) => {
        if (navToggleViewerEditor.checked) {
            // Changes to editor mode
            navToggleViewerEditorLabel.innerText = "Viewer";
            editorPreview.srcdoc = editor.getValue()
            editorSaveBtn.innerText = "Save changes";
            document.documentElement.setAttribute("data-page", "editor-edit");
            window.scrollTo(0, 0); // Scroll to page top
        } else {
            // Changes to viewer mode
            navToggleViewerEditorLabel.innerText = "Editor";
            document.documentElement.setAttribute("data-page", "viewer");
            window.scrollTo(0, 0); // Scroll to page top
        }
    });

    navCreatePageBtn.addEventListener("click", async (e) => {
        editor.setValue("");
        editorInputHeader.value = "";
        editorSaveBtn.innerText = "Create page";
        document.documentElement.setAttribute("data-page", "editor-create");
        window.scrollTo(0, 0); // Scroll to page top
    });

    navGoBackBtn.addEventListener("click", async (e) => {
        const titleElement = document.getElementsByTagName("title")[0];
        window.IPC.setWindowTitle(titleElement.innerText);

        navToggleViewerEditor.checked = false;
        if (document.documentElement.getAttribute("data-page") !== "pages") {
            await loadPreviews(document.documentElement.dataset.lang); // Load previews
            document.documentElement.setAttribute("data-page", "pages");
            window.scrollTo(0, 0); // Scroll to page top
        }
    });

    // Editor navigaton
    const editorCancelBtn = document.getElementById("editor-cancel");
    editorCancelBtn.addEventListener("click", async (e) => {
        // If in create new page mode
        if (document.documentElement.getAttribute("data-page") === "editor-create") {
            await loadPreviews(document.documentElement.dataset.lang); // Load previews
            document.documentElement.setAttribute("data-page", "pages");
            window.scrollTo(0, 0); // Scroll to page top
        }

        // If in edit mode
        if (document.documentElement.getAttribute("data-page") === "editor-edit") {
            // Return to pages
            await loadViewer(document.documentElement.dataset.openpage, document.documentElement.dataset.lang);
            navToggleViewerEditor.checked = false;
            navToggleViewerEditorLabel.innerText = "Editor";
            document.documentElement.setAttribute("data-page", "viewer");
            window.scrollTo(0, 0); // Scroll to page top
        }
    });
    const editorSaveBtn = document.getElementById("editor-save");
    editorSaveBtn.addEventListener("click", async (e) => {
        // If in create new page mode
        if (document.documentElement.getAttribute("data-page") === "editor-create") {
            const editorSelectLang = document.getElementById("editor-select-lang");

            if (editorInputHeader.value.trim() === "") {
                alertW("Header cannot be empty.");
                return;
            }

            // Save page
            try {
                await frapi.CreatePageUsingHtml(
                    editor.getValue(),
                    editorInputHeader.value.trim(),
                    editorSelectLang.value
                );
            } catch (err) {
                alertW("Error saving page: " + err.message);
                return;
            }

            // Return to pages
            await loadPreviews(document.documentElement.dataset.lang); // Load previews
            document.documentElement.setAttribute("data-page", "pages");
            window.scrollTo(0, 0); // Scroll to page top
        }

        // If in edit mode
        if (document.documentElement.getAttribute("data-page") === "editor-edit") {
            if (editorInputHeader.value.trim() === "") {
                alertW("Header cannot be empty.");
                return;
            }

            // MARK: Save changes
            // update document.documentElement.dataset.openpage with new page id
            var newPageId = await frapi.ReplacePageUsingHtml(document.documentElement.dataset.openpage, editor.getValue(), ((editorInputHeader.value === null || editorInputHeader.value.trim() === "") ? null : editorInputHeader.value.trim()), navToggleLang.checked ? "sv" : "en");
            console.log(frapi.HtmlToJson(editor.getValue(), editorInputHeader.value))
                    
            document.documentElement.dataset.openpage = newPageId;
            // Return to pages
            await loadViewer(document.documentElement.dataset.openpage, document.documentElement.dataset.lang);
            navToggleViewerEditor.checked = false;
            navToggleViewerEditorLabel.innerText = "Editor";
            document.documentElement.setAttribute("data-page", "viewer");
            window.scrollTo(0, 0); // Scroll to page top
        }
    });

    editorDeletePage.addEventListener("click", async (e) => {
        // Confirm deletion
        window.IPC.showChoice({
            "title": "Confirm Deletion",
            "message": "Are you sure you want to delete this page? This action cannot be undone.",
            "buttons": ["Delete", "Cancel"],
            "defaultId": 1,
            "cancelId": 1
        }).then(async (response) => {
            // 0 = Delete
            // 1 = Cancel/ClosedPopup

            if (response === 0) {
                // Delete page
                try {
                    await frapi.RemovePage(document.documentElement.dataset.openpage, true);
                } catch (err) {
                    alertW("Error deleting page: " + err.message);
                    return;
                }

                // Return to pages
                const titleElement = document.getElementsByTagName("title")[0];
                window.IPC.setWindowTitle(titleElement.innerText);

                await loadPreviews(document.documentElement.dataset.lang); // Load previews
                document.documentElement.setAttribute("data-page", "pages");
                window.scrollTo(0, 0); // Scroll to page top
            } else {
                // Do nothing
                return;
            }
        });
    });

    // Load previews
    await loadPreviews(document.documentElement.dataset.lang);


    function updatePreview(html) {
        editorPreview.srcdoc = html;
    }


    
    //MARK: Validator 

    function getLineAndColumnFromIndex(text, index) {
        const lines = text.split(/\n/);
        let currentIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 for '\n'
            if (index < currentIndex + lineLength) {
                return {
                    lineNumber: i + 1,
                    column: index - currentIndex + 1
                };
            }
            currentIndex += lineLength;
        }

        // Fallback to last line
        const lastLine = lines.length;
        return {
            lineNumber: lastLine,
            column: lines[lastLine - 1].length + 1
        };
    }

    // Main HTML validation function
    function validateHtml(html) {
        const errors = [];

        // Collect errors from specialized validators
        errors.push(...validateTags(html));
        errors.push(...validateInlineStyles(html));
        errors.push(...validateTextContent(html));

        // Later you can add more, like:
        // errors.push(...validateAttributes(html));
        // errors.push(...validateNesting(html));

        return errors;
    }

    function validateTextContent(html) {
        const errors = [];
        const tagRegex = /<\s*(\/?)([a-zA-Z0-9-]+)([^>]*)>/g;
        let match;
        let lastIndex = 0;
        const openTags = [];

        while ((match = tagRegex.exec(html))) {
            const textContent = html.slice(lastIndex, match.index);
            const trimmedText = textContent.trim();

            // Only check text if it’s non-empty
            if (trimmedText.length > 0) {
                const parentTag = openTags.length ? openTags[openTags.length - 1] : null;
                if (!parentTag || !["p", "h3"].includes(parentTag.tag)) {
                    const start = getLineAndColumnFromIndex(html, lastIndex);
                    const end = getLineAndColumnFromIndex(html, match.index);
                    errors.push({
                        type: "invalid-text",
                        message: `Text must only be inside <p> or <h3> tags.`,
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        severity: monaco.MarkerSeverity.Error
                    });
                }
            }

            // Track opening/closing tags
            const isClosing = match[1] === "/";
            const tag = match[2].toLowerCase();
            if (!isClosing && tag !== "img") {
                openTags.push({ tag });
            } else if (isClosing) {
                const lastOpen = openTags.findLast(t => t.tag === tag);
                if (lastOpen) openTags.splice(openTags.indexOf(lastOpen), 1);
            }

            lastIndex = match.index + match[0].length;
        }

        // Check any remaining text after the last tag
        const remainingText = html.slice(lastIndex).trim();
        if (remainingText.length > 0) {
            const parentTag = openTags.length ? openTags[openTags.length - 1] : null;
            if (!parentTag || !["p", "h3"].includes(parentTag.tag)) {
                const start = getLineAndColumnFromIndex(html, lastIndex);
                const end = getLineAndColumnFromIndex(html, html.length);
                errors.push({
                    type: "invalid-text",
                    message: `Text must only be inside <p> or <h3> tags.`,
                    startLineNumber: start.lineNumber,
                    startColumn: start.column,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column,
                    severity: monaco.MarkerSeverity.Error
                });
            }
        }

        return errors;
    }


    // --- Tag validation ---
    function validateTags(html) {
        const allowedTags = new Set(["div", "p", "h3", "img"]);
        const errors = [];
        const tagRegex = /<\s*(\/?)([a-zA-Z0-9-]+)([^>]*)>/g;
        let match;

        const openTags = []; // stack to track unclosed tags

        while ((match = tagRegex.exec(html))) {
            const fullMatch = match[0];
            const isClosing = match[1] === "/";
            const tag = match[2].toLowerCase();
            const tagStart = match.index;
            const tagEnd = match.index + fullMatch.length;

            // === 1️⃣ Invalid tag check ===
            if (!allowedTags.has(tag)) {
                const start = getLineAndColumnFromIndex(html, tagStart);
                const end = getLineAndColumnFromIndex(html, tagEnd);
                errors.push({
                    type: "invalid-tag",
                    message: `Tag <${tag}> is not allowed.`,
                    startLineNumber: start.lineNumber,
                    startColumn: start.column,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column,
                    severity: monaco.MarkerSeverity.Error
                });
                continue;
            }

            // === 2️⃣ Handle <img> special case ===
            if (tag === "img" && !isClosing) {
                // valid if ends with > or /> (self-closing)
                if (!/\/?>$/.test(fullMatch)) {
                    const start = getLineAndColumnFromIndex(html, tagStart);
                    const end = getLineAndColumnFromIndex(html, tagEnd);
                    errors.push({
                        type: "unclosed-img",
                        message: `<img> tag must be self-closed with '>' or '/>'.`,
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        severity: monaco.MarkerSeverity.Error
                    });
                }
                continue; // skip normal open/close checks
            }

            // === 3️⃣ Handle opening and closing tags ===
            if (!isClosing) {
                openTags.push({ tag, index: tagStart, matchText: fullMatch });
            } else {
                const lastOpen = openTags.findLast(t => t.tag === tag);
                if (lastOpen) {
                    openTags.splice(openTags.indexOf(lastOpen), 1);

                    // Check for empty content
                    const innerContent = html
                        .slice(lastOpen.index + lastOpen.matchText.length, tagStart)
                        .trim();
                    if (innerContent.length === 0) {
                        const start = getLineAndColumnFromIndex(html, lastOpen.index);
                        const end = getLineAndColumnFromIndex(html, tagEnd);
                        errors.push({
                            type: "empty-tag",
                            message: `Tag <${tag}> cannot be empty.`,
                            startLineNumber: start.lineNumber,
                            startColumn: start.column,
                            endLineNumber: end.lineNumber,
                            endColumn: end.column,
                            severity: monaco.MarkerSeverity.Error
                        });
                    }
                } else {
                    const start = getLineAndColumnFromIndex(html, tagStart);
                    const end = getLineAndColumnFromIndex(html, tagEnd);
                    errors.push({
                        type: "orphan-close",
                        message: `Closing tag </${tag}> has no matching opening tag.`,
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        severity: monaco.MarkerSeverity.Warning
                    });
                }
            }
        }

        // === 4️⃣ Check for unclosed tags ===
        for (const open of openTags) {
            const start = getLineAndColumnFromIndex(html, open.index);
            const end = getLineAndColumnFromIndex(html, open.index + open.matchText.length);
            errors.push({
                type: "unclosed-tag",
                message: `Tag <${open.tag}> is missing a closing </${open.tag}>.`,
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
                severity: monaco.MarkerSeverity.Warning
            });
        }

        return errors;
    }


    // --- Inline style validation ---
    function validateInlineStyles(html) {
        const allowedCSS = {
            p: new Set(['font-size', 'color', 'display', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-transform']),
            h3: new Set(['font-size', 'color', 'display', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-transform']),
            div: new Set(['width', 'height', 'display', 'background-color', 'flex-flow', 'align-items', 'justify-content', 'border', 'border-radius', 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'background-image']),
            img: new Set(['width', 'height', 'border-radius', 'display'])
        };

        const errors = [];
        const tagRegex = /<\s*(\/?)([a-zA-Z0-9-]+)([^>]*)>/g;
        let match;

        while ((match = tagRegex.exec(html))) {
            const tag = match[2].toLowerCase();
            const styleMatch = /style\s*=\s*"([^"]*)"/.exec(match[3]);
            if (!styleMatch) continue;

            const styles = styleMatch[1]
                .split(";")
                .map(s => s.trim())
                .filter(Boolean);

            for (const s of styles) {
                const [prop] = s.split(":").map(x => x.trim());
                if (!allowedCSS[tag]?.has(prop)) {
                    const propIndex = html.indexOf(prop, match.index);
                    const start = getLineAndColumnFromIndex(html, propIndex);
                    const end = getLineAndColumnFromIndex(html, propIndex + prop.length);
                    errors.push({
                        type: "invalid-style",
                        message: `CSS property "${prop}" not allowed on <${tag}>.`,
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        severity: monaco.MarkerSeverity.Error
                    });
                }
            }
        }

        return errors;
    }





    //monaco editor creation //MARK: Monaco loader 
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.41.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('editor-html-container'), {
            value: `No value loaded.`,
            language: "html",
            theme: (document.documentElement.dataset.theme === "dark" ? "vs-dark" : "vs"),
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: true }
        });


        // Debounce helper function to limit validation frequency
        function debounce(fn, delay) {
            let timer;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        }

        // Debounced validation
        const runValidation = debounce(() => {
            const value = editor.getValue();
            const errors = validateHtml(value);

            // Set Monaco markers
            const markers = errors.map(err => ({
                startLineNumber: err.startLineNumber,
                startColumn: err.startColumn,
                endLineNumber: err.endLineNumber,
                endColumn: err.endColumn,
                message: err.message,
                severity: err.severity
            }));
            monaco.editor.setModelMarkers(editor.getModel(), "html-validator", markers);

            // Only update preview if there are no errors
            if (errors.length === 0) {
                updatePreview(value); // pass the current HTML
            }
        }, 300);

        // Trigger validation on editor changes
        editor.onDidChangeModelContent(runValidation);

        // Optionally run validation once on load
        runValidation();
    });



})



//     const example = `
// {
//     "header": "Allt om Koalor",
//     "standardUnitWidth": "%",
//     "standardUnitHeight": "px",
//     "standardMeasureUnitMargin": "px",
//     "standardMeasureUnitBorder": "px",
//     "standardMeasureUnitFont": "px",
//     "mainPageLang": "sv",
//     "secondaryPageLang": "en",
//     "StyletextInfoRubrik1": "font-size:36px;color:#005500;",
//     "StyletextInfoRubrik2": "font-size:28px;color:#006633;",
//     "StyletextInfo1": "font-size:18px;color:#003300;",
//     "StyletextInfo2": "font-size:16px;color:#666600;",
//     "StyletextInfo3": "font-size:14px;color:#000000;",
//     "Stylediv1": "width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:center;align-items:center;padding-top:25px;",
//     "Stylediv1div1": "width:100%;height:400px;display:flex;background-color:#a3d9a5;flex-flow:row;justify-content:space-around;background-image:linear-gradient(360deg, #a3d9a5,#d6d6d6);",
//     "Stylediv1div1div1": "width:300px;height:250px;display:flex;flex-flow:column;align-items:center;border:3px solid rgb(48, 129, 51);border-radius:40px;padding:25px;margin-top:25px;",
//     "Stylediv1div1div2": "width:300px;height:250px;display:flex;flex-flow:column;align-items:center;border:3px solid rgb(48, 129, 51);border-radius:40px;padding:25px;margin-top:25px;",
//     "Stylediv1div2": "width:100%;height:250px;display:flex;background-color:#a3d9a5;flex-flow:column;padding-bottom:25px;",
//     "Stylediv1div2div1": "width:100%;height:200px;display:flex;background-color:#a3d9a5;flex-flow:row;justify-content:space-around;align-items:center;",
//     "Stylediv1div2div2": "width:100%;height:200px;display:flex;background-color:#a3d9a5;flex-flow:row;justify-content:space-around;align-items:center;",
//     "Stylediv1div2div2div1": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
//     "Stylediv1div2div2div2": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
//     "Stylediv1div2div2div3": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
//     "Stylediv1div2div2div4": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
//     "Styleimage1": "width:150px;height:auto;border-radius:10px;display:block;",
//     "Styleimage2": "width:200px;height:auto;border-radius:10px;display:block;",
//     "div1textInfoRubrik1_sv": "Koalor – Allmänt",
//     "div1textInfoRubrik1_en": "Koalas – General",
//     "div1div1div1textInfoRubrik2_sv": "Fakta om Koalor",
//     "div1div1div1textInfoRubrik2_en": "Facts about Koalas",
//     "div1div1div2textInfoRubrik2_sv": "Fakta om Koalor",
//     "div1div1div2textInfoRubrik2_en": "Facts about Koalas",
//     "div1div2div1textInfoRubrik3_sv": "Roliga fakta",
//     "div1div2div1textInfoRubrik3_en": "Fun facts",
//     "div1textInfo1_sv": "Koalor är små tåliga trädlevande djur från Australien.",
//     "div1textInfo1_en": "Koalas are small, hardy, arboreal animals from Australia.",
//     "div1div1div1textInfo2_sv": "De klättrar ofta i träd.",
//     "div1div1div1textInfo2_en": "They often climb trees.",
//     "div1div1div2textInfo2_sv": "De är kända för att äta eukalyptusblad.",
//     "div1div1div2textInfo2_en": "They are known to eat eucalyptus leaves.",
//     "div1div2div2div1textInfo3_sv": "Koalor äter nästan uteslutande eukalyptusblad.",
//     "div1div2div2div1textInfo3_en": "Koalas eat almost exclusively eucalyptus leaves.",
//     "div1div2div2div2textInfo3_sv": "Koalor sover upp till 20 timmar per dag.",
//     "div1div2div2div2textInfo3_en": "Koalas sleep up to 20 hours per day.",
//     "div1div2div2div3textInfo3_sv": "Koalor har starka klor för att klättra i träd.",
//     "div1div2div2div3textInfo3_en": "Koalas have strong claws for climbing trees.",
//     "div1div2div2div4textInfo3_sv": "Koalor kommunicerar med olika ljud, från snarkningar till skrik.",
//     "div1div2div2div4textInfo3_en": "Koalas communicate with a variety of sounds, from grunts to bellows.",
//     "div1div1div1image1": "https:\/\/upload.wikimedia.org\/wikipedia\/commons\/4\/49\/Koala_climbing_tree.jpg",
//     "div1div1div2image2": "https:\/\/upload.wikimedia.org\/wikipedia\/commons\/thumb\/9\/90\/Koala_in_Zoo_Duisburg.jpg\/500px-Koala_in_Zoo_Duisburg.jpg"
// }
//     `;

//     const jsonobj = JSON.parse(example);

//     const html = frapi.JsonToHtml(jsonobj, "sv");

//     const jsonobj2 = frapi.HtmlToJson(html, jsonobj.header, "sv");

//     const url = await frapi.JsonToUrl(jsonobj2);

//     console.log(url);
//})
