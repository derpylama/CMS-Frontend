const viewButton = document.getElementById("top-button-view")
const editButton = document.getElementById("top-button-edit")
const createPageButton = document.getElementById("top-button-create-page")
const defaultCon = document.getElementById("view-container")
const cons = document.querySelectorAll(".cons")

var buttonsCon = document.getElementsByClassName("topbar-button-container")[0]

function resetButtons() {
    [viewButton, editButton, createPageButton].forEach(button =>{
        button.style.borderBottom = "none"
        button.style.color = ""
    });
}
function selectButton(button) {
    button.style.borderBottom = "solid var(--highlighted-border-width)"
    button.style.color = "var(--highlighted-color)"
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
    document.getElementById("view-container").style.display = "block"
    resetButtons()
    selectButton(document.getElementById("top-buttonview"))

    
})

createPageButton.addEventListener("click", (event) => {
    cons.forEach((element) => {
        element.style.display = "none"
    })
    document.getElementById("create-page-container").style.display = "block"
    resetButtons()
    selectButton(document.getElementById("top-button-create-page"))
    
})


