(function () {
  'use strict';
  const packages = {
    'windows-x64': 'Windows 64 位',
    'macos-arm64': 'Mac M 系列',
    'macos-x64': 'Mac Intel'
  };
  function detect(ua, hints = {}) {
    if (/Android|iPhone|iPad/i.test(ua)) return '';
    const platform = hints.platform || ua;
    const arch = hints.architecture || '';
    if (/Windows/i.test(platform)) {
      if (/arm/i.test(arch + ua)) return '';
      return /x86/i.test(arch) && hints.bitness === '64' || /Win64|WOW64|x86_64/i.test(ua) ? 'windows-x64' : '';
    }
    if (/macOS|Macintosh|MacIntel/i.test(platform)) {
      if (/arm/i.test(arch)) return 'macos-arm64';
      if (/x86/i.test(arch) && hints.bitness === '64') return 'macos-x64';
    }
    return '';
  }
  function markup() {
    return '<p data-download-status role="status">正在识别电脑类型…</p><a class="rd-primary" data-download-link hidden target="_blank" rel="noopener noreferrer">下载便携版</a><details data-download-options><summary>切换电脑类型</summary><label>电脑类型<select data-download-platform><option value="">请选择电脑类型</option>' + Object.entries(packages).map(([key,name])=>'<option value="'+key+'">'+name+'</option>').join('') + '</select></label></details><p class="rd-help">解压后双击“打开报告库”，按企业、行业和年度筛选下载。无需另装 Python，支持暂停、继续与失败重试。</p>';
  }
  async function initialize(root) {
    root.innerHTML = markup();
    let chosen = false;
    const select = root.querySelector('[data-download-platform]');
    const link = root.querySelector('[data-download-link]');
    function update(key, auto) {
      select.value = key;
      link.hidden = !key;
      if (key) link.href = 'https://github.com/707292385-byte/esg-report-library/releases/download/v2.1.0/esg-report-library-v2.1.0-' + key + '.zip';
      else link.removeAttribute('href');
      root.querySelector('[data-download-status]').textContent = key ? (auto ? '已识别：' : '已选择：') + packages[key] : '浏览器无法准确识别电脑型号，请选择一次。Mac 可在“关于本机”查看芯片类型。手机和 Linux 暂无适用便携包。';
      if (!key) root.querySelector('details').open = true;
    }
    select.addEventListener('change', () => {chosen=true;update(select.value,false);});
    let hints = {};
    try { hints = await Promise.race([navigator.userAgentData?.getHighEntropyValues(['architecture','bitness','platform']) || Promise.resolve({}),new Promise(resolve=>setTimeout(()=>resolve({}),1500))]); } catch (_) {}
    if (!chosen) update(detect(navigator.userAgent, hints),true);
  }
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-report-download]').forEach(initialize));
  document.addEventListener('click',event=>{
    if (!event.target.closest('[data-open-report-download]')) return;
    let dialog=document.getElementById('community-report-download');
    if (!dialog) {
      dialog=document.createElement('dialog');dialog.id='community-report-download';dialog.className='rd-dialog';dialog.setAttribute('aria-labelledby','rd-title');
      dialog.innerHTML='<header><h2 id="rd-title">ESG 报告批量下载</h2><button type="button" aria-label="关闭">×</button></header><div data-report-download></div>';
      document.body.appendChild(dialog);
      dialog.querySelector('button').onclick=()=>dialog.close();
      dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
      initialize(dialog.querySelector('[data-report-download]'));
    }
    dialog.showModal();
  });
  window.ReportDownload = {detect};
})();
