// AnalyticsService.ts
export interface SessionMetrics {
  sessionId: string;
  userId?: string;
  userName?: string;
  userAge?: number;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  averageResponseTime: number;
  guardrailTriggers: number;
  biasMitigations: number;
  deviceInfo: {
    type: string;
    browser: string;
    os: string;
  };
  userRatings: {
    helpfulness?: number;
    satisfaction?: number;
    feedback?: string;
  };
}

export interface MessageMetrics {
  messageId: string;
  sessionId: string;
  timestamp: Date;
  messageType: 'user' | 'bot' | 'system';
  messageLength: number;
  processingTime?: number; // Time taken to process and generate response
  aiModelUsed?: string;
  tokensUsed?: number;
  category?: string; // Career topic category
  sentiment?: 'positive' | 'neutral' | 'negative';
  containedBias: boolean;
  guardrailsApplied: boolean;
  eventType: 'message_sent' | 'response_generated' | 'error' | 'user_feedback';
}

export interface PerformanceSnapshot {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  activeUsers: number;
  errorRate: number;
  apiStatusCode?: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private sessionStart: Date;
  private messageLog: MessageMetrics[] = [];
  private performanceLog: PerformanceSnapshot[] = [];
  private sessionMetrics: Partial<SessionMetrics>;
  private apiEndpoint: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private totalResponseTime: number = 0;
  private responseCount: number = 0;
  private guardrailTriggers: number = 0;
  private biasMitigations: number = 0;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.apiEndpoint = process.env.REACT_APP_ANALYTICS_ENDPOINT || 'https://api.yourservice.com/analytics';
    
    this.sessionMetrics = {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      messageCount: 0,
      averageResponseTime: 0,
      guardrailTriggers: 0,
      biasMitigations: 0,
      deviceInfo: this.getDeviceInfo(),
      userRatings: {}
    };
    
    // Set up automatic flushing of analytics data every 5 minutes
    this.flushInterval = setInterval(() => {
      this.flushAnalytics();
    }, 5 * 60 * 1000);
    
    // Listen for page unload to capture session end
    window.addEventListener('beforeunload', () => {
      this.endSession();
      this.flushAnalytics();
    });
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private getDeviceInfo(): { type: string; browser: string; os: string } {
    const userAgent = navigator.userAgent;
    
    // Simple device type detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');
    
    // Browser detection
    let browser = 'unknown';
    if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
    else if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) browser = 'IE';
    else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';
    
    // OS detection
    let os = 'unknown';
    if (userAgent.indexOf('Windows') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'MacOS';
    else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iOS') > -1 || /iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';
    
    return { type: deviceType, browser, os };
  }

  public setUserInfo(userId: string, userName: string, userAge?: number): void {
    this.sessionMetrics.userId = userId;
    this.sessionMetrics.userName = userName;
    this.sessionMetrics.userAge = userAge;
  }

  public trackUserMessage(message: string, category?: string): string {
    const messageId = this.generateMessageId();
    
    this.messageLog.push({
      messageId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      messageType: 'user',
      messageLength: message.length,
      category,
      containedBias: false, // Will be updated if bias is detected
      guardrailsApplied: false, // Will be updated if guardrails are applied
      eventType: 'message_sent'
    });
    
    if (this.sessionMetrics.messageCount !== undefined) {
      this.sessionMetrics.messageCount++;
    }
    
    return messageId;
  }

  public trackBotResponse(
    messageId: string,
    message: string,
    processingTime: number,
    aiModel: string = 'gemini-2.0-flash',
    tokensUsed: number = 0,
    containedBias: boolean = false,
    guardrailsApplied: boolean = false,
    category?: string
  ): void {
    this.messageLog.push({
      messageId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      messageType: 'bot',
      messageLength: message.length,
      processingTime,
      aiModelUsed: aiModel,
      tokensUsed,
      category,
      containedBias,
      guardrailsApplied,
      eventType: 'response_generated'
    });
    
    // Update response time metrics
    this.totalResponseTime += processingTime;
    this.responseCount++;
    
    if (this.sessionMetrics.averageResponseTime !== undefined) {
      this.sessionMetrics.averageResponseTime = this.totalResponseTime / this.responseCount;
    }
    
    // Update guardrail and bias metrics
    if (guardrailsApplied) {
      this.guardrailTriggers++;
      if (this.sessionMetrics.guardrailTriggers !== undefined) {
        this.sessionMetrics.guardrailTriggers = this.guardrailTriggers;
      }
    }
    
    if (containedBias) {
      this.biasMitigations++;
      if (this.sessionMetrics.biasMitigations !== undefined) {
        this.sessionMetrics.biasMitigations = this.biasMitigations;
      }
    }
  }

  public trackError(messageId: string, errorMessage: string, errorCode?: string): void {
    this.messageLog.push({
      messageId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      messageType: 'system',
      messageLength: errorMessage.length,
      category: errorCode,
      containedBias: false,
      guardrailsApplied: false,
      eventType: 'error'
    });
  }

  public trackPerformance(): void {
    // Collect performance metrics
    const memory = window.performance.memory 
      ? (window.performance.memory as any).usedJSHeapSize / (window.performance.memory as any).jsHeapSizeLimit 
      : 0;
    
    const responseTimeMetric = window.performance.timing.domComplete - window.performance.timing.navigationStart;
    
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      cpuUsage: 0, // Not directly available in the browser
      memoryUsage: memory,
      responseTime: responseTimeMetric,
      activeUsers: 1, // Will be calculated server-side
      errorRate: 0 // Will be calculated server-side
    };
    
    this.performanceLog.push(snapshot);
  }

  public recordUserFeedback(messageId: string, rating: number, feedback?: string): void {
    this.messageLog.push({
      messageId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      messageType: 'user',
      messageLength: feedback?.length || 0,
      containedBias: false,
      guardrailsApplied: false,
      eventType: 'user_feedback'
    });
    
    // Update session metrics with user rating
    this.sessionMetrics.userRatings = {
      ...this.sessionMetrics.userRatings,
      helpfulness: rating,
      feedback
    };
  }

  private endSession(): void {
    this.sessionMetrics.endTime = new Date();
  }

  private generateMessageId(): string {
    return `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  private flushAnalytics(): void {
    if (this.messageLog.length === 0 && this.performanceLog.length === 0) {
      return;
    }
    
    // Prepare data for transmission
    const analyticsData = {
      session: this.sessionMetrics,
      messages: this.messageLog,
      performance: this.performanceLog
    };
    
    // Send data to backend
    fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyticsData),
      // Use keepalive to ensure data is sent even if page is unloading
      keepalive: true
    }).catch(error => {
      console.error('Failed to send analytics data:', error);
    });
    
    // Clear logs after sending
    this.messageLog = [];
    this.performanceLog = [];
  }

  public manualFlush(): void {
    this.flushAnalytics();
  }

  public cleanUp(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.endSession();
    this.flushAnalytics();
  }
}

// Add this to a d.ts file or extend the Window interface
declare global {
  interface Window {
    performance: Performance & {
      memory?: {
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  }
}