/**
 * Catálogo de marcas y modelos para selects de transporte (referencia ~2025–2026).
 * No pretende ser un inventario VIN exhaustivo; cubre marcas y líneas habituales en MX/LATAM
 * y modelos frecuentes en mercados NA/EU. Incluye «Otra marca / Otro modelo» en la UI.
 *
 * Referencias consultadas: listados agregados tipo «2026 new cars» (p. ej. carfactsheet.com/2026),
 * líneas públicas de fabricantes y prensa especializada 2025–2026.
 */

/** Valor interno del <select> cuando el usuario escribe marca/modelo a mano. */
export const CAR_BRAND_CUSTOM = '__custom__';
export const CAR_MODEL_CUSTOM = '__custom__';

const uniqSortEs = (arr) =>
  [...new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );

/** @type {Record<string, string[]>} */
export const CAR_BRAND_MODEL_MAP = {
  Acura: uniqSortEs([
    'ADX', 'Integra', 'MDX', 'RDX', 'TLX', 'ZDX',
  ]),
  'Aston Martin': uniqSortEs(['DB12', 'DBX', 'Vantage', 'Valhalla']),
  'Alfa Romeo': uniqSortEs(['Giulia', 'Stelvio', 'Tonale']),
  Bentley: uniqSortEs(['Bentayga', 'Continental GT', 'Flying Spur', 'Batur']),
  Audi: uniqSortEs([
    'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'e-tron', 'e-tron GT', 'Q3', 'Q4 e-tron', 'Q5', 'Q5 Sportback',
    'Q7', 'Q8', 'RS 3', 'RS 5', 'RS 6', 'RS 7', 'RS e-tron GT', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
    'SQ5', 'SQ7', 'SQ8',
  ]),
  BMW: uniqSortEs([
    '2 Series', '2 Series Gran Coupe', '3 Series', '4 Series', '4 Series Gran Coupe', '5 Series', '7 Series',
    '8 Series', '8 Series Gran Coupe', 'i4', 'i5', 'i7', 'iX', 'M2', 'M3', 'M4', 'M5', 'M8', 'X1', 'X2', 'X3',
    'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'ALPINA XB7',
  ]),
  Buick: uniqSortEs(['Enclave', 'Encore GX', 'Envision', 'Envista']),
  BYD: uniqSortEs(['Atto 3', 'Dolphin', 'Han', 'Seal', 'Sealion 7', 'Tang', 'Yuan Plus']),
  Cadillac: uniqSortEs([
    'CT4', 'CT5', 'Celestiq', 'Escalade', 'Escalade ESV', 'Escalade IQ', 'Escalade V', 'LYRIQ', 'OPTIQ',
    'VISTIQ', 'XT4', 'XT5', 'XT6',
  ]),
  Chery: uniqSortEs(['Omoda 5', 'Tiggo 2', 'Tiggo 4', 'Tiggo 5', 'Tiggo 7', 'Tiggo 8', 'Tiggo 8 Pro']),
  Chevrolet: uniqSortEs([
    'Blazer', 'Blazer EV', 'Camaro', 'Colorado', 'Corvette', 'Equinox', 'Equinox EV', 'Malibu', 'Montana',
    'Onix', 'S10 Max', 'Silverado 1500', 'Silverado 2500HD', 'Silverado 3500HD', 'Silverado EV', 'Spark',
    'Suburban', 'Tahoe', 'Tracker', 'Trailblazer', 'Traverse', 'Trax',
  ]),
  Chrysler: uniqSortEs(['Pacifica', 'Voyager']),
  Citroën: uniqSortEs(['Basalt', 'Berlingo', 'C3', 'C3 Aircross', 'C4', 'C5 Aircross', 'Jumpy']),
  Cupra: uniqSortEs(['Ateca', 'Formentor', 'Leon', 'Tavascan', 'Terramar']),
  Dodge: uniqSortEs(['Durango', 'Hornet']),
  Ferrari: uniqSortEs(['296', '12Cilindri', 'Purosangue', 'Roma', 'SF90']),
  Fiat: uniqSortEs(['500', '500e', 'Argo', 'Cronos', 'Fastback', 'Mobi', 'Pulse', 'Toro', 'Uno']),
  Ford: uniqSortEs([
    'Bronco', 'Bronco Sport', 'Escape', 'Expedition', 'Explorer', 'F-150', 'F-150 Lightning', 'Maverick',
    'Mustang', 'Mustang Mach-E', 'Ranger', 'Territory', 'Transit', 'Transit Connect',
  ]),
  Genesis: uniqSortEs([
    'Electrified G80', 'Electrified GV70', 'G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80', 'GV80 Coupe',
  ]),
  GMC: uniqSortEs([
    'Acadia', 'Canyon', 'Hummer EV Pickup', 'Hummer EV SUV', 'Sierra 1500', 'Sierra 2500HD', 'Sierra 3500HD',
    'Sierra EV', 'Terrain', 'Yukon', 'Yukon XL',
  ]),
  'Great Wall': uniqSortEs(['Cannon', 'Poer', 'Wingle 7']),
  Haval: uniqSortEs(['H2', 'H6', 'H6 GT', 'H6 Hybrid', 'Jolion', 'Jolion Hybrid']),
  Honda: uniqSortEs([
    'Accord', 'BR-V', 'City', 'Civic', 'CR-V', 'CR-V Hybrid', 'HR-V', 'Odyssey', 'Passport', 'Pilot',
    'Prologue', 'Ridgeline', 'WR-V', 'ZR-V',
  ]),
  Hyundai: uniqSortEs([
    'Creta', 'Elantra', 'Elantra Hybrid', 'Elantra N', 'Grand i10', 'IONIQ 5', 'IONIQ 6', 'IONIQ 9', 'Kona',
    'Palisade', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Tucson', 'Tucson Hybrid', 'Tucson Plug-In Hybrid', 'Venue',
  ]),
  INEOS: uniqSortEs(['Grenadier', 'Grenadier Quartermaster']),
  Infiniti: uniqSortEs(['QX50', 'QX55', 'QX60', 'QX80', 'Q50']),
  Isuzu: uniqSortEs(['D-Max', 'MU-X']),
  JAC: uniqSortEs(['E10X', 'JS2', 'JS3', 'JS4', 'JS6', 'JS8', 'Sei 4 Pro', 'T8']),
  Jaguar: uniqSortEs(['E-PACE', 'F-PACE', 'F-Type', 'I-PACE']),
  Jeep: uniqSortEs([
    'Avenger', 'Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Grand Cherokee 4xe', 'Grand Cherokee L',
    'Grand Wagoneer', 'Grand Wagoneer L', 'Renegade', 'Wagoneer', 'Wagoneer S', 'Wrangler', 'Wrangler 4xe',
  ]),
  Jetour: uniqSortEs(['Dashing', 'T2', 'X70', 'X70 PLUS', 'X90 PLUS']),
  Kia: uniqSortEs([
    'Carens', 'Carnival', 'EV6', 'EV9', 'Forte', 'K3', 'K4', 'K5', 'Niro', 'Niro EV', 'Picanto', 'Rio',
    'Seltos', 'Sorento', 'Sorento Hybrid', 'Sorento Plug-In Hybrid', 'Soul', 'Sportage', 'Sportage Hybrid',
    'Sportage Plug-In Hybrid', 'Telluride',
  ]),
  Lamborghini: uniqSortEs(['Huracán', 'Revuelto', 'Urus', 'Urus SE']),
  'Land Rover': uniqSortEs([
    'Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport',
    'Range Rover Velar',
  ]),
  Lexus: uniqSortEs([
    'ES', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'TX', 'UX',
  ]),
  Lincoln: uniqSortEs(['Aviator', 'Corsair', 'Nautilus', 'Navigator']),
  Lucid: uniqSortEs(['Air', 'Gravity']),
  Mazda: uniqSortEs(['CX-30', 'CX-3', 'CX-5', 'CX-50', 'CX-70', 'CX-90', 'Mazda2', 'Mazda3', 'MX-5 Miata']),
  Maserati: uniqSortEs(['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte']),
  McLaren: uniqSortEs(['750S', 'Artura', 'GTS']),
  'Mercedes-Benz': uniqSortEs([
    'A-Class', 'AMG GT', 'C-Class', 'CLA', 'CLE', 'E-Class', 'EQB', 'EQE', 'EQE SUV', 'EQS', 'EQS SUV',
    'G-Class', 'GLA', 'GLB', 'GLC', 'GLC Coupe', 'GLE', 'GLE Coupe', 'GLS', 'Maybach S-Class', 'S-Class', 'SL',
  ]),
  MG: uniqSortEs(['MG3', 'MG4', 'MG5', 'MG7', 'HS', 'RX5', 'ZS', 'ZS EV']),
  MINI: uniqSortEs(['Cooper', 'Cooper Clubman', 'Cooper Convertible', 'Cooper Countryman', 'Cooper Electric']),
  Mitsubishi: uniqSortEs(['Eclipse Cross', 'Mirage', 'Outlander', 'Outlander PHEV', 'Outlander Sport', 'Xpander']),
  Nissan: uniqSortEs([
    'Altima', 'Armada', 'Frontier', 'Kicks', 'Leaf', 'March', 'Murano', 'NP300', 'Pathfinder', 'Rogue',
    'Sentra', 'Titan', 'Versa', 'X-Trail', 'Z',
  ]),
  Peugeot: uniqSortEs(['2008', '208', '3008', '408', '5008', 'Landtrek', 'Partner', 'Rifter']),
  Polestar: uniqSortEs(['2', '3', '4']),
  Porsche: uniqSortEs([
    '718 Boxster', '718 Cayman', '911', 'Cayenne', 'Cayenne Electric', 'Macan', 'Macan Electric', 'Panamera',
    'Taycan',
  ]),
  RAM: uniqSortEs(['1500', '2500', '3500', 'ProMaster']),
  Renault: uniqSortEs(['Arkana', 'Duster', 'Kardian', 'Koleos', 'Kwid', 'Oroch', 'Stepway']),
  'Rolls-Royce': uniqSortEs(['Cullinan', 'Ghost', 'Phantom', 'Spectre']),
  Rivian: uniqSortEs(['R1S', 'R1T', 'R2', 'R3']),
  SEAT: uniqSortEs(['Arona', 'Ateca', 'Ibiza', 'Leon', 'Tarraco']),
  Škoda: uniqSortEs(['Enyaq', 'Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Scala', 'Superb']),
  Subaru: uniqSortEs([
    'Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX',
  ]),
  Suzuki: uniqSortEs(['Baleno', 'Ciaz', 'Dzire', 'Ertiga', 'Frónx', 'Grand Vitara', 'Ignis', 'Jimny', 'Swift', 'Vitara']),
  Tesla: uniqSortEs(['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y']),
  Toyota: uniqSortEs([
    '4Runner', 'Avanza', 'bZ', 'bZ4X', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'Corolla Cross Hybrid',
    'Corolla Hybrid', 'Crown', 'Crown Signia', 'Fortuner', 'GR86', 'GR Corolla', 'Grand Highlander',
    'Grand Highlander Hybrid', 'Hiace', 'Highlander', 'Highlander Hybrid', 'Land Cruiser', 'Land Cruiser Prado',
    'Prius', 'Prius Prime', 'RAV4', 'RAV4 Hybrid', 'RAV4 Prime', 'Raize', 'Rush', 'Sequoia', 'Sienna', 'Supra',
    'Tacoma', 'Tundra', 'Venza', 'Yaris', 'Yaris Cross',
  ]),
  Volkswagen: uniqSortEs([
    'Amarok', 'Atlas', 'Atlas Cross Sport', 'Golf GTI', 'Golf R', 'ID. Buzz', 'ID.4', 'ID.7', 'Jetta', 'Jetta GLI',
    'Nivus', 'Polo', 'Saveiro', 'Taos', 'T-Cross', 'Teramont', 'Tiguan', 'Virtus',
  ]),
  Volvo: uniqSortEs([
    'C40 Recharge', 'EX30', 'EX40', 'EX60', 'EX90', 'S60', 'S90', 'V60', 'V90 Cross Country', 'XC40', 'XC60',
    'XC90',
  ]),
};

