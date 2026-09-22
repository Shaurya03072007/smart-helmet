import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { SensorStore } from "./src/server/sensorStore.js";
import { NavigationEngine } from "./src/server/navigation.js";
import { RawMpuPacket, WebSocketBroadcastMessage } from "./src/server/types.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const sensorStore = new SensorStore("helmet-01");
  const navigationEngine = new NavigationEngine("helmet-01");

  // HTTP & WebSocket Server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  // Broadcast to all connected WebSocket clients
  function broadcast(data: WebSocketBroadcastMessage) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Handle new WebSocket client connections
  wss.on("connection", (ws: WebSocket) => {
    // Send immediate initial sync
    const raw = sensorStore.getLatestRawPacket();
    const estimated = navigationEngine.getState();
    const trajectory = sensorStore.getTrajectory();
    const isOnline = sensorStore.isOnline();
    const packetRateHz = sensorStore.getPacketRateHz();
    const totalPackets = sensorStore.getTotalPackets();

    const syncMessage: WebSocketBroadcastMessage = {
      type: "initial_sync",
      state: {
        deviceId: sensorStore.getDeviceId(),
        isOnline,
        lastPacketTime: sensorStore.getLastPacketTime(),
        packetRateHz,
        totalPackets,
        raw,
        estimated,
        isPaused: sensorStore.isPaused(),
        trajectory,
      },
    };

    ws.send(JSON.stringify(syncMessage));

    // Handle messages from dashboard
    ws.on("message", (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.action === "reset_position") {
          handleResetPosition();
        } else if (parsed.action === "clear_trajectory") {
          handleClearTrajectory();
        } else if (parsed.action === "toggle_pause") {
          const paused = sensorStore.setPaused(Boolean(parsed.pause));
          broadcast({
            type: "tracking_paused",
            deviceId: sensorStore.getDeviceId(),
            isPaused: paused,
          });
        }
      } catch (err) {
        console.error("Error parsing WebSocket client message:", err);
      }
    });
  });

  // Background monitoring for device online/offline status transitions
  let lastReportedOnlineState = false;
  setInterval(() => {
    const currentOnline = sensorStore.isOnline();
    if (currentOnline !== lastReportedOnlineState) {
      lastReportedOnlineState = currentOnline;
      broadcast({
        type: "device_status",
        deviceId: sensorStore.getDeviceId(),
        isOnline: currentOnline,
        lastPacketTime: sensorStore.getLastPacketTime(),
        packetRateHz: sensorStore.getPacketRateHz(),
      });
    }
  }, 1000);

  // Helper actions
  function handleResetPosition() {
    const currentState = navigationEngine.getState();
    navigationEngine.reset(true); // preserve current heading
    const newPoint = sensorStore.resetPosition(currentState.heading);

    broadcast({
      type: "state_reset",
      deviceId: sensorStore.getDeviceId(),
      x: 0,
      y: 0,
      heading: currentState.heading,
      newStartPoint: newPoint,
    });
  }

  function handleClearTrajectory() {
    sensorStore.clearTrajectory();
    broadcast({
      type: "trajectory_cleared",
      deviceId: sensorStore.getDeviceId(),
    });
  }

  // =========================================================================
  // API ROUTES
  // =========================================================================

  // 1. Core ESP32 Ingestion: POST /api/mpu
  app.post("/api/mpu", (req, res) => {
    const body = req.body;

    // Validate incoming payload strictly
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Malformed request. JSON object required." });
      return;
    }

    const { ax, ay, az, gx, gy, gz } = body;
    if (
      typeof ax !== "number" ||
      typeof ay !== "number" ||
      typeof az !== "number" ||
      typeof gx !== "number" ||
      typeof gy !== "number" ||
      typeof gz !== "number"
    ) {
      res.status(400).json({
        error: "Missing or invalid raw sensor readings. Required numeric fields: ax, ay, az, gx, gy, gz.",
        received: body,
      });
      return;
    }

    const packet: RawMpuPacket = {
      deviceId: typeof body.deviceId === "string" ? body.deviceId : "helmet-01",
      timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
      ax: Math.round(ax),
      ay: Math.round(ay),
      az: Math.round(az),
      gx: Math.round(gx),
      gy: Math.round(gy),
      gz: Math.round(gz),
    };

    // Store raw sensor packet without modification
    sensorStore.storeRawPacket(packet);

    // Process through Navigation Engine if not paused
    if (!sensorStore.isPaused()) {
      const { estimated, newPoint } = navigationEngine.processPacket(packet);
      sensorStore.addTrajectoryPoint(newPoint);

      // Broadcast telemetry to connected web dashboards
      broadcast({
        type: "telemetry",
        deviceId: packet.deviceId,
        raw: packet,
        estimated,
        trajectoryPoint: newPoint,
        isOnline: true,
        packetRateHz: sensorStore.getPacketRateHz(),
        totalPackets: sensorStore.getTotalPackets(),
      });

      // Broadcast position message as specified in Part 10
      broadcast({
        type: "position",
        deviceId: packet.deviceId,
        x: estimated.x,
        y: estimated.y,
        heading: estimated.heading,
        timestamp: estimated.timestamp,
        speed: estimated.speed,
        distance: estimated.distance,
      });

      res.status(200).json({
        status: "ok",
        deviceId: packet.deviceId,
        estimated: {
          x: estimated.x,
          y: estimated.y,
          heading: estimated.heading,
          speed: estimated.speed,
        },
      });
    } else {
      res.status(200).json({ status: "paused", deviceId: packet.deviceId });
    }
  });

  // 2. Telemetry Status: GET /api/status
  app.get("/api/status", (_req, res) => {
    res.json({
      deviceId: sensorStore.getDeviceId(),
      isOnline: sensorStore.isOnline(),
      lastPacketTime: sensorStore.getLastPacketTime(),
      packetRateHz: sensorStore.getPacketRateHz(),
      totalPackets: sensorStore.getTotalPackets(),
      isPaused: sensorStore.isPaused(),
      latestRaw: sensorStore.getLatestRawPacket(),
      estimated: navigationEngine.getState(),
    });
  });

  // 3. History: GET /api/history
  app.get("/api/history", (req, res) => {
    const limit = Number(req.query.limit) || 100;
    res.json({
      rawPackets: sensorStore.getRecentRawPackets(limit),
      trajectory: sensorStore.getTrajectory(),
    });
  });

  // 4. Controls: POST /api/reset
  app.post("/api/reset", (_req, res) => {
    handleResetPosition();
    res.json({ status: "ok", message: "Position reset to origin (0,0)" });
  });

  // 5. Controls: POST /api/clear
  app.post("/api/clear", (_req, res) => {
    handleClearTrajectory();
    res.json({ status: "ok", message: "Trajectory cleared" });
  });

  // 6. Controls: POST /api/pause
  app.post("/api/pause", (req, res) => {
    const shouldPause = req.body?.pause !== undefined ? Boolean(req.body.pause) : !sensorStore.isPaused();
    sensorStore.setPaused(shouldPause);
    broadcast({
      type: "tracking_paused",
      deviceId: sensorStore.getDeviceId(),
      isPaused: shouldPause,
    });
    res.json({ status: "ok", isPaused: shouldPause });
  });

  // 7. Simulation Loop for testing without ESP32
  let simulationInterval: NodeJS.Timeout | null = null;
  let simHeading = 45;
  let simStep = 0;

  app.post("/api/simulate", (req, res) => {
    const enable = Boolean(req.body?.enable);

    if (enable && !simulationInterval) {
      // Start simulator streaming realistic raw MPU6050 int16 readings at 10 Hz
      simulationInterval = setInterval(() => {
        simStep++;
        // Simulate subtle turns and walking acceleration cycles
        const turnRate = Math.sin(simStep * 0.05) * 20; // deg/s
        simHeading = (simHeading + turnRate * 0.1) % 360;

        // Walking cycle: ~1.8 Hz footstep cadence
        const walkingCadence = Math.sin(simStep * 0.6);
        const dynamicG = walkingCadence > 0.4 ? walkingCadence * 0.35 : 0;

        // MPU6050 raw integers:
        // ~1g downward gravity on Az + dynamic fluctuation
        const rawAz = Math.round((1.0 + dynamicG) * 16384);
        const rawAx = Math.round(Math.sin(simStep * 0.3) * 1200);
        const rawAy = Math.round(Math.cos(simStep * 0.3) * 1500);

        // Gyro Z in raw LSB (131 LSB per deg/s)
        const rawGz = Math.round(turnRate * 131);
        const rawGx = Math.round((Math.random() - 0.5) * 80);
        const rawGy = Math.round((Math.random() - 0.5) * 80);

        const packet: RawMpuPacket = {
          deviceId: "helmet-01",
          timestamp: Date.now(),
          ax: rawAx,
          ay: rawAy,
          az: rawAz,
          gx: rawGx,
          gy: rawGy,
          gz: rawGz,
        };

        sensorStore.storeRawPacket(packet);

        if (!sensorStore.isPaused()) {
          const { estimated, newPoint } = navigationEngine.processPacket(packet);
          sensorStore.addTrajectoryPoint(newPoint);

          broadcast({
            type: "telemetry",
            deviceId: packet.deviceId,
            raw: packet,
            estimated,
            trajectoryPoint: newPoint,
            isOnline: true,
            packetRateHz: sensorStore.getPacketRateHz(),
            totalPackets: sensorStore.getTotalPackets(),
          });

          broadcast({
            type: "position",
            deviceId: packet.deviceId,
            x: estimated.x,
            y: estimated.y,
            heading: estimated.heading,
            timestamp: estimated.timestamp,
            speed: estimated.speed,
            distance: estimated.distance,
          });
        }
      }, 100);

      res.json({ status: "ok", simulationRunning: true });
    } else if (!enable && simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      res.json({ status: "ok", simulationRunning: false });
    } else {
      res.json({ status: "ok", simulationRunning: Boolean(simulationInterval) });
    }
  });

  // Status check on simulator
  app.get("/api/simulate/status", (_req, res) => {
    res.json({ simulationRunning: Boolean(simulationInterval) });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`ESP32 Navigation Map Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
