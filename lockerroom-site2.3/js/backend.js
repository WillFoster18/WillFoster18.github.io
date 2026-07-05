/*
  LockerRoom Backend
  -------------------
  This is the one file that knows whether a real backend is configured.
  Everything else in app.js calls into here and doesn't need to care —
  if config.js still has placeholder values, everything falls back to
  the original local-only demo behavior (localStorage + hardcoded
  listings), so the site keeps working before you've set up Supabase.

  Once js/config.js has real values, this switches to talking to a real
  Postgres database with real user accounts, automatically.
*/

const Backend = (() => {
  const cfg = window.LOCKERROOM_CONFIG || {};
  const isConfigured = Boolean(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL !== 'YOUR_SUPABASE_URL'
  );

  const client = (isConfigured && window.supabase)
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  if (isConfigured && !window.supabase) {
    console.warn('LockerRoom: config.js is filled in, but the Supabase library did not load. Check the <script> tag in index.html.');
  }

  // ---------------- Auth ----------------

  async function signUp(email, password) {
    if (!client) throw new Error('Backend not configured yet.');
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    if (!client) throw new Error('Backend not configured yet.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  async function getCurrentUser() {
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user || null;
  }

  function onAuthChange(callback) {
    if (!client) return;
    client.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
  }

  // ---------------- Racer profile ----------------

  async function getProfile(userId) {
    if (!client) return null;
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  }

  async function saveProfile(userId, profile) {
    if (!client) return;
    const { error } = await client
      .from('profiles')
      .upsert({ id: userId, ...profile });
    if (error) throw error;
  }

  // ---------------- Listings ----------------

  async function fetchListings() {
    if (!client) return null; // signals "use local demo data" to app.js
    const { data, error } = await client
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return null; }
    return data;
  }

  async function createListing(sellerId, listing) {
    if (!client) throw new Error('Backend not configured yet.');
    const { data, error } = await client
      .from('listings')
      .insert({ seller_id: sellerId, ...listing })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ---------------- Proof Runs ----------------

  async function uploadProofRun(sellerId, listingId, file) {
    if (!client) throw new Error('Backend not configured yet.');
    const path = `${sellerId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await client.storage
      .from('proof-runs')
      .upload(path, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = client.storage.from('proof-runs').getPublicUrl(path);
    const videoUrl = urlData.publicUrl;

    if (listingId) {
      const { error: insertError } = await client
        .from('proof_runs')
        .insert({ listing_id: listingId, seller_id: sellerId, video_url: videoUrl });
      if (insertError) throw insertError;

      await client.from('listings').update({ has_proof_run: true }).eq('id', listingId);
    }

    return videoUrl;
  }

  async function getProofRunsForListing(listingId) {
    if (!client) return [];
    const { data, error } = await client
      .from('proof_runs')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  }

  return {
    isConfigured,
    signUp, signIn, signOut, getCurrentUser, onAuthChange,
    getProfile, saveProfile,
    fetchListings, createListing,
    uploadProofRun, getProofRunsForListing,
  };
})();
