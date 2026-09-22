import { useState } from "react";
import { RawMpuPacket, EstimatedNavigationState } from "../types";
import { Bug, CheckCircle2, ChevronDown, ChevronRight, Terminal } from "lucide-react";

interface DebugPanelProps {
  raw: RawMpuPacket;
  estimated: EstimatedNavigationState;
  recentPackets: RawMpuPacket[];
  isOnline: boolean;
  packetRateHz: number;
}

export function DebugPanel({
  raw,
  estimated,
  recentPackets,
  isOnline,
  packetRateHz,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "packets">("pipeline");

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono text-xs">
      {/* Header bar that toggles the debug drawer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 transition-colors border-b border-slate-800/80"
      >
        <div className="flex items-center space-x-2.5">
          <Bug className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">SYSTEM DIAGNOSTICS & TRACE PIPELINE</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
            Part 13 Debug Engine
          </span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="text-[11px]">{isOpen ? "Hide Diagnostics" : "Inspect Raw vs Nav Pipeline"}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Sub Navigation */}
          <div className="flex space-x-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeTab === "pipeline"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pipeline Isolation Trace
            </button>
            <button
              onClick={() => setActiveTab("packets")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeTab === "packets"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Recent Raw Ingest Table ({recentPackets.length})
            </button>
          </div>

          {activeTab === "pipeline" ? (
            <div className="space-y-4">
              {/* Architecture Stage Isolation Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">STAGE 1: HARDWARE</div>
                  <div className="font-bold text-slate-200 mt-1">ESP32 MPU6050</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Wire.h (0x68) Unchanged</div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">STAGE 2: TRANSPORT</div>
                  <div className="font-bold text-slate-200 mt-1">Wi-Fi HTTP POST</div>
                  <div
                    className={`text-[10px] mt-0.5 font-bold ${
                      isOnline ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isOnline ? `${packetRateHz} Hz Active` : "Offline / Waiting"}
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">STAGE 3: INGESTION</div>
                  <div className="font-bold text-slate-200 mt-1">Express API</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Validating 16-bit Ints</div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">STAGE 4: ENGINE</div>
                  <div className="font-bold text-slate-200 mt-1">Dead Reckoning</div>
                  <div className="text-[10px] text-sky-400 mt-0.5">Gz Yaw + Accel PDR</div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">STAGE 5: RENDER</div>
                  <div className="font-bold text-slate-200 mt-1">HTML5 Canvas</div>
                  <div className="text-[10px] text-purple-400 mt-0.5">Live Cartesian Plot</div>
                </div>
              </div>

              {/* Side-by-side Isolation Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Raw Sensor Telemetry */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/30">
                  <div className="flex items-center justify-between text-amber-400 font-bold mb-2 pb-1 border-b border-slate-800">
                    <span>RAW SENSOR DATA (ESP32)</span>
                    <span className="text-[10px] text-slate-400">Pure int16 values</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Ax:</div>
                      <div className="text-base font-bold text-sky-400">{raw.ax}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Gx:</div>
                      <div className="text-base font-bold text-amber-400">{raw.gx}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Ay:</div>
                      <div className="text-base font-bold text-sky-400">{raw.ay}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Gy:</div>
                      <div className="text-base font-bold text-amber-400">{raw.gy}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Az:</div>
                      <div className="text-base font-bold text-sky-400">{raw.az}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Gz (Yaw rate):</div>
                      <div className="text-base font-bold text-amber-400">{raw.gz}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    Timestamp: {raw.timestamp} | Device: {raw.deviceId}
                  </div>
                </div>

                {/* Right: Navigation Engine Output */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-sky-500/30">
                  <div className="flex items-center justify-between text-sky-400 font-bold mb-2 pb-1 border-b border-slate-800">
                    <span>NAVIGATION ENGINE (DERIVED)</span>
                    <span className="text-[10px] text-amber-400">Estimated Dead Reckoning</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">X Position:</div>
                      <div className="text-base font-bold text-sky-300">{estimated.x} m</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Heading:</div>
                      <div className="text-base font-bold text-amber-300">{estimated.heading}°</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Y Position:</div>
                      <div className="text-base font-bold text-sky-300">{estimated.y} m</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Est. Speed:</div>
                      <div className="text-base font-bold text-emerald-400">{estimated.speed} m/s</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Total Distance:</div>
                      <div className="text-base font-bold text-slate-200">{estimated.distance} m</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <div className="text-[10px] text-slate-400">Step Cadence:</div>
                      <div className="text-base font-bold text-slate-200">{estimated.steps} steps</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    Origin Ref: Fixed (0,0) START marker
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-1 px-2">Time (ms)</th>
                    <th className="py-1 px-2">Ax</th>
                    <th className="py-1 px-2">Ay</th>
                    <th className="py-1 px-2">Az</th>
                    <th className="py-1 px-2">Gx</th>
                    <th className="py-1 px-2">Gy</th>
                    <th className="py-1 px-2">Gz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {recentPackets.map((pkt, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-1 px-2 text-slate-400">{pkt.timestamp}</td>
                      <td className="py-1 px-2 text-sky-400 font-mono">{pkt.ax}</td>
                      <td className="py-1 px-2 text-sky-400 font-mono">{pkt.ay}</td>
                      <td className="py-1 px-2 text-sky-400 font-mono">{pkt.az}</td>
                      <td className="py-1 px-2 text-amber-400 font-mono">{pkt.gx}</td>
                      <td className="py-1 px-2 text-amber-400 font-mono">{pkt.gy}</td>
                      <td className="py-1 px-2 text-amber-400 font-mono">{pkt.gz}</td>
                    </tr>
                  ))}
                  {recentPackets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        No packets recorded yet. Connect ESP32 or click "Start Virtual ESP32 Stream".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
