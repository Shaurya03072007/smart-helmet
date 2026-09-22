import { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Activity,
  Play,
  Pause,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

interface DevicePanelProps {
  deviceId: string;
  isOnline: boolean;
  packetRateHz: number;
  totalPackets: number;
  lastPacketTime: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenFirmware: () => void;
}

export function DevicePanel({
  deviceId,
  isOnline,
  packetRateHz,
  totalPackets,
  lastPacketTime,
  isPaused,
  onTogglePause,
  onOpenFirmware,
}: DevicePanelProps) {
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Check simulation status on mount
  useEffect(() => {
    fetch("/api/simulate/status")
      .then((r) => r.json())
      .then((d) => setSimRunning(Boolean(d.simulationRunning)))
      .catch(() => {});
  }, []);

  // Update seconds ago counter
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastPacketTime > 0) {
        setSecondsAgo(Math.floor((Date.now() - lastPacketTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastPacketTime]);

  const toggleSimulation = async () => {
    setSimLoading(true);
    try {
      const nextState = !simRunning;
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: nextState }),
      });
      const data = await res.json();
      setSimRunning(Boolean(data.simulationRunning));
    } catch (e) {
      console.error("Failed to toggle simulation:", e);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
      {/* Device Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-slate-800 rounded-lg text-sky-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">
              ACTIVE NODE
            </div>
            <div className="text-sm font-bold text-white font-mono">{deviceId}</div>
          </div>
        </div>

        {/* Live / Offline Status */}
        <div
          id="device-status-badge"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
            isOnline
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
              : "bg-rose-950/80 text-rose-400 border-rose-500/40"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span>{isOnline ? "LIVE STREAM" : "DEVICE OFFLINE"}</span>
        </div>
      </div>

      {/* Connection & Packet Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 flex items-center justify-between mb-1">
            <span>PACKET RATE</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-sky-300">
            {isOnline ? `${packetRateHz.toFixed(1)} Hz` : "0.0 Hz"}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Target: 10.0 Hz</div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 flex items-center justify-between mb-1">
            <span>TOTAL PKTS</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-300">
            {totalPackets.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {lastPacketTime > 0
              ? isOnline
                ? `Last: ${secondsAgo}s ago`
                : `Lost: ${secondsAgo}s ago`
              : "No packets yet"}
          </div>
        </div>
      </div>

      {/* Network Connectivity Status */}
      <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-800/60 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Wi-Fi Transport:</span>
          <span
            className={`flex items-center space-x-1 ${
              isOnline ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">No Signal</span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Ingest Protocol:</span>
          <span className="text-slate-300">HTTP POST /api/mpu</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Dashboard Link:</span>
          <span className="text-emerald-400">WebSocket (Live)</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col space-y-2 pt-1 font-mono text-xs">
        <button
          id="btn-pause-tracking"
          onClick={onTogglePause}
          className={`flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-lg border font-medium transition-colors ${
            isPaused
              ? "bg-amber-950/40 text-amber-300 border-amber-500/50 hover:bg-amber-950/60"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Resume Tracking</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 fill-slate-300 text-slate-300" />
              <span>Pause Tracking</span>
            </>
          )}
        </button>

        {/* Simulator Toggle Button (Crucial for testing when hardware is not plugged in) */}
        <button
          id="btn-toggle-simulator"
          onClick={toggleSimulation}
          disabled={simLoading}
          className={`flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-lg border font-medium transition-colors ${
            simRunning
              ? "bg-purple-950/40 text-purple-300 border-purple-500/50 hover:bg-purple-950/60"
              : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>
            {simRunning ? "Stop Virtual ESP32 Stream" : "Start Virtual ESP32 Stream"}
          </span>
        </button>

        <button
          id="btn-view-firmware"
          onClick={onOpenFirmware}
          className="w-full py-2 px-3 rounded-lg bg-sky-950/40 hover:bg-sky-950/60 text-sky-400 border border-sky-500/40 font-medium transition-colors text-center"
        >
          View ESP32 Firmware & Wiring
        </button>
      </div>
    </div>
  );
}
