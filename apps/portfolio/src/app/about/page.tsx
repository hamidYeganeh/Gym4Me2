import type { Metadata } from "next";
import { CallToAction, Introduction, Process, StudioGallery } from "@/components/sections";

export const metadata: Metadata = { title: "About" };
export default function About() { return <><StudioGallery /><Process /><Introduction /><CallToAction variant="general" /></>; }
