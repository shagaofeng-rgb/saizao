import assert from "node:assert/strict";
import { inferTrafficSource } from "../lib/traffic-source.ts";

assert.equal(inferTrafficSource("https://l.facebook.com/l.php?u=example", ""), "meta-referral");
assert.equal(inferTrafficSource("https://www.google.com/search?q=fragrance", ""), "google-referral");
assert.equal(inferTrafficSource("https://gemini.google.com/app", ""), "gemini.google.com");
assert.equal(inferTrafficSource("https://google.com.evil.example/", ""), "google.com.evil.example");
assert.equal(inferTrafficSource("https://www.szxj6899.com/products", ""), null);
assert.equal(inferTrafficSource("https://l.facebook.com/", "paid-social"), "paid-social");
assert.equal(inferTrafficSource("javascript:alert(1)", ""), null);
console.log("Traffic source classification verified.");
