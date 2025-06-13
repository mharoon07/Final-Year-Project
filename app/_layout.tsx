import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { app, auth, db, storage, database } from '../Firebase'


export default function RootLayout() {
  console.log("RootLayout rendered");
  useEffect(() => {
    console.log("Firebase app initialized:", app.name);  '
    console.log("Firestore initialized:", !!db);
    console.log("Auth initialized:", !!auth);
    console.log("Storage initialized:", !!storage);
    console.log("Database initialized:", !!database);
  }, []);
  useFonts({});
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        headerBackButtonMenuEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
