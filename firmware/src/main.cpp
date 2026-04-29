#include <Arduino.h>
#include "GlobalState.h"    
#include "ConfigModule.h"   
#include "DisplayModule.h"  
#include "ServoModule.h"    
#include "CameraModule.h"   
#include "time.h"

volatile SystemState currentState = STATE_IDLE;
String currentUserName = "";
String currentUserID = "";
String serverUrl = "";
bool isConfigMode = false;
bool isStreaming = true;

String sysMsg = "";
int errorCount = 0;

String getFormattedTime() {
    struct tm timeinfo;
    if(!getLocalTime(&timeinfo)) return "--:--";
    char timeStr[10];
    strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
    return String(timeStr);
}

void setup() {
    Serial.begin(115200);
    
    // 1. DELAY 2 GIÂY CHỜ CỔNG USB KẾT NỐI VỚI VS CODE
    delay(2000); 
    Serial.println("\n\n=== HỆ THỐNG BẮT ĐẦU KHỞI ĐỘNG ===");

    // 2. KHỞI TẠO LCD NGAY TẠI CORE 1 TRƯỚC KHI BẬT RTOS
    initLCD();
    xTaskCreatePinnedToCore(TaskLCD, "LCD", 3000, NULL, 1, NULL, 0);       
    
    // 3. Khởi chạy Mạng & Giao diện
    initNetworkConfig();

    if (isConfigMode) {
        Serial.println(">>> ĐANG Ở CHẾ ĐỘ SETUP. ĐỢI CẤU HÌNH TỪ WEB...");
    } else {
        configTime(7 * 3600, 0, "pool.ntp.org");
        initCamera();
        xTaskCreatePinnedToCore(TaskServo, "Servo", 2000, NULL, 1, NULL, 0);   
        xTaskCreatePinnedToCore(TaskCameraAI, "CamAI", 8192, NULL, 2, NULL, 1);
    }
}

void loop() {
    if (isConfigMode) {
        handleConfigServer(); 
        
        // Thêm log định kỳ để chứng minh vòng loop vẫn đang sống và chờ đợi cấu hình từ người dùng
        static unsigned long lastLog = 0;
        if (millis() - lastLog > 5000) {
            Serial.println("[INFO] Hãy kết nối WiFi 'BKU_SETUP' và truy cập 192.168.4.1");
            lastLog = millis();
        }
    } else {
        vTaskDelete(NULL);    
    }
}