// app/_layout.tsx
import { Stack } from 'expo-router';
import { DataProvider } from '../lib/store';

export default function RootLayout() {
  return (
    <DataProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </DataProvider>
  );
}