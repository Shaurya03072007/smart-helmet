import { useEffect, useRef, useState, useCallback } from "react";
import { TrajectoryPoint, EstimatedNavigationState } from "../types";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  RotateCcw,
  Navigation,
  Compass,
} from "lucide-react";

interface VirtualMapCanvasProps {
  trajectory: TrajectoryPoint[];
  navState: EstimatedNavigationState;
  onResetPosition: () => void;
  onClearTrajectory: () => void;
  isOnline: boolean;
}

export function VirtualMapCanvas({
  trajectory,
  navState,
  onResetPosition,
  onClearTrajectory,
  isOnline,
}: VirtualMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport transforms:
  // scale: pixels per centimeter (default 2.5px per cm, i.e. 250px per meter)
  const [scale, setScale] = useState<number>(2.5);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Center on current device
  const centerOnDevice = useCallback(() => {
    if (!containerRef.current) return;
    // Map coords: (0,0) is origin. Current device is at (navState.x, navState.y) in cm
    // Canvas pixel X = centerX + offset.x + navState.x * scale
    // Canvas pixel Y = centerY + offset.y - navState.y * scale
    setOffset({
      x: -navState.x * scale,
      y: navState.y * scale,
    });
  }, [navState.x, navState.y, scale]);

  // Reset entire map view to origin (0,0)
  const resetMapView = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setScale(2.5);
    setAutoFollow(true);
  }, []);

  const handleZoom = useCallback((factor: number) => {
    setScale((prev) => {
      const next = prev * factor;
      return Math.min(15.0, Math.max(0.2, next));
    });
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    handleZoom(factor);
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoFollow(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Auto follow if enabled and device moves
  useEffect(() => {
    if (autoFollow) {
      centerOnDevice();
    }
  }, [autoFollow, navState.x, navState.y, centerOnDevice]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Dark engineering blueprint background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2 + offset.x;
    const centerY = height / 2 + offset.y;

    // Centimeter coordinate conversion:
    // +X is East (right), +Y is North (up, -canvasY)
    const toScreenX = (xCm: number) => centerX + xCm * scale;
    const toScreenY = (yCm: number) => centerY - yCm * scale;

    // Determine grid spacing based on zoom level (in centimeters)
    let gridStepCm = 25;
    if (scale >= 6.0) gridStepCm = 5;
    else if (scale >= 3.0) gridStepCm = 10;
    else if (scale >= 1.5) gridStepCm = 25;
    else if (scale >= 0.6) gridStepCm = 50;
    else gridStepCm = 100;

    const startXCm = Math.floor((-centerX) / (scale * gridStepCm)) * gridStepCm;
    const endXCm = Math.ceil((width - centerX) / (scale * gridStepCm)) * gridStepCm;
    const startYCm = Math.floor((centerY - height) / (scale * gridStepCm)) * gridStepCm;
    const endYCm = Math.ceil(centerY / (scale * gridStepCm)) * gridStepCm;

    // Draw Sub-grid lines (every gridStepCm)
    ctx.strokeStyle = "#162032";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let xC = startXCm; xC <= endXCm; xC += gridStepCm) {
      const scrX = toScreenX(xC);
      ctx.moveTo(scrX, 0);
      ctx.lineTo(scrX, height);
    }
    for (let yC = startYCm; yC <= endYCm; yC += gridStepCm) {
      const scrY = toScreenY(yC);
      ctx.moveTo(0, scrY);
      ctx.lineTo(width, scrY);
    }
    ctx.stroke();

    // Major grid lines (every 50cm, 100cm, or 200cm)
    const majorStepCm = gridStepCm <= 10 ? 50 : gridStepCm <= 25 ? 100 : 200;
    ctx.strokeStyle = "#22314d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let xC = Math.floor(startXCm / majorStepCm) * majorStepCm; xC <= endXCm; xC += majorStepCm) {
      const scrX = toScreenX(xC);
      ctx.moveTo(scrX, 0);
      ctx.lineTo(scrX, height);
    }
    for (let yC = Math.floor(startYCm / majorStepCm) * majorStepCm; yC <= endYCm; yC += majorStepCm) {
      const scrY = toScreenY(yC);
      ctx.moveTo(0, scrY);
      ctx.lineTo(width, scrY);
    }
    ctx.stroke();

    // Primary Cartesian Axes (X=0 and Y=0)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#38bdf8"; // Cyan/blue primary axis
    ctx.beginPath();
    // Y-Axis (North-South line at X=0)
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    // X-Axis (East-West line at Y=0)
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Axis Arrows
    // Y Axis Arrow (North)
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(centerX, 12);
    ctx.lineTo(centerX - 6, 24);
    ctx.lineTo(centerX + 6, 24);
    ctx.closePath();
    ctx.fill();

    // X Axis Arrow (East)
    ctx.beginPath();
    ctx.moveTo(width - 12, centerY);
    ctx.lineTo(width - 24, centerY - 6);
    ctx.lineTo(width - 24, centerY + 6);
    ctx.closePath();
    ctx.fill();

    // Grid Numerical Labels (in centimeters)
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // X-Axis tick labels
    for (let xC = startXCm; xC <= endXCm; xC += gridStepCm) {
      if (xC === 0) continue;
      const scrX = toScreenX(xC);
      ctx.fillText(`${xC}cm`, scrX, Math.min(Math.max(centerY + 4, 18), height - 20));
    }

    // Y-Axis tick labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let yC = startYCm; yC <= endYCm; yC += gridStepCm) {
      if (yC === 0) continue;
      const scrY = toScreenY(yC);
      ctx.fillText(`${yC}cm`, Math.min(Math.max(centerX - 6, 46), width - 10), scrY);
    }

    // Axis Orientation Titles
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText("▲ NORTH (+Y)", centerX, 30);
    ctx.textAlign = "right";
    ctx.fillText("EAST (+X) ►", width - 30, centerY - 10);

    // --- DRAW TRAJECTORY PATH ---
    if (trajectory.length > 0) {
      // Glow underlay
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      trajectory.forEach((pt, i) => {
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Sharp trajectory line
      ctx.strokeStyle = "#0284c7"; // Cyan/electric blue
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      trajectory.forEach((pt, i) => {
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Breadcrumb point dots (sampled so it doesn't get cluttered)
      const dotInterval = Math.max(1, Math.floor(trajectory.length / 80));
      for (let i = 0; i < trajectory.length - 1; i += dotInterval) {
        const pt = trajectory[i];
        if (pt.isOrigin) continue;
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);
        ctx.fillStyle = "rgba(186, 230, 253, 0.75)";
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- DRAW START / ORIGIN MARKERS ---
    trajectory.forEach((pt) => {
      if (pt.isOrigin) {
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);

        // Origin concentric rings
        ctx.strokeStyle = "#10b981"; // Emerald
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();

        // START Label pill
        ctx.fillStyle = "#064e3b";
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 1;
        const labelText = "START (0,0)";
        ctx.font = "bold 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        const textMetrics = ctx.measureText(labelText);
        const boxW = textMetrics.width + 12;
        const boxH = 18;
        const boxX = sx - boxW / 2;
        const boxY = sy + 11;

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#a7f3d0";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, sx, boxY + boxH / 2);
      }
    });

    // --- DRAW CURRENT DEVICE (HELMET/MINER MARKER) ---
    const devX = toScreenX(navState.x);
    const devY = toScreenY(navState.y);

    // Orientation cone / heading field of view
    // 0° is North (up), 90° East (right), etc.
    const headingRad = (navState.heading * Math.PI) / 180;
    const coneAngle = (40 * Math.PI) / 180; // 40 degree spread
    const coneLength = 38;

    const leftAngle = headingRad - coneAngle / 2 - Math.PI / 2;
    const rightAngle = headingRad + coneAngle / 2 - Math.PI / 2;

    const coneGrad = ctx.createRadialGradient(devX, devY, 5, devX, devY, coneLength);
    coneGrad.addColorStop(0, "rgba(245, 158, 11, 0.45)"); // Amber light cone
    coneGrad.addColorStop(1, "rgba(245, 158, 11, 0.0)");

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(devX, devY);
    ctx.arc(devX, devY, coneLength, leftAngle, rightAngle);
    ctx.closePath();
    ctx.fill();

    // Pulsing outer radar ring for live status
    ctx.strokeStyle = isOnline ? "rgba(245, 158, 11, 0.5)" : "rgba(239, 68, 68, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(devX, devY, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Inner device marker
    ctx.fillStyle = isOnline ? "#f59e0b" : "#ef4444";
    ctx.beginPath();
    ctx.arc(devX, devY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional Arrow pointer on marker
    const pointerLen = 12;
    // In canvas: 0° heading is straight up (-Y axis)
    const pointerAngle = headingRad - Math.PI / 2;
    const ptrTipX = devX + pointerLen * Math.cos(pointerAngle);
    const ptrTipY = devY + pointerLen * Math.sin(pointerAngle);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(devX, devY);
    ctx.lineTo(ptrTipX, ptrTipY);
    ctx.stroke();

    // Current coordinates badge (in centimeters)
    const badgeText = `${navState.deviceId} (${navState.x >= 0 ? "+" : ""}${navState.x.toFixed(1)}cm, ${navState.y >= 0 ? "+" : ""}${navState.y.toFixed(1)}cm)`;
    ctx.font = "bold 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = isOnline ? "#d97706" : "#dc2626";
    ctx.lineWidth = 1;
    const bMetrics = ctx.measureText(badgeText);
    const bW = bMetrics.width + 12;
    const bH = 18;
    const bX = devX - bW / 2;
    const bY = devY - 32;

    ctx.beginPath();
    ctx.roundRect(bX, bY, bW, bH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, devX, bY + bH / 2);

    // --- BOTTOM-LEFT CENTIMETER SCALE RULER ---
    const rulerPixelWidth = scale * gridStepCm;
    const rulerX = 20;
    const rulerY = height - 25;

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rulerX, rulerY);
    ctx.lineTo(rulerX + rulerPixelWidth, rulerY);
    // Left & right tick marks
    ctx.moveTo(rulerX, rulerY - 5);
    ctx.lineTo(rulerX, rulerY + 5);
    ctx.moveTo(rulerX + rulerPixelWidth, rulerY - 5);
    ctx.lineTo(rulerX + rulerPixelWidth, rulerY + 5);
    ctx.stroke();

    ctx.font = "bold 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#cbd5e1";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${gridStepCm} cm`, rulerX + rulerPixelWidth / 2, rulerY - 4);

    ctx.restore();
  }, [offset, scale, trajectory, navState, isOnline]);

  return (
    <div
      ref={containerRef}
      id="map-container"
      className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "crosshair" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Top Left Compass & Status Pill */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs shadow-lg text-slate-300 font-mono">
        <Compass className="w-4 h-4 text-sky-400" />
        <span>HDG:</span>
        <span className="font-bold text-sky-300">{navState.heading.toFixed(1)}°</span>
        <span className="text-slate-600">|</span>
        <span>SCALE:</span>
        <span className="text-slate-200">{scale.toFixed(1)}px/cm</span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-300 font-semibold">UNIT: cm</span>
      </div>

      {/* Top Right Map Floating Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-xl">
        <button
          id="btn-zoom-in"
          onClick={() => handleZoom(1.25)}
          title="Zoom In (+)"
          className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={() => handleZoom(0.8)}
          title="Zoom Out (-)"
          className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-1" />
        <button
          id="btn-center-device"
          onClick={() => {
            setAutoFollow(true);
            centerOnDevice();
          }}
          title="Center on Device"
          className={`p-2 rounded transition-colors ${
            autoFollow
              ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
              : "hover:bg-slate-800 text-slate-300 hover:text-white"
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          id="btn-reset-map"
          onClick={resetMapView}
          title="Reset Map to Origin (0,0)"
          className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Center Trajectory Action Bar */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-xl text-xs font-mono">
        <button
          id="btn-reset-position"
          onClick={onResetPosition}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition-colors font-medium"
          title="Set X=0, Y=0 and create new START marker"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Reset Pos (0,0)</span>
        </button>
        <button
          id="btn-clear-trajectory"
          onClick={onClearTrajectory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 transition-colors font-medium"
          title="Clear previous path history"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear Path</span>
        </button>
      </div>
    </div>
  );
}
