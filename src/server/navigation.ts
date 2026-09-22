import { RawMpuPacket, EstimatedNavigationState, TrajectoryPoint } from './types.js';

/**
 * NavigationEngine:
 * Estimates 2D Cartesian position (X, Y in meters) and orientation (Heading in degrees)
 * from raw MPU6050 accelerometer and gyroscope data.
 * 
 * IMPORTANT:
 * - Operates in local Cartesian frame: (0,0) is START origin.
 * - +X = East (meters)
 * - +Y = North (meters)
 * - Heading: 0° = North, 90° = East, 180° = South, 270° = West.
 * - Explicitly labeled as ESTIMATED dead-reckoning.
 */
export class NavigationEngine {
  private deviceId: string;
  private x: number = 0;
  private y: number = 0;
  private heading: number = 0; // 0 - 360 degrees
  private speed: number = 0; // m/s
  private totalDistance: number = 0; // meters
  private stepCount: number = 0;
  private lastTimestamp: number = 0;
  private originTime: number = Date.now();

  // Sensor constants (Default MPU6050 register settings)
  // ±2g sensitivity = 16384 LSB/g
  private readonly ACCEL_SCALE = 16384.0;
  // ±250 °/s sensitivity = 131.0 LSB/(°/s)
  private readonly GYRO_SCALE = 131.0;

  // Calibration / Bias tracking
  private gzBias: number = 0;
  private biasSampleCount: number = 0;
  private readonly MAX_BIAS_SAMPLES = 50;

  // Step detection state
  private lastStepTime: number = 0;
  private prevAccelMag: number = 1.0;
  private isStepArmed: boolean = false;
  private readonly MIN_STEP_INTERVAL_MS = 280; // Max ~3.5 steps/sec
  private readonly STEP_THRESHOLD_G = 0.16; // Peak over 1g required for step

  // Motion smoothing
  private velocity: number = 0; // m/s
  private motionDetected: boolean = false;

  constructor(deviceId: string = "helmet-01") {
    this.deviceId = deviceId;
    this.reset();
  }

  public reset(preserveHeading: boolean = false): void {
    this.x = 0;
    this.y = 0;
    if (!preserveHeading) {
      this.heading = 0;
    }
    this.speed = 0;
    this.totalDistance = 0;
    this.stepCount = 0;
    this.velocity = 0;
    this.lastTimestamp = 0;
    this.originTime = Date.now();
  }

