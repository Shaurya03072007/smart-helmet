import { useState } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  Code,
  FileCode,
  Wifi,
  HelpCircle,
  Cpu,
  Layers,
} from "lucide-react";

interface FirmwareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirmwareModal({ isOpen, onClose }: FirmwareModalProps) {
  const [activeTab, setActiveTab] = useState<"wifi_transport" | "original_mpu" | "wiring" | "api_spec" | "math_explanation">("wifi_transport");
  const [copied, setCopied] = useState<boolean>(false);

  // User configurable inputs for convenience
  const [ssid, setSsid] = useState<string>("YOUR_WIFI_SSID");
  const [password, setPassword] = useState<string>("YOUR_WIFI_PASSWORD");
  const defaultBackendUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/api/mpu`
    : "http://192.168.1.100:3000/api/mpu";
  const [backendUrl, setBackendUrl] = useState<string>(defaultBackendUrl);

  if (!isOpen) return null;

  const originalMpuCode = `// Original MPU6050 reading code provided by user
// IMMUTABLE: Treated as a black box - no modifications made.

#include <Wire.h>

#define MPU6050_ADDR 0x68

void setup() {
    Serial.begin(115200);

    Wire.begin(21,22);  // SDA, SCL — change if necessary

    // Wake MPU6050
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x6B);  // PWR_MGMT_1
    Wire.write(0x00);
    Wire.endTransmission();
}

int16_t read16() {
    int16_t value = (Wire.read() << 8) | Wire.read();
    return value;
}

