export interface BiasDetectionResult {
    hasBias: boolean;
    suggestions: Array<{original: string, suggested: string}>;
    category?: string;
    severity?: 'low' | 'medium' | 'high';
  }
  
  export class BiasDetectionService {
    private genderBiasedTerms = [
      // Career limiting terms
      { biased: "girls in the office", neutral: "colleagues" },
      { biased: "bossy", neutral: "assertive" },
      { biased: "emotional", neutral: "passionate" },
      { biased: "ambitious for a woman", neutral: "ambitious" },
      { biased: "career woman", neutral: "professional" },
      { biased: "female CEO", neutral: "CEO" },
      { biased: "woman doctor", neutral: "doctor" },
      { biased: "she's too aggressive", neutral: "she's direct" },
      { biased: "not technical enough", neutral: "developing technical skills" },
      { biased: "not leadership material", neutral: "developing leadership skills" },
      { biased: "too soft", neutral: "empathetic" },
      { biased: "not committed due to family", neutral: "balancing responsibilities" },
      { biased: "difficult to work with", neutral: "has a different communication style" }
    ];
    
    private stereotypicalPhrases = [
      "women are better at",
      "men are better at",
      "women should focus on",
      "maternal instincts",
      "women's work",
      "might be too emotional for",
      "might struggle with technical",
      "work-life balance for mothers",
      "not assertive enough for leadership",
      "better suited for support roles",
      "better with people than technology",
      "too aggressive for a woman",
      "nurturing roles"
    ];
  
    private biasedJustifications = [
      "it's just biology",
      "that's how men and women are wired",
      "it's natural for women to",
      "traditionally, women have always",
      "studies show women prefer",
      "men are naturally better at",
      "it's just how things work in the industry"
    ];
  
    // Check text for gender-biased language
    public checkForBias(text: string): BiasDetectionResult {
      const result: BiasDetectionResult = {
        hasBias: false,
        suggestions: [],
        severity: 'low'
      };
      
      let biasPoints = 0;
      
      // Check for direct biased terms
      this.genderBiasedTerms.forEach(term => {
        if (text.toLowerCase().includes(term.biased.toLowerCase())) {
          result.hasBias = true;
          result.suggestions.push({
            original: term.biased,
            suggested: term.neutral
          });
          biasPoints += 2;
        }
      });
      
      // Check for stereotypical phrases
      this.stereotypicalPhrases.forEach(phrase => {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          result.hasBias = true;
          result.suggestions.push({
            original: phrase,
            suggested: "Consider using more inclusive language"
          });
          biasPoints += 3;
        }
      });
      
      // Check for biased justifications
      this.biasedJustifications.forEach(phrase => {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          result.hasBias = true;
          result.suggestions.push({
            original: phrase,
            suggested: "Consider focusing on individual capabilities rather than generalizations"
          });
          biasPoints += 4;
        }
      });
      
      // Set severity based on bias points
      if (biasPoints > 8) {
        result.severity = 'high';
      } else if (biasPoints > 3) {
        result.severity = 'medium';
      }
      
      // Categorize the bias if detected
      if (result.hasBias) {
        result.category = this.categorizeBias(text, result.suggestions);
      }
      
      return result;
    }
    
    private categorizeBias(text: string, suggestions: Array<{original: string, suggested: string}>): string {
      // Simple categorization based on keywords
      if (suggestions.some(s => s.original.includes("technical") || text.includes("technical"))) {
        return 'technical-competence-bias';
      } else if (suggestions.some(s => s.original.includes("leader") || text.includes("leader"))) {
        return 'leadership-bias';
      } else if (suggestions.some(s => s.original.includes("family") || text.includes("family"))) {
        return 'work-life-bias';
      } else if (suggestions.some(s => s.original.includes("emotional") || text.includes("emotional"))) {
        return 'emotional-bias';
      }
      return 'general-gender-bias';
    }
  }