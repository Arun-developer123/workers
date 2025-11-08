// src/lib/occupations.ts
export type PricingOption = { value: string; label: string; unitHint?: string };

export const OCCUPATIONS: {
  value: string;
  label: string;
  pricingOptions: PricingOption[];
}[] = [
  {
    value: "rajmistri",
    label: "राजमिस्त्री (Mason)",
    pricingOptions: [
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_piece", label: "प्रति यूनिट", unitHint: "unit" },
    ],
  },
  {
    value: "painter",
    label: "पेंटर (Painter)",
    pricingOptions: [
      { value: "per_sqft", label: "प्रति sqft", unitHint: "sqft" },
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
    ],
  },
  {
    value: "electrician",
    label: "इलेक्ट्रीशियन (Electrician)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "plumber",
    label: "प्लम्बर (Plumber)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "carpenter",
    label: "कारपेंटर (Carpenter)",
    pricingOptions: [
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_piece", label: "प्रति यूनिट", unitHint: "unit" },
    ],
  },

  // from profile/setup page additions
  {
    value: "welding",
    label: "वेल्डर (Welder)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "driver",
    label: "ड्राइवर (Driver)",
    pricingOptions: [
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
      { value: "per_trip", label: "प्रति ट्रिप", unitHint: "trip" },
    ],
  },
  {
    value: "tile_fixer",
    label: "टाइल फिट्टर (Tile Fixer)",
    pricingOptions: [
      { value: "per_sqft", label: "प्रति sqft", unitHint: "sqft" },
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
    ],
  },

  // combined / additional occupations
  {
    value: "gardener",
    label: "माली / बागवान (Gardener)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
      { value: "per_job", label: "प्रति काम / प्रोजेक्ट", unitHint: "job" },
    ],
  },
  {
    value: "helper",
    label: "हेल्पर / मजदूर (Helper)",
    pricingOptions: [
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
    ],
  },
  {
    value: "kabadi",
    label: "कबाड़ी / स्क्रैप कलेक्टर (Kabadi)",
    pricingOptions: [
      { value: "per_kg", label: "प्रति किलो", unitHint: "kg" },
      { value: "per_trip", label: "प्रति ट्रिप", unitHint: "trip" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "clothes_ironer",
    label: "कपड़े प्रेस करने वाला (Clothes Ironer)",
    pricingOptions: [
      { value: "per_piece", label: "प्रति पीस", unitHint: "piece" },
      { value: "per_kg", label: "प्रति किलो (बैच में)", unitHint: "kg" },
    ],
  },
  {
    value: "locksmith",
    label: "ताले/चाबी वाला (Locksmith)",
    pricingOptions: [
      { value: "per_job", label: "प्रति काम (आउटेज/काटना/फिक्स)", unitHint: "job" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
    ],
  },
  {
    value: "shoe_polisher",
    label: "जूता पॉलिश / शू शाइनर (Shoe Polisher)",
    pricingOptions: [
      { value: "per_pair", label: "प्रति जोड़ी", unitHint: "pair" },
      { value: "per_shoe", label: "प्रति जूता", unitHint: "shoe" },
    ],
  },
  {
    value: "tailor",
    label: "दरजी / सिलाई (Tailor)",
    pricingOptions: [
      { value: "per_piece", label: "प्रति आइटम (शर्ट/पैंट)", unitHint: "piece" },
      { value: "per_meter", label: "प्रति मीटर (कपड़ा/हेम)", unitHint: "meter" },
      { value: "per_job", label: "प्रति काम (कस्टम)", unitHint: "job" },
    ],
  },

  // small common extras you can enable later
  {
    value: "pest_control",
    label: "कीट नियंत्रण (Pest Control)",
    pricingOptions: [
      { value: "per_sqft", label: "प्रति sqft", unitHint: "sqft" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "cleaner",
    label: "क्लीनर / सफाई कर्मी (Cleaner)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_day", label: "प्रति दिन", unitHint: "INR/day" },
    ],
  },
];
