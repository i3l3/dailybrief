import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(folder);
const dist = path.join(folder, 'dist');
await fs.mkdir(dist, {recursive:true});
const fontRoot = path.join(root, 'node_modules/@fontsource-variable/noto-sans-kr');
let fonts = await fs.readFile(path.join(fontRoot, 'index.css'), 'utf8');
const urls = [...new Set([...fonts.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]))];
for(const url of urls) fonts = fonts.replaceAll('url('+url+')', 'url(data:font/woff2;base64,'+(await fs.readFile(path.join(fontRoot,url))).toString('base64')+')');
const cssPath = path.join(root,'src/app/globals.css');
const styles = await postcss([tailwind()]).process(await fs.readFile(cssPath,'utf8'), {from:cssPath});
const result = await build({
  absWorkingDir:root, entryPoints:[path.join(folder,'client/main.tsx')], bundle:true,
  write:false, minify:true, format:'iife', platform:'browser', target:['es2020'],
  jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'},
  alias:{'next/link':path.join(folder,'client/link.tsx'), '@/lib/client':path.join(folder,'client/api.ts')},
  plugins:[{name:'gas-routing',setup(builder){
    builder.onLoad({filter:/[\\/]src[\\/]components[\\/](dashboard|settings)\.tsx$/}, async args=>{
      let contents = await fs.readFile(args.path,'utf8');
      contents = 'import { routeSearch as gasRouteSearch, navigate as gasNavigate } from "'+path.join(folder,'client/rpc').replaceAll('\\','/')+'";\n'+contents;
      contents = contents.replaceAll('location.search','gasRouteSearch()')
        .replaceAll('location.reload()', 'gasNavigate("/")');
      return {contents,loader:'tsx'};
    });
  }}],
});
await fs.writeFile(path.join(dist,'Styles.html'), '<style>\n'+fonts+'\n'+styles.css+'\n.gas-message{position:sticky;top:0;z-index:100;padding:12px 20px;background:var(--bg);color:var(--text);border-bottom:1px solid var(--line)}.gas-message button{float:right}\n</style>');
await fs.writeFile(path.join(dist,'Bundle.html'), '<script>\n'+result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'\n</script>');
for(const name of ['Code.gs','Index.html','appsscript.json']) await fs.copyFile(path.join(folder,name),path.join(dist,name));
await fs.copyFile(path.join(fontRoot,'LICENSE'),path.join(folder,'FONT-LICENSE.txt'));
const sources=['src/components/dashboard.tsx','src/components/settings.tsx','src/components/shell.tsx','src/app/globals.css','src/lib/types.ts'];
const hashes={};
for(const name of sources) hashes[name]=createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex');
await fs.writeFile(path.join(dist,'source-manifest.json'), JSON.stringify({builtAt:new Date().toISOString(),sources:hashes},null,2));
console.log('Apps Script files built in apps-script/dist (shared dashboard/settings; fonts embedded).');
