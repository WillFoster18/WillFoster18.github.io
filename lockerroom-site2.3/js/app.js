/* ---------------- Demo data (used until the backend is configured, or as a seed) ---------------- */
const gradients = [
  'linear-gradient(135deg,#1E4FD6,#0A0B0D)',
  'linear-gradient(135deg,#0B2C6B,#1C1F23)',
  'linear-gradient(135deg,#0A0B0D,#28313E)',
  'linear-gradient(135deg,#3E6FE0,#0B2C6B)',
];

const DEMO_LISTINGS = [
  {id:'demo-1', bib:'04', cat:'Skis', name:"Atomic Redster S9 165cm", meta:"GS · FIS Homologated · Bindings incl.", price:520, seller:'K. Landry', location:'Mont-Tremblant, QC', proof:true,
    specs:[['Discipline','Giant Slalom'],['Length','165 cm'],['Radius','30 m'],['Races Used','18'],['Bindings','Included, DIN 6–14']],
    raw:{category:'Skis', discipline:'Giant Slalom', lengthCm:165, racesUsed:18}},
  {id:'demo-2', bib:'11', cat:'Suits', name:"Spyder World Cup Race Suit", meta:"Men's M · Slalom Cut · 2024", price:310, seller:'T. Whitfield', location:'Stowe, VT', proof:true,
    specs:[['Discipline','Slalom'],['Size',"Men's M"],['Chest','98 cm'],['Waist','82 cm'],['Races Used','22']],
    raw:{category:'Race Suit', discipline:'Slalom', chestCm:98, waistCm:82, racesUsed:22}},
  {id:'demo-3', bib:'23', cat:'Boots', name:"Lange RS 130 Race Boots", meta:"26.5 · 97mm Last · Punched", price:390, seller:'A. Boucher', location:'Ottawa, ON', proof:false,
    specs:[['Size','26.5'],['Last Width','97 mm'],['Flex','130'],['Races Used','40'],['Punches','5th metatarsal, both feet']],
    raw:{category:'Boots', lastWidthMm:97, flex:130, racesUsed:40}},
  {id:'demo-4', bib:'30', cat:'Skis', name:"Rossignol Hero Athlete FIS GS", meta:"188cm · 30m Radius · Plate incl.", price:610, seller:'M. Cyr', location:'Burlington, VT', proof:true,
    specs:[['Discipline','Giant Slalom'],['Length','188 cm'],['Radius','30 m'],['Races Used','2'],['Plate','World Cup plate included']],
    raw:{category:'Skis', discipline:'Giant Slalom', lengthCm:188, racesUsed:2}},
  {id:'demo-5', bib:'07', cat:'Poles', name:"Swix Composite GS Race Poles", meta:"130cm · Race Bend", price:75, seller:'J. Fortin', location:'Lake Placid, NY', proof:false,
    specs:[['Length','130 cm'],['Discipline','Giant Slalom'],['Races Used','15'],['Baskets','Race baskets included']],
    raw:{category:'Poles', discipline:'Giant Slalom', racesUsed:15}},
  {id:'demo-6', bib:'16', cat:'Boots', name:"Head Raptor WCR 130", meta:"26.0 · 98mm Last", price:340, seller:'S. Nguyen', location:'Killington, VT', proof:true,
    specs:[['Size','26.0'],['Last Width','98 mm'],['Flex','130'],['Races Used','25']],
    raw:{category:'Boots', lastWidthMm:98, flex:130, racesUsed:25}},
  {id:'demo-7', bib:'19', cat:'Suits', name:"Rossignol Infinity Speed Suit", meta:"Women's S · Downhill/Super G Cut", price:280, seller:'C. Beaulieu', location:'Whistler, BC', proof:false,
    specs:[['Discipline','Downhill / Super G'],['Size',"Women's S"],['Chest','88 cm'],['Waist','70 cm'],['Races Used','30']],
    raw:{category:'Race Suit', discipline:'Super G', chestCm:88, waistCm:70, racesUsed:30}},
  {id:'demo-8', bib:'02', cat:'Skis', name:"Salomon S/Race Slalom Pro", meta:"160cm · 12.5m Radius", price:475, seller:'D. Roy', location:'Sherbrooke, QC', proof:true,
    specs:[['Discipline','Slalom'],['Length','160 cm'],['Radius','12.5 m'],['Races Used','9'],['Bindings','Included']],
    raw:{category:'Skis', discipline:'Slalom', lengthCm:160, racesUsed:9}},
];

