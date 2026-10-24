/* ==========================================================================
   EXTRACTED BEANS - INDEXEDDB DATABASE LAYER
   High-performance browser-native persistence for coffee extraction profiles
   ========================================================================== */

const DB_NAME = 'ExtractedBeansDB';
const DB_VERSION = 4;
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
    timestamp: Date.now() - 1400000
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
    timestamp: Date.now() - 1300000
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
    timestamp: Date.now() - 1200000
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
    timestamp: Date.now() - 1100000
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
    timestamp: Date.now() - 1000000
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
    timestamp: Date.now() - 900000
  },
  {
    brandName: 'Coffee.',
    roastEdition: 'Medium Roast · 100% Australian Roasted',
    originRegion: 'Woolworths · 100% Australian Roasted',
    imageSrc: 'assets/brands/coffee.svg',
    grindSize: '4',
    grindDetail: 'Dial Setting 4 · Precision Steel Conical',
    grindAmount: '19.0 g',
    doseDetail: 'Balanced Medium Roast (19g in · Amt +0.5)',
    extractedWeight: '38.0 g',
    yieldDetail: 'Velvety Crema Yield (1:2.0)',
    brewTime: '30s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Milk Chocolate', 'Hazelnut', 'Caramel', 'Toffee', 'Hint of Raisin'],
    additionalNotes: 'Grind amount: +0.5 (adjusted from Fine 3 to Fine 4). Smooth and creamy with a buttery feel.',
    timestamp: Date.now() - 800000
  },
  {
    brandName: 'Grinders Coffee Roasters',
    roastEdition: 'Crema · Smooth & Creamy (3/5)',
    originRegion: 'Woolworths · Medium Roast Blend',
    imageSrc: 'assets/brands/grinders_crema.svg',
    grindSize: '3',
    grindDetail: 'Dial Setting 3 · Fine Conical',
    grindAmount: '19.5 g',
    doseDetail: 'Dry Ground Dose (19.5g in)',
    extractedWeight: '40.0 g',
    yieldDetail: 'Liquid Espresso Yield (1:2.05)',
    brewTime: '29s',
    brewTemp: '93.0°C',
    ratio: '1:2.05',
    notes: ['Cocoa', 'Honey', 'Smooth & Creamy'],
    additionalNotes: 'Dialed in at Fine level 3 with 19.5g dose in and 40g extracted yield out in 29s.',
    timestamp: Date.now() - 700000
  },
  {
    brandName: 'Lavazza',
    roastEdition: 'Eternal Roma · Intensity 8/10',
    originRegion: 'Torino, Italia · Est. 1895',
    imageSrc: 'assets/brands/lavazza_roma.svg',
    grindSize: '5',
    grindDetail: 'Dial Setting 5 · Precision Conical',
    grindAmount: '20.0 g',
    doseDetail: 'Dry Ground Dose (20g in)',
    extractedWeight: '39.0 g',
    yieldDetail: 'Liquid Espresso Yield (1:1.95)',
    brewTime: '27s',
    brewTemp: '93.0°C',
    ratio: '1:1.95',
    notes: ['Hazelnut', 'Dark Chocolate'],
    additionalNotes: 'Dialed in at Fine level 5 with 20g dose in and 39g extracted out in ~27 seconds.',
    timestamp: Date.now() - 600000
  },
  {
    brandName: 'Grinders Coffee Roasters',
    roastEdition: 'Café-Q Darkoko · Dark Roast (5/5)',
    originRegion: 'Woolworths · Milk & Espresso Blend',
    imageSrc: 'assets/brands/grinders_darkoko.svg',
    grindSize: '5',
    grindDetail: 'Dial Setting 5 · Default Conical',
    grindAmount: '18.0 g',
    doseDetail: 'Default Ground Dose (18g in)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Default Espresso Yield (1:2.0)',
    brewTime: '30s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Dark Cocoa', 'Dried Fruit', 'Roasted Almond', 'Malt'],
    additionalNotes: 'Missing extraction information (grind size, dose, extracted weight, and brew time); defaulted to Setting 5, 18g in, 36g out, and 30s extraction time.',
    timestamp: Date.now() - 500000
  },
  {
    brandName: 'The House of Robert Timms',
    roastEdition: 'Café Series · Medium Roast',
    originRegion: 'Woolworths · Hand-Crafted Blend (Est. 1951)',
    imageSrc: 'assets/brands/roberttimms.svg',
    grindSize: '5',
    grindDetail: 'Dial Setting 5 · Default Conical',
    grindAmount: '18.0 g',
    doseDetail: 'Default Ground Dose (18g in)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Default Espresso Yield (1:2.0)',
    brewTime: '30s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Medium Roast', 'Balanced', 'Hand-Crafted Blend'],
    additionalNotes: 'Missing extraction information (grind size, dose, extracted weight, and brew time); defaulted to Setting 5, 18g in, 36g out, and 30s extraction time.',
    timestamp: Date.now() - 400000
  },
  {
    brandName: 'Segafredo Zanetti',
    roastEdition: 'Emozioni · 100% Arabica (Strength 3/5)',
    originRegion: 'Woolworths · Italian Style 100% Arabica',
    imageSrc: 'assets/brands/segafredo.svg',
    grindSize: '5',
    grindDetail: 'Dial Setting 5 · Precision Conical',
    grindAmount: '19.0 g',
    doseDetail: 'Dry Ground Dose (19g in · Amt +0)',
    extractedWeight: '38.0 g',
    yieldDetail: 'Liquid Espresso Yield (1:2.0)',
    brewTime: '31s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['100% Arabica', 'Balanced', 'Aromatic Crema'],
    additionalNotes: 'Grind amount: +0 (neutral). Clean 1:2.0 extraction pulling 19g in to 38g out in 31 seconds.',
    timestamp: Date.now() - 300000
  },
  {
    brandName: 'Espresso Coffee',
    roastEdition: 'Dark Roast (4/5) · 100% Arabica',
    originRegion: 'Woolworths · 100% Arabica Whole Beans',
    imageSrc: 'assets/brands/espressocoffee.svg',
    grindSize: '7',
    grindDetail: 'Dial Setting 7 · Internal Burr 4',
    grindAmount: '19.0 g',
    doseDetail: 'Dry Ground Dose (19g in · -2 section)',
    extractedWeight: '44.0 g',
    yieldDetail: 'Liquid Espresso Yield (1:2.32)',
    brewTime: '28s',
    brewTemp: '93.0°C',
    ratio: '1:2.32',
    notes: ['Dark Roast', '100% Arabica', 'Full Body'],
    additionalNotes: 'Internal Burr: 4 · Grind amount: -2 sections. Extracted yield was measured as 44 ml (converted to 44.0 g for consistency).',
    timestamp: Date.now() - 200000
  },
  {
    brandName: 'Harris (Est. 1883)',
    roastEdition: 'Smooth · Medium Roast (3/5)',
    originRegion: 'Woolworths · Balanced & Creamy Blend',
    imageSrc: 'assets/brands/harris.svg',
    grindSize: '3',
    grindDetail: 'Dial Setting 3 · Internal Burr 4',
    grindAmount: '18.0 g',
    doseDetail: 'Default Ground Dose (18g in · Grind +1.5)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Default Espresso Yield (1:2.0)',
    brewTime: '22-26s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Smooth', 'Balanced', 'Creamy'],
    additionalNotes: 'Internal Burr: 4 · Grind amount: +1.5 · Very smooth taste. Missing coffee dose and extracted weight information; defaulted to 18g in and 36g out.',
    timestamp: Date.now() - 100000
  },
  {
    brandName: 'Aroma Café',
    roastEdition: 'Seasonal Espresso · 100% Arabica',
    originRegion: 'Woolworths · 100% Arabica Blend',
    imageSrc: 'assets/brands/aromacafe.svg',
    grindSize: '7',
    grindDetail: 'Dial Setting 7 · Internal Burr 4',
    grindAmount: '18.0 g',
    doseDetail: 'Default Ground Dose (18g in · Grind -1.8)',
    extractedWeight: '36.0 g',
    yieldDetail: 'Default Espresso Yield (1:2.0)',
    brewTime: '25-30s',
    brewTemp: '93.0°C',
    ratio: '1:2.0',
    notes: ['Sweet Chocolate', 'Distinctive Fruit', 'Velvety Body', 'Creamy Crema'],
    additionalNotes: 'Internal Burr: 4 · Grind amount: -1.8 · Strong first taste, creamy créme. Missing coffee dose and extracted weight information; defaulted to 18g in and 36g out.',
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
        const existingKeys = new Set(existing.map(x => `${x.brandName}::${x.roastEdition}`));

        // Sync real extraction metrics onto existing "Coffee." entry if it still has old default metrics
        existing.forEach(record => {
          if (record.brandName === 'Coffee.' && record.grindSize === '5' && record.grindAmount === '18.0 g') {
            const updatedCoffee = DEFAULT_EXTRACTIONS.find(d => d.brandName === 'Coffee.');
            if (updatedCoffee) {
              store.put({ ...updatedCoffee, id: record.id });
            }
          }
        });

        DEFAULT_EXTRACTIONS.forEach(item => {
          const key = `${item.brandName}::${item.roastEdition}`;
          if (!existingKeys.has(key)) {
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
