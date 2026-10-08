import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestHarness } from "wrangler";
import { listItems } from "../../src/community-v2";
import { runNotificationSweep } from "../../src/notifications";

const BOT_TOKEN = "gate-2-test-token";
const server = createTestHarness({
  workers: [
    {
      configPath: "./tests/behavior/wrangler-vgu-pulse.jsonc",
      secrets: {
        BOT_TOKEN: BOT_TOKEN,
      },
      bindingOverrides: { SIGNAL_SERVICE: "signal-mock" },
    },
    {
      config: {
        name: "signal-mock",
        main: "tests/behavior/signal-mock.ts",
        compatibility_date: "2026-10-01",
      },
    },
    { configPath: "./tests/behavior/wrangler-compat.jsonc", secrets: { BOT_TOKEN }, vars: { ANON_ALIAS_SECRET: "gate-2-anon-secret" } },
  ],
});

const worker = server.getWorker("vgu-pulse");
const compatWorker = server.getWorker("vgu-pulse-migration-compat");

async function signInitData(user: Record<string, unknown>, authDate = Math.floor(Date.now() / 1000)): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "gate-2",
    user: JSON.stringify(user),
  });
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(BOT_TOKEN));
  const dataKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => k+"="+v).join("\n");
  const hash = await crypto.subtle.sign("HMAC", dataKey, encoder.encode(dataCheckString));
  params.set("hash", [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2,"0")).join(""));
  return params.toString();
}

async function request(path:string, user:Record<string,unknown>, init:RequestInit={}) {
  const headers = new Headers(init.headers);
  headers.set("x-telegram-init-data", await signInitData(user));
  return worker.fetch("https://example.test"+path,{...init,headers:Object.fromEntries(headers.entries())} as any);
}

async function seed() {
  const env = await worker.getEnv() as {DB:D1Database};
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)").bind("1001","Viewer"),
    env.DB.prepare("INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)").bind("2002","Author"),
    env.DB.prepare("INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)").bind("3003","Student 3"),
    env.DB.prepare("INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)").bind("4004","Student 4"),
    env.DB.prepare("INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)").bind("5005","Student 5"),
    env.DB.prepare("INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)").bind("6006","Student 6"),
    env.DB.prepare("INSERT INTO student_profiles (public_id,telegram_user_id,display_name,program,branch,year,bio,looking_for) VALUES (?,?,?,?,?,?,?,?)").bind("viewer-1001","1001","Viewer Student","B.Tech","CSE",2,"",""),
    env.DB.prepare("INSERT INTO student_profiles (public_id,telegram_user_id,display_name,program,branch,year,bio,looking_for) VALUES (?,?,?,?,?,?,?,?)").bind("author-2002","2002","Author Student","B.Tech","CSE",2,"",""),
    env.DB.prepare("INSERT INTO community_items (telegram_user_id,kind,title,body,community_slug,status) VALUES (?,?,?,?,?,?)").bind("2002","discussion","Replies bind test","test item","campus","published"),
    env.DB.prepare("INSERT INTO community_replies (item_id,telegram_user_id,body,anonymous,status) VALUES (?,?,?,?,?)").bind(1,"2002","hello from author",0,"published"),
    env.DB.prepare("INSERT INTO community_replies (item_id,telegram_user_id,body,anonymous,status) VALUES (?,?,?,?,?)").bind(1,"1001","hello from viewer",0,"published"),
  ]);
}

beforeAll(async()=>{ await server.listen(); });
beforeEach(async()=>{ await server.reset(); await worker.applyD1Migrations("DB"); await seed(); });
afterEach(({task})=>{ if(task.result?.state==="fail") server.debug(); });
afterAll(async()=>{ await server.close(); });

