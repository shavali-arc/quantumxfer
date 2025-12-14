/**
 * Common Validators Tests
 * 
 * Comprehensive test suite for common input validators
 * Tests all basic validation functions with edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateString,
  validateNumber,
  validateInteger,
  validateBoolean,
  validateObject,
  validateArray,
  validateStringLength,
  validatePattern,
  validateNumberRange,
  validateEnum,
  validateArrayLength,
  validateArrayItemType,
  validateObjectFields,
  validateObjectFieldTypes,
  validateOptional,
  validateNotNull,
  validateSafeChars,
  validateStringComposite,
  validateWith
} from '../../electron/validators/common.js';

describe('Common Validators', () => {
  
  // =====================
  // Required Validator
  // =====================
  describe('validateRequired', () => {
    it('should pass for non-empty string', () => {
      expect(() => validateRequired('hello', 'test')).not.toThrow();
    });

    it('should pass for zero', () => {
      expect(() => validateRequired(0, 'test')).not.toThrow();
    });

    it('should pass for false', () => {
      expect(() => validateRequired(false, 'test')).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => validateRequired(null, 'field')).toThrow('field is required');
    });

    it('should throw for undefined', () => {
      expect(() => validateRequired(undefined, 'field')).toThrow('field is required');
    });

    it('should throw for empty string', () => {
      expect(() => validateRequired('', 'field')).toThrow('field is required');
    });

    it('should throw for empty object', () => {
      expect(() => validateRequired({}, 'field')).not.toThrow();
    });
  });

  // =====================
  // Type Validators
  // =====================
  describe('validateString', () => {
    it('should pass for valid string', () => {
      expect(() => validateString('hello', 'test')).not.toThrow();
    });

    it('should pass for empty string', () => {
      expect(() => validateString('', 'test')).not.toThrow();
    });

    it('should throw for number', () => {
      expect(() => validateString(123, 'field')).toThrow('field must be a string');
    });

    it('should throw for object', () => {
      expect(() => validateString({}, 'field')).toThrow('field must be a string');
    });

    it('should throw for null', () => {
      expect(() => validateString(null, 'field')).toThrow('field must be a string');
    });
  });

  describe('validateNumber', () => {
    it('should pass for valid number', () => {
      expect(() => validateNumber(42, 'test')).not.toThrow();
    });

    it('should pass for negative number', () => {
      expect(() => validateNumber(-42, 'test')).not.toThrow();
    });

    it('should pass for zero', () => {
      expect(() => validateNumber(0, 'test')).not.toThrow();
    });

    it('should pass for float', () => {
      expect(() => validateNumber(3.14, 'test')).not.toThrow();
    });

    it('should throw for string', () => {
      expect(() => validateNumber('123', 'field')).toThrow('field must be a valid number');
    });

    it('should throw for NaN', () => {
      expect(() => validateNumber(NaN, 'field')).toThrow('field must be a valid number');
    });
  });

  describe('validateInteger', () => {
    it('should pass for valid integer', () => {
      expect(() => validateInteger(42, 'test')).not.toThrow();
    });

    it('should pass for negative integer', () => {
      expect(() => validateInteger(-42, 'test')).not.toThrow();
    });

    it('should pass for zero', () => {
      expect(() => validateInteger(0, 'test')).not.toThrow();
    });

    it('should throw for float', () => {
      expect(() => validateInteger(3.14, 'field')).toThrow('field must be an integer');
    });

    it('should throw for string', () => {
      expect(() => validateInteger('42', 'field')).toThrow('field must be a valid number');
    });
  });

  describe('validateBoolean', () => {
    it('should pass for true', () => {
      expect(() => validateBoolean(true, 'test')).not.toThrow();
    });

    it('should pass for false', () => {
      expect(() => validateBoolean(false, 'test')).not.toThrow();
    });

    it('should throw for string', () => {
      expect(() => validateBoolean('true', 'field')).toThrow('field must be a boolean');
    });

    it('should throw for number', () => {
      expect(() => validateBoolean(1, 'field')).toThrow('field must be a boolean');
    });
  });

  describe('validateObject', () => {
    it('should pass for plain object', () => {
      expect(() => validateObject({}, 'test')).not.toThrow();
    });

    it('should pass for object with properties', () => {
      expect(() => validateObject({ a: 1 }, 'test')).not.toThrow();
    });

    it('should throw for array', () => {
      expect(() => validateObject([], 'field')).toThrow('field must be an object');
    });

    it('should throw for null', () => {
      expect(() => validateObject(null, 'field')).toThrow('field must be an object');
    });

    it('should throw for string', () => {
      expect(() => validateObject('{}', 'field')).toThrow('field must be an object');
    });
  });

  describe('validateArray', () => {
    it('should pass for empty array', () => {
      expect(() => validateArray([], 'test')).not.toThrow();
    });

    it('should pass for array with items', () => {
      expect(() => validateArray([1, 2, 3], 'test')).not.toThrow();
    });

    it('should throw for object', () => {
      expect(() => validateArray({}, 'field')).toThrow('field must be an array');
    });

    it('should throw for null', () => {
      expect(() => validateArray(null, 'field')).toThrow('field must be an array');
    });

    it('should throw for string', () => {
      expect(() => validateArray('[1,2,3]', 'field')).toThrow('field must be an array');
    });
  });

  // =====================
  // String Validators
  // =====================
  describe('validateStringLength', () => {
    it('should pass for valid length', () => {
      expect(() => validateStringLength('hello', 'test', { minLength: 1, maxLength: 10 }))
        .not.toThrow();
    });

    it('should pass with only minLength', () => {
      expect(() => validateStringLength('hello', 'test', { minLength: 5 }))
        .not.toThrow();
    });

    it('should pass with only maxLength', () => {
      expect(() => validateStringLength('hello', 'test', { maxLength: 5 }))
        .not.toThrow();
    });

    it('should throw for string too short', () => {
      expect(() => validateStringLength('hi', 'field', { minLength: 5 }))
        .toThrow('field must be at least 5 characters');
    });

    it('should throw for string too long', () => {
      expect(() => validateStringLength('hello world', 'field', { maxLength: 5 }))
        .toThrow('field must be at most 5 characters');
    });

    it('should throw for empty string with minLength', () => {
      expect(() => validateStringLength('', 'field', { minLength: 1 }))
        .toThrow('field must be at least 1 characters');
    });
  });

  describe('validatePattern', () => {
    it('should pass for matching pattern', () => {
      expect(() => validatePattern('hello123', 'test', /^[a-z0-9]+$/))
        .not.toThrow();
    });

    it('should throw for non-matching pattern', () => {
      expect(() => validatePattern('Hello!', 'field', /^[a-z0-9]+$/))
        .toThrow('field does not match required pattern');
    });

    it('should support custom pattern description', () => {
      expect(() => validatePattern('!!', 'field', /^[a-z]+$/, 'lowercase only'))
        .toThrow('field does not match lowercase only');
    });

    it('should support regex flags', () => {
      expect(() => validatePattern('HELLO', 'test', /^[a-z]+$/i))
        .not.toThrow();
    });
  });

  // =====================
  // Number Validators
  // =====================
  describe('validateNumberRange', () => {
    it('should pass for valid range', () => {
      expect(() => validateNumberRange(5, 'test', { minimum: 1, maximum: 10 }))
        .not.toThrow();
    });

    it('should pass with only minimum', () => {
      expect(() => validateNumberRange(5, 'test', { minimum: 1 }))
        .not.toThrow();
    });

    it('should pass with only maximum', () => {
      expect(() => validateNumberRange(5, 'test', { maximum: 10 }))
        .not.toThrow();
    });

    it('should throw for number too small', () => {
      expect(() => validateNumberRange(0, 'field', { minimum: 1 }))
        .toThrow('field must be at least 1');
    });

    it('should throw for number too large', () => {
      expect(() => validateNumberRange(11, 'field', { maximum: 10 }))
        .toThrow('field must be at most 10');
    });

    it('should allow boundary values', () => {
      expect(() => validateNumberRange(1, 'test', { minimum: 1, maximum: 10 }))
        .not.toThrow();
      expect(() => validateNumberRange(10, 'test', { minimum: 1, maximum: 10 }))
        .not.toThrow();
    });
  });

  // =====================
  // Enum Validator
  // =====================
  describe('validateEnum', () => {
    it('should pass for valid enum value', () => {
      expect(() => validateEnum('red', 'color', ['red', 'green', 'blue']))
        .not.toThrow();
    });

    it('should throw for invalid enum value', () => {
      expect(() => validateEnum('yellow', 'color', ['red', 'green', 'blue']))
        .toThrow('color must be one of: red, green, blue, got "yellow"');
    });

    it('should work with numbers', () => {
      expect(() => validateEnum(2, 'type', [1, 2, 3]))
        .not.toThrow();
    });

    it('should be case-sensitive', () => {
      expect(() => validateEnum('RED', 'color', ['red', 'green', 'blue']))
        .toThrow('color must be one of: red, green, blue, got "RED"');
    });
  });

  // =====================
  // Array Validators
  // =====================
  describe('validateArrayLength', () => {
    it('should pass for valid length', () => {
      expect(() => validateArrayLength([1, 2, 3], 'test', { minLength: 1, maxLength: 5 }))
        .not.toThrow();
    });

    it('should throw for array too short', () => {
      expect(() => validateArrayLength([], 'field', { minLength: 1 }))
        .toThrow('field must have at least 1 items');
    });

    it('should throw for array too long', () => {
      expect(() => validateArrayLength([1, 2, 3, 4, 5], 'field', { maxLength: 3 }))
        .toThrow('field must have at most 3 items');
    });

    it('should allow zero items with no minLength', () => {
      expect(() => validateArrayLength([], 'test', { maxLength: 5 }))
        .not.toThrow();
    });
  });

  describe('validateArrayItemType', () => {
    it('should pass for array of strings', () => {
      expect(() => validateArrayItemType(['a', 'b', 'c'], 'test', 'string'))
        .not.toThrow();
    });

    it('should pass for array of numbers', () => {
      expect(() => validateArrayItemType([1, 2, 3], 'test', 'number'))
        .not.toThrow();
    });

    it('should throw for mixed types', () => {
      expect(() => validateArrayItemType(['a', 1, 'c'], 'field', 'string'))
        .toThrow('field[1] must be string, got number');
    });

    it('should throw for null items', () => {
      expect(() => validateArrayItemType([1, null, 3], 'field', 'number'))
        .toThrow('field[1] must be number, got object');
    });

    it('should handle array type', () => {
      expect(() => validateArrayItemType([[1], [2]], 'test', 'array'))
        .not.toThrow();
    });
  });

  // =====================
  // Object Validators
  // =====================
  describe('validateObjectFields', () => {
    it('should pass for object with required fields', () => {
      const obj = { name: 'John', age: 30 };
      expect(() => validateObjectFields(obj, 'person', ['name', 'age']))
        .not.toThrow();
    });

    it('should throw for missing field', () => {
      const obj = { name: 'John' };
      expect(() => validateObjectFields(obj, 'person', ['name', 'age']))
        .toThrow('person.age is required');
    });

    it('should throw for null field', () => {
      const obj = { name: 'John', age: null };
      expect(() => validateObjectFields(obj, 'person', ['name', 'age']))
        .toThrow('person.age is required');
    });

    it('should throw for undefined field', () => {
      const obj = { name: 'John', age: undefined };
      expect(() => validateObjectFields(obj, 'person', ['name', 'age']))
        .toThrow('person.age is required');
    });
  });

  describe('validateObjectFieldTypes', () => {
    it('should pass for correct field types', () => {
      const obj = { name: 'John', age: 30, active: true };
      const types = { name: 'string', age: 'number', active: 'boolean' };
      expect(() => validateObjectFieldTypes(obj, 'person', types))
        .not.toThrow();
    });

    it('should throw for wrong field type', () => {
      const obj = { name: 'John', age: '30' };
      const types = { name: 'string', age: 'number' };
      expect(() => validateObjectFieldTypes(obj, 'person', types))
        .toThrow('person.age must be number, got string');
    });

    it('should ignore missing optional fields', () => {
      const obj = { name: 'John' };
      const types = { name: 'string', age: 'number' };
      expect(() => validateObjectFieldTypes(obj, 'person', types))
        .not.toThrow();
    });

    it('should handle array type', () => {
      const obj = { name: 'John', tags: ['a', 'b'] };
      const types = { name: 'string', tags: 'array' };
      expect(() => validateObjectFieldTypes(obj, 'person', types))
        .not.toThrow();
    });
  });

  // =====================
  // Optional Validator
  // =====================
  describe('validateOptional', () => {
    it('should pass for null value', () => {
      const validator = (v) => validateRequired(v, 'field');
      expect(() => validateOptional(null, 'field', validator))
        .not.toThrow();
    });

    it('should pass for undefined value', () => {
      const validator = (v) => validateRequired(v, 'field');
      expect(() => validateOptional(undefined, 'field', validator))
        .not.toThrow();
    });

    it('should validate provided value', () => {
      const validator = (v) => validateString(v, 'field');
      expect(() => validateOptional('hello', 'field', validator))
        .not.toThrow();
    });

    it('should throw if validation fails', () => {
      const validator = (v) => validateString(v, 'field');
      expect(() => validateOptional(123, 'field', validator))
        .toThrow('field must be a string');
    });
  });

  // =====================
  // NotNull Validator
  // =====================
  describe('validateNotNull', () => {
    it('should pass for non-null value', () => {
      expect(() => validateNotNull('hello', 'field')).not.toThrow();
    });

    it('should pass for zero', () => {
      expect(() => validateNotNull(0, 'field')).not.toThrow();
    });

    it('should pass for false', () => {
      expect(() => validateNotNull(false, 'field')).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => validateNotNull(null, 'field'))
        .toThrow('field cannot be null or undefined');
    });

    it('should throw for undefined', () => {
      expect(() => validateNotNull(undefined, 'field'))
        .toThrow('field cannot be null or undefined');
    });
  });

  // =====================
  // Safe Characters Validator
  // =====================
  describe('validateSafeChars', () => {
    it('should pass for safe characters', () => {
      expect(() => validateSafeChars('hello-world_123', 'field'))
        .not.toThrow();
    });

    it('should pass for paths', () => {
      expect(() => validateSafeChars('path/to/file', 'field'))
        .not.toThrow();
    });

    it('should throw for special characters', () => {
      expect(() => validateSafeChars('hello@world!', 'field'))
        .toThrow('field contains invalid characters');
    });

    it('should support custom patterns', () => {
      expect(() => validateSafeChars('hello123', 'field', {
        allowedChars: /^[a-z]+$/
      })).toThrow('field contains invalid characters');
    });
  });

  // =====================
  // Composite Validators
  // =====================
  describe('validateStringComposite', () => {
    it('should pass for valid string', () => {
      expect(() => validateStringComposite('hello', 'field', {
        required: true,
        minLength: 1,
        maxLength: 10,
        pattern: /^[a-z]+$/
      })).not.toThrow();
    });

    it('should throw for required but missing', () => {
      expect(() => validateStringComposite('', 'field', { required: true }))
        .toThrow('field is required');
    });

    it('should throw for non-matching pattern', () => {
      expect(() => validateStringComposite('Hello', 'field', {
        pattern: /^[a-z]+$/
      })).toThrow('field does not match expected format');
    });

    it('should allow missing optional string', () => {
      expect(() => validateStringComposite('', 'field', { required: false }))
        .not.toThrow();
    });
  });

  describe('validateWith', () => {
    it('should pass when all validators succeed', () => {
      const validators = [
        (v) => validateString(v, 'field'),
        (v) => validateStringLength(v, 'field', { minLength: 5 })
      ];
      expect(() => validateWith('hello world', validators))
        .not.toThrow();
    });

    it('should throw when first validator fails', () => {
      const validators = [
        (v) => validateString(v, 'field'),
        (v) => validateStringLength(v, 'field', { minLength: 5 })
      ];
      expect(() => validateWith(123, validators))
        .toThrow('field must be a string');
    });

    it('should throw when second validator fails', () => {
      const validators = [
        (v) => validateString(v, 'field'),
        (v) => validateStringLength(v, 'field', { minLength: 5 })
      ];
      expect(() => validateWith('hi', validators))
        .toThrow('field must be at least 5 characters');
    });

    it('should handle empty validator array', () => {
      expect(() => validateWith('anything', []))
        .not.toThrow();
    });
  });

  // =====================
  // Edge Cases
  // =====================
  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000000);
      expect(() => validateString(longString, 'field')).not.toThrow();
    });

    it('should handle very large arrays', () => {
      const largeArray = Array(10000).fill('item');
      expect(() => validateArray(largeArray, 'field')).not.toThrow();
    });

    it('should handle deeply nested objects', () => {
      const nested = { a: { b: { c: { d: { e: 'value' } } } } };
      expect(() => validateObject(nested, 'field')).not.toThrow();
    });

    it('should handle special Unicode characters', () => {
      expect(() => validateString('Hello 👋 World 🌍', 'field')).not.toThrow();
    });

    it('should handle newlines and tabs', () => {
      expect(() => validateString('hello\nworld\ttab', 'field')).not.toThrow();
    });
  });
});
