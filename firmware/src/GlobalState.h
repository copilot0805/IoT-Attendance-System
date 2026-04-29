#pragma once
#include <Arduino.h>

enum SystemState { STATE_IDLE, STATE_MATCH_FOUND, STATE_ERROR, STATE_SETUP };

extern volatile SystemState currentState;
extern String currentUserName;
extern String currentUserID;
extern String serverUrl;
extern String sysMsg; // Tin nhắn trạng thái để hiện lên LCD

extern bool isConfigMode;
extern bool isStreaming;
extern int errorCount; // Đếm số lần lỗi URL liên tiếp

String getFormattedTime();