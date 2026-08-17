const fs = require('fs');
const data = fs.readFileSync('figma_data.json', 'utf16le');
const parsed = JSON.parse(data.replace(/^\uFEFF/, ''));

function traverse(node, depth=0) {
    if (node.name === 'Background' || node.name.startsWith('AB6A') || node.type === 'IMAGE' || node.fills?.some(f => f.type === 'IMAGE')) {
        console.log(`Found image/bg node: ${node.name} (ID: ${node.id})`);
    }
    
    if (node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
    }
}

if (parsed.nodes && parsed.nodes['307:1629']) {
    traverse(parsed.nodes['307:1629'].document);
} else {
    console.log('Node not found');
}
