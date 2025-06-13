import React, { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

export default function ModelViewer() {
  const { modelUrl } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  const html = `
    <html>
      <head>
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
      </head>
      <body style="margin: 0; padding: 0; overflow: hidden;">
        <model-viewer 
          src="${modelUrl}" 
          alt="3D Model"
          auto-rotate
          camera-controls
          environment-image="neutral"
          shadow-intensity="1"
          exposure="1.2"
          field-of-view="45deg"
          max-field-of-view="60deg"
          camera-orbit="0deg 90deg 4m"
          min-camera-orbit="auto auto 3m"
          max-camera-orbit="auto auto 6m"
          ar-scale="auto"
          camera-target="0m 0.5m 0m"
          interaction-prompt="none"
          on-load="window.ReactNativeWebView.postMessage('loaded')"
          style="width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center;">
        </model-viewer>
      </body>
    </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      {loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", position: "absolute", width: "100%", height: "100%", backgroundColor: "white" }}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      <WebView 
        originWhitelist={["*"]} 
        source={{ html }} 
        onMessage={(event) => {
          if (event.nativeEvent.data === "loaded") {
            setLoading(false);
          }
        }}
      />
    </View>
  );
}