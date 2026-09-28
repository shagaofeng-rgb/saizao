"use client";
import { useEffect } from "react";
import { writeCart } from "@/lib/retail-cart";
export function ClearCartAfterOrder() { useEffect(() => { writeCart([]); }, []); return null; }
