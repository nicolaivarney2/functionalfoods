import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://najaxycfjgultwdwffhv.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Vz1i0EKTMPNw0ldFMIScQ_qX_iHMKI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 