let listings = DEMO_LISTINGS;
let proofOnly = listings.filter(l => l.proof);

/* ---------------- Session state ---------------- */
let currentUser = null;     // Supabase user, or null if signed out / backend not configured
let currentProfile = null;  // racer profile, from Supabase or localStorage depending on mode
let pendingProofFile = null; // file staged in the sell form before the listing exists yet

/* ---------------- Boot sequence ---------------- */
async function init(){
  if (Backend.isConfigured) {
    currentUser = await Backend.getCurrentUser();
    Backend.onAuthChange(async (user) => {
      currentUser = user;
      await loadProfileForContext();
      updateAuthNav();
      rerenderAll();
    });
  }
  await loadProfileForContext();
  await loadListings();
  updateAuthNav();
  updateProfileBadge();
  rerenderAll();
}

async function loadListings(){
  if (Backend.isConfigured) {
    const remote = await Backend.fetchListings();
    if (remote && remote.length) {
      listings = remote.map((row, idx) => ({
        id: row.id,
        bib: String(idx + 1).padStart(2, '0'),
        cat: row.category,
        name: row.name,
        meta: row.meta || '',
        price: row.price,
        seller: row.seller_name || 'LockerRoom Seller',
        location: row.location || '',
        proof: !!row.has_proof_run,
        specs: row.specs || [],
        raw: row.raw || {},
      }));
    } else {
      listings = DEMO_LISTINGS; // empty database yet — show demo data so the site isn't blank
    }
  } else {
    listings = DEMO_LISTINGS;
  }
  proofOnly = listings.filter(l => l.proof);
}

function rerenderAll(){
  renderBrowse(document.querySelector('.filter-bar button.active')?.dataset.filter || 'all');
  renderProofGrid();
  renderHomeProof();
}

/* ---------------- Racer Profile ---------------- */
const LOCAL_PROFILE_KEY = 'lockerroom_racer_profile_v1';

function getLocalProfile(){
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function saveLocalProfile(profile){
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}

async function loadProfileForContext(){
  if (Backend.isConfigured && currentUser) {
    currentProfile = await Backend.getProfile(currentUser.id);
  } else {
    currentProfile = getLocalProfile();
  }
}

function openProfileModal(){
  const existing = currentProfile || {};
  document.getElementById('profile-discipline').value = existing.discipline || 'Giant Slalom';
  document.getElementById('profile-length').value = existing.preferred_length_cm ?? existing.preferredLengthCm ?? '';
  document.getElementById('profile-lastwidth').value = existing.boot_last_width_mm ?? existing.bootLastWidthMm ?? '';
  document.getElementById('profile-flex').value = existing.desired_flex ?? existing.desiredFlex ?? '';
  document.getElementById('profile-chest').value = existing.chest_cm ?? existing.chestCm ?? '';
  document.getElementById('profile-waist').value = existing.waist_cm ?? existing.waistCm ?? '';
  document.getElementById('profile-modal').classList.add('open');
}

function closeProfileModal(){
  document.getElementById('profile-modal').classList.remove('open');
}

async function submitProfile(event){
  event.preventDefault();
  const discipline = document.getElementById('profile-discipline').value;
  const preferredLengthCm = parseFloat(document.getElementById('profile-length').value) || null;
  const bootLastWidthMm = parseFloat(document.getElementById('profile-lastwidth').value) || null;
  const desiredFlex = parseFloat(document.getElementById('profile-flex').value) || null;
  const chestCm = parseFloat(document.getElementById('profile-chest').value) || null;
  const waistCm = parseFloat(document.getElementById('profile-waist').value) || null;

  try {
    if (Backend.isConfigured && currentUser) {
      await Backend.saveProfile(currentUser.id, {
        discipline,
        preferred_length_cm: preferredLengthCm,
        boot_last_width_mm: bootLastWidthMm,
        desired_flex: desiredFlex,
        chest_cm: chestCm,
        waist_cm: waistCm,
      });
      currentProfile = await Backend.getProfile(currentUser.id);
    } else {
      currentProfile = { discipline, preferredLengthCm, bootLastWidthMm, desiredFlex, chestCm, waistCm };
      saveLocalProfile(currentProfile);
    }
  } catch (err) {
    alert('Could not save your profile: ' + err.message);
    return;
  }

  closeProfileModal();
  rerenderAll();
  updateProfileBadge();
}

function updateProfileBadge(){
  const badge = document.getElementById('profile-nav-label');
  if (!badge) return;
  badge.textContent = currentProfile ? 'Edit Racer Profile' : 'Set Up Racer Profile';
}

/* ---------------- Auth ---------------- */
function openAuthModal(){
  if (!Backend.isConfigured) {
    alert("The backend isn't connected yet — accounts will work once js/config.js has your Supabase project details. Until then, everything runs locally in this browser.");
    return;
  }
  if (currentUser) {
    handleSignOut();
    return;
  }
  document.getElementById('auth-modal').classList.add('open');
}

function closeAuthModal(){
  document.getElementById('auth-modal').classList.remove('open');
}

async function handleAuthSubmit(event, mode){
  event.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) return;

  try {
    if (mode === 'signup') {
      await Backend.signUp(email, password);
      alert('Account created. Check your email if Supabase has email confirmation turned on, then sign in.');
    } else {
      await Backend.signIn(email, password);
      currentUser = await Backend.getCurrentUser();
      await loadProfileForContext();
      updateAuthNav();
      updateProfileBadge();
      rerenderAll();
      closeAuthModal();
    }
  } catch (err) {
    alert('Authentication error: ' + err.message);
  }
}

