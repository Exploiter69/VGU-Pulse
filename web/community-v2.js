(() => {
  const boot = () => {
    const communityView = document.querySelector('[data-view="community"]')?.closest?.(".view") ||
      document.querySelector("#community");
    if (!communityView || document.getElementById("community-v2-root")) return;

    const style = document.createElement("style");
    style.textContent = `
      #community-v2-root{margin-top:10px}
      .cv2-hero{padding:18px;border:1px solid var(--border);border-radius:15px;background:linear-gradient(145deg,rgba(125,181,255,.08),transparent 70%)}
      .cv2-tabs{display:flex;gap:6px;overflow:auto;margin:12px 0;padding:2px 0;scrollbar-width:none}
      .cv2-tabs::-webkit-scrollbar{display:none}
      .cv2-tab{flex:0 0 auto;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:999px;padding:8px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
      .cv2-tab.active{color:var(--text);background:var(--surface-2);border-color:var(--border-strong)}
      .cv2-compose{margin-top:12px;padding:13px;border:1px solid var(--border);border-radius:14px;background:var(--surface-2)}
      .cv2-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .cv2-compose textarea{min-height:76px;background:transparent}
      .cv2-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      .cv2-actions .submit{width:auto}
      .cv2-toggle{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:7px 10px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:12px;font-weight:650}
      .cv2-toggle input{width:16px;min-width:16px;height:16px;min-height:16px;margin:0}
      .cv2-item{padding:17px 0;border-top:1px solid var(--border)}
      .cv2-item:first-child{border-top:0}
      .cv2-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .cv2-badge{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:4px 8px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      .cv2-badge.anon{color:var(--warning);border-color:rgba(242,196,109,.25)}
      .cv2-item h3{margin:7px 0 5px}
      .cv2-item p{white-space:pre-wrap}
      .cv2-item-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px}
      .cv2-tool{border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:999px;min-height:38px;padding:7px 10px;font:inherit;font-size:12px;cursor:pointer}
      .cv2-tool:hover,.cv2-tool.active{color:var(--text);background:var(--surface-2)}
      .cv2-replies{margin-top:10px;padding-left:12px;border-left:2px solid var(--border)}
      .cv2-reply{padding:8px 0;border-bottom:1px solid var(--border)}
      .cv2-reply:last-child{border-bottom:0}
      .cv2-note{color:var(--muted);font-size:12px}
      .cv2-prefs{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      .cv2-community-chip{cursor:pointer}
      .cv2-poll-options{display:grid;gap:6px;margin-top:8px}
      .cv2-poll-option{text-align:left;border:1px solid var(--border);background:transparent;color:var(--text);border-radius:10px;padding:10px;font:inherit;cursor:pointer}
      @media(max-width:620px){.cv2-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const root = document.createElement("section");
    root.id = "community-v2-root";
    root.innerHTML = `
      <div class="cv2-hero">
        <div class="eyebrow">VGU Network</div>
        <h2 style="margin:4px 0">What's happening at VGU?</h2>
        <p class="muted">Verified information stays official. Student conversations stay student-owned.</p>
        <div class="cv2-tabs" role="tablist">
          <button class="cv2-tab active" data-sort="trending">🔥 Trending</button>
          <button class="cv2-tab" data-sort="new">Latest</button>
          <button class="cv2-tab" data-kind="confession">Confessions</button>
          <button class="cv2-tab" data-kind="campus">Campus</button>
          <button class="cv2-tab" data-kind="exam">Exam survival</button>
          <button class="cv2-tab" data-kind="senior">Senior → junior</button>
          <button class="cv2-tab" data-kind="teammate">Find teammates</button>
        </div>
        <div class="search-shell">
          <input id="cv2-search" aria-label="Search student discussions" placeholder="Search student discussions…">
          <button class="submit" id="cv2-search-btn" type="button">Search</button>
        </div>
        <div class="cv2-compose">
          <div class="cv2-grid">
            <div>
              <label for="cv2-kind">Post type</label>
              <select id="cv2-kind">
                <option value="discussion">Discussion</option>
                <option value="confession">Confession</option>
                <option value="campus">Campus pulse</option>
                <option value="exam">Exam survival</option>
                <option value="senior">Senior → junior advice</option>
                <option value="notes">Notes / resources</option>
                <option value="pyq">PYQ / exam material</option>
                <option value="teacher">Teacher / elective advice</option>
                <option value="teammate">Project teammate</option>
                <option value="lost_found">Lost & found</option>
                <option value="ride">Ride sharing</option>
                <option value="roommate">Room / roommate</option>
                <option value="listing">Student exchange</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>
            <div>
              <label for="cv2-community">Community</label>
              <input id="cv2-community" value="campus" maxlength="60" aria-label="Community name">
            </div>
          </div>
          <label for="cv2-title">Title</label>
          <input id="cv2-title" maxlength="180" placeholder="What do you want other VGU students to know?">
          <label for="cv2-body">Details</label>
          <textarea id="cv2-body" maxlength="4000" placeholder="Ask, share, coordinate, or start a conversation…"></textarea>
          <div id="cv2-poll-fields" hidden>
            <label for="cv2-options">Poll options</label>
            <input id="cv2-options" placeholder="Option 1, Option 2, Option 3">
          </div>
          <div class="cv2-actions">
            <label class="cv2-toggle"><input id="cv2-anon" type="checkbox"> Post anonymously</label>
            <button class="submit" id="cv2-publish" type="button">Publish</button>
          </div>
          <div id="cv2-compose-status" class="cv2-note" aria-live="polite"></div>
        </div>
      </div>
      <div class="card">
        <div class="section-heading">
          <div><div class="eyebrow">Your network</div><h2>Communities</h2></div>
          <button class="inline-link" id="cv2-personalize" type="button">For me</button>
        </div>
        <div id="cv2-communities" class="chips"><span class="cv2-note">Loading communities…</span></div>
        <div id="cv2-feed"><p class="muted">Loading student discussions…</p></div>
      </div>
      <div class="card">
        <div class="section-heading"><div><div class="eyebrow">Your contribution</div><h2>Reputation</h2></div></div>
        <div id="cv2-reputation" class="today-grid"><div class="today-stat"><strong>0</strong><span>Points</span></div><div class="today-stat"><strong>—</strong><span>Badges</span></div></div>
        <div class="cv2-prefs">
          <label class="cv2-toggle"><input id="cv2-alert-community" type="checkbox"> Discussion alerts</label>
          <label class="cv2-toggle"><input id="cv2-alert-personal" type="checkbox"> Personalized alerts</label>
        </div>
      </div>
    `;
    const target = communityView.querySelector("#student-posts")?.parentElement || communityView;
    target.appendChild(root);

    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || "";
    const $ = (s) => root.querySelector(s);
    let sort = "trending", kind = "", personalized = false;

    async function api(path, options = {}) {
      const headers = {"content-type":"application/json"};
      if (initData) headers["x-telegram-init-data"] = initData;
      const r = await fetch(path, {...options, headers:{...headers,...(options.headers||{})}});
      const d = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(d.error || "request_failed");
      return d;
    }

    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const pretty = (s) => { try { return new Date(s).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}); } catch { return s; } };

    async function loadFeed() {
      const params = new URLSearchParams({sort});
      if (kind) params.set("kind",kind);
      if (personalized) params.set("personalized","1");
      const q = $("#cv2-search").value.trim();
      if (q) params.set("q",q);
      const data = await api("/api/community-v2/feed?" + params);
      const feed = $("#cv2-feed");
      if (!data.items?.length) { feed.innerHTML = '<div class="empty-state">No discussions yet. Be the first student to start one.</div>'; return; }
      feed.innerHTML = data.items.map(item => `
        <article class="cv2-item" data-id="${item.id}">
          <div class="cv2-meta">
            <div class="wrap-row">
              <span class="cv2-badge">${esc(item.kind.replaceAll("_"," "))}</span>
              ${Number(item.anonymous) ? '<span class="cv2-badge anon">Anonymous</span>' : ''}
              <span class="cv2-note">${esc(item.community_slug)}</span>
            </div>
            <span class="cv2-note">${pretty(item.created_at)}</span>
          </div>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.body)}</p>
          <div class="cv2-note">By ${esc(item.author)} · ${item.replies} replies · ${item.upvotes} helpful votes</div>
          <div class="cv2-item-tools">
            <button class="cv2-tool ${Number(item.my_vote)===1?'active':''}" data-action="vote" data-value="1">▲ ${item.upvotes}</button>
            <button class="cv2-tool ${Number(item.my_vote)===-1?'active':''}" data-action="vote" data-value="-1">▼ ${item.downvotes}</button>
            <button class="cv2-tool" data-action="replies">💬 ${item.replies}</button>
            <button class="cv2-tool ${item.following?'active':''}" data-action="follow">${item.following?'Following':'Follow'}</button>
            <button class="cv2-tool ${item.saved?'active':''}" data-action="save">${item.saved?'Saved':'Save'}</button>
            <button class="cv2-tool" data-action="report">Report</button>
          </div>
          <div class="cv2-replies" hidden></div>
        </article>
      `).join("");
    }

    async function loadCommunities() {
      const data = await api("/api/community-v2/communities");
      const box = $("#cv2-communities");
      const names = ["campus", ...(data.communities||[]).map(x=>x.community_slug)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,12);
      box.innerHTML = names.map(name => `<button class="chip cv2-community-chip" data-community="${esc(name)}">${esc(name)}</button>`).join("");
    }

    async function loadReputation() {
      const data = await api("/api/community-v2/reputation");
      const r = data.reputation || {points:0,badges:[]};
      $("#cv2-reputation").innerHTML = `<div class="today-stat"><strong>${r.points}</strong><span>Points</span></div><div class="today-stat"><strong>${r.badges.length}</strong><span>Badges</span></div>`;
      $("#cv2-reputation").insertAdjacentHTML("afterend", `<p class="cv2-note">${r.badges.length ? 'Badges: '+r.badges.map(esc).join(' · ') : 'Earn reputation by asking useful questions, replying, and helping other students.'}</p>`);
    }

    async function loadPreferences() {
      const data = await api("/api/community-v2/preferences");
      $("#cv2-alert-community").checked = Boolean(data.preferences?.community_activity);
      $("#cv2-alert-personal").checked = Boolean(data.preferences?.personalized_alerts);
    }

    async function savePreferences() {
      await api("/api/community-v2/preferences",{method:"POST",body:JSON.stringify({
        community_activity:$("#cv2-alert-community").checked,
        personalized_alerts:$("#cv2-alert-personal").checked
      })});
    }

    $("#cv2-kind").addEventListener("change", e => {
      $("#cv2-anon").checked = e.target.value === "confession";
      $("#cv2-poll-fields").hidden = e.target.value !== "discussion";
    });

    $("#cv2-publish").addEventListener("click", async () => {
      const status=$("#cv2-compose-status"), button=$("#cv2-publish");
      try {
        button.disabled=true; status.textContent="Publishing…";
        const kind=$("#cv2-kind").value;
        const options=$("#cv2-options").value.split(",").map(x=>x.trim()).filter(Boolean);
        const data = kind === "discussion" && options.length >= 2
          ? await api("/api/community-v2/polls",{method:"POST",body:JSON.stringify({
              kind,title:$("#cv2-title").value,body:$("#cv2-body").value,community_slug:$("#cv2-community").value,anonymous:$("#cv2-anon").checked,options
            })})
          : await api("/api/community-v2/items",{method:"POST",body:JSON.stringify({
              kind,title:$("#cv2-title").value,body:$("#cv2-body").value,community_slug:$("#cv2-community").value,anonymous:$("#cv2-anon").checked
            })});
        $("#cv2-title").value=""; $("#cv2-body").value=""; $("#cv2-options").value="";
        status.textContent="Published. Your student contribution is now live.";
        await Promise.all([loadFeed(),loadReputation()]);
      } catch(e) { status.textContent=e.message==="unsafe_content" ? "That content needs editing before it can be published." : "Could not publish. Please try again."; }
      finally { button.disabled=false; }
    });

    root.addEventListener("click", async e => {
      const button=e.target.closest("button[data-action]"); const item=e.target.closest(".cv2-item");
      if(button && item){
        const id=Number(item.dataset.id), action=button.dataset.action;
        try{
          if(action==="vote") await api("/api/community-v2/vote",{method:"POST",body:JSON.stringify({item_id:id,vote:Number(button.dataset.value)})});
          if(action==="follow") await api("/api/community-v2/follow",{method:"POST",body:JSON.stringify({item_id:id})});
          if(action==="save") await api("/api/community-v2/save",{method:"POST",body:JSON.stringify({item_id:id})});
          if(action==="report"){await api("/api/community-v2/report",{method:"POST",body:JSON.stringify({item_id:id,reason:"student_report"})});button.textContent="Reported";}
          if(action==="replies"){
            const box=item.querySelector(".cv2-replies");
            if(!box.hidden){box.hidden=true;return;}
            const d=await api("/api/community-v2/replies?item_id="+id);
            box.innerHTML=(d.replies||[]).map(r=>`<div class="cv2-reply"><strong>${esc(r.author)}</strong><div>${esc(r.body)}</div><span class="cv2-note">${pretty(r.created_at)}</span></div>`).join("") || '<span class="cv2-note">No replies yet.</span>';
            box.insertAdjacentHTML("beforeend",`<div class="spaced"><textarea class="cv2-reply-input" placeholder="Reply to this discussion…"></textarea><button class="submit cv2-reply-send" type="button">Reply</button></div>`);
            box.hidden=false;
            box.querySelector(".cv2-reply-send").onclick=async()=>{const input=box.querySelector(".cv2-reply-input");await api("/api/community-v2/replies",{method:"POST",body:JSON.stringify({item_id:id,body:input.value,anonymous:false})});await loadFeed();};
          }
          if(action!=="replies" && action!=="report") await loadFeed();
          if(action==="vote") await loadReputation();
        }catch{button.textContent="Try again";}
      }
      const chip=e.target.closest("[data-community]");
      if(chip){$("#cv2-community").value=chip.dataset.community; $("#cv2-search").value=""; kind=""; sort="trending"; await loadFeed();}
      const tab=e.target.closest(".cv2-tab");
      if(tab){
        document.querySelectorAll(".cv2-tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");
        sort=tab.dataset.sort||"new";kind=tab.dataset.kind||"";await loadFeed();
      }
    });

    $("#cv2-search-btn").addEventListener("click",loadFeed);
    $("#cv2-search").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();loadFeed();}});
    $("#cv2-personalize").addEventListener("click",async()=>{personalized=!personalized;$("#cv2-personalize").textContent=personalized?"Personalized":"For me";await loadFeed();});
    $("#cv2-alert-community").addEventListener("change",savePreferences);
    $("#cv2-alert-personal").addEventListener("change",savePreferences);

    const askView=document.querySelector('[data-view="ask"]')?.closest?.(".view");
    const askQuestion=document.querySelector("#question");
    if(askView && askQuestion){
      const bridge=document.createElement("button");
      bridge.type="button";bridge.className="inline-link";bridge.textContent="Ask VGU students →";
      bridge.style.marginTop="8px";
      bridge.addEventListener("click",()=>{
        const title=askQuestion.value.trim();
        const viewButton=document.querySelector('[data-view="community"]');
        if(viewButton) viewButton.click();
        setTimeout(()=>{
          $("#cv2-kind").value="discussion";
          $("#cv2-title").value=title.slice(0,180);
          $("#cv2-body").value="";
          $("#cv2-title").focus();
          $("#cv2-compose-status").textContent="Turn your question into a student discussion.";
        },50);
      });
      askQuestion.parentElement?.appendChild(bridge);
    }

    Promise.all([loadFeed(),loadCommunities(),loadReputation(),loadPreferences()]).catch(()=>{});
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();