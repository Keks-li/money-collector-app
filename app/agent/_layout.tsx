import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AgentLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#059669' }}>
      <Tabs.Screen 
        name="index" 
        options={{ title: 'Home', tabBarIcon: ({color}) => <Ionicons name="grid" size={24} color={color}/> }} 
      />
      <Tabs.Screen 
        name="customers" 
        options={{ title: 'Customers', tabBarIcon: ({color}) => <Ionicons name="people" size={24} color={color}/> }} 
      />
      {/* ADDED HISTORY TAB */}
      <Tabs.Screen 
        name="history" 
        options={{ title: 'Ledger', tabBarIcon: ({color}) => <Ionicons name="time" size={24} color={color}/> }} 
      />
    </Tabs>
  );
}