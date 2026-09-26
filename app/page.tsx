import { chatGPTSignInPath, chatGPTSyncEnabled, getChatGPTUser } from "./chatgpt-auth";
import { MissionExperience } from "./mission-experience";

export const dynamic = "force-dynamic";

export default async function Home() {
  const syncEnabled = chatGPTSyncEnabled();
  const user = syncEnabled ? await getChatGPTUser() : null;
  return <MissionExperience
    syncMode={user ? "cloud" : "local"}
    accountLabel={user ? <span>☁ 同期中 · {user.email}</span> : <>
      <span>ゲスト利用中 · 願いはこの端末に保存</span>
      {syncEnabled && <>
        <br />
        <a href={chatGPTSignInPath("/")} target="_top">ログインして端末間で同期</a>
      </>}
    </>}
  />;
}
