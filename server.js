const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname,DB=process.env.VERCEL?path.join('/tmp','isc-db.json'):path.join(ROOT,'data','db.json'),PUBLIC=ROOT;
const now=()=>new Date(), iso=()=>now().toISOString(), today=()=>iso().slice(0,10), id=p=>p+'_'+crypto.randomBytes(6).toString('hex'), money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
function distanceMeters(a,b){const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),la1=rad(a.lat),la2=rad(b.lat);const q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(q)))}
function validCoords(b){return Number.isFinite(Number(b.lat))&&Number.isFinite(Number(b.lon))&&Math.abs(Number(b.lat))<=90&&Math.abs(Number(b.lon))<=180}
function proximityCheck(d,userId,lat,lon){const t=d.proximity?.transmitter,team=d.proximity?.teamLocations?.[userId],nowMs=Date.now();if(!t||nowMs-new Date(t.updatedAt).getTime()>20000)return {inside:false,transmitterOnline:false,distance:null,reason:'WAITING FOR ADMIN TRANSMITTER'};if(!team||nowMs-new Date(team.updatedAt).getTime()>20000)return {inside:false,transmitterOnline:true,distance:null,reason:'TEAM LOCATION NOT UPDATED'};const distance=distanceMeters({lat:Number(lat),lon:Number(lon)},{lat:Number(t.lat),lon:Number(t.lon)});return {inside:distance<=50,transmitterOnline:true,distance:Number(distance.toFixed(1)),reason:distance<=50?'WITHIN 50m — ATTENDANCE ACTIVE':'OUT OF OFFICE LOCATION'}}

