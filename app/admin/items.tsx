import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useData } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function AdminItems() {
  const { items, refreshData } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [productCode, setProductCode] = useState(''); 
  const [totalBox, setTotalBox] = useState('');       
  const [boxRate, setBoxRate] = useState('');         
  
  // Edit Mode
  const [editingItem, setEditingItem] = useState(null);

  const openModal = (item) => {
    if (item) {
      setEditingItem(item);
      setProductCode(item.name);
      
      // FIX: Use item.total_boxes (database name) instead of item.totalBoxes
      // Fallback calculation is kept just in case
      const boxes = item.total_boxes || (item.box_value > 0 ? Math.round(item.price / item.box_value) : 0);
      
      setTotalBox(boxes.toString());
      setBoxRate(item.box_value ? item.box_value.toString() : '');
    } else {
      setEditingItem(null);
      setProductCode('');
      setTotalBox('');
      setBoxRate('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!productCode || !totalBox || !boxRate) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);

    try {
      const rate = parseFloat(boxRate);
      const boxes = parseFloat(totalBox);
      
      // Logic: Price is auto-calculated based on your inputs
      const calculatedPrice = boxes * rate;

      const payload = {
        name: productCode,          
        total_boxes: boxes,
        box_value: rate,
        price: calculatedPrice,
        image_url: null 
      };

      if (editingItem) {
        const { error } = await supabase.from('items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('items').insert(payload);
        if (error) throw error;
      }

      Alert.alert('Success', 'Product Saved!');
      setModalVisible(false);
      await refreshData(); 
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            const { error } = await supabase.from('items').delete().eq('id', id);
            
            if (error) {
              Alert.alert("Error", "Could not delete item. It might be linked to existing sales.");
              return;
            }
            await refreshData();
          } catch (e) {
            Alert.alert("Error", e.message);
          }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PRODUCT CATALOG</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
           <Ionicons name="add" size={24} color="white" />
           <Text style={styles.addBtnText}>ADD PRODUCT</Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No products found. Add one to get started.</Text>}
        renderItem={({ item }) => {
            // FIX: Using correct database column names (snake_case)
            const rate = item.box_value || 0;
            const boxes = item.total_boxes || (rate > 0 ? Math.round(item.price / rate) : 0);
            const totalVal = item.price || (boxes * rate); 

            return (
              <View style={styles.card}>
                <View style={styles.iconBox}>
                   <Ionicons name="cube-outline" size={24} color="#64748b" />
                </View>
                
                <View style={{ flex: 1, marginLeft: 16 }}>
                   <Text style={styles.prodName}>{item.name}</Text>
                   <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
                       <Text style={styles.tag}>Total Boxes: {boxes}</Text>
                       <Text style={styles.tag}>Rate: GH₵{rate}</Text>
                   </View>
                   <Text style={styles.prodPrice}>Total Value: GH₵{totalVal.toLocaleString()}</Text>
                </View>

                <View style={styles.actions}>
                   <TouchableOpacity onPress={() => openModal(item)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={20} color="#2563eb" />
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.iconBtn, {backgroundColor:'#fee2e2'}]}>
                      <Ionicons name="trash" size={20} color="#dc2626" />
                   </TouchableOpacity>
                </View>
              </View>
            );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>{editingItem ? 'Edit Product' : 'New Product'}</Text>
           
           <Text style={styles.label}>Product Code</Text>
           <TextInput 
             style={styles.input} 
             placeholder="e.g. CUZO 24" 
             value={productCode} 
             onChangeText={setProductCode} 
           />

           <View style={{flexDirection:'row', gap: 10}}>
             <View style={{flex: 1}}>
                <Text style={styles.label}>Total Box</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 100" 
                  keyboardType="numeric" 
                  value={totalBox} 
                  onChangeText={setTotalBox} 
                />
             </View>
             <View style={{flex: 1}}>
                <Text style={styles.label}>Box Rate (GH₵)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 10" 
                  keyboardType="numeric" 
                  value={boxRate} 
                  onChangeText={setBoxRate} 
                />
             </View>
           </View>
           
           <View style={styles.calcPreview}>
               <Text style={styles.calcText}>
                   Value: GH₵{(parseFloat(totalBox || '0') * parseFloat(boxRate || '0')).toLocaleString()}
               </Text>
               <Text style={{fontSize: 10, color: '#166534', marginTop: 2}}>(Auto-calculated & Saved)</Text>
           </View>

           <View style={{flexDirection:'row', gap: 10, marginTop: 30}}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.btn, {backgroundColor:'#f1f5f9', flex:1}]}>
                 <Text style={{color:'black', fontWeight:'bold'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.btn, {backgroundColor:'#2563eb', flex:2}]}>
                 {loading ? <ActivityIndicator color="white" /> : <Text style={{color:'white', fontWeight:'bold'}}>Save Product</Text>}
              </TouchableOpacity>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 14, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  addBtn: { flexDirection: 'row', backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11, marginLeft: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 50 },

  card: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  prodName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  prodPrice: { fontSize: 12, fontWeight: 'bold', color: '#059669', marginTop: 4 },
  tag: { fontSize: 10, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', color: '#64748b', fontWeight: 'bold' },
  
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, backgroundColor: '#eff6ff', borderRadius: 8 },

  modalContent: { flex: 1, padding: 30, paddingTop: 50, backgroundColor: 'white' },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 30 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, fontWeight: 'bold' },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  
  calcPreview: { marginTop: -10, marginBottom: 20, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, alignItems: 'center' },
  calcText: { color: '#166534', fontWeight: 'bold', fontSize: 14 }
});