/**
 * デバッグページ - データベース状態確認
 */

'use client';

import React, { useEffect, useState } from 'react';
import { db, getDatabaseStatus } from '@/lib/data-manager/database';

const DebugPage: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const status = await getDatabaseStatus();
        setDbStatus(status);

        const allMeasurements = await db.measurements.toArray();
        const allRecords = await db.records.toArray();

        setMeasurements(allMeasurements);
        setRecords(allRecords);

        console.log('データベース状態:', status);
        console.log('全測定データ:', allMeasurements);
        console.log('全カレンダー記録:', allRecords);
      } catch (error) {
        console.error('データ取得エラー:', error);
      }
    };

    fetchData();
  }, []);

  const clearDatabase = async () => {
    try {
      await db.measurements.clear();
      await db.records.clear();
      alert('データベースをクリアしました');
      window.location.reload();
    } catch (error) {
      console.error('データベースクリアエラー:', error);
      alert('データベースクリアに失敗しました');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>データベースデバッグ</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>データベース状態</h2>
        <pre>{JSON.stringify(dbStatus, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>測定データ ({measurements.length}件)</h2>
        <div
          style={{
            maxHeight: '300px',
            overflow: 'auto',
            border: '1px solid #ccc',
            padding: '10px',
          }}
        >
          {measurements.map((measurement, index) => (
            <div
              key={index}
              style={{
                marginBottom: '10px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px',
              }}
            >
              <strong>ID:</strong> {measurement.id}
              <br />
              <strong>日時:</strong>{' '}
              {new Date(measurement.measurementDate).toLocaleString()}
              <br />
              <strong>手:</strong> {measurement.handUsed}
              <br />
              <strong>手首屈曲:</strong> {measurement.wristFlexion}°<br />
              <strong>手首伸展:</strong> {measurement.wristExtension}°<br />
              <strong>母指外転:</strong> {measurement.thumbAbduction}°<br />
              <strong>精度:</strong>{' '}
              {(measurement.accuracyScore * 100).toFixed(1)}%<br />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>カレンダー記録 ({records.length}件)</h2>
        <div
          style={{
            maxHeight: '200px',
            overflow: 'auto',
            border: '1px solid #ccc',
            padding: '10px',
          }}
        >
          {records.map((record, index) => (
            <div
              key={index}
              style={{
                marginBottom: '10px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px',
              }}
            >
              <strong>ID:</strong> {record.id}
              <br />
              <strong>日時:</strong>{' '}
              {new Date(record.recordDate).toLocaleString()}
              <br />
              <strong>リハビリ完了:</strong>{' '}
              {record.rehabCompleted ? 'はい' : 'いいえ'}
              <br />
              <strong>測定完了:</strong>{' '}
              {record.measurementCompleted ? 'はい' : 'いいえ'}
              <br />
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={clearDatabase}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          データベースをクリア
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px',
          }}
        >
          再読み込み
        </button>
      </div>
    </div>
  );
};

export default DebugPage;
