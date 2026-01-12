import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useData } from '../../lib/store';
import { Ionicons } from '@expo/vector-icons';

export default function AgentHistory() {
  const { payments, customers, items, currentAgent, refreshData, loading } = useData();

  // --- FIX: Filter by Agent Table ID ---
  const myPayments = payments.filter(p => p.agentId === currentAgent?.id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection Ledger</Text>
      </View>

      <FlatList
        data={myPayments}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshData} />}
        ListEmptyComponent={<Text style={styles.empty}>No collections recorded yet.</Text>}
        renderItem={({ item }) => {
          const customer = customers.find(c => c.id === item.customerId);
          const product = items.find(i => i.id === item.itemId);
          
          return (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="cash-outline" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.customer}>{customer?.name || 'Unknown Customer'}</Text>
                <Text style={styles.detail}>
                  {product?.name || 'Item'} • {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>+GH₵{item.amount}</Text>
                <Text style={styles.boxes}>{item.boxCount || 0} Boxes</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 50 },
  header: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  iconBox: { width: 40, height: 40, backgroundColor: '#d1fae5', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  customer: { fontWeight: 'bold', fontSize: 14, color: '#334155' },
  detail: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  amount: { fontWeight: '900', color: '#059669', fontSize: 16 },
  boxes: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: 'gray' }
});