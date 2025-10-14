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
`GET https://elias.ntigskovde.se/php/getinfo.php?action=getPageInfo&pageKey=<string:pageID>`

RESPONSE
```json
{
    "header": "Allt om Koalor",
    "standardUnitWidth": "%",
    "standardUnitHeight": "px",
    "standardMeasureUnitMargin": "px",
    "standardMeasureUnitBorder": "px",
    "standardMeasureUnitFont": "px",
    "mainPageLang": "sv",
    "secondaryPageLang": "en",
    "StyletextInfoRubrik1": "font-size:36px;color:#005500;",
    "StyletextInfoRubrik2": "font-size:28px;color:#006633;",
    "StyletextInfo1": "font-size:18px;color:#003300;",
    "StyletextInfo2": "font-size:16px;color:#666600;",
    "StyletextInfo3": "font-size:14px;color:#000000;",
    "Stylediv1": "width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:center;align-items:center;padding-top:25px;",
    "Stylediv1div1": "width:100%;height:400px;display:flex;background-color:#a3d9a5;flex-flow:row;justify-content:space-around;background-image:linear-gradient(360deg, #a3d9a5,#d6d6d6);",
    "Stylediv1div1div1": "width:300px;height:250px;display:flex;flex-flow:column;align-items:center;border:3px solid rgb(48, 129, 51);border-radius:40px;padding:25px;margin-top:25px;",
    "Stylediv1div1div2": "width:300px;height:250px;display:flex;flex-flow:column;align-items:center;border:3px solid rgb(48, 129, 51);border-radius:40px;padding:25px;margin-top:25px;",
    "Stylediv1div2": "width:100%;height:250px;display:flex;background-color:#a3d9a5;flex-flow:column;padding-bottom:25px;",
    "Stylediv1div2div1": "width:100%;height:200px;display:flex;background-color:#a3d9a5;flex-flow:row;justify-content:space-around;align-items:center;",
    "Stylediv1div2div2": "width:100%;height:200px;display:flex;background-color:#a3d9a5;flex-flow:row;justify-content:space-around;align-items:center;",
    "Stylediv1div2div2div1": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
    "Stylediv1div2div2div2": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
    "Stylediv1div2div2div3": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
    "Stylediv1div2div2div4": "width:18%;height:100px;display:flex;background-color:#58975A;flex-flow:column;border:5px solid rgb(48, 129, 51);border-radius:25px;padding:5px;justify-content:center;align-items:center;align-items-center;",
    "Styleimage1": "width:150px;height:auto;border-radius:10px;display:block;",
    "Styleimage2": "width:200px;height:auto;border-radius:10px;display:block;",
    "div1textInfoRubrik1_sv": "Koalor – Allmänt",
    "div1textInfoRubrik1_en": "Koalas – General",
    "div1div1div1textInfoRubrik2_sv": "Fakta om Koalor",
    "div1div1div1textInfoRubrik2_en": "Facts about Koalas",
    "div1div1div2textInfoRubrik2_sv": "Fakta om Koalor",
    "div1div1div2textInfoRubrik2_en": "Facts about Koalas",
    "div1div2div1textInfoRubrik3_sv": "Roliga fakta",
    "div1div2div1textInfoRubrik3_en": "Fun facts",
    "div1textInfo1_sv": "Koalor är små tåliga trädlevande djur från Australien.",
    "div1textInfo1_en": "Koalas are small, hardy, arboreal animals from Australia.",
    "div1div1div1textInfo2_sv": "De klättrar ofta i träd.",
    "div1div1div1textInfo2_en": "They often climb trees.",
    "div1div1div2textInfo2_sv": "De är kända för att äta eukalyptusblad.",
    "div1div1div2textInfo2_en": "They are known to eat eucalyptus leaves.",
    "div1div2div2div1textInfo3_sv": "Koalor äter nästan uteslutande eukalyptusblad.",
    "div1div2div2div1textInfo3_en": "Koalas eat almost exclusively eucalyptus leaves.",
    "div1div2div2div2textInfo3_sv": "Koalor sover upp till 20 timmar per dag.",
    "div1div2div2div2textInfo3_en": "Koalas sleep up to 20 hours per day.",
    "div1div2div2div3textInfo3_sv": "Koalor har starka klor för att klättra i träd.",
    "div1div2div2div3textInfo3_en": "Koalas have strong claws for climbing trees.",
    "div1div2div2div4textInfo3_sv": "Koalor kommunicerar med olika ljud, från snarkningar till skrik.",
    "div1div2div2div4textInfo3_en": "Koalas communicate with a variety of sounds, from grunts to bellows.",
    "div1div1div1image1": "https:\/\/upload.wikimedia.org\/wikipedia\/commons\/4\/49\/Koala_climbing_tree.jpg",
    "div1div1div2image2": "https:\/\/upload.wikimedia.org\/wikipedia\/commons\/thumb\/9\/90\/Koala_in_Zoo_Duisburg.jpg\/500px-Koala_in_Zoo_Duisburg.jpg"
}
```

## Delete a page
`GET elias.ntigskovde.se/php/deletepage.php?action=deletePage&pageKey=<string:pageID>`

RESPONSE
```json
{
    "deleted": "true"
}
```