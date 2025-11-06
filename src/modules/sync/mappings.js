// Field mappers between SQLite (payflow) and PostgreSQL (remote)

const enumMaps = {
  SyncStatus: {
    toRemote: (v) => (v === 'SYNCED' ? 'COMPLETED' : v),
    toLocal: (v) => (v === 'CONFLICT' ? 'PENDING' : v),
  },
};

function mapImageLocalToRemote(images) {
  // local: String? (single) OR future: JSON; remote: String[]
  if (!images) return [];
  if (Array.isArray(images)) return images;
  // split common delimiters
  return String(images).split('|').map((s) => s.trim()).filter(Boolean);
}

function mapImageRemoteToLocal(arr) {
  if (!arr || !Array.isArray(arr)) return null;
  // keep primary image only locally; adjust if you want join("|")
  return arr[0] || null;
}

const modelFieldMappers = {
  Product: {
    toRemote: (row) => ({
      ...row,
      imageUrl: mapImageLocalToRemote(row.imageUrl),
    }),
    toLocal: (row) => ({
      ...row,
      imageUrl: mapImageRemoteToLocal(row.imageUrl),
    }),
  },
  Category: {
    toRemote: (row) => ({
      ...row,
      imageUrl: mapImageLocalToRemote(row.imageUrl),
    }),
    toLocal: (row) => ({
      ...row,
      imageUrl: mapImageRemoteToLocal(row.imageUrl),
    }),
  },
  Brand: {
    toRemote: (row) => ({
      ...row,
      logoUrl: row.logoUrl, // Already a string
    }),
    toLocal: (row) => ({
      ...row,
      logoUrl: row.logoUrl, // Already a string
    }),
  },
  Terminal: {
    toRemote: (row) => row,
    toLocal: (row) => {
      // SQLite Terminal schema doesn't have these PostgreSQL-only fields
      const { locationId, syncStatus, registeredBy, ...rest } = row;
      return rest;
    },
  },
};

function applyEnumMap(direction, obj) {
  const out = { ...obj };
  for (const [name, mapper] of Object.entries(enumMaps)) {
    const fn = direction === 'toRemote' ? mapper.toRemote : mapper.toLocal;
    for (const key of Object.keys(out)) {
      if (key.toLowerCase().includes(name.toLowerCase()) && out[key] != null) {
        out[key] = fn(out[key]);
      }
    }
  }
  return out;
}

function toRemote(model, row) {
  const mapper = modelFieldMappers[model]?.toRemote;
  const mapped = mapper ? mapper(row) : row;
  return applyEnumMap('toRemote', mapped);
}

function toLocal(model, row) {
  const mapper = modelFieldMappers[model]?.toLocal;
  const mapped = mapper ? mapper(row) : row;
  return applyEnumMap('toLocal', mapped);
}

module.exports = { toRemote, toLocal };


