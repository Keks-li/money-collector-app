// app/index.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { UserRole } from '../types';

export default function AuthScreen() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    } else {
      // Route based on toggle selection
      if (role === UserRole.ADMIN) {
        router.replace('/admin');
      } else {
        router.replace('/agent');
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.icon, role === UserRole.ADMIN ? styles.bgAdmin : styles.bgAgent]}>
           <Text style={{fontSize:30}}>{role === UserRole.ADMIN ? '⚡' : '🛡️'}</Text>
        </View>
        <Text style={styles.title}>CRUZARO ENT</Text>
        <Text style={[styles.subtitle, { color: role === UserRole.ADMIN ? '#4f46e5' : '#059669' }]}>
          {role === UserRole.ADMIN ? 'ADMIN PORTAL' : 'AGENT TERMINAL'}
        </Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => setRole(UserRole.AGENT)} style={[styles.toggleBtn, role === UserRole.AGENT && styles.activeToggle]}>
            <Text style={[styles.toggleText, role === UserRole.AGENT && styles.activeText]}>FIELD AGENT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRole(UserRole.ADMIN)} style={[styles.toggleBtn, role === UserRole.ADMIN && styles.activeToggle]}>
            <Text style={[styles.toggleText, role === UserRole.ADMIN && styles.activeText]}>SYSTEM ADMIN</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity onPress={handleLogin} disabled={loading} style={[styles.btn, role === UserRole.ADMIN ? styles.btnAdmin : styles.btnAgent]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SECURE ENTRY</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', padding: 32, borderRadius: 24, alignItems: 'center' },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  bgAgent: { backgroundColor: '#d1fae5' }, bgAdmin: { backgroundColor: '#e0e7ff' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 24 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 4, borderRadius: 12, marginBottom: 20, width: '100%' },
  toggleBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  activeToggle: { backgroundColor: 'white', elevation: 2 },
  toggleText: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
  activeText: { color: '#0f172a' },
  input: { width: '100%', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  btn: { width: '100%', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnAgent: { backgroundColor: '#059669' }, btnAdmin: { backgroundColor: '#4f46e5' },
  btnText: { color: 'white', fontWeight: 'bold', letterSpacing: 1 }
});