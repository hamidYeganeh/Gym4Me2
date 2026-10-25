"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "@repo/i18n";
import { DownloadPhoneScreen } from "./DownloadPhoneScreen";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { downloadScenes } from "./LandingDownload.data";
import { createPhoneRenderer } from "./phone-renderer";
import type { PhoneMeasurements } from "./LandingDownload.types";
import styles from "./LandingDownload.module.css";

const modulo = (value: number) =>
  ((value % downloadScenes.length) + downloadScenes.length) %
  downloadScenes.length;
const sceneNames = ["discover", "class", "schedule"] as const;

export function DownloadScene({ autoPlay }: { autoPlay: boolean }) {
  const t = useTranslations("Website.download");
  const common = useTranslations("Website");
  const locale = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const perspectiveRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<PhoneMeasurements | null>(
    null,
  );
  const [sceneIndex, setSceneIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const reducedRef = useRef(false);
  const rotationRef = useRef({
    angle: -14,
    target: -14,
    clock: 0,
    turn: 0,
    offset: 0,
    scene: 0,
  });
  const dragRef = useRef<{ id: number; x: number; angle: number } | null>(null);
  const scene = downloadScenes[sceneIndex] ?? downloadScenes[0];
  const sceneName = sceneNames[sceneIndex] ?? "discover";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let frame = 0;
    let last = performance.now();
    let inView = false;
    let phone: Awaited<ReturnType<typeof createPhoneRenderer>> | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reducedRef.current = motion.matches;
    };
    onMotion();
    motion.addEventListener("change", onMotion);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
      },
      { rootMargin: "120px" },
    );
    intersection.observe(host);

    function resize() {
      phone?.resize();
      if (perspectiveRef.current)
        perspectiveRef.current.style.perspective = `${(host!.clientHeight / 16.06) * 28}px`;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!phone || !inView || document.hidden) return;
      const rotation = rotationRef.current;
      if (!dragRef.current) {
        if (Math.abs(rotation.angle - rotation.target) > 0.5) {
          rotation.angle +=
            (rotation.target - rotation.angle) *
            (1 - Math.pow(0.5, delta / 0.2));
        } else {
          rotation.angle = rotation.target;
          if (
            autoPlay &&
            !pausedRef.current &&
            !hoveredRef.current &&
            !focusedRef.current &&
            !reducedRef.current
          ) {
            rotation.clock += delta;
            if (rotation.clock >= 4.5) {
              rotation.target -= 360;
              rotation.clock = 0;
            }
          }
        }
      }
      const turn = Math.floor(-rotation.angle / 360 + 0.5);
      if (turn !== rotation.turn) {
        rotation.turn = turn;
        rotation.scene = modulo(rotation.offset + turn);
        setSceneIndex(rotation.scene);
      }
      const scale = host!.clientHeight / 760;
      const cosine = Math.cos((rotation.angle * Math.PI) / 180);
      if (propsRef.current) {
        propsRef.current.style.transform = `scale3d(${scale},${scale},${scale}) rotateY(${rotation.angle}deg)`;
        propsRef.current.style.setProperty(
          "--prop-scale",
          String(Math.max(0, cosine)),
        );
        propsRef.current.style.setProperty(
          "--peek-scale",
          String(Math.min(1, Math.max(0, cosine / 0.309))),
        );
      }
      const screenTransform = phone.render(rotation.angle);
      if (screenRef.current) {
        screenRef.current.style.transform = screenTransform;
        screenRef.current.style.visibility = cosine > 0 ? "visible" : "hidden";
      }
    }

    createPhoneRenderer(host)
      .then((loaded) => {
        if (cancelled) {
          loaded.dispose();
          return;
        }
        phone = loaded;
        setMeasurements(loaded.measurements);
        resize();
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", onMotion);
      phone?.dispose();
    };
  }, [autoPlay]);

  function advance(direction: number) {
    const rotation = rotationRef.current;
    rotation.clock = 0;
    if (reducedRef.current || failed) {
      rotation.offset = modulo(rotation.scene + direction);
      rotation.scene = rotation.offset;
      rotation.angle = rotation.target = -14;
      rotation.turn = 0;
      setSceneIndex(rotation.scene);
    } else rotation.target -= direction * 360;
  }

  function togglePause() {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      !measurements ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as Element).closest("button")
    )
      return;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      angle: rotationRef.current.angle,
    };
    rotationRef.current.clock = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) > 125) advance(distance < 0 ? 1 : -1);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* A cancelled pointer may already be released. */
    }
  }

  return (
    <div
      className={styles.stage}
      tabIndex={0}
      role="group"
      aria-roledescription={common("carousel")}
      aria-label={t("instructions")}
      data-ready={!!measurements}
      data-scene={scene.id}
      onPointerDown={pointerDown}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag && !reducedRef.current)
          rotationRef.current.angle =
            drag.angle + (event.clientX - drag.x) * 0.7;
      }}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onFocusCapture={() => {
        focusedRef.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          focusedRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          advance((event.key === "ArrowRight") !== (locale === "fa") ? 1 : -1);
        }
        if (event.key === " ") {
          event.preventDefault();
          togglePause();
        }
      }}
    >
      <div ref={hostRef} className={styles.canvas} />
      {failed && (
        <div
          className={styles.fallbackPhone}
          role="img"
          aria-label={t("poster")}
        >
          <DownloadPhoneScreen scene={sceneName} />
        </div>
      )}
      {measurements && (
        <div
          ref={perspectiveRef}
          className={styles.perspective}
          aria-hidden="true"
        >
          <div ref={propsRef} className={styles.scenePlane}>
            {scene.props.map((prop) => (
              <div
                key={prop.id}
                className={styles.floatingProp}
                style={{
                  left: prop.x - prop.size / 2,
                  top: prop.y - prop.size / 2,
                  width: prop.size,
                  height: prop.size,
                  transform: `scale(var(--prop-scale,1)) translateZ(${prop.z}px) rotate(${prop.rot}deg)`,
                }}
              >
                <Image
                  src={prop.iconUrl}
                  alt=""
                  fill
                  sizes="180px"
                  draggable={false}
                />
              </div>
            ))}
            <div
              className={styles.review}
              style={{
                left: scene.peek.x - scene.peek.width / 2,
                top: scene.peek.y - 70,
                width: scene.peek.width,
                transform: `scale(var(--peek-scale,1)) translateZ(${scene.peek.z}px) rotate(${scene.peek.rot}deg)`,
              }}
            >
              <div className={styles.previewCardLabel}>
                {t(`previewCards.${sceneName}.label`)}
              </div>
              <strong className={styles.previewCardTitle}>
                {t(`previewCards.${sceneName}.title`)}
              </strong>
              <p>{t(`previewCards.${sceneName}.description`)}</p>
            </div>
          </div>
        </div>
      )}
      {measurements && (
        <div className={styles.screenProjection} aria-hidden="true">
          <div ref={screenRef} className={styles.screenFrame}>
            <div className={styles.screenClip}>
              <DownloadPhoneScreen scene={sceneName} />
            </div>
          </div>
        </div>
      )}
      {!failed && (
        <button
          type="button"
          className={styles.playback}
          onClick={togglePause}
          aria-label={t(paused ? "play" : "pause")}
          aria-pressed={paused}
        >
          {common(paused ? "play" : "pause")}
        </button>
      )}
      <span className="sr-only" aria-live={paused ? "polite" : "off"}>
        {t("preview", { name: t(`phone.${sceneName}`) })}
      </span>
    </div>
  );
}
