import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

let storage: any = undefined

if (Platform.OS !== 'web') {
  
  storage = require('@react-native-async-storage/async-storage').default
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})

