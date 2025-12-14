/**
 * Common Input Validators
 * 
 * Provides reusable validation functions for common data types
 * used across IPC handlers. All validators throw on failure.
 */

/**
 * Validate that a value is present and not empty
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is missing or empty
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
}

/**
 * Validate that a value is a string
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not a string
 */
export function validateString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string, got ${typeof value}`);
  }
}

/**
 * Validate that a value is a number
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not a number
 */
export function validateNumber(value, fieldName) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
}

/**
 * Validate that a value is an integer
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not an integer
 */
export function validateInteger(value, fieldName) {
  validateNumber(value, fieldName);
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
}

/**
 * Validate that a value is a boolean
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not a boolean
 */
export function validateBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
}

/**
 * Validate that a value is an object
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not an object
 */
export function validateObject(value, fieldName) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
}

/**
 * Validate that a value is an array
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not an array
 */
export function validateArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
}

/**
 * Validate string length constraints
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @param {number} options.minLength - Minimum length (optional)
 * @param {number} options.maxLength - Maximum length (optional)
 * @throws {Error} If length constraints violated
 */
export function validateStringLength(value, fieldName, options = {}) {
  validateString(value, fieldName);

  const { minLength, maxLength } = options;

  if (minLength !== undefined && value.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }
}

/**
 * Validate that a string matches a pattern
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {RegExp} pattern - Regex pattern to match
 * @param {string} patternDescription - Description of pattern for error (optional)
 * @throws {Error} If pattern doesn't match
 */
export function validatePattern(value, fieldName, pattern, patternDescription = 'required pattern') {
  validateString(value, fieldName);

  if (!pattern.test(value)) {
    throw new Error(`${fieldName} does not match ${patternDescription}`);
  }
}

/**
 * Validate number range constraints
 * @param {number} value - Number to validate
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @param {number} options.minimum - Minimum value (inclusive, optional)
 * @param {number} options.maximum - Maximum value (inclusive, optional)
 * @throws {Error} If range constraints violated
 */
export function validateNumberRange(value, fieldName, options = {}) {
  validateNumber(value, fieldName);

  const { minimum, maximum } = options;

  if (minimum !== undefined && value < minimum) {
    throw new Error(`${fieldName} must be at least ${minimum}`);
  }

  if (maximum !== undefined && value > maximum) {
    throw new Error(`${fieldName} must be at most ${maximum}`);
  }
}

/**
 * Validate that a value is one of allowed enum values
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @param {Array} allowedValues - Array of allowed values
 * @throws {Error} If value not in allowed values
 */
export function validateEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new Error(
      `${fieldName} must be one of: ${allowedValues.join(', ')}, got "${value}"`
    );
  }
}

/**
 * Validate array length constraints
 * @param {Array} value - Array to validate
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @param {number} options.minLength - Minimum length (optional)
 * @param {number} options.maxLength - Maximum length (optional)
 * @throws {Error} If length constraints violated
 */
export function validateArrayLength(value, fieldName, options = {}) {
  validateArray(value, fieldName);

  const { minLength, maxLength } = options;

  if (minLength !== undefined && value.length < minLength) {
    throw new Error(`${fieldName} must have at least ${minLength} items`);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new Error(`${fieldName} must have at most ${maxLength} items`);
  }
}

/**
 * Validate that array items match a type
 * @param {Array} value - Array to validate
 * @param {string} fieldName - Field name for error message
 * @param {string} itemType - Expected type of items ('string', 'number', 'object', etc.)
 * @throws {Error} If any item doesn't match type
 */
export function validateArrayItemType(value, fieldName, itemType) {
  validateArray(value, fieldName);

  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    const actualType = Array.isArray(item) ? 'array' : typeof item;
    
    if (actualType !== itemType) {
      throw new Error(
        `${fieldName}[${i}] must be ${itemType}, got ${actualType}`
      );
    }
  }
}

/**
 * Validate that object has required fields
 * @param {object} obj - Object to validate
 * @param {string} objName - Object name for error message
 * @param {Array<string>} requiredFields - Array of required field names
 * @throws {Error} If any required field is missing
 */
export function validateObjectFields(obj, objName, requiredFields) {
  validateObject(obj, objName);

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
      throw new Error(`${objName}.${field} is required`);
    }
  }
}

/**
 * Validate that object field types match expected types
 * @param {object} obj - Object to validate
 * @param {string} objName - Object name for error message
 * @param {object} fieldTypes - Object mapping field names to expected types
 * @throws {Error} If any field type doesn't match
 */
export function validateObjectFieldTypes(obj, objName, fieldTypes) {
  validateObject(obj, objName);

  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (!(field in obj)) continue; // Skip missing optional fields

    const actualType = Array.isArray(obj[field]) ? 'array' : typeof obj[field];
    
    if (actualType !== expectedType) {
      throw new Error(
        `${objName}.${field} must be ${expectedType}, got ${actualType}`
      );
    }
  }
}

/**
 * Validate optional field (must be null/undefined or pass validation)
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @param {Function} validator - Validation function to call if value is provided
 * @throws {Error} If validation fails
 */
export function validateOptional(value, fieldName, validator) {
  if (value !== null && value !== undefined) {
    validator(value, fieldName);
  }
}

/**
 * Validate that a value is not null or undefined
 * @param {*} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is null or undefined
 */
export function validateNotNull(value, fieldName) {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} cannot be null or undefined`);
  }
}

/**
 * Validate that a string contains only safe characters
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @param {string} options.allowedChars - Regex pattern of allowed characters
 * @throws {Error} If string contains unsafe characters
 */
export function validateSafeChars(value, fieldName, options = {}) {
  validateString(value, fieldName);

  const {
    allowedChars = /^[a-zA-Z0-9._\-\/]*$/
  } = options;

  if (!allowedChars.test(value)) {
    throw new Error(`${fieldName} contains invalid characters`);
  }
}

/**
 * Composite validator for common string types
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @param {boolean} options.required - Must be present (default: true)
 * @param {number} options.minLength - Minimum length
 * @param {number} options.maxLength - Maximum length
 * @param {RegExp} options.pattern - Regex pattern to match
 * @throws {Error} If validation fails
 */
export function validateStringComposite(value, fieldName, options = {}) {
  const {
    required = true,
    minLength,
    maxLength,
    pattern
  } = options;

  if (required) {
    validateRequired(value, fieldName);
  }

  if (value !== null && value !== undefined && value !== '') {
    validateString(value, fieldName);
    
    if (minLength !== undefined || maxLength !== undefined) {
      validateStringLength(value, fieldName, { minLength, maxLength });
    }

    if (pattern !== undefined) {
      validatePattern(value, fieldName, pattern, 'expected format');
    }
  }
}

/**
 * Validate that a value conforms to multiple validators
 * @param {*} value - Value to validate
 * @param {Array<Function>} validators - Array of validator functions
 * @throws {Error} If any validator fails
 */
export function validateWith(value, validators = []) {
  for (const validator of validators) {
    validator(value);
  }
}
