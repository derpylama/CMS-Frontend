class ApiHandler{
    constructor(){
        this.baseUrl = "https://elias.ntigskovde.se"
    }

    GetPage(pageID){
    
        fetch(this.baseUrl + "/php/getinfo.php?action=getPageInfo&pageKey=page" + pageID).then(response => { 
            try{
                return response.json()
            }
            catch(e){
                console.log(e)
            }
        }).then(data => {
            console.log(data)
        })
        .catch((e) => {
            console.log(e);
        })

    }

    DeletePage(pageID){
        fetch(this.baseUrl + "/php/deletepage.php?action=deletePage&pageKey=page" + pageID)
        
    }

    
}

module.exports = ApiHandler