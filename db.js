/* ==========================================================================
   EXTRACTED BEANS - INDEXEDDB DATABASE LAYER
   High-performance browser-native persistence for coffee extraction profiles
   ========================================================================== */

const DB_NAME = 'ExtractedBeansDB';
const DB_VERSION = 1;
const STORE_NAME = 'extractions';

// Default Seed Data: 6 Curated Specialty Coffee Extractions
export const DEFAULT_EXTRACTIONS = [
  {
    roast: 'silver',
    brandName: 'Onyx Coffee Lab',
    roastEdition: 'Monarch Studio Chrome Edition',
    originRegion: 'Tolima & Huila, Colombia',
    imageSrc: 'assets/brands/onyx.svg',
    grindSize: 'Medium-Fine (580 µm)',
    grindDetail: '24 Clicks · Precision Conical',
    grindAmount: '18.0 g',
    doseDetail: 'Dry Ground Dose (18g in)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Liquid Espresso Yield (1:2.0)',
    brewTime: '27s',
    brewTemp: '93.5°C',
    ratio: '1:2.0',
    tds: '1.38%',
    notes: ['Dark Chocolate', 'Caramelized Sugar', 'Black Cherry'],
    timestamp: Date.now() - 500000
  },
  {
    roast: 'platinum',
    brandName: 'Sey Coffee',
    roastEdition: 'El Paraiso Platinum Reserve',
    originRegion: 'Cauca, Colombia · Thermal Shock',
    imageSrc: 'assets/brands/sey.svg',
    grindSize: 'Fine-Medium (520 µm)',
    grindDetail: '21 Clicks · Micro Burr',
    grindAmount: '19.5 g',
    doseDetail: 'High-Density Light Roast Dose',
    extractedWeight: '42.0 g',
    yieldDetail: 'High-Extraction Yield (1:2.15)',
    brewTime: '30s',
    brewTemp: '94.0°C',
    ratio: '1:2.15',
    tds: '1.42%',
    notes: ['Red Currant', 'Bergamot', 'Jasmine Florals'],
    timestamp: Date.now() - 400000
  },
  {
    roast: 'titanium',
    brandName: 'Square Mile Coffee',
    roastEdition: 'Red Brick Titanium Series',
    originRegion: 'East Africa & Central America',
    imageSrc: 'assets/brands/squaremile.svg',
    grindSize: 'Medium (620 µm)',
    grindDetail: '26 Clicks · Flat Steel',
    grindAmount: '18.5 g',
    doseDetail: 'Classic Balanced Dose (18.5g in)',
    extractedWeight: '37.0 g',
    yieldDetail: 'Viscous Crema Yield (1:2.0)',
    brewTime: '28s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    tds: '1.35%',
    notes: ['Toffee Crisp', 'Milk Chocolate', 'Red Apple'],
    timestamp: Date.now() - 300000
  },
  {
    roast: 'gold',
    brandName: 'Hacienda La Esmeralda',
    roastEdition: 'Geisha 24K Reserve Special',
    originRegion: 'Boquete, Panama · 1,800m',
    imageSrc: 'assets/brands/esmeralda.svg',
    grindSize: 'Fine-Filter (480 µm)',
    grindDetail: '18 Clicks · Titanium Burrs',
    grindAmount: '20.0 g',
    doseDetail: 'Rare Varietal Geisha Dose',
    extractedWeight: '45.0 g',
    yieldDetail: 'High Clarity Nectar (1:2.25)',
    brewTime: '32s',
    brewTemp: '95.0°C',
    ratio: '1:2.25',
    tds: '1.45%',
    notes: ['White Peach', 'Orange Blossom', 'Raw Honey'],
    timestamp: Date.now() - 200000
  },
  {
    roast: 'silver',
    brandName: 'Blue Bottle Coffee',
    roastEdition: 'Bella Donovan Chrome Edition',
    originRegion: 'Ethiopia & Sumatra Blend',
    imageSrc: 'assets/brands/bluebottle.svg',
    grindSize: 'Medium-Coarse (650 µm)',
    grindDetail: '27 Clicks · Conical Burr',
    grindAmount: '19.0 g',
    doseDetail: 'Mellow Rich Dose (19g in)',
    extractedWeight: '38.0 g',
    yieldDetail: 'Velvety Crema Yield (1:2.0)',
    brewTime: '29s',
    brewTemp: '92.5°C',
    ratio: '1:2.0',
    tds: '1.34%',
    notes: ['Raspberry', 'Dark Chocolate', 'Molasses'],
    timestamp: Date.now() - 100000
  },
  {
    roast: 'platinum',
    brandName: 'Tim Wendelboe',
    roastEdition: 'Caballero Geisha Washed',
    originRegion: 'Marcala, Honduras · 1,600m',
    imageSrc: 'assets/brands/timwendelboe.svg',
    grindSize: 'Fine-Medium (510 µm)',
    grindDetail: '20 Clicks · Nordic Precision',
    grindAmount: '18.2 g',
    doseDetail: 'Ultra-Dense High Altitude',
    extractedWeight: '40.0 g',
    yieldDetail: 'Crisp Phosphoric Yield (1:2.2)',
    brewTime: '31s',
    brewTemp: '94.5°C',
    ratio: '1:2.2',
    tds: '1.40%',
    notes: ['Floral Jasmine', 'Apricot', 'Meyer Lemon'],
    timestamp: Date.now()
  }
];

let dbInstance = null;

/**
 * Open or initialize IndexedDB instance
 */
export function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('roast', 'roast', { unique: false });
        store.createIndex('brandName', 'brandName', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      // Ensure seed data is present if newly opened database is empty
      checkAndSeedDatabase(dbInstance).then(() => {
        resolve(dbInstance);
      }).catch(reject);
    };

    request.onerror = (event) => {
      console.error('IndexedDB opening error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Seed database with default extractions if empty
 */
async function checkAndSeedDatabase(db) {
  const count = await getExtractionCount(db);
  if (count === 0) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    DEFAULT_EXTRACTIONS.forEach(item => store.add({ ...item }));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * Get count of total records in database
 */
export function getExtractionCount(db = dbInstance) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => reject(countReq.error);
  });
}

/**
 * Retrieve all extraction records, optionally filtered by roast profile
 */
export async function getAllExtractions(filterRoast = 'all') {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result || [];
      // Sort newest first
      results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (filterRoast && filterRoast !== 'all') {
        results = results.filter(item => item.roast === filterRoast);
      }
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a new extraction record to IndexedDB
 */
export async function addExtractionRecord(record) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const fullRecord = {
      ...record,
      timestamp: record.timestamp || Date.now(),
      imageSrc: record.imageSrc || getBrandFallbackSvg(record.roast)
    };

    const request = store.add(fullRecord);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an extraction record by ID
 */
export async function deleteExtractionRecord(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(Number(id));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Reset database to default curated records
 */
export async function resetDatabaseToDefaults() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const clearReq = store.clear();

    clearReq.onsuccess = () => {
      DEFAULT_EXTRACTIONS.forEach(item => store.add({ ...item }));
      tx.oncomplete = () => resolve();
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

/**
 * Helper to pick matching SVG badge for custom roast logs
 */
function getBrandFallbackSvg(roast) {
  switch (roast) {
    case 'platinum': return 'assets/brands/sey.svg';
    case 'titanium': return 'assets/brands/squaremile.svg';
    case 'gold': return 'assets/brands/esmeralda.svg';
    default: return 'assets/brands/onyx.svg';
  }
}
