/* ==========================================================================
   EXTRACTED BEANS - INDEXEDDB DATABASE LAYER
   High-performance browser-native persistence for coffee extraction profiles
   ========================================================================== */

const DB_NAME = 'ExtractedBeansDB';
const DB_VERSION = 3;
const STORE_NAME = 'extractions';

// Default Seed Data: Curated Specialty Coffee Extractions with Breville 1-12 Dial settings
export const DEFAULT_EXTRACTIONS = [
  {
    brandName: 'Onyx Coffee Lab',
    roastEdition: 'Monarch Reserve Blend',
    originRegion: 'Tolima & Huila, Colombia',
    imageSrc: 'assets/brands/onyx.svg',
    grindSize: '5',
    grindDetail: 'Dial Setting 5 · Precision Conical',
    grindAmount: '18.0 g',
    doseDetail: 'Dry Ground Dose (18g in)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Liquid Espresso Yield (1:2.0)',
    brewTime: '27s',
    brewTemp: '93.5°C',
    ratio: '1:2.0',
    notes: ['Dark Chocolate', 'Caramelized Sugar', 'Black Cherry'],
    additionalNotes: 'Balanced sweet syrupy body, ideal for morning flat white or double shot.',
    timestamp: Date.now() - 500000
  },
  {
    brandName: 'Sey Coffee',
    roastEdition: 'El Paraiso Special Reserve',
    originRegion: 'Cauca, Colombia · Thermal Shock',
    imageSrc: 'assets/brands/sey.svg',
    grindSize: '4',
    grindDetail: 'Dial Setting 4 · Micro Burr',
    grindAmount: '18.0 g',
    doseDetail: 'High-Density Light Roast Dose',
    extractedWeight: '38.0 g',
    yieldDetail: 'High-Extraction Yield (1:2.11)',
    brewTime: '30s',
    brewTemp: '94.0°C',
    ratio: '1:2.11',
    notes: ['Red Currant', 'Bergamot', 'Jasmine Florals'],
    additionalNotes: 'Extended 7s pre-infusion highlights bright bergamot acidity and crisp finish.',
    timestamp: Date.now() - 400000
  },
  {
    brandName: 'Square Mile Coffee',
    roastEdition: 'Red Brick Espresso Series',
    originRegion: 'East Africa & Central America',
    imageSrc: 'assets/brands/squaremile.svg',
    grindSize: '6',
    grindDetail: 'Dial Setting 6 · Flat Steel',
    grindAmount: '18.5 g',
    doseDetail: 'Classic Balanced Dose (18.5g in)',
    extractedWeight: '37.0 g',
    yieldDetail: 'Viscous Crema Yield (1:2.0)',
    brewTime: '28s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Toffee Crisp', 'Milk Chocolate', 'Red Apple'],
    additionalNotes: 'Velvety crema texture with pronounced milk chocolate undertones.',
    timestamp: Date.now() - 300000
  },
  {
    brandName: 'Hacienda La Esmeralda',
    roastEdition: 'Geisha Special Reserve',
    originRegion: 'Boquete, Panama · 1,800m',
    imageSrc: 'assets/brands/esmeralda.svg',
    grindSize: '3',
    grindDetail: 'Dial Setting 3 · Fine Dial',
    grindAmount: '18.0 g',
    doseDetail: 'Rare Varietal Geisha Dose',
    extractedWeight: '40.0 g',
    yieldDetail: 'High Clarity Nectar (1:2.22)',
    brewTime: '32s',
    brewTemp: '95.0°C',
    ratio: '1:2.22',
    notes: ['White Peach', 'Orange Blossom', 'Raw Honey'],
    additionalNotes: 'High floral clarity. Recommended to drink black to preserve delicate honey notes.',
    timestamp: Date.now() - 200000
  },
  {
    brandName: 'Blue Bottle Coffee',
    roastEdition: 'Bella Donovan Blend',
    originRegion: 'Ethiopia & Sumatra Blend',
    imageSrc: 'assets/brands/bluebottle.svg',
    grindSize: '7',
    grindDetail: 'Dial Setting 7 · Conical Burr',
    grindAmount: '19.0 g',
    doseDetail: 'Mellow Rich Dose (19g in)',
    extractedWeight: '38.0 g',
    yieldDetail: 'Velvety Crema Yield (1:2.0)',
    brewTime: '29s',
    brewTemp: '92.5°C',
    ratio: '1:2.0',
    notes: ['Raspberry', 'Dark Chocolate', 'Molasses'],
    additionalNotes: 'Deep, comforting finish with molasses richness.',
    timestamp: Date.now() - 100000
  },
  {
    brandName: 'Tim Wendelboe',
    roastEdition: 'Caballero Geisha Washed',
    originRegion: 'Marcala, Honduras · 1,600m',
    imageSrc: 'assets/brands/timwendelboe.svg',
    grindSize: '4',
    grindDetail: 'Dial Setting 4 · Nordic Precision',
    grindAmount: '18.0 g',
    doseDetail: 'Ultra-Dense High Altitude',
    extractedWeight: '36.0 g',
    yieldDetail: 'Crisp Phosphoric Yield (1:2.0)',
    brewTime: '31s',
    brewTemp: '94.5°C',
    ratio: '1:2.0',
    notes: ['Floral Jasmine', 'Apricot', 'Meyer Lemon'],
    additionalNotes: 'Clean, tea-like mouthfeel with vibrant apricot finish.',
    timestamp: Date.now() - 50000
  },
  {
    brandName: 'Coffee.',
    roastEdition: 'Medium Roast · 100% Australian Roasted',
    originRegion: '100% Australian Roasted Blend',
    imageSrc: 'assets/brands/coffee.svg',
    grindSize: '5',
    grindDetail: 'Dial Setting 5 · Precision Steel Conical',
    grindAmount: '18.0 g',
    doseDetail: 'Balanced Medium Roast (18g in)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Velvety Crema Yield (1:2.0)',
    brewTime: '28s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Milk Chocolate', 'Hazelnut', 'Caramel', 'Toffee', 'Hint of Raisin'],
    additionalNotes: 'Smooth everyday espresso recipe, paired nicely with textured oat or dairy milk.',
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
        store.createIndex('brandName', 'brandName', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
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
 * Seed database with default extractions if empty or sync missing default brands
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
  } else {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const existing = req.result || [];
        const existingBrands = new Set(existing.map(x => x.brandName));
        DEFAULT_EXTRACTIONS.forEach(item => {
          if (!existingBrands.has(item.brandName)) {
            store.add({ ...item });
          }
        });
      };
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
 * Retrieve all extraction records sorted by newest first
 */
export async function getAllExtractions() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result || [];
      results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
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
      imageSrc: record.imageSrc || 'assets/logo.jpg'
    };

    const request = store.add(fullRecord);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing extraction record in IndexedDB
 */
export async function updateExtractionRecord(record) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
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
