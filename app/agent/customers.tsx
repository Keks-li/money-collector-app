import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useData } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CustomerList() {
  const router = useRouter();
  const { customers, currentAgent, items, refreshData } = useData();
  const [search, setSearch] = useState('');
  
  // State for Modals
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [addingToCustomer, setAddingToCustomer] = useState(null); 

  const myCustomers = customers.filter(c => c.agentId === currentAgent?.id && c.active === true);
  
  const filtered = myCustomers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const handleAddProduct = (customer) => {
    setAddingToCustomer(customer);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Lookup Client..." 
          value={search} 
          onChangeText={setSearch} 
        />
        <TouchableOpacity onPress={() => router.push('/agent/registration')} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No active customers found.</Text>}
        renderItem={({ item: customer }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerPhone}>{customer.phone}</Text>
              </View>
              <View style={styles.headerRight}>
                 <Text style={styles.totalLabel}>{customer.products.length} Products</Text>
              </View>
            </View>

            <View style={styles.productList}>
              {customer.products.map((prod, index) => {
                const itemDetails = items.find(i => i.id === prod.itemId);
                const remainingBoxes = itemDetails ? Math.round(prod.balance / itemDetails.boxValue) : 0;
                
                return (
                  <View key={index} style={styles.productRow}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productCode}>Code: {itemDetails?.name}</Text>
                      <Text style={styles.productMeta}>
                        BOX VAL: GH₵{itemDetails?.boxValue} | <Text style={{color: '#ef4444'}}>OWING: {remainingBoxes} BOXES</Text>
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.collectBtn}
                      onPress={() => setSelectedProduct({
                        customer,
                        product: prod,
                        itemDetails
                      })}
                    >
                      <Text style={styles.collectBtnText}>COLLECT</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity 
              style={styles.addProductBtn}
              onPress={() => handleAddProduct(customer)}
            >
              <Text style={styles.addProductText}>+ ADD NEW PRODUCT</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Payment Modal */}
      {selectedProduct && (
        <CollectionModal 
          data={selectedProduct} 
          agentId={currentAgent?.id}
          onClose={() => { setSelectedProduct(null); refreshData(); }} 
        />
      )}

      {/* Add Product Modal */}
      {addingToCustomer && (
        <AddProductModal 
          customer={addingToCustomer}
          items={items}
          onClose={() => { setAddingToCustomer(null); refreshData(); }}
        />
      )}
    </View>
  );
}

// --- ADD PRODUCT MODAL (Auto-Assigns Full Debt) ---
function AddProductModal({ customer, items, onClose }) {
    
    const handleSelectProduct = (item) => {
        const fullPrice = item.price; 
        
        // UPDATED: Removed debt info from alert message
        Alert.alert(
            "Confirm Assignment",
            `Add ${item.name} to ${customer.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => assignProduct(item, fullPrice) }
            ]
        );
    };

    const assignProduct = async (item, fullPrice) => {
      try {
        const { error } = await supabase.from('customer_products').insert({
          customer_id: customer.id,
          item_id: item.id,
          totalAmount: fullPrice,
          balance: fullPrice, 
          status: 'active'
        });
  
        if (error) throw error;
  
        Alert.alert("Success", "Product added successfully");
        onClose();
      } catch (e) {
        Alert.alert("Error", e.message);
      }
    };
  
    return (
      <Modal animationType="slide" transparent={true} visible={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Product</Text>
              <TouchableOpacity onPress={onClose}>
                 <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalName}>{customer.name}</Text>
            <Text style={{fontSize:12, color:'#64748b', marginBottom:15}}>Tap a product to assign full Hire Purchase debt:</Text>
            
            <ScrollView>
                {items.map(item => {
                    const boxCount = item.total_boxes || item.totalBoxes || Math.round(item.price / item.boxValue);
                    return (
                        <TouchableOpacity 
                            key={item.id} 
                            style={styles.itemSelectRow} 
                            onPress={() => handleSelectProduct(item)}
                        >
                            <View style={styles.iconBox}>
                                <Ionicons name="cube" size={20} color="#6366f1" />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemSub}>Full Price: GH₵{item.price.toLocaleString()} ({boxCount} Boxes)</Text>
                            </View>
                            <Ionicons name="add-circle" size={28} color="#059669" />
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
}

// --- COLLECTION MODAL ---
function CollectionModal({ data, agentId, onClose }) {
  const { customer, product, itemDetails } = data;
  const [boxCount, setBoxCount] = useState(1);
  const [processing, setProcessing] = useState(false);

  const remainingBoxes = itemDetails ? Math.round(product.balance / itemDetails.boxValue) : 0;
  const amount = (itemDetails?.boxValue || 0) * boxCount;

  const handleCollect = async () => {
    if (!agentId) return Alert.alert("Error", "Agent ID missing");
    if (boxCount > remainingBoxes && remainingBoxes > 0) {
        Alert.alert("Warning", "You are collecting more boxes than they owe. Continue?", [
            { text: "Cancel", style: "cancel" },
            { text: "Yes", onPress: processPayment }
        ]);
    } else {
        processPayment();
    }
  };

  const processPayment = async () => {
    setProcessing(true);
    try {
      const { error: payError } = await supabase.from('payments').insert({
        customer_id: customer.id,
        item_id: itemDetails.id,
        amount: amount,
        box_count: boxCount,
        agent_id: agentId,
        payment_date: new Date().toISOString()
      });

      if (payError) throw payError;

      const newBalance = product.balance - amount;
      const { error: balError } = await supabase.from('customer_products')
        .update({ balance: newBalance })
        .eq('customer_id', customer.id)
        .eq('item_id', itemDetails.id);

      if (balError) throw balError;

      Alert.alert("Success", `Collected GH₵${amount}`);
      onClose();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal animationType="slide" transparent={true} visible={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Collect Payment</Text>
            <TouchableOpacity onPress={onClose}>
               <Ionicons name="close-circle" size={28} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalName}>{customer.name}</Text>
          <Text style={styles.modalCode}>{itemDetails?.name}</Text>

          <View style={styles.outstandingBadge}>
            <Text style={styles.outstandingText}>REMAINING TO PAY: {remainingBoxes} BOXES</Text>
          </View>

          <View style={styles.counterBox}>
            <TouchableOpacity onPress={() => setBoxCount(Math.max(1, boxCount - 1))} style={styles.countBtn}>
              <Ionicons name="remove" size={24} color="black" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
               <Text style={styles.countNum}>{boxCount}</Text>
               <Text style={styles.countLabel}>Boxes</Text>
            </View>
            <TouchableOpacity onPress={() => setBoxCount(boxCount + 1)} style={styles.countBtn}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.modalTotalLabel}>TOTAL TO COLLECT</Text>
            <Text style={styles.totalAmount}>GH₵{amount.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.payBtn} onPress={handleCollect} disabled={processing}>
            <Text style={styles.payText}>{processing ? "PROCESSING..." : "CONFIRM COLLECTION"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 60 },
  searchContainer: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  addButton: { padding: 8, backgroundColor: '#e0e7ff', borderRadius: 8 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  customerName: { fontSize: 18, fontWeight: '900', color: '#1f2937' },
  customerPhone: { fontSize: 14, color: '#6b7280', fontWeight: 'bold' },
  headerRight: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, fontWeight: 'bold', color: '#ef4444' },
  productList: { gap: 12 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  productInfo: { flex: 1 },
  productCode: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  productMeta: { fontSize: 10, color: '#9ca3af', fontWeight: 'bold', marginTop: 4 },
  collectBtn: { backgroundColor: '#059669', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  collectBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  addProductBtn: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center' },
  addProductText: { color: '#9ca3af', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#94a3b8' },
  modalName: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  modalCode: { fontSize: 16, color: '#059669', fontWeight: 'bold', marginBottom: 10 },
  outstandingBadge: { alignSelf: 'flex-start', backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 20 },
  outstandingText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  counterBox: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
  countBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  countNum: { fontSize: 36, fontWeight: '900' },
  countLabel: { fontSize: 10, color: 'gray' },
  totalBox: { backgroundColor: '#f0fdf4', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  modalTotalLabel: { fontSize: 10, fontWeight: 'bold', color: '#166534' },
  totalAmount: { fontSize: 24, fontWeight: '900', color: '#166534' },
  payBtn: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, alignItems: 'center' },
  payText: { color: 'white', fontWeight: 'bold' },

  // New Item Select Styles
  itemSelectRow: { flexDirection:'row', alignItems:'center', padding:16, backgroundColor:'#f8fafc', borderRadius:12, marginBottom:10 },
  iconBox: { width:40, height:40, backgroundColor:'#e0e7ff', borderRadius:10, alignItems:'center', justifyContent:'center', marginRight:12 },
  itemName: { fontWeight:'bold', fontSize:16, color:'#1e293b' },
  itemSub: { fontSize:12, color:'#64748b' }
});