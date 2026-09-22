import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { VirtualMapCanvas } from "./components/VirtualMapCanvas";
import { DevicePanel } from "./components/DevicePanel";
import { RawTelemetryPanel } from "./components/RawTelemetryPanel";
import { EstimatedNavPanel } from "./components/EstimatedNavPanel";
import { DebugPanel } from "./components/DebugPanel";
import { StatusBar } from "./components/StatusBar";
import { FirmwareModal } from "./components/FirmwareModal";
import {
  Compass,
  FileCode,
  Radio,
  Sliders,
  Sparkles,
} from "lucide-react";

export default function App() {
  const {
    wsConnected,
    isOnline,
    deviceId,
    packetRateHz,
    totalPackets,
    lastPacketTime,
    isPaused,
    rawPacket,
    navState,
    trajectory,
    recentRawList,
    resetPosition,
    clearTrajectory,
    togglePause,
  } = useWebSocket();

  const [firmwareModalOpen, setFirmwareModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Application Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide font-mono">
                UNDERGROUND NAVIGATION MAP
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-sky-400 border border-slate-700 font-mono">
                ESP32 MPU6050
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Raw 16-bit IMU Wi-Fi Ingestion & Local 2D Cartesian Trajectory Dashboard (cm)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setFirmwareModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>ESP32 Firmware & Setup</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1800px] w-full mx-auto">
        {/* Left Column: Device & Hardware State (Col span 3) */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <DevicePanel
            deviceId={deviceId}
            isOnline={isOnline}
            packetRateHz={packetRateHz}
            totalPackets={totalPackets}
            lastPacketTime={lastPacketTime}
            isPaused={isPaused}
            onTogglePause={togglePause}
            onOpenFirmware={() => setFirmwareModalOpen(true)}
          />

          <RawTelemetryPanel raw={rawPacket} />
        </div>

        {/* Center Column: 2D Virtual Map Canvas (Col span 6) */}
        <div className="lg:col-span-6 flex flex-col space-y-4 min-h-[500px] h-[640px] lg:h-auto">
          <VirtualMapCanvas
            trajectory={trajectory}
            navState={navState}
            onResetPosition={resetPosition}
            onClearTrajectory={clearTrajectory}
            isOnline={isOnline}
          />
        </div>

        {/* Right Column: Estimated Navigation State (Col span 3) */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <EstimatedNavPanel navState={navState} />

          {/* Quick Hardware Reference Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg font-mono text-xs space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between border-b border-slate-800 pb-2">
              <span>ACTIVE PROTOCOL</span>
              <span className="text-[10px] text-emerald-400">100ms Fixed</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              MPU6050 reading code on ESP32 is 100% immutable. Packets arrive via{" "}
              <code className="text-sky-300">POST /api/mpu</code> with pure signed integers.
            </div>
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
              <span>Coordinate Frame:</span>
              <span className="text-slate-300">Origin (0,0) = START</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Position Units:</span>
              <span className="text-sky-300 font-bold">Centimeters (cm)</span>
            </div>
          </div>
        </div>

        {/* Bottom Full-Width Diagnostics Inspector */}
        <div className="lg:col-span-12">
          <DebugPanel
            raw={rawPacket}
            estimated={navState}
            recentPackets={recentRawList}
            isOnline={isOnline}
            packetRateHz={packetRateHz}
          />
        </div>
      </main>

      {/* Global Status Bar */}
      <StatusBar
        navState={navState}
        isOnline={isOnline}
        packetRateHz={packetRateHz}
        totalPackets={totalPackets}
        wsConnected={wsConnected}
      />

      {/* ESP32 Firmware & Setup Modal */}
      <FirmwareModal
        isOpen={firmwareModalOpen}
        onClose={() => setFirmwareModalOpen(false)}
      />
    </div>
  );
}
