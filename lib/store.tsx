import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native'; // <--- IMPORT ALERT
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Agent, Customer, Item, Payment, Activity, SystemSettings, Profile, UserRole, Location } from '../types';

interface DataContextType {
  user: Profile | null;
  currentAgent: Agent | undefined;
  agents: Agent[];
  customers: Customer[];
  items: Item[];
  locations: Location[];
  payments: Payment[];
  activities: Activity[];
  settings: SystemSettings;
  loading: boolean;
  refreshData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  
  // Data State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ boxValue: 10, registrationFee: 50 });
  
  const [loading, setLoading] = useState(true);

  // --- AGENT MATCHING ---
  const currentAgent = useMemo(() => {
    if (!user || !agents.length) return undefined;
    
    return agents.find(a => 
      a.profileId === user.id || 
      (a.email && user.email && a.email.trim().toLowerCase() === user.email.trim().toLowerCase())
    );
  }, [user, agents]);

  // --- SECURITY CHECK (The "Bouncer") ---
  useEffect(() => {
    // If an agent is found, but marked INACTIVE in the database...
    if (currentAgent && currentAgent.active === false) {
      Alert.alert(
        "Access Denied", 
        "Your account has been deactivated by the Administrator.",
        [{ text: "OK", onPress: () => signOut() }] // Force Logout on OK
      );
      signOut(); // Force Logout immediately in background
    }
  }, [currentAgent]);

  // --- AUTH LISTENER ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Centralized Session Handler
  const handleSession = async (session: any) => {
    if (session?.user) {
      const role = (session.user.app_metadata?.role === 'ADMIN') ? UserRole.ADMIN : UserRole.AGENT;
      setUser({
        id: session.user.id,
        email: session.user.email!,
        role,
        name: session.user.user_metadata?.name || 'User'
      });
      await refreshData();
    } else {
      setUser(null);
      setAgents([]);
      setCustomers([]);
      setItems([]);
      setPayments([]);
      setLocations([]);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Agents
      const { data: ags } = await supabase.from('agents').select('*');
      
      const mappedAgents = (ags || []).map((a: any) => ({
        id: a.id,
        profileId: a.profile_id,
        firstName: a.first_name,
        lastName: a.last_name,
        email: a.email,
        phone: a.phone || '',
        locationId: a.location_id,
        active: a.active // Ensuring we read the status correctly
      }));
      setAgents(mappedAgents);

      // 2. Fetch Everything Else
      const [
        { data: locs }, 
        { data: its }, 
        { data: custs },
        { data: pays },
        { data: sett }
      ] = await Promise.all([
        supabase.from('locations').select('*'),
        supabase.from('items').select('*'),
        supabase.from('customers').select('*, products:customer_products(*)'),
        supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(500),
        supabase.from('settings').select('*')
      ]);

      setLocations((locs || []).map((l: any) => ({ id: l.id, name: l.name || 'Unknown Zone' })));
      
      setItems((its || []).map((i: any) => ({
        id: i.id, 
        name: i.name,
        price: Number(i.price || 0),           
        totalBoxes: Number(i.total_boxes || 0), 
        boxValue: Number(i.box_value || 0),    
        imageUrl: i.image_url
      })));

      setCustomers((custs || []).map((c: any) => ({
        id: c.id, name: c.name, phone: c.phone,
        locationId: c.location_id, agentId: c.agent_id,
        registrationFeePaid: Number(c.registration_fee_paid || 0),
        active: c.active !== false,
        products: (c.products || []).map((p: any) => ({
          itemId: p.item_id, totalAmount: Number(p.total_amount), balance: Number(p.balance), costBasis: Number(p.cost_basis)
        }))
      })));

      setPayments((pays || []).map((p: any) => ({
        id: p.id, customerId: p.customer_id, itemId: p.item_id,
        amount: Number(p.amount), agentId: p.agent_id, date: p.payment_date, boxCount: Number(p.box_count)
      })));

      const regFee = sett?.find(s => s.key === 1 || s.key === 'registration_fee')?.value || 50;
      setSettings({ boxValue: 10, registrationFee: Number(regFee) });

    } catch (e) {
      console.log('SYNC ERROR:', e);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.clear();
  };

  return (
    <DataContext.Provider value={{ user, currentAgent, agents, customers, items, locations, payments, activities, settings, loading, refreshData, signOut }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);