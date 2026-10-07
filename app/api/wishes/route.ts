import { errorKind } from "../error-kind.mjs";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseAdmin } from "../../supabase";

const validStatuses = new Set(["waiting", "returned", "doing", "later", "expired", "done"]);
const validWishId = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:"ログインが必要です。"}, {status:401});
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("wishes")
      .select("id, text, status, created_at, updated_at")
      .eq("user_id", user.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return Response.json((data ?? []).map(row => ({
      id: row.id,
      text: row.text,
      status: row.status,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    })));
  } catch (error) { console.error("wishes GET", errorKind(error)); return Response.json({error:"願いを読み込めません。"},{status:503}); }
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
    const { error } = await getSupabaseAdmin().from("wishes").upsert({
      user_id: user.userId,
      id,
      text: content,
      status: String(status),
      created_at: Number(createdAt),
      updated_at: Number(updatedAt),
    }, { onConflict: "user_id,id" });
    if (error) throw error;
    return Response.json({ok:true});
  } catch (error) { console.error("wishes POST", errorKind(error)); return Response.json({error:"保存できませんでした。"},{status:503}); }
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
  const selectedIds = deleteSelected ? ids as string[] : [];
  try {
    const query = getSupabaseAdmin().from("wishes").delete().eq("user_id", user.userId);
    const { error } = deleteAll
      ? await query
      : await query.in("id", selectedIds);
    if (error) throw error;
    return Response.json({ok:true,deleted:deleteAll?"all":selectedIds.length});
  } catch (error) { console.error("wishes DELETE", errorKind(error)); return Response.json({error:"削除できませんでした。"},{status:503}); }
}
