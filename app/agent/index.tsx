import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../lib/store';
import { Ionicons } from '@expo/vector-icons';

export default function AgentHome() {
  const router = useRouter();
  const { user, currentAgent, agents, payments, customers, refreshData, loading, signOut } = useData();

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const myPayments = payments.filter(p => p.agentId === currentAgent?.id);
  const totalCollected = myPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const myCustomers = customers.filter(c => c.agentId === currentAgent?.id);

  // --- CRITICAL FIX: LOADING GUARD ---
  // If we are loading, or if we have a User but 0 Agents loaded, keep spinning.
  // This prevents the "Profile Not Found" error from flashing while data downloads.
  if (loading || (user && agents.length === 0)) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc'}}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{marginTop: 20, color: '#64748b', fontWeight: 'bold'}}>Syncing Profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshData} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>CRUZARO ENT</Text>
          <Text style={styles.user}>{user?.name || "Field Agent"}</Text>
          
          {/* Only show error if we are DONE loading and still can't find profile */}
          {!currentAgent && !loading && agents.length > 0 && (
             <View style={styles.errorBadge}>
                <Ionicons name="alert-circle" size={14} color="white" />
                <Text style={styles.errorText}>Profile Not Linked</Text>
             </View>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
           <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>LIFETIME COLLECTION</Text>
        <Text style={styles.amount}>GH₵{totalCollected.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</Text>
        <View style={styles.badge}>
           <Text style={styles.badgeText}>{myCustomers.length} Active Customers</Text>
        </View>
      </View>

      {/* Action Grid */}
      <View style={styles.grid}>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/agent/customers')}>
          <Ionicons name="people" size={32} color="#059669" />
          <Text style={styles.btnText}>Customers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => router.push('/agent/registration')}>
          <Ionicons name="person-add" size={32} color="#8b5cf6" />
          <Text style={styles.btnText}>Register New</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={refreshData}>
          <Ionicons name="sync" size={32} color="#f59e0b" />
          <Text style={styles.btnText}>Sync Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  header: { marginTop: 40, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 14, fontWeight: '900', color: '#1e293b', letterSpacing: 0.5 },
  user: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  logoutIcon: { width: 44, height: 44, backgroundColor: '#fee2e2', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  
  errorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4, alignSelf: 'flex-start' },
  errorText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

  card: { backgroundColor: '#059669', padding: 24, borderRadius: 24, marginBottom: 24, shadowColor: '#059669', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  cardLabel: { color: '#a7f3d0', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  amount: { color: 'white', fontSize: 32, fontWeight: '900' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 12 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  btn: { width: '47%', backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  btnText: { marginTop: 12, fontWeight: '700', fontSize: 12, color: '#334155' }
});