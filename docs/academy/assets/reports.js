(function(){
'use strict';
const EMBEDDED=new URLSearchParams(location.search).get('embed')==='1';
function initialize(DATA){const LIVE=false;const TOKEN='';
const $=id=>document.getElementById(id);const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const num=x=>(x||0).toLocaleString('zh-CN');const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const COMP=new Map(DATA.companies.map(c=>[c.id,c]));const BYID=new Map(DATA.reports.map(r=>[r.id,r]));const BYCOMP=new Map();for(const r of DATA.reports){if(!BYCOMP.has(r.c))BYCOMP.set(r.c,[]);BYCOMP.get(r.c).push(r);r.search=norm([r.short,r.code,r.t,COMP.get(r.c)?.name,COMP.get(r.c)?.full,...(COMP.get(r.c)?.aliases||[]),...(COMP.get(r.c)?.codes||[])].join(' '));}for(const c of DATA.companies)c.search=norm([c.name,c.full,...c.aliases,...c.codes].join(' '));
const state={page:1,size:25,view:'reports',company:null,industries:new Set(),selected:new Set(),filtered:[],visibleCompanies:[],pending:[],folder:'',queue:null,downloaded:new Set()};let timer;
function sizeLabel(bytes,exact=false){if(!bytes)return'未知';return(exact?'':'约 ')+(bytes/1048576>=1?(bytes/1048576).toFixed(1)+' MB':(bytes/1024).toFixed(0)+' KB');}
function safeUrl(url){try{const u=new URL(url);return u.protocol==='https:'&&(/(^|\.)cninfo\.com\.cn$/.test(u.hostname)||/(^|\.)hkexnews\.hk$/.test(u.hostname))?u.href:'#';}catch{return'#';}}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('toast').style.display='none',4500);}
function industryMatch(ind){if(!state.industries.size)return true;return [...state.industries].some(key=>{if(key==='unknown')return !ind[1];const parts=key.split('|');return ind[0]===parts[0]&&ind.slice(1,Number(parts[1])+1).join(' / ')===parts.slice(2).join('|');});}
function renderIndustries(){const level=Number($('industry-level').value),q=norm($('industry-search').value),items=new Map();for(const c of DATA.companies)for(const ind of c.industries){if(!ind[level])continue;const name=ind.slice(1,level+1).join(' / ');const key=ind[0]+'|'+level+'|'+name;if(!q||norm(name).includes(q))items.set(key,{system:ind[0],name});}let last='',html='';for(const [key,v]of [...items].sort((a,b)=>a[1].system.localeCompare(b[1].system,'zh')||a[1].name.localeCompare(b[1].name,'zh'))){if(v.system!==last){html+='<div class="industry-group">'+esc(v.system)+'</div>';last=v.system;}html+='<label class="industry-option"><input type="checkbox" value="'+esc(key)+'" '+(state.industries.has(key)?'checked':'')+'><span>'+esc(v.name)+'</span></label>';}html+='<label class="industry-option"><input type="checkbox" value="unknown" '+(state.industries.has('unknown')?'checked':'')+'><span>行业待补充</span></label>';$('industry-list').innerHTML=html;}
function filteredReports(){const q=norm($('query').value),m=$('market').value,y=$('year').value,lang=$('language').value,kind=$('kind').value,from=$('from-date').value,to=$('to-date').value;return DATA.reports.filter(r=>(!state.company||r.c===state.company)&&(!q||r.search.includes(q))&&(!m||r.m===m)&&(!y||(y==='unknown'?r.y==null:String(r.y)===y))&&(!lang||r.l===lang)&&(!kind||r.k===kind)&&(!from||r.d>=from)&&(!to||r.d<=to)&&industryMatch(r.ind));}
function compare(a,b){switch($('sort').value){case'date-asc':return a.d.localeCompare(b.d)||a.id.localeCompare(b.id);case'company':return(COMP.get(a.c)?.name||a.short).localeCompare(COMP.get(b.c)?.name||b.short,'zh')||b.d.localeCompare(a.d);case'size-desc':return(b.sz||0)-(a.sz||0)||b.d.localeCompare(a.d);case'year-desc':return(b.y||0)-(a.y||0)||b.d.localeCompare(a.d);default:return b.d.localeCompare(a.d)||a.id.localeCompare(b.id);}}
function apply(reset=true){if(reset){state.page=1;state.selected.clear();}state.filtered=filteredReports().sort(compare);const counts=new Map(),latest=new Map();for(const r of state.filtered){counts.set(r.c,(counts.get(r.c)||0)+1);if(!latest.has(r.c)||r.d>latest.get(r.c))latest.set(r.c,r.d);}const q=norm($('query').value),m=$('market').value;const reportFilter=$('year').value||$('language').value||$('kind').value||$('from-date').value||$('to-date').value;state.visibleCompanies=DATA.companies.filter(c=>(!state.company||c.id===state.company)&&(!q||c.search.includes(q)||counts.has(c.id))&&(!m||c.codes.some(x=>x.startsWith(m.toUpperCase()+':')))&&c.industries.some(ind=>industryMatch(ind))&&(!reportFilter||counts.has(c.id))).map(c=>({c,count:counts.get(c.id)||0,latest:latest.get(c.id)||''})).sort((a,b)=>$('sort').value==='company'?a.c.name.localeCompare(b.c.name,'zh'):b.count-a.count||a.c.name.localeCompare(b.c.name,'zh'));render();syncUrl();}
function openCompany(id){state.company=id;state.view='reports';$('query').value='';apply();const c=COMP.get(id);$('company-title').textContent=c.name;$('company-description').textContent=[c.full,c.codes.join(' · ')].filter(Boolean).join('　');$('company-context').style.display='flex';window.scrollTo({top:0,behavior:'smooth'});}
function reportRow(r){const c=COMP.get(r.c),checked=state.selected.has(r.id);return'<tr><td class="check-col"><input type="checkbox" class="report-check" data-id="'+esc(r.id)+'" aria-label="选择'+esc(r.t)+'" '+(checked?'checked':'')+'></td><td><button class="link company-name" data-company="'+esc(r.c)+'">'+esc(c.name||r.short)+'</button><span class="sub">'+esc(r.code.split(';').slice(0,2).join(' / '))+(r.code.split(';').length>2?' 等 '+r.code.split(';').length+' 个代码':'')+' · '+(r.m==='a'?'A股':'港股')+'</span>'+(r.short!==c.name?'<span class="sub">披露简称：'+esc(r.short)+'</span>':'')+'</td><td><a class="report-title" href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">'+esc(r.t)+'</a><div class="meta"><span class="tag">'+esc(r.k)+'</span><span>'+ (r.l==='en'?'英文':'中文')+'</span>'+(r.rev?'<span class="tag revision">修订版</span>':'')+'</div></td><td>'+esc(r.ind[1]||'待补充')+'<span class="sub">'+esc(r.ind[2]||r.ind[0])+'</span></td><td class="numeric">'+(r.y||'未注明')+'</td><td class="numeric">'+esc(r.d)+'</td><td class="numeric">'+sizeLabel(r.sz,r.sizeExact)+'</td><td><div class="actions"><a href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">查看</a><button class="link" data-download="'+esc(r.id)+'">下载</button>'+(LIVE&&state.downloaded.has(r.id)?'<a target="_blank" rel="noreferrer" href="/local-report?id='+encodeURIComponent(r.id)+'&token='+encodeURIComponent(TOKEN)+'">本地查看</a>':'')+'</div><a class="sub" href="'+esc(safeUrl(r.source))+'" target="_blank" rel="noopener noreferrer">来源</a></td></tr>';}
function companyRow(o){const c=o.c;return'<tr><td><button class="link company-name" data-company="'+esc(c.id)+'">'+esc(c.name)+'</button><span class="sub">'+esc(c.full)+'</span></td><td>'+esc(c.codes.join(' · '))+'</td><td>'+c.industries.map(i=>esc(i[0]+' · '+(i[1]||'待补充'))).join('<br>')+'</td><td class="numeric">'+num(o.count)+'</td><td>'+esc(o.latest||'—')+'</td><td><button class="link" data-company="'+esc(c.id)+'">查看报告</button><button class="link" data-company-download="'+esc(c.id)+'" '+(!o.count?'disabled':'')+'>导出清单</button></td></tr>';}
function render(){const isReports=state.view==='reports',items=isReports?state.filtered:state.visibleCompanies;const pages=Math.max(1,Math.ceil(items.length/state.size));state.page=Math.min(state.page,pages);const shown=items.slice((state.page-1)*state.size,state.page*state.size);$('report-table').hidden=!isReports;$('company-table').hidden=isReports;$('report-rows').innerHTML=isReports?shown.map(reportRow).join(''):'';$('company-rows').innerHTML=!isReports?shown.map(companyRow).join(''):'';$('empty').hidden=items.length>0;$('report-table').style.display=isReports&&items.length?'table':'none';$('company-table').style.display=!isReports&&items.length?'table':'none';$('reports-tab').classList.toggle('active',isReports);$('companies-tab').classList.toggle('active',!isReports);$('result-count').textContent=isReports?num(state.filtered.length)+' 份报告 · '+num(new Set(state.filtered.map(r=>r.c)).size)+' 家企业':num(items.length)+' 家企业 · '+num(state.filtered.length)+' 份报告';$('page-summary').textContent=items.length?'显示 '+num((state.page-1)*state.size+1)+'–'+num(Math.min(state.page*state.size,items.length))+'，共 '+num(items.length)+' 条':'0 条结果';$('page-number').textContent=state.page+' / '+pages;$('prev').disabled=state.page<=1;$('next').disabled=state.page>=pages;$('download-filtered').disabled=!state.filtered.length;$('download-selected').disabled=!state.selected.size;$('download-selected').textContent='导出所选'+(state.selected.size?' ('+num(state.selected.size)+')':'');$('select-page').checked=!!shown.length&&isReports&&shown.every(r=>state.selected.has(r.id));$('select-page').indeterminate=isReports&&shown.some(r=>state.selected.has(r.id))&&!shown.every(r=>state.selected.has(r.id));$('chips').innerHTML=[...state.industries].map(key=>'<button class="chip" data-remove-industry="'+esc(key)+'">'+esc(key==='unknown'?'行业待补充':key.split('|').slice(2).join('|'))+' ×</button>').join('');}
function exportCSV(reports=state.filtered){if(EMBEDDED){toast('请点击右上方“独立打开”，再导出清单。');return;}const rows=[['报告名称','证券简称（披露时）','证券代码','公司全称','市场','行业体系','一级行业','二级行业','三级行业','报告年度','发布日期','报告大小（字节）','大小依据','语言','报告类型','报告链接','来源链接']];for(const r of reports)rows.push([r.t,r.short,r.code,COMP.get(r.c)?.full,r.m==='a'?'A股':'港股',...r.ind,r.y??'',r.d,r.sz??'',r.sizeExact?'实际文件':'来源估计',r.l==='zh'?'中文':'英文',r.k,r.url,r.source]);const csv='\ufeff'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ESG报告清单_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);}

