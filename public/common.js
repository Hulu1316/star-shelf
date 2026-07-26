/* 捕星少年 · 前端共享模块：图标 / 科目 / API / 登录态 / 动画 */
'use strict';

const ICONS = {
  star:'<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.6l2.85 5.78 6.37.93-4.61 4.5 1.09 6.34L12 17.9l-5.7 3 1.09-6.34-4.61-4.5 6.37-.93z" fill="#FFC857" stroke="#F0A92E" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#7BB661"/><path d="M7.8 12.3l2.8 2.8L16.4 9.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  circle:'<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="none" stroke="#F5E5BD" stroke-width="2.2"/></svg>',
  plus:'<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#FF8C7A"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M7 4.5h10v3.8a5 5 0 0 1-10 0V4.5z" fill="#FFC857" stroke="#F0A92E" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 5.6H4.7A2.3 2.3 0 0 0 7 7.9M17 5.6h2.3A2.3 2.3 0 0 1 17 7.9" stroke="#F0A92E" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M12 13.3v2.8M9.2 20h5.6M10.2 20h3.6v-3.5h-3.6z" stroke="#F0A92E" stroke-width="1.2" fill="none" stroke-linejoin="round"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#2D2A26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 9.5h16M8 3v4M16 3v4M9 14.5l2 2 4-4"/></svg>',
  navShelf:'<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="15" rx="1.5"/><rect x="11.5" y="4" width="6.5" height="15" rx="1.5"/><path d="M3 20.5h18"/></svg>',
  navToday:'<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 9.5h16M8 3v4M16 3v4M9 14.5l2 2 4-4"/></svg>',
  navBank:'<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 13.5a6.5 6.5 0 0 1 13 0c0 1.4-.4 2.3-1.3 3-.4.3-.8.6-.8.6H7.6s-.4-.3-.8-.6c-.9-.7-1.3-1.6-1.3-3z"/><path d="M12 7V5M9 11.5H7.5M17 11.5h-1.5"/></svg>',
  navCal:'<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M8 2v4M16 2v4"/></svg>'
};
const SUBJECT = {
  chinese:{name:'语文', color:'var(--c-chinese)', cls:'chinese'},
  math:{name:'数学', color:'var(--c-math)', cls:'math'},
  english:{name:'英语', color:'var(--c-english)', cls:'english'},
  other:{name:'其他', color:'var(--c-other)', cls:'other'}
};

const $ = s => document.querySelector(s);

