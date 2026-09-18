(function(){'use strict';
const clean=v=>String(v||'').replace(/^[•◦]\s*/,'').replace(/\s+/g,' ').trim();
const isOfficial=b=>b.provenance==='official'||b.provenance==='official_guidance';
window.renderKnowledgeDetailV3=function({standard,item,group,detail,sections,relations,source,esc,renderBlock,href}){
 const official=[],reading=[];
 (sections||[]).forEach((section,index)=>{
  const off=(section.blocks||[]).filter(isOfficial),note=(section.blocks||[]).filter(b=>!isOfficial(b));
  if(off.length)official.push({section,blocks:off,index});
  if(note.length)reading.push({section,blocks:note,index});
 });
 const allItems=(standard.groups||[]).flatMap(g=>g.items||[]);
 const sameMap=Object.fromEntries(allItems.map(i=>[i.title,i]));
 const linked=[],external=[];
 (relations||[]).forEach(r=>{
  const title=typeof r==='string'?r:(r&&r.title);
  if(!title)return;
  if(sameMap[title])linked.push(sameMap[title]);
  else external.push(title);
 });
 const officialFiles=(standard.officialFiles||[]).map(f=>({name:f.name,url:f.url}));
 const primaryUrl=detail&&detail.officialUrl;
 const primary=officialFiles.find(f=>f.url===primaryUrl);
 const fileList=officialFiles.map(f=>{
  const current=f.url===primaryUrl;
  return `<li${current?' class="is-current"':''}><a href="${esc(f.url)}" target="_blank" rel="noreferrer">${esc(f.name)}${current?'（本条为本页条文来源）':''} ↗</a></li>`;
 }).join('');
 const originalHtml=official.length?`<div class="kd-original">${official.map(({section,blocks,index})=>`<article><header><span>${esc(section.eyebrow||'官方条文')}</span><h3>${esc(section.title)}</h3></header><div class="kd-original-body">${blocks.map((b,bi)=>renderBlock(b,`off-${index}-${bi}`)).join('')}</div></article>`).join('')}</div>`:`<div class="kd-empty">本页暂无官方条文摘录，请通过文末官方文件进入发布机构现行文件。</div>`;
 const readingHtml=reading.length?`<section class="kd-sec" id="reading"><header><span>理解与解读</span><h2>${esc(detail.title||item.title)} 如何理解</h2></header><div class="kd-notes">${reading.map(({section,blocks,index})=>`<article><h4>${esc(section.title)}</h4>${blocks.map((b,bi)=>renderBlock(b,`note-${index}-${bi}`)).join('')}</article>`).join('')}</div><small class="kd-ai-tag">AI 整理 · 供学习参考</small></section>`:'';
 const relationsHtml=(linked.length||external.length)?`<section class="kd-sec" id="relations"><header><span>相关主题</span><h2>与其它内容的关系</h2></header>${linked.length?`<div class="kd-related"><p class="kd-related-label">同标准相关主题</p><div class="kd-rel-grid">${linked.map(i=>`<a href="${href('topic.html',{standard:standard.id,id:i.id})}"><span>${esc(i.eyebrow||'主题')}</span><b>${esc(i.title)}</b></a>`).join('')}</div></div>`:''}${external.length?`<div class="kd-related"><p class="kd-related-label">外部相关概念</p><div class="kd-rel-tags">${external.map(t=>`<i>${esc(t)}</i>`).join('')}</div></div>`:''}</section>`:'';
 return `<div class="kd-page" data-system="${esc(standard.id)}"><main class="kd-main">
 <nav class="kd-crumb"><a href="${href('standard.html',{id:standard.id})}">${esc(standard.title)}</a><span>/</span><b>${esc(group?.title||'')}</b></nav>
 <header class="kd-head"><span>${esc(detail.eyebrow||item.eyebrow||'披露议题')}</span><h1>${esc(detail.title||item.title)}</h1><p>${esc(detail.summary||item.summary||'')}</p>${primary?`<a class="kd-official-link" href="${esc(primary.url)}" target="_blank" rel="noreferrer">官方条文 · ${esc(primary.name)} ↗</a>`:''}</header>
 <section class="kd-sec" id="original"><header><span>官方条文</span><h2>${esc(detail.title||item.title)} 的披露要求</h2><p>以下为官方文件条文摘录。</p></header>${originalHtml}</section>
 ${readingHtml}
 ${relationsHtml}
 <section id="sources" class="kd-sources"><span>官方文件</span>${fileList?`<ul class="kd-file-list">${fileList}</ul>`:''}<small class="kd-ai-note">本页为 AI 基于上述官方文件整理的解析内容（“理解与解读”为平台整理，非发布机构正式条文）；正式工作请以发布机构现行文件为准。</small></section>
 </main></div>`;
};})();
