/* =========================================================
   捕星少年 · 完整版后端（多用户：家长端 + 孩子账号）
   纯 Node.js，零外部依赖：node server.js 即可运行
   数据存 data.json；token 会话存内存
   ========================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');

const DUE = '2026-08-28';
const SUMMER_START = '2026-07-01';
const WEEK_CN = ['日','一','二','三','四','五','六'];
// 默认奖励（仅作为首次 seed 与字段缺失时的兜底，家长可在前端自由增删改）
const DEFAULT_REWARDS = [
  {id:'rw1', name:'阅读小能手', stars:50},
  {id:'rw2', name:'口算达人', stars:100},
  {id:'rw3', name:'全勤小明星', stars:150}
];

/* ---------------- 日期工具 ---------------- */
function todayStr(d = new Date()){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function parseDate(s){ const [y,m,dd]=s.split('-').map(Number); return new Date(y,m-1,dd); }
function addDays(s,n){ const d=parseDate(s); d.setDate(d.getDate()+n); return todayStr(d); }
function daysBetween(a,b){ return Math.round((parseDate(b)-parseDate(a))/86400000); }
function daysUntil(dateStr){ const t=new Date(); t.setHours(0,0,0,0); return Math.round((parseDate(dateStr)-t)/86400000); }
function fmtCN(s){ const d=parseDate(s); return (d.getMonth()+1)+'月'+d.getDate()+'日 '+WEEK_CN[d.getDay()]; }

/* ---------------- 密码 / 数据 ---------------- */
function hash(pwd){ return crypto.createHash('sha256').update(String(pwd)).digest('hex'); }

function seed(){
  const users = [
    {id:'u_mum', username:'Mum', password:hash('20260725'), role:'parent', name:'妈妈', color:'#6BB6E0'},
    {id:'u_damon', username:'Damon', password:hash('2013'), role:'child', name:'Damon', parentId:'u_mum', color:'#FF8C7A'},
    {id:'u_lemon', username:'Lemon', password:hash('2016'), role:'child', name:'Lemon', parentId:'u_mum', color:'#FFC857'}
  ];
  const homeworks = [
    // 小明
    {id:'h1', childId:'u_xm', title:'背诵古诗《静夜思》', subject:'chinese', type:'daily', repeat:[1,2,3,4,5], startDate:'2026-07-01', endDate:'2026-08-28', planCount:16, status:'active', createdAt:'2026-07-01'},
    {id:'h2', childId:'u_xm', title:'完成口算练习 P12', subject:'math', type:'daily', repeat:[1,2,3,4,5], startDate:'2026-07-01', endDate:'2026-08-28', planCount:15, status:'active', createdAt:'2026-07-01'},
    {id:'h3', childId:'u_xm', title:'朗读英语课文 Unit 3', subject:'english', type:'daily', repeat:[1,2,3,4,5], startDate:'2026-07-01', endDate:'2026-08-28', planCount:13, status:'active', createdAt:'2026-07-01'},
    {id:'h4', childId:'u_xm', title:'写一篇暑假日记', subject:'chinese', type:'one_time', dueDate:'2026-08-10', priority:2, planCount:1, status:'active', createdAt:'2026-07-20'},
    // 小红
    {id:'h5', childId:'u_xh', title:'朗读语文课文第5课', subject:'chinese', type:'daily', repeat:[1,2,3,4,5], startDate:'2026-07-01', endDate:'2026-08-28', planCount:10, status:'active', createdAt:'2026-07-01'},
    {id:'h6', childId:'u_xh', title:'数学口算 20 题', subject:'math', type:'daily', repeat:[1,2,3,4,5], startDate:'2026-07-01', endDate:'2026-08-28', planCount:12, status:'active', createdAt:'2026-07-01'},
    {id:'h7', childId:'u_xh', title:'背英语单词 10 个', subject:'english', type:'daily', repeat:[1,2,3,4,5], startDate:'2026-07-01', endDate:'2026-08-28', planCount:8, status:'active', createdAt:'2026-07-01'},
    {id:'h8', childId:'u_xh', title:'完成数学应用题', subject:'math', type:'one_time', dueDate:'2026-08-05', priority:1, planCount:1, status:'active', createdAt:'2026-07-20'}
  ];
  const checkins = [];
  const rewards = DEFAULT_REWARDS.map(r=>({...r}));
  return {users, homeworks, checkins, rewards};
}

let db;
const BACKUP_DIR = path.join(ROOT,'backups');
function backupData(){
  try{
    if(fs.existsSync(DATA_FILE)){
      fs.copyFileSync(DATA_FILE, DATA_FILE+'.bak');           // 滚动备份（最近一次）
      if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR,{recursive:true});
      const snap = path.join(BACKUP_DIR, 'data-'+todayStr()+'.json'); // 每天一份快照
      if(!fs.existsSync(snap)) fs.copyFileSync(DATA_FILE, snap);
    }
  }catch(e){}
}
function loadData(){
  if(fs.existsSync(DATA_FILE)){
    try{ db = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); return; }catch(e){}
  }
  // 数据文件丢失/损坏，尝试从滚动备份恢复，避免数据凭空消失
  const bak = DATA_FILE+'.bak';
  if(fs.existsSync(bak)){
    try{ fs.copyFileSync(bak, DATA_FILE); db = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); console.log('数据文件丢失，已从 data.json.bak 自动恢复'); return; }catch(e){}
  }
  db = seed(); saveData();
}
function ensureSchema(){
  // 兼容旧数据：若缺少 rewards 字段，补上默认奖励（家长可后续在界面修改）
  if(!Array.isArray(db.rewards)) db.rewards = DEFAULT_REWARDS.map(r=>({...r}));
}
function saveData(){ try{ fs.writeFileSync(DATA_FILE, JSON.stringify(db,null,2)); backupData(); }catch(e){} }
loadData();
ensureSchema(); saveData();

