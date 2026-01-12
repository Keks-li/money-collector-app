import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, locations, refreshData, signOut } = useData();
  const [fee, setFee] = useState(settings.registrationFee.toString());
  const [zone, setZone] = useState('');

  const updateFee = async () => {
    const { error } = await supabase.from('settings').upsert({ key: 1, value: Number(fee) }, { onConflict: 'key' });
    if (!error) { Alert.alert("Success", "Fee Updated"); refreshData(); }
  };

  const addZone = async () => {
    if (!zone) return;
    const { error } = await supabase.from('locations').insert({ name: zone });
    if (!error) { setZone(''); refreshData(); }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/'); 
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Registration Fee (GH₵)</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} value={fee} onChangeText={setFee} keyboardType="numeric" />
          <TouchableOpacity onPress={updateFee} style={styles.btn}><Text style={styles.btnText}>Update</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Manage Zones</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="New Zone Name" value={zone} onChangeText={setZone} />
          <TouchableOpacity onPress={addZone} style={styles.btn}><Text style={styles.btnText}>Add</Text></TouchableOpacity>
        </View>
        <View style={{ marginTop: 15 }}>
          {locations.map(l => (
            <View key={l.id} style={styles.zoneItem}><Text style={styles.zoneText}>{l.name}</Text></View>
          ))}
        </View>
      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>LOGOUT SYSTEM ADMIN</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  header: { marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  section: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  title: { fontWeight: 'bold', marginBottom: 10, color: '#475569', fontSize: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, fontSize: 16 },
  btn: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 12, justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  zoneItem: { padding: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  zoneText: { fontWeight: '600', color: '#334155' },
  logoutBtn: { backgroundColor: '#fee2e2', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  logoutText: { color: '#dc2626', fontWeight: '900', letterSpacing: 1 }
});