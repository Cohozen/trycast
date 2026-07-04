import 'react-native-get-random-values';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/lib/database.types';
import { LargeSecureStore } from '@/lib/secure-session-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY manquants (voir .env.example)');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    // Sur web, supabase-js retombe sur localStorage
    ...(Platform.OS === 'web' ? {} : { storage: new LargeSecureStore() }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Ne rafraîchit la session que quand l'app est au premier plan
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
