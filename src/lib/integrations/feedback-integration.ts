/**
 * エラーハンドリングとユーザーフィードバック統合サービス
 * アプリ全体のエラーハンドリング、トースト通知、エラー境界を管理
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  ReactNode,
} from 'react';

/**
 * 通知タイプ
 */
type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * 通知項目
 */
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  createdAt: Date;
}

/**
 * エラー詳細
 */
interface ErrorDetails {
  code?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

/**
 * エラーレポート
 */
interface ErrorReport {
  error: Error;
  details: ErrorDetails;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
}

/**
 * フィードバック統合状態
 */
interface FeedbackIntegrationState {
  notifications: Notification[];
  errors: ErrorReport[];
  isOnline: boolean;
  isLoading: boolean;
  pendingActions: Array<() => Promise<void>>;
}

/**
 * フィードバック統合コンテキスト
 */
interface FeedbackIntegrationContext {
  // 状態
  notifications: Notification[];
  errors: ErrorReport[];
  isOnline: boolean;
  isLoading: boolean;

  // 通知操作
  showNotification: (
    notification: Omit<Notification, 'id' | 'createdAt'>
  ) => string;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // エラー操作
  reportError: (
    error: Error,
    context?: string,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ) => void;
  clearErrors: () => void;

  // 成功/情報表示のヘルパー
  showSuccess: (title: string, message: string, duration?: number) => string;
  showError: (
    title: string,
    message: string,
    action?: { label: string; onClick: () => void }
  ) => string;
  showWarning: (title: string, message: string, duration?: number) => string;
  showInfo: (title: string, message: string, duration?: number) => string;

  // 操作フィードバック
  withLoading: <T>(
    action: () => Promise<T>,
    loadingMessage?: string
  ) => Promise<T>;
  withErrorHandling: <T>(
    action: () => Promise<T>,
    errorContext?: string
  ) => Promise<T | null>;

  // オフライン対応
  queueOfflineAction: (action: () => Promise<void>) => void;
  retryFailedActions: () => Promise<void>;
}

const FeedbackContext = createContext<FeedbackIntegrationContext | null>(null);

/**
 * フィードバック統合プロバイダー
 */
export const FeedbackIntegrationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [state, setState] = useState<FeedbackIntegrationState>({
    notifications: [],
    errors: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLoading: false,
    pendingActions: [],
  });

