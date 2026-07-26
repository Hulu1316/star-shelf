/* 捕星少年 · 孩子端（数据来自后端 API） */
'use strict';

const user = requireRole('child');

let myHomeworks = [];   // 录入页：我的作业清单（编辑时查找用）
let editingHw = null;   // 正在编辑的作业（null 表示新增模式）
let pendingUndoId = null;  // 最近一条可撤销打卡的 id
let undoCountdownTimer = null; // 撤销条倒计时
const UNDO_SECONDS = 10;

function todayISO(){ const t=new Date(); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); }

function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function updateHeaderStars(n){ const el=$('#headerStarCount'); if(el) el.textContent=n; }

function checkBtn(task){
  if(task.done) return `<div class="check-btn" style="border-color:transparent;background:#7BB661">${ICONS.check}</div>`;
  return `<button class="check-btn" data-action="checkin" data-id="${task.id}">${ICONS.circle}</button>`;
}
function rowHtml(task){
  const m = SUBJECT[task.subject];
  return `<div class="task-row">
    <div class="task-info">
      <div class="task-title">${esc(task.title)}</div>
      <div class="task-sub ${m.cls}">${m.name}${task.type==='daily'?' · 每日':''}</div>
    </div>
    ${checkBtn(task)}
  </div>`;
}
const emptyHtml = `<div class="empty-hint">今天的作业都完成啦，去玩会儿吧！🎉</div>`;

/* ---------- 视图 ---------- */
async function viewHome(){
  const d = await API.get('/api/child/home');
  const t = await API.get('/api/child/today');
  updateHeaderStars(d.stars);
  const st = d.subjects;
  const books = ['chinese','math','english','other'].map(k=>{
    const s=st[k], m=SUBJECT[k];
    return `<div class="book">
      <div class="book-fill" style="height:${s.pct}%;background:${m.color}"></div>
      <div class="book-label">${m.name}</div>
      <div class="book-pct">${s.pct}%</div>
      <div class="book-count">${s.done}/${s.plan} 项</div>
    </div>`;
  }).join('');
  const doneTotal = st.chinese.done+st.math.done+st.english.done+st.other.done;
  const planTotal = st.chinese.plan+st.math.plan+st.english.plan+st.other.plan;
  const cd = d.countdown;
  // 今日打卡：四个学科横向并列的小卡片（始终显示四科，更紧凑）
  const order=['chinese','math','english','other'];
  const subjCards = order.map(k=>{
    const m=SUBJECT[k];
    const tasks=t.tasks.filter(x=>x.subject===k);
    const rows = tasks.length ? tasks.map(rowHtml).join('') : `<div class="subj-empty">今天没有安排 🌿</div>`;
    return `<div class="subj-card ${m.cls}">
      <div class="subj-card-head"><span class="dot"></span>${m.name}<span class="subj-card-count">${tasks.length}</span></div>
      <div class="subj-card-body">${rows}</div>
    </div>`;
  }).join('');
  const todayBody = `<div class="subj-cards">${subjCards}</div>`;
  return `<section class="view active" data-view="home">
    <div class="home-grid">
      <div class="home-left">
        <div class="card shelf-card">
          <div class="shelf-head">
            <div>
              <div class="section-title">${esc(d.name)}的书架</div>
              <div class="section-sub">每完成一项作业，书架上的书就会再满一点</div>
            </div>
            <span class="chip">已完成 ${doneTotal}/${planTotal} 项</span>
          </div>
          <div class="shelf-books">${books}</div>
        </div>
        <div class="card today-card">
          <div class="shelf-head">
            <div>
              <div class="section-title">今日打卡</div>
              <div class="section-sub">按学科分组 · 完成全部就能拿满今天的星星</div>
            </div>
            <span class="chip">${t.date}</span>
          </div>
          ${todayBody}
          <button class="btn-primary" style="margin-top:16px" data-action="goto" data-view="checkin">${ICONS.plus}去打卡</button>
        </div>
      </div>
      <div class="home-right">
        <div class="side-card bankish">
          <div class="side-title"><span class="ic">${ICONS.star}</span>我的储蓄罐</div>
          <div class="bank-num"><span class="big">${d.stars}</span><span class="unit">颗</span></div>
          <div class="bank-caption">连续打卡 ${d.streak} 天 · 加油！</div>
          <div class="bar"><i style="width:${Math.min(100,d.stars/50*100)}%"></i></div>
        </div>
        <div class="side-card">
          <div class="side-title"><span class="ic">${ICONS.calendar}</span>暑假倒计时</div>
          <div class="bank-num" style="color:var(--c-chinese)"><span class="big" style="color:var(--c-chinese)">${cd.daysLeft}</span><span class="unit">天</span></div>
          <div class="bank-caption">距离暑假作业截止 ${cd.dueCN}</div>
          <div class="bar"><i style="width:${Math.min(100,(1-cd.daysLeft/cd.total)*100)}%"></i></div>
        </div>
      </div>
    </div>
  </section>`;
}

