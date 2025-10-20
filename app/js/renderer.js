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
    // Setup navigation buttons
    const navGoBackBtn = document.getElementById("nav-go-back");
    const navToggleViewerEditor = document.getElementById("nav-toggle-viewer-editor");
    const navToggleLang = document.getElementById("nav-toggle-lang");
    const navCreatePageBtn = document.getElementById("nav-create-page");

    const editorInputHeader = document.getElementById("editor-input-header");
    const editorHtml = document.getElementById("editor-html");

    navToggleLang.addEventListener("change", async (e) => {
        // If in edit ask first
        if (document.documentElement.getAttribute("data-page") === "editor") {
            window.IPC.showChoice({
                "title": "Save before changing language?",
                "message": "Changing the language will discard unsaved changes. Do you want to save before proceeding?",
                "buttons": ["Yes", "Cancel"],
                "defaultId": 0,
                "cancelId": 1
            }).then((response) => {
                // 0 = Yes
                // 1 = Cancel/ClosedPopup

                if (response === 0) {
                    // MARK: Save changes
                } else {
                    // Revert toggle
                    navToggleLang.checked = !navToggleLang.checked;

                    // Exit function
                    return;
                }
            });
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
            document.documentElement.setAttribute("data-page", "editor-edit");
        } else {
            // Changes to viewer mode
            document.documentElement.setAttribute("data-page", "viewer");
        }
    });

    navCreatePageBtn.addEventListener("click", async (e) => {
        editorHtml.value = "";
        editorInputHeader.value = "";
        document.documentElement.setAttribute("data-page", "editor-create");
    });

    navGoBackBtn.addEventListener("click", async (e) => {
        navToggleViewerEditor.checked = false;
        if (document.documentElement.getAttribute("data-page") !== "pages") {
            document.documentElement.setAttribute("data-page", "pages");
        }
    });

    // Editor navigaton
    const editorCancelBtn = document.getElementById("editor-cancel");
    editorCancelBtn.addEventListener("click", async (e) => {
        document.documentElement.setAttribute("data-page", "pages");
    });
    const editorSaveBtn = document.getElementById("editor-save");
    editorSaveBtn.addEventListener("click", async (e) => {
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
        document.documentElement.setAttribute("data-page", "pages");
    });

    // Load previews
    const previewContainer = document.getElementById("previews-container");
    const header = document.getElementById("header");
    const contentCon = document.getElementById("content-container");
    
    
    var previews = await frapi.GetPreviewOfPages();
    
    for (const [key, contentPreview] of Object.entries(previews)) {
        const div = document.createElement("div");
        div.classList.add("previews");
        div.dataset.id = key;
        
        div.addEventListener("click", async (e) => {
            const data = await frapi.GetPage(key);
            
            header.innerText = data.header;

            var html = frapi.JsonToHtml(data, document.documentElement.dataset.lang);
            contentCon.innerHTML = html;
            editorHtml.innerHTML = html;
            editorInputHeader.value = data.header;

            
            document.documentElement.setAttribute("data-page", "viewer");
        });

        const h2 = document.createElement("h2");
        h2.innerText = contentPreview["header"];

        const p = document.createElement("p");
        p.innerText = contentPreview["preview"];

        div.appendChild(h2);
        div.appendChild(p);

        previewContainer.appendChild(div);
    }



})
