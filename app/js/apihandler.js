class ApiHandler {
    constructor() {
        this.baseUrl = "https://elias.ntigskovde.se/index.php"
    }

    getPage(pageKey) {
        fetch(this.baseUrl + "/php/getinfo.php")
    }
}