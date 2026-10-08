type Env={DB:D1Database;ADMIN_IDS?:string};
type User={id:number;username?:string};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});}
async function body<T>(r:Request):Promise<T|null>{const n=Number(r.headers.get("content-length")??0);if(Number.isFinite(n)&&n>32768)return null;try{const v=await r.json();return v&&typeof v==="object"?v as T:null}catch{return null}}
const safeId=(v:unknown)=>{const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:0};
const text=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
const admin=(env:Env,id:number)=>new Set((env.ADMIN_IDS??"").split(",").map(x=>x.trim()).filter(Boolean)).has(String(id));

export async function handleFeaturesV4(request:Request,env:Env,user:User):Promise<Response|null>{
 const u=new URL(request.url);
 if(!u.pathname.startsWith("/api/v4/"))return null;
 try{
  if(request.method==="POST"&&u.pathname==="/api/v4/mess-rating"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);
   const rating=Number(b.rating);if(!Number.isInteger(rating)||rating<1||rating>5)return json({ok:false,error:"invalid_rating"},400);
   const meal=["overall","breakfast","lunch","dinner"].includes(String(b.meal))?String(b.meal):"overall";
   const day=/^\d{4}-\d{2}-\d{2}$/.test(String(b.day))?String(b.day):new Date().toISOString().slice(0,10);
   await env.DB.prepare("INSERT INTO mess_daily_ratings(day,telegram_user_id,rating,meal,note) VALUES(?,?,?,?,?) ON CONFLICT(day,telegram_user_id,meal) DO UPDATE SET rating=excluded.rating,note=excluded.note").bind(day,String(user.id),rating,meal,text(b.note,200)).run();
   return json({ok:true,day,meal,rating});
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/mess-rating"){
   const day=/^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("day")??"")?u.searchParams.get("day")!:new Date().toISOString().slice(0,10);
   const rows=await env.DB.prepare("SELECT meal,ROUND(AVG(rating),2) rating,COUNT(*) ratings FROM mess_daily_ratings WHERE day=? GROUP BY meal ORDER BY meal").bind(day).all();
   const mine=await env.DB.prepare("SELECT meal,rating,note FROM mess_daily_ratings WHERE day=? AND telegram_user_id=?").bind(day,String(user.id)).all();
   return json({ok:true,day,averages:rows.results??[],mine:mine.results??[]});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/campus-question"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);
   const question=text(b.question,240);if(question.length<5)return json({ok:false,error:"invalid_question"},400);
   const day=new Date().toISOString().slice(0,10);
   if(!admin(env,user.id))return json({ok:false,error:"forbidden"},403);
   await env.DB.prepare("INSERT INTO campus_questions(day,question,created_by) VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET question=excluded.question,created_by=excluded.created_by").bind(day,question,String(user.id)).run();
   return json({ok:true,day,question});
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/campus-question"){
   const day=new Date().toISOString().slice(0,10);const row=await env.DB.prepare("SELECT question FROM campus_questions WHERE day=?").bind(day).first();
   return json({ok:true,day,question:row?.question??"What should VGU students improve on campus today?"});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/exam-countdown"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);
   const title=text(b.title,100),examAt=text(b.exam_at,50);if(title.length<2||!Number.isFinite(Date.parse(examAt)))return json({ok:false,error:"invalid_exam"},400);
   await env.DB.prepare("INSERT INTO exam_countdowns(telegram_user_id,title,exam_at) VALUES(?,?,?) ON CONFLICT(telegram_user_id,title) DO UPDATE SET exam_at=excluded.exam_at").bind(String(user.id),title,new Date(examAt).toISOString()).run();
   return json({ok:true,title,exam_at:new Date(examAt).toISOString()});
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/exam-countdowns"){
   const rows=await env.DB.prepare("SELECT title,exam_at FROM exam_countdowns WHERE telegram_user_id=? AND exam_at>CURRENT_TIMESTAMP ORDER BY exam_at").bind(String(user.id)).all();
   const items=rows.results??[]; const next=items[0] as {title:string;exam_at:string}|undefined; const days=next?Math.ceil((Date.parse(next.exam_at)-Date.now())/86400000):null;
   return json({ok:true,items,exam_season:Boolean(days!==null&&days<=30),next:next??null});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/resource"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);
   const fileId=text(b.file_id,512),name=text(b.name,180),type=text(b.resource_type,20);
   if(!fileId||!name||!["PYQ","notes","assignment","other"].includes(type))return json({ok:false,error:"invalid_resource"},400);
   const r=await env.DB.prepare("INSERT INTO resources(telegram_user_id,file_id,file_unique_id,name,mime_type,size_bytes,subject,semester,resource_type,status) VALUES(?,?,?,?,?,?,?,?,?,'pending')").bind(String(user.id),fileId,text(b.file_unique_id,256),name,text(b.mime_type,100),Number.isSafeInteger(Number(b.size_bytes))?Number(b.size_bytes):null,text(b.subject,100),text(b.semester,30),type).run();
   return json({ok:true,id:r.meta.last_row_id,status:"pending"},201);
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/resource/report"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);const id=safeId(b.resource_id);if(!id)return json({ok:false,error:"invalid_resource"},400);
   const row=await env.DB.prepare("SELECT id FROM resources WHERE id=? AND status='published'").bind(id).first();if(!row)return json({ok:false,error:"not_found"},404);
   const r=await env.DB.prepare("INSERT OR IGNORE INTO resource_reports(resource_id,telegram_user_id,reason) VALUES(?,?,?)").bind(id,String(user.id),text(b.reason,80)||"other").run();if(Number(r.meta.changes??0))await env.DB.prepare("UPDATE resources SET status='review' WHERE id=? AND (SELECT COUNT(*) FROM resource_reports WHERE resource_id=?)>=3").bind(id,id).run();
   return json({ok:true});
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/resources"){
   const rows=await env.DB.prepare("SELECT id,name,mime_type,size_bytes,subject,semester,resource_type,created_at FROM resources WHERE status='published' ORDER BY created_at DESC LIMIT 50").all();return json({ok:true,items:rows.results??[],trust:"student-reported"});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/event"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);
   const title=text(b.title,160),starts=text(b.starts_at,50);if(title.length<2||!Number.isFinite(Date.parse(starts)))return json({ok:false,error:"invalid_event"},400);
   const r=await env.DB.prepare("INSERT INTO campus_events(title,description,starts_at,ends_at,location,community_slug,created_by,official,status) VALUES(?,?,?,?,?,?,?,0,?)").bind(title,text(b.description,1000),new Date(starts).toISOString(),text(b.ends_at,50)||null,text(b.location,160),text(b.community_slug,60),String(user.id),admin(env,user.id)?"published":"pending").run();
   return json({ok:true,id:r.meta.last_row_id,status:admin(env,user.id)?"published":"pending"},201);
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/events"){
   const rows=await env.DB.prepare("SELECT id,title,description,starts_at,ends_at,location,community_slug,official FROM campus_events WHERE status='published' AND starts_at>=CURRENT_TIMESTAMP ORDER BY starts_at LIMIT 50").all();return json({ok:true,items:rows.results??[]});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/event/reminder"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);const id=safeId(b.event_id);if(!id)return json({ok:false,error:"invalid_event"},400);
   const event=await env.DB.prepare("SELECT id FROM campus_events WHERE id=? AND status='published' AND starts_at>CURRENT_TIMESTAMP").bind(id).first();if(!event)return json({ok:false,error:"event_not_found"},404);
   await env.DB.prepare("INSERT INTO event_reminders(event_id,telegram_user_id,enabled,sent_at) VALUES(?,?,?,NULL) ON CONFLICT(event_id,telegram_user_id) DO UPDATE SET enabled=excluded.enabled,sent_at=NULL").bind(id,String(user.id),b.enabled===false?0:1).run();return json({ok:true,enabled:b.enabled!==false});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/event/rsvp"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);const id=safeId(b.event_id);if(!id)return json({ok:false,error:"invalid_event"},400);
   const event=await env.DB.prepare("SELECT id FROM campus_events WHERE id=? AND status='published' AND starts_at>CURRENT_TIMESTAMP").bind(id).first();if(!event)return json({ok:false,error:"event_not_found"},404);
   await env.DB.prepare("INSERT INTO event_rsvps(event_id,telegram_user_id,interested) VALUES(?,?,?) ON CONFLICT(event_id,telegram_user_id) DO UPDATE SET interested=excluded.interested").bind(id,String(user.id),b.interested===false?0:1).run();return json({ok:true,interested:b.interested!==false});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/listing"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);const kind=text(b.kind,20);const title=text(b.title,160),content=text(b.body,2000);const expires=text(b.expires_at,50);
   if(!["lost_found","ride","roommate"].includes(kind)||title.length<2||!content||!Number.isFinite(Date.parse(expires))||new Date(expires).getTime()<=Date.now())return json({ok:false,error:"invalid_listing"},400);
   const r=await env.DB.prepare("INSERT INTO expiring_listings(telegram_user_id,kind,title,body,expires_at) VALUES(?,?,?,?,?)").bind(String(user.id),kind,title,content,new Date(expires).toISOString()).run();return json({ok:true,id:r.meta.last_row_id},201);
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/listings"){
   await env.DB.prepare("UPDATE expiring_listings SET status='expired' WHERE status='published' AND expires_at<=CURRENT_TIMESTAMP").run();
   const rows=await env.DB.prepare("SELECT id,kind,title,body,expires_at,resolved_at,created_at FROM expiring_listings WHERE status='published' AND expires_at>CURRENT_TIMESTAMP ORDER BY expires_at LIMIT 50").all();return json({ok:true,items:rows.results??[],trust:"student-reported"});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/listing/resolve"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);const id=safeId(b.id);if(!id)return json({ok:false,error:"invalid_listing"},400);
   const row=await env.DB.prepare("SELECT telegram_user_id FROM expiring_listings WHERE id=?").bind(id).first<{telegram_user_id:string}>();if(!row)return json({ok:false,error:"not_found"},404);if(row.telegram_user_id!==String(user.id)&&!admin(env,user.id))return json({ok:false,error:"forbidden"},403);
   await env.DB.prepare("UPDATE expiring_listings SET status='resolved',resolved_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();return json({ok:true,resolved:true});
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/share-card"){
   const points=await env.DB.prepare("SELECT points FROM community_reputation WHERE telegram_user_id=?").bind(String(user.id)).first<{points:number}>();
   const posts=await env.DB.prepare("SELECT COUNT(*) count FROM community_items WHERE telegram_user_id=? AND status='published'").bind(String(user.id)).first<{count:number}>();
   const replies=await env.DB.prepare("SELECT COUNT(*) count FROM community_replies WHERE telegram_user_id=? AND status='published'").bind(String(user.id)).first<{count:number}>();
   return json({ok:true,card:{title:"VGU Pulse student card",points:Number(points?.points??0),posts:Number(posts?.count??0),replies:Number(replies?.count??0),trust:"student-community"}});
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/growth/top"){
   const rows=await env.DB.prepare("SELECT i.id,i.title,(SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=1) upvotes,(SELECT COUNT(*) FROM community_replies r WHERE r.item_id=i.id AND r.status='published') replies,(SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=-1) downvotes,i.created_at FROM community_items i WHERE i.status='published' ORDER BY (upvotes+2*replies-downvotes) DESC,i.created_at DESC LIMIT 5").all();return json({ok:true,items:rows.results??[],share_prefix:"vgu-pulse"});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/teacher-review"){
   const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);const teacher=text(b.teacher,120),elective=text(b.elective,120);const vals=[Number(b.teaching),Number(b.workload),Number(b.support)];
   if(teacher.length<2||elective.length<2||vals.some(v=>!Number.isInteger(v)||v<1||v>5))return json({ok:false,error:"invalid_review"},400);
   await env.DB.prepare("INSERT INTO teacher_reviews(telegram_user_id,teacher,elective,teaching,workload,support,comment) VALUES(?,?,?,?,?,?,?)").bind(String(user.id),teacher,elective,vals[0],vals[1],vals[2],text(b.comment,500)).run();return json({ok:true,status:"pending"},201);
  }
  if(request.method==="GET"&&u.pathname==="/api/v4/teacher-reviews"){
   const teacher=text(u.searchParams.get("teacher"),120),elective=text(u.searchParams.get("elective"),120);if(!teacher||!elective)return json({ok:false,error:"invalid_review_query"},400);
   const row=await env.DB.prepare("SELECT COUNT(*) count,ROUND(AVG(teaching),2) teaching,ROUND(AVG(workload),2) workload,ROUND(AVG(support),2) support FROM teacher_reviews WHERE teacher=? AND elective=? AND status='published'").bind(teacher,elective).first<Record<string,number>>();
   if(Number(row?.count??0)<5)return json({ok:true,ratings:null,minimum:5});
   return json({ok:true,ratings:row});
  }
  if(request.method==="POST"&&u.pathname==="/api/v4/moderate"){
   if(!admin(env,user.id))return json({ok:false,error:"forbidden"},403);const b=await body<Record<string,unknown>>(request);if(!b)return json({ok:false,error:"invalid_json"},400);
   const type=text(b.type,20),id=safeId(b.id),status=text(b.status,20);if(!id||!["resource","event","review"].includes(type)||!["published","hidden","review","pending","cancelled"].includes(status))return json({ok:false,error:"invalid_moderation"},400);
   const table=type==="resource"?"resources":type==="event"?"campus_events":"teacher_reviews";await env.DB.prepare(`UPDATE ${table} SET status=? WHERE id=?`).bind(status,id).run();return json({ok:true});
  }
  return json({ok:false,error:"not_found"},404);
 }catch(error){const requestId=crypto.randomUUID();console.error(JSON.stringify({event:"features_v4_error",request_id:requestId,error:error instanceof Error?error.message:"unknown"}));return json({ok:false,error:"internal_error",request_id:requestId},500)}
}
