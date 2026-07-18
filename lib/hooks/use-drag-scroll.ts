"use client";

import { useEffect, type RefObject } from "react";

/**
 * Click-and-drag horizontal scrolling for mouse/pen.
 * Touch keeps native overflow scrolling (momentum swipe).
 * Clicks only suppress navigation when the pointer actually moved.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const el: HTMLElement = node;

    const state = {
      pointerId: -1,
      startX: 0,
      startScrollLeft: 0,
      lastX: 0,
      lastTime: 0,
      velocity: 0,
      dragging: false,
      moved: false,
      momentumId: 0,
      suppressClick: false,
    };

    function stopMomentum() {
      if (state.momentumId) {
        cancelAnimationFrame(state.momentumId);
        state.momentumId = 0;
      }
    }

    function startMomentum(velocity: number) {
      stopMomentum();
      let v = Math.max(-32, Math.min(32, velocity));

      const tick = () => {
        if (Math.abs(v) < 0.15) {
          stopMomentum();
          return;
        }
        el.scrollLeft += v;
        v *= 0.95;
        state.momentumId = requestAnimationFrame(tick);
      };

      state.momentumId = requestAnimationFrame(tick);
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "touch" || event.button !== 0) return;

      stopMomentum();
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startScrollLeft = el.scrollLeft;
      state.lastX = event.clientX;
      state.lastTime = event.timeStamp;
      state.velocity = 0;
      state.dragging = true;
      state.moved = false;
      state.suppressClick = false;
    }

    function onPointerMove(event: PointerEvent) {
      if (!state.dragging || state.pointerId !== event.pointerId) return;

      const distance = event.clientX - state.startX;

      if (!state.moved && Math.abs(distance) > 5) {
        state.moved = true;
        state.suppressClick = true;
        el.setPointerCapture(event.pointerId);
        el.classList.add("is-dragging");
      }

      if (!state.moved) return;

      event.preventDefault();
      const now = event.timeStamp;
      const dt = Math.max(now - state.lastTime, 1);
      const dx = event.clientX - state.lastX;
      const sample = (-dx / dt) * 16;
      state.velocity = state.velocity * 0.6 + sample * 0.4;
      state.lastX = event.clientX;
      state.lastTime = now;
      el.scrollLeft = state.startScrollLeft - distance;
    }

    function onPointerUp(event: PointerEvent) {
      if (state.pointerId !== event.pointerId) return;

      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
      el.classList.remove("is-dragging");
      state.dragging = false;
      state.pointerId = -1;

      if (state.moved && Math.abs(state.velocity) > 0.4) {
        startMomentum(state.velocity);
      }

      if (state.suppressClick) {
        window.setTimeout(() => {
          state.suppressClick = false;
          state.moved = false;
        }, 0);
      }
    }

    function onClickCapture(event: MouseEvent) {
      if (!state.suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      state.suppressClick = false;
      state.moved = false;
    }

    function onLostCapture() {
      el.classList.remove("is-dragging");
      state.dragging = false;
      state.pointerId = -1;
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("lostpointercapture", onLostCapture);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("lostpointercapture", onLostCapture);
      el.removeEventListener("click", onClickCapture, true);
      el.classList.remove("is-dragging");
    };
  }, [ref]);
}