/** Catálogo vacío persistido en `app_data/config.customCarCatalog`. */
export const EMPTY_CUSTOM_CAR_CATALOG = Object.freeze({ brands: {} });

const sortEs = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });

/** Clave canónica en un mapa de marcas (insensible a mayúsculas/acentos). */
export function findCarCatalogBrandKey(map, name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const lower = n.toLocaleLowerCase('es');
  for (const k of Object.keys(map || {})) {
    if (String(k).toLocaleLowerCase('es') === lower) return k;
  }
  return null;
}

/** Normaliza el fragmento `customCarCatalog` guardado en Firestore. */
export function normalizeCustomCarCatalog(raw) {
  const brands = {};
  const src = raw?.brands && typeof raw.brands === 'object' ? raw.brands : {};
  for (const [k, v] of Object.entries(src)) {
    const brand = String(k || '').trim();
    if (!brand) continue;
    brands[brand] = uniqSortEs(Array.isArray(v) ? v : []);
  }
  return { brands };
}

/** Fusiona catálogo estático con entradas personalizadas (para selects). */
export function mergeCarBrandModelMaps(staticMap, customCatalog) {
  const custom = normalizeCustomCarCatalog(customCatalog);
  const merged = { ...(staticMap || {}) };
  for (const [brand, models] of Object.entries(custom.brands)) {
    const canonBrand = findCarCatalogBrandKey(merged, brand) || brand;
    const existing = Array.isArray(merged[canonBrand]) ? merged[canonBrand] : [];
    merged[canonBrand] = uniqSortEs([...existing, ...(models || [])]);
  }
  return merged;
}