/* ---------- API ---------- */
const API = {
  token: localStorage.getItem('ss_token') || null,
  async req(path, opts = {}){
    const headers = {'Content-Type':'application/json', ...(opts.headers||{})};
    if(this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const res = await fetch(path, {...opts, headers});
    const data = await res.json().catch(()=>({}));
    if(res.status === 401){ logout(); throw new Error(data.error || '登录已过期'); }
    if(!res.ok) throw new Error(data.error || '请求失败');
    return data;
  },
  get(p){ return this.req(p); },
  post(p, body){ return this.req(p, {method:'POST', body:JSON.stringify(body)}); },
  put(p, body){ return this.req(p, {method:'PUT', body:JSON.stringify(body)}); },
  del(p, body){ return this.req(p, {method:'DELETE', body: body?JSON.stringify(body):undefined}); }
};
function setSession(token, user){ API.token = token; localStorage.setItem('ss_token', token); localStorage.setItem('ss_user', JSON.stringify(user)); }
function currentUser(){ try{ return JSON.parse(localStorage.getItem('ss_user')); }catch(e){ return null; } }
function logout(){ localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user'); location.href='/'; }
function requireRole(role){
  const u = currentUser();
  if(!API.token || !u){ location.href='/'; return null; }
  if(role && u.role !== role){ location.href = u.role==='parent' ? '/parent.html' : '/child.html'; return null; }
  return u;
}

/* ---------- Toast ---------- */
let _toastTimer = null;
function toast(msg){
  const el = $('#toast'); if(!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_toastTimer); _toastTimer = setTimeout(()=>el.classList.remove('show'), 1800);
}

/* ---------- 飞星动画 ---------- */
function flyStar(fromEl){
  const layer = $('#flyLayer'); const badgeEl = $('#badgeStar');
  if(!layer || !badgeEl || !fromEl) return;
  const badge = badgeEl.getBoundingClientRect();
  const r = fromEl.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'fly-star'; s.innerHTML = ICONS.star;
  s.style.left = (r.left + r.width/2) + 'px';
  s.style.top  = (r.top + r.height/2) + 'px';
  s.style.transform = 'translate(-50%,-50%) scale(1)';
  layer.appendChild(s);
  requestAnimationFrame(()=>{
    const dx = (badge.left + badge.width/2) - (r.left + r.width/2);
    const dy = (badge.top + badge.height/2) - (r.top + r.height/2);
    s.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35)`;
    s.style.opacity = '0';
  });
  setTimeout(()=>s.remove(), 950);
  const cnt = $('#headerStarCount');
  if(cnt){ cnt.style.transition='transform .3s'; cnt.style.transform='scale(1.4)'; setTimeout(()=>cnt.style.transform='scale(1)',300); }
}

/* ---------- 顶栏图标注入 ---------- */
function injectHeaderIcons(){
  const b = $('#brandStar'); if(b) b.innerHTML = ICONS.star;
  const s = $('#badgeStar'); if(s) s.innerHTML = ICONS.star;
  const map = {shelf:'navShelf', today:'navToday', bank:'navBank', cal:'navCal'};
  document.querySelectorAll('.mn-ico').forEach(el=>{ el.innerHTML = ICONS[map[el.dataset.ico]] || ''; });
}

/* ---------- 沉浸式摘星奖励动画（卡通小王子 → 外太空摘星 → 投入存钱罐） ---------- */
const PRINCE_SVG = `<svg viewBox="0 0 88 104" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <!-- 小星球底座 -->
  <ellipse cx="44" cy="94" rx="26" ry="9" fill="#6BB6E0" opacity="0.95"/>
  <!-- 双腿 -->
  <path d="M36 74 q-7 1 -10 13" stroke="#7BB661" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M52 74 q7 1 10 13" stroke="#7BB661" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- 长袍身体 -->
  <path d="M30 50 q14 -8 28 0 l4 26 h-36 z" fill="#7BB661"/>
  <path d="M44 50 v26" stroke="#5E9E4A" stroke-width="2" opacity="0.45"/>
  <!-- 左臂（上举持剑） -->
  <path d="M31 54 q-11 -2 -17 -16" stroke="#7BB661" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- 右臂（持玫瑰） -->
  <path d="M57 54 q12 1 16 13" stroke="#7BB661" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- 头 -->
  <circle cx="44" cy="36" r="14" fill="#FFE0BD"/>
  <!-- 头发 -->
  <path d="M30 35 q0 -21 14 -21 q14 0 14 21 q-7 -9 -14 -9 q-7 0 -14 9 z" fill="#FFD24D"/>
  <!-- 皇冠 -->
  <path d="M32 22 L35 8 L41 16 L44 6 L47 16 L53 8 L56 22 Z" fill="#FFC857" stroke="#F0A92E" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="44" cy="12" r="2.2" fill="#FF6B8A"/>
  <circle cx="35" cy="18" r="1.8" fill="#6BB6E0"/>
  <circle cx="53" cy="18" r="1.8" fill="#6BB6E0"/>
  <!-- 眼睛 -->
  <circle cx="39" cy="37" r="2" fill="#2D2A26"/>
  <circle cx="49" cy="37" r="2" fill="#2D2A26"/>
  <!-- 微笑 -->
  <path d="M40 42 q4 3 8 0" stroke="#C9744B" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <!-- 玫瑰（右手） -->
  <path d="M73 64 q-2 9 -2 16" stroke="#7BB661" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M71 70 q-8 0 -10 6 q8 3 10 -6 z" fill="#7BB661"/>
  <circle cx="73" cy="58" r="6.5" fill="#FF7A9A"/>
  <circle cx="73" cy="58" r="3" fill="#FF4D77"/>
  <!-- 剑（左手，上举） -->
  <rect x="10" y="16" width="4" height="24" rx="2" fill="#DCE3EC"/>
  <rect x="11" y="16" width="1.4" height="24" fill="#FFFFFF" opacity="0.6"/>
  <rect x="4" y="38" width="16" height="4" rx="2" fill="#F0A92E"/>
  <rect x="11" y="42" width="2.6" height="9" rx="1.3" fill="#C9744B"/>
  <circle cx="12.3" cy="53" r="2.4" fill="#F0A92E"/>
</svg>`;
const PIGGY_SVG = `<svg viewBox="0 0 72 54" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="34" cy="33" rx="28" ry="17" fill="#FFB3C7"/>
  <path d="M19 17 q-7 -9 3 -11 q5 7 -3 11 z" fill="#FF9DB6"/>
  <ellipse cx="58" cy="31" rx="9" ry="7" fill="#FF9DB6"/>
  <circle cx="55" cy="31" r="1.6" fill="#C94E6B"/>
  <circle cx="61" cy="31" r="1.6" fill="#C94E6B"/>
  <circle cx="44" cy="27" r="2" fill="#2D2A26"/>
  <rect x="20" y="47" width="6" height="6" rx="2" fill="#FF9DB6"/>
  <rect x="44" y="47" width="6" height="6" rx="2" fill="#FF9DB6"/>
  <rect x="26" y="15" width="16" height="3.5" rx="1.8" fill="#C94E6B"/>
  <path d="M6 31 q-4 2 0 6" stroke="#FF9DB6" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

function raEl(cls, html){ const e=document.createElement('div'); e.className=cls; if(html!=null) e.innerHTML=html; return e; }

async function playStarReward(fromEl, onLand){
  if(!fromEl){ flyStar(null); if(onLand) onLand(); return; }
  const layer = document.getElementById('rewardAnim');
  if(!layer){ flyStar(fromEl); if(onLand) onLand(); return; }
  layer.innerHTML = '';
  layer.classList.add('active');
  const back = raEl('ra-back'); layer.appendChild(back);
  for(let i=0;i<26;i++){ const s=raEl('ra-tw'); s.style.left=(Math.random()*100)+'%'; s.style.top=(Math.random()*100)+'%'; s.style.animationDelay=(Math.random()*2)+'s'; back.appendChild(s); }
  const prince = raEl('ra-prince'); layer.appendChild(prince);
  const princeImg = document.createElement('img'); princeImg.className='ra-img'; princeImg.src='/prince-3d.png'; princeImg.alt='小王子';
  princeImg.onerror = ()=>{ prince.innerHTML = PRINCE_SVG; };
  prince.appendChild(princeImg);
  const star   = raEl('ra-star', ICONS.star);    layer.appendChild(star);
  const big    = raEl('ra-bigstar', ICONS.star); layer.appendChild(big);
  const piggy  = raEl('ra-piggy', PIGGY_SVG);     layer.appendChild(piggy);
  const spark  = raEl('ra-spark', ICONS.star);   layer.appendChild(spark);

  const vh = window.innerHeight;
  void layer.offsetWidth; // 强制布局，确保 getBoundingClientRect 准确
  try{
    // 1) 起飞：小王子与怀中星星飞向外太空
    const lift = vh * 0.55;
    const ease = 'cubic-bezier(.22,1,.36,1)';
    prince.animate([{transform:'translate(-50%,0)'},{transform:`translate(-50%,-${lift}px)`}],{duration:1000,easing:ease,fill:'forwards'});
    star.animate([{transform:'translate(-50%,0)'},{transform:`translate(-50%,-${lift}px)`}],{duration:1000,easing:ease,fill:'forwards'});
    big.animate([{transform:'translateX(-50%) scale(0)',opacity:0},{transform:'translateX(-50%) scale(1)',opacity:1}],{duration:600,delay:520,easing:'ease-out',fill:'forwards'});
    await new Promise(r=>setTimeout(r,1000));
    // 2) 摘星：外太空的大星星缩小飞入小王子手中
    const bp = big.getBoundingClientRect(), pp = prince.getBoundingClientRect();
    const gdx = (pp.left+pp.width/2) - (bp.left+bp.width/2);
    const gdy = (pp.top+pp.height/2) - (bp.top+bp.height/2);
    await big.animate([{transform:'translateX(-50%) scale(1)',opacity:1},{transform:`translateX(-50%) translate(${gdx}px,${gdy}px) scale(.35)`,opacity:1}],{duration:560,easing:'ease-in',fill:'forwards'}).finished;
    // 小王子发光一下
    prince.animate([{filter:'drop-shadow(0 0 0 rgba(255,210,77,0))'},{filter:'drop-shadow(0 0 20px rgba(255,210,77,.95))'},{filter:'drop-shadow(0 0 0 rgba(255,210,77,0))'}],{duration:520,easing:'ease-in-out',fill:'forwards'});
    await new Promise(r=>setTimeout(r,420));
    // 3) 投入存钱罐：星星从王子处飞向右上角存钱罐
    piggy.animate([{transform:'scale(.6)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:300,easing:'ease-out',fill:'forwards'});
    const sp = star.getBoundingClientRect(), py = piggy.getBoundingClientRect();
    const tdx = (py.left+py.width/2) - (sp.left+sp.width/2);
    const tdy = (py.top+py.height/2) - (sp.top+sp.height/2);
    await star.animate([{transform:`translate(-50%,-${lift}px)`},{transform:`translate(-50%,-${lift}px) translate(${tdx}px,${tdy}px) scale(.6)`}],{duration:820,easing:'cubic-bezier(.5,0,.75,0)',fill:'forwards'}).finished;
    // 4) 入罐：存钱罐弹跳 + 闪光，并刷新星星数
    piggy.animate([{transform:'scale(1)'},{transform:'scale(1.16,.88)'},{transform:'scale(1)'}],{duration:440,easing:'ease-out',fill:'forwards'});
    const sw=spark.getBoundingClientRect().width/2;
    spark.style.left = (py.left+py.width/2-sw)+'px'; spark.style.top = (py.top+py.height/2-sw)+'px';
    spark.animate([{transform:'scale(.2) rotate(0)',opacity:1},{transform:'scale(1.5) rotate(45deg)',opacity:0}],{duration:620,easing:'ease-out',fill:'forwards'});
    if(onLand) onLand();
    await new Promise(r=>setTimeout(r,520));
    // 5) 收尾淡出
    back.animate([{opacity:1},{opacity:0}],{duration:420,fill:'forwards'});
    await new Promise(r=>setTimeout(r,440));
    layer.classList.remove('active');
    layer.innerHTML = '';
  }catch(e){
    if(onLand) onLand();
    layer.classList.remove('active'); layer.innerHTML = '';
  }
}
