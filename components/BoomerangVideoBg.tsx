"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
};

// Each captured frame is held in memory, so phones capture at a smaller width.
const MAX_WIDTH = 960;
const MAX_WIDTH_MOBILE = 640;
const FRAME_INTERVAL_MS = 1000 / 30;

type VFCVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Plays a video once while capturing its frames into canvases, then replays
 * those frames forward/backward on a canvas for a seamless boomerang loop.
 */
export default function BoomerangVideoBg({ src, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [framesReady, setFramesReady] = useState(false);
  const framesRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    const video = videoRef.current as VFCVideo | null;
    if (!video) return;

    const maxWidth = window.matchMedia("(max-width: 767px)").matches
      ? MAX_WIDTH_MOBILE
      : MAX_WIDTH;
    // Reduced motion: leave the first frame of the paused video on screen.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frames: HTMLCanvasElement[] = [];
    let capturing = true;
    let lastTime = -1;

    const captureFrame = () => {
      if (!capturing || video.readyState < 2) return;
      if (video.currentTime === lastTime) return;
      lastTime = video.currentTime;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const scale = Math.min(1, maxWidth / vw);
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas);
    };

    const hasVFC = typeof video.requestVideoFrameCallback === "function";

    let rafId = 0;
    let vfcId = 0;
    const rafLoop = () => {
      captureFrame();
      if (capturing) rafId = requestAnimationFrame(rafLoop);
    };

    const vfcLoop = () => {
      captureFrame();
      if (capturing && video.requestVideoFrameCallback) {
        vfcId = video.requestVideoFrameCallback(vfcLoop);
      }
    };

    const onEnded = () => {
      capturing = false;
      if (frames.length > 0) {
        framesRef.current = frames;
        setFramesReady(true);
      }
    };

    let started = false;
    const onLoaded = () => {
      if (started) return;
      started = true;
      video.play().catch(() => {});
      if (hasVFC) {
        vfcId = video.requestVideoFrameCallback!(vfcLoop);
      } else {
        rafId = requestAnimationFrame(rafLoop);
      }
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    if (video.readyState >= 1) onLoaded();

    return () => {
      capturing = false;
      cancelAnimationFrame(rafId);
      if (vfcId) video.cancelVideoFrameCallback?.(vfcId);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    if (!framesReady) return;
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frames = framesRef.current;
    if (frames.length === 0) return;

    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    let rafId = 0;
    let visible = true;

    // Stop drawing while the hero is scrolled out of view.
    const observer = new IntersectionObserver(([entry]) => {
      const nowVisible = entry.isIntersecting;
      if (nowVisible && !visible) rafId = requestAnimationFrame(render);
      if (!nowVisible) cancelAnimationFrame(rafId);
      visible = nowVisible;
    });
    observer.observe(canvas);

    const render = (now: number) => {
      if (!visible) return;
      if (now - last >= FRAME_INTERVAL_MS) {
        last = now;
        ctx.drawImage(frames[index], 0, 0);
        index += direction;
        if (index >= frames.length - 1) {
          index = frames.length - 1;
          direction = -1;
        } else if (index <= 0) {
          index = 0;
          direction = 1;
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [framesReady]);

  return (
    <div className={className ?? "absolute inset-0 h-full w-full"} aria-hidden="true">
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        style={{ display: framesReady ? "none" : "block" }}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
      <canvas
        ref={displayCanvasRef}
        className="h-full w-full object-cover"
        style={{ display: framesReady ? "block" : "none" }}
      />
    </div>
  );
}
