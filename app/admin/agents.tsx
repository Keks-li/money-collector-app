import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Switch, ScrollView } from 'react-native';
import { useData } from '../../lib/store';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export default function AgentManager() {
  const { agents, refreshData } = useData();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', locationId: '' });

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.firstName) {
      Alert.alert("Missing Info", "First Name, Email, and Password are required.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create a Temporary Client to prevent Admin logout
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // 2. Create Auth User
      const { data: auth, error: authErr } = await tempSupabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { 
          data: { 
            role: 'AGENT', 
            name: `${form.firstName} ${form.lastName}` 
          } 
        }
      });

      if (authErr) throw authErr;
      if (!auth.user) throw new Error("Failed to generate User ID");

      // 3. Create Agent Record
      const { error: dbError } = await supabase.from('agents').insert({
        profile_id: auth.user.id,
        first_name: form.firstName, 
        last_name: form.lastName,
        email: form.email.trim().toLowerCase(), 
        phone: form.phone,
        location_id: form.locationId || null,
        active: true
      });

      if (dbError) throw dbError;

      Alert.alert("Success", "New Agent Created Successfully");
      setForm({ firstName: '', lastName: '', phone: '', email: '', password: '', locationId: '' });
      setShowForm(false);
      refreshData();

    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ active: !currentStatus })
        .eq('id', agentId);

      if (error) throw error;
      refreshData();
    } catch (e: any) {
      Alert.alert("Update Failed", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
        <Text style={styles.addBtnText}>{showForm ? "Close Form" : "+ Add New Agent"}</Text>
      </TouchableOpacity>

      {showForm && (
        <ScrollView style={styles.form}>
           <Text style={styles.header}>New Agent Details</Text>
           
           <TextInput 
             placeholder="First Name" 
             placeholderTextColor="#94a3b8"  
             style={styles.input} 
             value={form.firstName} 
             onChangeText={t => setForm({...form, firstName: t})} 
           />
           
           <TextInput 
             placeholder="Last Name" 
             placeholderTextColor="#94a3b8"  
             style={styles.input} 
             value={form.lastName} 
             onChangeText={t => setForm({...form, lastName: t})} 
           />
           
           <TextInput 
             placeholder="Phone" 
             placeholderTextColor="#94a3b8"  
             style={styles.input} 
             value={form.phone} 
             onChangeText={t => setForm({...form, phone: t})} 
             keyboardType="phone-pad" 
           />
           
           <TextInput 
             placeholder="Email" 
             placeholderTextColor="#94a3b8"  
             style={styles.input} 
             value={form.email} 
             onChangeText={t => setForm({...form, email: t})} 
             autoCapitalize="none" 
           />
           
           <TextInput 
             placeholder="Password" 
             placeholderTextColor="#94a3b8"  
             style={styles.input} 
             value={form.password} 
             onChangeText={t => setForm({...form, password: t})} 
             secureTextEntry 
           />
           
           <TouchableOpacity onPress={handleCreate} disabled={loading} style={styles.saveBtn}>
             <Text style={styles.saveText}>{loading ? "Creating..." : "Create Agent Account"}</Text>
           </TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={agents}
        keyExtractor={a => a.id}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.active && styles.inactiveCard]}>
            <View>
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.sub}>{item.email}</Text>
              {!item.active && <Text style={styles.blockedBadge}>BLOCKED</Text>}
            </View>
            <Switch 
              value={item.active} 
              onValueChange={() => toggleStatus(item.id, item.active)}
              trackColor={{ false: "#cbd5e1", true: "#4f46e5" }}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc', paddingTop: 50 },
  addBtn: { padding: 16, backgroundColor: '#4f46e5', borderRadius: 12, marginBottom: 20, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  form: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 20, maxHeight: 400 },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#334155' },
  input: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  saveText: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  inactiveCard: { opacity: 0.7, backgroundColor: '#f1f5f9' },
  name: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  sub: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  blockedBadge: { fontSize: 10, color: 'red', fontWeight: 'bold', marginTop: 2 }
});