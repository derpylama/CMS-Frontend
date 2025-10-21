// Function that parses html to a tree of {"element": "tagName", "attributes": {}, "children": [...]}
// It should not use any dependencies and not use the DOM APIs because we dont want to mutate or fix, this means no injecting body or html tags and no using document.
// It should handle when script, style or text tags includes escaped/commented/in-string html tags correctly and not parse them as real tags.
function parseHtml(htmlString) {
    
}