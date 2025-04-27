export interface ValidationResult {
    isValid: boolean;
    sanitizedInput?: string;
    errorMessage?: string;
  }
  
  export class InputValidationService {
    private readonly MAX_INPUT_LENGTH = 500; // Maximum characters allowed
    private readonly SUSPICIOUS_PATTERNS = [
      /<script.*?>.*?<\/script>/gi,
      /<iframe.*?>.*?<\/iframe>/gi,
      /javascript:/gi,
      /onerror=/gi,
      /onclick=/gi,
      /onload=/gi,
      /onmouseover=/gi,
      /eval\(/gi,
      /document\.cookie/gi,
      /window\.location/gi
    ];
    
    /**
     * Validates and sanitizes user input
     */
    public validateInput(input: string): ValidationResult {
      // Trim whitespace
      const trimmedInput = input.trim();
      
      // Check for empty input
      if (!trimmedInput) {
        return {
          isValid: false,
          errorMessage: "Please enter a message."
        };
      }
      
      // Check input length
      if (trimmedInput.length > this.MAX_INPUT_LENGTH) {
        return {
          isValid: false,
          errorMessage: `Your message is too long. Please limit to ${this.MAX_INPUT_LENGTH} characters.`,
          sanitizedInput: trimmedInput.substring(0, this.MAX_INPUT_LENGTH)
        };
      }
      
      // Check for potential XSS or script injection
      if (this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(trimmedInput))) {
        // Sanitize by removing potentially dangerous content
        let sanitized = trimmedInput;
        this.SUSPICIOUS_PATTERNS.forEach(pattern => {
          sanitized = sanitized.replace(pattern, '[removed]');
        });
        
        return {
          isValid: false,
          errorMessage: "Your message contains disallowed content. It has been modified for security reasons.",
          sanitizedInput: sanitized
        };
      }
      
      // Check for all whitespace or just special characters
      if (!/\w/.test(trimmedInput)) {
        return {
          isValid: false,
          errorMessage: "Please enter a valid message with text content."
        };
      }
      
      // Sanitize the input by encoding HTML special characters
      const sanitizedInput = this.encodeHTMLEntities(trimmedInput);
      
      return {
        isValid: true,
        sanitizedInput
      };
    }
    
    /**
     * Basic encoding of HTML special characters to prevent XSS
     */
    private encodeHTMLEntities(text: string): string {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    /**
     * Decode HTML entities for display purposes
     * (Only use this when rendering in a safe context)
     */
    public decodeHTMLEntities(text: string): string {
      return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
  }