async function viewCheckin(){
  const t = await API.get('/api/child/today');
  const lit = t.tasks.filter(x=>x.done).length;
  const rows = t.tasks.length ? t.tasks.map(rowHtml).join('') : emptyHtml;
  return `<section class="view active" data-view="checkin">
    <div class="checkin-grid">
      <div class="card checkin-list">
        <div class="shelf-head">
          <div>
            <div class="section-title">今日打卡</div>
            <div class="section-sub">已完成 ${lit}/${t.tasks.length} 项 · 完成全部就能拿满今天的星星</div>
          </div>
          <span class="chip">${t.date}</span>
        </div>
        ${rows}
      </div>
      <div class="reward-card">
        <div class="side-title"><span class="ic">${ICONS.star}</span>打卡奖励</div>
        <span class="reward-star">${ICONS.star}</span>
        <div class="reward-tip">完成 <b>1</b> 项作业 = <b>1</b> 颗星星</div>
        <div class="reward-tip">今日已点亮 <b>${lit}/${Math.max(t.tasks.length,1)}</b> 颗</div>
        <button class="reward-btn" data-action="goto" data-view="bank">${ICONS.check}查看我的储蓄罐</button>
        <div class="reward-cue"><span class="ic">${ICONS.star}</span>完成时星星会飞入储蓄罐</div>
      </div>
    </div>
  </section>`;
}

