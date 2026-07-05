/*
  LockerRoom Fit Confidence Engine
  --------------------------------
  This is a real, working scoring function — not hardcoded demo numbers.
  It compares a racer's saved profile against a listing's specs and
  returns a 0-100 score plus a category breakdown and a plain-language note.

  It's rule-based (transparent, explainable) rather than a black-box ML
  model. That's a deliberate choice: buyers see exactly why a score is
  what it is, which is the trust story LockerRoom is built on. If you
  later want to train a real model, this function's inputs/outputs are
  the contract to preserve — swap the internals, keep the shape.
*/

const FitConfidence = (() => {

  // How far off is "acceptable" before a sub-score starts dropping, per field.
  // Tune these as you get real buyer feedback (see the post-sale feedback loop idea).
  const TOLERANCE = {
    bootLastWidthMm: 3,   // mm difference before boot volume score suffers
    flexPoints: 12,       // flex rating points (e.g. 130 vs 118)
    chestCm: 4,           // suit chest measurement
    waistCm: 4,           // suit waist measurement
    lengthCm: 6,          // ski length
  };

  function clamp(n, min = 0, max = 100) {
    return Math.max(min, Math.min(max, n));
  }

  // Generic "how close are these two numbers" scorer.
  // diff of 0 = 100. diff of `tolerance` = ~55. Scales down smoothly past that.
  function proximityScore(actual, target, tolerance) {
    if (actual == null || target == null) return null;
    const diff = Math.abs(actual - target);
    return clamp(Math.round(100 - (diff / tolerance) * 45));
  }

  function disciplineScore(profileDiscipline, listingDiscipline) {
    if (!profileDiscipline || !listingDiscipline) return null;
    return profileDiscipline === listingDiscipline ? 100 : 62;
  }

  // Wear/freshness score from races-used, not vague "condition" labels.
  // 0 races = 100. Score decays roughly 1.1 points per race, floors at 45.
  function freshnessScore(racesUsed) {
    if (racesUsed == null) return null;
    return clamp(Math.round(100 - racesUsed * 1.1), 45, 100);
  }

  /**
   * computeFitConfidence
   * @param {Object} profile - the buyer's saved racer profile
   * @param {Object} listing - the listing's specs
   * @returns {{score: number, breakdown: Array<[string,number]>, note: string}}
   */
  function computeFitConfidence(profile, listing) {
    const breakdown = [];

    if (listing.category === 'Boots') {
      const volume = proximityScore(profile.bootLastWidthMm, listing.lastWidthMm, TOLERANCE.bootLastWidthMm);
      const flex = proximityScore(profile.desiredFlex, listing.flex, TOLERANCE.flexPoints);
      if (volume != null) breakdown.push(['Boot volume', volume]);
      if (flex != null) breakdown.push(['Flex match', flex]);
    } else if (listing.category === 'Skis') {
      const length = proximityScore(profile.preferredLengthCm, listing.lengthCm, TOLERANCE.lengthCm);
      const discipline = disciplineScore(profile.discipline, listing.discipline);
      if (length != null) breakdown.push(['Length match', length]);
      if (discipline != null) breakdown.push(['Discipline match', discipline]);
    } else if (listing.category === 'Race Suit') {
      const chest = proximityScore(profile.chestCm, listing.chestCm, TOLERANCE.chestCm);
      const waist = proximityScore(profile.waistCm, listing.waistCm, TOLERANCE.waistCm);
      if (chest != null) breakdown.push(['Chest fit', chest]);
      if (waist != null) breakdown.push(['Waist fit', waist]);
    } else {
      // Poles, protection, anything else: discipline + freshness only.
      const discipline = disciplineScore(profile.discipline, listing.discipline);
      if (discipline != null) breakdown.push(['Discipline match', discipline]);
    }

    const freshness = freshnessScore(listing.racesUsed);
    if (freshness != null) breakdown.push(['Gear freshness', freshness]);

    // If the buyer hasn't filled out enough of their profile to score against,
    // say so honestly instead of faking a number.
    if (breakdown.length === 0) {
      return {
        score: null,
        breakdown: [],
        note: 'Complete your racer profile to see a Fit Confidence score for this listing.',
      };
    }

    const overall = Math.round(breakdown.reduce((sum, [, v]) => sum + v, 0) / breakdown.length);
    const note = buildNote(overall, breakdown, listing);

    return { score: overall, breakdown, note };
  }

  function buildNote(overall, breakdown, listing) {
    const weakest = breakdown.reduce((a, b) => (b[1] < a[1] ? b : a));
    if (overall >= 90) {
      return `Strong match across the board. ${weakest[0]} is the only area with any daylight, and it's still solid.`;
    }
    if (overall >= 75) {
      return `Good overall match. Keep an eye on ${weakest[0].toLowerCase()} — it's the biggest gap between your profile and this listing.`;
    }
    if (overall >= 55) {
      return `Workable, but ${weakest[0].toLowerCase()} is a real mismatch. Message the seller with questions before buying.`;
    }
    return `This listing doesn't line up well with your profile, mainly on ${weakest[0].toLowerCase()}. Consider it a maybe, not a match.`;
  }

  return { computeFitConfidence };
})();
