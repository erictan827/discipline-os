import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const STATE_TABLE = 'discipline_os_states';
const LEGACY_STATE_KEY = 'user_id';
const IDENTITY_KEY = 'identity_key';

let supabaseClient = null;

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function getIdentityEmail(userOrEmail) {
  if (!userOrEmail) return '';
  if (typeof userOrEmail === 'string') return normalizeEmail(userOrEmail);
  return normalizeEmail(userOrEmail.email || '');
}

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabasePublicConfig() {
  return {
    url: SUPABASE_URL,
    configured: hasSupabaseConfig(),
    stateTable: STATE_TABLE,
  };
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
}

export function mapSupabaseUser(user) {
  if (!user) return null;
  const email = normalizeEmail(user.email || '');
  return {
    id: user.id,
    email,
    name: user.user_metadata?.name || email.split('@')[0] || 'Eric',
  };
}

export async function getSupabaseSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return { session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return {
    session: data.session || null,
    user: data.session?.user || null,
  };
}

export async function registerSupabaseUser({ email, password, name }) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { name },
    },
  });
  if (error) throw error;
  return data;
}

export async function loginSupabaseUser({ email, password }) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle({ redirectTo } = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function linkGoogleSupabaseIdentity({ redirectTo } = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function getSupabaseUserIdentities() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  if (typeof supabase.auth.getUserIdentities !== 'function') {
    return [];
  }
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw error;
  return data?.identities || [];
}

export async function updateSupabasePassword({ password }) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function resendSupabaseConfirmationEmail({ email, redirectTo } = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizeEmail(email),
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
  if (error) throw error;
  return data;
}

export async function logoutSupabaseUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchSupabaseState(userOrEmail, userId = '') {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const identityEmail = getIdentityEmail(userOrEmail);

  if (identityEmail) {
    const primary = await supabase
      .from(STATE_TABLE)
      .select('state, updated_at')
      .eq(IDENTITY_KEY, identityEmail)
      .maybeSingle();

    if (!primary.error) {
      return {
        state: primary.data?.state || null,
        updatedAt: primary.data?.updated_at || null,
      };
    }

    const fallback = await supabase
      .from(STATE_TABLE)
      .select('state, updated_at')
      .eq('email', identityEmail)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallback.error) {
      return {
        state: fallback.data?.state || null,
        updatedAt: fallback.data?.updated_at || null,
      };
    }
  }

  const legacy = await supabase
    .from(STATE_TABLE)
    .select('state, updated_at')
    .eq(LEGACY_STATE_KEY, userId)
    .maybeSingle();

  if (legacy.error) throw legacy.error;
  return {
    state: legacy.data?.state || null,
    updatedAt: legacy.data?.updated_at || null,
  };
}

export async function saveSupabaseState({ user, state, name }) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const identityEmail = getIdentityEmail(user);
  const payload = {
    user_id: user.id,
    email: identityEmail,
    identity_key: identityEmail,
    name: name || user.user_metadata?.name || identityEmail.split('@')[0] || 'Eric',
    state,
    updated_at: new Date().toISOString(),
  };

  const primary = await supabase
    .from(STATE_TABLE)
    .upsert(payload, { onConflict: IDENTITY_KEY })
    .select('updated_at')
    .single();

  if (!primary.error) {
    return {
      updatedAt: primary.data?.updated_at || payload.updated_at,
    };
  }

  const fallback = await supabase
    .from(STATE_TABLE)
    .upsert({
      user_id: user.id,
      email: identityEmail,
      name: payload.name,
      state,
      updated_at: payload.updated_at,
    }, { onConflict: LEGACY_STATE_KEY })
    .select('updated_at')
    .single();

  if (fallback.error) throw fallback.error;
  return {
    updatedAt: fallback.data?.updated_at || payload.updated_at,
  };
}

export function onSupabaseAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session || null);
  });
  return () => data.subscription.unsubscribe();
}

export function subscribeToSupabaseState(userOrEmail, callback) {
  const supabase = getSupabaseClient();
  const identityEmail = getIdentityEmail(userOrEmail);
  if (!supabase || !identityEmail) return () => {};
  let channel = supabase
    .channel(`discipline-os-state:${identityEmail}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: STATE_TABLE,
        filter: `email=eq.${identityEmail}`,
      },
      (payload) => {
        callback({
          state: payload.new?.state || null,
          updatedAt: payload.new?.updated_at || null,
          event: payload.eventType || 'UPDATE',
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