const sessions = new Map(); // token -> userId

/* ---------------- 业务计算 ---------------- */
function homeworksOf(childId){ return db.homeworks.filter(h=>h.childId===childId && h.status!=='deleted'); }
function checkinsOf(childId){ return db.checkins.filter(c=>c.childId===childId); }
function starsOf(childId){ return checkinsOf(childId).length; }
function isDoneToday(hw, childId){ return db.checkins.some(c=>c.hwId===hw.id && c.childId===childId && c.date===todayStr()); }
function computePlanCount(hw){
  if(hw.type==='one_time') return 1;
  let n=0,d=hw.startDate;
  while(daysBetween(d,hw.endDate)>=0){ if(hw.repeat.includes(parseDate(d).getDay())) n++; d=addDays(d,1); }
  return n;
}
function subjectStats(childId){
  const out={chinese:{done:0,plan:0},math:{done:0,plan:0},english:{done:0,plan:0},other:{done:0,plan:0}};
  for(const hw of homeworksOf(childId)){
    const plan = hw.planCount!=null?hw.planCount:computePlanCount(hw);
    const done = checkinsOf(childId).filter(c=>c.hwId===hw.id).length;
    out[hw.subject].plan+=plan; out[hw.subject].done+=Math.min(done,plan);
  }
  for(const k in out){ const s=out[k]; s.pct=s.plan?Math.round(s.done/s.plan*100):0; }
  return out;
}
function todayTasks(childId){
  const t=todayStr(), wd=new Date().getDay(), list=[];
  for(const hw of homeworksOf(childId)){
    if(hw.type==='daily'){
      if(daysBetween(hw.startDate,t)>=0 && daysBetween(t,hw.endDate)>=0 && hw.repeat.includes(wd)){
        list.push({hw, done:isDoneToday(hw,childId)});
      }
    } else if(hw.type==='one_time'){
      if(!db.checkins.some(c=>c.hwId===hw.id && c.childId===childId)) list.push({hw, done:false});
    }
  }
  return list;
}
function streakOf(childId){
  // 从今天起往回数，每天至少有一条打卡则连续
  let streak=0; let d=todayStr();
  // 今天若还没有打卡，从昨天开始算连续
  if(!checkinsOf(childId).some(c=>c.date===d)) d=addDays(d,-1);
  while(checkinsOf(childId).some(c=>c.date===d)){ streak++; d=addDays(d,-1); }
  return streak;
}
function childSummary(u){
  const tasks=todayTasks(u.id);
  const done=tasks.filter(t=>t.done).length;
  return {
    id:u.id, name:u.name, color:u.color,
    stars:starsOf(u.id), streak:streakOf(u.id),
    todayDone:done, todayTotal:tasks.length,
    subjects:subjectStats(u.id)
  };
}

/* ---------------- HTTP / API ---------------- */
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
function send(res,code,obj){ res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); }
function readBody(req,cb){ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{cb(JSON.parse(b||'{}'));}catch(e){cb({});} }); }
function authUser(req){
  const t=(req.headers['authorization']||'').replace(/^Bearer\s+/i,'');
  const uid=sessions.get(t); if(!uid) return null;
  return db.users.find(u=>u.id===uid)||null;
}

