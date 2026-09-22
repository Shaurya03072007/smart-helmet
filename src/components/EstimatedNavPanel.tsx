import { EstimatedNavigationState } from "../types";
import { Compass, Footprints, Gauge, MapPin, Zap } from "lucide-react";

interface EstimatedNavPanelProps {
  navState: EstimatedNavigationState;
}

export function EstimatedNavPanel({ navState }: EstimatedNavPanelProps) {
  return (
    <div className="flex flex-col space-y-3.5 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg font-mono">
      {/* Header with Mandatory Limitation Disclaimer */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-sky-500/10 rounded-md text-sky-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200 tracking-wider">
              NAVIGATION ENGINE
            </div>
            <div className="text-[10px] text-sky-400 font-semibold tracking-wide">
              LOCAL 2D CARTESIAN (cm)
            </div>
          </div>
        </div>

        {/* MANDATORY PROMINENT DISCLAIMER BADGE */}
        <span
          id="badge-position-estimated"
          className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider"
          title="Derived via dead-reckoning; not GPS or ground-truth exact"
        >
          Position: Estimated
        </span>
      </div>

      {/* Position Coordinates (X, Y in Centimeters) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
            <span>X (EAST / WEST)</span>
            <span className="text-[9px] text-sky-400 font-semibold">centimeters</span>
          </div>
          <div className="text-2xl font-black text-sky-300 tracking-tight">
            {navState.x >= 0 ? `+${navState.x.toFixed(1)}` : navState.x.toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1">cm</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {navState.x > 0 ? "East of Origin" : navState.x < 0 ? "West of Origin" : "At Origin"}
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Y (NORTH / SOUTH)</span>
            <span className="text-[9px] text-sky-400 font-semibold">centimeters</span>
          </div>
          <div className="text-2xl font-black text-sky-300 tracking-tight">
            {navState.y >= 0 ? `+${navState.y.toFixed(1)}` : navState.y.toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1">cm</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {navState.y > 0 ? "North of Origin" : navState.y < 0 ? "South of Origin" : "At Origin"}
          </div>
        </div>
      </div>

      {/* Heading & Compass Dial */}
      <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-slate-400 mb-0.5">ESTIMATED HEADING</div>
          <div className="text-2xl font-black text-amber-300">
            {navState.heading.toFixed(1)}°
          </div>
          <div className="text-[10px] text-slate-400">
            {navState.heading >= 337.5 || navState.heading < 22.5
              ? "North (N)"
              : navState.heading < 67.5
              ? "North-East (NE)"
              : navState.heading < 112.5
              ? "East (E)"
              : navState.heading < 157.5
              ? "South-East (SE)"
              : navState.heading < 202.5
              ? "South (S)"
              : navState.heading < 247.5
              ? "South-West (SW)"
              : navState.heading < 292.5
              ? "West (W)"
              : "North-West (NW)"}
          </div>
        </div>

        {/* Mini Compass Rose */}
        <div className="relative w-14 h-14 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center">
          <span className="absolute top-0.5 text-[8px] text-slate-400 font-bold">N</span>
          <span className="absolute bottom-0.5 text-[8px] text-slate-400">S</span>
          <span className="absolute left-1 text-[8px] text-slate-400">W</span>
          <span className="absolute right-1 text-[8px] text-slate-400">E</span>
          <div
            className="w-10 h-10 flex items-center justify-center transition-transform duration-100 ease-out"
            style={{ transform: `rotate(${navState.heading}deg)` }}
          >
            <Compass className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Movement Metrics: Distance & Speed */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/70">
          <div className="text-[10px] text-slate-400 mb-0.5">DISTANCE</div>
          <div className="text-base font-bold text-slate-100">
            {navState.distance.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">cm</span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/70">
          <div className="text-[10px] text-slate-400 mb-0.5">SPEED</div>
          <div className="text-base font-bold text-slate-100">
            {navState.speed.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">cm/s</span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/70">
          <div className="text-[10px] text-slate-400 mb-0.5">MOTION</div>
          <div className="flex items-center space-x-1 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                navState.motionDetected ? "bg-emerald-400 animate-ping" : "bg-slate-600"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                navState.motionDetected ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {navState.motionDetected ? "MOVING" : "REST"}
            </span>
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400 leading-relaxed">
        <strong>Engine Method:</strong> Gyroscopic rate integration (Gz / 131 LSB/°/s) for yaw heading orientation + Accelerometer inertial motion model calibrated in centimeters (cm).
      </div>
    </div>
  );
}
