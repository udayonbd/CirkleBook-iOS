
/* CirkleBook FINAL v9 — native auth + story reaction */
(function(){
'use strict';
if(window.__CB_FINAL_CORE_V9__)return;window.__CB_FINAL_CORE_V9__=true;
const API='https://cirklebook-4u6gv.ondigitalocean.app/api/v1',KEY='cirklebook_access_token';
const plugin=()=>window.Capacitor?.Plugins?.CapacitorHttp||null;
const cookies=()=>window.Capacitor?.Plugins?.CapacitorCookies||null;
const findToken=v=>{if(!v)return'';if(typeof v==='string')return v.length>20?v:'';if(typeof v!=='object')return'';for(const k of['accessToken','access_token','token'])if(typeof v[k]==='string'&&v[k].length>20)return v[k];for(const c of Object.values(v)){const t=findToken(c);if(t)return t;}return'';};
async function clearCookies(){try{if(cookies()?.clearAllCookies)await cookies().clearAllCookies();}catch(_){}}
async function nativeRequest(path,method='GET',data=null,token=''){
  const headers={Accept:'application/json',Origin:'https://cirklebook.com',Referer:'https://cirklebook.com/',...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  if(plugin()?.request){
    const r=await plugin().request({url:API+path,method,headers,...(data!==null?{data}:{})});
    const body=r.data||{};
    if(Number(r.status)<200||Number(r.status)>=300){const e=new Error(body?.error?.message||body?.message||`Request failed (${r.status})`);e.status=Number(r.status);throw e;}
    return body;
  }
  const r=await fetch(API+path,{method,headers:{Accept:'application/json',...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},credentials:'omit',...(data!==null?{body:JSON.stringify(data)}:{})});
  const body=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(body?.error?.message||body?.message||`Request failed (${r.status})`);e.status=r.status;throw e;}return body;
}
function msg(text){const n=document.getElementById('loginMessage');if(n){n.textContent=text||'';n.classList.toggle('hidden',!text);}}
document.addEventListener('submit',async e=>{
  if(e.target?.id!=='loginForm')return;
  e.preventDefault();e.stopImmediatePropagation();
  const identifier=document.getElementById('loginIdentifier')?.value?.trim()||'',password=document.getElementById('loginPassword')?.value||'',b=document.getElementById('loginButton');
  if(!identifier||!password){msg('Please enter username/email and password.');return;}
  msg('');if(b){b.disabled=true;b.textContent='Logging in...';}
  try{
    await clearCookies();
    const d=await nativeRequest('/auth/login','POST',{identifier,password});
    const t=findToken(d);if(!t)throw new Error('Login succeeded but access token was not returned.');
    localStorage.setItem(KEY,t);location.reload();
  }catch(err){localStorage.removeItem(KEY);msg(err.message||'Login failed.');}
  finally{if(b){b.disabled=false;b.textContent='Log In';}}
},true);

document.addEventListener('click',async e=>{
  const logout=e.target?.closest?.('#logoutButton');if(!logout)return;
  e.preventDefault();e.stopImmediatePropagation();
  const t=localStorage.getItem(KEY)||'';
  try{if(t)await nativeRequest('/auth/logout','POST',{},t);}catch(_){}
  await clearCookies();
  localStorage.removeItem(KEY);
  try{sessionStorage.clear();}catch(_){}
  location.reload();
},true);

function storyId(){
  const shell=document.getElementById('cbStoryViewerShell');
  if(shell?.dataset?.storyId)return shell.dataset.storyId;
  if(window.__cirklebookActiveStoryId)return window.__cirklebookActiveStoryId;
  const own=window.__cirklebookOwnStory;
  const list=[own,...(window.__cirklebookStories||[])].filter(Boolean);
  const owner=document.getElementById('cbStoryViewerOwner')?.textContent||'';
  const st=list.find(s=>owner==='Your story'?s===own:(s.ownerName||s.owner_name||s.user?.display_name||s.user?.username||'')===owner);
  return st?.id||st?.storyId||st?.story_id||'';
}
function toast(t){try{window.showToast?.(t);}catch(_){}}
function addStory(){
  const shell=document.getElementById('cbStoryViewerShell');if(!shell||shell.querySelector('.cb-v9-story-react'))return;
  const bar=document.createElement('div');bar.className='cb-v9-story-react';
  const vals=[['like','👍'],['love','❤️'],['haha','😂'],['wow','😮'],['sad','😢'],['angry','😡']];
  bar.innerHTML=vals.map(([k,v])=>`<button type="button" data-r="${k}">${v}</button>`).join('');shell.appendChild(bar);
  bar.querySelectorAll('button').forEach(btn=>btn.onclick=async ev=>{
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    const sid=storyId();if(!sid){toast('Story ID unavailable.');return;}
    const t=localStorage.getItem(KEY)||'';
    try{
      const d=await nativeRequest(`/stories/${encodeURIComponent(sid)}/reactions`,'POST',{reactionType:btn.dataset.r},t);
      bar.querySelectorAll('button').forEach(x=>x.classList.remove('on'));btn.classList.add('on');
      const shell=document.getElementById('cbStoryViewerShell');
      if(shell){
        const fly=document.createElement('span');
        fly.className='cb-v10-story-reaction-fly';
        fly.textContent=btn.textContent||'';
        const br=btn.getBoundingClientRect(),sr=shell.getBoundingClientRect();
        fly.style.left=`${br.left-sr.left+br.width/2}px`;
        fly.style.top=`${br.top-sr.top+br.height/2}px`;
        shell.appendChild(fly);
        requestAnimationFrame(()=>requestAnimationFrame(()=>fly.classList.add('go')));
        setTimeout(()=>fly.remove(),1100);
      }
      toast('Story reaction sent');
    }catch(err){
      toast(err.status===404?'Story reaction needs the server update included with FINAL v9.':(err.message||'Unable to react.'));
    }
  });
}
const st=document.createElement('style');st.textContent='.cb-v9-story-react{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:50;display:flex;gap:3px;padding:7px 9px;background:rgba(0,0,0,.66);border-radius:999px}.cb-v9-story-react button{width:40px;height:40px;border:0;border-radius:50%;background:transparent;font-size:27px}.cb-v9-story-react button.on{background:#ffffff40;transform:scale(1.12)}.cb-v10-story-reaction-fly{position:absolute;z-index:120;transform:translate(-50%,-50%) scale(1);font-size:46px;line-height:1;pointer-events:none;opacity:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45));transition:transform .95s cubic-bezier(.18,.8,.25,1),opacity .95s ease}.cb-v10-story-reaction-fly.go{transform:translate(-50%,-430px) scale(1.9) rotate(-8deg);opacity:0}';document.head.appendChild(st);
function boot(){addStory();new MutationObserver(addStory).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
