/* 登录页逻辑 */
'use strict';

document.addEventListener('DOMContentLoaded', ()=>{
  // 已登录则直接跳对应端
  const u = currentUser();
  if(API.token && u){ location.href = u.role==='parent' ? '/parent.html' : '/child.html'; return; }

  $('#logoStar').innerHTML = ICONS.star;

  // 账号一键填充
  document.querySelectorAll('.acc').forEach(el=>{
    el.addEventListener('click', ()=>{
      $('#username').value = el.dataset.u;
      $('#password').value = el.dataset.p || '';
      $('#loginError').textContent = '';
    });
  });

  $('#loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const err = $('#loginError');
    err.textContent = '';
    if(!username || !password){ err.textContent = '请输入账号和密码'; return; }
    try{
      const data = await API.post('/api/login', {username, password});
      setSession(data.token, {id:data.id, role:data.role, name:data.name, color:data.color});
      location.href = data.role==='parent' ? '/parent.html' : '/child.html';
    }catch(ex){
      err.textContent = ex.message || '登录失败';
    }
  });
});