function currentUrl(){
  const url=new URL(location.href);
  for(const [id,key] of [['query','q'],['market','market'],['year','year'],['language','language'],['kind','kind'],['from-date','from'],['to-date','to'],['sort','sort']]){
    const value=$(id).value;
    if(value&&!(id==='sort'&&value==='date-desc'))url.searchParams.set(key,value);else url.searchParams.delete(key);
  }
  url.searchParams.delete('industry');
  for(const key of state.industries)url.searchParams.append('industry',key);
  if(state.company)url.searchParams.set('company',state.company);else url.searchParams.delete('company');
  return url;
}
function syncUrl(){
  const url=currentUrl();
  history.replaceState(null,'',url);
  url.searchParams.delete('embed');
  $('standalone-link').href=url.href;
}
function showTools(){ $('download-dialog').showModal(); }
function singleDownload(id){
  const url=safeUrl(BYID.get(id)?.url);
  if(url==='#'){toast('报告链接暂不可用');return;}
  window.open(url,'_blank','noopener');
  toast('原文已打开，请使用浏览器的下载或保存按钮。');
}
$('industry-list').addEventListener('change',e=>{
  if(e.target.type==='checkbox'){
    e.target.checked?state.industries.add(e.target.value):state.industries.delete(e.target.value);
    apply();
  }
});
$('chips').onclick=e=>{const b=e.target.closest('[data-remove-industry]');if(b){state.industries.delete(b.dataset.removeIndustry);renderIndustries();apply();}};
$('industry-search').oninput=renderIndustries;
$('industry-level').onchange=renderIndustries;
$('clear-industries').onclick=()=>{state.industries.clear();renderIndustries();apply();};
let debounce;
$('query').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>apply(),180);};
for(const id of ['market','year','language','kind','from-date','to-date','sort'])$(id).onchange=()=>apply();
$('page-size').onchange=()=>{state.size=Number($('page-size').value);state.page=1;render();};
$('prev').onclick=()=>{state.page--;render();};
$('next').onclick=()=>{state.page++;render();};
$('reports-tab').onclick=()=>{state.view='reports';state.page=1;render();};
$('companies-tab').onclick=()=>{state.view='companies';state.page=1;render();};
$('reset').onclick=()=>{
  for(const id of ['query','market','year','language','kind','from-date','to-date','industry-search'])$(id).value='';
  $('sort').value='date-desc';state.company=null;
  $('company-context').style.display='none';state.industries.clear();renderIndustries();apply();
};
$('toggle-filter').onclick=()=>$('sidebar').classList.toggle('open');
$('exit-company').onclick=()=>{state.company=null;$('company-context').style.display='none';apply();};
$('select-page').onchange=e=>{for(const r of state.filtered.slice((state.page-1)*state.size,state.page*state.size))e.target.checked?state.selected.add(r.id):state.selected.delete(r.id);render();};
document.addEventListener('change',e=>{
  if(e.target.classList.contains('report-check')){
    e.target.checked?state.selected.add(e.target.dataset.id):state.selected.delete(e.target.dataset.id);render();
  }
});
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-company],[data-download],[data-company-download]');
  if(!target)return;
  if(target.dataset.company)openCompany(target.dataset.company);
  else if(target.dataset.download)singleDownload(target.dataset.download);
  else exportCSV(state.filtered.filter(r=>r.c===target.dataset.companyDownload));
});
$('download-selected').onclick=()=>exportCSV(state.filtered.filter(r=>state.selected.has(r.id)));
$('download-filtered').onclick=()=>exportCSV();
$('download-all').onclick=showTools;
$('tools-button').onclick=showTools;
$('company-download').onclick=()=>exportCSV();
$('cancel-download').onclick=()=>$('download-dialog').close();
$('help-button').onclick=()=>$('help-dialog').showModal();
$('close-help').onclick=()=>$('help-dialog').close();
for(const id of ['download-dialog','help-dialog'])$(id).addEventListener('click',e=>{if(e.target===$(id))$(id).close();});
$('stat-reports').textContent=num(DATA.reports.length);
$('stat-companies').textContent=num(DATA.companies.length);
for(const year of [2021,2022,2023,2024,2025])$('stat-year-'+year).textContent=num(DATA.years[String(year)]);
for(const year of [2025,2024,2023,2022,2021]){
  const o=document.createElement('option');o.value=year;o.textContent=year+' 年度';$('year').appendChild(o);
}
const params=new URLSearchParams(location.search);
for(const [id,key] of [['query','q'],['market','market'],['year','year'],['language','language'],['kind','kind'],['from-date','from'],['to-date','to'],['sort','sort']]){
  if(params.has(key))$(id).value=params.get(key);
}
if(!$('sort').value)$('sort').value='date-desc';
const validIndustries=new Set(['unknown']);
for(const c of DATA.companies)for(const ind of c.industries)for(const level of [1,2,3]){
  if(ind[level])validIndustries.add(ind[0]+'|'+level+'|'+ind.slice(1,level+1).join(' / '));
}
for(const key of params.getAll('industry'))if(validIndustries.has(key))state.industries.add(key);
renderIndustries();
if(COMP.has(params.get('company')))openCompany(params.get('company'));else apply();
if(EMBEDDED){
  document.body.classList.add('embedded');
  $('back-community').href='community.html?embed=1';
  window.parent.postMessage({type:'aiesg-community-navigation',page:'reports.html'},'*');
  let lastActivity=0;
  const notifyActivity=()=>{const now=Date.now();if(now-lastActivity<5000)return;lastActivity=now;window.parent.postMessage({type:'aiesg:community-activity'},'*');};
  for(const event of ['pointerdown','keydown','scroll','touchstart'])document.addEventListener(event,notifyActivity,{passive:true,capture:true});
}
syncUrl();

}
let loading=false;
async function start(){
  if(loading)return;loading=true;
  document.getElementById('retry-load').hidden=true;
  document.getElementById('load-title').textContent='正在载入报告';
  document.getElementById('load-message').textContent='首次打开需要读取报告索引，请稍候。';
  try{
    const data=await ReportCatalogue.load((done,total)=>{
      const bar=document.getElementById('load-progress');bar.max=total;bar.value=done;
      document.getElementById('load-message').textContent='正在载入报告，请稍候… '+Math.round(done/total*100)+'%';
    });
    initialize(data);
    document.getElementById('load-state').hidden=true;
    document.getElementById('report-layout').hidden=false;
    document.body.dataset.reportsReady='true';
  }catch(error){
    document.getElementById('load-title').textContent='报告暂时未能载入';
    document.getElementById('load-message').textContent='请检查网络后重试，已读取的部分会保留。';
    document.getElementById('retry-load').hidden=false;
  }finally{loading=false;}
}
document.getElementById('tools-button').onclick=()=>document.getElementById('download-dialog').showModal();
document.getElementById('cancel-download').onclick=()=>document.getElementById('download-dialog').close();
document.getElementById('help-button').onclick=()=>document.getElementById('help-dialog').showModal();
document.getElementById('close-help').onclick=()=>document.getElementById('help-dialog').close();
if(EMBEDDED){document.body.classList.add('embedded');document.getElementById('back-community').href='community.html?embed=1';}
const independent=new URL(location.href);independent.searchParams.delete('embed');document.getElementById('standalone-link').href=independent.href;
document.getElementById('retry-load').onclick=start;
start();
})();
