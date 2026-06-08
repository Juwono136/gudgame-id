export type PhoneCountry = {
  code: string;
  dial: string;
  label: string;
};

/**
 * ITU calling codes — sorted alphabetically by country name (Indonesia pinned first).
 */
const ALL_COUNTRIES: PhoneCountry[] = [
  { code: "AF", dial: "+93", label: "Afghanistan (+93)" },
  { code: "AL", dial: "+355", label: "Albania (+355)" },
  { code: "DZ", dial: "+213", label: "Algeria (+213)" },
  { code: "AR", dial: "+54", label: "Argentina (+54)" },
  { code: "AM", dial: "+374", label: "Armenia (+374)" },
  { code: "AU", dial: "+61", label: "Australia (+61)" },
  { code: "AT", dial: "+43", label: "Austria (+43)" },
  { code: "AZ", dial: "+994", label: "Azerbaijan (+994)" },
  { code: "BH", dial: "+973", label: "Bahrain (+973)" },
  { code: "BD", dial: "+880", label: "Bangladesh (+880)" },
  { code: "BY", dial: "+375", label: "Belarus (+375)" },
  { code: "BE", dial: "+32", label: "Belgium (+32)" },
  { code: "BO", dial: "+591", label: "Bolivia (+591)" },
  { code: "BA", dial: "+387", label: "Bosnia and Herzegovina (+387)" },
  { code: "BR", dial: "+55", label: "Brazil (+55)" },
  { code: "BN", dial: "+673", label: "Brunei (+673)" },
  { code: "BG", dial: "+359", label: "Bulgaria (+359)" },
  { code: "KH", dial: "+855", label: "Cambodia (+855)" },
  { code: "CM", dial: "+237", label: "Cameroon (+237)" },
  { code: "CA", dial: "+1", label: "Canada (+1)" },
  { code: "CL", dial: "+56", label: "Chile (+56)" },
  { code: "CN", dial: "+86", label: "China (+86)" },
  { code: "CO", dial: "+57", label: "Colombia (+57)" },
  { code: "CR", dial: "+506", label: "Costa Rica (+506)" },
  { code: "HR", dial: "+385", label: "Croatia (+385)" },
  { code: "CY", dial: "+357", label: "Cyprus (+357)" },
  { code: "CZ", dial: "+420", label: "Czech Republic (+420)" },
  { code: "DK", dial: "+45", label: "Denmark (+45)" },
  { code: "DO", dial: "+1", label: "Dominican Republic (+1)" },
  { code: "EC", dial: "+593", label: "Ecuador (+593)" },
  { code: "EG", dial: "+20", label: "Egypt (+20)" },
  { code: "SV", dial: "+503", label: "El Salvador (+503)" },
  { code: "EE", dial: "+372", label: "Estonia (+372)" },
  { code: "ET", dial: "+251", label: "Ethiopia (+251)" },
  { code: "FI", dial: "+358", label: "Finland (+358)" },
  { code: "FR", dial: "+33", label: "France (+33)" },
  { code: "GE", dial: "+995", label: "Georgia (+995)" },
  { code: "DE", dial: "+49", label: "Germany (+49)" },
  { code: "GH", dial: "+233", label: "Ghana (+233)" },
  { code: "GR", dial: "+30", label: "Greece (+30)" },
  { code: "GT", dial: "+502", label: "Guatemala (+502)" },
  { code: "HN", dial: "+504", label: "Honduras (+504)" },
  { code: "HK", dial: "+852", label: "Hong Kong (+852)" },
  { code: "HU", dial: "+36", label: "Hungary (+36)" },
  { code: "IS", dial: "+354", label: "Iceland (+354)" },
  { code: "IN", dial: "+91", label: "India (+91)" },
  { code: "ID", dial: "+62", label: "Indonesia (+62)" },
  { code: "IR", dial: "+98", label: "Iran (+98)" },
  { code: "IQ", dial: "+964", label: "Iraq (+964)" },
  { code: "IE", dial: "+353", label: "Ireland (+353)" },
  { code: "IL", dial: "+972", label: "Israel (+972)" },
  { code: "IT", dial: "+39", label: "Italy (+39)" },
  { code: "JM", dial: "+1", label: "Jamaica (+1)" },
  { code: "JP", dial: "+81", label: "Japan (+81)" },
  { code: "JO", dial: "+962", label: "Jordan (+962)" },
  { code: "KZ", dial: "+7", label: "Kazakhstan (+7)" },
  { code: "KE", dial: "+254", label: "Kenya (+254)" },
  { code: "KR", dial: "+82", label: "South Korea (+82)" },
  { code: "KW", dial: "+965", label: "Kuwait (+965)" },
  { code: "LV", dial: "+371", label: "Latvia (+371)" },
  { code: "LB", dial: "+961", label: "Lebanon (+961)" },
  { code: "LT", dial: "+370", label: "Lithuania (+370)" },
  { code: "LU", dial: "+352", label: "Luxembourg (+352)" },
  { code: "MO", dial: "+853", label: "Macau (+853)" },
  { code: "MY", dial: "+60", label: "Malaysia (+60)" },
  { code: "MX", dial: "+52", label: "Mexico (+52)" },
  { code: "MA", dial: "+212", label: "Morocco (+212)" },
  { code: "NL", dial: "+31", label: "Netherlands (+31)" },
  { code: "NZ", dial: "+64", label: "New Zealand (+64)" },
  { code: "NG", dial: "+234", label: "Nigeria (+234)" },
  { code: "NO", dial: "+47", label: "Norway (+47)" },
  { code: "OM", dial: "+968", label: "Oman (+968)" },
  { code: "PK", dial: "+92", label: "Pakistan (+92)" },
  { code: "PA", dial: "+507", label: "Panama (+507)" },
  { code: "PY", dial: "+595", label: "Paraguay (+595)" },
  { code: "PE", dial: "+51", label: "Peru (+51)" },
  { code: "PH", dial: "+63", label: "Philippines (+63)" },
  { code: "PL", dial: "+48", label: "Poland (+48)" },
  { code: "PT", dial: "+351", label: "Portugal (+351)" },
  { code: "QA", dial: "+974", label: "Qatar (+974)" },
  { code: "RO", dial: "+40", label: "Romania (+40)" },
  { code: "RU", dial: "+7", label: "Russia (+7)" },
  { code: "SA", dial: "+966", label: "Saudi Arabia (+966)" },
  { code: "RS", dial: "+381", label: "Serbia (+381)" },
  { code: "SG", dial: "+65", label: "Singapore (+65)" },
  { code: "SK", dial: "+421", label: "Slovakia (+421)" },
  { code: "SI", dial: "+386", label: "Slovenia (+386)" },
  { code: "ZA", dial: "+27", label: "South Africa (+27)" },
  { code: "ES", dial: "+34", label: "Spain (+34)" },
  { code: "LK", dial: "+94", label: "Sri Lanka (+94)" },
  { code: "SE", dial: "+46", label: "Sweden (+46)" },
  { code: "CH", dial: "+41", label: "Switzerland (+41)" },
  { code: "TW", dial: "+886", label: "Taiwan (+886)" },
  { code: "TH", dial: "+66", label: "Thailand (+66)" },
  { code: "TR", dial: "+90", label: "Turkey (+90)" },
  { code: "UA", dial: "+380", label: "Ukraine (+380)" },
  { code: "AE", dial: "+971", label: "United Arab Emirates (+971)" },
  { code: "GB", dial: "+44", label: "United Kingdom (+44)" },
  { code: "US", dial: "+1", label: "United States (+1)" },
  { code: "UY", dial: "+598", label: "Uruguay (+598)" },
  { code: "UZ", dial: "+998", label: "Uzbekistan (+998)" },
  { code: "VE", dial: "+58", label: "Venezuela (+58)" },
  { code: "VN", dial: "+84", label: "Vietnam (+84)" },
];

const indonesia = ALL_COUNTRIES.find((c) => c.code === "ID")!;
const rest = ALL_COUNTRIES.filter((c) => c.code !== "ID").sort((a, b) =>
  a.label.localeCompare(b.label),
);

export const phoneCountries: PhoneCountry[] = [indonesia, ...rest];

export const defaultPhoneCountry = indonesia;

const byCode = new Map(phoneCountries.map((c) => [c.code, c]));

/** Resolve ISO country code (e.g. "ID") to ITU dial code (e.g. "+62"). */
export function getDialByCountryCode(code: string): string | undefined {
  return byCode.get(code)?.dial;
}

export function getPhoneCountryByCode(code: string): PhoneCountry | undefined {
  return byCode.get(code);
}

export const phoneCountryIsoCodes = phoneCountries.map((c) => c.code);
