import { EstimatedNavigationState } from "../types";
import { Wifi, WifiOff, Terminal, Compass, MapPin } from "lucide-react";

interface StatusBarProps {
  navState: EstimatedNavigationState;
  isOnline: boolean;
  packetRateHz: number;
  totalPackets: number;
  wsConnected: boolean;
}

export function StatusBar({
  navState,
  isOnline,
  packetRateHz,
  totalPackets,
  wsConnected,
}: StatusBarProps) {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 shadow-inner gap-y-2">
      {/* Primary Coordinates and Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">X:</span>
          <span className="font-bold text-sky-300">
            {navState.x >= 0 ? `+${navState.x.toFixed(1)}` : navState.x.toFixed(1)}cm
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Y:</span>
          <span className="font-bold text-sky-300">
            {navState.y >= 0 ? `+${navState.y.toFixed(1)}` : navState.y.toFixed(1)}cm
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Heading:</span>
          <span className="font-bold text-amber-300">{navState.heading.toFixed(1)}°</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-slate-400">
          <span>Dist:</span>
          <span className="text-slate-200 font-semibold">{navState.distance.toFixed(1)}cm</span>
        </div>
      </div>

      {/* Network & Infrastructure Health */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Wi-Fi & Device link */}
        <div className="flex items-center space-x-1.5">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className="text-slate-400">Wi-Fi:</span>
          <span className={isOnline ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
            {isOnline ? "Connected" : "Disconnected"}
          </span>
        </div>

        <span className="text-slate-600">|</span>

        {/* Packet Rate */}
        <div className="hidden md:flex items-center space-x-1">
          <span className="text-slate-400">Rate:</span>
          <span className="text-slate-200">{packetRateHz.toFixed(1)} Hz</span>
        </div>

        <span className="text-slate-600 hidden md:inline">|</span>

        {/* Backend & WS status */}
        <div className="flex items-center space-x-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? "bg-emerald-400" : "bg-rose-500 animate-ping"
            }`}
          />
          <span className="text-slate-400">Server WS:</span>
          <span className={wsConnected ? "text-emerald-400" : "text-rose-400"}>
            {wsConnected ? "Online" : "Connecting..."}
          </span>
        </div>
      </div>
    </footer>
  );
}
