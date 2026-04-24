#pragma once
#include <ESP32Servo.h>
#include "GlobalState.h"

Servo doorServo;
const int SERVO_PIN = 42; // Cắm vào GPIO 42 trên S3-N16R8

void TaskServo(void *pvParameters) {
    doorServo.setPeriodHertz(50); // Tần số chuẩn cho Servo 50Hz
    doorServo.attach(SERVO_PIN, 500, 2400); 
    doorServo.write(0); // Khởi tạo cửa đóng
    
    for (;;) {
        if (currentState == STATE_MATCH_FOUND) {
            doorServo.write(90); // Mở cửa
            vTaskDelay(3000 / portTICK_PERIOD_MS); // Đợi người dùng đi qua
            doorServo.write(0);  // Đóng cửa lại
        }
        vTaskDelay(50 / portTICK_PERIOD_MS);
    }
}