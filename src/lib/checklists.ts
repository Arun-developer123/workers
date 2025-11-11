// src/lib/checklists.ts
export type ChecklistItem = {
  /** unique id (string) */
  id: string;
  /** short label shown to user */
  label: string;
  /** optional description shown under label */
  description?: string;
  /** default price in ₹ for this small task (per item / per job) */
  defaultPrice: number;
  /** optionally a unit hint (e.g., 'per hour', 'per trip') */
  unitHint?: string | null;
};

/**
 * CHECKLISTS: map occupation value -> list of ChecklistItem
 * Ensure keys match OCCUPATIONS[].value exactly (e.g., "rajmistri", "painter", "electrician", ...)
 */
export const CHECKLISTS: Record<string, ChecklistItem[]> = {
  rajmistri: [
    { id: "mason-demolition-small", label: "छोटी तोड़फोड़ / डेमोलिशन", description: "छोटे हिस्से की तोड़-फोड़ और मलबा हटाना", defaultPrice: 500, unitHint: "per job" },
    { id: "mason-brick-laying", label: "ईंटें/ब्लॉक लगाना", description: "ईंट/ब्लॉक बिछाना (मटर/मीटर के हिसाब से)", defaultPrice: 40, unitHint: "per brick" },
    { id: "mason-plastering", label: "प्लास्टरिंग (मोर्टार)", description: "दरार भरना और प्लास्टर लगाना", defaultPrice: 25, unitHint: "per sqft" },
    { id: "mason-mix-mortar", label: "मोर्टार मिक्स / सामग्री", description: "मोर्टार के लिए सामग्री और मिक्सिंग", defaultPrice: 150, unitHint: "per bag" },
    { id: "mason-clean-up", label: "साइट क्लीन-अप", description: "मलबा हटाना और साइट साफ़ करना", defaultPrice: 400, unitHint: "per job" },
  ],

  painter: [
    { id: "paint-surface-clean", label: "सतह सफाई / प्राइमिंग", description: "सतह को साफ़ करना और प्राइमर लगाना", defaultPrice: 80, unitHint: "per sqft" },
    { id: "paint-patch-fill", label: "छेद भरना / पॅच वर्क", description: "छोटे छेद भरकर समतल बनाना", defaultPrice: 300, unitHint: "per patch" },
    { id: "paint-topcoat", label: "टॉपकोट (फ़िनिश पेंट)", description: "Topcoat/फिनिश पेंट के लिए सामग्री+मेहनत", defaultPrice: 25, unitHint: "per sqft" },
    { id: "paint-skirting", label: "स्कर्टिंग/बॉर्डर पेंट", description: "स्कर्टिंग या बॉर्डर पेंटिंग", defaultPrice: 35, unitHint: "per sqft" },
    { id: "paint-debris-clear", label: "मलबा हटाना (पेंटिंग के बाद)", description: "साइट क्लीनिंग", defaultPrice: 200, unitHint: "per job" },
  ],

  electrician: [
    { id: "elec-replace-socket", label: "सॉकेट बदलना / रिप्लेस", description: "पुराने सॉकेट हटाकर नया सॉकेट लगाना (1 पॉइंट)", defaultPrice: 200, unitHint: "per point" },
    { id: "elec-switch-replace", label: "स्विच बदलना / रिप्लेस", description: "एक स्विच बदलना/फिक्स करना", defaultPrice: 120, unitHint: "per point" },
    { id: "elec-wiring-short", label: "सिम्पल वायरिंग / जोड़", description: "छोटी वायरिंग जोड़/टूटा वायर रिपेयर", defaultPrice: 150, unitHint: "per point" },
    { id: "elec-fixture-fit", label: "लाइट/फिक्सचर इंस्टॉल", description: "लाइट/फिक्सचर लगाना (1 unit)", defaultPrice: 250, unitHint: "per job" },
    { id: "elec-debris-clear", label: "मलबा हटाना (electrical)", description: "इलेक्ट्रीकल काम के बाद साईट क्लीन", defaultPrice: 200, unitHint: "per job" },
  ],

  plumber: [
    { id: "plumb-faucet-replace", label: "फॉसेट / नल बदलना", description: "नल/हैंडशावर इत्यादि बदलना/फिक्स करना", defaultPrice: 250, unitHint: "per job" },
    { id: "plumb-leak-fix", label: "लीक/जॉइंट फिक्स", description: "लीकिंग पाइप/जॉइंट रिपेयर", defaultPrice: 300, unitHint: "per job" },
    { id: "plumb-unblock-drain", label: "ड्रेन/सिंक अनब्लॉक", description: "सिंक या फ्लोर ड्रेन की सफाई", defaultPrice: 400, unitHint: "per job" },
    { id: "plumb-install-fixture", label: "टॉयलेट/टैंक इंस्टॉल", description: "टॉयलेट/टैंक/सिंक इंस्टालेशन", defaultPrice: 1200, unitHint: "per job" },
    { id: "plumb-cleanup", label: "साइट क्लीन-अप", description: "प्लम्बिंग के बाद मलबा हटाना", defaultPrice: 250, unitHint: "per job" },
  ],

  carpenter: [
    { id: "carp-fix-door", label: "दरवाज़ा फिक्स/एडजस्ट", description: "हिंग/एडजस्ट/सैंडिंग", defaultPrice: 300, unitHint: "per job" },
    { id: "carp-furniture-assemble", label: "फर्नीचर असेंबल/रिपेयर", description: "असेंबली या छोटी मरम्मत", defaultPrice: 500, unitHint: "per job" },
    { id: "carp-cut-trim", label: "कटिंग/ट्रिमिंग", description: "लकड़ी काटना और फिट करना", defaultPrice: 80, unitHint: "per piece" },
    { id: "carp-shutter-install", label: "शटर/पैनल इंस्टाल", description: "शटर या पैनल लगाना", defaultPrice: 1200, unitHint: "per job" },
    { id: "carp-cleanup", label: "साइट क्लीन-अप", description: "कटिंग मलबा हटाना", defaultPrice: 300, unitHint: "per job" },
  ],

  welding: [
    { id: "weld-gate-fix", label: "गेट/फ्रेम वेल्डिंग", description: "छोटे वेल्डिंग/फिक्सिंग कार्य", defaultPrice: 800, unitHint: "per job" },
    { id: "weld-fabrication", label: "लघु फैब्रिकेशन", description: "स्लिम फैब्रिकेशन या जोड़", defaultPrice: 600, unitHint: "per job" },
    { id: "weld-repair", label: "मेटल रिपेयर/रीइनफोर्स", description: "टूटा पार्ट जोड़ना/रिनफोर्स", defaultPrice: 500, unitHint: "per job" },
    { id: "weld-cleanup", label: "स्पार्क/स्लैग क्लीन", description: "वर्क के बाद क्लीनअप", defaultPrice: 250, unitHint: "per job" },
  ],

  driver: [
    { id: "driver-local-trip", label: "लोकल ट्रिप (short)", description: "नजदीकी लोड/अनलोड सहित", defaultPrice: 300, unitHint: "per trip" },
    { id: "driver-full-day", label: "पूर्ण दिन ड्राइवर", description: "8-10 घंटे ड्यूटी", defaultPrice: 1200, unitHint: "per day" },
    { id: "driver-load-unload", label: "लोड/अनलोड सहायता", description: "वहन के साथ लोडिंग/अनलोडिंग", defaultPrice: 200, unitHint: "per trip" },
    { id: "driver-extra-hour", label: "ओवरटाइम (प्रति घंटा)", description: "जरूरत अनुसार अतिरिक्त घंटे", defaultPrice: 150, unitHint: "per hour" },
  ],

  tile_fixer: [
    { id: "tile-surface-prepare", label: "सतह तैयारी", description: "सतह समतल करना/क्लीन करना", defaultPrice: 20, unitHint: "per sqft" },
    { id: "tile-lay", label: "टाइल बिछाना", description: "टाइल粘न और ग्राउटिंग", defaultPrice: 35, unitHint: "per sqft" },
    { id: "tile-cut-trim", label: "कट/फिनिशिंग", description: "सभी किनारों का कट और फिनिशिंग", defaultPrice: 200, unitHint: "per job" },
    { id: "tile-cleanup", label: "मलबा हटाना & सफाई", description: "टाइलिंग के बाद साइट क्लीन", defaultPrice: 400, unitHint: "per job" },
  ],

  gardener: [
    { id: "garden-mow-lawn", label: "लॉन काटना / माउइंग", description: "लॉन/ग्रीन कटिंग", defaultPrice: 300, unitHint: "per job" },
    { id: "garden-prune", label: "प्रूनिंग / शेपिंग", description: "पेड़/बुश प्रून करना", defaultPrice: 150, unitHint: "per plant" },
    { id: "garden-planting", label: "पौधे लगाना", description: "नए पौधे/बेड लगाने का काम", defaultPrice: 120, unitHint: "per plant" },
    { id: "garden-fertilize", label: "खाद/फर्टिलाइज़ेशन", description: "मिट्टी सुधार और खाद देवाना", defaultPrice: 200, unitHint: "per job" },
  ],

  helper: [
    { id: "helper-carry-load", label: "माल उठाना/हाथ बंटाना", description: "साइट पर सामान्य मदद (उठाना/धोना)", defaultPrice: 300, unitHint: "per day" },
    { id: "helper-clean", label: "सफाई / असिस्ट", description: "सफाई या साधारण असिस्ट कार्य", defaultPrice: 150, unitHint: "per day" },
    { id: "helper-move", label: "मूविंग सहायता (एक ट्रिप)", description: "छोटे-ट्रिप मूव सहायता", defaultPrice: 250, unitHint: "per trip" },
  ],

  kabadi: [
    { id: "kabadi-collect-scrap", label: "स्क्रैप कलेक्शन", description: "स्क्रैप/रिसायक्लेबल संग्रह", defaultPrice: 50, unitHint: "per kg" },
    { id: "kabadi-segregate", label: "स्क्रैप छाँटना/संगठन", description: "स्क्रैप छाँटना और पैक करना", defaultPrice: 200, unitHint: "per job" },
    { id: "kabadi-trip", label: "ट्रिप चार्ज (लोग/वाहन)", description: "ट्रिप आधारित लेने/लाने", defaultPrice: 300, unitHint: "per trip" },
  ],

  clothes_ironer: [
    { id: "iron-per-piece", label: "कपड़े प्रेस (प्रति पीस)", description: "शर्ट/पैंट आदि प्रेस करना", defaultPrice: 15, unitHint: "per piece" },
    { id: "iron-batch-kg", label: "बैच (प्रति किलो)", description: "कपड़े वॉश/प्रेस बैच", defaultPrice: 60, unitHint: "per kg" },
    { id: "iron-special", label: "विशेष आइटम (सूट/कंप्लिकेटेड)", description: "सूट/कम्प्लिकेटेड प्रेस", defaultPrice: 100, unitHint: "per piece" },
  ],

  locksmith: [
    { id: "locksmith-key-cut", label: "चाबी काटना/डुप्लिकेट", description: "चाबी कटवाना/डुप्लिकेट", defaultPrice: 80, unitHint: "per key" },
    { id: "locksmith-lock-repair", label: "लॉक रिपेयर/रिफिट", description: "दरवाज़ा/लॉक रिपेयर", defaultPrice: 300, unitHint: "per job" },
    { id: "locksmith-emergency", label: "इमरजेंसी अनलॉक", description: "एग्जिट/इमरजेंसी अनलॉक सर्विस", defaultPrice: 500, unitHint: "per job" },
  ],

  shoe_polisher: [
    { id: "shoe-polish-pair", label: "जूता पॉलिश (प्रति जोड़ी)", description: "साधारण पॉलिश / शाइन", defaultPrice: 40, unitHint: "per pair" },
    { id: "shoe-repair", label: "छोटी मरम्मत (सोल/स्टिच)", description: "छोटी मरम्मत कार्य", defaultPrice: 200, unitHint: "per job" },
    { id: "shoe-deodorize", label: "डिओडोराइज़ / क्लीन", description: "कपड़े/जूता क्लीनिंग", defaultPrice: 80, unitHint: "per pair" },
  ],

  tailor: [
    { id: "tailor-stitch-piece", label: "सिलाई (प्रति आइटम)", description: "शर्ट/पैंट आदि सिलाई/अल्टर", defaultPrice: 120, unitHint: "per piece" },
    { id: "tailor-measure-fit", label: "मेजर और फिटिंग", description: "मेजरमेंट और फाइनल फिटिंग", defaultPrice: 150, unitHint: "per job" },
    { id: "tailor-alteration", label: "अल्टरैशन (सामान्य)", description: "स्लिमिंग/लेंथ/हेम बदलना", defaultPrice: 80, unitHint: "per piece" },
  ],

  pest_control: [
    { id: "pest-inspect", label: "निरीक्षण / सर्वे", description: "अनुमान के लिए साइट चेकिन्ग", defaultPrice: 300, unitHint: "per job" },
    { id: "pest-spray", label: "स्प्रे / फोगिंग", description: "कीट नियंत्रण स्प्रे/ट्रीटमेंट", defaultPrice: 25, unitHint: "per sqft" },
    { id: "pest-bait-setup", label: "बेट सेटअप / रिपीट", description: "बेट या ट्रैप सेटअप", defaultPrice: 200, unitHint: "per job" },
  ],

  cleaner: [
    { id: "clean-deep", label: "डीप क्लीनिंग", description: "पूर्ण गहरे सफाई (कमरा/किचन)", defaultPrice: 800, unitHint: "per job" },
    { id: "clean-regular", label: "रोज़ाना/नियमित क्लीनिंग", description: "रीपीट क्लीनिंग (सफाई कर्मी)", defaultPrice: 300, unitHint: "per day" },
    { id: "clean-window", label: "विंडो/शटर क्लीन", description: "विंडो और शटर की सफाई", defaultPrice: 150, unitHint: "per job" },
  ],
};

/** Return checklist items for a given occupation value. If nothing found, returns empty array. */
export function getChecklistForOccupation(occupationValue: string | null | undefined): ChecklistItem[] {
  if (!occupationValue) return [];
  return CHECKLISTS[occupationValue] ?? [];
}

/**
 * Helper to build an Addon (matches your page.tsx Addon shape)
 * Example output: { id: 'chk-<item.id>', name: item.label, qty: 1, unitPrice: item.defaultPrice }
 */
export function addonFromChecklist(item: ChecklistItem) {
  return {
    id: `chk-${item.id}`,
    name: item.label,
    qty: 1,
    unitPrice: item.defaultPrice,
  } as const;
}
