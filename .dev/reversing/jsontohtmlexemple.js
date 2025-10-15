var page1 ={
    "useStandardMeasurement": "false",
        "mainPageLang": "sv",
        "secondaryPageLang": "en",
        "StyletextInfoRubrik1": "font-size:36px;color:#005500;",
        "StyletextInfoRubrik2": "font-size:28px;color:#006633;",
        "StyletextInfoRubrik3": "font-size:24px;color:green;",
        "StyletextInfo1": "font-size:18px;color:#003300;",
        "StyletextInfo2": "font-size:16px;color:#666600;",
        "StyletextInfo3": "font-size:18px;color:#ff6600;",
        "StyletextInfo4": "font-size:16px;color:#005500;",
        "StyletextInfo5": "font-size:14px;",
        "Styleimage1": "width:100%;height:250px;border-radius:10px;display:block;",
        "Styleimage2": "width:80%;height:200px;border-radius:15px;display:block;",
        "Styleimage3": "width:90%;height:180px;border-radius:20px;display:block;",
        "Styleimage4": "width:70%;height:140px;border-radius:25px;display:block;",
        "Stylediv1": "width:100%;height:650px;display:flex;background-color:#d6d6d6;flex-flow:column;justify-content:space-around;padding-bottom:25px;",
        "Stylediv1div1": "width:80%;height:300px;display:flex;background-color:#a3d9a5;flex-flow:row;",
        "Stylediv1div2": "width:80%;height:250px;display:flex;background-color:#ffe4b5;flex-flow:column;",
        "Stylediv1div3": "width:18%;height:100px;display:flex;background-color:#ffe4ff;flex-flow:column;",
        "Stylediv1div2div1": "width:18%;height:100px;display:flex;background-color:#ffe4ff;",
        "Stylediv1div2div2": "width:18%;height:100px;display:flex;background-color:#ffe4ff;",
        "Stylediv1div2div3": "width:18%;height:100px;display:flex;background-color:#ffe4ff;",
        "div1textInfoRubrik1_sv": "Koalor – Allmänt",
        "div1textInfoRubrik1_en": "Koalas – General",
        "div1div1textInfoRubrik2_sv": "Fakta om Koalor",
        "div1div1textInfoRubrik2_en": "Facts about Koalas",
        "div1div2textInfoRubrik3_sv": "Roliga fakta",
        "div1div2textInfoRubrik3_en": "Fun facts",
        "div1textInfo1_sv": "Koalor är små tåliga trädlevande djur från Australien.",
        "div1textInfo1_en": "Koalas are small, hardy, arboreal animals from Australia.",
        "div1div1textInfo2_sv": "De är kända för att äta eukalyptusblad.",
        "div1div1textInfo2_en": "They are known to eat eucalyptus leaves.",
        "div1div1textInfo3_sv": "Koalor äter nästan uteslutande eukalyptusblad.",
        "div1div1textInfo3_en": "Koalas eat almost exclusively eucalyptus leaves.",
        "div1div2textInfo4_sv": "Koalor sover upp till 20 timmar per dag.",
        "div1div2textInfo4_en": "Koalas sleep up to 20 hours per day.",
        "div1div2textInfo5_sv": "Koalor har starka klor för att klättra i träd.",
        "div1div2textInfo5_en": "Koalas have strong claws for climbing trees.",
        "div1div2textInfo6_sv": "Koalor kommunicerar med olika ljud, från snarkningar till skrik.",
        "div1div2textInfo6_en": "Koalas communicate with a variety of sounds, from snoring to screaming.",
        "div1div2textInfo7_sv": "test",
        "div1div2textInfo7_en": "test",
        "div1image1": "https://upload.wikimedia.org/wikipedia/commons/4/49/Koala_climbing_tree.jpg",
        "div1div1image2": "https://upload.wikimedia.org/wikipedia/commons/e/e9/Koala_eating_eucalyptus_leaf.jpg",
        "div1div2image3": "https://upload.wikimedia.org/wikipedia/commons/0/08/Koala_sleeping_in_tree.jpg",
        "div1div2image4": "https://upload.wikimedia.org/wikipedia/commons/1/14/Koala_close_up.jpg"
    }
    
    const html = addDiv(page1, 'div1', 'page1', 'sv');
    
    //witout dom i think
    function addDiv(page, divPrefix, pageNumber, lang = "sv", indentLevel = 0) {
        let html = '';
        const indent = '  '.repeat(indentLevel); // Indentation for readability in nested divs
    
        // Get and clean style for this div
        let blockStyle = page['Style' + divPrefix] || '';
        
        blockStyle = blockStyle.replace(/\b[\w-]+:\s*;/g, '').trim(); // Remove any empty CSS properties like "color:;" from the style string  /  Remove empty/invalid CSS properties
    
        // Only add style attribute if it’s not empty
        const divStyleAttr = blockStyle ? ` style="${blockStyle}"` : '';
        html += `${indent}<div${divStyleAttr}>\n`; // Start div tag with styles if present
    
        // --- Add text and images ---
        for (const key in page) {
            // H3 tag (header)
            if (key.startsWith(divPrefix + 'textInfoRubrik') && key.endsWith('_' + lang)) {
                // Compute the corresponding style key for this header
                const styleKey = 'Style' + key.replace(divPrefix, '').replace('_' + lang, '');
                let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim();
                const styleAttr = style ? ` style="${style}"` : '';
                html += `${indent}  <h3${styleAttr}>${page[key]}</h3>\n`; // Add h3 element
            }
            // Paragraph
            else if (key.startsWith(divPrefix + 'textInfo') && key.endsWith('_' + lang) && !key.includes('Rubrik')) {
                // Compute corresponding style key for paragraph
                const styleKey = 'Style' + key.replace(divPrefix, '').replace('_' + lang, '');
                let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim();
                const styleAttr = style ? ` style="${style}"` : '';
                html += `${indent}  <p${styleAttr}>${page[key]}</p>\n`; // Add paragraph element
            }
            // Image
            else if (key.startsWith(divPrefix + 'image')) {
                // Compute corresponding style key for image
                const styleKey = 'Style' + key.replace(divPrefix, '');
                let style = (page[styleKey] || '').replace(/\b[\w-]+:\s*;/g, '').trim();
                const styleAttr = style ? ` style="${style}"` : '';
                html += `${indent}  <img${styleAttr} src="${page[key]}" alt="Image">\n`; // Add img element
            }
        }
    
        // --- Detect nested divs within this div ---
        const nestedDivPrefixes = new Set();
        for (const key in page) {
            // Match keys that represent nested divs, e.g., div1div1, div1div2, etc.
            const match = key.match(new RegExp('^(' + divPrefix + 'div\\d+)'));
            if (match) nestedDivPrefixes.add(match[1]);
        }
    
        // --- Recursively process each nested div ---
        nestedDivPrefixes.forEach(nestedDivPrefix => {
            html += addDiv(page, nestedDivPrefix, pageNumber, lang, indentLevel + 1);
        });
    
        html += `${indent}</div>\n`; // Close current div
        return html; // Return HTML string for this div and its children
    }
    
    