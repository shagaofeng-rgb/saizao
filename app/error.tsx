"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main id="main-content" className="system-state system-state-full"><span>Temporary error</span><h1>We could not load this page.</h1><p>Your project information has not been submitted or changed. Try loading the page again.</p><div><button className="button" type="button" onClick={reset}>Try again</button><Link className="text-link" href="/">Return home</Link></div></main>;
}
