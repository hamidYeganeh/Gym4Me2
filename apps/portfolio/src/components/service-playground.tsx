"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { Arrow } from "./icons";

const labels = [
  ["Websites", "websites"], ["Brand Systems", "brand-systems"],
  ["Copywriting", "copywriting"], ["Social Media", "social-media"],
  ["Mobile Apps", "mobile-apps"], ["Digital Products", "digital-products"],
  ["Landing Pages", "landing-pages"], ["Product Design", "product-design"], ["Logos", "logos"],
] as const;

type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; angle: number; spin: number; el: HTMLAnchorElement };
type Drag = { index: number; offsetX: number; offsetY: number; startX: number; startY: number; lastX: number; lastY: number; time: number; moved: boolean };

// Separating axis collision detection keeps the rotated pills from intersecting.
function collision(a: Body, b: Body) {
  const axes = [a.angle, a.angle + Math.PI / 2, b.angle, b.angle + Math.PI / 2];
  let overlap = Infinity; let nx = 0; let ny = 0;
  for (const axis of axes) {
    const x = Math.cos(axis); const y = Math.sin(axis);
    const radiusA = Math.abs(Math.cos(a.angle - axis)) * a.w / 2 + Math.abs(Math.sin(a.angle - axis)) * a.h / 2;
    const radiusB = Math.abs(Math.cos(b.angle - axis)) * b.w / 2 + Math.abs(Math.sin(b.angle - axis)) * b.h / 2;
    const distance = (b.x - a.x) * x + (b.y - a.y) * y;
    const penetration = radiusA + radiusB - Math.abs(distance);
    if (penetration <= 0) return null;
    if (penetration < overlap) { overlap = penetration; nx = distance < 0 ? -x : x; ny = distance < 0 ? -y : y; }
  }
  return { overlap, nx, ny };
}