async function handleSignOut(){
  await Backend.signOut();
  currentUser = null;
  await loadProfileForContext();
  updateAuthNav();
  updateProfileBadge();
  rerenderAll();
}

function updateAuthNav(){
  const label = document.getElementById('auth-nav-label');
  if (!label) return;
  if (!Backend.isConfigured) { label.textContent = 'Sign In (needs backend)'; return; }
  label.textContent = currentUser ? `Sign Out (${currentUser.email})` : 'Sign In';
}

/* ---------------- Fit Confidence (live, via FitConfidence engine) ---------------- */
function fitFor(listing){
  if (!currentProfile) return { score: null, breakdown: [], note: 'Set up your racer profile to see a Fit Confidence score.' };
  // Normalize DB-style snake_case profile fields to the engine's camelCase contract.
  const p = currentProfile;
  const normalized = {
    discipline: p.discipline,
    preferredLengthCm: p.preferred_length_cm ?? p.preferredLengthCm,
    bootLastWidthMm: p.boot_last_width_mm ?? p.bootLastWidthMm,
    desiredFlex: p.desired_flex ?? p.desiredFlex,
    chestCm: p.chest_cm ?? p.chestCm,
    waistCm: p.waist_cm ?? p.waistCm,
  };
  return FitConfidence.computeFitConfidence(normalized, listing.raw);
}

function fitChipHtml(listing){
  const fit = fitFor(listing);
  if (fit.score == null) return `<span class="fit-chip" style="color:var(--frost-dark); background:var(--snow-2);">Set profile for Fit Score</span>`;
  return `<span class="fit-chip">${fit.score.toFixed(0)} Fit</span>`;
}

/* ---------------- Render helpers ---------------- */
function grad(i){ return gradients[i % gradients.length]; }

function renderCard(l, i){
  return `<div class="card" onclick="showDetail('${l.id}')">
    <div class="card-img" style="background:${grad(i)}">
      <span class="bib-tag">BIB ${l.bib}</span>${l.name.split(' ').slice(0,2).join(' ')}
    </div>
    <div class="card-body">
      <div class="cat">${l.cat}</div>
      <h3>${l.name}</h3>
      <div class="meta">${l.meta}</div>
      <div class="card-foot">
        <span class="price">$${l.price}</span>
        ${fitChipHtml(l)}
      </div>
      ${l.proof ? `<div class="proof-tag">Proof Run available</div>` : ``}
    </div>
  </div>`;
}

