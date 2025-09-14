/**
 * コントラクトテスト: GET /api/calendar
 * カレンダー記録取得APIの契約をテスト
 */
import { describe, it, expect } from '@jest/globals';

const API_BASE = 'http://localhost:3000';
const endpoint = '/api/calendar';

describe('GET /api/calendar Contract Test', () => {
  const testUserId = 'test-user-123';

  it('should return 200 with calendar records for valid parameters', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      year: '2025',
      month: '9',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('records');
    expect(Array.isArray(responseData.records)).toBe(true);
  });

  it('should return calendar records with correct structure', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      year: '2025',
      month: '9',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);
    const responseData = await response.json();

    if (responseData.records.length > 0) {
      const record = responseData.records[0];
      
      // 必須フィールドの検証
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('userId');
      expect(record).toHaveProperty('recordDate');
      expect(record).toHaveProperty('measurementCompleted');
      expect(record).toHaveProperty('createdAt');
      expect(record).toHaveProperty('updatedAt');
      
      // 型の検証
      expect(typeof record.measurementCompleted).toBe('boolean');
      
      // 測定完了時のmeasurementIdの検証
      if (record.measurementCompleted) {
        expect(record).toHaveProperty('measurementId');
        expect(typeof record.measurementId).toBe('string');
      }
      
      // オプショナルフィールドの型検証
      if (record.physicalConditionNote) {
        expect(typeof record.physicalConditionNote).toBe('string');
        expect(record.physicalConditionNote.length).toBeLessThanOrEqual(500);
      }
      
      if (record.moodNote) {
        expect(typeof record.moodNote).toBe('string');
        expect(record.moodNote.length).toBeLessThanOrEqual(300);
      }
      
      if (record.rehabNote) {
        expect(typeof record.rehabNote).toBe('string');
        expect(record.rehabNote.length).toBeLessThanOrEqual(500);
      }
    }
  });

  it('should filter records by specified year and month', async () => {
    const year = 2025;
    const month = 9;
    
    const params = new URLSearchParams({
      userId: testUserId,
      year: year.toString(),
      month: month.toString(),
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);
    const responseData = await response.json();

    // 指定された年月の記録のみ返されることを確認
    responseData.records.forEach((record: any) => {
      const recordDate = new Date(record.recordDate);
      expect(recordDate.getFullYear()).toBe(year);
      expect(recordDate.getMonth() + 1).toBe(month); // getMonth()は0ベース
    });
  });

  it('should return 400 for missing userId', async () => {
    const params = new URLSearchParams({
      year: '2025',
      month: '9',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error.toLowerCase()).toContain('userid');
  });

  it('should return 400 for missing year', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      month: '9',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error.toLowerCase()).toContain('year');
  });

  it('should return 400 for missing month', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      year: '2025',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error.toLowerCase()).toContain('month');
  });

  it('should return 400 for invalid month range', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      year: '2025',
      month: '13', // 1-12の範囲外
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid year format', async () => {
    const params = new URLSearchParams({
      userId: testUserId,
      year: 'invalid',
      month: '9',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(400);
  });

  it('should return empty array for months with no records', async () => {
    const params = new URLSearchParams({
      userId: 'non-existent-user',
      year: '2025',
      month: '1',
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params}`);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.records).toEqual([]);
  });
});
