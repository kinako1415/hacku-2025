/**
 * コントラクトテスト: GET /api/measurements
 * 測定履歴取得APIの契約をテスト
 */
import { describe, it, expect } from '@jest/globals';

const API_BASE = 'http://localhost:3000';
const endpoint = '/api/measurements';

describe('GET /api/measurements Contract Test', () => {
  const testUserId = 'test-user-123';

  it('should return 200 with measurements array for valid userId', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      limit: '10',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('measurements');
    expect(responseData).toHaveProperty('total');
    expect(Array.isArray(responseData.measurements)).toBe(true);
    expect(typeof responseData.total).toBe('number');
  });

  it('should return measurements with correct structure', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      limit: '1',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);
    const responseData = await response.json();

    if (responseData.measurements.length > 0) {
      const measurement = responseData.measurements[0];
      
      // 必須フィールドの検証
      expect(measurement).toHaveProperty('id');
      expect(measurement).toHaveProperty('userId');
      expect(measurement).toHaveProperty('measurementDate');
      expect(measurement).toHaveProperty('wristFlexion');
      expect(measurement).toHaveProperty('wristExtension');
      expect(measurement).toHaveProperty('thumbFlexion');
      expect(measurement).toHaveProperty('thumbAbduction');
      expect(measurement).toHaveProperty('accuracyScore');
      expect(measurement).toHaveProperty('handUsed');
      expect(measurement).toHaveProperty('comparisonResult');
      expect(measurement).toHaveProperty('createdAt');
    }
  });

  it('should filter by date range when provided', async () => {
    const startDate = '2025-09-01';
    const endDate = '2025-09-30';
    
    const params = new URLSearchParams({
      userId: testUserId,
      startDate,
      endDate,
      limit: '50',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    
    // 日付範囲内の測定データのみ返されることを確認
    responseData.measurements.forEach((measurement: any) => {
      const measurementDate = new Date(measurement.measurementDate);
      expect(measurementDate >= new Date(startDate)).toBe(true);
      expect(measurementDate <= new Date(endDate)).toBe(true);
    });
  });

  it('should return 400 for missing userId', async () => {
    const response = await fetch(`${API_BASE}${endpoint}`);

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error.toLowerCase()).toContain('userid');
  });

  it('should return 400 for invalid limit parameter', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      limit: 'invalid',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(400);
  });

  it('should default to limit 30 when not specified', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);
    
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    // デフォルトリミット30を超えないことを確認
    expect(responseData.measurements.length).toBeLessThanOrEqual(30);
  });

  it('should return measurements ordered by measurementDate desc', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      limit: '10',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);
    const responseData = await response.json();

    if (responseData.measurements.length > 1) {
      for (let i = 1; i < responseData.measurements.length; i++) {
        const prevDate = new Date(responseData.measurements[i - 1].measurementDate);
        const currentDate = new Date(responseData.measurements[i].measurementDate);
        expect(prevDate >= currentDate).toBe(true);
      }
    }
  });
});
