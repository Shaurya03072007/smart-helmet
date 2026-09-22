import { useState, useEffect, useRef, useCallback } from "react";
import { RawMpuPacket, EstimatedNavigationState, TrajectoryPoint } from "../types";

export function useWebSocket() {
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>("helmet-01");
  const [packetRateHz, setPacketRateHz] = useState<number>(0);
  const [totalPackets, setTotalPackets] = useState<number>(0);
  const [lastPacketTime, setLastPacketTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [rawPacket, setRawPacket] = useState<RawMpuPacket>({
    deviceId: "helmet-01",
    timestamp: 0,
    ax: 0,
    ay: 0,
    az: 16384,
    gx: 0,
    gy: 0,
    gz: 0,
  });

  const [navState, setNavState] = useState<EstimatedNavigationState>({
    deviceId: "helmet-01",
    x: 0,
    y: 0,
    heading: 0,
    speed: 0,
    distance: 0,
    steps: 0,
    motionDetected: false,
    timestamp: 0,
    originTime: Date.now(),
  });

  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([
    { id: 0, x: 0, y: 0, heading: 0, timestamp: Date.now(), isOrigin: true },
  ]);

  const [recentRawList, setRecentRawList] = useState<RawMpuPacket[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "initial_sync": {
              const state = msg.state;
              setDeviceId(state.deviceId);
              setIsOnline(state.isOnline);
              setPacketRateHz(state.packetRateHz);
              setTotalPackets(state.totalPackets);
              setLastPacketTime(state.lastPacketTime);
              setIsPaused(state.isPaused);
              if (state.raw) {
                setRawPacket(state.raw);
                setRecentRawList([state.raw]);
              }
              if (state.estimated) {
                setNavState(state.estimated);
              }
              if (state.trajectory && state.trajectory.length > 0) {
                setTrajectory(state.trajectory);
              }
              break;
            }

            case "telemetry": {
              setDeviceId(msg.deviceId);
              setRawPacket(msg.raw);
              setNavState(msg.estimated);
              setIsOnline(msg.isOnline);
              setPacketRateHz(msg.packetRateHz);
              setTotalPackets(msg.totalPackets);
              setLastPacketTime(Date.now());

              setTrajectory((prev) => {
                const next = [...prev, msg.trajectoryPoint];
                // Keep last 1500 points for memory safety
                return next.length > 1500 ? next.slice(-1500) : next;
              });

              setRecentRawList((prev) => {
                const updated = [msg.raw, ...prev];
                return updated.slice(0, 30);
              });
              break;
            }

            case "position": {
              setNavState((prev) => ({
                ...prev,
                x: msg.x,
                y: msg.y,
                heading: msg.heading,
                speed: msg.speed,
                distance: msg.distance,
                timestamp: msg.timestamp,
              }));
              break;
            }

            case "device_status": {
              setIsOnline(msg.isOnline);
              setPacketRateHz(msg.packetRateHz);
              if (msg.lastPacketTime) setLastPacketTime(msg.lastPacketTime);
              break;
            }

            case "state_reset": {
              setNavState((prev) => ({
                ...prev,
                x: 0,
                y: 0,
                heading: msg.heading,
                speed: 0,
                distance: 0,
                steps: 0,
              }));
              setTrajectory((prev) => [...prev, msg.newStartPoint]);
              break;
            }

            case "trajectory_cleared": {
              setTrajectory([
                { id: Date.now(), x: 0, y: 0, heading: 0, timestamp: Date.now(), isOrigin: true },
              ]);
              break;
            }

            case "tracking_paused": {
              setIsPaused(msg.isPaused);
              break;
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (err) {
      console.error("WebSocket connection failure:", err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2500);
    }
  }, []);

  useEffect(() => {
    connect();

    // Initial fetch to ensure instant hydration
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.deviceId) setDeviceId(data.deviceId);
        if (data.isOnline !== undefined) setIsOnline(data.isOnline);
        if (data.packetRateHz !== undefined) setPacketRateHz(data.packetRateHz);
        if (data.totalPackets !== undefined) setTotalPackets(data.totalPackets);
        if (data.isPaused !== undefined) setIsPaused(data.isPaused);
        if (data.latestRaw) {
          setRawPacket(data.latestRaw);
          setRecentRawList([data.latestRaw]);
        }
        if (data.estimated) setNavState(data.estimated);
      })
      .catch((err) => console.log("Initial status fetch error:", err));

    fetch("/api/history?limit=30")
      .then((res) => res.json())
      .then((data) => {
        if (data.trajectory && data.trajectory.length > 0) {
          setTrajectory(data.trajectory);
        }
        if (data.rawPackets && data.rawPackets.length > 0) {
          setRecentRawList([...data.rawPackets].reverse());
        }
      })
      .catch((err) => console.log("Initial history fetch error:", err));

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Actions
  const resetPosition = useCallback(async () => {
    try {
      await fetch("/api/reset", { method: "POST" });
    } catch {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "reset_position" }));
      }
    }
  }, []);

  const clearTrajectory = useCallback(async () => {
    try {
      await fetch("/api/clear", { method: "POST" });
    } catch {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "clear_trajectory" }));
      }
    }
  }, []);

  const togglePause = useCallback(async () => {
    try {
      const nextPaused = !isPaused;
      await fetch("/api/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pause: nextPaused }),
      });
      setIsPaused(nextPaused);
    } catch {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "toggle_pause", pause: !isPaused }));
      }
    }
  }, [isPaused]);

  return {
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
  };
}
