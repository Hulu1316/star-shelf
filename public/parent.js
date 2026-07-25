/* 捕星少年 · 家长端看板 */
'use strict';

const user = requireRole('parent');
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function kidCard(k){
  const subs = ['chinese','math','english','other'].map(key=>{
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

/* ---------- 星星奖励设置（家长自定义） ---------- */
let rwList = [];
let rwEditing = null;
async function refreshRewards(){
  const d = await API.get('/api/parent/rewards');
  rwList = d.rewards;
  renderRewardsModal();
}
function renderRewardsModal(){
  const rows = (rwList&&rwList.length) ? rwList.map(r=>{
    if(rwEditing===r.id){
      return `<div class="rw-row rw-edit-row">
        <input class="input rw-in" id="rw-name" value="${esc(r.name)}" />
        <input class="input rw-in" id="rw-stars" type="number" min="1" value="${r.stars}" />
        <button class="rw-save" data-action="rw-save" data-id="${r.id}">保存</button>
        <button class="rw-cancel" data-action="rw-cancel">取消</button>
      </div>`;
    }
    return `<div class="rw-row">
      <span class="rw-name">${esc(r.name)}</span>
      <span class="rw-stars">${r.stars} 颗星星</span>
      <button class="rw-edit" data-action="rw-edit" data-id="${r.id}">编辑</button>
      <button class="rw-del" data-action="rw-del" data-id="${r.id}">删除</button>
    </div>`;
  }).join('') : '<div class="empty-hint">还没有自定义奖励</div>';
  $('#modal').innerHTML = `
    <div class="modal-mask" data-action="close"></div>
    <div class="card modal-card">
      <div class="shelf-head">
        <div class="section-title" style="font-size:24px">⚙ 星星奖励设置</div>
        <button class="logout-btn" data-action="close">关闭</button>
      </div>
      <div class="rw-form">
        <input class="input" id="rw-new-name" placeholder="奖励名称，如：去游乐园" />
        <input class="input" id="rw-new-stars" type="number" min="1" placeholder="所需星星数" />
        <button class="btn-primary" data-action="rw-add">添加奖励</button>
      </div>
      <div class="rw-list">${rows}</div>
      <div class="rw-tip">奖励对所有孩子通用。孩子攒够星星，即可在「我的储蓄罐」看到解锁。</div>
    </div>`;
  $('#modal').classList.add('open');
}
async function showRewards(){
  rwEditing = null;
  try{ await refreshRewards(); }
  catch(e){ toast(e.message); }
}
async function addReward(){
  const name = ($('#rw-new-name').value||'').trim();
  const stars = Number($('#rw-new-stars').value);
  if(!name){ toast('请填写奖励名称'); return; }
  if(!stars || stars<=0){ toast('星星数必须为正数'); return; }
  try{ await API.post('/api/parent/rewards',{name,stars}); await refreshRewards(); toast('已添加奖励 🎉'); }
  catch(e){ toast(e.message); }
}
async function saveReward(id){
  const name = ($('#rw-name').value||'').trim();
  const stars = Number($('#rw-stars').value);
  if(!name){ toast('请填写奖励名称'); return; }
  if(!stars || stars<=0){ toast('星星数必须为正数'); return; }
  try{ await API.put('/api/parent/rewards/'+id,{name,stars}); rwEditing=null; await refreshRewards(); toast('已保存'); }
  catch(e){ toast(e.message); }
}
async function delReward(id){
  if(!confirm('确定删除这个奖励吗？')) return;
  try{ await API.del('/api/parent/rewards/'+id); await refreshRewards(); toast('已删除'); }
  catch(e){ toast(e.message); }
}

function bindGlobal(){
  document.body.addEventListener('click', e=>{
    const a = e.target.closest('[data-action]');
    if(a){
      const act=a.dataset.action;
      if(act==='detail') showDetail(a.dataset.id, a.dataset.name);
      else if(act==='rewards') showRewards();
      else if(act==='rw-add') addReward();
      else if(act==='rw-edit'){ rwEditing=a.dataset.id; renderRewardsModal(); }
      else if(act==='rw-cancel'){ rwEditing=null; renderRewardsModal(); }
      else if(act==='rw-save') saveReward(a.dataset.id);
      else if(act==='rw-del') delReward(a.dataset.id);
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
