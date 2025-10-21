const frapi = new WonkyCMSApiHandlerFrontend();

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
        editorHtml.value = html;
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

    // when value of editorHtml changes set editorPreview.srcdoc to it
    editorHtml.addEventListener("input", (e) => {
        editorPreview.srcdoc = editorHtml.value;
    });

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
                    var newPageId = await frapi.ReplacePageUsingHtml(document.documentElement.dataset.openpage, editorHtml.value, ((editorInputHeader.value === null || editorInputHeader.value.trim() === "") ? null : editorInputHeader.value.trim()), navToggleLang.checked ? "sv" : "en");
                    console.log(frapi.HtmlToJson(editorHtml.value, editorInputHeader.value))
                    
                    document.documentElement.dataset.openpage = newPageId;
                    // Switch language
                    await loadViewer(newPageId, navToggleLang.checked ? "sv" : "en");
                    editorPreview.srcdoc = editorHtml.value;
                } else {
                    // Switch language
                    await loadViewer(document.documentElement.dataset.openpage, navToggleLang.checked ? "sv" : "en");
                    editorPreview.srcdoc = editorHtml.value;
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
            editorPreview.srcdoc = editorHtml.value;
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
        editorHtml.value = "";
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
                    editorHtml.value,
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
            var newPageId = await frapi.ReplacePageUsingHtml(document.documentElement.dataset.openpage, editorHtml.value, ((editorInputHeader.value === null || editorInputHeader.value.trim() === "") ? null : editorInputHeader.value.trim()), navToggleLang.checked ? "sv" : "en");
            console.log(frapi.HtmlToJson(editorHtml.value, editorInputHeader.value))
                    
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
})