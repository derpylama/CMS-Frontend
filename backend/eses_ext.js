// MARK: If we move out HTML->JSON JSON->HTML to frontend we must refactor this file too

const { WonkyCMSApiHandler } = require('./api.js');

/*
ESES Extension

  ESES Defines a way to encode arbitrary HTML into the Wonky API format while maintaining readability for non ESES aware clients to the extent possible.

  The extension builds on having the a `<p style="display: none;">` tag containing ESES mapping data, this one maps WonkyCMS-hiarchy-keys to the element extended data.
  This is since the Wonky API format only allows:
    HTML Elements:
      - p
      - h3
      - div
      - img
    
    p/h3 CSS Style Properties:
      - font-size
      - color
      - display
      - font-family
      - font-weight
      - font-style
      - text-decoration
      - text-transform

    div CSS Style Properties:
      - width
      - height
      - display
      - background-color
      - flex-flow
      - align-items
      - justify-content
      - border
      - border-radius
      - margin
      - margin-top
      - margin-bottom
      - margin-left
      - margin-right
      - padding
      - padding-top
      - padding-bottom
      - padding-left
      - padding-right
      - background-image

  The goal of ESES is to map additional HTML element types, their additional properties and additional-content as well as their non-supported CSS properties to the WonkyCMS API format.
    This means if an element is of a type not supported we can represent it as a div, p or h3 then map that element's hiarchy key to the original element type and its properties.
    And if an element is supported but has additional properties or additional-content we can do the same.
    And if an element has CSS properties not supported we can also map those.

    The ESES mapping data must be stored in text and thus is base64 encoded JSON. With the prefix "ESES1:" (for v1 of the ESES extension)
      since the element has `display: none` we hint to other clients that this is not meant to be displayed.
      
      The JSON structure is: 
        {
            "mapped": {
                "<hiarchy-key>": {
                    "element": "<original-element-type>",
                    "attributes": {
                        "<attribute-name>": "<attribute-value>",
                        ...
                    },
                    "styles": {
                        "<css-property-name>": "<css-property-value>",
                        ...
                    },
                    "content": "<non-text-content-base64-encoded>"
                },
                ...
            },
            "notrepresented": [
                {
                    "element": "<original-element-type>",
                    "attributes": {
                        "<attribute-name>": "<attribute-value>",
                        ...
                    },
                    "styles": {
                        "<css-property-name>": "<css-property-value>",
                        ...
                    },
                    "content": "<non-text-content-base64-encoded>"
                },
                ...
            ]
        }

      But fields ´element`, `attributes`, `styles` and `content` are omitted if they are not relevant to that element.

    Since we want to maintain readability for non ESES aware clients "prioritized" content/properties are stored in the normal way, example videos:
        <video controls>
            <source src="https://example.com/movie.mp4" type="video/mp4">
            ...content...
        </video>
    
        Is represented as:
    
            <p>[Video: https://example.com/movie.mp4]</p>

            {
                "element": "video",
                "attributes": {
                    "controls": ""
                    "source.type": "video/mp4"
                },
                "content": "...content..."
            }

    Whilst elements that have no prioritized properties (the content can't be represented by non ESES aware clients in a way that is relevant) are only included in the ESES data, for example scripts.

  HTML elements can be categorized into one of the following five categories:
    1. Headers - h1, h2, h4, h5, h6 - Mapped to `h3`
    2. Text - Al elements that are primarily text-based, ex semantics like `em` or formatters like `b` and `i`. - Mapped to `p`
    3. Containers - Elements semantic or layouting that contain other elements, ex `main` or `span` - Mapped to `div`
    4. Emulated - Elements who are not directly representable but can have their core properties represented as text for non ESES clients, ex `video` who can be represented as `[Video: <source>]` - Mapped to `p`
    5. NotRepresented - Elements that have no relevant representation outside of ESES, ex `script`, self closing elements or non-content elements are also in this category like `br`

    Note! If an element mapped as headers or text contains other elements it will be represented as a container (div) this is a preprocess, so later the children will have a "parenttype" field in the ESES mapping data.

  To map between these we can make a list where each element type is mapped to one of the above categories, if emulated there is also the "emulate" value which is a function that takes the element and returns the string representation.

  Important:
    - WonkyHTML does only support inline styles so style elements are considered NotRepresented!
    - DIVs is the only element supported to be nested!
    - The ESES mapping data must be the first child of the main container div!

  Example WonkyHTML with ESES data:
    <div style="width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:space-around;padding-bottom:25px;">
        <p>ESES1:...base64-encode-of-json...</p>
        <h3 style="font-size:36px;color:#005500;">Koalor – Allmänt</h3>
        <p style="font-size:18px;color:#003300;">Koalor är små tåliga trädlevande djur från Australien.</p>
        <img style="width:100%;height:250px;height:250;border-radius:10;border-radius:10;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/4/49/Koala_climbing_tree.jpg" alt="Image">
        <div style="width:80%;height:300px;display:flex;background-color:#a3d9a5;flex-flow:row;">
            <h3 style="font-size:28px;color:#006633;">Fakta om Koalor</h3>
            <p style="font-size:16px;color:#666600;">De är kända för att äta eukalyptusblad.</p>
            <p style="font-size:18px;color:#ff6600;">Koalor äter nästan uteslutande eukalyptusblad.</p>
            <img style="width:80%;height:200px;height:200;border-radius:15;border-radius:15;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Koala_eating_eucalyptus_leaf.jpg" alt="Image">
        </div>
        <div style="width:80%;height:250px;display:flex;background-color:#ffe4b5;flex-flow:column;">
            <h3 style="font-size:24px;color:green;">Roliga fakta</h3>
            <p style="font-size:16px;color:#005500;">Koalor sover upp till 20 timmar per dag.</p>
            <p style="font-size:14px;">Koalor har starka klor för att klättra i träd.</p>
            <p style="">Koalor kommunicerar med olika ljud, från snarkningar till skrik.</p>
            <p style="">test</p>
            <img style="width:90%;height:180px;height:180;border-radius:20;border-radius:20;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/0/08/Koala_sleeping_in_tree.jpg" alt="Image">
            <img style="width:70%;height:140px;height:140;border-radius:25;border-radius:25;display:block;" src="https://upload.wikimedia.org/wikipedia/commons/1/14/Koala_close_up.jpg" alt="Image">
        </div>
    </div>
*/

