import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { MissionExperience } from "./mission-experience";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <MissionExperience
    syncMode={user ? "cloud" : "local"}
    accountLabel={user ? <span>☁ 同期中 · {user.email}</span> : <a href={chatGPTSignInPath("/")} target="_top">ChatGPTでログインして願いを同期</a>}
  />;
}
