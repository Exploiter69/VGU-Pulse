import { telegramApi } from "./telegram-bot";

export type NotificationChannel = "official" | "community_replies" | "community_activity" | "personalized";

export interface NotificationPreferences {
  official_updates: boolean;
  community_replies: boolean;
  community_activity: boolean;
  personalized_alerts: boolean;
  enabled_at: string;
}

export interface StudentNotification {
  id: number;
  kind: "official" | "community";
  channel: NotificationChannel;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sent_at: string | null;
}

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function htmlEscape(value: unknown): string {
  return clampText(value, 4000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CHANNEL_PREF: Record<NotificationChannel, keyof NotificationPreferences> = {
  official: "official_updates",
  community_replies: "community_replies",
  community_activity: "community_activity",
  personalized: "personalized_alerts",
};

export async function getNotificationPreferences(db: D1Database,userId:number):Promise<NotificationPreferences>{
  await db.prepare("INSERT OR IGNORE INTO notification_preferences (telegram_user_id) VALUES (?)").bind(String(userId)).run();
  const row=await db.prepare(
    "SELECT official_updates,community_replies,community_activity,personalized_alerts,enabled_at FROM notification_preferences WHERE telegram_user_id=?"
  ).bind(String(userId)).first<Record<string,number|string>>();
  return {
    official_updates:Boolean(row?.official_updates),
    community_replies:Boolean(row?.community_replies),
    community_activity:Boolean(row?.community_activity),
    personalized_alerts:Boolean(row?.personalized_alerts),
    enabled_at:String(row?.enabled_at ?? new Date().toISOString()),
  };
}

export async function setNotificationPreferences(
  db:D1Database,userId:number,input:Partial<Record<"official_updates"|"community_replies"|"community_activity"|"personalized_alerts",boolean>>
):Promise<NotificationPreferences>{
  const current=await getNotificationPreferences(db,userId);
  const read=(key:"official_updates"|"community_replies"|"community_activity"|"personalized_alerts")=>input[key]===undefined
    ? Boolean(current[key])
    : typeof input[key]==="boolean" ? Boolean(input[key]) : (()=>{throw new Error("invalid_preferences")})();
  const next={
    official_updates:read("official_updates"),
    community_replies:read("community_replies"),
    community_activity:read("community_activity"),
    personalized_alerts:read("personalized_alerts"),
  };
  await db.prepare(
    "UPDATE notification_preferences SET official_updates=?,community_replies=?,community_activity=?,personalized_alerts=?,updated_at=CURRENT_TIMESTAMP WHERE telegram_user_id=?"
  ).bind(next.official_updates?1:0,next.community_replies?1:0,next.community_activity?1:0,next.personalized_alerts?1:0,String(userId)).run();
  return {...current,...next};
}

export async function listStudentNotifications(db:D1Database,userId:number,limit=20):Promise<StudentNotification[]>{
  const safeLimit=Math.min(Math.max(Math.trunc(limit),1),50);
  const result=await db.prepare(
    "SELECT id,kind,channel,title,body,created_at,read_at,sent_at FROM student_notifications WHERE telegram_user_id=? ORDER BY created_at DESC,id DESC LIMIT ?"
  ).bind(String(userId),safeLimit).all<StudentNotification>();
  return result.results??[];
}

export async function markStudentNotificationsRead(db:D1Database,userId:number):Promise<void>{
  await db.prepare("UPDATE student_notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE telegram_user_id=? AND read_at IS NULL").bind(String(userId)).run();
}

export async function createCommunityReplyNotification(db:D1Database,postId:number,replyId:number,authorId:number,replyBody:string):Promise<void>{
  const post=await db.prepare("SELECT telegram_user_id,title FROM student_posts WHERE id=? AND status='published'").bind(postId).first<{telegram_user_id:string;title:string}>();
  if(!post||post.telegram_user_id===String(authorId))return;
  const prefs=await db.prepare("SELECT community_replies FROM notification_preferences WHERE telegram_user_id=?").bind(post.telegram_user_id).first<{community_replies:number}>();
  if(!prefs?.community_replies)return;
  await db.prepare(
    "INSERT OR IGNORE INTO student_notifications (telegram_user_id,kind,channel,title,body,reference_key) VALUES (?,'community','community_replies',?,?,?)"
  ).bind(post.telegram_user_id,"New reply to your post",`Someone replied to “${clampText(post.title,120)}”: ${clampText(replyBody,500)}`,`reply:${replyId}`).run();
}

async function queueOfficialNotifications(db:D1Database,signalService:Fetcher):Promise<number>{
  let response:Response;
  try{
    response=await signalService.fetch(new Request("https://vgu-signal-worker/public/information?limit=10",{headers:{accept:"application/json"}}));
    if(!response.ok)return 0;
    const payload=await response.json() as {items?:Array<Record<string,unknown>>;sections?:Array<{items?:Array<Record<string,unknown>>}>};
    const items=payload.items??payload.sections?.flatMap(section=>section.items??[])??[];
    let queued=0;
    for(const item of items.slice(0,10)){
      const title=clampText(item.title,180)||"New verified VGU information";
      const summary=clampText(item.summary,650);
      const source=clampText(item.primary_source_url,500);
      const dateValue=clampText(item.published_at||item.created_at,80);
      const timestamp=Date.parse(dateValue);
      const reference=clampText(item.id,160)||source||title;
      if(!Number.isFinite(timestamp))continue;
      const result=await db.prepare(
        "INSERT OR IGNORE INTO student_notifications (telegram_user_id,kind,channel,title,body,reference_key) SELECT telegram_user_id,'official','official',?,?,? FROM notification_preferences WHERE official_updates=1 AND datetime(enabled_at)<=datetime(?)"
      ).bind(title,summary||"A new verified VGU information item is available in Pulse.",`official:${reference}`,new Date(timestamp).toISOString()).run();
      queued+=Number(result.meta.changes??0);
    }
    return queued;
  }catch{
    return 0;
  }
}

function preferenceSql(channel:NotificationChannel):string{
  return `p.${CHANNEL_PREF[channel]}=1`;
}

export async function runNotificationSweep(db:D1Database,signalService:Fetcher,botToken:string,webAppUrl?:string):Promise<{queued:number;sent:number;failed:number}>{
  if(!botToken)return {queued:0,sent:0,failed:0};
  const queued=await queueOfficialNotifications(db,signalService);

  await db.prepare(
    `DELETE FROM student_notifications n
     WHERE n.sent_at IS NULL AND n.failed_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM notification_preferences p WHERE p.telegram_user_id=n.telegram_user_id AND (
         (n.channel='official' AND ${preferenceSql("official")}) OR
         (n.channel='community_replies' AND ${preferenceSql("community_replies")}) OR
         (n.channel='community_activity' AND ${preferenceSql("community_activity")}) OR
         (n.channel='personalized' AND ${preferenceSql("personalized")})
       ))`
  ).run();

  const pending=await db.prepare(
    `SELECT n.id,n.telegram_user_id,n.title,n.body,n.attempts
     FROM student_notifications n JOIN notification_preferences p ON p.telegram_user_id=n.telegram_user_id
     WHERE n.sent_at IS NULL AND n.failed_at IS NULL AND n.attempts<5 AND (n.retry_at IS NULL OR n.retry_at<=CURRENT_TIMESTAMP) AND (
       (n.channel='official' AND ${preferenceSql("official")}) OR
       (n.channel='community_replies' AND ${preferenceSql("community_replies")}) OR
       (n.channel='community_activity' AND ${preferenceSql("community_activity")}) OR
       (n.channel='personalized' AND ${preferenceSql("personalized")})
     )
     ORDER BY CASE WHEN n.channel='official' THEN 0 ELSE 1 END,n.created_at ASC,n.id ASC
     LIMIT 18`
  ).all<{id:number;telegram_user_id:string;title:string;body:string;attempts:number}>();

  const sentIds:number[]=[];
  const failedIds:number[]=[];
  let sent=0,failed=0;
  const reply_markup=webAppUrl?{inline_keyboard:[[{text:"Open VGU Pulse",web_app:{url:webAppUrl}}]]}:undefined;

  for(const notification of pending.results??[]){
    const chatId=Number(notification.telegram_user_id);
    if(!Number.isSafeInteger(chatId)){failed++;failedIds.push(notification.id);continue;}
    try{
      const response=await telegramApi(botToken,"sendMessage",{
        chat_id:chatId,
        text:`<b>${htmlEscape(notification.title)}</b>\n\n${htmlEscape(notification.body)}`,
        parse_mode:"HTML",reply_markup,
      });
      if(response.status===429){
        const payload=await response.clone().json().catch(()=>({})) as {parameters?:{retry_after?:number}};
        const retryAfter=Number(payload.parameters?.retry_after??0);
        await db.prepare("UPDATE student_notifications SET last_error=?,retry_at=datetime('now', ? || ' seconds') WHERE id=?").bind("telegram_429_retry_after:"+retryAfter,String(Math.max(0,retryAfter)),notification.id).run();
        break;
      }
      if(response.status===403){
        failed++;failedIds.push(notification.id);
        await db.prepare("UPDATE student_notifications SET attempts=5,failed_at=CURRENT_TIMESTAMP,last_error=? WHERE id=?").bind("telegram_403",notification.id).run();
        continue;
      }
      if(!response.ok){
        failed++;
        await db.prepare("UPDATE student_notifications SET attempts=attempts+1,last_error=?,failed_at=CASE WHEN attempts+1>=5 THEN CURRENT_TIMESTAMP ELSE failed_at END WHERE id=?").bind(`telegram_${response.status}`,notification.id).run();
        continue;
      }
      sent++;sentIds.push(notification.id);
    }catch{
      failed++;
      await db.prepare("UPDATE student_notifications SET attempts=attempts+1,last_error=?,failed_at=CASE WHEN attempts+1>=5 THEN CURRENT_TIMESTAMP ELSE failed_at END WHERE id=?").bind("telegram_network_error",notification.id).run();
    }
  }

  if(sentIds.length){
    await db.batch(sentIds.map(id=>db.prepare("UPDATE student_notifications SET sent_at=CURRENT_TIMESTAMP WHERE id=?").bind(id)));
  }
  if(failedIds.length){
    await db.batch(failedIds.map(id=>db.prepare("UPDATE student_notifications SET attempts=5,failed_at=COALESCE(failed_at,CURRENT_TIMESTAMP),last_error=COALESCE(last_error,'telegram_invalid_chat') WHERE id=?").bind(id)));
  }
  return {queued,sent,failed};
}
