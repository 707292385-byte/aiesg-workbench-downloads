(function () {
  'use strict';
  // Enable only after the account service has passed live verification.
  if(document.documentElement.dataset.communityAccounts !== 'on') return;
  const serviceOrigin = document.documentElement.dataset.communityAccountOrigin || '';
  let endpoint = '';
  try { const url=new URL(serviceOrigin); if(url.protocol==='https:' && url.origin===serviceOrigin) endpoint=url.origin+'/v1/members/'; } catch {}
  const storageKey = 'xiaoo-community-session-cloudbase-v1';
  let token = '', current = null, dialog, mode = 'login', busy = false;
  try { token = sessionStorage.getItem(storageKey) || ''; } catch {}
  function saveToken(value) {token=value||'';try{token?sessionStorage.setItem(storageKey,token):sessionStorage.removeItem(storageKey);}catch{}}
  async function api(path, body) {
    if(!endpoint) throw new Error('社区账号服务尚未开通，请稍后再试');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),15000);
    try {
      const headers={'content-type':'application/json'};
      if(token)headers.authorization='Bearer '+token;
      const res=await fetch(endpoint+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',signal:controller.signal});
      const data=await res.json();
      if(!res.ok){if(res.status===401||res.status===403&&data.error?.includes('停用')){saveToken('');current=null;updateButton();}throw new Error(data.error||'操作未完成，请稍后重试');}
      if(data.token)saveToken(data.token);
      return data;
    } catch(error) {if(error.name==='AbortError')throw new Error('账号服务响应超时，请稍后重试');if(error instanceof TypeError)throw new Error('无法连接账号服务，请检查网络后重试');throw error;}
    finally{clearTimeout(timer);}
  }
  const q = selector => dialog.querySelector(selector);
  function notice(text, error=false) {const node=q('[data-account-notice]');node.textContent=text;node.classList.toggle('is-error',error);}
  function updateButton() {document.querySelectorAll('[data-open-account]').forEach(button=>{button.hidden=false;button.textContent=current?current.user.username+' · 我的账号':'登录 / 注册';});}
  function createDialog() {
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='co-account-dialog';dialog.setAttribute('aria-labelledby','co-account-title');
    dialog.innerHTML=`<header><div><small>Xiao〇 ESG社区</small><h2 id="co-account-title">登录社区</h2></div><button type="button" data-account-close aria-label="关闭">×</button></header>
      <div class="co-account-body"><nav class="co-account-tabs" aria-label="账号操作"><button type="button" data-account-mode="login">登录</button><button type="button" data-account-mode="register">注册</button></nav>
      <form data-account-credentials><label>用户名<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="32" pattern="[A-Za-z][A-Za-z0-9_]{2,31}" placeholder="3–32位字母、数字或下划线"></label><small>以字母开头，不区分大小写。</small><label>密码<input name="password" type="password" autocomplete="current-password" required minlength="10" maxlength="128" placeholder="至少10位，建议使用独立密码"></label><label data-account-confirm hidden>再次输入密码<input name="confirmation" type="password" autocomplete="new-password" maxlength="128"></label><p data-account-register-note hidden>注册即开放当前全部功能，无需邮箱验证码。请记住用户名和密码；忘记密码需联系 Xiao〇 核验身份后处理。</p><button class="co-account-primary" type="submit" data-account-submit>登录</button></form>
      <section data-account-profile hidden><p class="co-account-welcome"></p><p>当前全部工具向注册用户开放。</p><ul data-account-tools></ul><form data-account-password><h3>修改密码</h3><label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" required minlength="10" maxlength="128"></label><label>新密码<input name="newPassword" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label><label>确认新密码<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label><button type="submit">保存新密码</button></form><div class="co-account-actions"><button type="button" data-account-admin hidden>会员管理</button><button type="button" data-account-logout>退出登录</button></div></section>
      <section data-account-management hidden><h3>会员管理</h3><p>当前全部工具免费开放。预设授权仅保存记录，不会提前收回任何用户权限。</p><form data-account-search><input name="query" maxlength="32" aria-label="搜索用户名" placeholder="搜索用户名"><button type="submit">搜索</button></form><div data-account-users></div><div class="co-account-actions"><button type="button" data-users-prev>上一组</button><button type="button" data-users-next>下一组</button></div><form data-account-grant><h3>预设工具授权</h3><label>用户名<input name="username" required maxlength="32"></label><label>工具<select name="tool"><option value="reports">ESG报告下载</option><option value="materiality">重要性评估</option><option value="workbench">AI×ESG工作台</option><option value="todo">待办清单</option></select></label><label>有效期<input name="expiresAt" type="date"><small>留空表示长期有效</small></label><label>操作<select name="granted"><option value="true">保存授权</option><option value="false">撤销预设授权</option></select></label><button type="submit">保存预设</button></form><form data-account-reset><h3>重置用户密码</h3><p>先通过其它方式核验本人身份，再重置。重置会退出该用户的所有设备。</p><label>用户名<input name="username" required maxlength="32"></label><label>临时密码<input name="newPassword" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label><button type="submit">重置密码</button></form><button type="button" data-account-back>返回我的账号</button></section>
      <p data-account-notice role="status" aria-live="polite"></p><p class="co-account-help">账号与工作台本地登录名称相互独立。遇到账号问题，请通过社区“微信号”联系 Xiao〇。</p></div>`;
    document.body.append(dialog);
    q('[data-account-close]').onclick=()=>dialog.close();
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{dialog.querySelectorAll('input[type=password]').forEach(input=>input.value='');});
    dialog.querySelectorAll('[data-account-mode]').forEach(button=>button.onclick=()=>switchMode(button.dataset.accountMode));
    q('[data-account-credentials]').onsubmit=event=>run(event, async()=>{
      const fields=new FormData(event.target),password=fields.get('password');
      if(mode==='register'&&password!==fields.get('confirmation'))throw new Error('两次输入的密码不一致');
      await api(mode,{username:fields.get('username').trim().toLowerCase(),password});
      current=await api('me');event.target.reset();showProfile();updateButton();notice(mode==='register'?'注册成功，当前全部功能已开放。':'登录成功，可以继续使用工具。');
    });
    q('[data-account-password]').onsubmit=event=>run(event,async()=>{
      const fields=new FormData(event.target);
      if(fields.get('newPassword')!==fields.get('confirmPassword'))throw new Error('两次输入的新密码不一致');
      await api('password',{currentPassword:fields.get('currentPassword'),newPassword:fields.get('newPassword')});event.target.reset();notice('密码已更新，其它设备的登录会话已退出。');
    });
    q('[data-account-logout]').onclick=event=>run(event,async()=>{await api('logout',{});saveToken('');current=null;updateButton();switchMode('login');notice('已退出登录。');});
    q('[data-account-admin]').onclick=()=>{q('[data-account-profile]').hidden=true;q('[data-account-management]').hidden=false;page=0;void loadUsers();};
    q('[data-account-back]').onclick=showProfile;
    q('[data-account-reset]').onsubmit=event=>run(event,async()=>{const fields=new FormData(event.target);if(!confirm('已核验用户身份，确认重置该账号密码并退出所有设备？')){notice('已取消');return;}const result=await api('admin/reset-password',{username:fields.get('username'),newPassword:fields.get('newPassword')});event.target.reset();notice(result.message);});
    q('[data-account-search]').onsubmit=event=>{event.preventDefault();page=0;void loadUsers();};
    q('[data-users-prev]').onclick=()=>{page=Math.max(0,page-1);void loadUsers();};
    q('[data-users-next]').onclick=()=>{page++;void loadUsers();};
    q('[data-account-grant]').onsubmit=event=>run(event,async()=>{const fields=new FormData(event.target);notice((await api('admin/grant',{username:fields.get('username'),tool:fields.get('tool'),granted:fields.get('granted')==='true',expiresAt:fields.get('expiresAt')?fields.get('expiresAt')+'T23:59:59+08:00':null})).message);});
  }
  async function run(event, action) {
    event.preventDefault();if(busy)return;busy=true;notice('正在处理…');
    dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
    try{await action();}catch(error){notice(error.message,true);}finally{busy=false;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
  }
  let page=0;
  async function loadUsers() {
    try {
      notice('正在读取会员…');const query=q('[data-account-search] input').value;
      const data=await api('admin/users?q='+encodeURIComponent(query)+'&page='+page);
      const list=q('[data-account-users]');list.replaceChildren();
      for(const user of data.users){const row=document.createElement('div');row.className='co-account-user';const label=document.createElement('span');label.textContent=user.username+' · '+(user.suspended?'已停用':user.role==='admin'?'管理员':'正常');row.append(label);
        if(user.role!=='admin'){const button=document.createElement('button');button.type='button';button.textContent=user.suspended?'恢复账号':'停用账号';button.onclick=event=>run(event,async()=>{if(!confirm('确认'+button.textContent+' '+user.username+'？')){notice('已取消');return;}await api('admin/status',{username:user.username,suspended:!user.suspended});await loadUsers();});row.append(button);}list.append(row);}
      q('[data-users-prev]').disabled=page===0;q('[data-users-next]').disabled=data.users.length<30;notice(data.users.length?'':'没有匹配的用户。');
    }catch(error){notice(error.message,true);}
  }
  function switchMode(next) {
    mode=next;q('#co-account-title').textContent=mode==='register'?'注册社区账号':'登录社区';
    q('.co-account-tabs').hidden=false;q('[data-account-credentials]').hidden=false;q('[data-account-profile]').hidden=true;q('[data-account-management]').hidden=true;
    q('[data-account-confirm]').hidden=mode!=='register';q('[name=confirmation]').required=mode==='register';q('[data-account-register-note]').hidden=mode!=='register';q('[data-account-submit]').textContent=mode==='register'?'注册并登录':'登录';q('[name=password]').autocomplete=mode==='register'?'new-password':'current-password';
    dialog.querySelectorAll('[data-account-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.accountMode===mode)));notice('');
  }
  function showProfile() {
    if(!current){switchMode('login');return;}
    q('#co-account-title').textContent='我的账号';q('.co-account-tabs').hidden=true;q('[data-account-credentials]').hidden=true;q('[data-account-profile]').hidden=false;q('[data-account-management]').hidden=true;q('.co-account-welcome').textContent='你好，'+current.user.username;
    const list=q('[data-account-tools]');list.replaceChildren();current.tools.forEach(tool=>{const li=document.createElement('li');li.textContent=tool.name+' · '+(tool.allowed?'可使用':'暂未开放');list.append(li);});q('[data-account-admin]').hidden=current.user.role!=='admin';notice('');
  }
  async function open() {
    createDialog();current?showProfile():switchMode('login');if(!dialog.open)dialog.showModal();
    if(token){try{current=await api('me');showProfile();updateButton();}catch(error){switchMode('login');notice(error.message,true);}}
  }
  async function mount() {updateButton();if(token){try{current=await api('me');updateButton();}catch{current=null;updateButton();}}}
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-open-account]')){event.preventDefault();void open();return;}
    if(!current && event.target.closest('#co-project-track .co-tool-actions a, #co-project-track .co-tool-actions button')){event.preventDefault();event.stopImmediatePropagation();void open();}
  },true);
  window.CommunityAccount={mount,open};
})();
