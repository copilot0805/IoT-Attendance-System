#pragma once
#include <Wire.h>               
#include <LiquidCrystal_I2C.h>
#include "GlobalState.h"

#define I2C_SDA 21
#define I2C_SCL 47
// #define I2C_SDA 1
// #define I2C_SCL 2

LiquidCrystal_I2C lcd(0x27, 16, 2);


void initLCD() {
    Wire.begin(I2C_SDA, I2C_SCL);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("System Booting..");
}
// // TÁCH HÀM KHỞI TẠO RA NGOÀI ĐỂ CHẠY TRONG SETUP (CORE 1)
// void initLCD() {
//     // 1. Ép cứng chân I2C mặc định cho toàn bộ thư viện
//     Wire.setPins(I2C_SDA, I2C_SCL); 
//     Wire.begin();                   
    
//     // 2. Bây giờ gọi init nó sẽ không bị chạy sai chân nữa
//     lcd.init();
//     lcd.backlight();
//     lcd.setCursor(0, 0);
//     lcd.print("System Booting..");
// }

void TaskLCD(void *pvParameters) {
    SystemState lastState = (SystemState)-1; // Kích hoạt vẽ lần đầu

    for (;;) {
        // Chỉ xóa và vẽ lại khi trạng thái thay đổi (Chống nhấp nháy/treo)
        if (currentState != lastState) {
            lcd.clear();
            lastState = currentState;

            switch (currentState) {
                case STATE_SETUP:
                    lcd.setCursor(0, 0); lcd.print(sysMsg);         
                    lcd.setCursor(0, 1); lcd.print("IP:192.168.4.1  "); 
                    break;
                case STATE_IDLE:
                    lcd.setCursor(0, 0); lcd.print("BKU ATTENDANCE  ");
                    lcd.setCursor(0, 1); lcd.print("Ready to scan...");
                    break;
                case STATE_ERROR:
                    lcd.setCursor(0, 0); lcd.print("SYSTEM HALTED!  ");
                    lcd.setCursor(0, 1); lcd.print(sysMsg);
                    break;
                case STATE_MATCH_FOUND:
                case STATE_MATCH_FAILED:
                    break; // Sẽ xử lý ở khối dưới
            }
        }

        // Xử lý các trạng thái hiển thị tạm thời (3 giây)
        if (currentState == STATE_MATCH_FOUND) {
            lcd.setCursor(0, 0); lcd.print("ID: " + currentUserID + "        "); // Khoảng trắng để đè chữ cũ
            lcd.setCursor(0, 1); lcd.print("In: " + getFormattedTime() + "        ");
            vTaskDelay(3000 / portTICK_PERIOD_MS);
            currentState = STATE_IDLE; 
        } 
        else if (currentState == STATE_MATCH_FAILED) {
            lcd.setCursor(0, 0); lcd.print("UNRECOGNIZED!   ");
            lcd.setCursor(0, 1); lcd.print("Please try again");
            vTaskDelay(2000 / portTICK_PERIOD_MS);
            currentState = STATE_IDLE;
        }

        vTaskDelay(100 / portTICK_PERIOD_MS);
    }
}