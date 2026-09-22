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
  x: number;
  y: number;
  heading: number;
  speed: number;
  distance: number;
  steps: number;
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
