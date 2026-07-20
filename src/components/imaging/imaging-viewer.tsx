'use client';

import * as React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Maximize,
  Sun,
  Contrast,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IMAGING_SAFETY_DISCLAIMER } from '@/lib/imaging/constants';

export function ImagingViewer({
  signedUrl,
  fileName,
  mimeType,
  modality,
  laterality,
  capturedAt,
  studyStatus,
  qualityWarning,
  analysisMode,
  isDevelopmentMock,
  manualReviewOnly,
  isDemoSample,
}: {
  signedUrl: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  modality: string;
  laterality?: string;
  capturedAt: string;
  studyStatus?: string;
  qualityWarning?: string | null;
  analysisMode?: string | null;
  isDevelopmentMock?: boolean;
  manualReviewOnly?: boolean;
  isDemoSample?: boolean;
}) {
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState(0);
  const [brightness, setBrightness] = React.useState(100);
  const [contrast, setContrast] = React.useState(100);
  const dragging = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isImage = mimeType?.startsWith('image/');

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setOffset((o) => ({
      x: o.x + e.clientX - last.current.x,
      y: o.y + e.clientY - last.current.y,
    }));
    last.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp() {
    dragging.current = false;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{modality.replace(/_/g, ' ')}</Badge>
        {laterality ? <Badge variant="secondary">{laterality}</Badge> : null}
        <span className="text-muted-foreground">{capturedAt}</span>
        {studyStatus ? <Badge variant="info">{studyStatus.replace(/_/g, ' ')}</Badge> : null}
        {isDevelopmentMock ? (
          <Badge variant="warning">Development Mock Analysis</Badge>
        ) : null}
        {isDemoSample ? (
          <Badge variant="outline">Demo sample study</Badge>
        ) : null}
        {manualReviewOnly ? (
          <>
            <Badge variant="secondary">Manual review only</Badge>
            <Badge variant="outline">Not a diagnosis</Badge>
          </>
        ) : (
          <>
            <Badge variant="outline">Provider review required</Badge>
            <Badge variant="outline">Not a diagnosis</Badge>
          </>
        )}
        {analysisMode ? (
          <span className="text-muted-foreground">Mode: {analysisMode}</span>
        ) : null}
      </div>

      {qualityWarning ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {qualityWarning}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="outline" onClick={() => setScale((s) => Math.min(4, s + 0.25))} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate">
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={toggleFullscreen} aria-label="Fullscreen">
          <Maximize className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetView}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        {signedUrl ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={signedUrl} target="_blank" rel="noreferrer">
              <Maximize2 className="h-4 w-4" /> Original
            </a>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sun className="h-4 w-4" />
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer accent-primary"
            aria-label="Brightness"
          />
          <span className="w-8 tabular-nums">{brightness}%</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Contrast className="h-4 w-4" />
          <input
            type="range"
            min={50}
            max={150}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer accent-primary"
            aria-label="Contrast"
          />
          <span className="w-8 tabular-nums">{contrast}%</span>
        </label>
      </div>

      <div
        ref={containerRef}
        className="relative aspect-video w-full cursor-grab overflow-hidden rounded-md border bg-black active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {signedUrl ? (
          isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={fileName ?? 'imaging study'}
              draggable={false}
              className="absolute left-1/2 top-1/2 max-h-none max-w-none select-none"
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale}) rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              }}
            />
          ) : (
            <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
              Preview not available for this file type.{' '}
              <a href={signedUrl} className="ml-1 text-primary hover:underline" target="_blank" rel="noreferrer">
                Open original
              </a>
            </div>
          )
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Image unavailable or still uploading.
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{IMAGING_SAFETY_DISCLAIMER}</p>
    </div>
  );
}
