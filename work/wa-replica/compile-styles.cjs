const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/wa-replica-prototype'),design=path.join(root,'replica/design');
const tokens=JSON.parse(fs.readFileSync(path.join(design,'tokens.json'),'utf8'));
let base=fs.readFileSync(path.join(root,'outputs/wa-workbench-prototype-v03/app.css'),'utf8').replace(/^:root\{[^}]*\}/,'');
const layoutFile=path.join(__dirname,'replica.css'),layout=fs.existsSync(layoutFile)?fs.readFileSync(layoutFile,'utf8'):'';
const paints={},lengths={};const roleMap={'#fff':'surface','#ffffff':'surface','#1d2933':'text','#344451':'text','#5f6e78':'text-muted','#f5f7f9':'bg','#233247':'text','#e3e8ed':'border','#13785d':'accent','#0c604a':'accent-hover','#e7f3ed':'accent-soft','#edf6f1':'accent-soft','#e1f0e7':'bubble-out','#aa3636':'danger','#875b15':'warning','#fff5e2':'warning-soft','#cdd8e1':'border-input','#cbd7df':'border-input','#ced7df':'border-input'};
function compile(css){const media=[];css=css.replace(/@media\([^{}]+\)/g,m=>{media.push(m);return '__MEDIA_'+(media.length-1)+'__'});css=css.replace(/([:\s,])white(?=[;,)\s])/g,'$1var(--color-surface)');css=css.replace(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g,h=>{const key=roleMap[h.toLowerCase()];if(key)return 'var(--color-'+key+')';const name=Object.keys(paints).find(n=>paints[n]===h)||'paint-'+(Object.keys(paints).length+1);paints[name]=h;return 'var(--'+name+')'});css=css.replace(/-?(?:\d*\.)?\d+px\b/g,v=>{const name='px-'+v.slice(0,-2).replace('-','neg-').replace('.','p');lengths[name]=v;return 'var(--'+name+')'});return css.replace(/__MEDIA_(\d+)__/g,(_,i)=>media[+i]).replace(/\}/g,'}\n')}
const componentCSS=compile(base),layoutCSS=compile(layout);
let declarations=Object.entries(tokens.color).map(([k,v])=>'--color-'+k+':'+v+';');
for(const [k,v] of Object.entries(tokens.layout))declarations.push('--layout-'+k+':'+v+'px;');
for(const v of tokens.space)declarations.push('--space-'+v+':'+v+'px;');
for(const [k,v] of Object.entries(tokens.radius))declarations.push('--radius-'+k+':'+v+'px;');
for(const [k,v] of Object.entries(tokens.type))declarations.push('--font-'+k+':'+v.size+'px;');
for(const [k,v] of Object.entries({...paints,...lengths}))declarations.push('--'+k+':'+v+';');
declarations.push('--ink:var(--color-text);--text:var(--color-text);--muted:var(--color-text-muted);--surface:var(--color-surface);--canvas:var(--color-bg);--rail:var(--color-surface);--line:var(--color-border);--soft:var(--color-surface-alt);--accent:var(--color-accent);--accent-hover:var(--color-accent-hover);--accent-soft:var(--color-accent-soft);--warning:var(--color-warning);--warning-soft:var(--color-warning-soft);--danger:var(--color-danger);--radius:var(--radius-md);--header:var(--layout-header);--nav:var(--layout-sidebar);--list:var(--layout-conversation);--profile:var(--layout-drawer);');
const tokenCSS=':root {\n  '+declarations.join('\n  ')+'\n  color-scheme:light; font-family:'+tokens.font.sans+'; font-size:var(--font-base); color:var(--color-text); font-synthesis:none;\n}\n';
fs.writeFileSync(path.join(out,'tokens.css'),tokenCSS);fs.writeFileSync(path.join(design,'tokens.css'),tokenCSS);fs.writeFileSync(path.join(out,'components.css'),componentCSS);fs.writeFileSync(path.join(out,'app.css'),layoutCSS);
fs.writeFileSync(path.join(design,'tailwind.config.cjs'),'module.exports={theme:{extend:{colors:'+JSON.stringify(Object.fromEntries(Object.keys(tokens.color).map(k=>[k,'var(--color-'+k+')'])))+'}}};\n');
console.log('Compiled independent tokens and project-owned components.');
