/**
 * ユニットテスト: データ検証
 * 
 * テスト対象:
 * - 測定データの妥当性検証
 * -const validateMotionMeasurement = (data: any): string[] => {
  const errors: stconst validateCalendarRecord = (data: any): string[] => {
  const errors: const validateUser = (data: any): string[] => {
  const errors: string[] = [];

  // nullやundefinedのチェック
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return errors;
  }

  // 必須フィールドの検証
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  } = [];

  // nullやundefinedのチェック
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return errors;
  }

  // 必須フィールドの検証
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  }= [];

  // nullやundefinedのチェック
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return errors;
  }

  // 必須フィールドの検証
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  }録データの検証
 * - ユーザーデータの検証
 * - API入力値の検証
 * - エラーハンドリング
 */

import { describe, test, expect } from '@jest/globals';

// テスト対象の型定義
interface MotionMeasurement {
  id: string;
  userId: string;
  measurementDate: Date;
  handUsed: 'left' | 'right';
  measurementType: 'wrist-flexion' | 'wrist-extension' | 'thumb-abduction' | 'thumb-adduction';
  angleValue: number;
  accuracy: number;
  landmarks?: Array<{ x: number; y: number; z: number }>;
  metadata?: {
    deviceInfo?: string;
    appVersion?: string;
    sessionDuration?: number;
  };
}

interface CalendarRecord {
  id: string;
  userId: string;
  recordDate: Date;
  rehabCompleted: boolean;
  measurementCompleted: boolean;
  painLevel?: 1 | 2 | 3 | 4 | 5;
  motivationLevel?: 1 | 2 | 3 | 4 | 5;
  performanceLevel?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  handDominance?: 'left' | 'right';
  medicalConditions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 検証関数の実装
const validateMotionMeasurement = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // nullやundefinedのチェック
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return { isValid: false, errors };
  }

  // 必須フィールドの検証
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('User ID is required and must be a string');
  }

  if (!data.measurementDate) {
    errors.push('Measurement date is required');
  } else if (!(data.measurementDate instanceof Date) && isNaN(Date.parse(data.measurementDate))) {
    errors.push('Measurement date must be a valid date');
  }

  if (!data.handUsed || !['left', 'right'].includes(data.handUsed)) {
    errors.push('Hand used must be either "left" or "right"');
  }

  const validMeasurementTypes = ['wrist-flexion', 'wrist-extension', 'thumb-abduction', 'thumb-adduction'];
  if (!data.measurementType || !validMeasurementTypes.includes(data.measurementType)) {
    errors.push(`Measurement type must be one of: ${validMeasurementTypes.join(', ')}`);
  }

  if (data.angleValue === undefined || data.angleValue === null) {
    errors.push('Angle value is required');
  } else if (typeof data.angleValue !== 'number' || isNaN(data.angleValue)) {
    errors.push('Angle value must be a valid number');
  } else if (data.angleValue < 0 || data.angleValue > 180) {
    errors.push('Angle value must be between 0 and 180 degrees');
  }

  if (data.accuracy === undefined || data.accuracy === null) {
    errors.push('Accuracy is required');
  } else if (typeof data.accuracy !== 'number' || isNaN(data.accuracy)) {
    errors.push('Accuracy must be a valid number');
  } else if (data.accuracy < 0 || data.accuracy > 1) {
    errors.push('Accuracy must be between 0 and 1');
  }

  // オプションフィールドの検証
  if (data.landmarks !== undefined) {
    if (!Array.isArray(data.landmarks)) {
      errors.push('Landmarks must be an array');
    } else if (data.landmarks.length !== 21) {
      errors.push('Landmarks array must contain exactly 21 points');
    } else {
      data.landmarks.forEach((landmark: any, index: number) => {
        if (!landmark || typeof landmark !== 'object') {
          errors.push(`Landmark ${index} must be an object`);
        } else {
          ['x', 'y', 'z'].forEach(coord => {
            if (typeof landmark[coord] !== 'number' || isNaN(landmark[coord])) {
              errors.push(`Landmark ${index}.${coord} must be a valid number`);
            }
          });
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
};

const validateCalendarRecord = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // nullやundefinedのチェック
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return { isValid: false, errors };
  }

  // 必須フィールドの検証
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('User ID is required and must be a string');
  }

  if (!data.recordDate) {
    errors.push('Record date is required');
  } else if (!(data.recordDate instanceof Date) && isNaN(Date.parse(data.recordDate))) {
    errors.push('Record date must be a valid date');
  }

  if (typeof data.rehabCompleted !== 'boolean') {
    errors.push('Rehab completed must be a boolean');
  }

  if (typeof data.measurementCompleted !== 'boolean') {
    errors.push('Measurement completed must be a boolean');
  }

  if (!data.createdAt) {
    errors.push('Created at is required');
  } else if (!(data.createdAt instanceof Date) && isNaN(Date.parse(data.createdAt))) {
    errors.push('Created at must be a valid date');
  }

  if (!data.updatedAt) {
    errors.push('Updated at is required');
  } else if (!(data.updatedAt instanceof Date) && isNaN(Date.parse(data.updatedAt))) {
    errors.push('Updated at must be a valid date');
  }

  // オプションフィールドの検証
  const validLevels = [1, 2, 3, 4, 5];
  
  if (data.painLevel !== undefined && !validLevels.includes(data.painLevel)) {
    errors.push('Pain level must be 1, 2, 3, 4, or 5');
  }

  if (data.motivationLevel !== undefined && !validLevels.includes(data.motivationLevel)) {
    errors.push('Motivation level must be 1, 2, 3, 4, or 5');
  }

  if (data.performanceLevel !== undefined && !validLevels.includes(data.performanceLevel)) {
    errors.push('Performance level must be 1, 2, 3, 4, or 5');
  }

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    errors.push('Notes must be a string');
  } else if (data.notes && data.notes.length > 500) {
    errors.push('Notes must be 500 characters or less');
  }

  return { isValid: errors.length === 0, errors };
};

