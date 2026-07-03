"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, X } from "lucide-react";
import {
  MAX_SELL_PHOTOS,
  moveSellPhoto,
  type SellPhotoItem,
} from "@/lib/sell/photos";
import { PreviewImage } from "@/components/ui/preview-image";
import { cn } from "@/lib/utils/cn";

const LONG_PRESS_MS = 200;
const DESKTOP_DRAG_PX = 4;
const SCROLL_CANCEL_PX = 10;

type SellPhotoGridProps = {
  photos: SellPhotoItem[];
  photoPreviews: string[];
  onPhotosChange: (photos: SellPhotoItem[]) => void;
};

type PointerSession = {
  pointerId: number;
  pointerType: string;
  photoId: string;
  startX: number;
  startY: number;
  active: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
};

type DragUiState = {
  active: boolean;
  photoId: string | null;
  pointerX: number;
  pointerY: number;
  hoverIndex: number | null;
  previewSize: number;
  previewSrc: string;
};

const INITIAL_DRAG_UI: DragUiState = {
  active: false,
  photoId: null,
  pointerX: 0,
  pointerY: 0,
  hoverIndex: null,
  previewSize: 72,
  previewSrc: "",
};

export function SellPhotoGrid({
  photos,
  photoPreviews,
  onPhotosChange,
}: SellPhotoGridProps) {
  const [mounted, setMounted] = useState(false);
  const [dragUi, setDragUi] = useState<DragUiState>(INITIAL_DRAG_UI);

  const photosRef = useRef(photos);
  const photoPreviewsRef = useRef(photoPreviews);
  const sessionRef = useRef<PointerSession | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    photoPreviewsRef.current = photoPreviews;
  }, [photoPreviews]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDropIndex = useCallback((clientX: number, clientY: number) => {
    const count = photosRef.current.length;
    const elements = document.elementsFromPoint(clientX, clientY);

    for (const element of elements) {
      const cell = element.closest("[data-photo-index]");
      if (!cell || cell.hasAttribute("data-drag-preview")) {
        continue;
      }

      const index = Number(cell.getAttribute("data-photo-index"));
      if (Number.isFinite(index) && index >= 0 && index < count) {
        return index;
      }
    }

    return null;
  }, []);

  const findPhotoIndex = useCallback((photoId: string) => {
    return photosRef.current.findIndex((photo) => photo.id === photoId);
  }, []);

  const endDrag = useCallback(() => {
    if (sessionRef.current?.active) {
      console.log("drag end");
    }

    if (sessionRef.current?.longPressTimer) {
      clearTimeout(sessionRef.current.longPressTimer);
    }

    sessionRef.current = null;
    setDragUi(INITIAL_DRAG_UI);
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }, []);

  const activateDrag = useCallback(
    (session: PointerSession, clientX: number, clientY: number, cell: HTMLElement) => {
      if (session.active) {
        return;
      }

      session.active = true;
      console.log("drag start");

      const index = findPhotoIndex(session.photoId);
      const previewSrc = index >= 0 ? photoPreviewsRef.current[index] : "";
      const rect = cell.getBoundingClientRect();

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      setDragUi({
        active: true,
        photoId: session.photoId,
        pointerX: clientX,
        pointerY: clientY,
        hoverIndex: index >= 0 ? index : null,
        previewSize: rect.width,
        previewSrc,
      });

      navigator.vibrate?.(12);
    },
    [findPhotoIndex],
  );

  const updateDragPosition = useCallback(
    (clientX: number, clientY: number) => {
      const session = sessionRef.current;
      if (!session?.active) {
        return;
      }

      const hoverIndex = getDropIndex(clientX, clientY);
      const fromIndex = findPhotoIndex(session.photoId);

      if (hoverIndex !== null && fromIndex >= 0 && hoverIndex !== fromIndex) {
        onPhotosChange(moveSellPhoto(photosRef.current, fromIndex, hoverIndex));
      }

      const previewIndex = findPhotoIndex(session.photoId);

      setDragUi((current) => ({
        ...current,
        pointerX: clientX,
        pointerY: clientY,
        hoverIndex,
        previewSrc:
          previewIndex >= 0
            ? photoPreviewsRef.current[previewIndex]
            : current.previewSrc,
      }));
    },
    [findPhotoIndex, getDropIndex, onPhotosChange],
  );

  useEffect(() => {
    function handleWindowPointerMove(event: PointerEvent) {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      if (!session.active) {
        const deltaX = event.clientX - session.startX;
        const deltaY = event.clientY - session.startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (session.pointerType === "mouse") {
          if (distance >= DESKTOP_DRAG_PX) {
            const cell = gridRef.current?.querySelector(
              `[data-photo-id="${session.photoId}"]`,
            ) as HTMLElement | null;

            if (cell) {
              if (session.longPressTimer) {
                clearTimeout(session.longPressTimer);
                session.longPressTimer = null;
              }

              activateDrag(session, event.clientX, event.clientY, cell);
              updateDragPosition(event.clientX, event.clientY);
            }
          }

          return;
        }

        if (distance >= SCROLL_CANCEL_PX && session.longPressTimer) {
          clearTimeout(session.longPressTimer);
          session.longPressTimer = null;
          sessionRef.current = null;
        }

        return;
      }

      event.preventDefault();
      updateDragPosition(event.clientX, event.clientY);
    }

    function handleWindowPointerUp(event: PointerEvent) {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      endDrag();
    }

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [activateDrag, endDrag, updateDragPosition]);

  function removePhoto(index: number) {
    onPhotosChange(photos.filter((_, photoIndex) => photoIndex !== index));
  }

  function handlePhotoPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    photo: SellPhotoItem,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (sessionRef.current) {
      return;
    }

    const cell = event.currentTarget;

    const session: PointerSession = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      photoId: photo.id,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      longPressTimer: null,
    };

    if (event.pointerType !== "mouse") {
      session.longPressTimer = setTimeout(() => {
        const liveSession = sessionRef.current;
        if (!liveSession || liveSession.photoId !== photo.id || liveSession.active) {
          return;
        }

        activateDrag(liveSession, liveSession.startX, liveSession.startY, cell);
        updateDragPosition(liveSession.startX, liveSession.startY);
      }, LONG_PRESS_MS);
    }

    sessionRef.current = session;
  }

  const draggingPhotoId = dragUi.active ? dragUi.photoId : null;

  return (
    <>
      <div
        ref={gridRef}
        className={cn("grid grid-cols-4 gap-2", dragUi.active && "select-none")}
      >
        {Array.from({ length: MAX_SELL_PHOTOS }).map((_, index) => {
          const photo = photos[index];
          const filled = Boolean(photo);
          const isSource = filled && photo.id === draggingPhotoId;
          const isDropTarget =
            dragUi.active && dragUi.hoverIndex === index && !isSource;

          return (
            <div
              key={filled ? photo.id : `empty-${index}`}
              data-photo-index={filled ? index : undefined}
              data-photo-id={filled ? photo.id : undefined}
              onPointerDown={
                filled ? (event) => handlePhotoPointerDown(event, photo) : undefined
              }
              onContextMenu={
                filled
                  ? (event) => {
                      event.preventDefault();
                    }
                  : undefined
              }
              className={
                filled
                  ? cn(
                      "relative aspect-square touch-manipulation overflow-hidden rounded-[12px] border border-border bg-surface transition-[transform,opacity,box-shadow] duration-150 ease-out",
                      isSource && "scale-[0.96] border-dashed opacity-35",
                      isDropTarget && "scale-[1.02] ring-2 ring-primary/45",
                      dragUi.active && !isSource && !isDropTarget && "opacity-95",
                    )
                  : "grid aspect-square place-items-center rounded-[12px] border border-dashed border-border bg-background text-muted"
              }
            >
              {filled ? (
                <>
                  <PreviewImage
                    src={photoPreviews[index]}
                    alt={`Upload preview ${index + 1}`}
                    className={cn(
                      "transition-opacity duration-150",
                      isSource && "opacity-0",
                    )}
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => removePhoto(index)}
                    className="absolute right-1 top-1 z-30 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X size={11} />
                  </button>
                  {index === 0 ? (
                    <span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-black/60 px-1 py-0.5 text-[8px] font-semibold text-white">
                      Cover
                    </span>
                  ) : null}
                </>
              ) : (
                <Camera size={17} />
              )}
            </div>
          );
        })}
      </div>

      {mounted && dragUi.active && dragUi.previewSrc
        ? createPortal(
            <div
              data-drag-preview
              className="pointer-events-none fixed z-[9999] relative overflow-hidden rounded-[12px] border border-border bg-surface shadow-soft"
              style={{
                width: dragUi.previewSize,
                height: dragUi.previewSize,
                left: dragUi.pointerX,
                top: dragUi.pointerY,
                transform: "translate(-50%, -50%) scale(1.03)",
                opacity: 0.85,
              }}
            >
              <PreviewImage
                src={dragUi.previewSrc}
                alt=""
                sizes={`${dragUi.previewSize}px`}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
