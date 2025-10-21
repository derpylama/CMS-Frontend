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
        editorHtml.innerHTML = html;
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
                    // Switch language
                    await loadViewer(document.documentElement.dataset.openpage, navToggleLang.checked ? "sv" : "en");
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
})
