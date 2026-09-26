'use client';

import { useEffect } from "react";

export function MissionRuntime() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/mission.js";
    script.async = true;
    document.body.append(script);
    return () => script.remove();
  }, []);

  return null;
}
