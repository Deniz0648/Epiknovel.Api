"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Move, Search, ZoomIn, ZoomOut } from "lucide-react";

const VIEWPORT_SIZE = 320;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clampOffsetsForDimensions(
  viewportSize: number,
  displayWidth: number,
  displayHeight: number,
  nextX: number,
  nextY: number,
) {
  const maxX = Math.max(0, (displayWidth - viewportSize) / 2);
  const maxY = Math.max(0, (displayHeight - viewportSize) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, nextX)),
    y: Math.min(maxY, Math.max(-maxY, nextY)),
  };
}

type AvatarCropperModalProps = {
  file: File;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

export function AvatarCropperModal({
  file,
  isSubmitting,
  onCancel,
  onConfirm,
}: AvatarCropperModalProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const baseScale = useMemo(() => {
    if (!naturalSize) {
      return 1;
    }

    return Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
  }, [naturalSize]);

  const scale = baseScale * zoom;
  const displayWidth = (naturalSize?.width ?? 0) * scale;
  const displayHeight = (naturalSize?.height ?? 0) * scale;

  function clampOffsets(nextX: number, nextY: number) {
    return clampOffsetsForDimensions(VIEWPORT_SIZE, displayWidth, displayHeight, nextX, nextY);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!naturalSize) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    const clamped = clampOffsets(
      dragStateRef.current.startOffsetX + deltaX,
      dragStateRef.current.startOffsetY + deltaY,
    );

    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleConfirm() {
    const image = imageRef.current;
    if (!image || !naturalSize) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#0f1720";
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;

    context.save();
    context.translate(OUTPUT_SIZE / 2 + offsetX * ratio, OUTPUT_SIZE / 2 + offsetY * ratio);
    context.drawImage(
      image,
      -(displayWidth * ratio) / 2,
      -(displayHeight * ratio) / 2,
      displayWidth * ratio,
      displayHeight * ratio,
    );
    context.restore();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png", 0.95);
    });

    if (!blob) {
      return;
    }

    const timestamp = Date.now();
    const croppedFile = new File([blob], `avatar-${timestamp}.png`, {
      type: "image/png",
      lastModified: timestamp,
    });

    await onConfirm(croppedFile);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-base-content/45 p-4 backdrop-blur-md">
      <div className="glass-frame w-full max-w-5xl p-5 sm:p-7">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Avatar Kirpma Araci</p>
                <h2 className="mt-2 text-2xl font-black">Gorseli 1:1 kadraja yerlestir</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-base-content/66">
                  Gorseli surukleyerek istedigin noktaya tasiyabilir, yakinlastirma ile tam kadraji ayarlayabilirsin.
                </p>
              </div>
              <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm rounded-full px-4">
                Kapat
              </button>
            </div>

            <div className="rounded-[2rem] border border-base-content/12 bg-base-100/10 p-3 sm:p-5">
              <div className="mx-auto flex max-w-[420px] justify-center">
                <div
                  className="relative overflow-hidden rounded-[2.25rem] border border-base-content/15 bg-base-200/30 shadow-2xl"
                  style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, touchAction: "none" }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div className="pointer-events-none absolute inset-0 z-20 rounded-[2.25rem] ring-1 ring-inset ring-white/10" />
                  <div className="pointer-events-none absolute inset-[14px] z-20 rounded-[1.8rem] border border-white/18" />

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={objectUrl}
                    alt="Kirpma onizlemesi"
                    onLoad={(event) => {
                      const target = event.currentTarget;
                      setNaturalSize({
                        width: target.naturalWidth,
                        height: target.naturalHeight,
                      });
                      setZoom(1);
                      setOffsetX(0);
                      setOffsetY(0);
                    }}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: displayWidth || undefined,
                      height: displayHeight || undefined,
                      transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                    }}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_54%,rgba(6,10,18,0.62)_100%)]" />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-base-content/45 via-base-content/10 to-transparent px-4 pb-5 pt-14 text-[11px] font-bold uppercase tracking-[0.18em] text-white/86">
                    <Move className="h-3.5 w-3.5" />
                    Surukle ve Konumlandir
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.7rem] border border-base-content/12 bg-base-100/12 p-5">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/45">
                <Search className="h-3.5 w-3.5 text-primary" />
                Yakinlastirma
              </p>
              <div className="mt-4 flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-base-content/52" />
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => {
                    const nextZoom = Number(event.target.value);
                    const nextScale = baseScale * nextZoom;
                    const nextDisplayWidth = (naturalSize?.width ?? 0) * nextScale;
                    const nextDisplayHeight = (naturalSize?.height ?? 0) * nextScale;
                    const clamped = clampOffsetsForDimensions(
                      VIEWPORT_SIZE,
                      nextDisplayWidth,
                      nextDisplayHeight,
                      offsetX,
                      offsetY,
                    );

                    setZoom(nextZoom);
                    setOffsetX(clamped.x);
                    setOffsetY(clamped.y);
                  }}
                  className="range range-primary range-sm flex-1"
                />
                <ZoomIn className="h-4 w-4 text-base-content/52" />
              </div>
              <p className="mt-3 text-sm text-base-content/64">%{Math.round(zoom * 100)}</p>
            </div>

            <div className="rounded-[1.7rem] border border-base-content/12 bg-base-100/12 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Kurallar</p>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-base-content/68">
                <p>Avatar kare formatta kaydedilir ve tum yuzeylerde ayni kompozisyon kullanilir.</p>
                <p>En iyi sonuc icin odak noktasini orta hatta yakin konumlandir.</p>
                <p>Onayladiginda secilen alan kirpilip tek dosya olarak yuklenir.</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn rounded-full px-5">
                Iptal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isSubmitting || !naturalSize}
                className="btn btn-primary rounded-full px-6"
              >
                {isSubmitting ? "Yukleniyor" : "Kirp ve Yukle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
