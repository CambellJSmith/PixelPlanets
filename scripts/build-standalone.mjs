import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const entry='src/main.js';
const modules=new Map();

function normalize(value){
  return value.split(path.sep).join('/');
}

function resolveImport(fromId,specifier){
  if(!specifier.startsWith('.')){
    throw new Error(`Only local imports are supported: ${specifier} in ${fromId}`);
  }
  return normalize(path.normalize(path.join(path.dirname(fromId),specifier)));
}

function collect(moduleId){
  if(modules.has(moduleId))return;
  const filename=path.join(root,moduleId);
  const source=fs.readFileSync(filename,'utf8');
  const imports=[];
  const importPattern=/^\s*import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/gm;
  for(const match of source.matchAll(importPattern)){
    imports.push({names:match[1].trim(),specifier:match[2],full:match[0]});
  }
  modules.set(moduleId,{source,imports});
  for(const item of imports)collect(resolveImport(moduleId,item.specifier));
}

function transform(moduleId,record){
  let code=record.source;
  code=code.replace(/^\s*import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/gm,(_,names,specifier)=>{
    const resolved=resolveImport(moduleId,specifier);
    return `const { ${names.trim()} } = __require(${JSON.stringify(resolved)});`;
  });

  const exports=[];
  code=code.replace(/^([ \t]*)export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gm,(_,indent,kind,name)=>{
    exports.push(name);
    return `${indent}${kind} ${name}`;
  });
  code=code.replace(/^([ \t]*)export\s+function\s+([A-Za-z_$][\w$]*)/gm,(_,indent,name)=>{
    exports.push(name);
    return `${indent}function ${name}`;
  });
  code=code.replace(/^([ \t]*)export\s+class\s+([A-Za-z_$][\w$]*)/gm,(_,indent,name)=>{
    exports.push(name);
    return `${indent}class ${name}`;
  });

  if(exports.length){
    const unique=[...new Set(exports)];
    code+=`\nObject.assign(exports,{${unique.join(',')}});\n`;
  }

  return code;
}

collect(entry);

let output=`/* Generated from the modular src/ tree by scripts/build-standalone.mjs. */\n`;
output+=`(() => {\n'use strict';\n`;
output+=`const __modules=Object.create(null);\n`;
for(const [moduleId,record] of modules){
  output+=`\n__modules[${JSON.stringify(moduleId)}]=function(exports,__require){\n${transform(moduleId,record)}\n};\n`;
}
output+=`\nconst __cache=Object.create(null);\n`;
output+=`function __require(id){\n`;
output+=`  if(__cache[id])return __cache[id].exports;\n`;
output+=`  const factory=__modules[id];\n`;
output+=`  if(!factory)throw new Error('Missing bundled module: '+id);\n`;
output+=`  const module={exports:{}};\n`;
output+=`  __cache[id]=module;\n`;
output+=`  factory(module.exports,__require);\n`;
output+=`  return module.exports;\n`;
output+=`}\n`;
output+=`function showBootError(error){\n`;
output+=`  console.error(error);\n`;
output+=`  const status=document.getElementById('boot-status');\n`;
output+=`  if(status){status.hidden=false;status.classList.add('boot-error');status.textContent='Game failed to start: '+(error?.message||String(error));}\n`;
output+=`}\n`;
output+=`try{__require(${JSON.stringify(entry)});}catch(error){showBootError(error);}\n`;
output+=`})();\n`;

const destination=path.join(root,'dist','game.bundle.js');
fs.mkdirSync(path.dirname(destination),{recursive:true});
fs.writeFileSync(destination,output);
console.log(`Built ${normalize(path.relative(root,destination))} from ${modules.size} modules (${output.length} bytes).`);
