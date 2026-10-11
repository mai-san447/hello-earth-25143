import type {Metadata} from "next";
import {WatchPanel} from "./watch-panel";
import {env} from "cloudflare:workers";
import {notFound} from "next/navigation";
import {watchEnabled} from "../api/watch/rules.mjs";

export const metadata: Metadata = {title: "見守り | MORUNE 25143", robots: {index: false, follow: false}};
export const dynamic = "force-dynamic";
export default function WatchPage() {
  if (!watchEnabled(env)) notFound();
  return <WatchPanel />;
}