const validateUser = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // nullやundefinedのチェック
  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return { isValid: false, errors };
  }

  // 必須フィールドの検証
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email must be a valid email address');
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (data.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  } else if (data.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (!data.createdAt) {
    errors.push('Created at is required');
  } else if (!(data.createdAt instanceof Date) && isNaN(Date.parse(data.createdAt))) {
    errors.push('Created at must be a valid date');
  }

  if (!data.updatedAt) {
    errors.push('Updated at is required');
  } else if (!(data.updatedAt instanceof Date) && isNaN(Date.parse(data.updatedAt))) {
    errors.push('Updated at must be a valid date');
  }

  // オプションフィールドの検証
  if (data.age !== undefined) {
    if (typeof data.age !== 'number' || isNaN(data.age)) {
      errors.push('Age must be a valid number');
    } else if (data.age < 0 || data.age > 150) {
      errors.push('Age must be between 0 and 150');
    }
  }

  if (data.gender !== undefined && !['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Gender must be "male", "female", or "other"');
  }

  if (data.handDominance !== undefined && !['left', 'right'].includes(data.handDominance)) {
    errors.push('Hand dominance must be "left" or "right"');
  }

  if (data.medicalConditions !== undefined) {
    if (!Array.isArray(data.medicalConditions)) {
      errors.push('Medical conditions must be an array');
    } else {
      data.medicalConditions.forEach((condition: any, index: number) => {
        if (typeof condition !== 'string') {
          errors.push(`Medical condition ${index} must be a string`);
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// バリデーション関数
const sanitizeAndValidateData = <T>(data: any, validator: (data: any) => { isValid: boolean; errors: string[] }): T | null => {
  try {
    // nullやundefinedのチェック
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be a valid object');
    }

    // 日付文字列をDateオブジェクトに変換
    const sanitizedData = { ...data };
    
    if (sanitizedData.measurementDate && typeof sanitizedData.measurementDate === 'string') {
      sanitizedData.measurementDate = new Date(sanitizedData.measurementDate);
    }
    
    if (sanitizedData.recordDate && typeof sanitizedData.recordDate === 'string') {
      sanitizedData.recordDate = new Date(sanitizedData.recordDate);
    }
    
    if (sanitizedData.createdAt && typeof sanitizedData.createdAt === 'string') {
      sanitizedData.createdAt = new Date(sanitizedData.createdAt);
    }
    
    if (sanitizedData.updatedAt && typeof sanitizedData.updatedAt === 'string') {
      sanitizedData.updatedAt = new Date(sanitizedData.updatedAt);
    }

    const validation = validator(sanitizedData);
    
    if (validation.isValid) {
      return sanitizedData as T;
    } else {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('Data sanitization and validation failed:', error);
    return null;
  }
};

describe('データ検証テスト', () => {
  describe('MotionMeasurement検証', () => {
    test('有効なMotionMeasurementデータを正しく検証する', () => {
      const validData: MotionMeasurement = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 45.5,
        accuracy: 0.95,
        landmarks: Array(21).fill(0).map((_, i) => ({ x: i * 0.1, y: i * 0.1, z: 0 })),
        metadata: {
          deviceInfo: 'iPhone 13',
          appVersion: '1.0.0',
          sessionDuration: 30000,
        },
      };

      const result = validateMotionMeasurement(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('必須フィールドが不足している場合にエラーを返す', () => {
      const invalidData = {
        // id 不足
        userId: 'user-456',
        // measurementDate 不足
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        // angleValue 不足
        accuracy: 0.95,
      };

      const result = validateMotionMeasurement(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID is required and must be a string');
      expect(result.errors).toContain('Measurement date is required');
      expect(result.errors).toContain('Angle value is required');
    });

    test('無効な角度値でエラーを返す', () => {
      const invalidData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 200, // 範囲外
        accuracy: 0.95,
      };

      const result = validateMotionMeasurement(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Angle value must be between 0 and 180 degrees');
    });

    test('無効な精度値でエラーを返す', () => {
      const invalidData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 45,
        accuracy: 1.5, // 範囲外
      };

      const result = validateMotionMeasurement(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Accuracy must be between 0 and 1');
    });

    test('無効なランドマークデータでエラーを返す', () => {
      const invalidData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 45,
        accuracy: 0.95,
        landmarks: Array(20).fill(0).map(() => ({ x: 0, y: 0, z: 0 })), // 不足
      };

      const result = validateMotionMeasurement(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Landmarks array must contain exactly 21 points');
    });

    test('無効な測定タイプでエラーを返す', () => {
      const invalidData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'invalid-type',
        angleValue: 45,
        accuracy: 0.95,
      };

      const result = validateMotionMeasurement(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Measurement type must be one of: wrist-flexion, wrist-extension, thumb-abduction, thumb-adduction');
    });
  });

  describe('CalendarRecord検証', () => {
    test('有効なCalendarRecordデータを正しく検証する', () => {
      const validData: CalendarRecord = {
        id: 'record-123',
        userId: 'user-456',
        recordDate: new Date(),
        rehabCompleted: true,
        measurementCompleted: false,
        painLevel: 3,
        motivationLevel: 4,
        performanceLevel: 2,
        notes: 'Today was a good day for rehabilitation.',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateCalendarRecord(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('必須フィールドが不足している場合にエラーを返す', () => {
      const invalidData = {
        // id 不足
        userId: 'user-456',
        recordDate: new Date(),
        // rehabCompleted 不足
        measurementCompleted: false,
        createdAt: new Date(),
        // updatedAt 不足
      };

      const result = validateCalendarRecord(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID is required and must be a string');
      expect(result.errors).toContain('Rehab completed must be a boolean');
      expect(result.errors).toContain('Updated at is required');
    });

    test('無効なレベル値でエラーを返す', () => {
      const invalidData = {
        id: 'record-123',
        userId: 'user-456',
        recordDate: new Date(),
        rehabCompleted: true,
        measurementCompleted: false,
        painLevel: 6, // 範囲外
        motivationLevel: 0, // 範囲外
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateCalendarRecord(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pain level must be 1, 2, 3, 4, or 5');
      expect(result.errors).toContain('Motivation level must be 1, 2, 3, 4, or 5');
    });

    test('長すぎるノートでエラーを返す', () => {
      const invalidData = {
        id: 'record-123',
        userId: 'user-456',
        recordDate: new Date(),
        rehabCompleted: true,
        measurementCompleted: false,
        notes: 'A'.repeat(501), // 501文字
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateCalendarRecord(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Notes must be 500 characters or less');
    });
  });

  describe('User検証', () => {
    test('有効なUserデータを正しく検証する', () => {
      const validData: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        age: 35,
        gender: 'male',
        handDominance: 'right',
        medicalConditions: ['Arthritis', 'Previous wrist injury'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効なメールアドレスでエラーを返す', () => {
      const invalidData = {
        id: 'user-123',
        email: 'invalid-email',
        name: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be a valid email address');
    });

    test('空の名前でエラーを返す', () => {
      const invalidData = {
        id: 'user-123',
        email: 'test@example.com',
        name: '   ', // 空白のみ
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be empty');
    });

    test('無効な年齢でエラーを返す', () => {
      const invalidData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        age: -5, // 負の値
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Age must be between 0 and 150');
    });

    test('無効な性別でエラーを返す', () => {
      const invalidData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        gender: 'unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Gender must be "male", "female", or "other"');
    });
  });

  describe('データサニタイゼーション', () => {
    test('文字列の日付をDateオブジェクトに変換する', () => {
      const inputData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: '2025-01-15T10:30:00.000Z',
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 45,
        accuracy: 0.95,
      };

      const result = sanitizeAndValidateData<MotionMeasurement>(inputData, validateMotionMeasurement);
      expect(result).not.toBeNull();
      expect(result?.measurementDate).toBeInstanceOf(Date);
    });

    test('無効なデータの場合nullを返す', () => {
      const invalidData = {
        // 必須フィールドが不足
        userId: 'user-456',
      };

      const result = sanitizeAndValidateData<MotionMeasurement>(invalidData, validateMotionMeasurement);
      expect(result).toBeNull();
    });
  });

  describe('エッジケースの処理', () => {
    test('null値に対してエラーを返す', () => {
      const result = validateMotionMeasurement(null);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('undefined値に対してエラーを返す', () => {
      const result = validateMotionMeasurement(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('空のオブジェクトに対してエラーを返す', () => {
      const result = validateMotionMeasurement({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('文字列型の数値を適切に処理する', () => {
      const inputData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: '45.5', // 文字列
        accuracy: '0.95', // 文字列
      };

      // 型変換は別途実装する必要があるが、検証はstring型で失敗することを確認
      const result = validateMotionMeasurement(inputData);
      expect(result.isValid).toBe(false);
    });

    test('特殊な日付値を適切に処理する', () => {
      const inputData = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: 'invalid-date',
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 45,
        accuracy: 0.95,
      };

      const result = validateMotionMeasurement(inputData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Measurement date must be a valid date');
    });
  });

  describe('境界値テスト', () => {
    test('角度値の境界値（0度、180度）を正しく処理する', () => {
      const data0 = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 0,
        accuracy: 0.95,
      };

      const data180 = {
        ...data0,
        angleValue: 180,
      };

      expect(validateMotionMeasurement(data0).isValid).toBe(true);
      expect(validateMotionMeasurement(data180).isValid).toBe(true);
    });

    test('精度値の境界値（0、1）を正しく処理する', () => {
      const data0 = {
        id: 'measurement-123',
        userId: 'user-456',
        measurementDate: new Date(),
        handUsed: 'right',
        measurementType: 'wrist-flexion',
        angleValue: 45,
        accuracy: 0,
      };

      const data1 = {
        ...data0,
        accuracy: 1,
      };

      expect(validateMotionMeasurement(data0).isValid).toBe(true);
      expect(validateMotionMeasurement(data1).isValid).toBe(true);
    });

    test('名前の文字数制限を正しく処理する', () => {
      const dataValid = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'A'.repeat(100), // 100文字（境界値）
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dataInvalid = {
        ...dataValid,
        name: 'A'.repeat(101), // 101文字（範囲外）
      };

      expect(validateUser(dataValid).isValid).toBe(true);
      expect(validateUser(dataInvalid).isValid).toBe(false);
    });
  });
});
