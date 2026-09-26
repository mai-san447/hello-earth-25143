'use client';

import { useEffect } from "react";

export function MissionRuntime() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/mission.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return null;
}