class ESESApiExtender {
    constructor(baseUrl) {
        this.api = new WonkyCMSApiHandler(baseUrl);

        this.elementsMap = {
            "header": [
                "h1", "h2", "h4", "h5", "h6"
            ],
            "text": [
                "p", "span", "em", "strong", "b", "i", "u", "small", "mark", "sub", "sup"
            ],
            "container": [
                "div", "main", "section", "article", "header", "footer", "aside", "nav"
            ],
            "emulated": [
                ["video", (el) => { el.getElementsByTagName("source"); if (el.children.length > 0) { let srcEl = el.children[0]; if (srcEl.tagName.toLowerCase() === "source" && srcEl.hasAttribute("src")) { return `[Video: ${srcEl.getAttribute("src")}]`; } } return "[Video]"; }],
                ["audio", (el) => { el.getElementsByTagName("source"); if (el.children.length > 0) { let srcEl = el.children[0]; if (srcEl.tagName.toLowerCase() === "source" && srcEl.hasAttribute("src")) { return `[Audio: ${srcEl.getAttribute("src")}]`; } } return "[Audio]"; }],
            ]
            // All other elements are fallbacked to NotRepresented
        }
    }

    
    async RemovePage(pageKey, validate = false) {
        return await this.api.RemovePage(pageKey, validate);
    }

    // Methods that should be drop-in-replacements for WonkyCMSApiHandler but handle the ESES extensionanility
    // To handle it we first do conversion HTML->WonkyHTML or WonkyHTML->HTML as needed then call the original functions in WonkyCMSApiHandler
    //   async GetPageAsHtml(pageKey, lang = "sv")
    //   async CreatePageUsingHtml(html, header, mainPageLang = "sv", useStandardMeasurement = "false")
    //   async ReplacePageUsingHtml(pageKey, html, header = null)
    //   async GetAllPagesWithHtml(lang = "sv")
}

module.exports = { ESESApiExtender };