  // 通知非表示
  const hideNotification = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  // 通知表示
  const showNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt'>): string => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        createdAt: new Date(),
        dismissible: notification.dismissible ?? true,
      };

      setState((prev) => ({
        ...prev,
        notifications: [...prev.notifications, newNotification],
      }));

      // 自動削除
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          hideNotification(id);
        }, notification.duration);
      }

      return id;
    },
    [hideNotification]
  );

  // 全通知クリア
  const clearAllNotifications = useCallback(() => {
    setState((prev) => ({ ...prev, notifications: [] }));
  }, []);

  // 失敗したアクションの再試行（事前定義）
  const retryFailedActionsRef = useRef<() => Promise<void>>();

  // オンライン状態監視
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      showNotification({
        type: 'success',
        title: 'オンライン',
        message: 'オンラインに戻りました',
      });
      if (retryFailedActionsRef.current) {
        retryFailedActionsRef.current();
      }
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
      showNotification({
        type: 'warning',
        title: '接続なし',
        message: 'オフラインモードで動作しています',
        duration: 5000,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return undefined;
  }, [showNotification]);

  // エラーレポート
  const reportError = useCallback(
    (
      error: Error,
      context?: string,
      severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ) => {
      const errorReport: ErrorReport = {
        error,
        details: {
          timestamp: new Date(),
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : '',
          url: typeof window !== 'undefined' ? window.location.href : '',
          sessionId: getSessionId(),
          additionalData: {
            context,
            stackTrace: error.stack,
          },
        },
        severity,
        ...(context && { context }),
      };

      setState((prev) => ({
        ...prev,
        errors: [...prev.errors, errorReport],
      }));

      // 重要度に応じた通知表示
      if (severity === 'high' || severity === 'critical') {
        showNotification({
          type: 'error',
          title: 'エラーが発生しました',
          message: error.message || '予期しないエラーが発生しました',
          action: {
            label: '詳細',
            onClick: () => console.error('Error details:', errorReport),
          },
        });
      }

      // 開発環境でのログ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Error reported:', errorReport);
      }

      // エラーログの保存（実際の実装では外部サービスに送信）
      saveErrorLog(errorReport);
    },
    [showNotification]
  );

  // エラークリア
  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, errors: [] }));
  }, []);

  // 成功通知ヘルパー
  const showSuccess = useCallback(
    (title: string, message: string, duration = 4000): string => {
      return showNotification({ type: 'success', title, message, duration });
    },
    [showNotification]
  );

  // エラー通知ヘルパー
  const showError = useCallback(
    (
      title: string,
      message: string,
      action?: { label: string; onClick: () => void }
    ): string => {
      const notificationData: Omit<Notification, 'id' | 'createdAt'> = {
        type: 'error',
        title,
        message,
        duration: 0,
        ...(action && { action }),
      };
      return showNotification(notificationData);
    },
    [showNotification]
  );

  // 警告通知ヘルパー
  const showWarning = useCallback(
    (title: string, message: string, duration = 5000): string => {
      return showNotification({ type: 'warning', title, message, duration });
    },
    [showNotification]
  );

  // 情報通知ヘルパー
  const showInfo = useCallback(
    (title: string, message: string, duration = 4000): string => {
      return showNotification({ type: 'info', title, message, duration });
    },
    [showNotification]
  );

  // ローディング付き実行
  const withLoading = useCallback(
    async <T>(
      action: () => Promise<T>,
      loadingMessage = '処理中...'
    ): Promise<T> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      const loadingId = showNotification({
        type: 'info',
        title: loadingMessage,
        message: '少々お待ちください',
        dismissible: false,
      });

      try {
        const result = await action();
        hideNotification(loadingId);
        setState((prev) => ({ ...prev, isLoading: false }));
        return result;
      } catch (error) {
        hideNotification(loadingId);
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [showNotification, hideNotification]
  );

  // エラーハンドリング付き実行
  const withErrorHandling = useCallback(
    async <T>(
      action: () => Promise<T>,
      errorContext?: string
    ): Promise<T | null> => {
      try {
        return await action();
      } catch (error) {
        if (error instanceof Error) {
          reportError(error, errorContext);
        } else {
          reportError(new Error(String(error)), errorContext);
        }
        return null;
      }
    },
    [reportError]
  );

  // オフライン時のアクション待機
  const queueOfflineAction = useCallback(
    (action: () => Promise<void>) => {
      setState((prev) => ({
        ...prev,
        pendingActions: [...prev.pendingActions, action],
      }));

      showNotification({
        type: 'info',
        title: 'オフライン',
        message: 'アクションは接続復旧時に実行されます',
        duration: 3000,
      });
    },
    [showNotification]
  );

  // 失敗したアクションの再試行
  const retryFailedActions = useCallback(async () => {
    if (state.pendingActions.length === 0) return;

    const actionsToRetry = [...state.pendingActions];
    setState((prev) => ({ ...prev, pendingActions: [] }));

    const results = await Promise.allSettled(
      actionsToRetry.map((action) => action())
    );

    const failedActions: Array<() => Promise<void>> = [];
    let successCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const action = actionsToRetry[index];
        if (action) {
          failedActions.push(action);
        }
        reportError(
          new Error(`Offline action failed: ${result.reason}`),
          'offline-retry'
        );
      } else {
        successCount++;
      }
    });

    if (successCount > 0) {
      showNotification({
        type: 'success',
        title: '同期完了',
        message: `${successCount}件のアクションが正常に実行されました`,
        duration: 4000,
      });
    }

    if (failedActions.length > 0) {
      setState((prev) => ({
        ...prev,
        pendingActions: failedActions,
      }));

      showNotification({
        type: 'warning',
        title: '一部失敗',
        message: `${failedActions.length}件のアクションが失敗しました`,
        duration: 5000,
      });
    }
  }, [state.pendingActions, reportError, showNotification]);

  const contextValue: FeedbackIntegrationContext = {
    // 状態
    notifications: state.notifications,
    errors: state.errors,
    isOnline: state.isOnline,
    isLoading: state.isLoading,

    // 通知操作
    showNotification,
    hideNotification,
    clearAllNotifications,

    // エラー操作
    reportError,
    clearErrors,

    // ヘルパー
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // 操作フィードバック
    withLoading,
    withErrorHandling,

    // オフライン対応
    queueOfflineAction,
    retryFailedActions,
  };

  return React.createElement(
    FeedbackContext.Provider,
    { value: contextValue },
    children
  );
};

