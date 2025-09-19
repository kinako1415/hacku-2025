/**
 * 測定データベース - IndexedDB with Dexie.js
 */

import Dexie, { Table } from 'dexie';

/**
 * 測定結果データ
 */
export interface MeasurementResult {
  id?: number;
  sessionId: string;
  timestamp: number;
  hand: 'left' | 'right';
  stepId: string;
  stepName: string;
  angle: number;
  targetAngle: number;
  isCompleted: boolean;
  landmarks?: Array<{ x: number; y: number; z: number }>;
}

/**
 * 測定セッション
 */
export interface MeasurementSession {
  id?: number;
  sessionId: string;
  startTime: number;
  endTime?: number;
  hand: 'left' | 'right';
  isCompleted: boolean;
  totalSteps: number;
  completedSteps: number;
}

/**
 * 測定データベースクラス
 */
class MeasurementDatabase extends Dexie {
  // テーブル定義
  sessions!: Table<MeasurementSession>;
  results!: Table<MeasurementResult>;

  constructor() {
    super('MeasurementDatabase');
    
    this.version(1).stores({
      sessions: '++id, sessionId, startTime, endTime, hand, isCompleted',
      results: '++id, sessionId, timestamp, hand, stepId, stepName, angle, isCompleted'
    });
  }

  /**
   * 新しい測定セッションを開始
   */
  async startSession(hand: 'left' | 'right'): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.sessions.add({
      sessionId,
      startTime: Date.now(),
      hand,
      isCompleted: false,
      totalSteps: 4, // 掌屈、背屈、尺屈、橈屈
      completedSteps: 0,
    });

    return sessionId;
  }

  /**
   * 測定結果を保存
   */
  async saveMeasurementResult(result: Omit<MeasurementResult, 'id' | 'timestamp'>): Promise<void> {
    await this.results.add({
      ...result,
      timestamp: Date.now(),
    });
  }

  /**
   * セッションを完了
   */
  async completeSession(sessionId: string): Promise<void> {
    await this.sessions
      .where('sessionId')
      .equals(sessionId)
      .modify({
        endTime: Date.now(),
        isCompleted: true,
      });
  }

  /**
   * セッションの完了ステップ数を更新
   */
  async updateSessionProgress(sessionId: string, completedSteps: number): Promise<void> {
    await this.sessions
      .where('sessionId')
      .equals(sessionId)
      .modify({ completedSteps });
  }

  /**
   * セッション一覧を取得
   */
  async getSessions(): Promise<MeasurementSession[]> {
    return await this.sessions.orderBy('startTime').reverse().toArray();
  }

  /**
   * セッションの測定結果を取得
   */
  async getSessionResults(sessionId: string): Promise<MeasurementResult[]> {
    return await this.results
      .where('sessionId')
      .equals(sessionId)
      .toArray();
  }

  /**
   * 最新の測定結果を取得
   */
  async getLatestResult(sessionId: string, stepId: string): Promise<MeasurementResult | undefined> {
    const results = await this.results
      .where('sessionId')
      .equals(sessionId)
      .filter(result => result.stepId === stepId)
      .toArray();
    
    return results[results.length - 1];
  }
}

// データベースインスタンスをエクスポート
export const db = new MeasurementDatabase();