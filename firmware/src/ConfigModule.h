#pragma once
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "GlobalState.h"

Preferences pref;
WebServer configServer(80);

String ssid = "";
String password = "";

void loadConfig() {
    pref.begin("system", false);
    ssid = pref.getString("ssid", "");
    password = pref.getString("pass", "");
    serverUrl = pref.getString("url", "");
    pref.end();
}

void handleSaveConfig() {
    pref.begin("system", false);
    if(configServer.hasArg("ssid")) pref.putString("ssid", configServer.arg("ssid"));
    if(configServer.hasArg("pass")) pref.putString("pass", configServer.arg("pass"));
    if(configServer.hasArg("url")) pref.putString("url", configServer.arg("url"));
    pref.end();

    // String html = "<html><body style='text-align:center; padding:50px; font-family:Arial;'>";
    String html = "<html><head><meta charset='UTF-8'></head><body style='text-align:center; padding:50px; font-family:Arial;'>";
    html += "<h2>Da luu cau hinh!</h2><p>Hệ thống đang khởi động lại...</p></body></html>";
    configServer.send(200, "text/html", html);
    
    delay(2000);
    ESP.restart();
}

void handleRootConfig() {
    String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>";
    html += "<body style='font-family: Arial; padding: 20px; max-width: 400px; margin: auto;'>";
    html += "<h2 style='text-align:center;'>BKU AI - SETUP</h2>";
    html += "<form action='/save' method='POST'>";
    html += "<b>WiFi SSID:</b><br><input type='text' name='ssid' value='" + ssid + "' style='width:100%; padding:10px; margin-bottom:15px;'>";
    html += "<b>WiFi Password:</b><br><input type='password' name='pass' value='" + password + "' style='width:100%; padding:10px; margin-bottom:15px;'>";
    html += "<b>Server URL (Cloudflare/LAN):</b><br><input type='text' name='url' value='" + serverUrl + "' style='width:100%; padding:10px; margin-bottom:20px;'>";
    html += "<input type='submit' value='Luu & Khoi Dong Lai' style='width:100%; padding:15px; background:#007bff; color:white; border:none; font-weight:bold;'>";
    html += "</form></body></html>";
    configServer.send(200, "text/html", html);
}

void initNetworkConfig() {
    loadConfig();
    WiFi.mode(WIFI_AP_STA);
    bool wifiConnected = false;

    if (ssid != "") {
        Serial.print("Connecting to WiFi: "); Serial.println(ssid);
        WiFi.begin(ssid.c_str(), password.c_str());
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500); Serial.print(".");
            attempts++;
        }
        if(WiFi.status() == WL_CONNECTED) wifiConnected = true;
    }

    // --- SỬA ĐOẠN NÀY ĐỂ BÁO LỖI LÊN LCD ---
    if (!wifiConnected || serverUrl == "") {
        isConfigMode = true;
        currentState = STATE_SETUP; // Kích hoạt trạng thái Setup

        // Xác định nguyên nhân thiếu để báo ra màn hình
        if (!wifiConnected) {
            sysMsg = "Missing: WIFI";
        } else if (serverUrl == "") {
            sysMsg = "Missing: URL";
        }

        // Bật AP Mode
        WiFi.softAP("BKU_SETUP", "12345678", 1); 
        
        configServer.on("/", handleRootConfig);
        configServer.on("/save", handleSaveConfig);
        configServer.begin();

        Serial.println("\n[FALLBACK] Đã bật AP Mode: BKU_SETUP | IP: 192.168.4.1");
    } else {
        Serial.println("\n[NETWORK] Ket noi thanh cong!");
    }
}

void handleConfigServer() {
    if (isConfigMode) configServer.handleClient();
}