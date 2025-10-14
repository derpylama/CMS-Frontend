# Endpoints


## Notes
- Page IDs are serverside


## Add a page

`POST elias.ntig.skovde/index.php`

BODY
```json
// This is x-www-form-urlencode
{
    "pageHeader": "<string:pagename>",
    ...content...
}
```

REPONSE
```json
// PHP ERRORS WHICH MEANS IT WORKS
```


## Get all info on a page
`GET elias.ntigskovde.se/php/getinfo.php?action=getPageInfo&pageKey=<string:pageID>`


## Delete a page
`GET elias.ntigskovde.se/php/deletepage.php?action=deletePage&pageKey=<string:pageID>`

RESPONSE
```json
{
    "deleted": "true"
}
```