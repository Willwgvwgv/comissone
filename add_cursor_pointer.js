const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
    path.join(__dirname, 'components'),
    path.join(__dirname, 'src', 'pages'),
];

let filesModified = 0;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
            callback(path.join(dir, f));
        }
    });
}

function processComponentCode(code) {
    let modified = false;

    // We tokenize superficially by looking for tags: <button ...> <a ...> <div ... onClick=...>
    // A simplified regex approach:
    // This regex looks for opening tags.
    // Tag name can be: button, a, div, span, tr, td, thead, tbody, label (if it has onClick)
    
    // 1. Process all <button> and <a> and <Link> tags
    const buttonLinkRegex = /<(button|a|Link)(\s+[^>]*?)>/g;
    code = code.replace(buttonLinkRegex, (match, tag, attributes) => {
        if (attributes.includes('disabled') && !attributes.includes('onClick')) {
            // Might not need pointer, but user said "all buttons", let's be careful. Let's add it anyway unless cursor-not-allowed is there.
        }
        
        let newAttributes = attributes;
        // Check if cursor-pointer is already there
        if (!newAttributes.includes('cursor-pointer') && !newAttributes.includes('cursor-not-allowed') && !newAttributes.includes('cursor-default')) {
            if (newAttributes.includes('className=')) {
                // Determine quote type
                newAttributes = newAttributes.replace(/className=(["'])(.*?)\1/, (cnMatch, quote, classes) => {
                    return `className=${quote}${classes} cursor-pointer${quote}`;
                });
                // Also handle curly braces className={`...`} or className={"..."}
                newAttributes = newAttributes.replace(/className=\{`([^`]*?)`\}/, (cnMatch, classes) => {
                    return `className={\`${classes} cursor-pointer\`}`;
                });
            } else {
                newAttributes = ` className="cursor-pointer"${newAttributes}`;
            }
            modified = true;
        }
        return `<${tag}${newAttributes}>`;
    });

    // 2. Process any tag containing onClick=
    // Match elements with onClick that are NOT already processed (like div, span, tr)
    const onClickRegex = /<([a-zA-Z0-9_]+)(\s+[^>]*?onClick={[^>]*?>)/g;
    code = code.replace(onClickRegex, (match, tag, attributes) => {
        // Exclude tags we already handled above (button, a, Link) to avoid duplicates if regex overlaps
        if (tag === 'button' || tag === 'a' || tag === 'Link') return match;

        let newAttributes = attributes;
        if (!newAttributes.includes('cursor-pointer') && !newAttributes.includes('cursor-not-allowed') && !newAttributes.includes('cursor-default')) {
            if (newAttributes.includes('className=')) {
                newAttributes = newAttributes.replace(/className=(["'])(.*?)\1/, (cnMatch, quote, classes) => {
                    return `className=${quote}${classes} cursor-pointer${quote}`;
                });
                newAttributes = newAttributes.replace(/className=\{`([^`]*?)`\}/, (cnMatch, classes) => {
                    return `className={\`${classes} cursor-pointer\`}`;
                });
            } else {
                 newAttributes = ` className="cursor-pointer"${newAttributes}`;
            }
            modified = true;
        }
        return `<${tag}${newAttributes}`;
    });

    return { code, modified };
}

DIRECTORIES_TO_SCAN.forEach(dir => {
    if(fs.existsSync(dir)) {
        walkDir(dir, function(filePath) {
            let content = fs.readFileSync(filePath, 'utf8');
            let result = processComponentCode(content);
            if (result.modified) {
                fs.writeFileSync(filePath, result.code, 'utf8');
                console.log('Modified:', filePath);
                filesModified++;
            }
        });
    }
});

console.log(`Finished. Total files modified: ${filesModified}`);
