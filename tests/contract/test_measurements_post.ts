/**
 * コントラクトテスト: POST /api/measurements
 * 測定データ保存APIの契約をテスト
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

const API_BASE = 'http://localhost:3000';
const endpoint = '/api/measurements';

describe('POST /api/measurements Contract Test', () => {
  let validPayload: any;

  beforeEach(() => {
    validPayload = {
      userId: 'test-user-123',
      measurementDate: new Date().toISOString(),
      wristFlexion: 45.5,
      wristExtension: 35.2,
      wristUlnarDeviation: 25.8,
      wristRadialDeviation: 15.1,
      thumbFlexion: 60.3,
      thumbExtension: 0,
      thumbAdduction: 0,
      thumbAbduction: 40.7,
      accuracyScore: 0.85,
      handUsed: 'right' as const,
    };
  });

  it('should return 201 with measurement data for valid payload', async () => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(201);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('id');
    expect(responseData).toHaveProperty('userId', validPayload.userId);
    expect(responseData).toHaveProperty('comparisonResult');
    expect(responseData.comparisonResult).toHaveProperty('overallStatus');
  });

  it('should return 400 for missing required fields', async () => {
    const invalidPayload = { userId: 'test-user-123' }; // 必須フィールド不足

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error).toContain('validation');
  });

  it('should return 400 for invalid angle values', async () => {
    const invalidPayload = {
      ...validPayload,
      wristFlexion: -10, // 負の値は無効
      wristExtension: 100, // 正常範囲超過
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
  });

  it('should return 400 for invalid handUsed value', async () => {
    const invalidPayload = {
      ...validPayload,
      handUsed: 'both', // 'left' | 'right' のみ有効
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    expect(response.status).toBe(400);
  });

  it('should include comparison result with normal ranges', async () => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(201);
    
    const responseData = await response.json();
    
    // comparisonResultの構造検証
    expect(responseData.comparisonResult).toHaveProperty('wristFlexion');
    expect(responseData.comparisonResult).toHaveProperty('wristExtension');
    expect(responseData.comparisonResult).toHaveProperty('thumbFlexion');
    expect(responseData.comparisonResult).toHaveProperty('thumbAbduction');
    expect(responseData.comparisonResult).toHaveProperty('overallStatus');
    
    // 正常範囲ステータスの検証
    expect(['normal', 'below_normal', 'above_normal']).toContain(
      responseData.comparisonResult.overallStatus
    );
  });
});
