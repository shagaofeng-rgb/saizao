import Image from "next/image";
import type { ReactNode } from "react";

const publicMediaHost = "pohsefmowgthjskmbkyg.supabase.co";
const publicMediaPath = "/storage/v1/object/public/website-media/";

function safeImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === publicMediaHost && url.pathname.startsWith(publicMediaPath) ? url.toString() : null;
  } catch {
    return null;
  }
}

function inlineText(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = content.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
  return <div className="detail-content">{blocks.map((block, index) => {
    const image = block.match(/^!\[([^\]]{1,180})\]\(([^)]+)\)$/);
    if (image) {
      const src = safeImageUrl(image[2]);
      if (src) return <figure className="detail-figure" key={index}><Image src={src} alt={image[1]} width={1600} height={1200} sizes="(max-width: 780px) 100vw, 820px" /></figure>;
    }
    const heading = block.match(/^(#{2,3})\s+(.+)$/);
    if (heading) return heading[1].length === 2 ? <h2 key={index}>{inlineText(heading[2])}</h2> : <h3 key={index}>{inlineText(heading[2])}</h3>;
    const lines = block.split("\n").map((value) => value.trim()).filter(Boolean);
    if (lines.every((line) => line.startsWith("- "))) return <ul key={index}>{lines.map((line, itemIndex) => <li key={itemIndex}>{inlineText(line.slice(2))}</li>)}</ul>;
    return <p key={index}>{inlineText(lines.join(" "))}</p>;
  })}</div>;
}
