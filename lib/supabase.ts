import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// EXPORT these so we can use them in other files
export const supabaseUrl = 'https://dpprvmnhnjjwnithuidr.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcHJ2bW5obmpqd25pdGh1aWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTQ0OTIsImV4cCI6MjA4MjUzMDQ5Mn0.9XiLDOhXI84gI_yZF0ZnBnuX4hWxKHsP4EzyDH8AHIs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});