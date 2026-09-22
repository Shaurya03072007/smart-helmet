export interface RawMpuPacket {
  deviceId: string;
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export interface EstimatedNavigationState {
  deviceId: string;
  x: number; // meters East/West (+X = East)
  y: number; // meters North/South (+Y = North)
  heading: number; // degrees 0-359.9°
  speed: number; // meters per second
  distance: number; // total accumulated meters
  steps: number; // detected movement steps
  motionDetected: boolean;
  timestamp: number;
  originTime: number;
}

export interface TrajectoryPoint {
  id: number;
  x: number;
  y: number;
  heading: number;
  timestamp: number;
  isOrigin?: boolean;
}

export interface DeviceTelemetrySummary {
  deviceId: string;
  isOnline: boolean;
  lastPacketTime: number;
  packetRateHz: number;
  totalPackets: number;
  raw: RawMpuPacket | null;
  estimated: EstimatedNavigationState;
  isPaused: boolean;
  trajectory: TrajectoryPoint[];
}

export type WebSocketBroadcastMessage =
  | {
      type: "telemetry";
      deviceId: string;
      raw: RawMpuPacket;
      estimated: EstimatedNavigationState;
      trajectoryPoint: TrajectoryPoint;
      isOnline: boolean;
      packetRateHz: number;
      totalPackets: number;
    }
  | {
      type: "position";
      deviceId: string;
      x: number;
      y: number;
      heading: number;
      timestamp: number;
      speed: number;
      distance: number;
    }
  | {
      type: "device_status";
      deviceId: string;
      isOnline: boolean;
      lastPacketTime: number;
      packetRateHz: number;
    }
  | {
      type: "state_reset";
      deviceId: string;
      x: number;
      y: number;
      heading: number;
      newStartPoint: TrajectoryPoint;
    }
  | {
      type: "trajectory_cleared";
      deviceId: string;
    }
  | {
      type: "tracking_paused";
      deviceId: string;
      isPaused: boolean;
    }
  | {
      type: "initial_sync";
      state: DeviceTelemetrySummary;
    };
