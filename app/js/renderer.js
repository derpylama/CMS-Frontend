const viewButton = document.getElementById("top-button-view")
const editButton = document.getElementById("top-button-edit")
const createPageButton = document.getElementById("top-button-create-page")
const defaultCon = document.getElementById("view-container")
const cons = document.querySelectorAll(".cons")

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
    document.getElementById("view-container").style.display = "block"
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