function modelInList(list, model) {
  const m = String(model || '').trim();
  if (!m || !Array.isArray(list)) return false;
  return list.some((item) => String(item).localeCompare(m, 'es', { sensitivity: 'base' }) === 0);
}

/** Helpers de lectura con catálogo estático + personalizado opcional. */
export function createCarCatalogView(customCatalog) {
  const merged = mergeCarBrandModelMaps(CAR_BRAND_MODEL_MAP, customCatalog);
  return {
    mergedMap: merged,
    getSortedCarBrands() {
      return Object.keys(merged).sort(sortEs);
    },
    getCarModelsForBrand(brand) {
      const canon = findCarCatalogBrandKey(merged, brand) || String(brand || '').trim();
      const raw = merged[canon];
      return Array.isArray(raw) ? [...raw] : [];
    },
    isKnownCarBrand(brand) {
      const b = String(brand || '').trim();
      return Boolean(b && findCarCatalogBrandKey(merged, b));
    },
    isKnownCarModel(brand, model) {
      const models = this.getCarModelsForBrand(brand);
      return modelInList(models, model);
    },
  };
}

const defaultCatalogView = createCarCatalogView(EMPTY_CUSTOM_CAR_CATALOG);

export function getSortedCarBrands(customCatalog) {
  if (customCatalog == null) return defaultCatalogView.getSortedCarBrands();
  return createCarCatalogView(customCatalog).getSortedCarBrands();
}

