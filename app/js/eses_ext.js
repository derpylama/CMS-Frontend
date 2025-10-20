/*
ESES Extension

  ESES Defines a way to encode arbitrary HTML into the restricted CMS-API format while maintaining readability for non ESES aware clients to the extent possible.

  The extension builds on having a `<p style="display: none;">` tag containing ESES mapping data, this one maps element-hiarchy-keys to the elements extended data.
  This is since the CMS API format only allows:
    HTML Elements:
      - p
      - h3
      - div
      - img (with only property "src")
    
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

    And div is the only element who can have child elements, p and h3 must only have text content.

  The goal of ESES is to map additional HTML element types, their properties (except img src), content for non text elements aswell as any CSS properties not supported by the CMS format.
    This means if an element is of a type not supported we can represent it as a div, p or h3 then map that element's hiarchy key to the original element type and its properties.
    Elements properties and css-properties that are supported by the CMS format should be kept inside the html however any non supported properties should be stored in the ESES mapping data.

    The ESES mapping data must be html+ini safe text and is thus stored as base64 incoded JSON. With the prefix "ESES1:" (for v1 of the ESES extension)
      since the mapping element has `display: none` we hint to other clients that this is not meant to be displayed.
      
      The JSON structure is: 
        {
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
                "content": "<non-text-content>",
                "isWrapper": <true|false>
            },
            ...
        }

      But fields `element`, `attributes`, `styles` and `content` are omitted if they are not relevant to that element. `isWrapper` is only present and true if the element was only added because its parent had to be converted to a div to hold children and this wraps the content, this element can thus be replaced with its own text-content.

    HTML elements can be categorized into one of the following five categories:
      1. Headers - h1, h2, h4, h5, h6 - Mapped to `h3`
      2. Text - Al elements that are primarily text-based, ex semantics like `em` or formatters like `b` and `i`. - Mapped to `p`
      3. Containers - Elements semantic or layouting that contain other elements, ex `main` or `span` - Mapped to `div`
      4. Represented - Elements who are not supported but can have thier core properties represented as text for non ESES clients, ex `video` who can be represented as `[Video: <source>]` - Mapped to `p`
      5. NotRepresented - Elements that have no relevant representation outside of ESES, ex `script`, self closing elements or non-content elements are also in this category like `br`, stored fully in ESES.

    Since we want to maintain readability for non ESES clients we try to map elements to the first three categories when possible, otherwise we try to the "represented" category before falling back to "not represented".
      Example `<b>bold text</b>` becomes `<p>bold text</p>` with mapping data saying that this hiarchy key is a `b` element.
      And `<figure><img src="image.jpg"><figcaption>Caption</figcaption></figure>` becomes `<div><img src="image.jpg"><p>Caption</p></div>` with mapping data saying that the hiarchy key of the div is a `figure` element and the hiarchy key of the p is a `figcaption` element.
      But some elements make more sense to be represented with their content, ex `<video><source src="video.mp4"></video>` becomes `<p>[Video: video.mp4]</p>` combining the <source> element into the representation.

    But since the API only supports child elements under `div` elements any children under non-container elements will have thier parent converted into a div.
      Example `<h2>Header <em>with emphasis</em></h2>` becomes `<div><h3>Header </h3><p>with emphasis</p></div>` with mapping data saying that the hiarchy key of the div is an `h2` element and the hiarchy key of the p is an `em` element and the hiarchy key of the h3 has "isWrapper" true meaning the h3 can be reduced to their text-content when back-converting.
      Example `<h2>Header start <em> with emphasis</em> and end</h2>` becomes `<div><h3>Header start </h3><p> with emphasis</p><h3> and end</h3></div>` with mapping data saying that the hiarchy key of the div is an `h2` element, the hiarchy key of the p is an `em` element and both h3 hiarchy keys have "isWrapper" true meaning they can be reduced to their text-content when back-converting.

    When back-converting we use the mapping data to restore the original elements, completely, recursing over and handling "isWrapper" elements by replacing them with their text-content, and restoring attributes, styles and content as needed, aswell as the element type ofcourse.

    When converting we can use recursion and the bellow elementsMap, if an element type is under "header" and has no child elements we map it to `h3`, if its under "text" and has no child elements we map it to `p`, if its under "container" we map it to `div`,
      if it has content and is udner "header" or "text" we handle with the "isWrapper" logic.
    If its under emulated we use the provided function to get its text representation.
*/

class ESESApiExtender {
    constructor(baseUrl) {
        this.api = new WonkyCMSApiHandlerFrontend(baseUrl);
        this.esesVersion = "1";

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

    esesJsonToMetaString(jsonobj) {
        // Takes jsonobj => jsonstr => base64str => "ESES{v}:" + base64str
        const jsonstr = JSON.stringify(jsonobj);
        const base64str = Buffer.from(jsonstr).toString('base64');
        return "ESES" + this.esesVersion + ":" + base64str;
    }

    metaStringToEsesJson(metastr) {
        // Takes "ESES{v}" + base64str => base64str => jsonstr => jsonobj
        const esesPrefix = "ESES" + this.esesVersion + ":";
        if (!metastr.startsWith(esesPrefix)) {
            throw new Error("Invalid ESES meta string");
        }

        const base64str = metastr.slice(esesPrefix.length);

        const jsonstr = Buffer.from(base64str, 'base64').toString('utf-8');

        return JSON.parse(jsonstr);
    }

    FromFullHtml(html) {
        // We are in the frontend and can use the DOM and `document` variable
    }

    ToFullHtml(lesserhtml) {
        // We are in the frontend and can use the DOM and `document` variable
    }
}