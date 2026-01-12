import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useData } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function AdminCustomers() {
  const { customers, agents, locations, items, payments, refreshData } = useData();
  const [search, setSearch] = useState('');
  
  // Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [transferAgentId, setTransferAgentId] = useState('');
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [processing, setProcessing] = useState(false);

  // Search Logic
  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const openModal = (customer: any) => {
    setSelectedCustomer(customer);
    setTransferAgentId(customer.agentId || '');
    setEditForm({ name: customer.name, phone: customer.phone });
    setIsEditing(false);
    setShowTransferPicker(false);
  };

  const handleUpdateProfile = async () => {
    if (!editForm.name || !editForm.phone) return Alert.alert("Error", "Name and Phone are required");
    setProcessing(true);
    try {
        const { error } = await supabase.from('customers')
            .update({ name: editForm.name, phone: editForm.phone })
            .eq('id', selectedCustomer.id);

        if (error) throw error;

        Alert.alert("Success", "Profile Updated");
        setSelectedCustomer({ ...selectedCustomer, name: editForm.name, phone: editForm.phone });
        setIsEditing(false);
        refreshData();
    } catch (e: any) {
        Alert.alert("Error", e.message);
    } finally {
        setProcessing(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !selectedCustomer.active;
    const action = newStatus ? "Activate" : "Deactivate";
    
    Alert.alert(
        `Confirm ${action}`,
        `Are you sure you want to ${action.toLowerCase()} this customer?`,
        [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", style: newStatus ? "default" : "destructive", onPress: async () => {
                try {
                    const { error } = await supabase.from('customers')
                        .update({ active: newStatus })
                        .eq('id', selectedCustomer.id);
                    
                    if (error) throw error;

                    setSelectedCustomer({ ...selectedCustomer, active: newStatus });
                    refreshData();
                    Alert.alert("Success", `Customer ${newStatus ? 'Activated' : 'Deactivated'}`);
                } catch (e: any) {
                    Alert.alert("Error", e.message);
                }
            }}
        ]
    );
  };

  const handleTransfer = async () => {
    if (!selectedCustomer || !transferAgentId) return;
    if (transferAgentId === selectedCustomer.agentId) {
      Alert.alert("No Change", "Please select a different agent.");
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({ agent_id: transferAgentId })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      Alert.alert("Success", "Customer transferred successfully.");
      setSelectedCustomer({ ...selectedCustomer, agentId: transferAgentId });
      refreshData();
      setShowTransferPicker(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const customerStats = useMemo(() => {
    if (!selectedCustomer) return null;

    const history = payments
      .filter(p => p.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);
    const totalBoxesPaid = history.reduce((sum, p) => sum + p.boxCount, 0);

    let totalOutstandingBalance = 0;
    let totalOutstandingBoxes = 0;

    const portfolio = selectedCustomer.products.map((prod: any) => {
        const item = items.find(i => i.id === prod.itemId);
        const boxValue = item?.boxValue || 1;
        const boxesLeft = Math.ceil(prod.balance / boxValue);
        
        totalOutstandingBalance += prod.balance;
        totalOutstandingBoxes += boxesLeft;

        return {
            ...prod,
            itemName: item?.name || 'Unknown Item',
            boxRate: boxValue,
            totalBoxOriginal: Math.round(prod.totalAmount / boxValue),
            boxesLeft,
            price: prod.totalAmount
        };
    });

    return {
        history, portfolio, totalPaid, totalBoxesPaid,
        totalOutstandingBalance, totalOutstandingBoxes,
        agentName: agents.find(a => a.id === selectedCustomer.agentId)?.firstName || 'Unassigned',
        locationName: locations.find(l => l.id === selectedCustomer.locationId)?.name || 'Unknown Zone'
    };
  }, [selectedCustomer, payments, items, agents, locations]);


  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="gray" />
        <TextInput 
          style={styles.input} 
          placeholder="Search Customer Name or Phone..." 
          placeholderTextColor="#94a3b8" // <--- FIXED VISIBILITY
          value={search} 
          onChangeText={setSearch} 
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={({ item }) => {
          const agent = agents.find(a => a.id === item.agentId);
          return (
            <TouchableOpacity style={[styles.card, !item.active && styles.inactiveCard]} onPress={() => openModal(item)}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{item.phone}</Text>
                {!item.active && <Text style={styles.inactiveBadge}>DEACTIVATED</Text>}
              </View>
              <View style={styles.agentTag}>
                <Text style={styles.agentText}>
                  {agent ? `${agent.firstName} ${agent.lastName}` : 'Unassigned'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {selectedCustomer && customerStats && (
        <Modal animationType="slide" visible={true} presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            
            <View style={styles.modalNav}>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>Customer Profile</Text>
                <View style={{width: 40}} /> 
            </View>

            <ScrollView style={styles.scrollContent}>
                {/* 1. HEADER SECTION */}
                <View style={styles.headerSection}>
                    <View style={styles.headerTopRow}>
                        <View style={{flex: 1}}>
                            {isEditing ? (
                                <>
                                    <TextInput 
                                        value={editForm.name} 
                                        onChangeText={t => setEditForm({...editForm, name: t})}
                                        style={styles.editInput}
                                        placeholder="Full Name"
                                        placeholderTextColor="#94a3b8"
                                    />
                                    <TextInput 
                                        value={editForm.phone} 
                                        onChangeText={t => setEditForm({...editForm, phone: t})}
                                        style={[styles.editInput, {marginTop: 8}]}
                                        placeholder="Phone"
                                        keyboardType="phone-pad"
                                        placeholderTextColor="#94a3b8"
                                    />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.profileName}>{selectedCustomer.name}</Text>
                                    <Text style={styles.profilePhone}>{selectedCustomer.phone}</Text>
                                    {!selectedCustomer.active && <Text style={[styles.inactiveBadge, {marginTop: 5}]}>ACCOUNT DEACTIVATED</Text>}
                                </>
                            )}
                        </View>
                        <View style={styles.paidBadge}>
                            <Text style={styles.paidText}>PAID: GH₵{customerStats.totalPaid.toLocaleString()} ({customerStats.totalBoxesPaid} BOXES)</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        {isEditing ? (
                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={processing}>
                                {processing ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.btnTextWhite}>SAVE CHANGES</Text>}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                                <Text style={styles.btnTextBlue}>EDIT PROFILE</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            style={selectedCustomer.active ? styles.deactivateBtn : styles.activateBtn} 
                            onPress={handleToggleStatus}
                        >
                            <Text style={selectedCustomer.active ? styles.btnTextRed : styles.btnTextGreen}>
                                {selectedCustomer.active ? 'DEACTIVATE' : 'ACTIVATE'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. INFO CARDS (WITH FIXED TRANSFER PICKER) */}
                <View style={styles.infoRow}>
                    <View style={styles.infoCard}>
                        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                            <Text style={styles.infoLabel}>ASSIGNED AGENT</Text>
                            <TouchableOpacity onPress={() => setShowTransferPicker(!showTransferPicker)}>
                                <Text style={styles.linkText}>{showTransferPicker ? "Cancel" : "Transfer"}</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {!showTransferPicker ? (
                             <Text style={styles.infoValue}>{customerStats.agentName}</Text>
                        ) : (
                            <View style={styles.pickerContainer}>
                                <Text style={{fontSize: 10, color: '#64748b', marginBottom: 5}}>Select New Agent:</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker 
                                        selectedValue={transferAgentId} 
                                        onValueChange={setTransferAgentId} 
                                        style={styles.picker}
                                        itemStyle={{ color: 'black', height: 120, fontSize: 16 }} // Fix iOS
                                    >
                                        <Picker.Item label="Select Agent..." value="" color="gray" />
                                        {agents.map(a => (
                                            <Picker.Item 
                                                key={a.id} 
                                                label={`${a.firstName} ${a.lastName}`} 
                                                value={a.id} 
                                                color="black" // Fix Android
                                            />
                                        ))}
                                    </Picker>
                                </View>
                                <TouchableOpacity style={styles.confirmTransfer} onPress={handleTransfer}>
                                    <Text style={{color:'white', fontWeight:'bold'}}>Confirm Transfer</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>ZONE LOCATION</Text>
                        <Text style={styles.infoValue}>{customerStats.locationName}</Text>
                    </View>
                </View>

                {/* 3. PRODUCT PORTFOLIO */}
                <Text style={styles.sectionTitle}>Product Portfolio</Text>
                <View style={styles.portfolioContainer}>
                    {customerStats.portfolio.map((prod: any, index: number) => (
                        <View key={index} style={styles.prodRow}>
                            <View>
                                <Text style={styles.prodCode}>Code: {prod.itemName}</Text>
                                <Text style={styles.prodSub}>BOX RATE: GH₵{prod.boxRate} | TOTAL BOX: {prod.totalBoxOriginal}</Text>
                            </View>
                            <View style={{alignItems: 'flex-end'}}>
                                <Text style={styles.prodPrice}>GH₵{prod.price.toLocaleString()}</Text>
                                <Text style={styles.boxesLeft}>{prod.boxesLeft} BOXES LEFT</Text>
                            </View>
                        </View>
                    ))}
                    <View style={styles.outstandingCard}>
                        <Text style={styles.outstandingLabel}>OUTSTANDING</Text>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.outstandingAmount}>GH₵{customerStats.totalOutstandingBalance.toLocaleString()}</Text>
                            <Text style={styles.outstandingSub}>{customerStats.totalOutstandingBoxes} BOXES LEFT</Text>
                        </View>
                    </View>
                </View>

                {/* 4. PAYMENT HISTORY */}
                <Text style={styles.sectionTitle}>Payment History</Text>
                <View style={styles.historyContainer}>
                    {customerStats.history.map((pay) => {
                        const item = items.find(i => i.id === pay.itemId);
                        const agent = agents.find(a => a.id === pay.agentId);
                        return (
                            <View key={pay.id} style={styles.historyRow}>
                                <View>
                                    <Text style={styles.historyDate}>{new Date(pay.date).toLocaleString()}</Text>
                                    <Text style={styles.historyCode}>Code: {item?.name}</Text>
                                    <Text style={styles.historyAgent}>{agent?.firstName} {agent?.lastName}</Text>
                                </View>
                                <View style={{alignItems: 'flex-end'}}>
                                    <Text style={styles.historyAmount}>+GH₵{pay.amount}</Text>
                                    <Text style={styles.historyBoxes}>{pay.boxCount} Boxes</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
                <View style={{height: 50}} />
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 50 },
  searchBox: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { marginLeft: 10, flex: 1, height: 40 },
  
  card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  inactiveCard: { backgroundColor: '#f1f5f9', opacity: 0.6 },
  inactiveBadge: { fontSize: 10, color: 'red', fontWeight: 'bold', marginTop: 2 },
  
  name: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  sub: { color: '#64748b', fontSize: 12 },
  agentTag: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  agentText: { color: '#4f46e5', fontSize: 10, fontWeight: 'bold' },

  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee', paddingTop: 20 },
  closeText: { color: '#007AFF', fontSize: 16 },
  modalHeaderTitle: { fontWeight: 'bold', fontSize: 16 },
  scrollContent: { padding: 20 },

  headerSection: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  profileName: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  profilePhone: { fontSize: 14, color: '#64748b', fontWeight: 'bold', marginTop: 4 },
  editInput: { borderBottomWidth: 1, borderColor: '#ccc', paddingVertical: 4, fontSize: 16, fontWeight: 'bold' },

  paidBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  paidText: { color: '#166534', fontWeight: 'bold', fontSize: 11 },
  
  actionRow: { flexDirection: 'row', gap: 10 },
  editBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  deactivateBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  activateBtn: { backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  
  btnTextBlue: { color: '#2563eb', fontWeight: 'bold', fontSize: 11 },
  btnTextRed: { color: '#dc2626', fontWeight: 'bold', fontSize: 11 },
  btnTextGreen: { color: '#166534', fontWeight: 'bold', fontSize: 11 },
  btnTextWhite: { color: 'white', fontWeight: 'bold', fontSize: 11 },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 16 },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase' },
  infoValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  linkText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' },
  
  // FIXED PICKER STYLES
  pickerContainer: { marginTop: 10 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  picker: { width: '100%', height: Platform.OS === 'android' ? 50 : undefined },
  confirmTransfer: { backgroundColor: '#2563eb', padding: 10, alignItems: 'center', borderRadius: 6 },

  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e3a8a', marginBottom: 12 },
  portfolioContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24 },
  prodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  prodCode: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  prodSub: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginTop: 4 },
  prodPrice: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  boxesLeft: { fontSize: 11, fontWeight: 'bold', color: '#ef4444', marginTop: 2 },
  outstandingCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outstandingLabel: { fontWeight: 'bold', color: '#64748b', fontSize: 12, letterSpacing: 1 },
  outstandingAmount: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  outstandingSub: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },

  historyContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  historyDate: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', marginBottom: 2 },
  historyCode: { fontSize: 13, fontWeight: 'bold', color: '#4f46e5' },
  historyAgent: { fontSize: 12, color: '#1e293b', fontWeight: '600' },
  historyAmount: { fontSize: 16, fontWeight: '900', color: '#059669' },
  historyBoxes: { fontSize: 11, color: '#64748b', textAlign: 'right' }
});