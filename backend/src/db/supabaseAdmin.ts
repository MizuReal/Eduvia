import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'
import type { Database } from './database.types.js'

export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
)
