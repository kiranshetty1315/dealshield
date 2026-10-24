/**
 * Supabase Client Configuration (Frontend Auth Boundary)
 *
 * CRITICAL SECURITY NOTICE:
 * - Browser code MUST ONLY use the anon public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 * - NEVER import or reference SUPABASE_SERVICE_ROLE_KEY here.
 * - Team D owns auth implementation.
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
};

export const getSupabaseClient = () => {
  // Stub client for scaffold; Team D will initialize @supabase/supabase-js
  return {
    isConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ),
  };
};
