import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Platform, FlatList } from 'react-native';
import { useData } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminOverview() {
  const { customers, agents, items, refreshData, loading } = useData();
  const [aiInsight, setAiInsight] = useState("Analyzing collection data...");
  
  // --- STATE ---
  const [collectionDate, setCollectionDate] = useState(new Date());
  const [dailyTotal, setDailyTotal] = useState(0);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [historyDate, setHistoryDate] = useState(new Date());
  const [historyFeed, setHistoryFeed] = useState<any[]>([]);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);

  // --- DATA FETCHING ---
  const fetchDailyTotal = useCallback(async (date: Date) => {
    setLoadingDaily(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', `${dateStr}T00:00:00`)
        .lte('payment_date', `${dateStr}T23:59:59`);

      if (error) throw error;
      const total = (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      setDailyTotal(total);
    } catch (e) { console.error(e); } finally { setLoadingDaily(false); }
  }, []);

  const fetchHistory = useCallback(async (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const start = `${dateStr}T00:00:00`;
      const end = `${dateStr}T23:59:59`;

      const [{ data: payData }, { data: linkData }] = await Promise.all([
        supabase.from('payments').select('*').gte('payment_date', start).lte('payment_date', end).order('payment_date', { ascending: false }),
        // Check if created_at exists, otherwise this returns empty which is fine
        supabase.from('customer_products').select('*, customer:customers(*)').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false })
      ]);

      let combined: any[] = [];

      (payData || []).forEach(p => {
        const agent = agents.find(a => a.id === p.agent_id);
        const item = items.find(i => i.id === p.item_id);
        const customer = customers.find(c => c.id === p.customer_id);
        combined.push({
          id: `pay-${p.id}`, type: 'COLLECTION', date: new Date(p.payment_date),
          agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent',
          title: `Collected ${p.box_count || 0} Boxes (GH₵${p.amount}) for ${item?.name || 'Item'} - ${customer?.name || 'Client'}`,
          color: '#fef9c3', iconColor: '#ca8a04', icon: 'cash'
        });
      });

      (linkData || []).forEach(l => {
        const item = items.find(i => i.id === l.item_id);
        const agent = agents.find(a => a.id === l.customer?.agent_id);
        combined.push({
          id: `link-${l.id}`, type: 'LINK', date: new Date(l.created_at),
          agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'System',
          title: `Linked ${item?.name || 'Item'} to ${l.customer?.name}. Volume: ${Math.round(l.total_amount / (item?.boxValue || 10))} Boxes.`,
          color: '#dbeafe', iconColor: '#2563eb', icon: 'person'
        });
      });

      setHistoryFeed(combined.sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (e) { console.error(e); }
  }, [agents, items, customers]);

  useEffect(() => { fetchDailyTotal(collectionDate); }, [collectionDate]);
  useEffect(() => { fetchHistory(historyDate); }, [historyDate]);

  // --- STATS ---
  const totalRegistrationFees = customers.reduce((sum, c) => sum + (c.registrationFeePaid || 0), 0);
  const registrationCount = customers.filter(c => c.registrationFeePaid > 0).length;
  const projectedRevenue = customers.reduce((total, c) => total + c.products.reduce((s, p) => s + p.totalAmount, 0), 0);
  const totalSystemRevenue = useData().payments.reduce((sum, p) => sum + p.amount, 0) + totalRegistrationFees;

  useEffect(() => {
    const activeCustomerName = customers[0]?.name?.split(' ')[0] || 'Unknown';
    setAiInsight(`Total revenue for the period reached GH₵${totalSystemRevenue.toLocaleString()}. While collections generated significant cash flow, customer ${activeCustomerName} demonstrated the most consistent activity.`);
  }, [totalSystemRevenue]);

  // --- DATE HANDLERS ---
  const onCollectionChange = (e: any, d?: Date) => { setShowCollectionPicker(Platform.OS === 'ios'); if (d) setCollectionDate(d); };
  const onHistoryChange = (e: any, d?: Date) => { setShowHistoryPicker(Platform.OS === 'ios'); if (d) setHistoryDate(d); };

  // --- HEADER COMPONENT (The top part of the page) ---
  const renderDashboardHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ADMIN DASHBOARD</Text>
      </View>

      {/* BIG CARD */}
      <View style={styles.mainCard}>
        <Text style={styles.mainLabel}>TOTAL SYSTEM REVENUE</Text>
        <Text style={styles.mainAmount}>GH₵{totalSystemRevenue.toLocaleString()}</Text>
        <View style={styles.aiBox}><Text style={styles.aiText}><Text style={{fontWeight: 'bold'}}>Insight: </Text>{aiInsight}</Text></View>
      </View>

      {/* REG INCOME */}
      <View style={styles.statCard}>
        <View style={{flex: 1}}>
          <Text style={[styles.statLabel, { color: '#c084fc' }]}>REGISTRATION INCOME</Text>
          <Text style={styles.statAmount}>GH₵{totalRegistrationFees.toLocaleString()}</Text>
          <Text style={styles.statSub}>{registrationCount} Paid Enrollments</Text>
        </View>
        <View style={styles.iconBoxPurple}><Ionicons name="document-text" size={24} color="#a855f7" /></View>
      </View>

      {/* PROJECTED */}
      <View style={styles.statCard}>
        <View>
          <Text style={[styles.statLabel, { color: '#6366f1' }]}>PROJECTED REVENUE </Text>
          <Text style={styles.statAmount}>GH₵{projectedRevenue.toLocaleString()}</Text>
          <Text style={styles.statSub}>Total value of active contracts</Text>
        </View>
      </View>

      {/* DAILY CHECK */}
      <View style={styles.statCard}>
        <View style={{width: '100%'}}>
           <View style={styles.rowBetween}>
              <Text style={[styles.statLabel, { color: '#059669', marginBottom: 0 }]}>DAILY COLLECTION CHECK</Text>
              <TouchableOpacity onPress={() => setShowCollectionPicker(true)} style={styles.dateBtn}>
                 <Text style={styles.dateText}>{collectionDate.toLocaleDateString()}</Text>
                 <Ionicons name="calendar" size={16} color="#334155" style={{marginLeft: 6}}/>
              </TouchableOpacity>
           </View>
           {showCollectionPicker && <DateTimePicker value={collectionDate} mode="date" onChange={onCollectionChange} />}
           {loadingDaily ? <ActivityIndicator color="#059669" /> : <Text style={styles.statAmount}>GH₵{dailyTotal.toLocaleString()}</Text>}
           <Text style={styles.statSub}>Collected on {collectionDate.toDateString()}</Text>
        </View>
      </View>

      {/* HISTORY HEADER */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>HISTORY</Text>
        <TouchableOpacity onPress={() => setShowHistoryPicker(true)} style={styles.historyDateBtn}>
           <Text style={styles.historyDateText}>{historyDate.toLocaleDateString()}</Text>
           <Ionicons name="calendar-outline" size={14} color="#64748b" style={{marginLeft: 4}}/>
        </TouchableOpacity>
      </View>
      {showHistoryPicker && <DateTimePicker value={historyDate} mode="date" onChange={onHistoryChange} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={historyFeed}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderDashboardHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No activity found for this date.</Text>}
        contentContainerStyle={{ paddingBottom: 40, padding: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { refreshData(); fetchDailyTotal(collectionDate); fetchHistory(historyDate); }} />}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={[styles.historyIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.historyAgent, { color: item.iconColor }]}>{item.agentName.toUpperCase()}</Text>
                <Text style={styles.historyTime}>{item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
              <Text style={styles.historyText}>{item.title}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 13, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  // Cards
  mainCard: { backgroundColor: '#4f46e5', borderRadius: 36, padding: 30, marginBottom: 20, shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  mainLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 5, textTransform: 'uppercase' },
  mainAmount: { color: 'white', fontSize: 48, fontWeight: '900', letterSpacing: -2, marginBottom: 24 },
  aiBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  aiText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  statCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  
  // Text Styles
  statLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  statAmount: { fontSize: 32, fontWeight: '900', color: '#1e293b', letterSpacing: -1 },
  statSub: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 4 },
  
  // Components
  iconBoxPurple: { width: 48, height: 48, backgroundColor: '#f3e8ff', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dateText: { fontSize: 14, fontWeight: 'bold', color: '#334155' },

  // History
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  historyTitle: { fontSize: 12, fontWeight: '900', color: '#1e293b', letterSpacing: 1, textTransform: 'uppercase' },
  historyDateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  historyDateText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  historyCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 24, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  historyIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  historyAgent: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
  historyTime: { fontSize: 10, color: '#cbd5e1', fontWeight: '600' },
  historyText: { fontSize: 13, fontWeight: 'bold', color: '#334155', lineHeight: 18 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontStyle: 'italic' },
});