function handleApi(req,res,url){
  const route=url.pathname;

  if(route==='/api/login' && req.method==='POST'){
    return readBody(req,(body)=>{
      const u=db.users.find(x=>x.username===body.username && x.password===hash(body.password||''));
      if(!u) return send(res,401,{error:'账号或密码错误'});
      const token=crypto.randomBytes(16).toString('hex');
      sessions.set(token,u.id);
      send(res,200,{token, id:u.id, role:u.role, name:u.name, color:u.color});
    });
  }

  const me=authUser(req);
  if(!me) return send(res,401,{error:'未登录或登录已过期'});

  if(route==='/api/me') return send(res,200,{id:me.id, role:me.role, name:me.name, color:me.color});

  /* ---- 孩子端 ---- */
  if(me.role==='child'){
    if(route==='/api/child/home'){
      const st=subjectStats(me.id);
      return send(res,200,{ name:me.name, subjects:st, stars:starsOf(me.id), streak:streakOf(me.id),
        countdown:{daysLeft:daysUntil(DUE), dueCN:fmtCN(DUE), total:daysBetween(SUMMER_START,DUE), elapsed:daysBetween(SUMMER_START,todayStr())} });
    }
    if(route==='/api/child/today'){
      const tasks=todayTasks(me.id).map(({hw,done})=>({id:hw.id,title:hw.title,subject:hw.subject,type:hw.type,done}));
      return send(res,200,{ date:fmtCN(todayStr()), tasks });
    }
    if(route==='/api/child/bank'){
      const stars=starsOf(me.id);
      const sorted=[...db.rewards].sort((a,b)=>a.stars-b.stars);
      return send(res,200,{ stars, trophies:sorted.map(t=>({name:t.name,stars:t.stars,got:stars>=t.stars})) });
    }
    if(route==='/api/child/checkin' && req.method==='POST'){
      return readBody(req,(body)=>{
        const hw=db.homeworks.find(h=>h.id===body.hwId && h.childId===me.id);
        if(!hw) return send(res,404,{error:'作业不存在'});
        if(hw.type==='daily' && isDoneToday(hw,me.id)) return send(res,400,{error:'今天已经打卡啦'});
        if(hw.type==='one_time' && db.checkins.some(c=>c.hwId===hw.id && c.childId===me.id)) return send(res,400,{error:'这项作业已完成'});
        db.checkins.push({id:'c'+Date.now(), childId:me.id, hwId:hw.id, date:todayStr(), at:Date.now()});
        if(hw.type==='one_time') hw.status='done';
        saveData();
        send(res,200,{ok:true, stars:starsOf(me.id)});
      });
    }
    if(route==='/api/child/homework' && req.method==='POST'){
      return readBody(req,(body)=>{
        const title=(body.title||'').trim();
        if(!title) return send(res,400,{error:'请填写作业标题'});
        const hw={ id:'h'+Date.now(), childId:me.id, title, subject:body.subject||'chinese', type:body.type==='daily'?'daily':'one_time', status:'active', createdAt:todayStr() };
        if(hw.type==='one_time'){ hw.dueDate=body.dueDate||DUE; hw.priority=Number(body.priority)||2; hw.planCount=1; }
        else{
          hw.startDate=body.startDate||todayStr(); hw.endDate=body.endDate||DUE;
          hw.repeat=Array.isArray(body.repeat)&&body.repeat.length?body.repeat.map(Number):[1,2,3,4,5];
          hw.planCount=computePlanCount(hw);
        }
        db.homeworks.push(hw); saveData();
        send(res,200,{ok:true, hw});
      });
    }
    // 列出我的作业（用于编辑 / 删除）
    if(route==='/api/child/homework' && req.method==='GET'){
      const list=homeworksOf(me.id).map(h=>({id:h.id,title:h.title,subject:h.subject,type:h.type,status:h.status,
        dueDate:h.dueDate||null, priority:h.priority||null, repeat:h.repeat||null, endDate:h.endDate||null, startDate:h.startDate||null}));
      return send(res,200,{homeworks:list});
    }
    // 编辑 / 删除 作业
    const hwMatch = route.match(/^\/api\/child\/homework\/([\w-]+)$/);
    if(hwMatch && (req.method==='PUT' || req.method==='DELETE')){
      return readBody(req,(body)=>{
        const hw=db.homeworks.find(h=>h.id===hwMatch[1] && h.childId===me.id);
        if(!hw) return send(res,404,{error:'作业不存在'});
        if(req.method==='DELETE'){ hw.status='deleted'; saveData(); return send(res,200,{ok:true}); }
        if(body.title!==undefined){ const t=(body.title||'').trim(); if(!t) return send(res,400,{error:'请填写作业标题'}); hw.title=t; }
        if(body.subject!==undefined) hw.subject=body.subject||'chinese';
        if(body.type!==undefined){
          const nt=body.type==='daily'?'daily':'one_time';
          if(nt!==hw.type){
            hw.type=nt;
            if(nt==='one_time'){ hw.dueDate=body.dueDate||DUE; hw.priority=Number(body.priority)||2; hw.planCount=1; hw.repeat=undefined; hw.startDate=undefined; hw.endDate=undefined; }
            else { hw.startDate=body.startDate||todayStr(); hw.endDate=body.endDate||DUE; hw.repeat=Array.isArray(body.repeat)&&body.repeat.length?body.repeat.map(Number):[1,2,3,4,5]; hw.planCount=computePlanCount(hw); hw.dueDate=undefined; hw.priority=undefined; }
          }
        }
        if(hw.type==='daily'){
          if(body.repeat!==undefined) hw.repeat=Array.isArray(body.repeat)&&body.repeat.length?body.repeat.map(Number):[1,2,3,4,5];
          if(body.endDate!==undefined) hw.endDate=body.endDate||DUE;
          hw.planCount=computePlanCount(hw);
        } else {
          if(body.dueDate!==undefined) hw.dueDate=body.dueDate||DUE;
          if(body.priority!==undefined) hw.priority=Number(body.priority)||2;
        }
        saveData();
        send(res,200,{ok:true, hw});
      });
    }
  }

  /* ---- 家长端 ---- */
  if(me.role==='parent'){
    if(route==='/api/parent/children'){
      const kids=db.users.filter(u=>u.role==='child' && u.parentId===me.id).map(childSummary);
      return send(res,200,{ parent:{name:me.name}, children:kids });
    }
    // 星星奖励：家长自定义（增删改查）
    if(route==='/api/parent/rewards'){
      if(req.method==='GET'){
        const list=[...db.rewards].sort((a,b)=>a.stars-b.stars);
        return send(res,200,{rewards:list});
      }
      if(req.method==='POST'){
        return readBody(req,(b)=>{
          const name=(b.name||'').trim(); const stars=Number(b.stars);
          if(!name) return send(res,400,{error:'请填写奖励名称'});
          if(!stars||stars<=0) return send(res,400,{error:'星星数必须为正数'});
          const rw={id:'rw'+Date.now(), name, stars:Math.floor(stars)};
          db.rewards.push(rw); saveData();
          return send(res,200,{ok:true, reward:rw});
        });
      }
    }
    const rwu = route.match(/^\/api\/parent\/rewards\/([\w-]+)$/);
    if(rwu){
      const rw=db.rewards.find(x=>x.id===rwu[1]);
      if(!rw) return send(res,404,{error:'奖励不存在'});
      if(req.method==='PUT'){
        return readBody(req,(b)=>{
          const name=(b.name||'').trim(); const stars=Number(b.stars);
          if(!name) return send(res,400,{error:'请填写奖励名称'});
          if(!stars||stars<=0) return send(res,400,{error:'星星数必须为正数'});
          rw.name=name; rw.stars=Math.floor(stars); saveData();
          return send(res,200,{ok:true, reward:rw});
        });
      }
      if(req.method==='DELETE'){
        db.rewards=db.rewards.filter(x=>x.id!==rwu[1]); saveData();
        return send(res,200,{ok:true});
      }
    }
    // 查看某个孩子的今日任务
    const dm=route.match(/^\/api\/parent\/child\/([\w-]+)\/today$/);
    if(dm){
      const child=db.users.find(u=>u.id===dm[1] && u.parentId===me.id);
      if(!child) return send(res,404,{error:'孩子不存在'});
      const tasks=todayTasks(child.id).map(({hw,done})=>({title:hw.title,subject:hw.subject,type:hw.type,done}));
      return send(res,200,{ name:child.name, date:fmtCN(todayStr()), tasks });
    }
  }

  send(res,404,{error:'接口不存在'});
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname);
  if(pathname.startsWith('/api/')) return handleApi(req,res,url);
  // 静态文件
  let fp = pathname==='/'?'/index.html':pathname;
  const abs=path.join(PUBLIC, path.normalize(fp));
  if(!abs.startsWith(PUBLIC) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()){
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); return res.end('not found');
  }
  res.writeHead(200,{'Content-Type':MIME[path.extname(abs).toLowerCase()]||'application/octet-stream'});
  fs.createReadStream(abs).pipe(res);
});

server.listen(PORT, '0.0.0.0', ()=>{
  console.log('捕星少年完整版已启动: http://127.0.0.1:'+PORT);
  console.log('账号 -> 家长 Mum ；孩子 Damon / 2013、Lemon / 2016');
});
