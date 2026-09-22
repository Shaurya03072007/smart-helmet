import { RawMpuPacket } from "../types";
import { Gauge, Radio } from "lucide-react";

interface RawTelemetryPanelProps {
  raw: RawMpuPacket;
}

export function RawTelemetryPanel({ raw }: RawTelemetryPanelProps) {
  // Accelerometer range: ±32768 (±2g default scale has 16384 LSB = 1g)
  // Gyroscope range: ±32768 (±250 °/s default scale has 131 LSB = 1 deg/s)

  const getMeterPercent = (val: number, max: number = 32768) => {
    // Return percent from -100 to +100
    const clamped = Math.max(-max, Math.min(max, val));
    return (clamped / max) * 100;
  };

  return (
    <div className="flex flex-col space-y-3.5 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200 tracking-wider font-mono">
              RAW MPU6050 DATA
            </div>
            <div className="text-[10px] text-amber-400/90 font-mono">
              DIRECT 16-BIT INTEGER STREAM
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Unfiltered
        </span>
      </div>

      {/* Raw Accelerometer Axes */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono font-semibold text-slate-400 flex items-center justify-between">
          <span>ACCELEROMETER (LSB)</span>
          <span className="text-[10px] text-slate-400 font-normal">±16384 ≈ 1g</span>
        </div>

        {/* Ax */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sky-400 font-bold">Ax:</span>
            <span className="text-slate-100 font-bold tracking-wider">{raw.ax}</span>
          </div>
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 ${
                raw.ax >= 0 ? "bg-sky-400 left-1/2" : "bg-sky-400 right-1/2"
              }`}
              style={{
                width: `${Math.abs(getMeterPercent(raw.ax, 16384)) / 2}%`,
              }}
            />
          </div>
        </div>

        {/* Ay */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sky-400 font-bold">Ay:</span>
            <span className="text-slate-100 font-bold tracking-wider">{raw.ay}</span>
          </div>
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 ${
                raw.ay >= 0 ? "bg-sky-400 left-1/2" : "bg-sky-400 right-1/2"
              }`}
              style={{
                width: `${Math.abs(getMeterPercent(raw.ay, 16384)) / 2}%`,
              }}
            />
          </div>
        </div>

        {/* Az */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sky-400 font-bold">Az:</span>
            <span className="text-slate-100 font-bold tracking-wider">{raw.az}</span>
          </div>
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 ${
                raw.az >= 0 ? "bg-sky-400 left-1/2" : "bg-sky-400 right-1/2"
              }`}
              style={{
                width: `${Math.abs(getMeterPercent(raw.az, 16384)) / 2}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Raw Gyroscope Axes */}
      <div className="space-y-2 pt-1">
        <div className="text-[11px] font-mono font-semibold text-slate-400 flex items-center justify-between">
          <span>GYROSCOPE (LSB)</span>
          <span className="text-[10px] text-slate-400 font-normal">131 LSB ≈ 1°/s</span>
        </div>

        {/* Gx */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-400 font-bold">Gx:</span>
            <span className="text-slate-100 font-bold tracking-wider">{raw.gx}</span>
          </div>
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 ${
                raw.gx >= 0 ? "bg-amber-400 left-1/2" : "bg-amber-400 right-1/2"
              }`}
              style={{
                width: `${Math.abs(getMeterPercent(raw.gx, 8000)) / 2}%`,
              }}
            />
          </div>
        </div>

        {/* Gy */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-400 font-bold">Gy:</span>
            <span className="text-slate-100 font-bold tracking-wider">{raw.gy}</span>
          </div>
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 ${
                raw.gy >= 0 ? "bg-amber-400 left-1/2" : "bg-amber-400 right-1/2"
              }`}
              style={{
                width: `${Math.abs(getMeterPercent(raw.gy, 8000)) / 2}%`,
              }}
            />
          </div>
        </div>

        {/* Gz */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-400 font-bold">Gz (Yaw):</span>
            <span className="text-slate-100 font-bold tracking-wider">{raw.gz}</span>
          </div>
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 ${
                raw.gz >= 0 ? "bg-amber-400 left-1/2" : "bg-amber-400 right-1/2"
              }`}
              style={{
                width: `${Math.abs(getMeterPercent(raw.gz, 8000)) / 2}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-2 font-mono text-[10px] text-amber-300/80 leading-relaxed">
        <strong>Constraint Check:</strong> Values are received as pure raw 16-bit
        signed integers directly from the ESP32. Zero conversion or filtering was
        applied on the microcontroller.
      </div>
    </div>
  );
}
