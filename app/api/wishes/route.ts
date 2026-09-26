import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { wishes } from "../../../db/schema";
import { and, eq, inArray } from "drizzle-orm";

const validStatuses = new Set(["waiting", "returned", "doing", "later", "expired", "done"]);
const validWishId = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:"ログインが必要です。"}, {status:401});
  try {
    const rows = await getDb().select().from(wishes).where(eq(wishes.userId,user.userId));
    return Response.json(rows.map(({userId:_userId,...item})=>item));
  } catch (error) { console.error("wishes GET",error); return Response.json({error:"願いを読み込めません。"},{status:503}); }
}
export async function POST(request:Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:"ログインが必要です。"}, {status:401});
  let body:Record<string,unknown>;
  try { body = await request.json(); } catch { return Response.json({error:"入力を確認してください。"},{status:400}); }
  const {id,text:content,status,createdAt,updatedAt} = body;
  // Keep accepting longer legacy entries so local-to-cloud migration does not lose them.
  if (typeof id !== "string" || !validWishId.test(id) || typeof content !== "string" || content.length > 180 || !validStatuses.has(String(status)) || !Number.isSafeInteger(createdAt) || !Number.isSafeInteger(updatedAt)) return Response.json({error:"入力を確認してください。"},{status:400});
  try {
    const row={userId:user.userId,id,text:content,status:String(status),createdAt:Number(createdAt),updatedAt:Number(updatedAt)};
    await getDb().insert(wishes).values(row).onConflictDoUpdate({target:[wishes.userId,wishes.id],set:{text:row.text,status:row.status,updatedAt:row.updatedAt}});
    return Response.json({ok:true});
  } catch (error) { console.error("wishes POST",error); return Response.json({error:"保存できませんでした。"},{status:503}); }
}

export async function DELETE(request:Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:"ログインが必要です。"}, {status:401});
  let body:Record<string,unknown>;
  try { body = await request.json(); } catch { return Response.json({error:"削除対象を確認してください。"},{status:400}); }
  const deleteAll = body.all === true && body.ids === undefined;
  const ids = body.ids;
  const deleteSelected = Array.isArray(ids) && ids.length > 0 && ids.length <= 300 && ids.every(id => typeof id === "string" && validWishId.test(id));
  if (!deleteAll && !deleteSelected) return Response.json({error:"削除対象を確認してください。"},{status:400});
  try {
    const condition = deleteAll
      ? eq(wishes.userId,user.userId)
      : and(eq(wishes.userId,user.userId),inArray(wishes.id,ids as string[]));
    await getDb().delete(wishes).where(condition);
    return Response.json({ok:true,deleted:deleteAll?"all":ids.length});
  } catch (error) { console.error("wishes DELETE",error); return Response.json({error:"削除できませんでした。"},{status:503}); }
}
