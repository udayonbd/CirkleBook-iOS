
/* CirkleBook FINAL v9 — direct native People/Page/Group search */
(function(){
'use strict';
if(window.__CB_FINAL_SEARCH_V9__) return;
window.__CB_FINAL_SEARCH_V9__=true;

const API='https://cirklebook-4u6gv.ondigitalocean.app/api/v1';
const KEY='cirklebook_access_token';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function nativeHttp(){
  return window.Capacitor?.Plugins?.CapacitorHttp || null;
}
async function request(path){
  const token=localStorage.getItem(KEY)||'';
  const headers={
    Accept:'application/json',
    Origin:'https://cirklebook.com',
    Referer:'https://cirklebook.com/',
    ...(token?{Authorization:`Bearer ${token}`}:{})
  };
  const plugin=nativeHttp();
  if(plugin?.request){
    const r=await plugin.request({url:API+path,method:'GET',headers});
    if(Number(r.status)<200||Number(r.status)>=300){
      const d=r.data||{};
      const e=new Error(d?.error?.message||d?.message||`Request failed (${r.status})`);
      e.status=Number(r.status);throw e;
    }
    return r.data||{};
  }
  const r=await fetch(API+path,{headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},credentials:'omit'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d?.error?.message||d?.message||`Request failed (${r.status})`);e.status=r.status;throw e;}
  return d;
}
function unwrap(v){return v?.data??v??{};}
function list(v,key){
  const d=unwrap(v);
  if(Array.isArray(d)) return d;
  if(Array.isArray(d?.[key])) return d[key];
  if(Array.isArray(d?.items)) return d.items;
  return [];
}
function media(id){return id?`${API}/media/asset/${encodeURIComponent(id)}`:'';}

function ensureStyle(){
  if($('cbSearchV9Style'))return;
  const s=document.createElement('style');s.id='cbSearchV9Style';
  s.textContent=`#cbSearchV9{position:fixed;inset:0;z-index:2000000;background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:flex-start;padding:78px 10px 16px}#cbSearchV9 .p{width:min(760px,96vw);max-height:82vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 20px 60px #0005}#cbSearchV9 .h{position:sticky;top:0;z-index:2;background:#fff;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px;border-bottom:1px solid #ddd}#cbSearchV9 h2{font-size:27px;margin:0}#cbSearchV9 .x{width:42px;height:42px;border:0;border-radius:50%;font-size:28px;background:#e4e6eb}#cbSearchV9 .b{padding:12px}#cbSearchV9 .r{display:flex;align-items:center;gap:12px;width:100%;padding:11px;margin:0 0 8px;border:1px solid #e4e6eb;border-radius:12px;background:#fff;text-align:left}#cbSearchV9 .a{width:50px;height:50px;flex:0 0 50px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#1877f2;color:#fff;font-weight:800}#cbSearchV9 .m{display:grid;gap:3px;flex:1}#cbSearchV9 small{color:#65676b}#cbSearchV9 .empty{padding:32px 14px;text-align:center;color:#65676b}`;
  document.head.appendChild(s);
}
function close(){$('cbSearchV9')?.remove();}
function open(q){
  ensureStyle();close();
  const o=document.createElement('div');o.id='cbSearchV9';
  o.innerHTML=`<section class="p"><div class="h"><div><h2>People, Pages and Groups</h2><small>Search results for “${esc(q)}”</small></div><button class="x">×</button></div><div class="b"><div class="empty">Searching…</div></div></section>`;
  document.body.appendChild(o);o.querySelector('.x').onclick=close;o.onclick=e=>{if(e.target===o)close();};return o.querySelector('.b');
}
function add(out,seen,x,label,type,q){
  if(!x||typeof x!=='object')return;
  x=x.user||x.friend||x.follower||x.following||x;
  const name=x.displayName||x.display_name||x.name||x.username||'Cirklebook';
  const username=x.username||'';
  if(!`${name} ${username}`.toLocaleLowerCase().includes(q.toLocaleLowerCase()))return;
  const id=x.id||x.userId||x.user_id||'';
  const entity=x.entityType||x.entity_type||type||'user';
  const k=`${entity}:${id||username||name}`.toLowerCase();if(seen.has(k))return;seen.add(k);
  out.push({id,name,username,label:entity==='page'?'Page':entity==='group'?'Group':label,entity,avatar:media(x.profileMediaId||x.profile_media_id)});
}
async function run(raw){
  const q=String(raw||'').trim();if(q.length<2){close();return;}
  const host=open(q);
  const jobs=await Promise.allSettled([
    request(`/users/search?q=${encodeURIComponent(q)}&limit=50`),
    request('/pages'),
    request('/groups'),
    request('/friends'),
    request('/follows/followers'),
    request('/follows/following')
  ]);
  const out=[],seen=new Set();
  if(jobs[0].status==='fulfilled') list(jobs[0].value,'users').forEach(x=>add(out,seen,x,'Person','user',q));
  if(jobs[1].status==='fulfilled') list(jobs[1].value,'pages').forEach(x=>add(out,seen,x,'Page','page',q));
  if(jobs[2].status==='fulfilled') list(jobs[2].value,'groups').forEach(x=>add(out,seen,x,'Group','group',q));
  if(jobs[3].status==='fulfilled') list(jobs[3].value,'friends').forEach(x=>add(out,seen,x,'Friend','user',q));
  if(jobs[4].status==='fulfilled') list(jobs[4].value,'followers').forEach(x=>add(out,seen,x,'Follower','user',q));
  if(jobs[5].status==='fulfilled') list(jobs[5].value,'following').forEach(x=>add(out,seen,x,'Following','user',q));

  if(!out.length){
    const errors=jobs.filter(x=>x.status==='rejected').map(x=>x.reason?.message).filter(Boolean);
    host.innerHTML=`<div class="empty">${errors.length===jobs.length?esc(errors[0]||'Search service unavailable.'):`No matching People, Pages or Groups found for “${esc(q)}”.`}</div>`;
    return;
  }
  host.innerHTML=out.slice(0,100).map(x=>`<button class="r" type="button" data-id="${esc(x.id)}" data-type="${esc(x.entity)}" data-username="${esc(x.username)}">${x.avatar?`<img class="a" src="${esc(x.avatar)}" alt="">`:`<span class="a">${esc(x.name[0]?.toUpperCase()||'C')}</span>`}<span class="m"><b>${esc(x.name)}</b><small>${x.username?'@'+esc(x.username)+' · ':''}${esc(x.label)}</small></span><b>›</b></button>`).join('');
  host.querySelectorAll('.r').forEach(b=>b.onclick=()=>{
    const id=b.dataset.id,type=b.dataset.type,username=b.dataset.username;close();
    if(type==='user'&&typeof window.CirklebookOpenPublicProfileById==='function') return window.CirklebookOpenPublicProfileById(id);
    if(type==='page'&&typeof window.CirklebookOpenPageByUsername==='function') return window.CirklebookOpenPageByUsername(username);
    if(type==='group'&&typeof window.CirklebookOpenGroupByUsername==='function') return window.CirklebookOpenGroupByUsername(username);
  });
}
function bind(){
  const top=$('topSearch');
  if(top&&!top.dataset.v9){
    top.dataset.v9='1';let t;
    top.addEventListener('input',e=>{e.stopImmediatePropagation();clearTimeout(t);t=setTimeout(()=>run(top.value),350);},true);
    top.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();clearTimeout(t);run(top.value);}},true);
  }
  const mobile=$('cbMobileSearchInput');
  if(mobile&&!mobile.dataset.v9){
    mobile.dataset.v9='1';let t;
    mobile.addEventListener('input',e=>{e.stopImmediatePropagation();clearTimeout(t);t=setTimeout(()=>run(mobile.value),350);},true);
    mobile.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();clearTimeout(t);run(mobile.value);}},true);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
new MutationObserver(bind).observe(document.documentElement,{subtree:true,childList:true});
window.CirklebookPeopleSearch=run;
})();