describe("VGU-Pulse real D1 behavior",()=>{
  it("applies every migration to a fresh D1 database",async()=>{
    const env=await worker.getEnv() as {DB:D1Database};
    const rows=await env.DB.prepare("SELECT name FROM d1_migrations ORDER BY id").all<{name:string}>();
    expect(rows.results.map(x=>x.name)).toEqual(expect.arrayContaining(["0001_initial.sql","0009_community_network.sql","0010_gate1_hardening.sql","0011_gate2_safety.sql","0012_gate3_foundations.sql","0013_gate3_qa.sql","0014_gate3_reliability.sql","0015_gate4_features.sql","0016_gate4_completion.sql","0017_gate3_academic_mapping.sql","0018_gate3_fts_backfill.sql"]));
  });

  it("reproduces the replies contract and hides non-published parents",async()=>{
    const response=await request("/api/community-v2/replies?item_id=1",{id:1001,first_name:"Viewer"});
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ok:true,replies:[
      {id:1,author:"Author Student",mine:0},
      {id:2,author:"Viewer Student",mine:1},
    ]});
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("UPDATE community_items SET status='hidden' WHERE id=1").run();
    const hidden=await request("/api/community-v2/replies?item_id=1",{id:1001,first_name:"Viewer"});
    expect(hidden.status).toBe(404);
  });

  it("enforces threat rejection while allowing self-harm support",async()=>{
    await request("/api/community-v2/rules/ack",{id:1001,first_name:"Viewer"},{method:"POST",body:"{}"});
    await request("/api/community-v2/anonymous-notice",{id:1001,first_name:"Viewer"},{method:"POST",body:"{}"});
    const post=async(body:string)=>request("/api/community-v2/items",{id:1001,first_name:"Viewer"},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"discussion",title:"Safety test",body})});
    expect((await post("i will kill you")).status).toBe(422);
    const support=await post("I am thinking about suicide and need support");
    if(support.status===500) console.log("SUPPORT_LOGS",JSON.stringify(server.getLogs()));
    expect(support.status).toBe(201);
    await expect(support.json()).resolves.toMatchObject({ok:true,item:{support:true}});
    expect((await post("Can someone explain library timings?")).status).toBe(201);
  });

  it("allows a single reputation award across repeated vote toggles",async()=>{
    const user={id:1001,first_name:"Viewer"};
    for(let i=0;i<5;i++){
      await request("/api/community-v2/vote",{...user},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:1,vote:1})});
      if(i<4) await request("/api/community-v2/vote",{...user},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:1,vote:-1})});
    }
    const env=await worker.getEnv() as {DB:D1Database};
    const row=await env.DB.prepare("SELECT points FROM community_reputation WHERE telegram_user_id='2002'").first<{points:number}>();
    expect(Number(row?.points)).toBe(2);
  });

  it("deduplicates reply reports and preserves anonymous block privacy",async()=>{
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("UPDATE community_items SET anonymous=1,audience_program=NULL,audience_branch=NULL,audience_year=NULL WHERE id=1").run();
    await request("/api/community-v2/block",{id:1001,first_name:"Viewer"},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:1})});
    const blocks=await request("/api/student-profile/blocks",{id:1001,first_name:"Viewer"});
    const payload=await blocks.json() as any;
    expect(payload.profiles[0]).toMatchObject({display_name:"Anonymous author (from post #1)",public_id:null});
    for(let i=0;i<3;i++) await request("/api/community-v2/report-reply",{id:1001,first_name:"Viewer"},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reply_id:1})});
    const row=await env.DB.prepare("SELECT report_count FROM community_replies WHERE id=1").first<{report_count:number}>();
    expect(Number(row?.report_count)).toBe(1);
  });

  it("requires rules and anonymous notice before posting anonymously",async()=>{
    const user={id:1001,first_name:"Viewer"};
    const first=await request("/api/community-v2/items",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"confession",title:"Anonymous post",body:"hello"})});
    expect(first.status).toBe(428);
    await request("/api/community-v2/rules/ack",user,{method:"POST",body:"{}"});
    const second=await request("/api/community-v2/items",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"confession",title:"Anonymous post",body:"hello"})});
    expect(second.status).toBe(428);
    await request("/api/community-v2/anonymous-notice",user,{method:"POST",body:"{}"});
    const third=await request("/api/community-v2/items",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"confession",title:"Anonymous post",body:"hello"})});
    if(third.status!==201) console.log("ANON_FAILURE",third.status,await third.clone().text(),JSON.stringify(server.getLogs()));
    expect(third.status).toBe(201);
    const payload=await third.json() as any;
    expect(payload.item.author).toMatch(/^Anon-\d+$/);
    expect(payload.item.audience_program).toBeNull();
    expect(payload.item.audience_branch).toBeNull();
    expect(payload.item.audience_year).toBeNull();
  });

  it("rejects oversized V2 request bodies",async()=>{
    const user={id:1001,first_name:"Viewer"};
    const huge="x".repeat(40000);
    const response=await request("/api/community-v2/preferences",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({community_activity:true,payload:huge})});
    expect(response.status).toBe(400);
  });

  it("returns viewer poll choice and rejects closed polls",async()=>{
    const user={id:1001,first_name:"Viewer"};
    await request("/api/community-v2/rules/ack",user,{method:"POST",body:"{}"});
    const created=await request("/api/community-v2/polls",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"discussion",title:"Poll test",body:"Choose one",community_slug:"campus",options:["A","B"]})});
    expect(created.status).toBe(201);
    const createdData=await created.json() as {item:{id:number}};
    const pollId=createdData.item.id;
    const vote=await request("/api/community-v2/poll-vote",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:pollId,option_id:3})});
    expect(vote.status).toBe(400);
    const options=await worker.getEnv().then(async e=>e.DB.prepare("SELECT id FROM community_poll_options WHERE item_id=? ORDER BY id").bind(pollId).all<{id:number}>());
    const optionId=options.results[0].id;
    expect((await request("/api/community-v2/poll-vote",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:pollId,option_id:optionId})})).status).toBe(200);
    const poll=await request("/api/community-v2/poll?item_id="+pollId,user);
    expect(poll.status).toBe(200);
    await expect(poll.json()).resolves.toMatchObject({selected_option_id:optionId});
    const home=await request("/api/home",user);
    expect(home.status).toBe(200);
    const homeData=await home.json() as any;
    expect(homeData.poll?.selected_option_id).toBe(optionId);
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("UPDATE community_items SET poll_status='closed',poll_closes_at=CURRENT_TIMESTAMP WHERE id=?").bind(pollId).run();
    expect((await request("/api/community-v2/poll-vote",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:pollId,option_id:optionId})})).status).toBe(400);
  });

  it("strictly merges notification preferences",async()=>{
    const user={id:1001,first_name:"Viewer"};
    const set=async(body:Record<string,unknown>)=>request("/api/community-v2/preferences",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    expect((await set({community_activity:true})).status).toBe(200);
    expect((await set({community_activity:"false"})).status).toBe(400);
    await expect((await request("/api/community-v2/preferences",user)).json()).resolves.toMatchObject({preferences:{community_activity:true,personalized_alerts:false}});
  });

  it("retains moderation bans when personal account data is deleted",async()=>{
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("INSERT INTO user_bans(telegram_user_id,reason,banned_by) VALUES('1001','test ban','9009')").run();
    const response=await request("/api/account/delete",{id:1001,first_name:"Viewer"},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirm:true})});
    expect(response.status).toBe(200);
    expect(await env.DB.prepare("SELECT 1 FROM users WHERE telegram_user_id='1001'").first()).toBeNull();
    const ban=await env.DB.prepare("SELECT reason,banned_by FROM user_bans WHERE telegram_user_id='1001'").first<{reason:string;banned_by:string}>();
    expect(ban).toEqual({reason:"test ban",banned_by:"9009"});
  });

  it("sweeps notification channels independently after malformed Signal JSON",async()=>{
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("INSERT OR IGNORE INTO notification_preferences(telegram_user_id,official_updates,community_replies,community_activity,personalized_alerts) VALUES('1001',1,1,1,0)").run();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO student_notifications(telegram_user_id,kind,channel,title,body,reference_key) VALUES('1001','official','official','Official','A & B','official:test')"),
      env.DB.prepare("INSERT INTO student_notifications(telegram_user_id,kind,channel,title,body,reference_key) VALUES('1001','community','community_replies','Reply','Reply body','reply:test')"),
      env.DB.prepare("INSERT INTO student_notifications(telegram_user_id,kind,channel,title,body,reference_key) VALUES('1001','community','community_activity','Activity','Activity body','v2-reply:test')"),
      env.DB.prepare("INSERT INTO student_notifications(telegram_user_id,kind,channel,title,body,reference_key) VALUES('1001','community','personalized','Personal','Personal body','v2-personal:test')"),
    ]);
    const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({ok:true,result:{}}),{status:200,headers:{"content-type":"application/json"}}));
    const signal={fetch:async()=>new Response("{malformed",{status:200})} as unknown as Fetcher;
    try{
      const result=await runNotificationSweep(env.DB,signal,"test-token");
      expect(result.sent).toBe(3);
      const rows=await env.DB.prepare("SELECT channel,sent_at,failed_at FROM student_notifications WHERE telegram_user_id='1001' ORDER BY channel").all<{channel:string;sent_at:string|null;failed_at:string|null}>();
      expect(rows.results.filter(x=>x.sent_at).map(x=>x.channel)).toEqual(expect.arrayContaining(["official","community_replies","community_activity"]));
      expect(rows.results.some(x=>x.channel==="personalized")).toBe(false);
    }finally{fetchMock.mockRestore();}
  });

  it("requires Telegram initData for student discovery",async()=>{
    const response=await worker.fetch("https://example.test/api/students");
    expect(response.status).toBe(401);
  });

  it("preserves 0009 data when Gate 1 and Gate 2 migrations are applied",async()=>{
    await compatWorker.applyD1Migrations("DB");
    const env=await compatWorker.getEnv() as {DB:D1Database};
    await env.DB.prepare("INSERT INTO users (telegram_user_id,first_name) VALUES ('2002','Legacy target'),('3003','Legacy')").run();
    await env.DB.prepare("INSERT INTO student_profile_blocks(blocker_telegram_user_id,blocked_telegram_user_id) VALUES('3003','2002')").run();
    await env.DB.prepare("INSERT INTO student_profiles(public_id,telegram_user_id,display_name,program,branch,year,bio,looking_for) VALUES('legacy-3003','3003','Legacy Student','BTECH','CSE AI',2,'','')").run();
    await env.DB.prepare("INSERT INTO community_items(telegram_user_id,kind,title,body,status) VALUES('3003','discussion','LegacySearchPost','migration content','published')").run();
    await server.update({workers:[
      {configPath:"./wrangler.jsonc",secrets:{BOT_TOKEN,ANON_ALIAS_SECRET:"gate-2-anon-secret",ADMIN_IDS:"9009"},bindingOverrides:{SIGNAL_SERVICE:"signal-mock"}},
      {config:{name:"signal-mock",main:"tests/behavior/signal-mock.ts",compatibility_date:"2026-10-01"}},
      {configPath:"./tests/behavior/wrangler-compat-all.jsonc",secrets:{BOT_TOKEN,ANON_ALIAS_SECRET:"gate-2-anon-secret"}}
    ]});
    await compatWorker.applyD1Migrations("DB");
    const upgraded=await compatWorker.getEnv() as {DB:D1Database};
    const row=await upgraded.DB.prepare("SELECT via_anonymous,source_item_id FROM student_profile_blocks WHERE blocker_telegram_user_id='3003' AND blocked_telegram_user_id='2002'").first<{via_anonymous:number;source_item_id:number|null}>();
    expect(Number(row?.via_anonymous)).toBe(0);
    expect(row?.source_item_id).toBeNull();
    const profile=await upgraded.DB.prepare("SELECT program,branch FROM student_profiles WHERE telegram_user_id='3003'").first<{program:string;branch:string}>();
    expect(profile).toEqual({program:"B.Tech",branch:"CSE — Artificial Intelligence"});
    const search=await upgraded.DB.prepare("SELECT rowid FROM community_items_fts WHERE community_items_fts MATCH ?").bind("LegacySearchPost*").all();
    expect(search.results.length).toBe(1);
  });
  it("returns the specific legacy post after it falls outside the first page",async()=>{
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.batch(Array.from({length:25},(_,i)=>env.DB.prepare("INSERT INTO student_posts(telegram_user_id,category,title,body,status) VALUES('2002','question',?,?,?)").bind("Legacy "+i,"Body","published")));
    const response=await request("/api/student-posts/vote",{id:1001,first_name:"Viewer"},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({post_id:1,vote:1})});
    expect(response.status).toBe(200);
    const data=await response.json() as {post:{id:number;viewer_vote:number}};
    expect(data.post.id).toBe(1);
    expect(data.post.viewer_vote).toBe(1);
  });

  it("keeps a 40-item feed at constant D1 query count",async()=>{
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.batch(Array.from({length:40},(_,i)=>env.DB.prepare("INSERT INTO community_items(telegram_user_id,kind,title,body,community_slug,status) VALUES(?,?,?,?,?,?)").bind("2002","discussion","Feed item "+i,"body","campus","published")));
    const counter={value:0};
    const rows=await listItems(env.DB,1001,new URLSearchParams({sort:"new",limit:"40"}), "gate-2-anon-secret", false, counter);
    expect(rows.length).toBe(40);
    expect(counter.value).toBe(2);
  });

  it("enforces approved communities and cursor pagination",async()=>{
    const user={id:1001,first_name:"Viewer"};
    await request("/api/community-v2/rules/ack",user,{method:"POST",body:"{}"});
    const invalid=await request("/api/community-v2/items",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"discussion",title:"Bad community",body:"hello",community_slug:"invented"})});
    expect(invalid.status).toBe(400);
    const campus=await request("/api/community-v2/items",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"discussion",title:"Campus community",body:"hello",community_slug:"campus"})});
    expect(campus.status).toBe(201);
    const feed=await request("/api/community-v2/feed?limit=1",user);
    const payload=await feed.json() as any;
    if(!payload.next_cursor) console.log("CURSOR_FAILURE",JSON.stringify(payload));
    expect(payload.next_cursor).toMatch(/.+/);
    const next=await request("/api/community-v2/feed?limit=1&cursor="+encodeURIComponent(payload.next_cursor),user);
    expect(next.status).toBe(200);
  });

  it("keeps Telegram contact opt-in",async()=>{
    const user={id:1001,first_name:"Viewer"};
    const off=await request("/api/student-profile/contact",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:false})});
    expect(off.status).toBe(200);
    const on=await request("/api/student-profile/contact",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true})});
    expect(on.status).toBe(200);
  });

  it("caps personalized fan-out and skips a blocked recipient",async()=>{
    const author={id:2002,first_name:"Author"};
    await request("/api/community-v2/rules/ack",author,{method:"POST",body:"{}"});
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO notification_preferences(telegram_user_id,official_updates,community_replies,community_activity,personalized_alerts) VALUES('3003',1,1,1,1)"),
      env.DB.prepare("INSERT INTO student_profile_blocks(blocker_telegram_user_id,blocked_telegram_user_id) VALUES('1001','2002')"),
    ]);
    for(let i=0;i<4;i++){
      const response=await request("/api/community-v2/items",author,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"discussion",title:"Fanout "+i,body:"Campus update",community_slug:"campus"})});
      expect(response.status).toBe(201);
    }
    const counts=await env.DB.prepare("SELECT telegram_user_id,COUNT(*) count FROM student_notifications WHERE channel='personalized' GROUP BY telegram_user_id ORDER BY telegram_user_id").all<{telegram_user_id:string;count:number}>();
    expect(counts.results.find(x=>x.telegram_user_id==="1001")).toBeUndefined();
    expect(Number(counts.results.find(x=>x.telegram_user_id==="3003")?.count)).toBe(3);
  });

  it("notifies a V2 post author when another student replies",async()=>{
    const author={id:2002,first_name:"Author"};
    const viewer={id:1001,first_name:"Viewer"};
    await request("/api/community-v2/rules/ack",author,{method:"POST",body:"{}"});
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("INSERT OR IGNORE INTO notification_preferences(telegram_user_id,community_replies,community_activity,personalized_alerts,official_updates) VALUES('2002',1,1,1,1)").run();
    const created=await request("/api/community-v2/items",author,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"question",title:"Author notification test",body:"Need an answer",community_slug:"campus"})});
    expect(created.status).toBe(201);
    const createdData=await created.json() as {item:{id:number}};
    const reply=await request("/api/community-v2/replies",viewer,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:createdData.item.id,body:"Here is an answer",anonymous:true})});
    expect(reply.status).toBe(201);
    const notification=await env.DB.prepare("SELECT channel,reference_key FROM student_notifications WHERE telegram_user_id='2002' AND reference_key LIKE 'v2-reply:%' ORDER BY id DESC LIMIT 1").first<{channel:string;reference_key:string}>();
    expect(notification).toEqual(expect.objectContaining({channel:"community_activity"}));
  });

  it("supports Q&A reply votes and solved state",async()=>{
    const viewer={id:1001,first_name:"Viewer"};
    const vote=await request("/api/community-v2/reply-vote",viewer,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reply_id:1,vote:1})});
    expect(vote.status).toBe(200);
    const env=await worker.getEnv() as {DB:D1Database};
    const awarded=await env.DB.prepare("SELECT points FROM community_reputation WHERE telegram_user_id='2002'").first<{points:number}>();
    expect(Number(awarded?.points)).toBe(1);
    const flip=await request("/api/community-v2/reply-vote",viewer,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reply_id:1,vote:-1})});
    expect(flip.status).toBe(200);
    const reversed=await env.DB.prepare("SELECT points FROM community_reputation WHERE telegram_user_id='2002'").first<{points:number}>();
    expect(Number(reversed?.points)).toBe(0);
    const forbidden=await request("/api/community-v2/solve",viewer,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:1,reply_id:1})});
    expect(forbidden.status).toBe(403);
    const author=await request("/api/community-v2/solve",{id:2002,first_name:"Author"},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({item_id:1,reply_id:1})});
    expect(author.status).toBe(200);
  });

  it("covers Gate 4 student feature flows",async()=>{
    const user={id:1001,first_name:"Viewer"};
    const mess=await request("/api/v4/mess-rating",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rating:4,meal:"lunch"})});expect(mess.status).toBe(200);
    const countdown=await request("/api/v4/exam-countdown",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"DSA",exam_at:"2026-12-01T10:00:00Z"})});expect(countdown.status).toBe(200);
    const resource=await request("/api/v4/resource",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({file_id:"telegram-file",name:"DSA PYQ.pdf",resource_type:"PYQ"})});expect(resource.status).toBe(201);
    const event=await request("/api/v4/event",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Study meetup",starts_at:"2026-12-01T15:00:00Z"})});expect(event.status).toBe(201);
    const listing=await request("/api/v4/listing",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"lost_found",title:"Found ID card",body:"Found near library",expires_at:"2026-12-02T00:00:00Z"})});expect(listing.status).toBe(201);
    const review=await request("/api/v4/teacher-review",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({teacher:"Professor X",elective:"AI",teaching:5,workload:3,support:4})});expect(review.status).toBe(201);
    const growth=await request("/api/v4/growth/top",user);expect(growth.status).toBe(200);
    const events=await request("/api/v4/events",user);expect(events.status).toBe(200);
    const createdEvent=await request("/api/v4/event",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Student event",starts_at:"2026-12-05T15:00:00Z"})});expect(createdEvent.status).toBe(201);
    const pastListing=await request("/api/v4/listing",user,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"ride",title:"Past ride",body:"No longer needed",expires_at:"2020-01-01T00:00:00Z"})});expect(pastListing.status).toBe(400);
    for(const reviewer of [{id:1001},{id:3003},{id:4004},{id:5005},{id:6006}]){const review=await request("/api/v4/teacher-review",reviewer as Record<string,unknown>,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({teacher:"Professor Y",elective:"DBMS",teaching:5,workload:3,support:4})});expect(review.status).toBe(201);}
    const aggregate=await request("/api/v4/teacher-reviews?teacher=Professor%20Y&elective=DBMS",user);expect(aggregate.status).toBe(200);const pendingAggregate=await aggregate.json() as {ratings:unknown};expect(pendingAggregate.ratings).toBeNull();
    const env=await worker.getEnv() as {DB:D1Database};
    await env.DB.prepare("UPDATE teacher_reviews SET status='published' WHERE teacher=? AND elective=?").bind("Professor Y","DBMS").run();
    const publishedAggregate=await request("/api/v4/teacher-reviews?teacher=Professor%20Y&elective=DBMS",user);const publishedData=await publishedAggregate.json() as {ratings:{count:number}};expect(publishedData.ratings.count).toBe(5);

  });
});