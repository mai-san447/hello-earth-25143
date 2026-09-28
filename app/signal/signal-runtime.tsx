'use client';

import { useEffect } from "react";

// mission-runtime と同じく、画面の動きは public/signal.js に置いて読み込む
export function SignalRuntime() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/signal.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return null;
}
