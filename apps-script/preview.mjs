// Local synthetic preview only: no backend, credentials or real mail.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('./dist/'+name,import.meta.url),'utf8');
let html=await read('Index.html');
const styles=await read('Styles.html'), bundle=await read('Bundle.html');
html=html.replace("<?!= include_('Styles'); ?>",()=>styles)
  .replace("<?!= include_('Bundle'); ?>",()=>bundle)
  .replace('<?!= bootJson ?>',JSON.stringify({route:'/demo'}));
createServer((req,res)=>{
  if(req.url!=='/' && req.url!=='/demo') {res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(html);
}).listen(3102,'127.0.0.1',()=>console.log('Synthetic Apps Script preview: http://127.0.0.1:3102/demo'));
