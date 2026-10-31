import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, retry, throwError, timer } from 'rxjs';
import { IGameError } from '../types/game.types';
import { NotificationService } from '../service/notification.service';
import { ConfigService } from './config.service';

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CARD_LOAD_FAILED = 'CARD_LOAD_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_GAME_STATE = 'INVALID_GAME_STATE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errorLog: IGameError[] = [];
  private readonly maxLogEntries = 100;

  private readonly notificationService = inject(NotificationService);
  private readonly configService = inject(ConfigService);

  /**
   * Creates a standardized error object
   */
  public createError(code: ErrorCode, message: string, details?: string): IGameError {
    const error: IGameError = {
      code,
      message,
      details,
      timestamp: new Date()
    };

    this.logError(error);
    return error;
  }

  /**
   * Handles HTTP errors with retry logic
   */
  public handleHttpError<T>(source: Observable<T>, fallback?: T, showNotification: boolean = true): Observable<T> {
    const retryAttempts = this.configService.getApiConfig().retryAttempts;

    return source.pipe(
      // Exponential backoff: 1s, 2s, 4s, ...
      retry({ count: retryAttempts, delay: (_error, retryCount) => timer(Math.pow(2, retryCount - 1) * 1000) }),
      catchError((error: unknown) => {
        const gameError = this.createError(
          ErrorCode.NETWORK_ERROR,
          `Failed after ${retryAttempts} retry attempts`,
          error instanceof Error ? error.message : (error as Partial<IGameError> | null)?.message
        );

        if (showNotification) {
          this.showErrorNotification(gameError);
        }

        return fallback !== undefined ? of(fallback) : throwError(() => gameError);
      })
    );
  }

  /**
   * Handles storage operations safely
   */
  public safeStorageOperation<T>(operation: () => T, fallback: T, errorMessage: string): T {
    try {
      return operation();
    } catch (error) {
      const gameError = this.createError(
        ErrorCode.STORAGE_ERROR,
        errorMessage,
        error instanceof Error ? error.message : String(error)
      );

      this.showErrorNotification(gameError, false);
      return fallback;
    }
  }

  /**
   * Validates game state and handles invalid states
   */
  public validateGameState<T>(validator: () => boolean, errorMessage: string, recovery: () => T): T | null {
    try {
      if (validator()) {
        return null; // Valid state
      }

      const error = this.createError(ErrorCode.INVALID_GAME_STATE, errorMessage);

      this.showErrorNotification(error, false);
      return recovery();
    } catch (error) {
      const gameError = this.createError(
        ErrorCode.UNEXPECTED_ERROR,
        'Unexpected error during state validation',
        error instanceof Error ? error.message : String(error)
      );

      this.showErrorNotification(gameError);
      return recovery();
    }
  }

  /**
   * Global error handler for unhandled errors
   */
  public handleGlobalError(error: Error): void {
    const gameError = this.createError(
      ErrorCode.UNEXPECTED_ERROR,
      'An unexpected error occurred',
      error.message + (error.stack != null ? `\n${error.stack}` : '')
    );

    this.showErrorNotification(gameError);

    // In production, you might want to send this to a logging service
    if (this.configService.isProduction()) {
      this.sendErrorToLoggingService(gameError);
    }
  }

  /**
   * Shows user-friendly error notification
   */
  private showErrorNotification(error: IGameError, isError: boolean = true): void {
    const userFriendlyMessage = this.getUserFriendlyMessage(error);

    if (isError) {
      this.notificationService.showError(userFriendlyMessage, 'Error');
    } else {
      this.notificationService.showWarning(userFriendlyMessage, 'Warning');
    }
  }

  /**
   * Converts technical errors to user-friendly messages
   */
  private getUserFriendlyMessage(error: IGameError): string {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return 'Unable to load game data. Please check your internet connection and try again.';
      case ErrorCode.CARD_LOAD_FAILED:
        return 'Failed to load card images. The game may not display correctly.';
      case ErrorCode.STORAGE_ERROR:
        return 'Unable to save game progress. Your progress may not be preserved.';
      case ErrorCode.INVALID_GAME_STATE:
        return 'The game encountered an unexpected state. It has been reset.';
      case ErrorCode.CONFIGURATION_ERROR:
        return 'Game configuration error. Please refresh the page.';
      default:
        return 'An unexpected error occurred. Please refresh the page if the problem persists.';
    }
  }

  /**
   * Logs error for debugging
   */
  private logError(error: IGameError): void {
    this.errorLog.push(error);

    // Keep only the latest errors
    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog = this.errorLog.slice(-this.maxLogEntries);
    }

    // Console log in development
    if (!this.configService.isProduction()) {
      console.error('Game Error:', error);
    }
  }

  /**
   * Gets recent error log (for debugging)
   */
  public getErrorLog(): readonly IGameError[] {
    return [...this.errorLog];
  }

  /**
   * Clears error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Placeholder for external logging service
   */
  private sendErrorToLoggingService(error: IGameError): void {
    // Implementation would depend on your logging service
    // e.g., Sentry, LogRocket, custom API endpoint
    console.log('Would send to logging service:', error);
  }
}
