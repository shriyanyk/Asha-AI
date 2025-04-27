import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/ChatPage.css';
import { BiasMitigationService } from '../services/BiasMitigationService';
import { InputValidationService } from '../services/InputValidationService';

const GEMINI_API_KEY = "AIzaSyCSJ1rZWuWOYrH80y8Z-lJO9fuTjvbAFTA";

interface Message {
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: Date;
  wasBiased?: boolean;
  wasGuardedResponse?: boolean;
  isError?: boolean;
}

interface Skill {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
}

const ChatPage: React.FC = () => {
  const location = useLocation();
  const { name = 'User', age = 30 } = location.state || {};
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'bot', 
      text: `Hi, I'm Asha AI. How can I assist you with your career journey today, ${name}?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Dropdown selection states
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Skills and roles options
  const availableSkills: Skill[] = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'react', name: 'React' },
    { id: 'angular', name: 'Angular' },
    { id: 'vue', name: 'Vue.js' },
    { id: 'node', name: 'Node.js' },
    { id: 'java', name: 'Java' },
    { id: 'csharp', name: 'C#' },
    { id: 'aws', name: 'AWS' },
    { id: 'azure', name: 'Azure' },
    { id: 'gcp', name: 'Google Cloud' },
    { id: 'docker', name: 'Docker' },
    { id: 'kubernetes', name: 'Kubernetes' },
    { id: 'sql', name: 'SQL' },
    { id: 'nosql', name: 'NoSQL' },
    { id: 'dataanalysis', name: 'Data Analysis' },
    { id: 'ml', name: 'Machine Learning' },
    { id: 'ui', name: 'UI Design' },
    { id: 'ux', name: 'UX Design' },
  ];

  const availableRoles: Role[] = [
    { id: 'frontend', name: 'Frontend Developer' },
    { id: 'backend', name: 'Backend Developer' },
    { id: 'fullstack', name: 'Full Stack Developer' },
    { id: 'mobile', name: 'Mobile Developer' },
    { id: 'devops', name: 'DevOps Engineer' },
    { id: 'data', name: 'Data Scientist' },
    { id: 'ml', name: 'ML Engineer' },
    { id: 'ui', name: 'UI Designer' },
    { id: 'ux', name: 'UX Designer' },
    { id: 'pm', name: 'Product Manager' },
    { id: 'qa', name: 'QA Engineer' },
    { id: 'security', name: 'Security Engineer' },
    { id: 'cloud', name: 'Cloud Engineer' },
    { id: 'sre', name: 'Site Reliability Engineer' },
  ];
  
  // Create services
  const biasMitigationService = useRef(new BiasMitigationService());
  const inputValidationService = useRef(new InputValidationService());

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Clear any previous error when user starts typing again
    if (inputError) {
      setInputError(null);
    }
  };

  const checkForJobSearchIntent = (text: string): boolean => {
    const jobSearchTerms = [
      'looking for job', 'looking for a job', 'job search', 'find a job',
      'looking for work', 'find work', 'job hunting', 'job seeking',
      'looking for internship', 'find an internship', 'internship search',
      'job opportunities', 'career opportunities', 'need a job',
      'internship opportunities', 'employment search', 'looking for employment',
      'job posting', 'job listing', 'job vacancies', 'job openings'
    ];

    return jobSearchTerms.some(term => text.toLowerCase().includes(term));
  };

  const handleSkillSelection = (skillId: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else {
        return [...prev, skillId];
      }
    });
  };

  const handleRoleSelection = (roleId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const submitSkillsAndRoles = async () => {
    // Hide the dropdown
    setShowSkillsDropdown(false);
    setUserIsLookingForJob(false);
    
    // Create a message showing the selected skills and roles
    const selectedSkillNames = selectedSkills.map(id => 
      availableSkills.find(skill => skill.id === id)?.name
    ).filter(Boolean);
    
    const selectedRoleNames = selectedRoles.map(id => 
      availableRoles.find(role => role.id === id)?.name
    ).filter(Boolean);
    
    // Add a user message showing selections
    const selectionMessage = `Selected Skills: ${selectedSkillNames.join(', ')}
Selected Roles: ${selectedRoleNames.join(', ')}`;
    
    setMessages(prev => [...prev, {
      sender: 'user',
      text: selectionMessage,
      timestamp: new Date()
    }]);
    
    setLoading(true);
    
    // Generate a prompt for the API that includes the selected skills and roles
    const jobSearchPrompt = `Based on the user's selections:
Skills: ${selectedSkillNames.join(', ')}
Roles: ${selectedRoleNames.join(', ')}

Please provide a systematic breakdown of suitable job opportunities and internships. Format the response with clear headings for each role category, and under each category list 3-5 specific job titles with:
1. Required skills
2. Typical responsibilities
3. Potential career path
4. Average salary range
5. Tips for landing this position

Also include a section on recommended learning paths to improve skills for these roles.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: jobSearchPrompt }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from Gemini API");
      }
      
      let geminiReply = data.candidates[0].content.parts[0].text;
      
      // Remove markdown formatting if needed
      geminiReply = geminiReply.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1"); 

      // Format the response to be more structured
      const formattedResponse = formatJobOpportunities(geminiReply);
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: formattedResponse,
          timestamp: new Date()
        }]);
        setLoading(false);
      }, 1000);
      
      // Clear the selections for next time
      setSelectedSkills([]);
      setSelectedRoles([]);
      
    } catch (err) {
      console.error("API Error:", err);
      
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "I'm having trouble processing your job search request. Could we try again?",
        timestamp: new Date(),
        isError: true
      }]);
      setLoading(false);
    }
  };

  // Function to format job opportunities in a more structured way
  const formatJobOpportunities = (text: string): string => {
    // Split by headings and format each section
    // This is a simple implementation - you might want to use regex or more sophisticated parsing
    return text;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First, validate the input
    const validationResult = inputValidationService.current.validateInput(input);
    
    if (!validationResult.isValid) {
      // Display error message to user
      setInputError(validationResult.errorMessage || "Invalid input");
      
      // If there's a sanitized version available, replace the input with it
      if (validationResult.sanitizedInput) {
        setInput(validationResult.sanitizedInput);
      }
      
      return;
    }
    
    // Proceed with the validated and sanitized input
    const safeInput = validationResult.sanitizedInput || input.trim();
    
    // Check if user is looking for a job/internship
    const isJobSearchIntent = checkForJobSearchIntent(safeInput);
    
    // Add user message to chat
    const newUserMessage: Message = { 
      sender: 'user', 
      text: safeInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    
    // If user is looking for a job, show the skills/roles dropdown
    if (isJobSearchIntent) {
      setUserIsLookingForJob(true);
      setShowSkillsDropdown(true);
      
      // Add a bot message asking for skills and roles
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: "Great! To help me find the best opportunities for you, please select your skills and preferred roles from the options below:",
          timestamp: new Date()
        }]);
      }, 500);
      
      return;
    }
    
    // Continue with regular flow if not job search intent
    setLoading(true);
    
    // Check user input for potential issues (bias and guardrails)
    const contentCheck = biasMitigationService.current.checkUserInput(safeInput);
    
    // If guardrails were triggered, show appropriate response without calling API
    if (!contentCheck.guardrailsResult.isValid) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: contentCheck.guardrailsResult.modifiedText || "I'm here to help with career-related questions. What career guidance are you looking for?",
          timestamp: new Date(),
          wasGuardedResponse: true
        }]);
        setLoading(false);
      }, 1000);
      return;
    }

    // Use the enhanced prompt with bias mitigation guidelines and guardrails
    const enhancedPrompt = biasMitigationService.current.createEnhancedPrompt(name, age, safeInput);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: enhancedPrompt }],
              },
            ],
          }),
        }
      );

      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Validate the API response structure
      if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from Gemini API");
      }
      
      let geminiReply = data.candidates[0].content.parts[0].text;
      
      // Remove markdown formatting
      geminiReply = geminiReply.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1"); 
      
      // Apply post-processing to check and correct bias and guardrails in the AI response
      const processedResult = biasMitigationService.current.postProcessResponse(geminiReply);

      // Add a small delay to make the typing indicator visible for a moment
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: processedResult.correctedResponse,
          timestamp: new Date(),
          wasBiased: processedResult.biasDetectionResult.hasBias,
          wasGuardedResponse: !processedResult.guardrailsResult.isValid
        }]);
        setLoading(false);
        
        // If bias was detected in user input or guardrails were triggered, provide gentle feedback
        if (contentCheck.biasResult.hasBias || !contentCheck.guardrailsResult.isValid) {
          setTimeout(() => {
            const feedbackPrompt = biasMitigationService.current.generateFeedbackPrompt(
              contentCheck.biasResult.category,
              !contentCheck.guardrailsResult.isValid ? contentCheck.guardrailsResult.reason : undefined
            );
            setMessages(prev => [...prev, { 
              sender: 'bot', 
              text: feedbackPrompt,
              timestamp: new Date()
            }]);
          }, 1000);
        }
      }, 1000);
    } catch (err) {
      console.error("API Error:", err);
      
      // Show user-friendly error message
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "I'm having trouble connecting to my career knowledge database. Could we try again with a career-related question?",
        timestamp: new Date(),
        isError: true
      }]);
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-box">
        <div className="chat-header">
          <div className="header-avatar">A</div>
          <span>Asha AI Career Assistant</span>
          <div className="header-status"></div>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="avatar bot">A</div>
              )}
              
              <div className="message-container">
                <div className={`message ${msg.sender} ${msg.wasBiased ? 'was-biased' : ''} ${msg.wasGuardedResponse ? 'was-guarded' : ''} ${msg.isError ? 'is-error' : ''}`}>
                  {/* Use the input validation service to safely display the message */}
                  {msg.sender === 'user' 
                    ? inputValidationService.current.decodeHTMLEntities(msg.text) 
                    : msg.text}
                </div>
                <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
              </div>
              
              {msg.sender === 'user' && (
                <div className="avatar user">{getInitials(name)}</div>
              )}
            </div>
          ))}
          
          {/* Skills and Roles Selection UI */}
          {showSkillsDropdown && (
            <div className="message-row bot">
              <div className="avatar bot">A</div>
              <div className="dropdown-selection-container">
                <div className="dropdown-section">
                  <h4>Select Your Skills (Multiple)</h4>
                  <div className="skills-grid">
                    {availableSkills.map(skill => (
                      <div 
                        key={skill.id} 
                        className={`skill-chip ${selectedSkills.includes(skill.id) ? 'selected' : ''}`}
                        onClick={() => handleSkillSelection(skill.id)}
                      >
                        {skill.name}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="dropdown-section">
                  <h4>Select Preferred Roles (Multiple)</h4>
                  <div className="roles-grid">
                    {availableRoles.map(role => (
                      <div 
                        key={role.id} 
                        className={`role-chip ${selectedRoles.includes(role.id) ? 'selected' : ''}`}
                        onClick={() => handleRoleSelection(role.id)}
                      >
                        {role.name}
                      </div>
                    ))}
                  </div>
                </div>
                
                <button 
                  className="submit-selections-btn" 
                  onClick={submitSkillsAndRoles}
                  disabled={selectedSkills.length === 0 && selectedRoles.length === 0}
                >
                  Submit Selections
                </button>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="message-row bot">
              <div className="avatar bot">A</div>
              <div className="typing-indicator">
                <div className="typing-bubble"></div>
                <div className="typing-bubble"></div>
                <div className="typing-bubble"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input" onSubmit={handleSend}>
          <div className={`input-wrapper ${inputError ? 'has-error' : ''}`}>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me about career advice, job opportunities, skills, etc."
              maxLength={500} // Set a hard limit in the UI to match our validation
            />
            {inputError && <div className="input-error-message">{inputError}</div>}
            <div className="char-counter">{input.length}/500</div>
          </div>
          <button type="submit" disabled={loading || !input.trim() || showSkillsDropdown}>
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;