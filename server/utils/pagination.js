// Shared by every list route so pagination behaves identically across the app.
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = { parsePagination, buildPaginationMeta };