export function getCarModelsForBrand(brand, customCatalog) {
  if (customCatalog == null) return defaultCatalogView.getCarModelsForBrand(brand);
  return createCarCatalogView(customCatalog).getCarModelsForBrand(brand);
}

export function isKnownCarBrand(brand, customCatalog) {
  if (customCatalog == null) return defaultCatalogView.isKnownCarBrand(brand);
  return createCarCatalogView(customCatalog).isKnownCarBrand(brand);
}

export function isKnownCarModel(brand, model, customCatalog) {
  if (customCatalog == null) return defaultCatalogView.isKnownCarModel(brand, model);
  return createCarCatalogView(customCatalog).isKnownCarModel(brand, model);
}

/** Extrae pares marca/modelo de `carMetaBySource` en un plan de transporte. */
export function collectCarMetaCatalogEntries(carMetaBySource) {
  const entries = [];
  for (const meta of Object.values(carMetaBySource || {})) {
    if (!meta || typeof meta !== 'object') continue;
    const brand = String(meta.brand || '').trim();
    const model = String(meta.model || '').trim();
    if (brand) entries.push({ brand, model });
  }
  return entries;
}

/** Incorpora entradas nuevas al catálogo personalizado (dedupe insensible a mayúsculas). */
export function upsertCustomCarCatalog(existing, entries) {
  const catalog = normalizeCustomCarCatalog(existing);
  const brands = { ...catalog.brands };

  for (const { brand, model } of entries || []) {
    const b = String(brand || '').trim();
    const m = String(model || '').trim();
    if (!b) continue;

    const staticCanon = findCarCatalogBrandKey(CAR_BRAND_MODEL_MAP, b);
    const customCanon = findCarCatalogBrandKey(brands, b);
    const storeBrand = staticCanon || customCanon || b;

    if (!staticCanon) {
      const prevModels = brands[storeBrand] || [];
      brands[storeBrand] = m ? uniqSortEs([...prevModels, m]) : prevModels;
      continue;
    }

    if (!m) continue;
    const staticModels = CAR_BRAND_MODEL_MAP[staticCanon] || [];
    if (modelInList(staticModels, m)) continue;

    const prevModels = brands[storeBrand] || [];
    if (modelInList(prevModels, m)) continue;
    brands[storeBrand] = uniqSortEs([...prevModels, m]);
  }

  return normalizeCustomCarCatalog({ brands });
}

export function customCarCatalogsEqual(a, b) {
  return JSON.stringify(normalizeCustomCarCatalog(a)) === JSON.stringify(normalizeCustomCarCatalog(b));
}
