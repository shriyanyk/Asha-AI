import { BiasDetectionService, BiasDetectionResult } from './BiasDetectionService';
import { GuardrailsService, GuardrailsCheckResult } from './GuardrailsService';

export interface BiasLogEntry {
  originalText: string;
  correctedText: string;
  biasDetections: Array<{original: string, suggested: string}>;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  timestamp: string;
  source: 'user-input' | 'ai-response';
  sessionId: string;
  guardrailsApplied?: boolean;
  guardrailsReason?: string;
}

export class BiasMitigationService {
  private biasDetectionService: BiasDetectionService;
  private guardrailsService: GuardrailsService;
  private sessionId: string;
  private biasLogs: BiasLogEntry[] = [];
  
  constructor() {
    this.biasDetectionService = new BiasDetectionService();
    this.guardrailsService = new GuardrailsService();
    this.sessionId = this.generateSessionId();
  }
  
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  public createEnhancedPrompt(name: string, age: any, userInput: string): string {
    // Ensure age is a number
    const userAge = typeof age === 'string' ? parseInt(age) : Number(age);
    
    // Generate age-specific guidance for the AI
    let ageSpecificGuidance = '';
    
    if (userAge < 18) {
      ageSpecificGuidance = `
        AGE-SPECIFIC GUIDANCE (User age: ${userAge}):
        - Focus on education paths, skill development, and future planning
        - Emphasize importance of education and building foundational skills
        - Discuss volunteer opportunities and part-time roles that build experience
        - Suggest age-appropriate career exploration activities
        - Avoid suggesting full-time work that may interfere with education
        - Highlight youth-friendly resources and mentorship programs
        - Frame advice in terms of preparation for future career paths
      `;
    } else if (userAge < 25) {
      ageSpecificGuidance = `
        AGE-SPECIFIC GUIDANCE (User age: ${userAge}):
        - Focus on early career guidance for a young adult
        - Discuss entry-level positions appropriate for new graduates
        - Emphasize skill development and credential building
        - Suggest internships, apprenticeships, and training programs
        - Discuss realistic salary expectations for entry-level roles
        - Provide guidance on building professional networks
        - Address common early-career challenges and expectations
      `;
    } else if (userAge < 35) {
      ageSpecificGuidance = `
        AGE-SPECIFIC GUIDANCE (User age: ${userAge}):
        - Focus on career growth and skill specialization
        - Discuss strategies for advancement and taking on more responsibility
        - Address work-life balance particularly for those starting families
        - Suggest mid-level positions and growth opportunities
        - Discuss leadership development and management skills
        - Provide guidance on negotiating salaries and benefits
        - Address common career transition points in this age range
      `;
    } else if (userAge < 45) {
      ageSpecificGuidance = `
        AGE-SPECIFIC GUIDANCE (User age: ${userAge}):
        - Focus on career advancement and potential leadership roles
        - Discuss strategies for overcoming mid-career plateaus
        - Address work-life balance for established professionals
        - Suggest senior-level positions and management opportunities
        - Discuss mentoring and developing junior colleagues
        - Provide guidance on staying relevant in changing industries
        - Address common challenges of mid-career professionals
      `;
    } else if (userAge < 55) {
      ageSpecificGuidance = `
        AGE-SPECIFIC GUIDANCE (User age: ${userAge}):
        - Focus on leveraging extensive experience and expertise
        - Discuss strategies for remaining relevant in changing industries
        - Address ageism and how to combat potential biases
        - Suggest executive roles and strategic positions
        - Discuss knowledge transfer and mentorship opportunities
        - Provide guidance on career transitions and pivots
        - Address planning for later career stages
      `;
    } else {
      ageSpecificGuidance = `
        AGE-SPECIFIC GUIDANCE (User age: ${userAge}):
        - Focus on leveraging deep expertise and experience
        - Discuss flexible work arrangements and encore careers
        - Address transition planning toward retirement
        - Suggest consulting, advisory, and mentorship roles
        - Discuss legacy building and knowledge transfer
        - Provide guidance on remaining engaged professionally
        - Address common challenges for senior professionals
        - Balance career advice with retirement planning considerations
      `;
    }

    return `
      You are Asha AI, a friendly and supportive assistant designed to guide women in their career journeys.
      You're assisting a user named ${name}, age ${userAge}. Your task is to help with career advice, job listings, mentorship opportunities, and relevant community events. Keep your answers short and for job listings give bullets or short paras paragraphs.
      
      ${ageSpecificGuidance}
      
      IMPORTANT GUIDELINES:
      - Only discuss job and career-related topics
      - Do not offer personal opinions or start sentences with "I think" or "I believe"
      - Do not discuss politics, religion, entertainment, or other non-career topics
      - Do not respond to requests for jokes, stories, poems, or other creative content
      - If the user asks about your personal experiences or opinions, redirect to career advice
      - Do not discuss hypotheticals unrelated to careers
      - Always present balanced career options without gender stereotyping
      - Avoid assumptions about career preferences based on gender
      - Use gender-neutral language when discussing roles and professions
      - Challenge any biased assumptions that appear in questions
      - Highlight achievements of diverse women across all professional fields
      - Suggest resources that promote gender diversity and inclusion
      - Recognize and address structural barriers women may face in careers
      - Provide advice that empowers rather than limits career aspirations
      - When discussing tech roles, emphasize that all genders can excel
      - Avoid reinforcing the idea that leadership and technical roles are more suited to men
      - Don't use phrases like "women are better at" or "men are better at"
      - Avoid suggesting that work-life balance is only a concern for women
      
      Respond naturally, as a supportive mentor, and keep the language simple and clear. Focus exclusively on career-related topics.
      
      User's message: ${userInput}
    `;
  }
  
