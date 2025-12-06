/**
 * コントラクトテスト: GET /api/progress/{userId}
 * 進捗統計データ取得APIの契約をテスト
 */
import { describe, it, expect } from '@jest/globals';

const API_BASE = 'http://localhost:3000';
const baseEndpoint = '/api/progress';

describe('GET /api/progress/{userId} Contract Test', () => {
  const testUserId = 'test-user-123';

  it('should return 200 with progress data for valid userId', async () => {
    const response = await fetch(`${API_BASE}${baseEndpoint}/${testUserId}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('id');
    expect(responseData).toHaveProperty('userId', testUserId);
    expect(responseData).toHaveProperty('calculatedDate');
    expect(responseData).toHaveProperty('weeklyStats');
    expect(responseData).toHaveProperty('monthlyStats');
    expect(responseData).toHaveProperty('recoveryRate');
    expect(responseData).toHaveProperty('predictedRecovery');
    expect(responseData).toHaveProperty('createdAt');
  });

  it('should return progress data with correct weeklyStats structure', async () => {
    const response = await fetch(`${API_BASE}${baseEndpoint}/${testUserId}`);
    const responseData = await response.json();

    const weeklyStats = responseData.weeklyStats;
    expect(weeklyStats).toHaveProperty('week_start');
    expect(weeklyStats).toHaveProperty('measurement_count');
    expect(weeklyStats).toHaveProperty('average_accuracy');
    expect(weeklyStats).toHaveProperty('improvement_trend');

    // データ型の検証
    expect(typeof weeklyStats.measurement_count).toBe('number');
    expect(typeof weeklyStats.average_accuracy).toBe('number');
    expect(['improving', 'stable', 'declining']).toContain(
      weeklyStats.improvement_trend
    );

    // 精度は0-1の範囲
    expect(weeklyStats.average_accuracy).toBeGreaterThanOrEqual(0);
    expect(weeklyStats.average_accuracy).toBeLessThanOrEqual(1);
  });

  it('should return progress data with correct monthlyStats structure', async () => {
    const response = await fetch(`${API_BASE}${baseEndpoint}/${testUserId}`);
    const responseData = await response.json();

    const monthlyStats = responseData.monthlyStats;
    expect(monthlyStats).toHaveProperty('month');
    expect(monthlyStats).toHaveProperty('measurement_count');
    expect(monthlyStats).toHaveProperty('compliance_rate');
    expect(monthlyStats).toHaveProperty('average_progress');

    // データ型の検証
    expect(typeof monthlyStats.measurement_count).toBe('number');
    expect(typeof monthlyStats.compliance_rate).toBe('number');
    expect(typeof monthlyStats.average_progress).toBe('number');

    // 月形式の検証（YYYY-MM）
    expect(monthlyStats.month).toMatch(/^\d{4}-\d{2}$/);

    // レートは0-1の範囲
    expect(monthlyStats.compliance_rate).toBeGreaterThanOrEqual(0);
    expect(monthlyStats.compliance_rate).toBeLessThanOrEqual(1);
  });

  it('should return progress data with correct recoveryRate structure', async () => {
    const response = await fetch(`${API_BASE}${baseEndpoint}/${testUserId}`);
    const responseData = await response.json();

    const recoveryRate = responseData.recoveryRate;
    expect(recoveryRate).toHaveProperty('overall_recovery_percentage');
    expect(recoveryRate).toHaveProperty('per_joint_recovery');

    // 全体回復率の検証
    expect(typeof recoveryRate.overall_recovery_percentage).toBe('number');
    expect(recoveryRate.overall_recovery_percentage).toBeGreaterThanOrEqual(0);
    expect(recoveryRate.overall_recovery_percentage).toBeLessThanOrEqual(100);

    // 関節別回復率の検証
    const perJointRecovery = recoveryRate.per_joint_recovery;
    expect(perJointRecovery).toHaveProperty('wrist_flexion');
    expect(perJointRecovery).toHaveProperty('wrist_extension');
    expect(perJointRecovery).toHaveProperty('wrist_ulnar');
    expect(perJointRecovery).toHaveProperty('wrist_radial');
    expect(perJointRecovery).toHaveProperty('thumb_flexion');
    expect(perJointRecovery).toHaveProperty('thumb_abduction');

    // 各関節の回復率が0-100の範囲
    Object.values(perJointRecovery).forEach((rate) => {
      expect(typeof rate).toBe('number');
      expect(rate as number).toBeGreaterThanOrEqual(0);
      expect(rate as number).toBeLessThanOrEqual(100);
    });
  });

  it('should return progress data with correct predictedRecovery structure', async () => {
    const response = await fetch(`${API_BASE}${baseEndpoint}/${testUserId}`);
    const responseData = await response.json();

    const predictedRecovery = responseData.predictedRecovery;
    expect(predictedRecovery).toHaveProperty('confidence_level');
    expect(predictedRecovery).toHaveProperty('next_milestone_target');

    // 信頼度レベルの検証
    expect(typeof predictedRecovery.confidence_level).toBe('number');
    expect(predictedRecovery.confidence_level).toBeGreaterThanOrEqual(0);
    expect(predictedRecovery.confidence_level).toBeLessThanOrEqual(1);

    // マイルストーンターゲットの検証
    const milestoneTarget = predictedRecovery.next_milestone_target;
    expect(milestoneTarget).toHaveProperty('joint');
    expect(milestoneTarget).toHaveProperty('target_angle');
    expect(milestoneTarget).toHaveProperty('estimated_achievement_date');

    expect(typeof milestoneTarget.joint).toBe('string');
    expect(typeof milestoneTarget.target_angle).toBe('number');
    expect(typeof milestoneTarget.estimated_achievement_date).toBe('string');

    // 完全回復予測日がある場合の検証
    if (predictedRecovery.estimated_full_recovery_date) {
      expect(typeof predictedRecovery.estimated_full_recovery_date).toBe(
        'string'
      );
    }
  });

  it('should return 404 for non-existent userId', async () => {
    const nonExistentUserId = 'non-existent-user-999';
    const response = await fetch(
      `${API_BASE}${baseEndpoint}/${nonExistentUserId}`
    );

    expect(response.status).toBe(404);

    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error).toContain('not found');
  });

  it('should return 400 for invalid userId format', async () => {
    const invalidUserId = ''; // 空のユーザーID
    const response = await fetch(`${API_BASE}${baseEndpoint}/${invalidUserId}`);

    expect(response.status).toBe(400);
  });

  it('should return recent progress data', async () => {
    const response = await fetch(`${API_BASE}${baseEndpoint}/${testUserId}`);
    const responseData = await response.json();

    // 計算日が最近のものであることを確認
    const calculatedDate = new Date(responseData.calculatedDate);
    const now = new Date();
    const daysDiff =
      (now.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60 * 24);

    // 7日以内の計算データであることを期待
    expect(daysDiff).toBeLessThanOrEqual(7);
  });

  it('should handle userId with special characters', async () => {
    const specialUserId = 'user-with-hyphen_and_underscore.123';
    const response = await fetch(
      `${API_BASE}${baseEndpoint}/${encodeURIComponent(specialUserId)}`
    );

    // 特殊文字を含むユーザーIDでも適切に処理されることを確認
    // 404または200が期待される（ユーザーが存在するかによる）
    expect([200, 404]).toContain(response.status);
  });
});
