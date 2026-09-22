/*
 * ============================================================================
 * ESP32 Wi-Fi Transport Layer for MPU6050 2D Virtual Navigation Map
 * ============================================================================
 * 
 * CRITICAL RULE ADHERED TO:
 * The original MPU6050 I2C initialization, register reads, variable names,
 * and raw sensor values (Ax, Ay, Az, Gx, Gy, Gz) remain 100% UNCHANGED.
 * The Wi-Fi transport is wrapped cleanly around the sensor code.
 * No filtering, fusion, or conversion is done on the ESP32.
 * 
 * Target Hardware: ESP32 Dev Module (WROOM-32 / NodeMCU-32S)
 * Sensors: MPU6050 6-DOF IMU (I2C: SDA=GPIO21, SCL=GPIO22)
 * ============================================================================
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==========================================
// Replace with your local Wi-Fi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API endpoint URL. 
// If running on local network, use your computer's local IP (e.g., http://192.168.1.100:3000/api/mpu)
// Or use your deployed cloud backend URL (e.g., https://your-app.run.app/api/mpu)
const char* BACKEND_URL = "http://192.168.1.100:3000/api/mpu";

// Device Identifier (e.g. "helmet-01", "miner-01")
const char* DEVICE_ID = "helmet-01";

// Transmission interval in milliseconds
const unsigned long SEND_INTERVAL_MS = 100; // 10 Hz transmission rate
unsigned long lastSendTime = 0;

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
        // Try reconnecting for up to 5 seconds
        while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 5000) {
            delay(250);
            Serial.print(".");
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\n[Wi-Fi] Reconnected! IP: " + WiFi.localIP().toString());
        } else {
            Serial.println("\n[Wi-Fi] Reconnection failed; will retry next cycle.");
        }
    }
}

// Function to send raw values over HTTP POST
void sendRawSensorData(int16_t Ax, int16_t Ay, int16_t Az, int16_t Gx, int16_t Gy, int16_t Gz) {
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1000); // 1-second timeout

    // Build JSON payload with exact raw integers
    // Format: {"deviceId":"helmet-01","timestamp":123456,"ax":-13176,"ay":128,"az":9484,"gx":171,"gy":191,"gz":-9}
    String jsonPayload = "{";
    jsonPayload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
    jsonPayload += "\"timestamp\":" + String(millis()) + ",";
    jsonPayload += "\"ax\":" + String(Ax) + ",";
    jsonPayload += "\"ay\":" + String(Ay) + ",";
    jsonPayload += "\"az\":" + String(Az) + ",";
    jsonPayload += "\"gx\":" + String(Gx) + ",";
    jsonPayload += "\"gy\":" + String(Gy) + ",";
    jsonPayload += "\"gz\":" + String(Gz);
    jsonPayload += "}";

    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode > 0) {
        // Successful response code (200 OK)
        // Keep logging concise to not flood the serial monitor
    } else {
        Serial.printf("[HTTP POST Error] Code: %d (%s)\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
    }
    http.end();
}

// ==========================================
// 3. ORIGINAL SETUP & READ FUNCTIONS
// ==========================================
void setup() {
    Serial.begin(115200);

    // --- Wi-Fi Transport Initialization ---
    Serial.println("\n--- ESP32 MPU6050 Navigation Node Booting ---");
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
        Serial.println("\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());
    } else {
        Serial.println("\n[Wi-Fi] Initial connection timed out. Reconnection loop active.");
    }

    // --- ORIGINAL MPU6050 CODE UNCHANGED ---
    Wire.begin(21,22);  // SDA, SCL — change if necessary

    // Wake MPU6050
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x6B);  // PWR_MGMT_1
    Wire.write(0x00);
    Wire.endTransmission();
    Serial.println("[MPU6050] Initialized on I2C pins 21/22.");
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
}
