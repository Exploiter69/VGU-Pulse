(() => {
  const boot = () => {
    const view = document.querySelector('[data-view-panel="community"]');
    if (!view || document.getElementById("community-v2-root")) return;

    const style = document.createElement("style");
    style.textContent = `
      #community-v2-root{margin-top:2px}
      .cv2-hero{padding:6px 0 16px}
      .cv2-kicker{color:var(--faint);font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
      .cv2-title{font-size:30px;letter-spacing:-.045em;margin:4px 0}
      .cv2-subtitle{color:var(--muted);max-width:620px;margin:6px 0 0}
      .cv2-toolbar{display:flex;gap:7px;align-items:center;margin-top:16px}
      .cv2-toolbar .cv2-search{flex:1}
      .cv2-search{display:flex;align-items:center;gap:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:4px 5px 4px 12px}
      .cv2-search input{border:0;background:transparent;margin:0;min-width:0;outline:0}
      .cv2-icon-btn,.cv2-filter-btn{min-height:42px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:11px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}
      .cv2-post-btn{min-height:42px;border:0;background:var(--accent);color:var(--accent-ink);border-radius:11px;padding:8px 14px;font:inherit;font-weight:800;cursor:pointer;white-space:nowrap}
      .cv2-tabs{display:flex;gap:6px;overflow:auto;padding:3px 0;scrollbar-width:none}
      .cv2-tabs::-webkit-scrollbar{display:none}
      .cv2-tab{flex:0 0 auto;min-height:38px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:999px;padding:7px 11px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
      .cv2-tab.active{color:var(--text);background:var(--surface-2);border-color:var(--border-strong)}
      .cv2-item-edited{color:var(--accent);font-size:11px}
      .cv2-more-dialog .cv2-field select{margin:0}
      .cv2-context{display:flex;align-items:center;gap:7px;margin-top:9px;min-height:34px}
      .cv2-context-label{font-size:12px;color:var(--muted)}
      .cv2-community{border:0;background:transparent;color:var(--accent);font:inherit;font-weight:750;padding:6px 0;cursor:pointer}
      .cv2-feed{border-top:1px solid var(--border);margin-top:12px}
      .cv2-item{padding:18px 0;border-bottom:1px solid var(--border)}
      .cv2-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .cv2-wrap{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      .cv2-badge{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:4px 8px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      .cv2-badge.anon{color:var(--warning);border-color:rgba(240,197,111,.25)}
      .cv2-item h3{font-size:17px;margin:7px 0 5px}
      .cv2-body{white-space:pre-wrap;margin:0}
      .cv2-note{color:var(--muted);font-size:12px}
      .cv2-actions{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:10px}
      .cv2-tool{min-height:38px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:10px;padding:7px 10px;font:inherit;font-size:12px;font-weight:650;cursor:pointer}
      .cv2-tool:hover,.cv2-tool.active{color:var(--text);background:var(--surface-2)}
      .cv2-replies{margin-top:10px;padding-left:12px;border-left:2px solid var(--border)}.cv2-reply-compose{margin-top:10px}
      .cv2-reply{padding:8px 0;border-bottom:1px solid var(--border)}
      .cv2-reply:last-child{border-bottom:0}
      .cv2-poll-options{display:grid;gap:6px;margin-top:9px}
      .cv2-poll-option{text-align:left;border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:10px;padding:10px;font:inherit;cursor:pointer}
      .cv2-dialog{width:min(620px,calc(100% - 24px));border:1px solid var(--border-strong);border-radius:18px;background:var(--surface);color:var(--text);padding:0}
      .cv2-dialog::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(4px)}
      .cv2-sheet{padding:18px}
      .cv2-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .cv2-sheet h3{font-size:20px;margin:0}
      .cv2-close{width:40px;height:40px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}.cv2-close:hover{background:var(--surface-3);color:var(--text)}
      .cv2-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .cv2-field{margin-top:9px}
      .cv2-field label{display:block;margin-bottom:4px}
      .cv2-field input,.cv2-field textarea,.cv2-field select{margin:0}
      .cv2-actions-row{display:flex;gap:7px;align-items:center;justify-content:flex-end;margin-top:12px}
      .cv2-empty{padding:34px 8px;text-align:center;color:var(--muted)}
      .cv2-discovery{margin-top:16px;padding:13px 0;border-top:1px solid var(--border)}
      .cv2-discovery summary{cursor:pointer;color:var(--text);font-weight:750}
      .cv2-community-list{display:flex;gap:6px;overflow:auto;padding:10px 0 2px;scrollbar-width:none}
      .cv2-community-chip{flex:0 0 auto;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:999px;padding:7px 10px;font:inherit;cursor:pointer}
      .cv2-anon-toggle{display:inline-flex;align-items:center;gap:7px;min-height:40px;margin-top:9px;color:var(--muted);font-size:12px;font-weight:700}.cv2-anon-toggle input{width:16px;height:16px;margin:0}.cv2-ask-bridge{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.cv2-intent-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px}.cv2-intent-grid button{min-height:68px;text-align:left;border:1px solid var(--border);background:var(--surface-2);border-radius:12px;padding:10px;color:var(--text);cursor:pointer}.cv2-intent-grid button strong{display:block;font-size:12px}.cv2-intent-grid button span{display:block;color:var(--muted);font-size:10px;line-height:1.35;margin-top:3px}.cv2-intent-grid button.active{border-color:var(--accent);background:rgba(138,180,255,.08);box-shadow:inset 0 0 0 1px rgba(138,180,255,.15)}@media(max-width:620px){.cv2-intent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      .cv2-ask-bridge button{min-height:38px}
      @media(max-width:620px){.cv2-grid{grid-template-columns:1fr}.cv2-toolbar{align-items:stretch}.cv2-post-btn{padding-inline:11px}.cv2-title{font-size:27px}}
    `;
    document.head.appendChild(style);
    

    const root=document.createElement("section");
    root.id="community-v2-root";
    root.innerHTML=`
      <div class="cv2-hero">
        <div class="cv2-kicker">Student community</div>
        <h2 class="cv2-title">Talk to VGU students.</h2>
        <p class="cv2-subtitle">Questions, confessions, campus help, opportunities and useful student knowledge — all in one feed.</p>
        <div class="cv2-toolbar">
          <div class="cv2-search">
            <input id="cv2-search" type="search" placeholder="Search discussions…" aria-label="Search student discussions">
            <button class="cv2-icon-btn" id="cv2-search-btn" type="button" aria-label="Search">⌕</button>
          </div>
          <button class="cv2-filter-btn" id="cv2-filter-open" type="button">Filter</button>
          <button class="cv2-post-btn" id="cv2-compose-open" type="button">＋ Create</button>
        </div>
        <div class="cv2-tabs" role="tablist" aria-label="Community feed">
          <button type="button" class="cv2-tab active" data-sort="trending">Trending</button>
          <button type="button" class="cv2-tab" data-sort="new">Latest</button>
          <button type="button" class="cv2-tab" data-kind="confession">Confessions</button>
          <button type="button" class="cv2-tab" data-kind="campus">Campus</button>
          <button type="button" class="cv2-tab" data-kind="exam">Exam survival</button>
          <button type="button" class="cv2-tab" data-special="saved">Saved</button>
        </div>
        <div class="cv2-context">
          <span class="cv2-context-label">Showing</span>
          <button class="cv2-community" id="cv2-current-community" type="button">VGU campus</button>
          <button class="cv2-tool" id="cv2-personalize" type="button">For me</button><button class="cv2-tool" id="cv2-people" type="button">Find people</button>
        </div>
        <details class="cv2-discovery">
          <summary>More communities & topics</summary>
          <div id="cv2-communities" class="cv2-community-list"><span class="cv2-note">Loading…</span></div>
        </details>
      </div>
      <div id="cv2-feed" class="cv2-feed"><div class="cv2-empty">Loading student discussions…</div></div>
      <dialog class="cv2-dialog" id="cv2-compose-dialog">
        <form method="dialog" class="cv2-sheet" id="cv2-compose-form">
          <div class="cv2-sheet-head"><h3 id="cv2-compose-heading">Start a student post</h3><button class="cv2-close" id="cv2-compose-close" type="button" aria-label="Close">×</button></div>
          <div class="cv2-grid">
            <div class="cv2-field"><label>What are you trying to do?</label><div class="cv2-intent-grid" id="cv2-intents"><button type="button" data-intent="discussion"><strong>Discussion</strong><span>Start a conversation</span></button><button type="button" data-intent="confession"><strong>Confession</strong><span>Share anonymously</span></button><button type="button" data-intent="campus"><strong>Campus help</strong><span>Something on campus</span></button><button type="button" data-intent="exam"><strong>Exam survival</strong><span>Exam help</span></button><button type="button" data-intent="notes"><strong>Notes / resources</strong><span>Useful material</span></button><button type="button" data-intent="teammate"><strong>Project teammate</strong><span>Find collaborators</span></button><button type="button" data-intent="lost_found"><strong>Lost & found</strong><span>Return or find</span></button><button type="button" data-intent="opportunity"><strong>Opportunity</strong><span>Share an opportunity</span></button></div><input id="cv2-kind" type="hidden" value="discussion"></div>
            <div class="cv2-field"><label for="cv2-community">Community</label><input id="cv2-community" value="campus" maxlength="60"></div>
          </div>
          <div class="cv2-field"><label for="cv2-title">Title</label><input id="cv2-title" maxlength="180" placeholder="What do you want other students to know?" required></div>
          <div class="cv2-field"><label for="cv2-body">Details</label><textarea id="cv2-body" maxlength="4000" rows="5" placeholder="Give enough context to help someone respond." required></textarea></div>
          <div class="cv2-field" id="cv2-poll-fields" hidden><label for="cv2-options">Poll options</label><input id="cv2-options" placeholder="Option 1, Option 2, Option 3"></div>
          <label class="cv2-anon-toggle"><input id="cv2-anon" type="checkbox"><span>Post anonymously</span></label>
          <div class="cv2-actions-row"><span id="cv2-compose-status" class="cv2-note" aria-live="polite"></span><button class="cv2-post-btn" id="cv2-publish" type="button">Publish</button></div>
        </form>
      </dialog>
      <dialog class="cv2-dialog cv2-more-dialog" id="cv2-more-dialog">
        <div class="cv2-sheet">
          <div class="cv2-sheet-head"><h3>Post actions</h3><button class="cv2-close" id="cv2-more-close" type="button" aria-label="Close">×</button></div>
          <div class="cv2-field"><label for="cv2-report-reason">Why are you reporting this?</label><select id="cv2-report-reason"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misleading information</option><option value="unsafe">Unsafe content</option><option value="other">Other</option></select></div>
          <div class="cv2-actions-row"><button class="cv2-tool" id="cv2-more-report" type="button">Report</button><button class="cv2-tool" id="cv2-more-block" type="button">Block author</button></div>
          <p id="cv2-more-status" class="cv2-note" aria-live="polite"></p>
        </div>
      </dialog>
      <dialog class="cv2-dialog" id="cv2-filter-dialog">
        <div class="cv2-sheet">
          <div class="cv2-sheet-head"><h3>Filter community</h3><button class="cv2-close" id="cv2-filter-close" type="button">×</button></div>
          <div class="cv2-grid">
            <div class="cv2-field"><label for="cv2-kind-filter">Topic</label><select id="cv2-kind-filter">
              <option value="">Everything</option><option value="discussion">Discussions</option><option value="confession">Confessions</option><option value="campus">Campus</option><option value="exam">Exam survival</option><option value="senior">Senior → junior</option><option value="teammate">Find teammates</option><option value="notes">Notes / resources</option><option value="pyq">PYQ / exam material</option><option value="teacher">Teacher / elective advice</option><option value="lost_found">Lost & found</option><option value="ride">Ride sharing</option><option value="roommate">Room / roommate</option><option value="listing">Student exchange</option><option value="opportunity">Opportunity</option>
            </select></div>
            <div class="cv2-field"><label for="cv2-community-filter">Community</label><input id="cv2-community-filter" value="campus" maxlength="60"></div>
          </div>
          <div class="cv2-actions-row"><button class="cv2-tool" id="cv2-filter-clear" type="button">Clear</button><button class="cv2-post-btn" id="cv2-filter-apply" type="button">Apply filters</button></div>
        </div>
      </dialog>
    `;
    view.querySelector("#community-v2-mount")?.appendChild(root) || view.appendChild(root);

    const $=s=>root.querySelector(s);
    const intentButtons=[...root.querySelectorAll("[data-intent]")];
    intentButtons.forEach(btn=>btn.onclick=()=>{const kind=$("#cv2-kind");kind.value=btn.dataset.intent;intentButtons.forEach(x=>x.classList.toggle("active",x===btn));kind.dispatchEvent(new Event("change"))});
    intentButtons[0]?.classList.add("active");
    const tg=window.Telegram?.WebApp;
    const initData=tg?.initData||"";
    let sort="trending",kind="",personalized=false,community="campus",savedOnly=false,editingId=null,moderationItemId=null;

    async function api(path,options={}){
      const headers={"content-type":"application/json"};
      if(initData) headers["x-telegram-init-data"]=initData;
      const r=await fetch(path,{...options,headers:{...headers,...(options.headers||{})}});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.error||"request_failed");
      return d;
    }
    const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const pretty=s=>{try{return new Date(s).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}catch{return s}};

    async function loadFeed(){
      const feed=$("#cv2-feed");
      try{

        const params=new URLSearchParams({sort});
        if(kind) params.set("kind",kind);
        if(personalized) params.set("personalized","1");
        if(!savedOnly && community) params.set("community",community);
        if(savedOnly) params.set("saved","1");
        const q=$("#cv2-search").value.trim(); if(q) params.set("q",q);
        const data=await api("/api/community-v2/feed?"+params);
        const feed=$("#cv2-feed");
        if(!data.items?.length){feed.innerHTML='<div class="cv2-empty">Nothing here yet. Be the first student to start a conversation.</div>';return;}
        feed.innerHTML=data.items.map(item=>`
          <article class="cv2-item" data-id="${item.id}" data-following="${Number(item.following)?1:0}" data-saved="${Number(item.saved)?1:0}">
            <div class="cv2-meta"><div class="cv2-wrap"><span class="cv2-badge">${esc(item.kind.replaceAll("_"," "))}</span>${Number(item.anonymous)?'<span class="cv2-badge anon">Anonymous</span>':''}<span class="cv2-note">${esc(item.community_slug)}</span>${item.updated_at?'<span class="cv2-item-edited">Edited</span>':''}</div><span class="cv2-note">${pretty(item.created_at)}</span></div>
            <h3>${esc(item.title)}</h3><p class="cv2-body">${esc(item.body)}</p>
            <div class="cv2-note">By ${esc(item.author)} · ${item.replies} replies · ${item.upvotes} helpful</div>
            ${Number(item.poll_options)?'<button type="button" class="cv2-tool" data-action="poll">📊 Poll</button><div class="cv2-poll-options" hidden></div>':''}
            <div class="cv2-actions">
              <button type="button" class="cv2-tool ${Number(item.my_vote)===1?'active':''}" data-action="vote" data-value="1">▲ ${item.upvotes}</button>
              <button type="button" class="cv2-tool ${Number(item.my_vote)===-1?'active':''}" data-action="vote" data-value="-1">▼ ${item.downvotes}</button>
              <button type="button" class="cv2-tool" data-action="replies">💬 ${item.replies}</button>
              <button type="button" class="cv2-tool ${item.following?'active':''}" data-action="follow">${item.following?'Following':'Follow'}</button>
              <button type="button" class="cv2-tool ${item.saved?'active':''}" data-action="save">${item.saved?'Saved':'Save'}</button>
              ${item.mine?'<button type="button" class="cv2-tool" data-action="edit">Edit</button><button type="button" class="cv2-tool" data-action="delete">Delete</button>':''}
              ${item.mine?'':'<button type="button" class="cv2-tool" data-action="moderate">More</button>'}
            </div>
            <div class="cv2-replies" hidden></div>
          </article>`).join("");
      }catch{
        feed.innerHTML='<div class="cv2-empty">Community could not be loaded. <button class="cv2-tool" id="cv2-feed-retry" type="button">Retry</button></div>';
        $("#cv2-feed-retry").onclick=loadFeed;
      }
    }
    async function loadCommunities(){
      let contextCommunity="campus";
      try{
        const context=await api("/api/community-v2/context");
        contextCommunity=context.community||"campus";
      }catch{
        contextCommunity="campus";
      }
      community=contextCommunity;
      $("#cv2-community").value=community;
      $("#cv2-community-filter").value=community;
      $("#cv2-current-community").textContent=community==="campus"?"VGU campus":community;
      try{
        const data=await api("/api/community-v2/communities");
        const names=["campus",contextCommunity,...(data.communities||[]).map(x=>x.community_slug)].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,16);
        $("#cv2-communities").innerHTML=names.map(n=>`<button type="button" class="cv2-community-chip" data-community="${esc(n)}">${esc(n)}</button>`).join("");
      }catch{
        $("#cv2-communities").innerHTML='<span class="cv2-note">Communities will appear when student activity is available.</span>';
      }
    }

    function syncTabs(){
      root.querySelectorAll(".cv2-tab").forEach(x=>x.classList.toggle("active",x.dataset.special==="saved"?savedOnly:((x.dataset.sort===sort&&kind==="")||(x.dataset.kind===kind&&kind!==""))));
    }

    $("#cv2-search-btn").onclick=loadFeed;
    $("#cv2-search").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();loadFeed()}};
    $("#cv2-personalize").onclick=async()=>{personalized=!personalized;$("#cv2-personalize").textContent=personalized?"For you":"For me";await loadFeed()};
    $("#cv2-current-community").onclick=()=>{$("#cv2-filter-dialog").showModal()};
    $("#cv2-people").onclick=()=>document.querySelector("[data-view=\"people\"]")?.click();
    $("#cv2-filter-open").onclick=()=>{$("#cv2-kind-filter").value=kind;$("#cv2-community-filter").value=community;$("#cv2-filter-dialog").showModal()};
    $("#cv2-filter-close").onclick=()=>$("#cv2-filter-dialog").close();
    $("#cv2-filter-clear").onclick=()=>{$("#cv2-kind-filter").value="";$("#cv2-community-filter").value="campus"};
    $("#cv2-filter-apply").onclick=async()=>{kind=$("#cv2-kind-filter").value;community=$("#cv2-community-filter").value.trim()||"campus";$("#cv2-current-community").textContent=community==="campus"?"VGU campus":community;$("#cv2-filter-dialog").close();syncTabs();await loadFeed()};
    $("#cv2-compose-open").onclick=()=>{editingId=null;$("#cv2-compose-heading").textContent="Start a student post";$("#cv2-publish").textContent="Publish";$("#cv2-compose-status").textContent="";const dialog=$("#cv2-compose-dialog");if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute("open","");$("#cv2-title").focus()};
    $("#cv2-compose-close").onclick=()=>{$("#cv2-compose-dialog")?.close?.()};
    $("#cv2-kind").onchange=e=>{$("#cv2-anon").checked=e.target.value==="confession";$("#cv2-poll-fields").hidden=e.target.value!=="discussion"};
    $("#cv2-publish").onclick=async()=>{
      const status=$("#cv2-compose-status"),button=$("#cv2-publish");
      try{
        button.disabled=true;status.textContent=editingId?"Saving…":"Publishing…";
        const postKind=$("#cv2-kind").value,options=$("#cv2-options").value.split(",").map(x=>x.trim()).filter(Boolean);
        if(!$("#cv2-title").value.trim()||!$("#cv2-body").value.trim()) throw new Error("invalid_item");
        if(editingId) await api("/api/community-v2/items",{method:"PATCH",body:JSON.stringify({item_id:editingId,title:$("#cv2-title").value,body:$("#cv2-body").value})});
        else if(postKind==="discussion"&&options.length>=2) await api("/api/community-v2/polls",{method:"POST",body:JSON.stringify({kind:postKind,title:$("#cv2-title").value,body:$("#cv2-body").value,community_slug:$("#cv2-community").value,anonymous:$("#cv2-anon").checked,options})});
        else await api("/api/community-v2/items",{method:"POST",body:JSON.stringify({kind:postKind,title:$("#cv2-title").value,body:$("#cv2-body").value,community_slug:$("#cv2-community").value,anonymous:$("#cv2-anon").checked})});
        $("#cv2-title").value="";$("#cv2-body").value="";$("#cv2-options").value="";status.textContent=editingId?"Saved.":"Published.";editingId=null;$("#cv2-compose-heading").textContent="Start a student post";$("#cv2-publish").textContent="Publish";$("#cv2-compose-dialog").close();await loadFeed();
      }catch(e){
        const messages={unsafe_content:"That content needs editing before it can be published.",invalid_item:"Add a title and a little more detail.",invalid_poll:"A poll needs at least two options.",rate_limited:"You have posted a lot recently. Try again later.",unauthorized:"Open Pulse from Telegram to post.",forbidden:"You can only edit your own post.",item_not_found:"That post is no longer available."};
        status.textContent=messages[e.message]||"Could not save this post. Please try again.";
      }finally{button.disabled=false}
    };
    root.querySelectorAll(".cv2-tab").forEach(tab=>tab.onclick=async()=>{
      if(tab.dataset.special==="saved"){savedOnly=true;sort="new";kind="";personalized=false;syncTabs();await loadFeed();return}
      savedOnly=false;sort=tab.dataset.sort||"new";kind=tab.dataset.kind||"";syncTabs();await loadFeed()
    });

    root.addEventListener("click",async e=>{
      const chip=e.target.closest("[data-community]");
      if(chip){community=chip.dataset.community;$("#cv2-current-community").textContent=community==="campus"?"VGU campus":community;$("#cv2-community").value=community;$("#cv2-communities").closest("details")?.removeAttribute("open");await loadFeed();return}
      const button=e.target.closest("button[data-action]"),item=e.target.closest(".cv2-item");
      const replyDelete=e.target.closest("[data-reply-delete]");
      if(replyDelete){try{
        if(replyDelete.dataset.confirming!=="1"){replyDelete.dataset.confirming="1";replyDelete.textContent="Confirm delete";return}
        replyDelete.disabled=true;await api("/api/community-v2/replies?reply_id="+encodeURIComponent(replyDelete.dataset.replyDelete),{method:"DELETE"});
        await loadFeed();
      }catch{replyDelete.disabled=false;replyDelete.textContent="Try again"}return}
      const replyReport=e.target.closest("[data-reply-report]");
      if(replyReport){try{await api("/api/community-v2/report-reply",{method:"POST",body:JSON.stringify({reply_id:Number(replyReport.dataset.replyReport)})});replyReport.textContent="Reported"}catch{replyReport.textContent="Try again"}return}
      if(!button||!item)return;
      const id=Number(item.dataset.id),action=button.dataset.action;
      try{
        if(action==="vote")await api("/api/community-v2/vote",{method:"POST",body:JSON.stringify({item_id:id,vote:Number(button.dataset.value)})});
        if(action==="follow"){
          const following=item.dataset.following==="1";
          await api("/api/community-v2/follow"+(following?"?item_id="+encodeURIComponent(id):""),following?{method:"DELETE"}:{method:"POST",body:JSON.stringify({item_id:id})});
        }
        if(action==="save"){
          const saved=item.dataset.saved==="1";
          await api("/api/community-v2/save"+(saved?"?item_id="+encodeURIComponent(id):""),saved?{method:"DELETE"}:{method:"POST",body:JSON.stringify({item_id:id})});
        }
        if(action==="edit"){
          const data=await api("/api/community-v2/items?item_id="+encodeURIComponent(id));
          const current=data.item;
          if(!current)throw new Error("item_not_found");
          editingId=id;$("#cv2-compose-heading").textContent="Edit your post";$("#cv2-publish").textContent="Save changes";$("#cv2-title").value=current.title;$("#cv2-body").value=current.body;$("#cv2-kind").value=current.kind;$("#cv2-community").value=current.community_slug;$("#cv2-anon").checked=Boolean(current.anonymous);$("#cv2-options").value="";$("#cv2-compose-status").textContent="";$("#cv2-compose-dialog").showModal();return;
        }
        if(action==="delete"){
          if(button.dataset.confirming!=="1"){button.dataset.confirming="1";button.textContent="Confirm delete";return}
          button.disabled=true;await api("/api/community-v2/items?item_id="+encodeURIComponent(id),{method:"DELETE"});
        }
        if(action==="moderate"){moderationItemId=id;$("#cv2-more-status").textContent="";$("#cv2-report-reason").value="spam";$("#cv2-more-dialog").showModal();return}
        if(action==="poll"){
          const box=item.querySelector(".cv2-poll-options");
          if(!box.hidden){box.hidden=true;return}
          const d=await api("/api/community-v2/poll?item_id="+id);
          box.innerHTML=(d.options||[]).map(o=>`<button type="button" class="cv2-poll-option" data-option-id="${o.id}">${esc(o.label)} <span class="cv2-note">· ${o.votes} votes</span></button>`).join("")||'<span class="cv2-note">Poll unavailable.</span>';
          box.querySelectorAll("[data-option-id]").forEach(option=>option.onclick=async()=>{await api("/api/community-v2/poll-vote",{method:"POST",body:JSON.stringify({item_id:id,option_id:Number(option.dataset.optionId)})});box.hidden=true;await loadFeed()});
          box.hidden=false;return;
        }
        if(action==="replies"){
          const box=item.querySelector(".cv2-replies");if(!box.hidden){box.hidden=true;return}
          const d=await api("/api/community-v2/replies?item_id="+id);
          box.innerHTML=(d.replies||[]).map(r=>`<div class="cv2-reply"><strong>${esc(r.author)}</strong><div>${esc(r.body)}</div><span class="cv2-note">${pretty(r.created_at)}</span> ${r.mine?'<button class="cv2-tool" data-reply-delete="'+r.id+'" type="button">Delete</button>':'<button class="cv2-tool" data-reply-report="'+r.id+'" type="button">Report</button>'}</div>`).join("")||'<span class="cv2-note">No replies yet.</span>';
          box.insertAdjacentHTML("beforeend",`<div class="cv2-reply-compose"><textarea class="cv2-reply-input" placeholder="Reply to this discussion…"></textarea><button class="cv2-post-btn cv2-reply-send" type="button">Reply</button></div>`);
          box.hidden=false;
          box.querySelector(".cv2-reply-send").onclick=async()=>{const input=box.querySelector(".cv2-reply-input");await api("/api/community-v2/replies",{method:"POST",body:JSON.stringify({item_id:id,body:input.value,anonymous:false})});await loadFeed()};
          return;
        }
        await loadFeed();
      }catch{button.textContent="Try again"}
    });

    $("#cv2-more-close").onclick=()=>$("#cv2-more-dialog")?.close?.();
    $("#cv2-more-report").onclick=async()=>{if(!moderationItemId)return;try{await api("/api/community-v2/report",{method:"POST",body:JSON.stringify({item_id:moderationItemId,reason:$("#cv2-report-reason").value})});$("#cv2-more-status").textContent="Reported. Thank you.";setTimeout(()=>$("#cv2-more-dialog")?.close?.(),500)}catch(e){$("#cv2-more-status").textContent=e.message==="cannot_report_own_item"?"You cannot report your own post.":"Could not report this post."}};
    $("#cv2-more-block").onclick=async()=>{if(!moderationItemId)return;try{await api("/api/community-v2/block",{method:"POST",body:JSON.stringify({item_id:moderationItemId}));$("#cv2-more-status").textContent="Author blocked.";setTimeout(async()=>{$("#cv2-more-dialog")?.close?.();await loadFeed()},500)}catch{$("#cv2-more-status").textContent="Could not block this author."}};
    const askView=document.querySelector('[data-view-panel="ask"]'),askQuestion=document.querySelector("#search-query");
    if(askView&&askQuestion){
      const bridge=document.createElement("div");bridge.className="cv2-ask-bridge";
      bridge.innerHTML='<button type="button" class="cv2-tool" data-ask-action="start">Ask students →</button><button type="button" class="cv2-tool" data-ask-action="related">Related discussions →</button>';
      bridge.querySelector('[data-ask-action="start"]').onclick=()=>{const title=askQuestion.value.trim();document.querySelector('[data-view="community"]')?.click();setTimeout(()=>{const dialog=$("#cv2-compose-dialog");if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute("open","");$("#cv2-kind").value="discussion";$("#cv2-title").value=title.slice(0,180);$("#cv2-body").value="";$("#cv2-title").focus()},80)};
      bridge.querySelector('[data-ask-action="related"]').onclick=async()=>{const q=askQuestion.value.trim();document.querySelector('[data-view="community"]')?.click();setTimeout(async()=>{$("#cv2-search").value=q;sort="trending";kind="";syncTabs();await loadFeed()},80)};
      askQuestion.parentElement?.appendChild(bridge);
    }

    window.__pulseCommunitySaved=async()=>{savedOnly=true;sort="new";kind="";personalized=false;$("#cv2-search").value="";syncTabs();await loadFeed()};
    window.__pulseCommunityAll=async()=>{savedOnly=false;sort="trending";kind="";personalized=false;syncTabs();await loadFeed()};
    loadCommunities();
    loadFeed().catch(()=>{$("#cv2-feed").innerHTML='<div class="cv2-empty">Community is temporarily unavailable. Try again in a moment.</div>'});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();