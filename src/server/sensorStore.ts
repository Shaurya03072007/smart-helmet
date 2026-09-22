import { RawMpuPacket, TrajectoryPoint, EstimatedNavigationState, DeviceTelemetrySummary } from './types.js';

export class SensorStore {
  private rawPackets: RawMpuPacket[] = [];
  private maxStoredRawPackets: number = 2000; // Keep recent raw packets in memory for inspection
  private trajectory: TrajectoryPoint[] = [];
  private maxTrajectoryPoints: number = 3000;

  private currentDeviceId: string = "helmet-01";
  private lastPacketTimestamp: number = 0;
  private totalPacketsReceived: number = 0;
  private isTrackingPaused: boolean = false;

  // Packet rate calculation
  private packetTimestamps: number[] = [];
  private readonly RATE_WINDOW_MS = 2000;

  // Offline timeout: if no packet received within 4 seconds, marked OFFLINE
  private readonly OFFLINE_TIMEOUT_MS = 4000;

  constructor(defaultDeviceId: string = "helmet-01") {
    this.currentDeviceId = defaultDeviceId;
    // Initialize starting origin (0, 0)
    this.trajectory.push({
      id: 0,
      x: 0,
      y: 0,
      heading: 0,
      timestamp: Date.now(),
      isOrigin: true,
    });
  }

  public storeRawPacket(packet: RawMpuPacket): void {
    const now = Date.now();
    this.currentDeviceId = packet.deviceId || this.currentDeviceId;
    this.lastPacketTimestamp = now;
    this.totalPacketsReceived++;

    // Track timestamp for rate calculation
    this.packetTimestamps.push(now);
    const cutoff = now - this.RATE_WINDOW_MS;
    while (this.packetTimestamps.length > 0 && this.packetTimestamps[0] < cutoff) {
      this.packetTimestamps.shift();
    }

    // Append to raw packet buffer
    this.rawPackets.push({ ...packet });
    if (this.rawPackets.length > this.maxStoredRawPackets) {
      this.rawPackets.shift();
    }
  }

  public addTrajectoryPoint(point: TrajectoryPoint): void {
    if (this.isTrackingPaused) return;

    this.trajectory.push(point);
    if (this.trajectory.length > this.maxTrajectoryPoints) {
      // Keep origin point if needed, or maintain FIFO
      this.trajectory.shift();
    }
  }

  public resetPosition(currentHeading: number = 0): TrajectoryPoint {
    const now = Date.now();
    const newOrigin: TrajectoryPoint = {
      id: this.trajectory.length,
      x: 0,
      y: 0,
      heading: currentHeading,
      timestamp: now,
      isOrigin: true,
    };
    this.trajectory.push(newOrigin);
    return newOrigin;
  }

  public clearTrajectory(): void {
    this.trajectory = [
      {
        id: 0,
        x: 0,
        y: 0,
        heading: 0,
        timestamp: Date.now(),
        isOrigin: true,
      },
    ];
  }

  public setPaused(paused: boolean): boolean {
    this.isTrackingPaused = paused;
    return this.isTrackingPaused;
  }

  public isPaused(): boolean {
    return this.isTrackingPaused;
  }

  public getDeviceId(): string {
    return this.currentDeviceId;
  }

  public isOnline(): boolean {
    if (this.lastPacketTimestamp === 0) return false;
    return Date.now() - this.lastPacketTimestamp < this.OFFLINE_TIMEOUT_MS;
  }

  public getLastPacketTime(): number {
    return this.lastPacketTimestamp;
  }

  public getTotalPackets(): number {
    return this.totalPacketsReceived;
  }

  public getPacketRateHz(): number {
    if (this.packetTimestamps.length < 2) return 0;
    const durationSec = (this.packetTimestamps[this.packetTimestamps.length - 1] - this.packetTimestamps[0]) / 1000;
    if (durationSec <= 0) return 0;
    return Number(((this.packetTimestamps.length - 1) / durationSec).toFixed(1));
  }

  public getLatestRawPacket(): RawMpuPacket | null {
    if (this.rawPackets.length === 0) return null;
    return this.rawPackets[this.rawPackets.length - 1];
  }

  public getRecentRawPackets(count: number = 50): RawMpuPacket[] {
    return this.rawPackets.slice(-count);
  }

  public getTrajectory(): TrajectoryPoint[] {
    return [...this.trajectory];
  }
}
