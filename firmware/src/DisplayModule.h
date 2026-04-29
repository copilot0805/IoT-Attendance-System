#pragma once
#include <Wire.h>               
#include <LiquidCrystal_I2C.h>
#include "GlobalState.h"

#define I2C_SDA 21
#define I2C_SCL 47

LiquidCrystal_I2C lcd(0x27, 16, 2);

void initLCD() {
    Wire.begin(I2C_SDA, I2C_SCL);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("System Booting..");
}

void TaskLCD(void *pvParameters) {
    SystemState lastState = (SystemState)-1; // Kich hoat ve lan dau

    for (;;) {
        // Chi xoa va ve lai khi trang thai thay doi (Chong nhap nhay/treo)
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
                    break; // Se xu ly o khoi duoi
            }
        }

        // Xu ly trang thai hien thi tam thoi (3 giay) mo cua
        if (currentState == STATE_MATCH_FOUND) {
            lcd.setCursor(0, 0); lcd.print("ID: " + currentUserID + "        "); 
            lcd.setCursor(0, 1); lcd.print("In: " + getFormattedTime() + "        ");
            vTaskDelay(3000 / portTICK_PERIOD_MS);
            currentState = STATE_IDLE; 
        } 

        vTaskDelay(100 / portTICK_PERIOD_MS);
    }
}