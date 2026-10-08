import { validateInitData } from "./telegram";

export type AuthEnv={BOT_TOKEN?:string;TELEGRAM_BOT_TOKEN?:string};
export type AuthUser={id:number;username?:string;first_name?:string;last_name?:string};

export function getBotToken(env:AuthEnv):string{return env.BOT_TOKEN??env.TELEGRAM_BOT_TOKEN??"";}
export function json(data:unknown,status=200):Response{
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
export async function readJson<T>(request:Request,maxBytes=32768):Promise<T|null>{
  const length=Number(request.headers.get("content-length")??"0");if(Number.isFinite(length)&&length>maxBytes)return null;
  try{const value=await request.json() as T;return value&&typeof value==="object"?value:null}catch{return null}
}
export function clamp(value:unknown,max:number):string{return typeof value==="string"?value.trim().slice(0,max):"";}
export function safePositiveId(value:unknown):number{const id=Number(value);return Number.isSafeInteger(id)&&id>=1?id:0;}
export async function requireUser(request:Request,env:AuthEnv):Promise<AuthUser|null>{
  const token=getBotToken(env);if(!token)return null;
  const validated=await validateInitData(request.headers.get("x-telegram-init-data")??"",token);
  return validated?.user??null;
}
