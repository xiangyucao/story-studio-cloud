import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { characters, characterRelationships, logicLinks, timelineEvents, worldEntries, works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";
import { createId } from "@/lib/ids";

type Body = Record<string, unknown> & { kind?: string; id?: string };

async function authorized(id: string) {
  const user=await getChatGPTUser();
  if(!user) return {error:Response.json({error:"需要登录"},{status:401})};
  if(!await ownedWork(id,user.email)) return {error:Response.json({error:"作品不存在"},{status:404})};
  return {user};
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,auth=await authorized(id);if(auth.error)return auth.error;
  const body=await request.json() as Body,db=getDb(),now=new Date().toISOString();
  let item:unknown;
  if(body.kind==="character") [item]=await db.insert(characters).values({id:createId("chr"),workId:id,name:required(body.name,"name"),role:text(body.role),description:text(body.description),personality:text(body.personality),goal:text(body.goal),createdAt:now,updatedAt:now}).returning();
  else if(body.kind==="relationship") {const source=required(body.sourceCharacterId,"sourceCharacterId"),target=required(body.targetCharacterId,"targetCharacterId");if(source===target)return Response.json({error:"人物不能与自己建立关系"},{status:400});[item]=await db.insert(characterRelationships).values({id:createId("rel"),workId:id,sourceCharacterId:source,targetCharacterId:target,relationship:required(body.relationship,"relationship"),description:text(body.description),createdAt:now,updatedAt:now}).returning();}
  else if(body.kind==="world") [item]=await db.insert(worldEntries).values({id:createId("wld"),workId:id,category:text(body.category)||"背景",title:required(body.title,"title"),content:text(body.content),isHardSetting:Boolean(body.isHardSetting),createdAt:now,updatedAt:now}).returning();
  else if(body.kind==="timeline") [item]=await db.insert(timelineEvents).values({id:createId("evt"),workId:id,position:number(body.position,1),timeLabel:text(body.timeLabel),title:required(body.title,"title"),content:text(body.content),createdAt:now,updatedAt:now}).returning();
  else if(body.kind==="logic") [item]=await db.insert(logicLinks).values({id:createId("lnk"),workId:id,fromRef:required(body.fromRef,"fromRef"),relation:required(body.relation,"relation"),toRef:required(body.toRef,"toRef"),notes:text(body.notes),status:"active",createdAt:now,updatedAt:now}).returning();
  else return Response.json({error:"未知设定类型"},{status:400});
  await db.update(works).set({updatedAt:now}).where(eq(works.id,id));return Response.json({item},{status:201});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,auth=await authorized(id);if(auth.error)return auth.error;
  const body=await request.json() as Body,itemId=required(body.id,"id"),db=getDb(),updatedAt=new Date().toISOString();let item:unknown;
  if(body.kind==="character") [item]=await db.update(characters).set({name:required(body.name,"name"),role:text(body.role),description:text(body.description),personality:text(body.personality),goal:text(body.goal),updatedAt}).where(and(eq(characters.id,itemId),eq(characters.workId,id))).returning();
  else if(body.kind==="relationship") [item]=await db.update(characterRelationships).set({sourceCharacterId:required(body.sourceCharacterId,"sourceCharacterId"),targetCharacterId:required(body.targetCharacterId,"targetCharacterId"),relationship:required(body.relationship,"relationship"),description:text(body.description),updatedAt}).where(and(eq(characterRelationships.id,itemId),eq(characterRelationships.workId,id))).returning();
  else if(body.kind==="world") [item]=await db.update(worldEntries).set({category:text(body.category)||"背景",title:required(body.title,"title"),content:text(body.content),isHardSetting:Boolean(body.isHardSetting),updatedAt}).where(and(eq(worldEntries.id,itemId),eq(worldEntries.workId,id))).returning();
  else if(body.kind==="timeline") [item]=await db.update(timelineEvents).set({position:number(body.position,1),timeLabel:text(body.timeLabel),title:required(body.title,"title"),content:text(body.content),updatedAt}).where(and(eq(timelineEvents.id,itemId),eq(timelineEvents.workId,id))).returning();
  else if(body.kind==="logic") [item]=await db.update(logicLinks).set({fromRef:required(body.fromRef,"fromRef"),relation:required(body.relation,"relation"),toRef:required(body.toRef,"toRef"),notes:text(body.notes),updatedAt}).where(and(eq(logicLinks.id,itemId),eq(logicLinks.workId,id))).returning();
  else return Response.json({error:"未知设定类型"},{status:400});
  if(!item)return Response.json({error:"条目不存在"},{status:404});await db.update(works).set({updatedAt}).where(eq(works.id,id));return Response.json({item});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,auth=await authorized(id);if(auth.error)return auth.error;
  const url=new URL(request.url),kind=url.searchParams.get("kind"),itemId=url.searchParams.get("itemId");if(!kind||!itemId)return Response.json({error:"缺少参数"},{status:400});const db=getDb();
  if(kind==="character") await db.delete(characters).where(and(eq(characters.id,itemId),eq(characters.workId,id)));
  else if(kind==="relationship") await db.delete(characterRelationships).where(and(eq(characterRelationships.id,itemId),eq(characterRelationships.workId,id)));
  else if(kind==="world") await db.delete(worldEntries).where(and(eq(worldEntries.id,itemId),eq(worldEntries.workId,id)));
  else if(kind==="timeline") await db.delete(timelineEvents).where(and(eq(timelineEvents.id,itemId),eq(timelineEvents.workId,id)));
  else if(kind==="logic") await db.delete(logicLinks).where(and(eq(logicLinks.id,itemId),eq(logicLinks.workId,id)));
  else return Response.json({error:"未知设定类型"},{status:400});return new Response(null,{status:204});
}

function text(value:unknown){return typeof value==="string"?value.trim():"";}function required(value:unknown,label:string){const result=text(value);if(!result)throw new Error(`${label} 不能为空`);return result;}function number(value:unknown,fallback:number){const result=Number(value);return Number.isFinite(result)?Math.max(1,Math.round(result)):fallback;}
