const fs = require('fs');
const path = require('path');

const distClientDir = path.join(__dirname, '../dist/client');
const srcClientDir = path.join(__dirname, '../src/client');

console.log('Building UI...');

console.log('1. Creating dist directory...');
fs.mkdirSync(distClientDir, { recursive: true });

console.log('2. Copying HTML and TSX files...');

const htmlSrc = path.join(srcClientDir, 'index.html');
const htmlDest = path.join(distClientDir, 'index.html');
fs.copyFileSync(htmlSrc, htmlDest);

const tsxSrc = path.join(srcClientDir, 'app.tsx');
const tsxDest = path.join(distClientDir, 'app.tsx');
fs.copyFileSync(tsxSrc, tsxDest);

console.log('3. Creating browser-compatible JS files...');

const apiJs = `const API_BASE = '/api';

window.Api = {
  getExecutions: async function() {
    const response = await fetch(\`\${API_BASE}/executions\`);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return response.json();
  },
  getExecution: async function(id) {
    const response = await fetch(\`\${API_BASE}/executions/\${id}\`);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return response.json();
  }
};
`;
fs.writeFileSync(path.join(distClientDir, 'api.js'), apiJs);

const typesJs = `// Types file (empty - types are inline)
window.Types = {};
`;
fs.writeFileSync(path.join(distClientDir, 'types.js'), typesJs);

console.log('✅ UI build complete!');
