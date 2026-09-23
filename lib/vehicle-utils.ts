/**
 * Utility functions for Indian vehicle registration number validation and normalization.
 * Supports:
 * 1. Standard Indian State Series (e.g., MH12AB1234, DL1C1234, DL01CAB1234, KA05D1, MH011234)
 * 2. Bharat (BH) Series (e.g., 22BH1234AA, 21BH6789A)
 */

/**
 * Recognized Indian State and Union Territory 2-letter codes.
 * Includes current codes and legacy codes still present on active vehicles (e.g., OR, UA, DD, DN).
 */
export const INDIAN_STATE_CODES = new Set([
  "AN", // Andaman and Nicobar Islands
  "AP", // Andhra Pradesh
  "AR", // Arunachal Pradesh
  "AS", // Assam
  "BR", // Bihar
  "CG", // Chhattisgarh
  "CH", // Chandigarh
  "DD", // Daman and Diu (former UT)
  "DH", // Dadra and Nagar Haveli and Daman and Diu
  "DL", // Delhi
  "DN", // Dadra and Nagar Haveli (former UT)
  "GA", // Goa
  "GJ", // Gujarat
  "HP", // Himachal Pradesh
  "HR", // Haryana
  "JH", // Jharkhand
  "JK", // Jammu and Kashmir
  "KA", // Karnataka
  "KL", // Kerala
  "LA", // Ladakh
  "LD", // Lakshadweep
  "MH", // Maharashtra
  "ML", // Meghalaya
  "MN", // Manipur
  "MP", // Madhya Pradesh
  "MZ", // Mizoram
  "NL", // Nagaland
  "OD", // Odisha
  "OR", // Odisha (legacy code)
  "PB", // Punjab
  "PY", // Puducherry
  "RJ", // Rajasthan
  "SK", // Sikkim
  "TN", // Tamil Nadu
  "TR", // Tripura
  "TS", // Telangana
  "UA", // Uttarakhand (legacy code)
  "UK", // Uttarakhand
  "UP", // Uttar Pradesh
  "WB", // West Bengal
]);

/**
 * Normalizes a vehicle registration number by:
 * 1. Converting to uppercase
 * 2. Removing all spaces and hyphens
 *
 * Example: "mh - 12 - ab - 1234" -> "MH12AB1234"
 * Example: "22 bh 1234 aa" -> "22BH1234AA"
 */
export function normalizeVehicleNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).toUpperCase().replace(/[\s-]+/g, "");
}

export interface VehicleValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
  formatType?: "standard" | "bh" | "legacy";
}

/**
 * Validates whether the given string conforms to valid Indian vehicle registration formats.
 * Accepts:
 * - Standard State Series: State (2 letters) + RTO (1-2 digits) + Series (1-3 letters) + Number (1-4 digits)
 * - Older Indian Format: State (2 letters) + RTO (2 digits) + Number (4 digits)
 * - BH-Series: Year (2 digits) + "BH" + 4 digits (0001-9999) + Series (1-2 letters)
 */
export function validateVehicleRegistration(
  raw: string | null | undefined
): VehicleValidationResult {
  const normalized = normalizeVehicleNumber(raw);

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      error: "Vehicle registration number is required.",
    };
  }

  // Minimum conceivable length is 6 (e.g. DL1A1 or MH011234 is 8)
  if (normalized.length < 5) {
    return {
      isValid: false,
      normalized,
      error: "Vehicle registration number is too short. E.g. MH12AB1234 or 22BH1234AA.",
    };
  }

  // 1. Check BH-Series (Bharat Series)
  // Format: YY (2 digits) + BH + 4 digits (0001-9999) + 1-2 letters (e.g. 22BH1234AA)
  if (/^\d{2}BH/i.test(normalized)) {
    const bhRegex = /^\d{2}BH\d{4}[A-Z]{1,2}$/;
    if (bhRegex.test(normalized)) {
      return {
        isValid: true,
        normalized,
        formatType: "bh",
      };
    }

    // Contextual feedback for BH series
    if (/^\d{2}BH\d{1,3}[A-Z]?$/.test(normalized)) {
      return {
        isValid: false,
        normalized,
        error:
          "Incomplete BH-series number. BH series requires 4 digits and 1-2 letters (e.g., 22BH1234AA).",
      };
    }

    if (/^\d{2}BH\d{4}$/.test(normalized)) {
      return {
        isValid: false,
        normalized,
        error:
          "Missing series letters at the end of BH-series number (e.g., 22BH1234AA).",
      };
    }

    if (/^\d{2}BH\d{5,}/.test(normalized)) {
      return {
        isValid: false,
        normalized,
        error:
          "Invalid BH-series number. Number section must be exactly 4 digits (e.g., 22BH1234AA).",
      };
    }

    return {
      isValid: false,
      normalized,
      error:
        "Invalid BH-series format. Expected format: 2 digits (year) + BH + 4 digits + 1-2 letters (e.g., 22BH1234AA).",
    };
  }

  // 2. Check if input starts with digits but is not BH
  if (/^\d/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error:
        "Invalid format. Numbers starting with digits must be BH-series (e.g., 22BH1234AA). Standard registrations start with a 2-letter state code (e.g., MH12AB1234).",
    };
  }

  // 3. Check Standard Indian State Series
  const stateCode = normalized.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return {
      isValid: false,
      normalized,
      error:
        "Invalid vehicle registration. Must start with a 2-letter state code (e.g., MH, DL, KA) or BH series (e.g., 22BH).",
    };
  }

  // Verify against recognized Indian state/UT codes
  if (!INDIAN_STATE_CODES.has(stateCode)) {
    return {
      isValid: false,
      normalized,
      error: `Invalid state code "${stateCode}". Please enter a valid Indian state or UT code (e.g., MH, DL, KA, UP) or BH-series.`,
    };
  }

  // Modern Standard: State (2 letters) + RTO (1-2 digits) + Series (1-3 letters) + Number (1-4 digits)
  // e.g., MH12AB1234, DL1C1234, DL01CAB1234, KA05D1
  const standardModernRegex = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/;
  if (standardModernRegex.test(normalized)) {
    return {
      isValid: true,
      normalized,
      formatType: "standard",
    };
  }

  // Older / Vintage Format without series letter: State (2 letters) + RTO (2 digits) + Number (4 digits)
  // e.g., MH011234
  const standardLegacyRegex = /^[A-Z]{2}\d{2}\d{4}$/;
  if (standardLegacyRegex.test(normalized)) {
    return {
      isValid: true,
      normalized,
      formatType: "legacy",
    };
  }

  // Contextual error messages for common invalid patterns
  if (/^[A-Z]{2}\d{1,2}$/.test(normalized) || /^[A-Z]{2}\d{1,2}[A-Z]{1,3}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error:
        "Incomplete vehicle registration number. Please include the 1-4 digit registration number (e.g., MH12AB1234).",
    };
  }

  if (/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{5,}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error:
        "Invalid registration number. The number part at the end cannot exceed 4 digits (e.g., MH12AB1234).",
    };
  }

  if (/^[A-Z]{2}\d{3,}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error:
        "Invalid vehicle number format. Modern registrations require a series letter before the number (e.g., MH12AB1234).",
    };
  }

  return {
    isValid: false,
    normalized,
    error:
      "Invalid vehicle registration format. Expected standard Indian format (e.g., MH12AB1234) or BH-series (e.g., 22BH1234AA).",
  };
}
