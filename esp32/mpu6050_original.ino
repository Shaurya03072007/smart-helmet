// Original MPU6050 reading code provided by user
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
}
