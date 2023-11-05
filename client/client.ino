#include <ArduinoHttpClient.h>
#include <WiFiNINA.h>
#include "arduino_secrets.h"

WiFiClient wifi;

char host[] = "192.168.50.238";
int port = 8080;

int numberOfLeds = 4;
int startingLedPin = 2; // TODO: Confirm this after wiring

void setup() {
  Serial.begin(9600);

  // Remove when not using usb
  while (!Serial);

  bool connectionSuccessful = connectToWifi(SECRET_NETWORK_NAME, SECRET_NETWORK_PASSWORD);
  if (!connectionSuccessful) {
    Serial.println("Exting due to failing to connect to the specified wifi network");
    while (true);
  }

  // TODO: Set up pinmodes
}

void loop() {
  for (int ledId = 0; ledId < numberOfLeds; ledId++) {
    int pinIndex = startingLedPin + ledId;

    if (shouldLedBeOn(ledId)) {
      // TODO: Write high to this specific pin
    } else {
      // TODO: Write low to this specific pin
    }
  }

  delay(1000);
}

bool connectToWifi(char* ssid, char* password) {
  Serial.print("Attempting to connect to ");
  Serial.println(ssid);

  char connectionStatus = WiFi.begin(ssid, password);
  bool hasConnected = connectionStatus == WL_CONNECTED;

  if (hasConnected) {
    char successMessage[128];
    sprintf(successMessage, "Successfully connected to %s which has a signal of %d dBm", WiFi.SSID(), WiFi.RSSI());
    Serial.println(successMessage);
  } else {
    char errorMessage[128];
    sprintf(errorMessage, "Connection attempt to %s failed due to error code %d", ssid, WiFi.reasonCode());
    Serial.println(errorMessage);
  }

  return hasConnected;
}

bool shouldLedBeOn(int ledId) {
  // TODO: Double check this - should a new client be created for each request?
  HttpClient client = HttpClient(wifi, host, port);

  char fullPath[10];
  sprintf(fullPath, "/status/%d", ledId);

  client.get(fullPath);
  return client.responseBody() == "1";
}