async function viewEntry(){
  let list=[];
  try{ const r=await API.get('/api/child/homework'); list=r.homeworks||[]; }catch(e){}
  myHomeworks=list;
  const WEEK=['日','一','二','三','四','五','六'];
  const isEdit = !!editingHw;
  const subjActive = k => (isEdit ? (editingHw.subject===k) : (k==='chinese')) ? 'active' : '';
  const typeActive = v => (isEdit ? (editingHw.type===v) : (v==='one_time')) ? 'active' : '';
  const listHtml = list.length ? list.map(h=>{
    const m=SUBJECT[h.subject];
    const typeTxt = h.type==='daily'
      ? ('每日 · 周'+(h.repeat?h.repeat.map(i=>WEEK[i]).join(''):'—'))
      : '一次性';
    return `<div class="hw-item" data-id="${h.id}">
      <div class="hw-info">
        <div class="hw-title">${esc(h.title)}</div>
        <div class="task-sub ${m.cls}">${m.name} · ${typeTxt}</div>
      </div>
      <div class="hw-actions">
        <button class="mini-btn edit" data-action="edit-hw" data-id="${h.id}">编辑</button>
        <button class="mini-btn del" data-action="del-hw" data-id="${h.id}">删除</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty-hint">还没有录入作业，先在上面添加一条吧～</div>`;
  return `<section class="view active" data-view="entry">
    <div class="form-wrap">
      <div class="card form-card">
        <div>
          <div class="section-title">${isEdit?'修改作业':'录入新作业'}</div>
          <div class="section-sub">${isEdit?'修改后点「保存修改」即可':'把作业拆成每天的小任务，完成后就能点亮星星'}</div>
        </div>
        <div class="field">
          <label>作业标题</label>
          <input class="input" id="f-title" placeholder="例如：背诵古诗《静夜思》" value="${isEdit?esc(editingHw.title):''}" />
        </div>
        <div class="field">
          <label>科目</label>
          <div class="subject-chips" id="f-subject">
            <div class="subj chinese ${subjActive('chinese')}" data-v="chinese">语文</div>
            <div class="subj math ${subjActive('math')}" data-v="math">数学</div>
            <div class="subj english ${subjActive('english')}" data-v="english">英语</div>
            <div class="subj other ${subjActive('other')}" data-v="other">其他</div>
          </div>
        </div>
        <div class="field">
          <label>作业类型</label>
          <div class="type-toggle" id="f-type">
            <div class="type-opt ${typeActive('one_time')}" data-v="one_time"><b>一次性作业</b><small>提交后即完成</small></div>
            <div class="type-opt ${typeActive('daily')}" data-v="daily"><b>每日作业</b><small>按频率重复打卡</small></div>
          </div>
        </div>
        <div id="condFields"></div>
        <button class="btn-primary" data-action="submit">${isEdit?ICONS.check+'保存修改':ICONS.plus+'拆解为每日打卡'}</button>
        ${isEdit?'<button class="btn-ghost" data-action="cancel-edit">取消修改</button>':''}
      </div>
      <div class="card form-card" style="margin-top:20px">
        <div class="section-title">我的作业清单</div>
        <div class="section-sub">点「编辑」可修改，点「删除」可移除（已打卡记录会保留）</div>
        <div class="hw-list">${listHtml}</div>
      </div>
    </div>
  </section>`;
}
function renderCondFields(){
  const type = ($('#f-type') && $('#f-type').querySelector('.active').dataset.v) || 'one_time';
  const box = $('#condFields');
  const today = new Date(); const tstr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  if(type==='one_time'){
    box.innerHTML = `
      <div class="field"><label>截止日期</label><input class="input" id="f-due" type="date" value="2026-08-20" /></div>
      <div class="field"><label>优先级</label>
        <div class="type-toggle" id="f-priority">
          <div class="type-opt" data-v="3"><b>低</b></div>
          <div class="type-opt active" data-v="2"><b>中</b></div>
          <div class="type-opt" data-v="1"><b>高</b></div>
        </div>
      </div>`;
  } else {
    box.innerHTML = `
      <div class="field"><label>开始日期</label><input class="input" id="f-start" type="date" value="${tstr}" /></div>
      <div class="field"><label>结束日期（可选）</label><input class="input" id="f-end" type="date" value="2026-08-28" /></div>
      <div class="field"><label>每周执行频率</label>
        <div class="week-pick" id="f-repeat">
          ${['日','一','二','三','四','五','六'].map((w,i)=>`<div class="week-day${i>=1&&i<=5?' active':''}" data-v="${i}">${w}</div>`).join('')}
        </div>
      </div>`;
  }
}

async function viewBank(){
  const d = await API.get('/api/child/bank');
  updateHeaderStars(d.stars);
  const trophies = d.trophies.map(t=>`
    <div class="trophy-row">
      <div class="trophy-left">
        <span class="ic" style="${t.got?'':'opacity:.4'}">${ICONS.trophy}</span>
        <div><div class="trophy-name">${t.name}</div><div class="trophy-stars">${t.stars} 颗星星</div></div>
      </div>
      <div class="trophy-status ${t.got?'got':'wait'}">${t.got?'已获得':'待解锁'}</div>
    </div>`).join('');
  const next = d.trophies.find(t=>!t.got);
  const pct = next ? Math.min(100, d.stars/next.stars*100) : 100;
  return `<section class="view active" data-view="bank">
    <div class="bank-grid">
      <div class="card bank-hero">
        <div class="side-title"><span class="ic">${ICONS.star}</span>我的储蓄罐</div>
        <div class="bank-circle"><span class="bs">${ICONS.star}</span></div>
        <div class="bank-total"><span class="n">${d.stars}</span><span class="u">颗</span></div>
        <div class="bank-caption">${next?('再积 '+(next.stars-d.stars)+' 颗解锁「'+next.name+'」'):'全部奖杯已解锁，你真厉害！'}</div>
        <div class="bar" style="width:100%"><i style="width:${pct}%"></i></div>
      </div>
      <div class="card trophy-list">
        <div class="section-title" style="font-size:22px;margin-bottom:8px">我的奖杯</div>
        ${trophies}
      </div>
    </div>
  </section>`;
}

function buildCalendar(){
  const y=2026,m=7;
  const first=new Date(y,m,1).getDay();
  const days=new Date(y,m+1,0).getDate();
  const today=new Date(); const tstr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  let cells='';
  for(let i=0;i<first;i++) cells+='<div class="cal-cell blank"></div>';
  for(let d=1; d<=days; d++){
    const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isDue=d===28, isToday=ds===tstr;
    let cls='cal-cell'; if(isDue)cls+=' due'; else if(isToday)cls+=' today';
    cells += isDue ? `<div class="${cls}">28<small>截止</small></div>` : `<div class="${cls}">${d}</div>`;
  }
  return `<div class="cal-week">${['日','一','二','三','四','五','六'].map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div>`;
}
async function viewCountdown(){
  const d = await API.get('/api/child/home');
  const cd = d.countdown;
  const pct = cd.total? Math.round(cd.elapsed/cd.total*100):0;
  return `<section class="view active" data-view="countdown">
    <div class="cd-grid">
      <div class="cd-left">
        <div class="card cd-hero">
          <div class="section-sub" style="margin:0">距离暑假作业截止还有</div>
          <div class="cd-ring"><div class="row"><span class="num">${cd.daysLeft}</span><span class="unt">天</span></div></div>
          <div class="cd-due"><span class="ic">${ICONS.calendar}</span>${cd.dueCN} · 暑假作业截止</div>
          <div class="section-sub" style="margin:0">加油，每天完成一点点，就能准时收工～</div>
        </div>
        <div class="summer-card">
          <div class="summer-head"><span class="ic">${ICONS.star}</span>暑假进度</div>
          <div class="summer-sub">7月1日 - 8月28日 · 共 ${cd.total} 天</div>
          <div class="bar" style="height:12px"><i style="width:${pct}%"></i></div>
          <div class="summer-legend"><span>已度过 ${cd.elapsed} 天</span><span class="r">还剩 ${cd.daysLeft} 天</span></div>
        </div>
      </div>
      <div class="card cd-right">
        <div class="cal-title"><h3>2026年8月</h3><span class="chip">暑假作业日历</span></div>
        ${buildCalendar()}
      </div>
    </div>
  </section>`;
}

/* ---------- 动作 ---------- */
async function doCheckin(id, btn){
  try{
    const r = await API.post('/api/child/checkin', {hwId:id});
    showUndo(r.checkinId);
    playStarReward(btn, ()=>updateHeaderStars(r.stars));
    setTimeout(()=>render(currentView), 1300);
    toast('太棒了！获得 1 颗星星 ⭐');
  }catch(e){ toast(e.message); }
}
function showUndo(checkinId){
  pendingUndoId = checkinId;
  const bar = $('#undoBar'); if(!bar) return;
  let left = UNDO_SECONDS;
  const refresh = ()=>{
    bar.innerHTML = `<span class="undo-msg">✅ 打卡成功！获得 1 颗星星</span><button class="undo-btn" data-action="undo">撤销</button><span class="undo-timer">${left}s</span>`;
  };
  refresh();
  bar.classList.add('show');
  clearInterval(undoCountdownTimer);
  undoCountdownTimer = setInterval(()=>{
    left--;
    if(left<=0){ clearInterval(undoCountdownTimer); bar.classList.remove('show'); pendingUndoId=null; }
    else refresh();
  }, 1000);
}
async function undoCheckin(){
  const id = pendingUndoId;
  if(!id) return;
  pendingUndoId = null;
  clearInterval(undoCountdownTimer);
  const bar = $('#undoBar'); if(bar) bar.classList.remove('show');
  try{
    const r = await API.del('/api/child/checkin', {checkinId:id});
    updateHeaderStars(r.stars);
    render(currentView);
    toast('已撤销打卡，星星已退回 ⭐');
  }catch(e){ toast(e.message); }
}
async function submitEntry(){
  const title = ($('#f-title').value||'').trim();
  if(!title){ toast('请先填写作业标题'); return; }
  const subject = $('#f-subject').querySelector('.active').dataset.v;
  const type = $('#f-type').querySelector('.active').dataset.v;
  const payload = {title, subject, type};
  if(type==='one_time'){
    payload.dueDate = $('#f-due').value || '2026-08-28';
    payload.priority = Number($('#f-priority').querySelector('.active').dataset.v);
  } else {
    payload.startDate = $('#f-start').value;
    payload.endDate = $('#f-end').value || '2026-08-28';
    payload.repeat = Array.from($('#f-repeat').querySelectorAll('.week-day.active')).map(x=>Number(x.dataset.v));
    if(!payload.repeat.length){ toast('请选择至少一天'); return; }
  }
  try{
    if(editingHw){
      await API.put('/api/child/homework/'+editingHw.id, payload);
      toast('已保存修改 ✏️');
      editingHw=null;
    } else {
      await API.post('/api/child/homework', payload);
      toast('已添加作业 🎉');
    }
    render('entry');
  }catch(e){ toast(e.message); }
}
function fillEditForm(){
  const h=editingHw; if(!h) return;
  if(h.type==='one_time'){
    if($('#f-due')) $('#f-due').value=h.dueDate||'2026-08-28';
    if($('#f-priority')){ const p=String(h.priority||2); $('#f-priority').querySelectorAll('.type-opt').forEach(x=>x.classList.toggle('active', x.dataset.v===p)); }
  } else {
    if($('#f-start')) $('#f-start').value=h.startDate||todayISO();
    if($('#f-end')) $('#f-end').value=h.endDate||'2026-08-28';
    if($('#f-repeat')){ const rep=h.repeat||[]; $('#f-repeat').querySelectorAll('.week-day').forEach(x=>x.classList.toggle('active', rep.includes(Number(x.dataset.v)))); }
  }
}
async function editHw(id){
  const hw=myHomeworks.find(h=>h.id===id);
  if(!hw) return;
  editingHw=hw;
  render('entry');
}
async function deleteHw(id){
  if(!confirm('确定删除这条作业吗？已打卡的记录会保留在统计里。')) return;
  try{ await API.del('/api/child/homework/'+id); toast('已删除'); if(editingHw&&editingHw.id===id) editingHw=null; render('entry'); }
  catch(e){ toast(e.message); }
}
function cancelEdit(){ editingHw=null; render('entry'); }

/* ---------- 路由与事件 ---------- */
let currentView = 'home';
async function render(view){
  currentView = view;
  let html='';
  try{
    if(view==='home') html=await viewHome();
    else if(view==='checkin') html=await viewCheckin();
    else if(view==='entry') html=await viewEntry();
    else if(view==='bank') html=await viewBank();
    else if(view==='countdown') html=await viewCountdown();
  }catch(e){ html=`<div class="empty-hint">${esc(e.message)}</div>`; }
  $('#app').innerHTML = html;
  if(view==='entry'){ renderCondFields(); if(editingHw) fillEditForm(); }
  document.querySelectorAll('[data-view]').forEach(a=>{ if(a.classList.contains('view')) return; a.classList.toggle('active', a.dataset.view===view); });
  window.scrollTo(0,0);
}
function bindGlobal(){
  document.body.addEventListener('click', e=>{
    const a = e.target.closest('[data-action]');
    if(a){
      const act=a.dataset.action;
      if(act==='goto') render(a.dataset.view);
      else if(act==='checkin') doCheckin(a.dataset.id, a);
      else if(act==='submit') submitEntry();
      else if(act==='edit-hw') editHw(a.dataset.id);
      else if(act==='del-hw') deleteHw(a.dataset.id);
      else if(act==='cancel-edit') cancelEdit();
      else if(act==='undo') undoCheckin();
      return;
    }
    const nav = e.target.closest('[data-view]');
    if(nav && !nav.classList.contains('view')){ e.preventDefault(); render(nav.dataset.view); return; }
    const subj = e.target.closest('.subj');
    if(subj){ $('#f-subject').querySelectorAll('.subj').forEach(x=>x.classList.remove('active')); subj.classList.add('active'); return; }
    const typeOpt = e.target.closest('#f-type .type-opt');
    if(typeOpt){ $('#f-type').querySelectorAll('.type-opt').forEach(x=>x.classList.remove('active')); typeOpt.classList.add('active'); renderCondFields(); return; }
    const prio = e.target.closest('#f-priority .type-opt');
    if(prio){ $('#f-priority').querySelectorAll('.type-opt').forEach(x=>x.classList.remove('active')); prio.classList.add('active'); return; }
    const w = e.target.closest('.week-day');
    if(w){ w.classList.toggle('active'); return; }
  });
  $('#logoutBtn').addEventListener('click', logout);
}
document.addEventListener('DOMContentLoaded', ()=>{
  if(!user) return;
  injectHeaderIcons();
  bindGlobal();
  render('home');
});
