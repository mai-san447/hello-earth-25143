import { chatGPTSyncEnabled, getChatGPTUser } from "./chatgpt-auth";
import { MissionExperience } from "./mission-experience";

export const dynamic = "force-dynamic";

export default async function Home() {
  const syncEnabled = chatGPTSyncEnabled();
  const user = syncEnabled ? await getChatGPTUser() : null;
  // アカウントの入口は 2026-10-07 に外した。同期の状態（cloud/local）だけを渡す
  return <MissionExperience syncMode={user ? "cloud" : "local"} />;
}
