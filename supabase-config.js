// ============================================================
//  supabase-config.js — Cloud Connectivity
// ============================================================

const SUPABASE_URL = 'https://aygqljoobkjccipsqebi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Z3Fsam9vYmtqY2NpcHNxZWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODc2NDEsImV4cCI6MjA4ODg2MzY0MX0.DnmzLYZy0p2dAJZhCjo7EBgx4o4C5L9BVCK79FM9EA4';

// Initialize the Supabase client
window.supabaseClient = null;
try {
    if (typeof supabase !== 'undefined') {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase connected: system.flowcoresolutions.com.br');
    }
} catch (e) {
    console.warn('⚠️ Could not initialize Supabase. Falling back to local mode.', e);
}
