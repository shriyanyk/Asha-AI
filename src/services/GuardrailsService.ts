export interface GuardrailsCheckResult {
    isValid: boolean;
    reason?: string;
    modifiedText?: string;
  }
  
  export class GuardrailsService {
    private readonly OFF_TOPIC_KEYWORDS = [
      'personal opinion',
      'your opinion',
      'what do you think about',
      'how do you feel about',
      'what are your views on',
      'whats your take on',
      'tell me about yourself',
      'do you have feelings',
      'are you conscious',
      'are you sentient',
      'tell me a joke',
      'tell me a story',
      'write a poem',
      'sing a song',
      'whats the weather',
      'who will win',
      'who is the best',
      'politics',
      'religion',
      'dating advice',
      'relationship advice'
    ];
  
    private readonly NON_CAREER_TOPICS = [
      'cooking',
      'recipes',
      'travel',
      'vacation',
      'movies',
      'tv shows',
      'sports',
      'games',
      'hobbies',
      'pets',
      'health issues',
      'medical advice',
      'legal advice',
      'investment advice',
      'stock market',
      'cryptocurrency'
    ];
  
    private readonly CAREER_RELATED_KEYWORDS = [
      'job',
      'career',
      'work',
      'profession',
      'resume',
      'cv',
      'interview',
      'skill',
      'salary',
      'promotion',
      'workplace',
      'employment',
      'application',
      'employer',
      'industry',
      'position',
      'role',
      'hiring',
      'mentor',
      'networking',
      'training',
      'education',
      'degree',
      'certification',
      'professional',
      'colleague',
      'manager',
      'leadership',
      'experience'
    ];
  
    private readonly REDIRECTION_RESPONSES = [
      "I'm here to help with career-related questions. Could you share more about your professional goals or challenges?",
      "Let's focus on your career journey. What specific career advice or information would be helpful for you?",
      "As a career assistant, I specialize in professional development. What career-related questions do you have?",
      "I'd be happy to help with career guidance. Could you tell me more about your professional interests or concerns?",
      "I'm designed to provide career support. What aspect of your professional journey would you like to discuss?"
    ];
  
    /**
     * Checks if user input adheres to the guardrails
     */
    public checkUserInput(text: string): GuardrailsCheckResult {
      const lowerText = text.toLowerCase();
      
      // Check if input contains off-topic keywords
      if (this.OFF_TOPIC_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return {
          isValid: false,
          reason: 'off-topic-request',
          modifiedText: this.getRandomRedirectionResponse()
        };
      }
      
      // Check if input is focused on non-career topics
      if (this.NON_CAREER_TOPICS.some(topic => lowerText.includes(topic.toLowerCase()))) {
        // Only block if there are no career-related keywords
        if (!this.CAREER_RELATED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
          return {
            isValid: false,
            reason: 'non-career-topic',
            modifiedText: this.getRandomRedirectionResponse()
          };
        }
      }
      
      // Input passes all guardrails
      return {
        isValid: true
      };
    }
    
    /**
     * Checks if AI response adheres to the guardrails
     */
    public checkAIResponse(text: string): GuardrailsCheckResult {
      const lowerText = text.toLowerCase();
      
      // Check for personal opinions
      if (/\b(i think|in my opinion|i believe|from my perspective|personally|i feel)\b/i.test(lowerText)) {
        // Replace personal opinion phrases with factual statements
        let modifiedText = text
          .replace(/\b(I think|In my opinion|I believe|From my perspective|Personally|I feel)\b/gi, 'Research suggests')
          .replace(/\b(I would|I'd)\b/gi, 'You might consider');
        
        return {
          isValid: false,
          reason: 'personal-opinion',
          modifiedText
        };
      }
      
      // Check for off-topic content
      const offTopicMatches = this.OFF_TOPIC_KEYWORDS.filter(topic => 
        lowerText.includes(topic.toLowerCase())
      );
      
      const nonCareerMatches = this.NON_CAREER_TOPICS.filter(topic => 
        lowerText.includes(topic.toLowerCase())
      );
      
      // If we have off-topic or non-career content without career focus
      if ((offTopicMatches.length > 0 || nonCareerMatches.length > 0) && 
          !this.CAREER_RELATED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return {
          isValid: false,
          reason: 'off-topic-response',
          modifiedText: "I should focus on providing career-related advice. " + 
                        "Let me help you with professional development, job searching, " + 
                        "or workplace challenges instead. Could you share more about your career goals?"
        };
      }
      
      // Response passes all guardrails
      return {
        isValid: true
      };
    }
    
    private getRandomRedirectionResponse(): string {
      const randomIndex = Math.floor(Math.random() * this.REDIRECTION_RESPONSES.length);
      return this.REDIRECTION_RESPONSES[randomIndex];
    }
  }