function renderBrowse(filter='all'){
  const el = document.getElementById('browse-grid');
  const items = filter==='all' ? listings : listings.filter(l=>l.cat===filter);
  el.innerHTML = items.map((l,i)=>renderCard(l,i)).join('');
}

function renderProofCard(l, i){
  return `<div class="proof-card" onclick="showDetail('${l.id}')">
    <div class="proof-video" style="background:${grad(i)}">
      <span class="badge">PROOF RUN</span>
      <div class="play">▶</div>
    </div>
    <div class="proof-caption"><b>${l.seller}</b><span>on the ${l.name}</span></div>
  </div>`;
}

function renderProofGrid(){
  document.getElementById('proof-grid').innerHTML = proofOnly.map((l,i)=>{
    return `<div class="card" onclick="showDetail('${l.id}')">
      <div class="card-img" style="background:${grad(i)}">
        <span class="bib-tag">PROOF RUN</span>
        <div class="play" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;color:var(--navy);">▶</div>
      </div>
      <div class="card-body">
        <div class="cat">${l.cat}</div>
        <h3>${l.seller}'s Proof Run</h3>
        <div class="meta">On the ${l.name}</div>
        <div class="card-foot"><span class="price">$${l.price}</span>${fitChipHtml(l)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderHomeProof(){
  document.getElementById('home-proof-strip').innerHTML = proofOnly.slice(0,5).map((l,i)=>renderProofCard(l,i)).join('');
}

function scoreBarClass(v){ return v < 75 ? 'yellow' : ''; }

async function showDetail(id){
  const l = listings.find(x=>String(x.id)===String(id));
  const i = listings.indexOf(l);
  const fit = fitFor(l);

  const proofBlock = l.proof
    ? `<div class="proof-card" id="detail-proof-card" style="margin-top:16px;">
        <div class="proof-video" style="height:140px; background:${grad(i+1)}" id="detail-proof-video">
          <span class="badge">PROOF RUN</span>
          <div class="play">▶</div>
        </div>
        <div class="proof-caption"><b>${l.seller}</b><span>racing on this exact ${l.cat.toLowerCase().slice(0,-1)}</span></div>
      </div>`
    : `<div class="score-note" style="margin-top:16px;">No Proof Run uploaded yet for this listing.</div>`;

  const fitCardBlock = fit.score == null
    ? `<div class="score-card" style="padding:20px;">
        <div class="top"><b>Fit Confidence</b><span>No profile yet</span></div>
        <div class="score-note">${fit.note} <button class="btn btn-dark" style="margin-top:10px; padding:9px 16px; font-size:13px;" onclick="openProfileModal()">Set Up Racer Profile</button></div>
      </div>`
    : `<div class="score-card" style="padding:20px;">
        <div class="top"><b>Fit Confidence Breakdown</b><span>Live, from your racer profile</span></div>
        <div class="score-bars">
          ${fit.breakdown.map(b=>`<div class="score-bar-row"><span class="label">${b[0]}</span><div class="score-bar-track"><div class="score-bar-fill ${scoreBarClass(b[1])}" style="width:${b[1]}%"></div></div><span class="pct">${b[1]}%</span></div>`).join('')}
        </div>
        <div class="score-note">${fit.note}</div>
      </div>`;

  document.getElementById('detail-content').innerHTML = `
    <div>
      <div class="detail-media" style="background:${grad(i)}">
        <span class="bib-tag">BIB ${l.bib}</span>${l.name}
      </div>
      ${proofBlock}
    </div>
    <div class="detail-info">
      <div class="cat">${l.cat}</div>
      <h1>${l.name}</h1>
      <div class="price-row"><span class="price">$${l.price}</span>${fit.score != null ? `<span class="fit-chip">${fit.score.toFixed(0)} Fit Confidence</span>` : ''}</div>
      <div class="seller-row">
        <div class="seller-avatar">${l.seller.split(' ').map(w=>w[0]).join('')}</div>
        <div>Sold by <b>${l.seller}</b>${l.location ? ' · ' + l.location : ''}</div>
      </div>
      <ul class="spec-list">
        ${l.specs.map(s=>`<li><span>${s[0]}</span><span>${s[1]}</span></li>`).join('')}
      </ul>
      ${fitCardBlock}
      <div class="detail-actions">
        <button class="btn btn-primary" onclick="alert('Prototype — checkout flow isn\\'t wired up yet. That\\'s the Stripe integration step.')">Buy Now — $${l.price}</button>
        <button class="btn btn-ghost" style="color:var(--navy); border-color:var(--frost);" onclick="alert('Prototype — messaging isn\\'t wired up yet.')">Message Seller</button>
      </div>
    </div>
  `;

  // Real, hosted Proof Run videos (once backend is configured) play for real here.
  if (l.proof && Backend.isConfigured) {
    const clips = await Backend.getProofRunsForListing(l.id);
    if (clips.length) {
      const videoEl = document.getElementById('detail-proof-video');
      if (videoEl) {
        videoEl.outerHTML = `<video id="detail-proof-video" src="${clips[0].video_url}" controls style="width:100%; height:220px; background:#000; border-radius:0;"></video>`;
      }
    }
  }

  switchView('detail');
}

/* ---------------- Sell form ---------------- */
function onProofRunFileSelected(input){
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) { alert('Please choose a video file for the Proof Run.'); return; }

  pendingProofFile = file;
  const preview = document.getElementById('sell-proof-preview');
  const localUrl = URL.createObjectURL(file);
  preview.innerHTML = `<video src="${localUrl}" controls style="width:100%; max-height:220px; border-radius:8px; margin-top:12px;"></video><p style="font-size:12px; color:var(--frost-dark); margin-top:6px;">Attached — will upload when you submit the listing.</p>`;
}

async function handleListingSubmit(event){
  event.preventDefault();

  if (!Backend.isConfigured) {
    alert('This is a prototype — connect the backend (see README) to make listings real. Once it is, this form actually publishes.');
    return;
  }
  if (!currentUser) {
    alert('Sign in first so the listing can be attached to your account.');
    openAuthModal();
    return;
  }

  const f = event.target;
  const sellingAs = f.querySelector('#sell-selling-as').value;
  const category = f.querySelector('#sell-category').value;
  const discipline = f.querySelector('#sell-discipline').value;
  const brand = f.querySelector('#sell-brand').value;
  const modelSize = f.querySelector('#sell-model-size').value;
  const condition = f.querySelector('#sell-condition').value;
  const racesUsed = parseInt(f.querySelector('#sell-races-used').value, 10) || 0;
  const price = parseFloat(f.querySelector('#sell-price').value) || 0;

  const listing = {
    seller_name: currentUser.email.split('@')[0],
    category,
    name: `${brand} ${modelSize}`.trim(),
    meta: `${discipline} · ${condition}`,
    price,
    location: '',
    specs: [
      ['Discipline', discipline],
      ['Condition', condition],
      ['Races Used', String(racesUsed)],
      ['Selling As', sellingAs],
    ],
    raw: { category, discipline, racesUsed },
  };

  try {
    const created = await Backend.createListing(currentUser.id, listing);
    if (pendingProofFile) {
      await Backend.uploadProofRun(currentUser.id, created.id, pendingProofFile);
      pendingProofFile = null;
    }
    await loadListings();
    rerenderAll();
    alert('Listing published.');
    f.reset();
    document.getElementById('sell-proof-preview').innerHTML = '';
    switchView('browse');
  } catch (err) {
    alert('Could not publish listing: ' + err.message);
  }
}

/* ---------------- View switching ---------------- */
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.navbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.view===name);
  });
  window.scrollTo({top:0, behavior:'instant'});
}

document.querySelectorAll('[data-view]').forEach(el=>{
  el.addEventListener('click', (e)=>{
    e.preventDefault();
    switchView(el.dataset.view);
  });
});

document.querySelectorAll('.filter-bar button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.filter-bar button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderBrowse(btn.dataset.filter);
  });
});

/* ---------------- Init ---------------- */
init();
