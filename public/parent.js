/* 星星书架 · 家长端看板 */
'use strict';

const user = requireRole('parent');
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function kidCard(k){
  const subs = ['chinese','math','english'].map(key=>{
    const s=k.subjects[key], m=SUBJECT[key];
    return `<div class="kid-subj-row"><span class="nm">${m.name}</span><div class="bar"><i style="width:${s.pct}%;background:${m.color}"></i></div><span class="pc">${s.pct}%</span></div>`;
  }).join('');
  const todayPct = k.todayTotal ? Math.round(k.todayDone/k.todayTotal*100) : 0;
  return `<div class="card kid-card">
    <div class="kid-head">
      <div class="kid-left">
        <div class="kid-avatar" style="background:${k.color}">${esc(k.name[0])}</div>
        <div>
          <div class="kid-name">${esc(k.name)}</div>
          <div class="kid-meta">连续打卡 ${k.streak} 天</div>
        </div>
      </div>
      <div class="kid-star"><span style="width:20px;height:20px;display:inline-block">${ICONS.star}</span><span class="n">${k.stars}</span></div>
    </div>
    <div>
      <div class="kid-today"><span>今日打卡</span><span style="font-family:Poppins;font-weight:700">${k.todayDone}/${k.todayTotal}</span></div>
      <div class="bar"><i style="width:${todayPct}%;background:#7BB661"></i></div>
    </div>
    <div class="kid-subj">${subs}</div>
    <button class="kid-btn" style="background:${k.color}" data-action="detail" data-id="${k.id}" data-name="${esc(k.name)}">查看${esc(k.name)}详情</button>
  </div>`;
}

async function load(){
  try{
    const d = await API.get('/api/parent/children');
    const kids = d.children;
    $('#app').innerHTML = `
      <div style="max-width:1280px;margin:0 auto">
        <div class="section-title">孩子们的学习情况</div>
        <div class="section-sub">实时查看每个孩子的打卡进度和星星数</div>
        ${kids.length? `<div class="kid-grid">${kids.map(kidCard).join('')}</div>` : '<div class="empty-hint">还没有绑定孩子账号</div>'}
      </div>`;
  }catch(e){ $('#app').innerHTML = `<div class="empty-hint">${esc(e.message)}</div>`; }
}

async function showDetail(id, name){
  try{
    const d = await API.get('/api/parent/child/'+id+'/today');
    const rows = d.tasks.length ? d.tasks.map(t=>{
      const m=SUBJECT[t.subject];
      const btn = t.done
        ? `<div class="check-btn" style="border-color:transparent;background:#7BB661">${ICONS.check}</div>`
        : `<div class="check-btn">${ICONS.circle}</div>`;
      return `<div class="task-row"><div class="task-info"><div class="task-title">${esc(t.title)}</div><div class="task-sub ${m.cls}">${m.name}${t.type==='daily'?' · 每日':''}</div></div>${btn}</div>`;
    }).join('') : '<div class="empty-hint">今天没有打卡任务</div>';
    $('#modal').innerHTML = `
      <div class="modal-mask" data-action="close"></div>
      <div class="card modal-card">
        <div class="shelf-head">
          <div class="section-title" style="font-size:24px">${esc(name)}的今日打卡</div>
          <button class="logout-btn" data-action="close">关闭</button>
        </div>
        ${rows}
      </div>`;
    $('#modal').classList.add('open');
  }catch(e){ toast(e.message); }
}
function closeModal(){ $('#modal').classList.remove('open'); }

function bindGlobal(){
  document.body.addEventListener('click', e=>{
    const a = e.target.closest('[data-action]');
    if(a){
      const act=a.dataset.action;
      if(act==='detail') showDetail(a.dataset.id, a.dataset.name);
      else if(act==='close') closeModal();
      return;
    }
  });
  $('#logoutBtn').addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', ()=>{
  if(!user) return;
  injectHeaderIcons();
  const av = $('#parentAvatar');
  if(av){ av.textContent = user.name[0]; av.style.background = user.color; }
  bindGlobal();
  load();
});
