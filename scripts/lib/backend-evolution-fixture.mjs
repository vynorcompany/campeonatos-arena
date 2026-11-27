import sharp from 'sharp';
import {createServer} from 'node:http';
/** Loopback provider substitute; does not send messages or call external infrastructure. */
export async function startEvolutionFixture(){
 const qr=(await sharp({create:{width:64,height:64,channels:4,background:'#144d7a'}}).png().toBuffer()).toString('base64');
 const instances=new Map();const requests=[];let failure=false;
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');let text='';for await(const chunk of req)text+=chunk;const body=text?JSON.parse(text):{};requests.push({method:req.method,path:url.pathname,query:url.searchParams,body});
  const respond=(value,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  if(req.headers.apikey!=='synthetic-evolution-api-key')return respond({message:'Unauthorized'},401);
  if(failure)return respond({message:'PRIVATE_PROVIDER_TOKEN endpoint debug'},500);
  if(url.pathname==='/instance/fetchInstances'){const row=instances.get(url.searchParams.get('instanceName'));return respond(row?[row]:[]);}
  if(url.pathname==='/instance/create'){instances.set(body.instanceName,{instanceName:body.instanceName,state:'CLOSE',ownerJid:''});return respond({qrcode:{base64:qr}});}
  const name=decodeURIComponent(url.pathname.split('/').at(-1));const row=instances.get(name);
  if(url.pathname.startsWith('/settings/find/'))return respond({syncFullHistory:false});
  if(url.pathname.startsWith('/settings/set/')||url.pathname.startsWith('/webhook/set/'))return respond({success:true});
  if(url.pathname.startsWith('/instance/connect/'))return respond({base64:qr});
  if(url.pathname.startsWith('/instance/logout/')){if(row){row.state='CLOSE';row.ownerJid='';}return respond({success:true});}
  return respond({message:'Forbidden fixture endpoint'},404);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return{origin:`http://127.0.0.1:${server.address().port}`,requests,instances,setFailure(value){failure=value;},setConnected(name,ownerJid){const row=instances.get(name);if(!row)throw Error('Unknown fixture instance');row.state='OPEN';row.ownerJid=ownerJid;},close:()=>new Promise((resolve,reject)=>{server.closeAllConnections();server.close(error=>error?reject(error):resolve());})};
}