void loop() {
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x3B);  // Start at ACCEL_XOUT_H
    Wire.endTransmission(false);

    Wire.requestFrom(MPU6050_ADDR, 14);

    int16_t Ax = read16();
    int16_t Ay = read16();
    int16_t Az = read16();

    int16_t temperature = read16();

    int16_t Gx = read16();
    int16_t Gy = read16();
    int16_t Gz = read16();

    Serial.print("Ax: ");
    Serial.print(Ax);

    Serial.print(" | Ay: ");
    Serial.print(Ay);

    Serial.print(" | Az: ");
    Serial.print(Az);

    Serial.print(" | Gx: ");
    Serial.print(Gx);

    Serial.print(" | Gy: ");
    Serial.print(Gy);

    Serial.print(" | Gz: ");
    Serial.println(Gz);

    delay(100);
}`;

  const generatedWifiCode = `/*
 * ============================================================================
 * ESP32 Wi-Fi Transport Layer for MPU6050 2D Virtual Navigation Map
 * ============================================================================
 * 
 * CRITICAL RULE ADHERED TO:
 * The original MPU6050 I2C initialization, register reads, variable names,
 * and raw sensor values (Ax, Ay, Az, Gx, Gy, Gz) remain 100% UNCHANGED.
 * The Wi-Fi transport is wrapped cleanly around the sensor code.
 * No filtering, fusion, or conversion is done on the ESP32.
 * ============================================================================
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==========================================
const char* WIFI_SSID = "${ssid}";
const char* WIFI_PASSWORD = "${password}";
const char* BACKEND_URL = "${backendUrl}";
const char* DEVICE_ID = "helmet-01";

// ==========================================
// 2. ORIGINAL MPU6050 CONSTANTS (UNCHANGED)
// ==========================================
#define MPU6050_ADDR 0x68

// Wi-Fi reconnection helper
void ensureWiFiConnected() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[Wi-Fi] Disconnected. Reconnecting...");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        unsigned long startAttemptTime = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 5000) {
            delay(250);
            Serial.print(".");
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\\n[Wi-Fi] Reconnected! IP: " + WiFi.localIP().toString());
        }
    }
}

// Function to send raw values over HTTP POST without modification
void sendRawSensorData(int16_t Ax, int16_t Ay, int16_t Az, int16_t Gx, int16_t Gy, int16_t Gz) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1000);

    // Exact raw integers transmitted directly in JSON
    String jsonPayload = "{";
    jsonPayload += "\\"deviceId\\":\\"" + String(DEVICE_ID) + "\\",";
    jsonPayload += "\\"timestamp\\":" + String(millis()) + ",";
    jsonPayload += "\\"ax\\":" + String(Ax) + ",";
    jsonPayload += "\\"ay\\":" + String(Ay) + ",";
    jsonPayload += "\\"az\\":" + String(Az) + ",";
    jsonPayload += "\\"gx\\":" + String(Gx) + ",";
    jsonPayload += "\\"gy\\":" + String(Gy) + ",";
    jsonPayload += "\\"gz\\":" + String(Gz);
    jsonPayload += "}";

    int httpResponseCode = http.POST(jsonPayload);
    http.end();
}

// ==========================================
// 3. ORIGINAL SETUP & READ FUNCTIONS
// ==========================================
void setup() {
    Serial.begin(115200);

    // Wi-Fi Transport Initialization
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("[Wi-Fi] Connecting to: ");
    Serial.println(WIFI_SSID);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(300);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());
    }

    // --- EXACT ORIGINAL MPU6050 CODE UNCHANGED ---
    Wire.begin(21,22);  // SDA, SCL — change if necessary

    // Wake MPU6050
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x6B);  // PWR_MGMT_1
    Wire.write(0x00);
    Wire.endTransmission();
}

int16_t read16() {
    int16_t value = (Wire.read() << 8) | Wire.read();
    return value;
}

// ==========================================
// 4. MAIN LOOP
// ==========================================
void loop() {
    // --- EXACT ORIGINAL MPU6050 CODE (UNCHANGED) ---
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x3B);  // Start at ACCEL_XOUT_H
    Wire.endTransmission(false);

    Wire.requestFrom(MPU6050_ADDR, 14);

    int16_t Ax = read16();
    int16_t Ay = read16();
    int16_t Az = read16();

    int16_t temperature = read16();

    int16_t Gx = read16();
    int16_t Gy = read16();
    int16_t Gz = read16();

    Serial.print("Ax: ");
    Serial.print(Ax);

    Serial.print(" | Ay: ");
    Serial.print(Ay);

    Serial.print(" | Az: ");
    Serial.print(Az);

    Serial.print(" | Gx: ");
    Serial.print(Gx);

    Serial.print(" | Gy: ");
    Serial.print(Gy);

    Serial.print(" | Gz: ");
    Serial.println(Gz);

    // --- WI-FI TRANSPORT LAYER (WRAPPED AROUND SENSOR VALUES) ---
    ensureWiFiConnected();
    sendRawSensorData(Ax, Ay, Az, Gx, Gy, Gz);

    delay(100);
}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold text-white">ESP32 Firmware, Transport & Documentation</h2>
              <p className="text-[11px] text-slate-400">Complete sketches and architecture specification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 space-x-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("wifi_transport")}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "wifi_transport"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi Transport (.ino)</span>
          </button>

          <button
            onClick={() => setActiveTab("original_mpu")}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "original_mpu"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Original MPU Code</span>
          </button>

          <button
            onClick={() => setActiveTab("wiring")}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "wiring"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wiring & Hardware</span>
          </button>

          <button
            onClick={() => setActiveTab("api_spec")}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "api_spec"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>API & WebSocket Spec</span>
          </button>

          <button
            onClick={() => setActiveTab("math_explanation")}
            className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "math_explanation"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Dead-Reckoning Math</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === "wifi_transport" && (
            <div className="space-y-4">
              {/* Interactive Configuration Quick-Filler */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-amber-400">
                  Step 1: Configure Your Wi-Fi & Backend Endpoint
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">WIFI_SSID</label>
                    <input
                      type="text"
                      value={ssid}
                      onChange={(e) => setSsid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">WIFI_PASSWORD</label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">BACKEND_URL (HTTP POST)</label>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Code display with actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400">
                  File: <code className="text-sky-300">esp32/wifi_transport.ino</code>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(generatedWifiCode)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Sketch"}</span>
                  </button>
                  <button
                    onClick={() => downloadFile("wifi_transport.ino", generatedWifiCode)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .ino</span>
                  </button>
                </div>
              </div>

              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 overflow-x-auto font-mono max-h-[360px]">
                {generatedWifiCode}
              </pre>
            </div>
          )}

          {activeTab === "original_mpu" && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-300/90 text-xs">
                <strong>Immutable Original Code:</strong> This is the exact, unaltered MPU6050 reading
                code you supplied. The Wi-Fi transport layer encapsulates this without touching register
                addresses, variable names, or raw values.
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  File: <code className="text-sky-300">esp32/mpu6050_original.ino</code>
                </div>
                <button
                  onClick={() => copyToClipboard(originalMpuCode)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 overflow-x-auto font-mono max-h-[380px]">
                {originalMpuCode}
              </pre>
            </div>
          )}

          {activeTab === "wiring" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2">ESP32 to MPU6050 Hardware Pinout</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-2 px-3">MPU6050 Pin</th>
                        <th className="py-2 px-3">ESP32 Pin</th>
                        <th className="py-2 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2 px-3 font-bold text-amber-400">VCC</td>
                        <td className="py-2 px-3 text-sky-400 font-bold">3.3V (or 5V if module has LDO)</td>
                        <td className="py-2 px-3 text-slate-400">Power Supply</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-slate-400">GND</td>
                        <td className="py-2 px-3 text-slate-400 font-bold">GND</td>
                        <td className="py-2 px-3 text-slate-400">Common Ground</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-sky-400">SDA</td>
                        <td className="py-2 px-3 text-sky-400 font-bold">GPIO 21</td>
                        <td className="py-2 px-3 text-slate-400">I2C Data line (Wire.begin(21, 22))</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-sky-400">SCL</td>
                        <td className="py-2 px-3 text-sky-400 font-bold">GPIO 22</td>
                        <td className="py-2 px-3 text-slate-400">I2C Clock line</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-slate-400">AD0</td>
                        <td className="py-2 px-3 text-slate-400 font-bold">GND (Default)</td>
                        <td className="py-2 px-3 text-slate-400">Sets I2C address to 0x68</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400">Flashing with Arduino IDE:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  <li>Open Arduino IDE, select board: <strong>ESP32 Dev Module</strong>.</li>
                  <li>Ensure baud rate is set to <strong>115200</strong> in Serial Monitor.</li>
                  <li>Update <code>WIFI_SSID</code>, <code>WIFI_PASSWORD</code>, and <code>BACKEND_URL</code>.</li>
                  <li>Click Upload. The ESP32 will connect to Wi-Fi and stream raw 16-bit packets!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "api_spec" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-sky-400">1. HTTP POST Endpoint: /api/mpu</div>
                <div className="text-[11px] text-slate-400">Consumes raw sensor packet from ESP32.</div>
                <pre className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-200">
{`POST /api/mpu HTTP/1.1
Host: your-app.run.app
Content-Type: application/json

{
  "deviceId": "helmet-01",
  "timestamp": 123456789,
  "ax": -13176,
  "ay": 128,
  "az": 9484,
  "gx": 171,
  "gy": 191,
  "gz": -9
}`}
                </pre>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-emerald-400">2. WebSocket Broadcast: /ws</div>
                <div className="text-[11px] text-slate-400">Live position message broadcast to browser canvas:</div>
                <pre className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-200">
{`{
  "type": "position",
  "deviceId": "helmet-01",
  "x": 14.72,
  "y": 8.31,
  "heading": 74.2,
  "timestamp": 123456789,
  "speed": 0.85,
  "distance": 16.90
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "math_explanation" && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-[11px] text-slate-300 leading-relaxed">
              <h3 className="text-xs font-bold text-sky-400">
                How Raw MPU6050 Values Become Estimated X/Y Coordinates
              </h3>
              <p>
                The MPU6050 measures acceleration (Ax, Ay, Az in LSB) and angular velocity (Gx, Gy, Gz in LSB),
                not position. The navigation engine converts raw readings through dead-reckoning:
              </p>

              <div className="space-y-2 pl-2 border-l-2 border-sky-500/50">
                <div>
                  <strong className="text-amber-400">1. Gyroscope to Heading:</strong>
                  <br />
                  Gz is angular velocity around the vertical Z-axis. With default full-scale ±250°/s, sensitivity is 131 LSB/(°/s).
                  <br />
                  Yaw rate = (Gz - Gz_bias) / 131.0 [°/s].
                  <br />
                  Δheading = Yaw_rate × Δt.
                  <br />
                  Heading is wrapped continuously to [0, 360°).
                </div>

                <div>
                  <strong className="text-sky-400">2. Accelerometer to Step / Motion Displacement:</strong>
                  <br />
                  Acceleration magnitude |A| = sqrt(Ax² + Ay² + Az²) / 16384.0 (in units of g, ~1.0g at rest).
                  <br />
                  Dynamic acceleration = ||A| - 1.0|. Peak detection with a refractory window identifies human/helmet
                  footsteps (Pedestrian Dead Reckoning). Step length L ≈ 0.65m - 0.80m.
                </div>

                <div>
                  <strong className="text-emerald-400">3. 2D Coordinate Update:</strong>
                  <br />
                  ΔX = L × sin(heading × π / 180) [East / West]
                  <br />
                  ΔY = L × cos(heading × π / 180) [North / South]
                  <br />
                  X_new = X_prev + ΔX, Y_new = Y_prev + ΔY.
                </div>
              </div>

              <div className="p-2 bg-amber-950/20 border border-amber-500/30 rounded text-amber-300/80">
                <strong>Honest Engineering Disclaimer:</strong> MPU6050 dead reckoning produces an approximate relative trajectory. Because inertial sensors accumulate drift over time without GPS or external beacons, coordinates are explicitly labeled <code>POSITION: ESTIMATED</code>.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
