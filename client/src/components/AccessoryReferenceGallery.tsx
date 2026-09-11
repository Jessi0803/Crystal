import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type AccessoryReferenceImage = {
  src: string;
  alt: string;
  label: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export default function AccessoryReferenceGallery({
  images,
}: {
  images: AccessoryReferenceImage[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pointers.current.clear();
    pinchDistance.current = null;
  };

  const selectImage = (index: number) => {
    resetView();
    setActiveIndex(index);
  };

  const changeImage = (direction: -1 | 1) => {
    if (activeIndex === null || images.length < 2) return;
    selectImage((activeIndex + direction + images.length) % images.length);
  };

  const changeScale = (nextScale: number) => {
    const normalizedScale = clampScale(nextScale);
    setScale(normalizedScale);
    if (normalizedScale === 1) setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (activeIndex === null) resetView();
  }, [activeIndex]);

  const activeImage = activeIndex === null ? null : images[activeIndex];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => selectImage(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-sm border border-[oklch(0.9_0_0)] bg-[oklch(0.97_0_0)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.35_0_0)] focus-visible:ring-offset-2"
            aria-label={`放大查看${image.label}`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="h-full w-full object-cover object-[center_61%] transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8 text-xs font-body text-white">
              <span>{image.label}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm">
                <Maximize2 className="h-3.5 w-3.5" />
                點擊放大
              </span>
            </span>
          </button>
        ))}
      </div>

      <Dialog
        open={activeImage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveIndex(null);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden rounded-sm border-0 bg-black/95 p-0 text-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") changeImage(-1);
            if (event.key === "ArrowRight") changeImage(1);
          }}
        >
          <DialogTitle className="sr-only">{activeImage?.label ?? "配件參考圖片"}</DialogTitle>

          <div className="absolute left-3 top-3 z-20 rounded-full bg-black/55 px-3 py-1.5 text-xs font-body text-white/90 backdrop-blur-sm sm:left-4 sm:top-4">
            {activeImage?.label}
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/65 p-1.5 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={() => changeScale(scale - SCALE_STEP)}
              disabled={scale <= MIN_SCALE}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-35"
              aria-label="縮小圖片"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="w-12 text-center text-xs tabular-nums text-white/85">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => changeScale(scale + SCALE_STEP)}
              disabled={scale >= MAX_SCALE}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-35"
              aria-label="放大圖片"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              disabled={scale === 1 && offset.x === 0 && offset.y === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-35"
              aria-label="重設圖片大小"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => changeImage(-1)}
                className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 sm:left-4"
                aria-label="上一張圖片"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => changeImage(1)}
                className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 sm:right-4"
                aria-label="下一張圖片"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className={`flex h-full w-full touch-none select-none items-center justify-center overflow-hidden ${scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
            onDoubleClick={() => changeScale(scale > 1 ? 1 : 2)}
            onWheel={(event) => {
              event.preventDefault();
              changeScale(scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (pointers.current.size === 2) {
                const [first, second] = Array.from(pointers.current.values());
                pinchDistance.current = Math.hypot(second.x - first.x, second.y - first.y);
              }
            }}
            onPointerMove={(event) => {
              const previous = pointers.current.get(event.pointerId);
              if (!previous) return;
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

              if (pointers.current.size === 2) {
                const [first, second] = Array.from(pointers.current.values());
                const distance = Math.hypot(second.x - first.x, second.y - first.y);
                if (pinchDistance.current) {
                  const ratio = distance / pinchDistance.current;
                  setScale((current) => clampScale(current * ratio));
                }
                pinchDistance.current = distance;
                return;
              }

              if (scale > 1) {
                setOffset((current) => ({
                  x: current.x + event.clientX - previous.x,
                  y: current.y + event.clientY - previous.y,
                }));
              }
            }}
            onPointerUp={(event) => {
              pointers.current.delete(event.pointerId);
              pinchDistance.current = null;
            }}
            onPointerCancel={(event) => {
              pointers.current.delete(event.pointerId);
              pinchDistance.current = null;
            }}
          >
            {activeImage && (
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                draggable={false}
                className="max-h-full max-w-full object-contain will-change-transform"
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
