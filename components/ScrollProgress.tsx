"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [pathname]);
  if (pathname.startsWith("/admin")) return null;
  return <div className="scroll-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>;
}
