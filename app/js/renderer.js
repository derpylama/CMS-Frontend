const viewButton = document.getElementById("top-button-view")
const editButton = document.getElementById("top-button-edit")
const createPageButton = document.getElementById("top-button-create-page")
const defaultCon = document.getElementById("view-container")
const cons = document.querySelectorAll(".cons")
const loadButton = document.getElementById("load-previews")

function resetButtons() {
    [viewButton, editButton, createPageButton].forEach(button => {
        button.classList.remove("button-highlighted")
    });
}

function selectButton(button) {
    console.log("Selecting button:", button);
    button.classList.add("button-highlighted")
}

editButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("edit-container").style.display = "block"
    resetButtons()
    selectButton(document.getElementById("top-button-edit"))
})

viewButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("view-container").style.display = "flex"
    resetButtons()
    selectButton(document.getElementById("top-button-view")) 
})

createPageButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("create-page-container").style.display = "block"
    resetButtons()
    selectButton(document.getElementById("top-button-create-page"))
    
})

window.addEventListener("DOMContentLoaded", async (e) => {
    var previewCon = document.getElementById("view-container");
    var preview = await window.IPC.getPreviews();
    console.log(preview);

    for(const [key, contentPreview] of Object.entries(preview)){
        var div = document.createElement("div");
        div.classList.add("previews")

        var h2 = document.createElement("h2");
        h2.innerText = contentPreview["header"];

        var p = document.createElement("p");
        p.innerText = contentPreview["preview"];

        div.appendChild(h2);
        div.appendChild(p);

        previewCon.appendChild(div);
    }
    var frontApi = new WonkyCMSApiHandlerFrontend();

//     html = `
// <div style="width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:space-around;padding-bottom:25px;">
//         <h3 style="font-size:36px;color:#005500;">Koalor – Allmänt</h3>
//         <p style="font-size:18px;color:#003300;">Koalor är små tåliga trädlevande djur från Australien.</p>
//         <img style="width:100%;height:250px;height:250;border-radius:10;border-radius:10;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/4/49/Koala_climbing_tree.jpg" alt="Image">
//         <div style="width:80%;height:300px;display:flex;background-color:#a3d9a5;flex-flow:row;">
//           <h3 style="font-size:28px;color:#006633;">Fakta om Koalor</h3>
//           <p style="font-size:16px;color:#666600;">De är kända för att äta eukalyptusblad.</p>
//           <p style="font-size:18px;color:#ff6600;">Koalor äter nästan uteslutande eukalyptusblad.</p>
//           <img style="width:80%;height:200px;height:200;border-radius:15;border-radius:15;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Koala_eating_eucalyptus_leaf.jpg" alt="Image">
//         </div>
//         <div style="width:80%;height:250px;display:flex;background-color:#ffe4b5;flex-flow:column;">
//           <h3 style="font-size:24px;color:green;">Roliga fakta</h3>
//           <p style="font-size:16px;color:#005500;">Koalor sover upp till 20 timmar per dag.</p>
//           <p style="font-size:14px;">Koalor har starka klor för att klättra i träd.</p>
//           <p style="">Koalor kommunicerar med olika ljud, från snarkningar till skrik.</p>
//           <p style="">test</p>
//           <img style="width:90%;height:180px;height:180;border-radius:20;border-radius:20;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/0/08/Koala_sleeping_in_tree.jpg" alt="Image">
//           <img style="width:70%;height:140px;height:140;border-radius:25;border-radius:25;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/1/14/Koala_close_up.jpg" alt="Image">
//         </div>
//        </div>
//      `;

    // frontApi.CreatePageUsingHtml(html, "testing", "sv")

    // frontApi.removePage("page158")

})