  /**
   * Process a raw MPU6050 packet:
   * Consumes unchanged Ax, Ay, Az, Gx, Gy, Gz integers and updates estimated state.
   */
  public processPacket(raw: RawMpuPacket): {
    estimated: EstimatedNavigationState;
    newPoint: TrajectoryPoint;
  } {
    const now = Date.now();
    let dt = (this.lastTimestamp > 0) ? (now - this.lastTimestamp) / 1000.0 : 0.1;
    // Guard against large time skips or pause resumes
    if (dt <= 0 || dt > 1.0) {
      dt = 0.1;
    }
    this.lastTimestamp = now;

    // --- 1. ORIENTATION (GYROSCOPE HEADING ESTIMATION) ---
    // Gz measures angular velocity around vertical Z-axis (Yaw)
    // Dynamic bias estimation when resting
    const accelMagG = Math.sqrt(raw.ax * raw.ax + raw.ay * raw.ay + raw.az * raw.az) / this.ACCEL_SCALE;
    const dynamicAccel = Math.abs(accelMagG - 1.0);

    const isNearlyResting = dynamicAccel < 0.04 && Math.abs(raw.gz) < 150;
    if (isNearlyResting && this.biasSampleCount < this.MAX_BIAS_SAMPLES) {
      this.gzBias = (this.gzBias * this.biasSampleCount + raw.gz) / (this.biasSampleCount + 1);
      this.biasSampleCount++;
    }

    const correctedGz = raw.gz - this.gzBias;
    const yawRateDegPerSec = correctedGz / this.GYRO_SCALE;

    // Deadband filter: ignore slight stationary gyro jitter (< 0.8 °/s)
    if (Math.abs(yawRateDegPerSec) > 0.8) {
      // Gyro sign convention: standard positive Z is CCW/CW depending on mount.
      // We integrate yaw rate:
      this.heading = (this.heading + yawRateDegPerSec * dt) % 360;
      if (this.heading < 0) {
        this.heading += 360;
      }
    }

    // --- 2. MOVEMENT / STEP / DISPLACEMENT ESTIMATION ---
    this.motionDetected = dynamicAccel > 0.08 || Math.abs(yawRateDegPerSec) > 3.0;

    let displacementMeters = 0;

    // A) Step Detection Model (Pedestrian Dead Reckoning for Wearables/Helmets)
    const timeSinceLastStep = now - this.lastStepTime;
    if (dynamicAccel > this.STEP_THRESHOLD_G && !this.isStepArmed) {
      this.isStepArmed = true;
    } else if (this.isStepArmed && dynamicAccel < this.STEP_THRESHOLD_G * 0.7 && timeSinceLastStep > this.MIN_STEP_INTERVAL_MS) {
      // Step detected on zero-crossing / descending edge
      this.isStepArmed = false;
      this.lastStepTime = now;
      this.stepCount++;

      // Adaptive step length estimation (0.60m to 0.85m based on acceleration intensity)
      const stepLength = Math.min(0.85, Math.max(0.60, 0.60 + dynamicAccel * 0.4));
      displacementMeters = stepLength;
    } else if (this.motionDetected && dynamicAccel > 0.12 && timeSinceLastStep > this.MIN_STEP_INTERVAL_MS * 1.5) {
      // B) Continuous Micro-displacement for non-step movement (e.g. smooth sliding or walking without sharp peaks)
      displacementMeters = Math.min(0.25, dynamicAccel * 0.5 * dt);
    }

    // Update velocity and speed
    if (displacementMeters > 0 && dt > 0) {
      const instantaneousSpeed = displacementMeters / dt;
      // Exponential moving average for smooth speed display
      this.velocity = this.velocity * 0.6 + instantaneousSpeed * 0.4;
    } else {
      // Zero Velocity Update (ZUPT): decelerate quickly to zero when at rest
      this.velocity = Math.max(0, this.velocity * 0.75 - 0.05);
    }
    this.speed = Number(this.velocity.toFixed(2));

    // --- 3. 2D COORDINATE POSITION UPDATE ---
    // Heading angle in radians (0° = North/+Y, 90° = East/+X)
    if (displacementMeters > 0) {
      const headingRad = (this.heading * Math.PI) / 180.0;
      const dx = displacementMeters * Math.sin(headingRad);
      const dy = displacementMeters * Math.cos(headingRad);

      this.x += dx;
      this.y += dy;
      this.totalDistance += displacementMeters;
    }

    const estimated: EstimatedNavigationState = {
      deviceId: raw.deviceId || this.deviceId,
      x: Number(this.x.toFixed(2)),
      y: Number(this.y.toFixed(2)),
      heading: Number(this.heading.toFixed(1)),
      speed: this.speed,
      distance: Number(this.totalDistance.toFixed(2)),
      steps: this.stepCount,
      motionDetected: this.motionDetected,
      timestamp: now,
      originTime: this.originTime,
    };

    const newPoint: TrajectoryPoint = {
      id: now,
      x: estimated.x,
      y: estimated.y,
      heading: estimated.heading,
      timestamp: now,
    };

    return { estimated, newPoint };
  }

  public getState(): EstimatedNavigationState {
    return {
      deviceId: this.deviceId,
      x: Number(this.x.toFixed(2)),
      y: Number(this.y.toFixed(2)),
      heading: Number(this.heading.toFixed(1)),
      speed: this.speed,
      distance: Number(this.totalDistance.toFixed(2)),
      steps: this.stepCount,
      motionDetected: this.motionDetected,
      timestamp: Date.now(),
      originTime: this.originTime,
    };
  }
}