export function ServicePlayground() {
  const world = useRef<HTMLDivElement>(null);
  const bodies = useRef<Body[]>([]);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const scene = world.current;
    if (!scene) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = scene.clientWidth; let height = scene.clientHeight;
    let frame = 0; let visible = false; let previous = 0; let elapsed = 0;
    function reset() {
      width = scene!.clientWidth; height = scene!.clientHeight;
      const links = [...scene!.querySelectorAll<HTMLAnchorElement>("a")];
      bodies.current = links.map((el, index) => {
        const row = index < 4 ? 0 : index < 7 ? 1 : 2;
        const col = index < 4 ? index : index < 7 ? index - 4 : index - 7;
        const cols = row === 0 ? 4 : row === 1 ? 3 : 2;
        const w = el.offsetWidth; const h = el.offsetHeight;
        const finalX = width * .5 + (col - (cols - 1) / 2) * Math.min(w + 12, width / (cols + 1));
        return { x: Math.max(w / 2 + 8, Math.min(width - w / 2 - 8, finalX)), y: reduced.matches ? height - h / 2 - row * (h + 5) : -100 - index * 76, w, h, vx: (index % 2 ? -1 : 1) * 20, vy: 0, angle: reduced.matches ? (index % 3 - 1) * .14 : (index % 5 - 2) * .22, spin: (index % 3 - 1) * .12, el };
      });
      elapsed = 0;
      paint();
    }
    function paint() { bodies.current.forEach(b => { b.el.style.transform = `translate3d(${b.x - b.w / 2}px,${b.y - b.h / 2}px,0) rotate(${b.angle}rad)`; }); }
    function tick(time: number) {
      frame = 0;
      if (!visible || document.hidden || reduced.matches) return;
      const dt = Math.min((time - (previous || time - 16)) / 1000, .025); previous = time; elapsed += dt;
      const list = bodies.current;
      for (let step = 0; step < 3; step++) {
        const delta = dt / 3;
        for (const [index, body] of list.entries()) {
          if (index === drag.current?.index) continue;
          body.vy += 1050 * delta;
          body.vx *= .998; body.spin *= .995;
          body.x += body.vx * delta; body.y += body.vy * delta; body.angle += body.spin * delta;
          const rx = Math.abs(Math.cos(body.angle)) * body.w / 2 + Math.abs(Math.sin(body.angle)) * body.h / 2;
          const ry = Math.abs(Math.sin(body.angle)) * body.w / 2 + Math.abs(Math.cos(body.angle)) * body.h / 2;
          if (body.y + ry > height - 2) { body.y = height - 2 - ry; body.vy = -Math.abs(body.vy) * .15; body.vx *= .94; body.spin *= .8; }
          if (body.x - rx < 2) { body.x = rx + 2; body.vx = Math.abs(body.vx) * .3; }
          if (body.x + rx > width - 2) { body.x = width - rx - 2; body.vx = -Math.abs(body.vx) * .3; }
        }
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          const a = list[i]!; const b = list[j]!;
          if (a.y < -150 || b.y < -150) continue;
          const c = collision(a, b); if (!c) continue;
          const aFree = i !== drag.current?.index; const bFree = j !== drag.current?.index;
          const divisor = Number(aFree) + Number(bFree); if (!divisor) continue;
          const fix = Math.max(0, c.overlap - .1) / divisor * .8;
          if (aFree) { a.x -= c.nx * fix; a.y -= c.ny * fix; }
          if (bFree) { b.x += c.nx * fix; b.y += c.ny * fix; }
          const speed = (b.vx - a.vx) * c.nx + (b.vy - a.vy) * c.ny;
          if (speed < 0) {
            const impulse = -speed * 1.12 / divisor;
            if (aFree) { a.vx -= impulse * c.nx; a.vy -= impulse * c.ny; a.spin += c.nx * .035; }
            if (bFree) { b.vx += impulse * c.nx; b.vy += impulse * c.ny; b.spin -= c.nx * .035; }
          }
        }
      }
      paint();
      if (elapsed < 16 || drag.current) frame = requestAnimationFrame(tick);
    }
    function start() { if (!frame && visible && !document.hidden && !reduced.matches) { previous = 0; elapsed = 0; frame = requestAnimationFrame(tick); } }
    const wake = () => start(); scene.addEventListener("pointerdown", wake);
    const observer = new IntersectionObserver(([entry]) => { visible = !!entry?.isIntersecting; if (visible) start(); else { cancelAnimationFrame(frame); frame = 0; } }, { threshold: .05 });
    const resize = new ResizeObserver(() => { reset(); start(); }); resize.observe(scene); observer.observe(scene);
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); };
    document.addEventListener("visibilitychange", onVisibility); reduced.addEventListener("change", reset); reset();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); scene.removeEventListener("pointerdown", wake); reduced.removeEventListener("change", reset); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  function pointerDown(event: PointerEvent<HTMLAnchorElement>, index: number) {
    const body = bodies.current[index]; const scene = world.current; if (!body || !scene) return;
    const rect = scene.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    suppressClick.current = false;
    drag.current = { index, offsetX: x - body.x, offsetY: y - body.y, startX: x, startY: y, lastX: x, lastY: y, time: event.timeStamp, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLAnchorElement>) {
    const held = drag.current; const scene = world.current; if (!held || !scene) return;
    const body = bodies.current[held.index]!; const rect = scene.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    const now = event.timeStamp; const dt = Math.max(16, now - held.time) / 1000;
    body.vx = Math.max(-900, Math.min(900, (x - held.lastX) / dt)); body.vy = Math.max(-900, Math.min(900, (y - held.lastY) / dt));
    body.x = Math.max(body.w / 2, Math.min(rect.width - body.w / 2, x - held.offsetX)); body.y = Math.max(body.h / 2, Math.min(rect.height - body.h / 2, y - held.offsetY));
    if (Math.hypot(x - held.startX, y - held.startY) > 7) held.moved = true;
    held.lastX = x; held.lastY = y; held.time = now;
    body.el.style.transform = `translate3d(${body.x - body.w / 2}px,${body.y - body.h / 2}px,0) rotate(${body.angle}rad)`;
  }
  function pointerUp(event: PointerEvent<HTMLAnchorElement>) {
    if (drag.current) suppressClick.current = drag.current.moved;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <section className="service-playground" aria-labelledby="all-services-heading">
    <div className="container playground-header"><h2 id="all-services-heading">ALL YOUR<em>design needs</em></h2><div><p>From the first page to the<br />complete product.</p><Link className="button button-white" href="/services">SEE ALL SERVICES <Arrow /></Link></div></div>
    <p className="sr-only">Drag and toss the labels, or select a service to learn more.</p>
    <div ref={world} className="container pill-world">{labels.map(([label, id], index) => <Link key={id} className="service-pill" href={`/services#${id}`} draggable={false} onPointerDown={event => pointerDown(event, index)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onClick={event => { if (suppressClick.current) { event.preventDefault(); suppressClick.current = false; } }}>{label}</Link>)}</div>
  </section>;
}
