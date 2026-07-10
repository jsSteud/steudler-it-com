function isValidScore(score) {
  return score === null ||
    (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100);
}

function isValidRating({ competitorId, refereeId, score }, numCompetitors, validRefs) {
  return (
    Number.isInteger(competitorId) &&
    competitorId >= 1 &&
    competitorId <= numCompetitors &&
    validRefs.includes(refereeId) &&
    isValidScore(score)
  );
}

module.exports = { isValidScore, isValidRating };
