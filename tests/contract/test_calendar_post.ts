/**
 * コントラクトテスト: POST /api/calendar
 * カレンダー記録作成・更新APIの契約をテスト
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

const API_BASE = 'http://localhost:3000';
const endpoint = '/api/calendar';

describe('POST /api/calendar Contract Test', () => {
  let validPayload: any;

  beforeEach(() => {
    validPayload = {
      userId: 'test-user-123',
      recordDate: '2025-09-14', // 日付のみ（YYYY-MM-DD形式）
      measurementCompleted: false,
      physicalConditionNote: '体調良好',
      moodNote: '前向きな気分',
      rehabNote: 'リハビリ順調に進行中',
    };
  });

  it('should return 201 for new calendar record creation', async () => {
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
    expect(responseData).toHaveProperty('recordDate', validPayload.recordDate);
    expect(responseData).toHaveProperty(
      'measurementCompleted',
      validPayload.measurementCompleted
    );
    expect(responseData).toHaveProperty('createdAt');
    expect(responseData).toHaveProperty('updatedAt');
  });

  it('should handle measurement completion with measurementId', async () => {
    const payloadWithMeasurement = {
      ...validPayload,
      measurementCompleted: true,
      measurementId: 'measurement-abc-123',
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadWithMeasurement),
    });

    expect(response.status).toBe(201);

    const responseData = await response.json();
    expect(responseData.measurementCompleted).toBe(true);
    expect(responseData.measurementId).toBe(
      payloadWithMeasurement.measurementId
    );
  });

  it('should update existing record (upsert behavior)', async () => {
    // 最初の作成
    const firstResponse = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    });

    expect(firstResponse.status).toBe(201);
    const firstData = await firstResponse.json();

    // 同じ日付での更新
    const updatePayload = {
      ...validPayload,
      physicalConditionNote: '更新された体調メモ',
      measurementCompleted: true,
      measurementId: 'new-measurement-123',
    };

    const updateResponse = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    expect(updateResponse.status).toBe(201);
    const updateData = await updateResponse.json();

    // 同じIDで更新されることを確認（upsert動作）
    expect(updateData.id).toBe(firstData.id);
    expect(updateData.physicalConditionNote).toBe('更新された体調メモ');
    expect(updateData.measurementCompleted).toBe(true);
    expect(updateData.updatedAt).not.toBe(firstData.updatedAt);
  });

  it('should return 400 for missing required fields', async () => {
    const invalidPayload = {
      recordDate: '2025-09-14',
      // userIdが不足
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
    expect(errorData.error.toLowerCase()).toContain('userid');
  });

  it('should return 400 for invalid date format', async () => {
    const invalidPayload = {
      ...validPayload,
      recordDate: '2025/09/14', // 不正な形式（YYYY-MM-DD以外）
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

  it('should return 400 for note length limits exceeded', async () => {
    const invalidPayload = {
      ...validPayload,
      physicalConditionNote: 'a'.repeat(501), // 500文字制限超過
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
    expect(errorData.error).toContain('length');
  });

  it('should return 400 for mood note length limit exceeded', async () => {
    const invalidPayload = {
      ...validPayload,
      moodNote: 'a'.repeat(301), // 300文字制限超過
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

  it('should return 400 when measurementCompleted=true but measurementId is missing', async () => {
    const invalidPayload = {
      ...validPayload,
      measurementCompleted: true,
      // measurementIdが不足
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
    expect(errorData.error).toContain('measurementId');
  });

  it('should accept minimal payload with only required fields', async () => {
    const minimalPayload = {
      userId: 'test-user-456',
      recordDate: '2025-09-15',
      measurementCompleted: false,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalPayload),
    });

    expect(response.status).toBe(201);

    const responseData = await response.json();
    expect(responseData.userId).toBe(minimalPayload.userId);
    expect(responseData.measurementCompleted).toBe(false);
    expect(responseData.physicalConditionNote).toBeUndefined();
    expect(responseData.moodNote).toBeUndefined();
    expect(responseData.rehabNote).toBeUndefined();
  });
});