/**
 * フィードバック統合フック
 */
export const useFeedbackIntegration = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error(
      'useFeedbackIntegration must be used within FeedbackIntegrationProvider'
    );
  }
  return context;
};

/**
 * エラー境界フック
 */
export const useErrorBoundary = () => {
  const { reportError } = useFeedbackIntegration();

  const handleError = useCallback(
    (error: Error, errorInfo?: { componentStack: string }) => {
      reportError(error, errorInfo?.componentStack, 'high');
    },
    [reportError]
  );

  return { handleError };
};

/**
 * リトライ機能付きフック
 */
export const useRetryableAction = () => {
  const { withErrorHandling, showSuccess, showError } =
    useFeedbackIntegration();

  const executeWithRetry = useCallback(
    async <T>(
      action: () => Promise<T>,
      options: {
        maxRetries?: number;
        retryDelay?: number;
        successMessage?: string;
        errorMessage?: string;
        context?: string;
      } = {}
    ): Promise<T | null> => {
      const {
        maxRetries = 3,
        retryDelay = 1000,
        successMessage,
        errorMessage,
        context = 'retryable-action',
      } = options;

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await withErrorHandling(async () => {
          try {
            const actionResult = await action();
            if (successMessage && attempt > 1) {
              showSuccess('再試行成功', successMessage);
            }
            return actionResult;
          } catch (error) {
            lastError =
              error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
              // 再試行前の待機
              await new Promise((resolve) =>
                setTimeout(resolve, retryDelay * attempt)
              );
            }
            throw error;
          }
        }, `${context}-attempt-${attempt}`);

        if (result !== null) {
          return result;
        }
      }

      // 全ての再試行が失敗
      if (errorMessage && lastError) {
        showError('操作失敗', errorMessage, {
          label: '再試行',
          onClick: () => executeWithRetry(action, options),
        });
      }

      return null;
    },
    [withErrorHandling, showSuccess, showError]
  );

  return { executeWithRetry };
};

/**
 * フォーム統合フック
 */
export const useFormIntegration = () => {
  const { showSuccess, showError, withLoading } = useFeedbackIntegration();

  const handleFormSubmit = useCallback(
    async <T>(
      submitAction: () => Promise<T>,
      options: {
        successMessage?: string;
        errorMessage?: string;
        loadingMessage?: string;
      } = {}
    ): Promise<T | null> => {
      const {
        successMessage = '保存しました',
        errorMessage = '保存に失敗しました',
        loadingMessage = '保存中...',
      } = options;

      try {
        const result = await withLoading(submitAction, loadingMessage);
        showSuccess('成功', successMessage);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : errorMessage;
        showError('エラー', message);
        return null;
      }
    },
    [showSuccess, showError, withLoading]
  );

  return { handleFormSubmit };
};

// ヘルパー関数

/**
 * セッションIDを取得
 */
const getSessionId = (): string => {
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session-id', sessionId);
    }
    return sessionId;
  }
  return 'server-session';
};

/**
 * エラーログ保存
 */
const saveErrorLog = (errorReport: ErrorReport): void => {
  try {
    const errorLogs = JSON.parse(localStorage.getItem('error-logs') || '[]');
    errorLogs.push({
      ...errorReport,
      error: {
        name: errorReport.error.name,
        message: errorReport.error.message,
        stack: errorReport.error.stack,
      },
    });

    // 最新100件のみ保持
    const recentLogs = errorLogs.slice(-100);
    localStorage.setItem('error-logs', JSON.stringify(recentLogs));
  } catch (error) {
    console.error('Failed to save error log:', error);
  }
};

/**
 * エラーログ取得
 */
export const getErrorLogs = (): ErrorReport[] => {
  try {
    return JSON.parse(
      localStorage.getItem('error-logs') || '[]'
    ) as ErrorReport[];
  } catch (error) {
    console.error('Failed to get error logs:', error);
    return [];
  }
};

/**
 * エラーログクリア
 */
export const clearErrorLogs = (): void => {
  try {
    localStorage.removeItem('error-logs');
  } catch (error) {
    console.error('Failed to clear error logs:', error);
  }
};