  public checkUserInput(text: string): {
    biasResult: BiasDetectionResult;
    guardrailsResult: GuardrailsCheckResult;
  } {
    // First check against guardrails
    const guardrailsResult = this.guardrailsService.checkUserInput(text);
    
    // If guardrails are triggered, no need to check for bias
    if (!guardrailsResult.isValid) {
      this.logContentCheck(
        text, 
        guardrailsResult.modifiedText || text, 
        [], 
        undefined, 
        undefined, 
        'user-input',
        true,
        guardrailsResult.reason
      );
      
      return {
        biasResult: {
          hasBias: false,
          suggestions: []
        },
        guardrailsResult
      };
    }
    
    // Otherwise check for bias
    const biasResult = this.biasDetectionService.checkForBias(text);
    
    if (biasResult.hasBias) {
      this.logContentCheck(
        text, 
        text, 
        biasResult.suggestions, 
        biasResult.category, 
        biasResult.severity, 
        'user-input',
        false
      );
    }
    
    return {
      biasResult,
      guardrailsResult
    };
  }
  
  public postProcessResponse(response: string): { 
    correctedResponse: string,
    wasModified: boolean,
    biasDetectionResult: BiasDetectionResult,
    guardrailsResult: GuardrailsCheckResult
  } {
    // First check against guardrails
    const guardrailsResult = this.guardrailsService.checkAIResponse(response);
    
    // If guardrails are triggered, use the modified text
    if (!guardrailsResult.isValid) {
      this.logContentCheck(
        response,
        guardrailsResult.modifiedText || response,
        [],
        undefined,
        undefined,
        'ai-response',
        true,
        guardrailsResult.reason
      );
      
      return {
        correctedResponse: guardrailsResult.modifiedText || response,
        wasModified: true,
        biasDetectionResult: {
          hasBias: false,
          suggestions: []
        },
        guardrailsResult
      };
    }
    
    // Check for bias in the response
    const biasCheck = this.biasDetectionService.checkForBias(response);
    
    // If bias is detected, apply corrections
    if (biasCheck.hasBias) {
      let correctedResponse = response;
      
      // Apply each suggested correction
      biasCheck.suggestions.forEach(suggestion => {
        correctedResponse = correctedResponse.replace(
          new RegExp(suggestion.original, 'gi'), 
          suggestion.suggested
        );
      });
      
      // Log detected bias for model improvement
      this.logContentCheck(
        response, 
        correctedResponse, 
        biasCheck.suggestions,
        biasCheck.category,
        biasCheck.severity,
        'ai-response',
        false
      );
      
      return {
        correctedResponse,
        wasModified: true,
        biasDetectionResult: biasCheck,
        guardrailsResult
      };
    }
    
    return {
      correctedResponse: response,
      wasModified: false,
      biasDetectionResult: biasCheck,
      guardrailsResult
    };
  }
  
  public logContentCheck(
    original: string, 
    corrected: string, 
    suggestions: Array<{original: string, suggested: string}>,
    category?: string,
    severity?: 'low' | 'medium' | 'high',
    source: 'user-input' | 'ai-response' = 'ai-response',
    guardrailsApplied: boolean = false,
    guardrailsReason?: string
  ): void {
    const logEntry: BiasLogEntry = {
      originalText: original,
      correctedText: corrected,
      biasDetections: suggestions,
      category,
      severity,
      timestamp: new Date().toISOString(),
      source,
      sessionId: this.sessionId,
      guardrailsApplied,
      guardrailsReason
    };
    
    console.log("Content check logged:", logEntry);
    this.biasLogs.push(logEntry);
    
    this.sendLogsToServer();
  }
  
  private sendLogsToServer(): void {
  }
  
  public getSessionId(): string {
    return this.sessionId;
  }
  
  public generateFeedbackPrompt(biasCategory?: string, guardrailsReason?: string): string {
    // If guardrails were triggered, prioritize that feedback
    if (guardrailsReason) {
      switch(guardrailsReason) {
        case 'off-topic-request':
          return "I'm here specifically to help with career-related questions. Could you share what career goals or challenges you're currently facing?";
        case 'personal-opinion':
          return "Let me provide you with fact-based career guidance. What specific career information would be most helpful to you right now?";
        case 'non-career-topic':
          return "As your career assistant, I'm focused on helping with professional development. What aspect of your career would you like to discuss?";
        default:
          return "I'm here to provide career advice tailored to your goals and interests. Is there a specific aspect of your career you'd like to focus on?";
      }
    }
    
    // Otherwise, provide bias-related feedback
    switch(biasCategory) {
      case 'technical-competence-bias':
        return "I notice we may have touched on assumptions about technical abilities. I'm here to support your career journey regardless of field or role. Would you like to explore specific technical career paths or skills?";
      case 'leadership-bias':
        return "Leadership comes in many styles. Would you like to discuss leadership opportunities or development that aligns with your personal strengths?";
      case 'work-life-bias':
        return "Work-life integration is important for everyone. Would you like to discuss strategies that support your career goals while maintaining balance?";
      case 'emotional-bias':
        return "Professional skills come in many forms. Would you like to discuss how various communication styles can be leveraged in your career?";
      default:
        return "I'm here to provide inclusive career advice tailored to your goals and interests. Is there a specific aspect of your career you'd like to focus on?";
    }
  }
}