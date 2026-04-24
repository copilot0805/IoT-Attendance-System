#pragma once
#include <Arduino.h>
#include "esp_camera.h"
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "GlobalState.h"

// Doi tuong HTTP toan cuc de tan dung Keep-Alive
WiFiClientSecure apiClient;
HTTPClient httpApi;

// Tu dong tach Host tu URL nhap vao 
String getHostFromURL(String url) {
    int index = url.indexOf("//");
    if (index != -1) url = url.substring(index + 2);
    index = url.indexOf("/");
    if (index != -1) url = url.substring(0, index);
    return url;
}

// Ham khoi tao Camera 
bool initCamera() {
    camera_config_t config;
    config.pin_d0 = 11; config.pin_d1 = 9; config.pin_d2 = 8; config.pin_d3 = 10;
    config.pin_d4 = 12; config.pin_d5 = 18; config.pin_d6 = 17; config.pin_d7 = 16;
    config.pin_xclk = 15; config.pin_pclk = 13; config.pin_vsync = 6; config.pin_href = 7;
    config.pin_sccb_sda = 4; config.pin_sccb_scl = 5;
    config.pin_pwdn = -1; config.pin_reset = -1;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size = FRAMESIZE_QVGA; 
    config.jpeg_quality = 12; 
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
    
    if (esp_camera_init(&config) != ESP_OK) {
        Serial.println("[LOI] Khong the khoi tao Camera!");
        return false;
    }
    
    sensor_t * s = esp_camera_sensor_get();
    if (s) { s->set_vflip(s, 1); s->set_hmirror(s, 1); }
    Serial.println("[CAMERA] Khoi tao thanh cong!");
    return true;
}

// Task xu ly Chup anh & AI
void TaskCameraAI(void *pvParameters) {
    apiClient.setInsecure(); // Bo qua xac thuc SSL cho nhe may
    apiClient.setTimeout(5); // Ep Timeout o muc 5 giay de khong bi treo
    
    String currentHost = ""; 

    for (;;) {
        if (isStreaming && !isConfigMode && serverUrl != "") {
            
            if (currentHost == "") {
                // TU DONG THEM /verify-face NEU NGUOI DUNG QUEN
                if (serverUrl.indexOf("/verify-face") == -1) {
                    // Neu nguoi dung lo tay de dau gach cheo o cuoi thi cat di
                    if (serverUrl.endsWith("/")) serverUrl = serverUrl.substring(0, serverUrl.length() - 1);
                    serverUrl += "/verify-face";
                }
                currentHost = getHostFromURL(serverUrl);
                Serial.println("[NETWORK] Da cau hinh URL thuc te: " + serverUrl);
                Serial.println("[NETWORK] Da cau hinh Host: " + currentHost);
            }

            camera_fb_t * fb = esp_camera_fb_get();
            if (fb) {
                bool requestSuccess = false;
                unsigned long t0 = millis(); 

                if (httpApi.begin(apiClient, serverUrl.c_str())) {
                    httpApi.setReuse(true); 
                    httpApi.addHeader("Content-Type", "image/jpeg");
                    httpApi.addHeader("Host", currentHost.c_str());
                    httpApi.addHeader("Connection", "keep-alive");
                    
                    int res = httpApi.POST(fb->buf, fb->len);
                    unsigned long t_wait = millis() - t0;

                    if (res == 200) {
                        // --- HAPPY PATH: Moi thu hoan hao, tiep tuc giu Keep-Alive ---
                        requestSuccess = true;
                        errorCount = 0; 
                        Serial.printf("[HTTP] POST OK | Wait AI: %lu ms\n", t_wait);
                        
                        String payload = httpApi.getString(); 
                        StaticJsonDocument<256> doc;
                        DeserializationError error = deserializeJson(doc, payload);

                        if (!error) {
                            bool isMatch = doc["match"] | false;
                            String status = doc["status"] | "";

                            if (isMatch && status == "success") {
                                currentUserName = doc["name"].as<String>();
                                currentUserID = doc["id"].as<String>();
                                currentState = STATE_MATCH_FOUND; 
                            } 
                        }
                        // Tuyet doi KHONG goi http.end() o day de lan sau gui anh nhanh (400ms)
                    } else {
                        // --- SAD PATH: Server sap hoac cup may ---
                        Serial.printf("[HTTP] Loi POST. Ma loi: %d\n", res);
                        
                        // [QUAN TRONG] Don dep duong ong chet de giai phong RAM va Socket
                        httpApi.end(); 
                        apiClient.stop(); 
                    }
                } else {
                    Serial.println("[HTTP] Khong the mo ket noi toi Server!");
                    apiClient.stop(); // Don dep phong ho rac SSL
                }

                if (!requestSuccess) {
                    errorCount++;
                    Serial.printf("[WATCHDOG] Loi lien tiep: %d/10\n", errorCount);
                    
                    if (errorCount >= 10) {
                        Serial.println("[WATCHDOG] URL khong phan hoi! Dang reset...");
                        currentState = STATE_ERROR; 
                        sysMsg = "URL ERROR!";
                        vTaskDelay(2000 / portTICK_PERIOD_MS);
                        
                        Preferences prefWD;
                        prefWD.begin("system", false);
                        prefWD.putString("url", ""); 
                        prefWD.end();
                        ESP.restart(); 
                    }
                }
                esp_camera_fb_return(fb);
            }
        }
        vTaskDelay(150 / portTICK_PERIOD_MS); 
    }
}