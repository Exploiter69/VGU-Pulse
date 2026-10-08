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
      .cv2-icon-btn,.cv2-filter-btn{min-height:44px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:11px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}
      .cv2-post-btn{min-height:44px;border:0;background:var(--accent);color:var(--accent-ink);border-radius:11px;padding:8px 14px;font:inherit;font-weight:800;cursor:pointer;white-space:nowrap}
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
      .cv2-item{padding:14px 0;border-bottom:1px solid var(--border);min-width:0}
      .cv2-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .cv2-title-link{display:block;width:100%;padding:0;border:0;background:transparent;color:var(--text);text-align:left;font:inherit;cursor:pointer}
      .cv2-title-link:hover{text-decoration:underline;text-underline-offset:3px}
      .cv2-title-link:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
      .cv2-wrap{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      .cv2-badge{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:4px 8px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      .cv2-badge.anon{color:var(--warning);border-color:rgba(240,197,111,.25)}
      .cv2-item h3{font-size:17px;margin:7px 0 5px}
      .cv2-body{white-space:pre-wrap;margin:0;overflow-wrap:anywhere;line-height:1.5}.cv2-body.cv2-collapsed{display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical;overflow:hidden;max-height:10.5em}.cv2-more-text{margin-top:5px}
      .cv2-note{color:var(--muted);font-size:12px}
      .cv2-actions{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:10px}
      .cv2-tool{min-height:44px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:10px;padding:7px 10px;font:inherit;font-size:12px;font-weight:650;cursor:pointer}
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
      .cv2-community-chip{flex:0 0 auto;min-height:44px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:999px;padding:7px 10px;font:inherit;cursor:pointer}
      .cv2-anon-toggle{display:inline-flex;align-items:center;gap:7px;min-height:44px;margin-top:9px;color:var(--muted);font-size:12px;font-weight:700}.cv2-anon-toggle input{width:16px;height:16px;margin:0}.cv2-ask-bridge{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.cv2-intent-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px}.cv2-intent-grid button{min-height:68px;text-align:left;border:1px solid var(--border);background:var(--surface-2);border-radius:12px;padding:10px;color:var(--text);cursor:pointer}.cv2-intent-grid button strong{display:block;font-size:12px}.cv2-intent-grid button span{display:block;color:var(--muted);font-size:10px;line-height:1.35;margin-top:3px}.cv2-intent-grid button.active{border-color:var(--accent);background:rgba(138,180,255,.08);box-shadow:inset 0 0 0 1px rgba(138,180,255,.15)}.cv2-intent-secondary{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cv2-intent-secondary[hidden]{display:none}@media(max-width:620px){.cv2-intent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cv2-intent-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}}
      .cv2-ask-bridge button{min-height:44px}.cv2-pulse-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}.cv2-pulse-card{position:relative;min-height:88px;padding:12px 34px 12px 12px;border:1px solid var(--border);background:var(--surface-2);border-radius:13px}.cv2-pulse-card strong{display:block;font-size:12px}.cv2-pulse-card p{margin:4px 0 0;color:var(--muted);font-size:11px;line-height:1.4}.cv2-pulse-dismiss{position:absolute;top:5px;right:5px;width:32px;height:32px;border:0;background:transparent;color:var(--muted);border-radius:8px;cursor:pointer}.cv2-kind-confession{background:linear-gradient(90deg,rgba(241,199,109,.07),transparent 55%)}.cv2-kind-exam{background:linear-gradient(90deg,rgba(138,180,255,.07),transparent 55%)}.cv2-solved{color:var(--success);border-color:rgba(120,214,165,.24);background:rgba(120,214,165,.07)}.cv2-badge.rep{color:var(--accent);border-color:rgba(138,180,255,.22);background:rgba(138,180,255,.06)}.cv2-accepted{color:var(--success);font-weight:800}.cv2-answer-now{color:var(--accent);border-color:rgba(138,180,255,.3);background:rgba(138,180,255,.06)}.cv2-empty-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-top:10px}.cv2-intent-more{grid-column:1/-1;min-height:44px!important}.cv2-intent-secondary[hidden]{display:none}@media(max-width:620px){.cv2-pulse-strip{grid-template-columns:1fr;gap:6px}}
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
          <button type="button" class="cv2-tab active" data-sort="for_you" role="tab" aria-selected="true">For You</button>
          <button type="button" class="cv2-tab" role="tab" aria-selected="false" data-sort="trending">Trending</button>
          <button type="button" class="cv2-tab" role="tab" aria-selected="false" data-sort="new">Latest</button>
          <button type="button" class="cv2-tab" role="tab" aria-selected="false" data-kind="confession">Confessions</button>
          <button type="button" class="cv2-tab" role="tab" aria-selected="false" data-kind="campus">Campus</button>
          <button type="button" class="cv2-tab" role="tab" aria-selected="false" data-kind="exam">Exam survival</button>
          <button type="button" class="cv2-tab" role="tab" aria-selected="false" data-special="saved">Saved</button>
        </div>
        <div class="cv2-context">
          <span class="cv2-context-label">Showing</span>
          <button class="cv2-community" id="cv2-current-community" type="button">For you</button>
          <button class="cv2-tool" id="cv2-personalize" type="button">Personalized</button><button class="cv2-tool" id="cv2-people" type="button">Find people</button>
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
            <div class="cv2-field"><label>What are you trying to do?</label><div class="cv2-intent-grid" id="cv2-intents"><button type="button" data-intent="discussion"><strong>Discussion</strong><span>Start a conversation</span></button><button type="button" data-intent="question"><strong>Question</strong><span>Get student answers</span></button><button type="button" data-intent="confession"><strong>Confession</strong><span>Share anonymously</span></button><button type="button" data-intent="campus"><strong>Campus help</strong><span>Something on campus</span></button><button type="button" data-intent="exam"><strong>Exam survival</strong><span>Exam help</span></button><button type="button" data-intent="senior"><strong>Senior advice</strong><span>Ask upper years</span></button><button type="button" data-intent="notes"><strong>Notes / resources</strong><span>Useful material</span></button><button type="button" class="cv2-intent-more" id="cv2-intent-more"><strong>More…</strong><span>PYQs, teammates, listings & more</span></button><div class="cv2-intent-secondary" id="cv2-intent-secondary" hidden><button type="button" data-intent="pyq"><strong>PYQ / exam material</strong><span>Find past papers</span></button><button type="button" data-intent="teacher"><strong>Teacher / elective</strong><span>Compare experiences</span></button><button type="button" data-intent="teammate"><strong>Project teammate</strong><span>Find collaborators</span></button><button type="button" data-intent="lost_found"><strong>Lost & found</strong><span>Return or find</span></button><button type="button" data-intent="ride"><strong>Ride sharing</strong><span>Find a ride</span></button><button type="button" data-intent="roommate"><strong>Room / roommate</strong><span>Find housing help</span></button><button type="button" data-intent="listing"><strong>Student exchange</strong><span>Buy, sell or exchange</span></button><button type="button" data-intent="opportunity"><strong>Opportunity</strong><span>Share an opportunity</span></button></div></div><input id="cv2-kind" type="hidden" value="discussion"></div>
            <div class="cv2-field"><label for="cv2-community">Community</label><input id="cv2-community" list="cv2-community-options" value="campus" maxlength="60" autocomplete="off"><datalist id="cv2-community-options"></datalist></div>
          </div>
          <div class="cv2-field"><label for="cv2-title">Title</label><input id="cv2-title" maxlength="180" placeholder="What do you want other students to know?" required></div>
          <div class="cv2-field"><label for="cv2-body">Details</label><textarea id="cv2-body" maxlength="4000" rows="5" placeholder="Give enough context to help someone respond." required></textarea></div>
          <div class="cv2-field" id="cv2-poll-fields" hidden><label for="cv2-options">Poll options</label><input id="cv2-options" placeholder="One option per line"></div>
          <label class="cv2-anon-toggle"><input id="cv2-anon" type="checkbox"><span>Post anonymously</span></label>
          <div class="cv2-actions-row"><span id="cv2-compose-status" class="cv2-note" aria-live="polite"></span><button class="cv2-post-btn" id="cv2-publish" type="button">Publish</button></div>
        </form>
      </dialog>
      <dialog class="cv2-dialog" id="cv2-rules-dialog">
        <div class="cv2-sheet">
          <div class="cv2-sheet-head"><h3>Community rules</h3><button class="cv2-close" id="cv2-rules-close" type="button" aria-label="Close">×</button></div>
          <div id="cv2-rules-copy" class="cv2-note">Loading rules…</div>
          <div class="cv2-actions-row"><button class="cv2-tool" id="cv2-rules-ack" type="button">I understand</button></div>
        </div>
      </dialog>
      <dialog class="cv2-dialog" id="cv2-anon-notice-dialog">
        <div class="cv2-sheet">
          <div class="cv2-sheet-head"><h3>Before you post anonymously</h3><button class="cv2-close" id="cv2-anon-notice-close" type="button" aria-label="Close">×</button></div>
          <p class="cv2-note">Anonymous to students, still tied to your account on our server; admins may review reports.</p>
          <div class="cv2-actions-row"><button class="cv2-tool" id="cv2-anon-notice-ack" type="button">I understand</button></div>
        </div>
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
            <div class="cv2-field"><label for="cv2-community-filter">Community</label><input id="cv2-community-filter" value="campus" maxlength="60"></div><div class="cv2-field"><label for="cv2-solved-filter">Q&A status</label><select id="cv2-solved-filter"><option value="">All</option><option value="unanswered">Unanswered</option><option value="solved">Solved</option></select></div><div class="cv2-field"><label for="cv2-branch-filter">Branch</label><select id="cv2-branch-filter"><option value="">All branches</option><option>CSE</option><option>Computer Science & Engineering</option><option>CSE — Artificial Intelligence</option><option>CSE — Artificial Intelligence & Machine Learning</option><option>CSE — Cloud Computing</option><option>CSE — IoT & Cyber Security</option><option>Artificial Intelligence & Data Science</option><option>Mechanical Engineering</option><option>Civil Engineering</option><option>Electrical Engineering</option><option>Other</option></select></div><div class="cv2-field"><label for="cv2-year-filter">Year</label><select id="cv2-year-filter"><option value="">All years</option><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option><option value="6">6th</option></select></div>
          </div>
          <div class="cv2-actions-row"><button class="cv2-tool" id="cv2-filter-clear" type="button">Clear</button><button class="cv2-post-btn" id="cv2-filter-apply" type="button">Apply filters</button></div>
        </div>
      </dialog>
    `;
    view.querySelector("#community-v2-mount")?.appendChild(root) || view.appendChild(root);

    const $=s=>root.querySelector(s);
    const tg=window.Telegram?.WebApp;
    const initData=tg?.initData||"";
    const haptic=type=>{try{tg?.HapticFeedback?.impactOccurred?.(type||"light")}catch{}};
    const intentButtons=[...root.querySelectorAll("[data-intent]")];
    intentButtons.forEach(btn=>btn.onclick=()=>{const kind=$("#cv2-kind");kind.value=btn.dataset.intent==="question"?"discussion":btn.dataset.intent;intentButtons.forEach(x=>x.classList.toggle("active",x===btn));kind.dispatchEvent(new Event("change"));haptic("light")});
    $("#cv2-intent-more").onclick=()=>{const box=$("#cv2-intent-secondary"),more=$("#cv2-intent-more"),open=box.hidden;box.hidden=!open;more.querySelector("strong").textContent=open?"Less":"More…";haptic("light")};
    let sort="for_you",kind="",personalized=true,community="",savedOnly=false,solvedFilter="",branchFilter="",yearFilter="",editingId=null,moderationItemId=null;

    async function api(path,options={}){
      const headers={"content-type":"application/json"};
      if(initData) headers["x-telegram-init-data"]=initData;
      const r=await fetch(path,{...options,headers:{...headers,...(options.headers||{})}});
      const d=await r.json().catch(()=>({}));
      if(r.status===401) throw new Error("reopen_telegram");
      if(!r.ok) throw new Error(d.error||"request_failed");
      return d;
    }
    const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const parsePulseDate=s=>{const raw=String(s??"");if(!raw)return new Date(NaN);return new Date(/^\d{4}-\d{2}-\d{2}T/.test(raw)&&!/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)?raw+"Z":raw)};const pretty=s=>{try{const d=parsePulseDate(s);return Number.isFinite(d.getTime())?d.toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}):String(s??"")}catch{return String(s??"")}};

    let feedCursor=null;
    async function loadFeed({append=false}={}){
      const feed=$("#cv2-feed");
      try{
        if(!append)feedCursor=null;const params=new URLSearchParams({sort,limit:"40"});if(append&&feedCursor)params.set("cursor",feedCursor);
        if(kind)params.set("kind",kind);
        if(personalized||sort==="for_you")params.set("personalized","1");
        if(!savedOnly&&community)params.set("community",community);
        if(savedOnly)params.set("saved","1");if(solvedFilter)params.set("solved",solvedFilter);if(branchFilter)params.set("branch",branchFilter);if(yearFilter)params.set("year",yearFilter);
        const q=$("#cv2-search").value.trim();if(q)params.set("q",q);
        const data=await api("/api/community-v2/feed?"+params);
        if(!append)feed.replaceChildren();
        const items=data.items||[];
        if(!items.length&&!append){feed.innerHTML='<div class="cv2-empty"><strong>No strong signal here yet.</strong><p>Start with something students can answer, rate, or improve today.</p><div class="cv2-empty-actions"><button type="button" class="cv2-tool" data-prefill-intent="question">Ask your batch</button><button type="button" class="cv2-tool" data-prefill-intent="exam">Share an exam tip</button><button type="button" class="cv2-tool" data-prefill-intent="campus">Rate something on campus</button></div></div>';return}
        const html=items.map(item=>`
          <article class="cv2-item ${item.kind==="confession"?"cv2-kind-confession":item.kind==="exam"?"cv2-kind-exam":""}" data-id="${item.id}" data-my-vote="${Number(item.my_vote)||0}" data-anonymous="${Number(item.anonymous)||0}" data-following="${Number(item.following)?1:0}" data-saved="${Number(item.saved)?1:0}" data-solved="${Number(item.solved)?1:0}" data-accepted-reply="${Number(item.accepted_reply_id)||0}">
            <div class="cv2-meta"><div class="cv2-wrap"><span class="cv2-badge">${esc(item.kind.replaceAll("_"," "))}</span>${Number(item.anonymous)?'<span class="cv2-badge anon">Anonymous</span>':(item.author_badge?'<span class="cv2-badge rep">'+esc(item.author_badge)+'</span>':'')}${Number(item.solved)?'<span class="cv2-badge cv2-solved">Solved · accepted</span>':(!Number(item.replies)&&item.kind==="discussion"&&!item.mine?'<span class="cv2-badge">Needs an answer</span>':'')}<span class="cv2-note">${esc(item.community_slug)}</span>${item.updated_at?'<span class="cv2-item-edited">Edited</span>':''}</div><span class="cv2-note">${pretty(item.created_at)}</span></div>
            <button type="button" class="cv2-title-link" data-action="expand" aria-label="Open full post"><h3>${esc(item.title)}</h3></button><p class="cv2-body ${String(item.body||"").length>240?"cv2-collapsed":""}">${esc(String(item.body||"").replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,"\n\n").trim())}</p>${String(item.body||"").length>240?'<button type="button" class="cv2-tool cv2-more-text" data-action="expand">Read full post</button>':""}
            <div class="cv2-note">By ${esc(item.author)} · ${item.replies} replies · ${item.upvotes} helpful</div>${!Number(item.replies)&&item.kind==="discussion"&&!item.mine&&!Number(item.solved)?'<button type="button" class="cv2-tool cv2-answer-now" data-action="answer">Answer this →</button>':""}
            ${Number(item.poll_options)?'<button type="button" class="cv2-tool" data-action="poll">📊 Poll</button><div class="cv2-poll-options" hidden></div>':''}
            <div class="cv2-actions">
              <button type="button" class="cv2-tool ${Number(item.my_vote)===1?'active':''}" data-action="vote" data-value="1">▲ ${item.upvotes}</button>
              <button type="button" class="cv2-tool ${Number(item.my_vote)===-1?'active':''}" data-action="vote" data-value="-1">▼ ${item.downvotes}</button>
              <button type="button" class="cv2-tool" data-action="replies">💬 ${item.replies}</button>
              <button type="button" class="cv2-tool ${item.following?'active':''}" data-action="follow">${item.following?'Following':'Follow'}</button>
              <button type="button" class="cv2-tool ${item.saved?'active':''}" data-action="save">${item.saved?'Saved':'Save'}</button><button type="button" class="cv2-tool" data-action="share">Share</button>
              ${item.mine?'<button type="button" class="cv2-tool" data-action="edit">Edit</button><button type="button" class="cv2-tool" data-action="delete">Delete</button>':'<button type="button" class="cv2-tool" data-action="moderate">More</button>'}
            </div>
            <div class="cv2-replies" hidden></div>
          </article>`).join("");
        feed.insertAdjacentHTML("beforeend",html);
        feed.querySelector("#cv2-load-more-wrap")?.remove();
        feedCursor=data.next_cursor||null;
        if(feedCursor){
          feed.insertAdjacentHTML("beforeend",'<div id="cv2-load-more-wrap" style="padding:14px 0;text-align:center"><button type="button" class="cv2-tool" id="cv2-load-more">Load more discussions</button></div>');
          $("#cv2-load-more").onclick=async()=>{const b=$("#cv2-load-more");b.disabled=true;b.textContent="Loading…";try{await loadFeed({append:true})}catch{b.disabled=false;b.textContent="Try again"}};
        }
      }catch(error){
        if(!append){
          const message=error?.message==="reopen_telegram"?"Reopen Pulse from Telegram to continue.":"Community could not be loaded.";
          feed.innerHTML='<div class="cv2-empty">'+esc(message)+(error?.message==="reopen_telegram"?'':' <button class="cv2-tool" id="cv2-feed-retry" type="button">Retry</button>')+'</div>';
          if(error?.message!=="reopen_telegram") $("#cv2-feed-retry").onclick=loadFeed;
        } else throw error;
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
      if(sort!=="for_you"){community=contextCommunity;$("#cv2-community").value=community;$("#cv2-community-filter").value=community;$("#cv2-current-community").textContent=community==="campus"?"VGU campus":community;}
      else {community="";$("#cv2-community").value="";$("#cv2-community-filter").value="";$("#cv2-current-community").textContent="For you";}
      try{
        const data=await api("/api/community-v2/communities");
        const names=["campus",contextCommunity,...(data.communities||[]).map(x=>x.slug)].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,16);
        $("#cv2-communities").innerHTML=names.map(n=>`<button type="button" class="cv2-community-chip" data-community="${esc(n)}">${esc(n)}</button>`).join("");const list=$("#cv2-community-options");if(list)list.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join("");
      }catch{
        $("#cv2-communities").innerHTML='<span class="cv2-note">Communities will appear when student activity is available.</span>';
      }
    }

    function syncTabs(){
      root.querySelectorAll(".cv2-tab").forEach(x=>{
        const active=Boolean(savedOnly
          ? x.dataset.special==="saved"
          : x.dataset.special!=="saved" && ((x.dataset.sort===sort&&kind==="")||(x.dataset.kind===kind&&kind!=="")));
        x.classList.toggle("active",active);
        x.setAttribute("aria-selected",active?"true":"false");
      });
    }

    $("#cv2-search-btn").onclick=loadFeed;
    $("#cv2-search").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();loadFeed()}};
    $("#cv2-personalize").onclick=async()=>{personalized=true;sort="for_you";kind="";savedOnly=false;community="";syncTabs();$("#cv2-current-community").textContent="For you";$("#cv2-personalize").textContent="Personalized";haptic("light");await loadFeed()};
    $("#cv2-current-community").onclick=()=>{$("#cv2-filter-dialog").showModal()};
    $("#cv2-people").onclick=()=>document.querySelector("[data-view=\"people\"]")?.click();
    $("#cv2-filter-open").onclick=()=>{$("#cv2-kind-filter").value=kind;$("#cv2-community-filter").value=community;$("#cv2-solved-filter").value=solvedFilter;$("#cv2-branch-filter").value=branchFilter;$("#cv2-year-filter").value=yearFilter;$("#cv2-filter-dialog").showModal()};
    $("#cv2-filter-close").onclick=()=>$("#cv2-filter-dialog").close();
    $("#cv2-filter-clear").onclick=()=>{$("#cv2-kind-filter").value="";$("#cv2-community-filter").value="campus";$("#cv2-solved-filter").value="";$("#cv2-branch-filter").value="";$("#cv2-year-filter").value=""};
    $("#cv2-filter-apply").onclick=async()=>{kind=$("#cv2-kind-filter").value;community=$("#cv2-community-filter").value.trim()||"campus";solvedFilter=$("#cv2-solved-filter").value;branchFilter=$("#cv2-branch-filter").value;yearFilter=$("#cv2-year-filter").value;$("#cv2-current-community").textContent=community==="campus"?"VGU campus":community;$("#cv2-filter-dialog").close();syncTabs();await loadFeed()};
    $("#cv2-compose-open").onclick=async()=>{
      try{
        const ack=await api("/api/community-v2/rules/ack");
        if(!ack.acknowledged){const rules=await api("/api/community-v2/rules");$("#cv2-rules-copy").innerHTML=(rules.rules||[]).map(x=>"<p>• "+esc(x)+"</p>").join("");$("#cv2-rules-dialog").showModal?.();return;}
      }catch(e){$("#cv2-compose-status").textContent=e.message==="reopen_telegram"?"Reopen Pulse from Telegram.":"Could not load community rules.";return;}
      editingId=null;$("#cv2-compose-heading").textContent="Start a student post";$("#cv2-publish").textContent="Publish";$("#cv2-compose-status").textContent="";const dialog=$("#cv2-compose-dialog");if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute("open","");$("#cv2-title").focus();
    };
    $("#cv2-rules-close").onclick=()=>$("#cv2-rules-dialog")?.close?.();
    $("#cv2-rules-ack").onclick=async()=>{try{await api("/api/community-v2/rules/ack",{method:"POST",body:"{}"});$("#cv2-rules-dialog")?.close?.();$("#cv2-compose-open").click()}catch(e){$("#cv2-rules-copy").textContent=e.message==="reopen_telegram"?"Reopen Pulse from Telegram.":"Could not save your acknowledgement."}};
    $("#cv2-anon-notice-close").onclick=()=>$("#cv2-anon-notice-dialog")?.close?.();
    $("#cv2-anon-notice-ack").onclick=async()=>{try{await api("/api/community-v2/anonymous-notice",{method:"POST",body:"{}"});$("#cv2-anon-notice-dialog")?.close?.();$("#cv2-publish").click()}catch(e){$("#cv2-compose-status").textContent=e.message==="reopen_telegram"?"Reopen Pulse from Telegram.":"Could not save the anonymous notice."}};
    $("#cv2-compose-close").onclick=()=>{$("#cv2-compose-dialog")?.close?.()};
    $("#cv2-kind").onchange=e=>{$("#cv2-anon").checked=e.target.value==="confession";$("#cv2-poll-fields").hidden=e.target.value!=="discussion"};
    $("#cv2-publish").onclick=async()=>{
      const status=$("#cv2-compose-status"),button=$("#cv2-publish");
      try{
        button.disabled=true;status.textContent=editingId?"Saving…":"Publishing…";
        const postKind=$("#cv2-kind").value,options=$("#cv2-options").value.split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
        if(!editingId && $("#cv2-anon").checked){
          const notice=await api("/api/community-v2/anonymous-notice");
          if(!notice.acknowledged){button.disabled=false;status.textContent="";$("#cv2-anon-notice-dialog")?.showModal?.();return;}
        }
        if(!$("#cv2-title").value.trim()||!$("#cv2-body").value.trim()) throw new Error("invalid_item");
        if(editingId) await api("/api/community-v2/items",{method:"PATCH",body:JSON.stringify({item_id:editingId,title:$("#cv2-title").value,body:$("#cv2-body").value})});
        else if(postKind==="discussion"&&options.length>=2) await api("/api/community-v2/polls",{method:"POST",body:JSON.stringify({kind:postKind,title:$("#cv2-title").value,body:$("#cv2-body").value,community_slug:$("#cv2-community").value,anonymous:$("#cv2-anon").checked,options})});
        else await api("/api/community-v2/items",{method:"POST",body:JSON.stringify({kind:postKind,title:$("#cv2-title").value,body:$("#cv2-body").value,community_slug:$("#cv2-community").value,anonymous:$("#cv2-anon").checked})});
        $("#cv2-title").value="";$("#cv2-body").value="";$("#cv2-options").value="";status.textContent=editingId?"Saved.":"Published.";editingId=null;$("#cv2-compose-heading").textContent="Start a student post";$("#cv2-publish").textContent="Publish";$("#cv2-compose-dialog").close();await loadFeed();
      }catch(e){
        const messages={unsafe_content:"That content needs editing before it can be published.",invalid_item:"Add a title and a little more detail.",invalid_poll:"A poll needs at least two options.",rate_limited:"You have posted a lot recently. Try again later.",reopen_telegram:"Reopen Pulse from Telegram.",forbidden:"You can only edit your own post.",item_not_found:"That post is no longer available."};
        status.textContent=messages[e.message]||"Could not save this post. Please try again.";
      }finally{button.disabled=false}
    };
    root.querySelectorAll(".cv2-tab").forEach(tab=>tab.onclick=async()=>{
      if(tab.dataset.special==="saved"){savedOnly=true;sort="new";kind="";personalized=false;community="";syncTabs();haptic("light");await loadFeed();return}
      savedOnly=false;sort=tab.dataset.sort||"new";kind=tab.dataset.kind||"";personalized=sort==="for_you";if(personalized)community="";else if(!community)community="campus";syncTabs();haptic("light");await loadFeed()
    });

    root.addEventListener("click",async e=>{
      const chip=e.target.closest("[data-community]");
      if(chip){community=chip.dataset.community;$("#cv2-current-community").textContent=community==="campus"?"VGU campus":community;$("#cv2-community").value=community;$("#cv2-communities").closest("details")?.removeAttribute("open");await loadFeed();return}
      const button=e.target.closest("button[data-action]"),item=e.target.closest(".cv2-item");
      const id=Number(item?.dataset.id||0);
       if(button?.dataset.action==="answer"&&item){const replies=item.querySelector(".cv2-replies"),repliesButton=item.querySelector('[data-action="replies"]');if(repliesButton&&!replies.dataset.loaded)repliesButton.click();setTimeout(()=>replies.querySelector(".cv2-reply-input")?.focus(),120);haptic("light");return}
      const replyDelete=e.target.closest("[data-reply-delete]");
      if(replyDelete){try{
        if(replyDelete.dataset.confirming!=="1"){replyDelete.dataset.confirming="1";replyDelete.textContent="Confirm delete";return}
        replyDelete.disabled=true;await api("/api/community-v2/replies?reply_id="+encodeURIComponent(replyDelete.dataset.replyDelete),{method:"DELETE"});
        await loadFeed();
      }catch{replyDelete.disabled=false;replyDelete.textContent="Try again"}return}
      const replyAccept=e.target.closest("[data-reply-accept]");
      if(replyAccept){try{await api("/api/community-v2/solve",{method:"POST",body:JSON.stringify({item_id:id,reply_id:Number(replyAccept.dataset.replyAccept)})});item.dataset.solved="1";await loadFeed();return}catch{replyAccept.textContent="Try again";return}}
      const replyReport=e.target.closest("[data-reply-report]");
      if(replyReport){try{await api("/api/community-v2/report-reply",{method:"POST",body:JSON.stringify({reply_id:Number(replyReport.dataset.replyReport)})});replyReport.textContent="Reported"}catch{replyReport.textContent="Try again"}return}
      if(!button||!item)return;
      const action=button.dataset.action;
      try{
        if(action==="share"){await window.__pulseShare?.("post-"+id,"VGU Pulse discussion: "+String(item.querySelector("h3")?.textContent||""));return}
        if(action==="expand"){const body=item.querySelector(".cv2-body");if(body){const collapsed=body.classList.contains("cv2-collapsed");body.classList.remove("cv2-collapsed");item.querySelector(".cv2-more-text")?.remove();button.setAttribute("aria-expanded","true");if(collapsed)haptic("light")}return}
        if(action==="vote"){
          const value=Number(button.dataset.value),up=item.querySelector('[data-action="vote"][data-value="1"]'),down=item.querySelector('[data-action="vote"][data-value="-1"]');
          const oldVote=Number(item.dataset.myVote||0),next=oldVote===value?0:value;
          const upCount=Number((up?.textContent||"").replace(/[^0-9-]/g,""))||0,downCount=Number((down?.textContent||"").replace(/[^0-9-]/g,""))||0;
          const nextUp=upCount+(next===1?1:oldVote===1?-1:0),nextDown=downCount+(next===-1?1:oldVote===-1?-1:0);
          item.dataset.myVote=String(next);if(up)up.textContent="▲ "+nextUp;if(down)down.textContent="▼ "+nextDown;
          up?.classList.toggle("active",next===1);down?.classList.toggle("active",next===-1);
          try{await api("/api/community-v2/vote",{method:"POST",body:JSON.stringify({item_id:id,vote:value})});}catch(error){item.dataset.myVote=String(oldVote);if(up)up.textContent="▲ "+upCount;if(down)down.textContent="▼ "+downCount;up?.classList.toggle("active",oldVote===1);down?.classList.toggle("active",oldVote===-1);throw error;}return;
        }
        if(action==="follow"){const following=item.dataset.following==="1";item.dataset.following=following?"0":"1";button.classList.toggle("active",!following);button.textContent=following?"Follow":"Following";try{await api("/api/community-v2/follow"+(following?"?item_id="+encodeURIComponent(id):""),following?{method:"DELETE"}:{method:"POST",body:JSON.stringify({item_id:id})})}catch(e){item.dataset.following=following?"1":"0";button.classList.toggle("active",following);button.textContent=following?"Following":"Follow";throw e}return}
        if(action==="save"){const saved=item.dataset.saved==="1";item.dataset.saved=saved?"0":"1";button.classList.toggle("active",!saved);button.textContent=saved?"Save":"Saved";try{await api("/api/community-v2/save"+(saved?"?item_id="+encodeURIComponent(id):""),saved?{method:"DELETE"}:{method:"POST",body:JSON.stringify({item_id:id})})}catch(e){item.dataset.saved=saved?"1":"0";button.classList.toggle("active",saved);button.textContent=saved?"Saved":"Save";throw e}return}
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
          const selectedId=Number(d.selected_option_id)||0;
          box.innerHTML=(d.options||[]).map(o=>`<button type="button" class="cv2-poll-option ${Number(o.id)===selectedId?'active':''}" data-option-id="${o.id}" aria-pressed="${Number(o.id)===selectedId?'true':'false'}">${esc(o.label)} ${Number(o.id)===selectedId?'<strong> · Your choice</strong>':''} <span class="cv2-note">· ${o.votes} votes</span></button>`).join("")||'<span class="cv2-note">Poll unavailable.</span>';
          box.querySelectorAll("[data-option-id]").forEach(option=>option.onclick=async()=>{await api("/api/community-v2/poll-vote",{method:"POST",body:JSON.stringify({item_id:id,option_id:Number(option.dataset.optionId)})});box.hidden=true;await loadFeed()});
          box.hidden=false;return;
        }
        if(action==="replies"){
          const box=item.querySelector(".cv2-replies");try{await api("/api/community-v2/read",{method:"POST",body:JSON.stringify({item_id:id})});item.querySelector(".cv2-unread-badge")?.remove()}catch{}if(!box.hidden){box.hidden=true;return}
          const renderReplies=async()=>{const d=await api("/api/community-v2/replies?item_id="+id);const acceptedId=Number(item.dataset.acceptedReply||0);box.innerHTML=(d.replies||[]).map(r=>`<div class="cv2-reply" data-reply-id="${r.id}"><strong>${esc(r.author)}</strong> ${Number(r.id)===acceptedId?'<span class="cv2-accepted">✓ Accepted answer</span>':""}<div>${esc(r.body)}</div><span class="cv2-note">${pretty(r.created_at)}</span> ${r.mine?'<button class="cv2-tool" data-reply-delete="'+r.id+'" type="button">Delete</button>':'<button class="cv2-tool" data-reply-report="'+r.id+'" type="button">Report</button>'}${item.mine&&!Number(item.solved)?'<button class="cv2-tool" data-reply-accept="'+r.id+'" type="button">Accept answer</button>':""}</div>`).join("")||'<span class="cv2-note">No replies yet.</span>';box.insertAdjacentHTML("beforeend",`<div class="cv2-reply-compose"><textarea class="cv2-reply-input" placeholder="Reply to this discussion…"></textarea><label class="cv2-anon-toggle"><input class="cv2-reply-anon" type="checkbox" checked><span>Reply anonymously</span></label><button class="cv2-post-btn cv2-reply-send" type="button">Reply</button></div>`);box.dataset.loaded="1";box.hidden=false;box.querySelector(".cv2-reply-send").onclick=async()=>{const input=box.querySelector(".cv2-reply-input"),send=box.querySelector(".cv2-reply-send");if(!input.value.trim())return;send.disabled=true;try{const replyData=await api("/api/community-v2/replies",{method:"POST",body:JSON.stringify({item_id:id,body:input.value,anonymous:box.querySelector(".cv2-reply-anon")?.checked!==false})});input.value="";await renderReplies();const createdReplyId=Number(replyData.id||0);const createdReply=createdReplyId?box.querySelector('.cv2-reply[data-reply-id="'+createdReplyId+'"]'):null;createdReply?.scrollIntoView({block:"nearest",behavior:"smooth"});const count=item.querySelector('[data-action="replies"]');if(count){const match=(count.textContent||"").match(/\d+/);count.textContent="💬 "+(Number(match?.[0]||0)+1)};haptic("success")}catch{send.disabled=false;send.textContent="Try again";setTimeout(()=>{if(send.isConnected)send.textContent="Reply"},2200)}}};await renderReplies();return;
        }
        await loadFeed();
      }catch{const original=button.textContent;button.textContent="Try again";setTimeout(()=>{if(button.isConnected&&button.textContent==="Try again")button.textContent=original},2200)}
    });

    $("#cv2-more-close").onclick=()=>$("#cv2-more-dialog")?.close?.();
    $("#cv2-more-report").onclick=async()=>{if(!moderationItemId)return;try{await api("/api/community-v2/report",{method:"POST",body:JSON.stringify({item_id:moderationItemId,reason:$("#cv2-report-reason").value})});$("#cv2-more-status").textContent="Reported. Thank you.";setTimeout(()=>$("#cv2-more-dialog")?.close?.(),500)}catch(e){$("#cv2-more-status").textContent=e.message==="cannot_report_own_item"?"You cannot report your own post.":"Could not report this post."}};
    $("#cv2-more-block").onclick=async()=>{if(!moderationItemId)return;try{await api("/api/community-v2/block",{method:"POST",body:JSON.stringify({item_id:moderationItemId})});$("#cv2-more-status").textContent="Author blocked.";setTimeout(async()=>{$("#cv2-more-dialog")?.close?.();await loadFeed()},500)}catch{$("#cv2-more-status").textContent="Could not block this author."}};
    const askView=document.querySelector('[data-view-panel="ask"]'),askQuestion=document.querySelector("#search-query");
    if(askView&&askQuestion){
      const bridge=document.createElement("div");bridge.className="cv2-ask-bridge";
      bridge.innerHTML='<button type="button" class="cv2-tool" data-ask-action="start">Ask students →</button><button type="button" class="cv2-tool" data-ask-action="related">Related discussions →</button>';
      bridge.querySelector('[data-ask-action="start"]').onclick=()=>{const title=askQuestion.value.trim();document.querySelector('[data-view="community"]')?.click();setTimeout(()=>{const dialog=$("#cv2-compose-dialog");if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute("open","");$("#cv2-kind").value="discussion";$("#cv2-title").value=title.slice(0,180);$("#cv2-body").value="";$("#cv2-title").focus()},80)};
      bridge.querySelector('[data-ask-action="related"]').onclick=async()=>{const q=askQuestion.value.trim();document.querySelector('[data-view="community"]')?.click();setTimeout(async()=>{$("#cv2-search").value=q;sort="trending";kind="";syncTabs();await loadFeed()},80)};
      askQuestion.parentElement?.appendChild(bridge);
    }

    const openLegacyItem=async(id,replyId="")=>{
      const data=await api("/api/community-v2/legacy-item?post_id="+encodeURIComponent(id));
      const item=data.item;if(!item)throw new Error("post_not_found");
      $("#cv2-search").value="";kind="";community="";savedOnly=false;personalized=false;sort="new";syncTabs();await loadFeed();
      const feed=$("#cv2-feed");
      feed.insertAdjacentHTML("afterbegin",`<article class="cv2-item cv2-legacy-item" data-id="legacy-${item.id}">
        <div class="cv2-meta"><div class="cv2-wrap"><span class="cv2-badge">Earlier community</span><span class="cv2-note">${esc(item.category)}</span></div><span class="cv2-note">${pretty(item.created_at)}</span></div>
        <h3>${esc(item.title)}</h3><p class="cv2-body">${esc(item.body)}</p>
        <div class="cv2-note">By ${esc(item.author)} · ${Number(item.replies||0)} replies · Score ${Number(item.score||0)}</div>
        <div class="cv2-replies" hidden></div>
      </article>`);
      const card=feed.querySelector('.cv2-legacy-item[data-id="legacy-'+CSS.escape(String(item.id))+'"]');
      if(!card)throw new Error("item_not_visible");
      card.scrollIntoView({block:"center",behavior:"smooth"});
      const box=card.querySelector(".cv2-replies");
      box.innerHTML=(data.replies||[]).map(r=>`<div class="cv2-reply" data-reply-id="${r.id}"><strong>${esc(r.author)}</strong><div>${esc(r.body)}</div><span class="cv2-note">${pretty(r.created_at)}</span></div>`).join("")||'<span class="cv2-note">No replies yet.</span>';
      if(replyId){const reply=card.querySelector('.cv2-reply[data-reply-id="'+CSS.escape(String(replyId))+'"]');if(reply){box.hidden=false;reply.scrollIntoView({block:"center",behavior:"smooth"});reply.setAttribute("tabindex","-1");reply.focus({preventScroll:true})}}
    };
    window.__pulseCommunityOpenItem=async(id,replyId="",source="v2")=>{
      try{
        if(source==="legacy"){await openLegacyItem(id,replyId);return}
        const data=await api("/api/community-v2/items?item_id="+encodeURIComponent(id));const item=data.item;
        if(!item)throw new Error("item_not_found");
        $("#cv2-search").value=String(item.title||"").slice(0,120);kind="";community="";savedOnly=false;personalized=false;sort="new";syncTabs();await loadFeed();
        const card=document.querySelector('.cv2-item[data-id="'+CSS.escape(String(id))+"']");
        if(!card)throw new Error("item_not_visible");
        card.scrollIntoView({block:"center",behavior:"smooth"});
        const repliesButton=card.querySelector('[data-action="replies"]');
        if(!repliesButton)return;
        repliesButton.click();
        if(replyId){
          for(let attempt=0;attempt<12;attempt++){
            await new Promise(resolve=>setTimeout(resolve,50));
            const reply=card.querySelector('.cv2-reply[data-reply-id="'+CSS.escape(String(replyId))+"']");
            if(reply){reply.scrollIntoView({block:"center",behavior:"smooth"});reply.setAttribute("tabindex","-1");reply.focus({preventScroll:true});break}
          }
        }
      }catch{toast("That discussion could not be opened.")}
    };
    const startParam=new URLSearchParams(location.search).get("startapp")||new URLSearchParams(location.search).get("tgWebAppStartParam")||window.Telegram?.WebApp?.initDataUnsafe?.start_param||"";
    if(/^(post|poll)-\d+$/.test(startParam)){const id=startParam.split("-")[1];setTimeout(()=>{document.querySelector('[data-view="community"]')?.click();setTimeout(()=>window.__pulseCommunityOpenItem?.(id),300)},900)}
    window.__pulseCommunitySaved=async()=>{savedOnly=true;sort="new";kind="";personalized=false;$("#cv2-search").value="";syncTabs();await loadFeed()};
    window.__pulseCommunityAll=async()=>{savedOnly=false;sort="trending";kind="";personalized=false;syncTabs();await loadFeed()};
    async function openComposer(prefill=""){try{const ack=await api("/api/community-v2/rules/ack");if(!ack.acknowledged){const rules=await api("/api/community-v2/rules");$("#cv2-rules-copy").innerHTML=(rules.rules||[]).map(x=>"<p>• "+esc(x)+"</p>").join("");$("#cv2-rules-dialog").showModal?.();return;}}catch(e){$("#cv2-compose-status").textContent=e.message==="reopen_telegram"?"Reopen Pulse from Telegram.":"Could not load community rules.";return;}editingId=null;$("#cv2-compose-heading").textContent="Start a student post";$("#cv2-publish").textContent="Publish";$("#cv2-compose-status").textContent="";$("#cv2-title").value=prefill;$("#cv2-body").value="";const dialog=$("#cv2-compose-dialog");if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute("open","");$("#cv2-title").focus();haptic("light")}
    async function loadCampusPulse(){const host=$("#cv2-campus-pulse");if(!host)return;const dismissed=key=>{try{return localStorage.getItem("cv2:pulse:"+key)==="1"}catch{return false}};const dismiss=key=>{try{localStorage.setItem("cv2:pulse:"+key,"1")}catch{}host.querySelector('[data-pulse="'+key+'"]')?.remove()};try{const [mess,events,question]=await Promise.all([api("/api/v4/mess-rating"),api("/api/v4/events"),api("/api/v4/campus-question")]);const cards=[];if(!dismissed("mess")){const summary=(mess.items||[]).map(x=>x.meal+" "+Number(x.rating||0)+"/5").join(" · ")||"No ratings yet today";cards.push('<article class="cv2-pulse-card" data-pulse="mess"><button class="cv2-pulse-dismiss" data-dismiss-pulse="mess" type="button" aria-label="Dismiss mess pulse">×</button><strong>🍽 Mess today</strong><p>'+esc(summary)+'</p></article>')}if(!dismissed("event")){const next=(events.items||[])[0];cards.push('<article class="cv2-pulse-card" data-pulse="event"><button class="cv2-pulse-dismiss" data-dismiss-pulse="event" type="button" aria-label="Dismiss next event">×</button><strong>📅 Next on campus</strong><p>'+esc(next?next.title:"No upcoming event posted yet.")+'</p></article>')}if(!dismissed("question")){cards.push('<article class="cv2-pulse-card" data-pulse="question"><button class="cv2-pulse-dismiss" data-dismiss-pulse="question" type="button" aria-label="Dismiss daily question">×</button><strong>❓ Campus question</strong><p>'+esc(question.question||"What should Pulse ask students today?")+'</p></article>')}host.innerHTML=cards.join("");host.querySelectorAll("[data-dismiss-pulse]").forEach(b=>b.onclick=()=>{dismiss(b.dataset.dismissPulse);haptic("light")})}
    catch{host.replaceChildren()}}
    loadCommunities();
    loadCampusPulse();
    loadFeed().catch(()=>{$("#cv2-feed").innerHTML='<div class="cv2-empty">Community is temporarily unavailable. Try again in a moment.</div>'});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();