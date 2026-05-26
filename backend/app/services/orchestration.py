import re
import logging
from app.config import settings

logger = logging.getLogger("nexusai.orchestration")

class OrchestrationEngine:
    def __init__(self):
        # Setup intent classification triggers
        self.rules = {
            "coding": [
                r"\b(python|javascript|typescript|c\+\+|java|rust|go|html|css|sql|bash)\b",
                r"\b(def|class|function|const|let|var|public|private|fn|impl|import|from|require)\b",
                r"(\{|\[|\(|<\/|=>|\+=|\-\-)",
                r"\b(write a script|code|debug|refactor|compile|regex|syntax)\b",
                r"\b(github|gitlab|api endpoint|json payload)\b"
            ],
            "reasoning": [
                r"\b(solve|calculate|math|theorem|equation|algebra|calculus|logical|proof|prove)\b",
                r"\b(step-by-step|reasoning|deduct|derive|derivation|hypothesis|logic puzzle)\b",
                r"\b(why did|cause|effect|philosophical|implication|analyze the impact)\b"
            ],
            "summarization": [
                r"\b(summarize|summary|tl;dr|tldr|condense|shorten|outline the key points)\b",
                r"\b(executive summary|briefly explain|wrap up|core takeaways|bullet point list of)\b"
            ],
            "extraction": [
                r"\b(extract|pull out|retrieve|find all|entities|names|emails|phone numbers|urls|dates)\b",
                r"\b(convert to json|output as a table|list the|format as list|parse the values)\b"
            ]
        }

    def classify_prompt(self, prompt: str) -> str:
        """Classifies a user prompt into one of the 5 standard intent classes."""
        prompt_clean = prompt.lower().strip()
        
        # Calculate scoring weights for each category based on regex matches
        scores = {intent: 0 for intent in self.rules.keys()}
        
        for intent, patterns in self.rules.items():
            for pattern in patterns:
                matches = re.findall(pattern, prompt_clean)
                scores[intent] += len(matches)
                
        # Find the highest-scoring intent
        max_score = 0
        best_intent = "general"
        
        for intent, score in scores.items():
            if score > max_score:
                max_score = score
                best_intent = intent
                
        logger.info(f"Prompt classified as intent: '{best_intent}' (score: {max_score})")
        return best_intent

    def get_route_model(self, intent: str) -> str:
        """Returns the optimized target model based on user intent."""
        if intent == "reasoning":
            return settings.MODEL_REASONING
        elif intent == "coding":
            return settings.MODEL_CODING
        elif intent == "summarization":
            return settings.MODEL_SUMMARIZATION
        elif intent == "extraction":
            return settings.MODEL_EXTRACTION
        else:
            return settings.MODEL_FALLBACK

# Singleton orchestration instance
orchestrator = OrchestrationEngine()