function fresh(){return {settings:{adminWallet:0,dailyDefault:50},users:[{id:'admin',username:'iscadmin',password:'8125400721',name:'ISC Administrator',role:'admin',active:true,dailyPay:0,wallet:0,upi:'',phone:'',photo:null,createdAt:'2026-09-26T00:00:00.000Z'}],attendance:[],videos:[],meetings:[],vouchers:[],withdrawals:[],transactions:[],notifications:[],activity:[],smsLog:[],proximity:{transmitter:null,teamLocations:{}},meetingSignals:[]}}
function load(){try{const d=JSON.parse(fs.readFileSync(DB,'utf8')); const f=fresh(); for(const k of Object.keys(f)) if(d[k]===undefined)d[k]=f[k]; if(!d.settings)d.settings=f.settings; if(!d.proximity)d.proximity=f.proximity; if(!Array.isArray(d.meetingSignals))d.meetingSignals=[]; return d}catch(e){return fresh()}}
function save(d){try{fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB,JSON.stringify(d,null,2));return true}catch(e){console.error('DB SAVE:',e.message);return false}}
function safeUser(u){const {password,...x}=u;return x}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function html(res,file){const f=path.join(PUBLIC,file);if(!fs.existsSync(f))return send(res,404,{error:'Not found'});const ext=path.extname(f),ct={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-store'});res.end(fs.readFileSync(f))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>20e6)req.destroy()});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function note(d,userId,title,message,type='info'){d.notifications.unshift({id:id('n'),userId,title,message,type,read:false,createdAt:iso()});d.notifications=d.notifications.slice(0,1000)}
function act(d,userId,action,detail){d.activity.unshift({id:id('a'),userId,action,detail,createdAt:iso()});d.activity=d.activity.slice(0,1000)}
function tx(d,ownerId,type,amount,description,meta={}){d.transactions.unshift({id:id('tx'),ownerId,type,amount:Number(amount),description,meta,createdAt:iso()});d.transactions=d.transactions.slice(0,5000)}
function period5(){const n=now(),y=n.getFullYear(),m=n.getMonth(),day=n.getDate();let start=new Date(y,m,5),end=new Date(y,m+1,5);if(day<5){start=new Date(y,m-1,5);end=new Date(y,m,5)}return {start:start.toISOString(),end:end.toISOString(),label:start.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' → '+end.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}}
function inRange(t,s,e){const x=new Date(t).getTime();return x>=new Date(s).getTime()&&x<new Date(e).getTime()}
function earningsFor(d,uid){const p=period5();const ts=d.transactions.filter(t=>t.ownerId===uid&&t.type==='EARNING'&&inRange(t.createdAt,p.start,p.end));return {period:p,total:ts.reduce((a,t)=>a+Number(t.amount),0),transactions:ts}}
async function sms(d,userId,message){const u=d.users.find(x=>x.id===userId);if(!u||!u.phone)return {sent:false,reason:'No registered mobile number'};const rec={id:id('sms'),userId,to:u.phone,message,status:'queued',createdAt:iso()};d.smsLog.unshift(rec);
// Optional Twilio integration. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM and SMS_PROVIDER=twilio.
if(process.env.SMS_PROVIDER==='twilio'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM){try{const auth=Buffer.from(process.env.TWILIO_ACCOUNT_SID+':'+process.env.TWILIO_AUTH_TOKEN).toString('base64');const params=new URLSearchParams({To:u.phone,From:process.env.TWILIO_FROM,Body:message});const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:params});rec.status=r.ok?'sent':'failed';rec.providerResponse=await r.text()}catch(e){rec.status='failed';rec.providerResponse=e.message}}
else rec.status='queued_no_provider';return {sent:rec.status==='sent',status:rec.status}}
async function api(req,res){const d=load(),u=new URL(req.url,'http://localhost'),p=u.pathname;
if(req.method==='POST'&&p==='/api/login'){const b=await body(req),x=d.users.find(x=>x.username===b.username&&x.password===b.password&&x.active!==false);if(!x)return send(res,401,{error:'Invalid login details'});act(d,x.id,'LOGIN','Signed in');save(d);return send(res,200,{user:safeUser(x)})}
if(req.method==='GET'&&p==='/api/state'){const uid=u.searchParams.get('userId'),x=d.users.find(x=>x.id===uid);if(!x)return send(res,401,{error:'Session expired'});const out={user:safeUser(x),settings:d.settings,period:period5(),proximityStatus:{transmitterOnline:!!d.proximity?.transmitter&&Date.now()-new Date(d.proximity.transmitter.updatedAt).getTime()<=20000,updatedAt:d.proximity?.transmitter?.updatedAt||null},notifications:d.notifications.filter(n=>!n.userId||n.userId===uid).slice(0,100),activity:d.activity.slice(0,100)};if(x.role==='admin'){out.users=d.users.map(safeUser);out.attendance=d.attendance;out.videos=d.videos;out.meetings=d.meetings;out.vouchers=d.vouchers;out.withdrawals=d.withdrawals;out.transactions=d.transactions;out.smsLog=d.smsLog;out.adminEarnings=d.transactions.filter(t=>t.ownerId==='admin');}else{out.attendance=d.attendance.filter(a=>a.userId===uid);out.videos=d.videos.filter(v=>v.memberIds.includes(uid));out.meetings=d.meetings.filter(m=>m.memberIds.includes(uid));out.vouchers=d.vouchers.filter(v=>v.userId===uid);out.withdrawals=d.withdrawals.filter(w=>w.userId===uid);out.transactions=d.transactions.filter(t=>t.ownerId===uid);out.earnings=earningsFor(d,uid)}return send(res,200,out)}
if(req.method==='POST'&&p==='/api/team'){const b=await body(req);const creator=d.users.find(x=>x.id===b.adminUserId&&x.role==='admin'&&x.active!==false);if(!creator)return send(res,403,{error:'Only an authenticated Admin can create team accounts'});if(!b.name||!b.username||!b.password)return send(res,400,{error:'Name, username and password are required'});if(d.users.some(x=>x.username===b.username))return send(res,409,{error:'Username already exists'});const x={id:id('u'),username:b.username,password:b.password,name:b.name,role:'member',active:true,phone:b.phone||'',dailyPay:Number(b.dailyPay||d.settings.dailyDefault),wallet:0,upi:'',photo:b.photo||null,createdAt:iso()};d.users.push(x);note(d,x.id,'Welcome to ISMART SUMAN CREATIONS','Your team account was created by the Admin.');act(d,'admin','TEAM_CREATED',x.name);save(d);return send(res,200,{user:safeUser(x)})}
if(req.method==='POST'&&p==='/api/team/update'){const b=await body(req),x=d.users.find(x=>x.id===b.id);if(!x)return send(res,404,{error:'Member not found'});Object.assign(x,{name:b.name??x.name,phone:b.phone??x.phone,dailyPay:Number(b.dailyPay??x.dailyPay),active:b.active!==undefined?!!b.active:x.active});if(b.password)x.password=b.password;if(b.photo!==undefined)x.photo=b.photo;save(d);return send(res,200,{user:safeUser(x)})}
if(req.method==='POST'&&p==='/api/team/delete'){const b=await body(req),i=d.users.findIndex(x=>x.id===b.id&&x.role==='member');if(i<0)return send(res,404,{error:'Member not found'});const x=d.users[i];d.users.splice(i,1);d.attendance=d.attendance.filter(a=>a.userId!==x.id);d.notifications=d.notifications.filter(n=>n.userId!==x.id);act(d,'admin','TEAM_DELETED',x.name);save(d);return send(res,200,{ok:true})}
if(req.method==='POST'&&p==='/api/profile'){const b=await body(req),x=d.users.find(x=>x.id===b.userId);if(!x)return send(res,404,{error:'User not found'});x.phone=b.phone??x.phone;x.upi=b.upi??x.upi;if(b.photo!==undefined)x.photo=b.photo;save(d);return send(res,200,{user:safeUser(x)})}

if(req.method==='POST'&&p==='/api/proximity/admin'){
 const b=await body(req),x=d.users.find(x=>x.id===b.userId);
 if(!x||x.role!=='admin')return send(res,403,{error:'Only the Admin can run the ISC transmitter'});
 if(!validCoords(b))return send(res,400,{error:'Valid Admin device location is required'});
 d.proximity=d.proximity||{transmitter:null,teamLocations:{}};
 d.proximity.transmitter={lat:Number(b.lat),lon:Number(b.lon),accuracy:Number(b.accuracy||0),updatedAt:iso(),userId:x.id};
 save(d);return send(res,200,{ok:true,transmitterOnline:true,updatedAt:d.proximity.transmitter.updatedAt})
}
if(req.method==='POST'&&p==='/api/proximity/team'){
 const b=await body(req),x=d.users.find(x=>x.id===b.userId);
 if(!x||x.role!=='member'||x.active===false)return send(res,403,{error:'Active team account required'});
 if(!validCoords(b))return send(res,400,{error:'Valid Team device location is required'});
 d.proximity=d.proximity||{transmitter:null,teamLocations:{}};
 d.proximity.teamLocations[x.id]={lat:Number(b.lat),lon:Number(b.lon),accuracy:Number(b.accuracy||0),updatedAt:iso()};
 const result=proximityCheck(d,x.id,b.lat,b.lon);save(d);
 return send(res,200,{...result,active:result.inside,transmitterOnline:result.transmitterOnline})
}
if(req.method==='POST'&&p==='/api/proximity/scan'){
 const b=await body(req),x=d.users.find(x=>x.id===b.userId);
 if(!x||x.role!=='member'||x.active===false)return send(res,403,{error:'Active team account required'});
 if(!validCoords(b))return send(res,400,{error:'Valid Team device location is required'});
 d.proximity=d.proximity||{transmitter:null,teamLocations:{}};
 d.proximity.teamLocations[x.id]={lat:Number(b.lat),lon:Number(b.lon),accuracy:Number(b.accuracy||0),updatedAt:iso()};
 const result=proximityCheck(d,x.id,b.lat,b.lon);save(d);
 return send(res,200,{...result,inside:result.inside,transmitterOnline:result.transmitterOnline})
}
if(req.method==='GET'&&p==='/api/proximity/status'){
 const b=d.proximity?.transmitter;return send(res,200,{transmitterOnline:!!b&&Date.now()-new Date(b.updatedAt).getTime()<=20000,updatedAt:b?.updatedAt||null})
}
if(req.method==='POST'&&p==='/api/admin-wallet/set'){
 const b=await body(req),n=Number(b.amount);if(!Number.isFinite(n)||n<0)return send(res,400,{error:'Enter a valid non-negative balance'});
 const old=Number(d.settings.adminWallet||0);d.settings.adminWallet=n;tx(d,'admin','WALLET_BALANCE_SET',n-old,'Admin wallet balance adjusted',{previousBalance:old,newBalance:n});act(d,'admin','WALLET_BALANCE_SET','₹'+old+' → ₹'+n);save(d);return send(res,200,{balance:n})
}
if(req.method==='GET'&&p==='/api/meeting/get'){
 const meetingId=u.searchParams.get('meetingId'),userId=u.searchParams.get('userId'),x=d.users.find(x=>x.id===userId),m=d.meetings.find(x=>x.id===meetingId);
 if(!x||!m||!(x.role==='admin'||(m.memberIds||[]).includes(userId)))return send(res,403,{error:'Meeting not found or access denied'});
 return send(res,200,{meeting:m})
}
if(req.method==='POST'&&p==='/api/meeting/signal'){
 const b=await body(req),m=d.meetings.find(x=>x.id===b.meetingId),x=d.users.find(x=>x.id===b.from);
 if(!m||!x||!(x.role==='admin'||(m.memberIds||[]).includes(x.id)))return send(res,403,{error:'Meeting access denied'});
 d.meetingSignals=d.meetingSignals||[];
 d.meetingSignals.push({id:id('sig'),meetingId:b.meetingId,from:b.from,to:b.to||null,type:String(b.type||''),payload:b.payload||{},createdAt:Date.now()});
 d.meetingSignals=d.meetingSignals.slice(-3000);save(d);return send(res,200,{ok:true})
}
if(req.method==='GET'&&p==='/api/meeting/signals'){
 const meetingId=u.searchParams.get('meetingId'),userId=u.searchParams.get('userId'),after=Number(u.searchParams.get('after')||0),m=d.meetings.find(x=>x.id===meetingId),x=d.users.find(x=>x.id===userId);
 if(!m||!x||!(x.role==='admin'||(m.memberIds||[]).includes(userId)))return send(res,403,{error:'Meeting access denied'});
 return send(res,200,{signals:(d.meetingSignals||[]).filter(s=>s.meetingId===meetingId&&s.createdAt>after&&(!s.to||s.to===userId)&&s.from!==userId).sort((a,b)=>a.createdAt-b.createdAt)})
}
if(req.method==='GET'&&p==='/api/meeting/export'){
 const meetingId=u.searchParams.get('meetingId'),userId=u.searchParams.get('userId'),m=d.meetings.find(x=>x.id===meetingId),x=d.users.find(x=>x.id===userId);
 if(!m||!x||!(x.role==='admin'||(m.memberIds||[]).includes(userId)))return send(res,403,{error:'Meeting access denied'});
 return send(res,200,{meeting:m,signals:(d.meetingSignals||[]).filter(s=>s.meetingId===meetingId)})
}

if(req.method==='POST'&&p==='/api/attendance'){
 const b=await body(req),x=d.users.find(x=>x.id===b.userId);
 if(!x||x.role!=='member'||x.active===false)return send(res,403,{error:'Active team account required'});
 const kind=b.kind,day=b.date||today(),existing=d.attendance.find(a=>a.userId===x.id&&a.date===day),t=iso();
 if(!['checkin','proximity_checkin','checkout'].includes(kind))return send(res,400,{error:'Choose check-in or check-out'});
 const team=d.proximity?.teamLocations?.[x.id],transmitter=d.proximity?.transmitter;
 const check=team&&transmitter?proximityCheck(d,x.id,team.lat,team.lon):{inside:false,transmitterOnline:false,distance:null,reason:'WAITING FOR ADMIN TRANSMITTER'};
 if(!check.inside)return send(res,403,{error:check.reason||'OUT OF OFFICE LOCATION',distance:check.distance});
 if(kind==='checkin'||kind==='proximity_checkin'){
   if(existing?.checkin)return send(res,400,{error:'Morning attendance already recorded'});
   const a=existing||{id:id('att'),userId:x.id,date:day,checkin:null,checkout:null,photo:null,earned:0,checkinDistance:check.distance};
   a.checkin=t;a.checkinDistance=check.distance;a.photo=b.photo||null;
   if(!existing)d.attendance.push(a);
   note(d,x.id,'Attendance recorded','Office proximity check-in recorded at '+new Date(t).toLocaleString('en-IN')+' · '+check.distance+'m','success');
   act(d,x.id,'CHECK_IN',day+' · '+check.distance+'m');save(d);return send(res,200,{attendance:a,distance:check.distance})
 }
 if(!existing?.checkin)return send(res,400,{error:'Check in first'});
 if(existing.checkout)return send(res,400,{error:'Evening checkout already recorded'});
 const elapsed=(Date.now()-new Date(existing.checkin).getTime())/3600000;
 if(elapsed<5)return send(res,400,{error:'Minimum 5 hours is required before check-out. Remaining: '+(5-elapsed).toFixed(1)+' hours.'});
 const earning=Number(x.dailyPay||d.settings.dailyDefault||50);
 if(Number(d.settings.adminWallet)<earning)return send(res,400,{error:'Admin wallet has insufficient funds for today\'s attendance payment'});
 existing.checkout=t;existing.earned=earning;
 d.settings.adminWallet-=earning;x.wallet=Number(x.wallet||0)+earning;
 const txnId=id('tx');d.transactions.unshift({id:txnId,ownerId:x.id,type:'EARNING',amount:earning,description:'Daily attendance earning',meta:{date:day,source:'admin_wallet',linkedAdminTransaction:txnId},createdAt:iso()});
 d.transactions.unshift({id:id('tx'),ownerId:'admin',type:'ATTENDANCE_PAYMENT',amount:-earning,description:'Daily attendance payment to '+x.name,meta:{date:day,memberId:x.id,linkedMemberTransaction:txnId},createdAt:iso()});
 d.transactions=d.transactions.slice(0,5000);
 note(d,x.id,'Daily salary added','₹'+earning+' was added to your wallet for '+day+'.','success');
 note(d,'admin','Attendance payment sent',x.name+' received ₹'+earning+' for '+day+'.','info');
 await sms(d,x.id,'ISMART SUMAN CREATIONS: ₹'+earning+' has been credited to your team wallet for attendance on '+day+'. Wallet balance: ₹'+x.wallet+'.');
 act(d,x.id,'CHECK_OUT',day+' | ₹'+earning);save(d);return send(res,200,{attendance:existing,wallet:x.wallet})
}
if(req.method==='POST'&&p==='/api/photo/delete'){const b=await body(req),a=d.attendance.find(x=>x.id===b.attendanceId);if(!a)return send(res,404,{error:'Attendance not found'});a.photo=null;save(d);return send(res,200,{ok:true})}
if(req.method==='POST'&&p==='/api/video'){const b=await body(req);if(!b.title||!Array.isArray(b.memberIds)||!b.memberIds.length)return send(res,400,{error:'Title and at least one team member required'});const v={id:id('v'),title:b.title,date:b.date||'',start:b.start||'',end:b.end||'',location:b.location||'',notes:b.notes||'',memberIds:b.memberIds,status:'Scheduled',createdAt:iso()};d.videos.unshift(v);v.memberIds.forEach(mid=>note(d,mid,'New video schedule',v.title+' • '+v.date+' '+v.start));save(d);return send(res,200,{video:v})}
if(req.method==='POST'&&p==='/api/video/status'){const b=await body(req),v=d.videos.find(x=>x.id===b.id);if(!v)return send(res,404,{error:'Video not found'});v.status=b.status;save(d);return send(res,200,{video:v})}
if(req.method==='POST'&&p==='/api/meeting'){const b=await body(req);if(!b.title||!b.memberIds?.length)return send(res,400,{error:'Meeting title and members required'});const m={id:id('m'),title:b.title,date:b.date||'',time:b.time||'',agenda:b.agenda||'',memberIds:b.memberIds,link:b.link||'',createdAt:iso()};d.meetings.unshift(m);m.memberIds.forEach(mid=>note(d,mid,'Meeting scheduled',m.title+' • '+m.date+' '+m.time));save(d);return send(res,200,{meeting:m})}
if(req.method==='POST'&&p==='/api/voucher'){const b=await body(req),x=d.users.find(x=>x.id===b.userId);if(!x)return send(res,404,{error:'User not found'});if(!['Jio','Airtel','Vi','BSNL'].includes(b.operator))return send(res,400,{error:'Select a valid operator'});if(!/^[0-9]{10}$/.test(b.number)||b.number!==b.confirmNumber)return send(res,400,{error:'Enter a valid 10-digit number and confirm it correctly'});const amount=Number(b.amount);if(!amount||amount<10)return send(res,400,{error:'Enter a valid recharge amount'});const v={id:id('r'),userId:x.id,memberName:x.name,operator:b.operator,number:b.number,name:b.name||x.name,amount,status:'Pending',createdAt:iso(),paidAt:null};d.vouchers.unshift(v);note(d,'admin','Recharge request',x.name+' requested ₹'+amount+' '+b.operator+' recharge.','warning');note(d,x.id,'Recharge request submitted','Your ₹'+amount+' recharge request is waiting for Admin review.');act(d,x.id,'RECHARGE_REQUEST','₹'+amount+' '+b.operator);save(d);return send(res,200,{voucher:v})}
if(req.method==='POST'&&p==='/api/voucher/action'){const b=await body(req),v=d.vouchers.find(x=>x.id===b.id);if(!v)return send(res,404,{error:'Request not found'});if(v.status!=='Pending')return send(res,400,{error:'Request already processed'});if(b.action==='approve'){const member=d.users.find(u=>u.id===v.userId);if(!member)return send(res,404,{error:'Member not found'});if(Number(member.wallet)<v.amount)return send(res,400,{error:'Member wallet balance is insufficient for this recharge'});member.wallet-=v.amount;d.settings.adminWallet=Number(d.settings.adminWallet||0)+v.amount;v.status='Paid';v.paidAt=iso();const rechargeTxn=tx(d,member.id,'RECHARGE',-v.amount,'Mobile recharge payment to Admin',{voucherId:v.id,operator:v.operator,number:v.number,linkedAdminTransaction:true});tx(d,'admin','RECHARGE_COLLECTION',v.amount,'Recharge amount received from '+member.name,{voucherId:v.id,memberId:member.id,linkedMemberTransaction:rechargeTxn.id,operator:v.operator,number:v.number});note(d,v.userId,'Recharge approved','Your ₹'+v.amount+' '+v.operator+' recharge was approved. ₹'+v.amount+' was deducted from your team wallet.','success');await sms(d,v.userId,'ISMART SUMAN CREATIONS: Your ₹'+v.amount+' '+v.operator+' recharge was approved. ₹'+v.amount+' was deducted from your team wallet. Balance: ₹'+member.wallet+'.');act(d,'admin','RECHARGE_PAID',v.memberName+' ₹'+v.amount+' from member wallet')}else{v.status='Rejected';note(d,v.userId,'Recharge request rejected','Admin rejected your ₹'+v.amount+' recharge request.','error');await sms(d,v.userId,'ISMART SUMAN CREATIONS: Your ₹'+v.amount+' recharge request was rejected by Admin.');act(d,'admin','RECHARGE_REJECTED',v.memberName+' ₹'+v.amount)}save(d);return send(res,200,{voucher:v,adminWallet:d.settings.adminWallet})}
if(req.method==='POST'&&p==='/api/admin-wallet'){const b=await body(req),n=Number(b.amount);if(!n||n<=0)return send(res,400,{error:'Enter a valid amount'});d.settings.adminWallet+=n;tx(d,'admin','WALLET_TOPUP',n,'Admin wallet top-up');act(d,'admin','WALLET_TOPUP','₹'+n);save(d);return send(res,200,{balance:d.settings.adminWallet})}
if(req.method==='POST'&&p==='/api/withdraw'){const b=await body(req),x=d.users.find(x=>x.id===b.userId);if(!x)return send(res,404,{error:'User not found'});const n=Number(b.amount);if(!n||n<=0||n>x.wallet)return send(res,400,{error:'Invalid withdrawal amount or insufficient wallet'});if(!x.upi&&!b.upi)return send(res,400,{error:'Add your UPI ID first'});if(b.upi)x.upi=b.upi;const w={id:id('w'),userId:x.id,memberName:x.name,amount:n,upi:x.upi,status:'Pending',createdAt:iso(),paidAt:null};d.withdrawals.unshift(w);note(d,'admin','Salary withdrawal request',x.name+' requested '+money(n)+' to '+x.upi,'warning');note(d,x.id,'Withdrawal submitted','Your withdrawal request is waiting for Admin payment.');save(d);return send(res,200,{withdrawal:w})}
if(req.method==='POST'&&p==='/api/withdraw/action'){const b=await body(req),w=d.withdrawals.find(x=>x.id===b.id),x=w&&d.users.find(x=>x.id===w.userId);if(!w||!x)return send(res,404,{error:'Withdrawal not found'});if(w.status!=='Pending')return send(res,400,{error:'Withdrawal already processed'});if(b.action==='approve'){if(d.settings.adminWallet<w.amount)return send(res,400,{error:'Admin wallet balance is insufficient'});if(x.wallet<w.amount)return send(res,400,{error:'Member wallet balance is insufficient'});d.settings.adminWallet-=w.amount;x.wallet-=w.amount;w.status='Paid';w.paidAt=iso();tx(d,'admin','SALARY_PAYOUT',-w.amount,'Salary payout to member',{memberId:x.id,withdrawalId:w.id,upi:w.upi});tx(d,x.id,'WITHDRAWAL',-w.amount,'Salary payout sent to UPI',{withdrawalId:w.id,upi:w.upi});note(d,x.id,'Salary paid','Admin marked your '+money(w.amount)+' salary withdrawal as PAID to '+w.upi+'.','success');await sms(d,x.id,'ISMART SUMAN CREATIONS: Your salary payment of ₹'+w.amount+' has been paid by Admin to '+w.upi+'.');act(d,'admin','SALARY_PAID',x.name+' '+w.amount)}else{w.status='Rejected';note(d,x.id,'Withdrawal rejected','Admin rejected your salary withdrawal request.','error');await sms(d,x.id,'ISMART SUMAN CREATIONS: Your salary withdrawal request was rejected by Admin.');act(d,'admin','SALARY_REJECTED',x.name+' '+w.amount)}save(d);return send(res,200,{withdrawal:w,adminWallet:d.settings.adminWallet})}
if(req.method==='POST'&&p==='/api/notification/read'){const b=await body(req);d.notifications.filter(n=>n.userId===b.userId).forEach(n=>n.read=true);save(d);return send(res,200,{ok:true})}
send(res,404,{error:'API route not found'})}
module.exports=api;
if(require.main===module){const server=http.createServer(async(req,res)=>{try{if(req.url.startsWith('/api/'))return await api(req,res);const p=new URL(req.url,'http://localhost').pathname;if(p==='/'||p==='/index.html')return html(res,'index.html');return html(res,p.slice(1))}catch(e){console.error(e);send(res,500,{error:e.message})}});server.listen(process.env.PORT||3000,()=>console.log('ISMART SUMAN CREATIONS OFFICE running on http://localhost:'+(process.env.PORT||3000)));}
