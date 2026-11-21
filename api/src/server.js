'use strict';
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

const app = express();
const port = Number(process.env.PORT || 3000);
const labMode = process.env.LAB_MODE === 'true';
if (!labMode) {
  console.error('LAB_MODE=true es obligatorio: esta API tiene endpoints deliberadamente vulnerables.');
  process.exit(1);
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

const usersSeed = () => [
  { id:'carlos', name:'Carlos Demo', role:'user', tenantId:'t-acme', displayName:'Carlos', phone:'555-0101', password:'demo123' },
  { id:'maria', name:'María Demo', role:'user', tenantId:'t-beta', displayName:'María', phone:'555-0102', password:'demo123' },
  { id:'admin', name:'Admin Demo', role:'admin', tenantId:'t-acme', displayName:'Admin', phone:'555-0100', password:'admin123' },
  { id:'test-acme', name:'Fixture de prueba', role:'user', tenantId:'t-acme', displayName:'Fixture', phone:'555-0199', password:'not-a-login-user' }
];
const seedInvoices = () => [
  {id:'1041', ownerId:'carlos', tenantId:'t-acme', amount:125.50, status:'paid', reference:'INV-DEMO-1041'},
  {id:'1042', ownerId:'maria', tenantId:'t-beta', amount:980.00, status:'pending', reference:'INV-DEMO-1042'}
];
const seedOrders = () => Array.from({length:25},(_,i)=>({id:`ORD-${String(i+1).padStart(3,'0')}`,ownerId:i%2?'maria':'carlos',total:25+i,status:'shipped'}));
let users, invoices, orders, businessEvents, usedRefreshTokens;
function reset(){users=usersSeed();invoices=seedInvoices();orders=seedOrders();businessEvents=[];usedRefreshTokens=new Map();}
reset();
const findUser = id => users.find(x=>x.id===id);
const demoSecret = 'nexus-demo-secret-do-not-reuse';
const secureSecret = process.env.LAB_SECRET || crypto.randomBytes(48).toString('hex');
const secureTokenOptions = {algorithm:'HS256',issuer:'nexus-lab',audience:'nexus-api'};
const getBearer = req => (req.get('authorization')||'').replace(/^Bearer\s+/i,'');
const claimsFromDemo = req => { try { return jwt.decode(getBearer(req)); } catch { return null; } };
function verifySecure(req,res,next){
  try { req.auth=jwt.verify(getBearer(req),secureSecret,{...secureTokenOptions,algorithms:['HS256']});next(); }
  catch { return res.status(401).json({error:'unauthorized',message:'Token ausente, inválido o expirado.'}); }
}
function verifiedDemoLogin(req,res,next){
  try { req.auth=jwt.verify(getBearer(req),demoSecret,{algorithms:['HS256']});next(); }
  catch { return res.status(401).json({error:'unauthorized',message:'Usa POST /api/v1/auth/login para obtener el token de demostración.'}); }
}
function requireSecureRole(role){return (req,res,next)=>req.auth?.role===role?next():res.status(403).json({error:'forbidden'});}
const sendNotFound=(res)=>res.status(404).json({error:'not_found'});

app.get('/api',(_req,res)=>res.json({name:'NEXUS API Security Lab',mode:'educational-simulation',version:'1.0',docs:'/api/docs',health:'/api/healthz',vulnerablePrefix:'/api/v1',securePrefix:'/api/secure/v1',notice:'Solo datos sintéticos en memoria. SSRF y proveedor externo simulados; no hay conexiones salientes.'}));
app.get('/api/healthz',(_req,res)=>res.json({ok:true,service:'nexus-api-lab'}));
app.get('/api/docs',(_req,res)=>res.json({title:'NEXUS API Lab',docs:'API_GUIDE.md',domains:[
 ['API1','GET /api/v1/invoices/:id','GET /api/secure/v1/invoices/:id'],['API2','POST /api/v1/auth/login · refresh · profile','POST /api/secure/v1/auth/login · refresh · profile'],
 ['API3','PATCH /api/v1/profile','PATCH /api/secure/v1/profile'],['API4','GET /api/v1/orders?limit=','GET /api/secure/v1/orders?limit='],
 ['API5','DELETE /api/v1/admin/users/:id','DELETE /api/secure/v1/admin/users/:id'],['API6','POST /api/v1/checkout','POST /api/secure/v1/checkout'],
 ['API7','POST /api/v1/previews','POST /api/secure/v1/previews'],['API8','GET /api/v1/health','GET /api/secure/v1/health'],
 ['API9','GET /api/v1/legacy/reports','GET /api/secure/v1/legacy/reports'],['API10','POST /api/v1/shipping/quote','POST /api/secure/v1/shipping/quote']
]}));
app.post('/api/v1/lab/reset',(_req,res)=>{reset();res.json({ok:true,message:'Datos sintéticos reiniciados en memoria.'});});
app.get('/api/v1/meta/inventory',(_req,res)=>res.json({versions:['/api/v1','/api/secure/v1'],legacy:['GET /api/v1/legacy/reports'],note:'Inventario simulado para el reto API9.'}));

// API2: tokens de demo firmados con secreto didáctico predecible y refresh reutilizable.
app.post('/api/v1/auth/login',(req,res)=>{
  const u=findUser(req.body?.userId); if(!u||u.password!==req.body?.password)return res.status(401).json({error:'invalid_credentials'});
  const token=jwt.sign({sub:u.id,role:u.role,tenantId:u.tenantId},demoSecret,{algorithm:'HS256',expiresIn:'30d'});
  return res.json({accessToken:token,refreshToken:token,tokenType:'Bearer',expiresIn:2592000,notice:'Token de laboratorio; duración y secreto deliberadamente inseguros.'});
});
app.post('/api/v1/auth/refresh',(req,res)=>{
  const claims=claimsFromDemo({...req,get:()=>`Bearer ${req.body?.refreshToken||''}`});
  if(!claims)return res.status(401).json({error:'invalid_token'});
  const accessToken=jwt.sign({sub:claims.sub,role:claims.role,tenantId:claims.tenantId},demoSecret,{algorithm:'HS256',expiresIn:'30d'});
  res.json({accessToken,tokenType:'Bearer',expiresIn:2592000,notice:'Refresh token reutilizable en esta simulación.'});
});
app.get('/api/v1/auth/profile',(req,res)=>{
  const claims=claimsFromDemo(req); if(!claims?.sub)return res.status(401).json({error:'invalid_token'});
  const u=findUser(claims.sub); if(!u)return sendNotFound(res);
  res.json({id:u.id,name:u.name,role:claims.role,tenantId:claims.tenantId,source:'claims decodificados sin verificar firma'});
});
// API1: el token firmado se valida, pero el identificador de objeto no se limita por tenant/propietario.
app.get('/api/v1/invoices/:id',verifiedDemoLogin,(req,res)=>{const row=invoices.find(x=>x.id===req.params.id);return row?res.json(row):sendNotFound(res);});
app.get('/api/secure/v1/invoices/:id',verifySecure,(req,res)=>{
  const row=invoices.find(x=>x.id===req.params.id&&x.ownerId===req.auth.sub&&x.tenantId===req.auth.tenantId);
  return row?res.json({id:row.id,amount:row.amount,status:row.status,reference:row.reference}):sendNotFound(res);
});
// API2 hardened alternative: full JWT validation, short access token, one-use opaque refresh token.
app.post('/api/secure/v1/auth/login',(req,res)=>{
  const u=findUser(req.body?.userId);if(!u||u.password!==req.body?.password)return res.status(401).json({error:'invalid_credentials'});
  const accessToken=jwt.sign({sub:u.id,role:u.role,tenantId:u.tenantId},secureSecret,{...secureTokenOptions,expiresIn:'15m'});
  const refreshToken=crypto.randomBytes(32).toString('base64url');usedRefreshTokens.set(refreshToken,u.id);
  res.json({accessToken,refreshToken,tokenType:'Bearer',expiresIn:900});
});
app.post('/api/secure/v1/auth/refresh',(req,res)=>{
  const old=req.body?.refreshToken;const subject=typeof old==='string'?usedRefreshTokens.get(old):null;if(!subject)return res.status(401).json({error:'invalid_or_reused_refresh_token'});usedRefreshTokens.delete(old);
  const u=findUser(subject);if(!u)return res.status(401).json({error:'invalid_refresh_token'});
  const accessToken=jwt.sign({sub:u.id,role:u.role,tenantId:u.tenantId},secureSecret,{...secureTokenOptions,expiresIn:'15m'});
  const refreshToken=crypto.randomBytes(32).toString('base64url');usedRefreshTokens.set(refreshToken,u.id);
  res.json({accessToken,refreshToken,tokenType:'Bearer',expiresIn:900});
});
app.get('/api/secure/v1/auth/profile',verifySecure,(req,res)=>{const u=findUser(req.auth.sub);if(!u)return sendNotFound(res);res.json({id:u.id,name:u.name,role:req.auth.role,tenantId:req.auth.tenantId});});
// API3: enlace masivo vulnerable versus lista explícita de propiedades y proyección mínima.
app.patch('/api/v1/profile',verifiedDemoLogin,(req,res)=>{const u=findUser(req.auth.sub);if(!u)return sendNotFound(res);Object.assign(u,req.body||{});res.json(u);});
app.patch('/api/secure/v1/profile',verifySecure,(req,res)=>{const u=findUser(req.auth.sub);if(!u)return sendNotFound(res);for(const k of ['displayName','phone'])if(typeof req.body?.[k]==='string')u[k]=req.body[k].slice(0,100);res.json({id:u.id,displayName:u.displayName,phone:u.phone});});
// API4: el parámetro de demo no limita datos reales; el modo seguro valida y pagina.
app.get('/api/v1/orders',(req,res)=>{const limit=Number(req.query.limit)||orders.length;res.json({count:orders.length,items:orders.slice(0,Math.max(0,limit))});});
app.get('/api/secure/v1/orders',verifySecure,(req,res)=>{const n=Number.parseInt(req.query.limit||'10',10);if(!Number.isInteger(n)||n<1)return res.status(400).json({error:'limit_must_be_positive_integer'});const limit=Math.min(n,20);const items=orders.filter(x=>x.ownerId===req.auth.sub).slice(0,limit);res.json({count:items.length,limit,items});});
// API5: demo user can invoke admin delete; secure route uses a server policy and tenant scope.
app.delete('/api/v1/admin/users/:id',(req,res)=>{const i=users.findIndex(x=>x.id===req.params.id);if(i<0)return sendNotFound(res);const [removed]=users.splice(i,1);res.json({deleted:{id:removed.id,name:removed.name},notice:'Solo cambia la fixture en memoria; POST /api/v1/lab/reset la restaura.'});});
app.delete('/api/secure/v1/admin/users/:id',verifySecure,requireSecureRole('admin'),(req,res)=>{const i=users.findIndex(x=>x.id===req.params.id&&x.tenantId===req.auth.tenantId);if(i<0)return sendNotFound(res);const [removed]=users.splice(i,1);res.json({deleted:{id:removed.id}});});
// API6: pedidos sintéticos; vulnerable permite solicitudes repetidas, pero conserva un máximo fijo de eventos.
app.post('/api/v1/checkout',verifiedDemoLogin,(req,res)=>{const event={id:`SIM-${Date.now()}`,userId:req.auth.sub,sku:String(req.body?.sku||'NEXUS-DEMO'),quantity:Number(req.body?.quantity)||1,createdAt:new Date().toISOString()};businessEvents.push(event);businessEvents=businessEvents.slice(-30);res.status(201).json({order:event,notice:'Simulación: no existe pago ni reserva real.'});});
app.post('/api/secure/v1/checkout',verifySecure,(req,res)=>{const qty=Number(req.body?.quantity);if(!Number.isInteger(qty)||qty<1||qty>2)return res.status(400).json({error:'quantity_must_be_1_or_2'});const sku=String(req.body?.sku||'NEXUS-DEMO').slice(0,40);const key=String(req.get('idempotency-key')||'');if(!key)return res.status(400).json({error:'idempotency_key_required'});if(businessEvents.some(e=>e.key===key&&e.userId===req.auth.sub))return res.status(200).json({order:businessEvents.find(e=>e.key===key&&e.userId===req.auth.sub),idempotentReplay:true});const event={id:`SIM-${Date.now()}`,userId:req.auth.sub,sku,quantity:qty,key,createdAt:new Date().toISOString()};businessEvents.push(event);businessEvents=businessEvents.slice(-30);res.status(201).json({order:event,notice:'Simulación sin pago ni inventario real.'});});
// API7: SSRF puramente simulado. Ninguna ruta usa fetch/requests ni abre sockets salientes.
function previewSimulation(raw){let url;try{url=new URL(String(raw||''));}catch{return {error:'invalid_url'};}
  if(url.hostname==='169.254.169.254'||url.hostname==='metadata.google.internal')return {simulatedTarget:'cloud metadata',instanceId:'i-demo-000000',role:'nexus-lab-demo',notice:'Respuesta ficticia; no se contactó metadata real.'};
  if(url.hostname==='127.0.0.1'||url.hostname==='localhost'||url.hostname.endsWith('.internal'))return {simulatedTarget:'internal service',service:'billing-demo',status:'synthetic',notice:'Respuesta ficticia; no se accedió a red interna.'};
  return {simulatedTarget:url.hostname,title:'Vista previa sintética',url:url.href};}
app.post('/api/v1/previews',(req,res)=>{const result=previewSimulation(req.body?.url||req.query.url);res.status(result.error?400:200).json(result);});
app.post('/api/secure/v1/previews',(req,res)=>{let url;try{url=new URL(String(req.body?.url||req.query.url||''));}catch{return res.status(400).json({error:'invalid_url'});}if(url.protocol!=='https:'||!['preview.nexus.example'].includes(url.hostname))return res.status(400).json({error:'destination_not_allowlisted',allowed:['https://preview.nexus.example'],notice:'Validación simulada; no se hizo ninguna conexión.'});res.json({simulatedTarget:url.hostname,title:'Vista previa permitida',notice:'Respuesta sintética; sin conexión saliente.'});});
// API8: configuración ficticia y errores informativos vs respuesta de salud mínima.
app.get('/api/v1/health',(req,res)=>{if(req.get('origin'))res.set('Access-Control-Allow-Origin',req.get('origin')).set('Access-Control-Allow-Credentials','true');return res.json({status:'ok',debug:{environment:'lab-demo',framework:'Express',database:'postgres://demo-user:demo-pass@nexus-db/internal',stack:'Error: synthetic\n at /app/src/server.js:88'},origin:req.get('origin')||null});});
app.get('/api/secure/v1/health',(_req,res)=>res.json({status:'ok'}));
// API9: endpoint legacy intencionalmente activo; no contiene datos personales.
app.get('/api/v1/legacy/reports',(_req,res)=>res.json({version:'v1-legacy',reports:[{id:'R-DEMO-01',summary:'Reporte ficticio',classification:'training-only'}],sunset:'sin gestionar'}));
app.get('/api/secure/v1/legacy/reports',(_req,res)=>res.status(410).json({error:'api_version_retired',message:'La versión retirada ya no está disponible.'}));
// API10: proveedor simulado, sin salida de red. En modo vulnerable se confía en valores del request.
app.post('/api/v1/shipping/quote',(req,res)=>res.json({provider:'external-demo',price:req.body?.price??999,service:req.body?.service??'unknown',raw:req.body||{},notice:'Respuesta simulada; sin llamada a proveedor real.'}));
app.post('/api/secure/v1/shipping/quote',(req,res)=>{const service=req.body?.service;if(!['standard','express'].includes(service))return res.status(400).json({error:'unsupported_service'});const prices={standard:8.5,express:18.0};res.json({provider:'external-demo',service,price:prices[service],currency:'USD',notice:'Precio fijo local de demostración; sin llamada externa.'});});

app.use((err,_req,res,_next)=>{console.error('request_error',err.message);res.status(err.status||500).json({error:'request_failed',message:'Revisa el formato y tamaño del JSON.'});});
app.listen(port,'0.0.0.0',()=>console.log(`NEXUS API lab escuchando en ${port}; laboratorio simulado.`));
