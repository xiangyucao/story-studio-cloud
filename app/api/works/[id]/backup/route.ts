import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";
import { getWorkBundle } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user=await getChatGPTUser(); if(!user) return Response.json({error:"需要登录"},{status:401});
  const {id}=await params; const work=await ownedWork(id,user.email); if(!work) return Response.json({error:"作品不存在"},{status:404});
  const bundle=await getWorkBundle(id); const body={format:"story-studio-cloud-backup",version:1,exportedAt:new Date().toISOString(),work:{...work,ownerEmail:undefined},...bundle};
  const safe=work.title.replace(/[\\/:*?"<>|]/g,"-").slice(0,80)||"story";
  return new Response(JSON.stringify(body,null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":`attachment; filename="story-backup.json"; filename*=UTF-8''${encodeURIComponent(`${safe}-完整云端备份.json`)}`}});
}
