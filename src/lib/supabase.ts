import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gvcvicoiwqylqhjyunwx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Y3ZpY29pd3F5bHFoanl1bnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQ5MjcsImV4cCI6MjA5MzIzMDkyN30.4R5GToPDByxEYCxyQSHboqGdPawpjALEOH7cAAK5BpA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)