import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { supabase } from '../../lib/supabase';
import { Picker } from '@react-native-picker/picker';

export default function Registration() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const existingCustomerId = params.existingCustomerId as string; 

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [existingCustomer, setExistingCustomer] = useState<any>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [itemId, setItemId] = useState<string>('');

  useEffect(() => {
    fetchDirectly();
  }, []);

  const fetchDirectly = async () => {
    try {
      setPageLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Not logged in.");
        return;
      }
      
      const { data: agentData } = await supabase.from('agents').select('*').eq('profile_id', user.id).single();
      setCurrentAgent(agentData);

      // 1. Fetch Locations
      const { data: locData } = await supabase.from('locations').select('*');
      const safeLocs = locData || [];
      setLocations(safeLocs);

      // 2. Fetch Items
      const { data: itemData } = await supabase.from('items').select('*');
      const safeItems = itemData || [];
      setItems(safeItems);

      // 3. Handle Existing or Defaults
      if (existingCustomerId) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', existingCustomerId).single();
        if (custData) {
          setExistingCustomer(custData);
          setName(custData.name);
          setPhone(custData.phone);
          setLocationId(custData.location_id?.toString() || '');
        }
      } else {
        if (safeLocs.length > 0) setLocationId(safeLocs[0].id.toString());
      }

      if (safeItems.length > 0) setItemId(safeItems[0].id.toString());

    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setPageLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!itemId || (!existingCustomer && (!name || !phone || !locationId))) {
      Alert.alert('Missing Info', 'Please fill all fields.');
      return;
    }

    const item = items.find(i => i.id.toString() === itemId);
    if (!item) return Alert.alert("Error", "Invalid Product Selection");

    setLoading(true);

    try {
      let targetCustomerId = existingCustomerId;

      // Create New Customer
      if (!targetCustomerId) {
        const { data: cust, error: custError } = await supabase.from('customers').insert({
          name: name.trim(),
          phone: phone.trim(),
          location_id: locationId, 
          agent_id: currentAgent?.id,
          registration_fee_paid: 50,
          active: true
        }).select().single();

        if (custError) throw custError;
        targetCustomerId = cust.id;
      }

      // Add Product
      const rate = Number(item.box_value) || 0;
      const boxes = Number(item.total_boxes) || (rate > 0 ? Math.round(Number(item.price) / rate) : 0);
      const initialDebt = Number(item.price) || (boxes * rate);

      const { error: prodError } = await supabase.from('customer_products').insert({
        customer_id: targetCustomerId,
        item_id: item.id,
        total_amount: initialDebt,
        balance: initialDebt,
        cost_basis: initialDebt
      });

      if (prodError) throw prodError;

      Alert.alert('Success', existingCustomerId ? 'Product Added!' : 'Registration Complete!');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#059669" />
        </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        {existingCustomer ? 'Add Product' : 'New Registration'}
      </Text>
      
      {/* NAME */}
      <View style={[styles.formGroup, existingCustomer && styles.disabled]}>
        <Text style={styles.label}>FULL NAME</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="Enter Name"
          placeholderTextColor="#94a3b8"
          editable={!existingCustomer}
        />
      </View>

      {/* PHONE */}
      <View style={[styles.formGroup, existingCustomer && styles.disabled]}>
        <Text style={styles.label}>PHONE NUMBER</Text>
        <TextInput 
          style={styles.input} 
          value={phone} 
          onChangeText={setPhone} 
          keyboardType="phone-pad"
          placeholder="055..."
          placeholderTextColor="#94a3b8"
          editable={!existingCustomer}
        />
      </View>

      {/* LOCATION PICKER */}
      <View style={[styles.formGroup, existingCustomer && styles.disabled]}>
        <Text style={styles.label}>LOCATION ZONE</Text>
        <View style={styles.pickerContainer}>
             <Picker
                selectedValue={locationId}
                onValueChange={(itemValue) => setLocationId(itemValue)}
                style={styles.picker}
             >
                {locations.length > 0 ? (
                    locations.map(l => (
                        <Picker.Item key={l.id} label={l.name} value={l.id.toString()} color="#1e293b" style={{fontSize: 16}} />
                    ))
                ) : (
                    <Picker.Item label="Loading..." value="" />
                )}
             </Picker>
        </View>
      </View>

      {/* PRODUCT PICKER */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>PRODUCT SELECTION</Text>
        <View style={styles.pickerContainer}>
            <Picker
                selectedValue={itemId}
                onValueChange={(itemValue) => setItemId(itemValue)}
                style={styles.picker}
            >
                {items.length > 0 ? (
                    items.map(i => {
                       const rate = Number(i.box_value) || 0;
                       const boxes = Number(i.total_boxes) || (rate > 0 ? Math.round(Number(i.price) / rate) : 0);
                       const price = Number(i.price) || (boxes * rate);
                       
                       return (
                          <Picker.Item 
                            key={i.id} 
                            label={`${i.name} - ${boxes} Boxes (GH₵${price})`} 
                            value={i.id.toString()}
                            color="#1e293b"
                            style={{fontSize: 16}}
                          />
                       );
                    })
                ) : (
                    <Picker.Item label="Loading..." value="" />
                )}
            </Picker>
        </View>
      </View>

      <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>
          {existingCustomer ? 'ADD PRODUCT' : 'SUBMIT REGISTRATION'}
        </Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  header: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 32, marginTop: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 8, letterSpacing: 1 },
  
  // Clean Input
  input: { 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    fontWeight: 'bold', 
    fontSize: 16, 
    color: '#1e293b' 
  },
  
  // ROBUST PICKER CONTAINER
  // We removed 'height' and 'overflow' to ensure the menu can actually open
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  
  // The Picker itself decides the height naturally
  picker: {
    width: '100%',
    color: '#1e293b'
  },

  btn: { backgroundColor: '#059669', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 20, marginBottom: 50 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1.5 },
  disabled: { opacity: 0.6 }
});