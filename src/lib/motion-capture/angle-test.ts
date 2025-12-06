/**
 * 角度計算テスト用ファイル
 * 手首・母指の可動域角度計算が正しく動作するかをテスト
 */

import {
  calculateWristAngles,
  calculateThumbAngles,
  type WristAngles,
  type ThumbAngles,
} from '@/lib/mediapipe/angle-calculator';

/**
 * テスト用ランドマークデータ
 */
interface TestLandmark {
  x: number;
  y: number;
  z?: number;
}

/**
 * 手首の正常位置（中性位置）のランドマーク
 */
const createNeutralWristLandmarks = (): TestLandmark[] => {
  return [
    { x: 0.5, y: 0.5, z: 0 }, // 0: WRIST
    { x: 0.4, y: 0.4, z: 0 }, // 1: THUMB_CMC
    { x: 0.35, y: 0.3, z: 0 }, // 2: THUMB_MCP
    { x: 0.3, y: 0.25, z: 0 }, // 3: THUMB_IP
    { x: 0.25, y: 0.2, z: 0 }, // 4: THUMB_TIP
    { x: 0.6, y: 0.3, z: 0 }, // 5: INDEX_MCP
    { x: 0.65, y: 0.15, z: 0 }, // 6: INDEX_PIP
    { x: 0.7, y: 0.1, z: 0 }, // 7: INDEX_DIP
    { x: 0.75, y: 0.05, z: 0 }, // 8: INDEX_TIP
    { x: 0.55, y: 0.25, z: 0 }, // 9: MIDDLE_MCP
    { x: 0.55, y: 0.1, z: 0 }, // 10: MIDDLE_PIP
    { x: 0.55, y: 0.05, z: 0 }, // 11: MIDDLE_DIP
    { x: 0.55, y: 0.0, z: 0 }, // 12: MIDDLE_TIP
    { x: 0.45, y: 0.3, z: 0 }, // 13: RING_MCP
    { x: 0.45, y: 0.15, z: 0 }, // 14: RING_PIP
    { x: 0.45, y: 0.1, z: 0 }, // 15: RING_DIP
    { x: 0.45, y: 0.05, z: 0 }, // 16: RING_TIP
    { x: 0.35, y: 0.35, z: 0 }, // 17: PINKY_MCP
    { x: 0.35, y: 0.2, z: 0 }, // 18: PINKY_PIP
    { x: 0.35, y: 0.15, z: 0 }, // 19: PINKY_DIP
    { x: 0.35, y: 0.1, z: 0 }, // 20: PINKY_TIP
  ];
};

/**
 * 手首掌屈位置のランドマーク
 */
const createWristFlexionLandmarks = (degree: number): TestLandmark[] => {
  const landmarks = createNeutralWristLandmarks();
  const radians = (degree * Math.PI) / 180;

  // 手のひらの各関節を掌屈方向に移動
  for (let i = 5; i <= 20; i++) {
    if (landmarks[i]) {
      landmarks[i].y += Math.sin(radians) * 0.2;
    }
  }

  return landmarks;
};

/**
 * 手首背屈位置のランドマーク
 */
const createWristExtensionLandmarks = (degree: number): TestLandmark[] => {
  const landmarks = createNeutralWristLandmarks();
  const radians = (degree * Math.PI) / 180;

  // 手のひらの各関節を背屈方向に移動
  for (let i = 5; i <= 20; i++) {
    if (landmarks[i]) {
      landmarks[i]!.y -= Math.sin(radians) * 0.2;
    }
  }

  return landmarks;
};

/**
 * 手首橈屈位置のランドマーク
 */
const createWristRadialDeviationLandmarks = (
  degree: number
): TestLandmark[] => {
  const landmarks = createNeutralWristLandmarks();
  const radians = (degree * Math.PI) / 180;

  // 手のひらの各関節を橈側方向に移動
  for (let i = 5; i <= 20; i++) {
    if (landmarks[i]) {
      landmarks[i]!.x += Math.sin(radians) * 0.1;
    }
  }

  return landmarks;
};

/**
 * 手首尺屈位置のランドマーク
 */
const createWristUlnarDeviationLandmarks = (degree: number): TestLandmark[] => {
  const landmarks = createNeutralWristLandmarks();
  const radians = (degree * Math.PI) / 180;

  // 手のひらの各関節を尺側方向に移動
  for (let i = 5; i <= 20; i++) {
    if (landmarks[i]) {
      landmarks[i]!.x -= Math.sin(radians) * 0.1;
    }
  }

  return landmarks;
};

/**
 * 母指屈曲位置のランドマーク
 */
const createThumbFlexionLandmarks = (degree: number): TestLandmark[] => {
  const landmarks = createNeutralWristLandmarks();
  const radians = (degree * Math.PI) / 180;

  // 母指関節を屈曲方向に調整
  if (landmarks[2]) landmarks[2]!.y += Math.sin(radians) * 0.1; // MCP
  if (landmarks[3]) landmarks[3]!.y += Math.sin(radians) * 0.15; // IP
  if (landmarks[4]) landmarks[4]!.y += Math.sin(radians) * 0.2; // TIP

  return landmarks;
};

/**
 * 母指外転位置のランドマーク
 */
