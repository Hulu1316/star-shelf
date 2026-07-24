/* 星星书架 · 前端共享模块：图标 / 科目 / API / 登录态 / 动画 */
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
  english:{name:'英语', color:'var(--c-english)', cls:'english'}
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
  post(p, body){ return this.req(p, {method:'POST', body:JSON.stringify(body)}); }
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
