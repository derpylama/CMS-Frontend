
// HTML validation function
function validateHtml(html) {
    const allowedTags = new Set(["div", "p", "h3", "img"]);
    const allowedCSS = {
      p: new Set(['font-size', 'color', 'display', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-transform']),
      h3: new Set(['font-size', 'color', 'display', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-transform']),
      div: new Set(['width', 'height', 'display', 'background-color', 'flex-flow', 'align-items', 'justify-content', 'border', 'border-radius', 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'background-image']),
      img: new Set(['width', 'height', 'border-radius', 'display'])
    };
  

    const errors = [];
    const lines = html.split(/\n/);
  
    lines.forEach((line, rowIndex) => {
      const tagRegex = /<\s*(\/?)([a-zA-Z0-9-]+)([^>]*)>/g;
      let match;
  
      while ((match = tagRegex.exec(line))) {
        const tag = match[2].toLowerCase();
  
        // ❌ Invalid tag
        if (!allowedTags.has(tag)) {
          errors.push({
            type: "invalid-tag",
            message: `Tag <${tag}> is not allowed.`,
            line: rowIndex + 1,
            startColumn: match.index + 1,
            endColumn: match.index + match[0].length + 1
          });
        }
  
        // Invalid style
        const styleMatch = /style\s*=\s*"([^"]*)"/.exec(match[3]);
        if (styleMatch) {
          const styles = styleMatch[1]
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);
  
          for (const s of styles) {
            const [prop] = s.split(":").map((x) => x.trim());
            if (!allowedCSS[tag]?.has(prop)) {
              const col = match.index + match[0].indexOf(prop);
              errors.push({
                type: "invalid-style",
                message: `CSS property "${prop}" not allowed on <${tag}>.`,
                line: rowIndex + 1,
                startColumn: col + 1,
                endColumn: col + prop.length + 1
              });
            }
          }
        }
      }
    });
  
    return errors;
  }

  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.41.0/min/vs' }});
  require(['vs/editor/editor.main'], function() {
    const editor =monaco.editor.create(document.getElementById('editor-html-container'), {
        value: `<div>\n  <h4 style="font-weight:bold;">Example</h4>\n</div>`,
        language: "html",
        theme: "light",
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false }
    });
    editor.onDidChangeModelContent(() => {
        const value = editor.getValue();
        const errors = validateHtml(value);
        console.log(errors);
      
  });
});
// Create Monaco editor
/* const editor = monaco.editor.create(document.getElementById("editor-html-container"), {
  value: `<div>\n  <h4 style="font-weight:bold;">Example</h4>\n</div>`,
  language: "html",
  theme: "vs-dark",
  automaticLayout: true,
  fontSize: 14,
  minimap: { enabled: false }
});

// Validate on change
editor.onDidChangeModelContent(() => {
  const value = editor.getValue();
  const errors = validateHtml(value);
  console.log(errors);

}); */