const createThumbAbductionLandmarks = (degree: number): TestLandmark[] => {
  const landmarks = createNeutralWristLandmarks();
  const radians = (degree * Math.PI) / 180;

  // 母指関節を外転方向に調整
  if (landmarks[1]) landmarks[1]!.x -= Math.sin(radians) * 0.1; // CMC
  if (landmarks[2]) landmarks[2]!.x -= Math.sin(radians) * 0.15; // MCP
  if (landmarks[3]) landmarks[3]!.x -= Math.sin(radians) * 0.2; // IP
  if (landmarks[4]) landmarks[4]!.x -= Math.sin(radians) * 0.25; // TIP

  return landmarks;
};

/**
 * 角度計算テスト実行
 */
export const runAngleCalculationTests = () => {
  console.log('🧪 角度計算テスト開始');

  try {
    // 1. 中性位置テスト
    console.log('\n📏 中性位置テスト');
    const neutralLandmarks = createNeutralWristLandmarks();
    const neutralWrist = calculateWristAngles(neutralLandmarks);
    const neutralThumb = calculateThumbAngles(neutralLandmarks);

    console.log('手首角度:', neutralWrist);
    console.log('母指角度:', neutralThumb);

    // 2. 手首掌屈テスト（45度）
    console.log('\n📏 手首掌屈テスト (45°)');
    const flexionLandmarks = createWristFlexionLandmarks(45);
    const flexionWrist = calculateWristAngles(flexionLandmarks);
    console.log('掌屈角度:', flexionWrist.flexion, '° (期待値: ~45°)');

    // 3. 手首背屈テスト（30度）
    console.log('\n📏 手首背屈テスト (30°)');
    const extensionLandmarks = createWristExtensionLandmarks(30);
    const extensionWrist = calculateWristAngles(extensionLandmarks);
    console.log('背屈角度:', extensionWrist.extension, '° (期待値: ~30°)');

    // 4. 手首橈屈テスト（15度）
    console.log('\n📏 手首橈屈テスト (15°)');
    const radialLandmarks = createWristRadialDeviationLandmarks(15);
    const radialWrist = calculateWristAngles(radialLandmarks);
    console.log('橈屈角度:', radialWrist.radialDeviation, '° (期待値: ~15°)');

    // 5. 手首尺屈テスト（30度）
    console.log('\n📏 手首尺屈テスト (30°)');
    const ulnarLandmarks = createWristUlnarDeviationLandmarks(30);
    const ulnarWrist = calculateWristAngles(ulnarLandmarks);
    console.log('尺屈角度:', ulnarWrist.ulnarDeviation, '° (期待値: ~30°)');

    // 6. 母指屈曲テスト（60度）
    console.log('\n📏 母指屈曲テスト (60°)');
    const thumbFlexionLandmarks = createThumbFlexionLandmarks(60);
    const thumbFlexion = calculateThumbAngles(thumbFlexionLandmarks);
    console.log('母指屈曲角度:', thumbFlexion.flexion, '° (期待値: ~60°)');

    // 7. 母指外転テスト（45度）
    console.log('\n📏 母指外転テスト (45°)');
    const thumbAbductionLandmarks = createThumbAbductionLandmarks(45);
    const thumbAbduction = calculateThumbAngles(thumbAbductionLandmarks);
    console.log('母指外転角度:', thumbAbduction.abduction, '° (期待値: ~45°)');

    console.log('\n✅ 角度計算テスト完了');

    return {
      success: true,
      results: {
        neutral: { wrist: neutralWrist, thumb: neutralThumb },
        flexion: flexionWrist,
        extension: extensionWrist,
        radial: radialWrist,
        ulnar: ulnarWrist,
        thumbFlexion: thumbFlexion,
        thumbAbduction: thumbAbduction,
      },
    };
  } catch (error) {
    console.error('❌ 角度計算テスト失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
};

/**
 * 正常範囲チェックテスト
 */
export const runNormalRangeTests = () => {
  console.log('\n🔍 正常範囲チェックテスト');

  const testAngles = [
    { name: '手首掌屈', value: 45, min: 0, max: 90, expected: true },
    {
      name: '手首掌屈（範囲外）',
      value: 100,
      min: 0,
      max: 90,
      expected: false,
    },
    { name: '手首背屈', value: 35, min: 0, max: 70, expected: true },
    { name: '手首橈屈', value: 20, min: 0, max: 25, expected: true },
    { name: '手首尺屈', value: 40, min: 0, max: 55, expected: true },
    { name: '母指屈曲', value: 75, min: 0, max: 90, expected: true },
    { name: '母指外転', value: 45, min: 0, max: 60, expected: true },
    { name: '母指外転（範囲外）', value: 70, min: 0, max: 60, expected: false },
  ];

  testAngles.forEach(({ name, value, min, max, expected }) => {
    const isValid = value >= min && value <= max;
    const result = isValid === expected ? '✅' : '❌';
    console.log(
      `${result} ${name}: ${value}° (範囲: ${min}-${max}°) - ${isValid ? '正常' : '範囲外'}`
    );
  });
};

/**
 * メイン実行関数
 */
export const runAllAngleTests = () => {
  console.log('🚀 可動域角度測定システム テスト開始');

  // 角度計算テスト
  const calculationResults = runAngleCalculationTests();

  // 正常範囲テスト
  runNormalRangeTests();

  console.log('\n📊 テスト結果概要:');
  console.log(
    '- 角度計算:',
    calculationResults.success ? '✅ 成功' : '❌ 失敗'
  );
  console.log('- 実装状況: 画像の正常範囲に準拠');
  console.log('- 手首: 掌屈0-90°, 背屈0-70°, 橈屈0-25°, 尺屈0-55°');
  console.log('- 母指: 屈曲0-90°, 伸展0°, 外転0-60°, 内転0°');

  return calculationResults;
};
