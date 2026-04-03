"""
RAG (Retrieval-Augmented Generation) Service for DermAI
Uses Groq for fast LLM responses and Gemini for embeddings with 4-key fallback
"""

import os
import logging
import requests
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
import numpy as np
from sentence_transformers import SentenceTransformer
from gemini_manager import gemini_manager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class DermatologyRAGService:
    def __init__(self):
        """Initialize the RAG service with APIs and vector database"""
        
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.gemini_manager = gemini_manager
        self.embedding_model_name = os.getenv("LOCAL_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.supabase: Client | None = None
        if self.supabase_url and self.supabase_key:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                logger.warning(f"Supabase client initialization failed: {e}")
        else:
            logger.warning("Supabase credentials are missing; using built-in dermatology knowledge")
        
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        
        self.local_model = None
        self.use_local_embeddings = False
        
        self._initialize_embeddings()
        self.knowledge_table = "dermatology_knowledge"
        
        logger.info("DermatologyRAGService initialized successfully")
    
    def _initialize_embeddings(self):
        """Initialize embedding generation method"""
        if self.gemini_manager.is_configured():
            logger.info("Using Gemini API for embeddings")
        else:
            logger.warning("Gemini API key not found, trying local model")
            self._try_load_local_embeddings()

    def _try_load_local_embeddings(self) -> None:
        try:
            os.environ['TRANSFORMERS_CACHE'] = '/tmp/transformers_cache'
            os.environ['HF_HOME'] = '/tmp/hf_home'

            self.local_model = SentenceTransformer(self.embedding_model_name)
            self.use_local_embeddings = True
            logger.info("Local embedding model loaded successfully")
        except Exception as e:
            self.local_model = None
            self.use_local_embeddings = False
            logger.warning(f"Local embedding model failed: {e}")
            logger.info("Running without embedding similarity search")
    
    def generate_embeddings_gemini(self, text: str) -> List[float]:
        """Generate embeddings using Gemini API with fallback"""
        try:
            if self.use_local_embeddings:
                embedding = self.local_model.encode(text)
                return embedding.tolist()
            
            # Use 4-key fallback system via Gemini Manager
            try:
                return self.gemini_manager.generate_embeddings(
                    text=text,
                    model_name="models/text-embedding-004"
                )
            except Exception as e:
                logger.error(f"All Gemini API keys failed for embeddings: {e}")
                raise e
            
        except Exception as e:
            logger.error(f"All Gemini embedding methods failed: {e}")
            # Fallback to local model
            if not self.use_local_embeddings and self.local_model is None:
                self._try_load_local_embeddings()
                if self.local_model is None:
                    logger.error("Local embedding fallback is unavailable")
                    # Return a zero vector as last resort
                    return [0.0] * 384
            
            if self.local_model:
                embedding = self.local_model.encode(text)
                return embedding.tolist()
            else:
                return [0.0] * 384
    
    def generate_embeddings_query(self, query: str) -> List[float]:
        """Generate embeddings for search queries with fallback"""
        try:
            if self.use_local_embeddings:
                embedding = self.local_model.encode(query)
                return embedding.tolist()
            
            # Use 4-key fallback system via Gemini Manager
            try:
                return self.gemini_manager.generate_embeddings(
                    text=query,
                    model_name="models/text-embedding-004"
                )
            except Exception as e:
                logger.error(f"All Gemini API keys failed for query embeddings: {e}")
                # Continue to fallback methods below
            
        except Exception as e:
            logger.error(f"All Gemini query embedding methods failed: {e}")
            # Fallback to local model or zero vector
            if self.local_model:
                try:
                    embedding = self.local_model.encode(query)
                    return embedding.tolist()
                except Exception as local_e:
                    logger.error(f"Local model encoding failed: {local_e}")
                    return [0.0] * 384
            else:
                logger.warning("No embedding method available, using zero vector")
                return [0.0] * 384
    
    def store_knowledge(self, title: str, content: str, category: str = "general", 
                       confidence_level: float = 0.8) -> bool:
        """Store knowledge in the vector database"""
        if self.supabase is None:
            logger.warning("Supabase is not configured; skipping knowledge storage")
            return False

        try:
            # Generate embedding for the content
            embedding = self.generate_embeddings_gemini(f"{title}. {content}")
            
            # Store in Supabase
            data = {
                "title": title,
                "content": content,
                "category": category,
                "embedding": embedding,
                "confidence_level": confidence_level
            }
            
            result = self.supabase.table(self.knowledge_table).insert(data).execute()
            
            if result.data:
                logger.info(f"Successfully stored knowledge: {title}")
                return True
            else:
                logger.error(f"Failed to store knowledge: {title}")
                return False
                
        except Exception as e:
            logger.error(f"Error storing knowledge: {e}")
            return False
    
    def search_knowledge(self, query: str, limit: int = 5, similarity_threshold: float = 0.7) -> List[Dict]:
        """Search for relevant knowledge using vector similarity"""
        if self.supabase is None:
            return self._get_builtin_knowledge(query)

        try:
            # Generate query embedding
            query_embedding = self.generate_embeddings_query(query)
            
            # Perform vector search in Supabase
            result = self.supabase.rpc(
                'match_documents',
                {
                    'query_embedding': query_embedding,
                    'match_threshold': similarity_threshold,
                    'match_count': limit
                }
            ).execute()
            
            if result.data:
                return result.data
            else:
                # Fallback to text search if vector search fails
                return self._fallback_text_search(query, limit)
                
        except Exception as e:
            logger.error(f"Knowledge search failed: {e}")
            return self._fallback_text_search(query, limit)
    
    def _fallback_text_search(self, query: str, limit: int = 5) -> List[Dict]:
        """Fallback text-based search when vector search fails"""
        if self.supabase is None:
            return self._get_builtin_knowledge(query)

        try:
            result = self.supabase.table(self.knowledge_table)\
                .select("*")\
                .or_(f"title.ilike.%{query}%,content.ilike.%{query}%")\
                .limit(limit)\
                .execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Fallback text search failed: {e}")
            # Use built-in knowledge when database is unavailable
            logger.info(f"Knowledge base unavailable, using built-in knowledge for: {query}")
            return self._get_builtin_knowledge(query)
    
    def _get_builtin_knowledge(self, query: str) -> List[Dict]:
        """Built-in medical knowledge fallback when database is unavailable"""
        
        # Comprehensive dermatology knowledge base
        knowledge_base = {
            "acne": {
                "title": "Acne Vulgaris - Comprehensive Guide",
                "content": """**Acne Vulgaris** is one of the most common skin conditions, affecting millions worldwide.

**Types of Acne:**
- **Comedonal Acne**: Blackheads and whiteheads
- **Inflammatory Acne**: Papules, pustules, nodules, and cysts
- **Hormonal Acne**: Often seen in adults, particularly women

**Pathophysiology:**
1. **Sebaceous Gland Hyperactivity**: Increased oil production
2. **Follicular Hyperkeratinization**: Clogged pores
3. **Bacterial Proliferation**: Propionibacterium acnes growth
4. **Inflammation**: Immune response to bacterial overgrowth

**Treatment Approach:**
- **Mild Acne**: Topical retinoids, benzoyl peroxide, salicylic acid
- **Moderate Acne**: Combination topicals, topical antibiotics
- **Severe Acne**: Oral antibiotics, isotretinoin (Accutane)
- **Hormonal Acne**: Anti-androgen therapy, oral contraceptives

**Evidence-Based Recommendations:**
- Retinoids are the cornerstone of acne treatment
- Combination therapy is more effective than monotherapy
- Maintenance therapy prevents recurrence
- Sun protection is essential during treatment

**When to See a Dermatologist:**
- Moderate to severe acne
- Scarring development
- Emotional distress from acne
- Failure of over-the-counter treatments""",
                "category": "inflammatory_conditions",
                "confidence_level": 0.95
            },
            
            "exanthems": {
                "title": "Exanthems and Drug Eruptions - Diagnostic Guide",
                "content": """**Exanthems** are widespread skin rashes typically associated with systemic illness or drug reactions.

**Common Viral Exanthems:**
- **Measles (Rubeola)**: Maculopapular rash starting on face, spreads downward
- **Rubella**: Milder rash, lymphadenopathy
- **Roseola**: High fever followed by maculopapular rash in infants
- **Fifth Disease**: "Slapped cheek" appearance, lacy rash on extremities
- **Chickenpox**: Vesicular rash in various stages

**Drug Eruptions:**
**Classification:**
- **Maculopapular Drug Eruptions** (most common)
- **Urticarial Drug Eruptions**
- **Fixed Drug Eruptions**
- **Severe Cutaneous Adverse Reactions (SCAR)**

**High-Risk Medications:**
- Antibiotics (penicillins, sulfonamides)
- Anticonvulsants (phenytoin, carbamazepine)
- NSAIDs
- Allopurinol

**Clinical Assessment:**
1. **Timing**: Onset typically 7-14 days after drug initiation
2. **Morphology**: Symmetric, widespread distribution
3. **Associated Symptoms**: Fever, eosinophilia, organ involvement

**Management:**
- **Identify and discontinue causative agent**
- **Supportive care**: Topical corticosteroids, antihistamines
- **Severe cases**: Systemic corticosteroids, hospitalization
- **SCAR conditions**: Immediate discontinuation, intensive care

**Evidence-Based Practice:**
- Early recognition and drug cessation improves outcomes
- Patch testing may help identify culprit drugs
- Rechallenge should be avoided for severe reactions""",
                "category": "drug_reactions",
                "confidence_level": 0.92
            },

            "eczema": {
                "title": "Atopic Dermatitis (Eczema) - Management Guidelines",
                "content": """**Atopic Dermatitis** is a chronic, inflammatory skin condition with genetic and environmental components.

**Clinical Features:**
- **Acute**: Erythema, vesicles, weeping, crusting
- **Chronic**: Lichenification, scaling, hyperpigmentation
- **Distribution**: Face/neck in infants, flexural areas in children/adults

**Pathophysiology:**
- **Skin Barrier Dysfunction**: Filaggrin mutations
- **Immune Dysregulation**: Th2-mediated inflammation
- **Environmental Triggers**: Allergens, irritants, stress

**Treatment Ladder:**
1. **Basic Care**: Moisturizers, gentle cleansers, trigger avoidance
2. **Topical Anti-inflammatories**: Corticosteroids, calcineurin inhibitors
3. **Systemic Therapy**: Immunosuppressants, biologics
4. **Advanced Therapy**: JAK inhibitors, dupilumab

**Evidence-Based Management:**
- Proactive therapy reduces flares
- Topical calcineurin inhibitors safe for sensitive areas
- Biologics effective for moderate-severe disease
- Microbiome modulation shows promise""",
                "category": "inflammatory_conditions",
                "confidence_level": 0.94
            },

            "hair_loss": {
                "title": "Alopecia - Comprehensive Evaluation and Treatment",
                "content": """**Alopecia** encompasses various forms of hair loss with different etiologies and treatments.

**Types of Alopecia:**
- **Androgenetic Alopecia**: Male/female pattern baldness
- **Alopecia Areata**: Autoimmune hair loss
- **Telogen Effluvium**: Diffuse hair shedding
- **Trichotillomania**: Hair pulling disorder
- **Scarring Alopecia**: Permanent follicle destruction

**Androgenetic Alopecia:**
- **Pathophysiology**: DHT sensitivity, genetic predisposition
- **Treatment**: Minoxidil, finasteride, hair transplantation
- **Evidence**: Early treatment more effective

**Alopecia Areata:**
- **Pathophysiology**: Autoimmune attack on hair follicles
- **Treatment**: Corticosteroids, JAK inhibitors, immunotherapy
- **Prognosis**: Variable, may spontaneously resolve

**Diagnostic Approach:**
1. **History**: Onset, pattern, family history, medications
2. **Examination**: Pull test, dermoscopy, scalp biopsy
3. **Laboratory**: Thyroid, iron studies, hormonal evaluation

**Treatment Evidence:**
- Combination therapy often superior to monotherapy
- Early intervention improves outcomes
- Realistic expectations important for patient satisfaction""",
                "category": "hair_disorders",
                "confidence_level": 0.91
            }
        }
        
        # Find relevant knowledge based on query
        query_lower = query.lower()
        relevant_docs = []
        
        # Direct matches
        for key, doc in knowledge_base.items():
            if key in query_lower or any(word in query_lower for word in key.split('_')):
                relevant_docs.append(doc)
        
        # Content-based matches
        if not relevant_docs:
            for key, doc in knowledge_base.items():
                content_lower = doc['content'].lower()
                title_lower = doc['title'].lower()
                if any(word in content_lower or word in title_lower for word in query_lower.split()):
                    relevant_docs.append(doc)
        
        # If no specific matches, provide general dermatology guidance
        if not relevant_docs:
            relevant_docs.append({
                "title": "General Dermatology Guidance",
                "content": """**General Dermatological Assessment:**

**Common Skin Conditions:**
- Inflammatory conditions (eczema, psoriasis, dermatitis)
- Infectious conditions (bacterial, viral, fungal)
- Neoplastic conditions (benign and malignant lesions)
- Autoimmune conditions (lupus, pemphigus, etc.)

**Red Flags Requiring Immediate Evaluation:**
- Rapidly changing lesions
- Asymmetric, irregular, or multi-colored moles
- Lesions with bleeding or ulceration
- Systemic symptoms with rash

**General Management Principles:**
1. Proper skin care and moisturization
2. Sun protection measures
3. Avoidance of known triggers
4. Evidence-based topical and systemic treatments
5. Regular follow-up for chronic conditions

**When to Seek Dermatological Care:**
- Persistent or worsening skin conditions
- Suspicious lesions or moles
- Severe or widespread rashes
- Failure of initial treatment approaches""",
                "category": "general_dermatology",
                "confidence_level": 0.75
            })
        
        return relevant_docs[:3]  # Return top 3 matches
    
    def generate_response_groq(self, prompt: str, max_tokens: int = 1500) -> Dict[str, Any]:
        """Generate response using Groq API"""
        if not self.groq_api_key:
            return {
                "content": "DermAi could not reach the language model because GROQ_API_KEY is not configured.",
                "error": "GROQ_API_KEY is not configured",
            }

        try:
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "llama-3.3-70b-versatile",  # Use latest stable Groq model
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert dermatologist AI assistant. Provide accurate, helpful medical information while always recommending consultation with healthcare professionals for serious concerns."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": max_tokens,
                "temperature": 0.1,  # Low temperature for medical accuracy
                "stream": False
            }
            
            response = requests.post(self.groq_url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            
            return {
                "content": result["choices"][0]["message"]["content"],
                "usage": result.get("usage", {}),
                "model": result["model"]
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Groq API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            return {
                "content": "I apologize, but I couldn't generate a response at this time. Please consult with a dermatologist for medical advice.",
                "error": f"API request failed: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            return {
                "content": "I apologize, but I couldn't generate a response at this time. Please consult with a dermatologist for medical advice.",
                "error": str(e)
            }
    
    def generate_response_gemini(self, prompt: str, max_tokens: int = 1500) -> Dict[str, Any]:
        """Generate response using Gemini API with 4-key fallback"""
        try:
            # Configure the system instruction
            system_instruction = "You are an expert dermatologist AI assistant. Provide accurate, helpful medical information while always recommending consultation with healthcare professionals for serious concerns."
            
            full_prompt = f"{system_instruction}\n\nUser query: {prompt}"
            
            # Use gemini_manager for robust fallback
            response_text = self.gemini_manager.generate_content(
                prompt=full_prompt,
                model_name="gemini-2.0-flash-exp"
            )
            
            return {
                "content": response_text,
                "model": "gemini-2.0-flash-exp"
            }
            
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            return {
                "content": "I apologize, but I couldn't generate a response at this time. Please consult with a dermatologist for medical advice.",
                "error": str(e)
            }
    
    def chat_with_rag(self, user_message: str, chat_history: List[Dict] = None) -> Dict[str, Any]:
        """Main RAG chat function"""
        try:
            # Search for relevant knowledge
            relevant_docs = self.search_knowledge(user_message, limit=3)
            
            # Build context from retrieved documents
            context = ""
            sources = []
            
            for doc in relevant_docs:
                context += f"\n\n**{doc['title']}**\n{doc['content']}"
                sources.append({
                    "title": doc['title'],
                    "category": doc.get('category', 'general'),
                    "confidence": doc.get('confidence_level', 0.8)
                })
            
            # Build the prompt
            system_context = """You are an expert dermatology AI assistant. Use the provided medical literature and knowledge to answer questions accurately. 

IMPORTANT GUIDELINES:
- Provide evidence-based responses using the given context
- Always recommend consulting healthcare professionals for diagnosis
- If unsure about something, clearly state your limitations
- Focus on educational information rather than definitive diagnoses
- Include confidence levels when appropriate"""

            if context:
                prompt = f"""{system_context}

**Relevant Medical Literature:**
{context}

**User Question:** {user_message}

Please provide a comprehensive response based on the medical literature provided above. Include your confidence level in the response."""
            else:
                prompt = f"""{system_context}

**User Question:** {user_message}

**Note:** No specific medical literature was found for this query. Please provide general dermatological guidance and recommend consulting a healthcare professional."""

            # Generate response using Groq, fallback to Gemini if needed
            response_data = self.generate_response_groq(prompt, max_tokens=1500)
            
            # If Groq failed and we have Gemini, try Gemini as fallback
            if "error" in response_data and self.gemini_manager.is_configured():
                logger.info("Groq failed, trying Gemini as fallback...")
                response_data = self.generate_response_gemini(prompt, max_tokens=1500)
            
            # Calculate confidence based on sources and response quality
            confidence = self._calculate_response_confidence(relevant_docs, response_data)
            
            return {
                "response": response_data["content"],
                "sources": sources,
                "confidence": confidence,
                "context_used": len(relevant_docs) > 0,
                "model_info": {
                    "llm": response_data.get("model", "llama-3.3-70b-versatile"),
                    "embedding": "gemini-text-embedding-004" if not self.use_local_embeddings else "sentence-transformers"
                }
            }
            
        except Exception as e:
            logger.error(f"RAG chat failed: {e}")
            return {
                "response": "I apologize, but I encountered an error processing your request. Please try again or consult with a healthcare professional.",
                "sources": [],
                "confidence": 0.0,
                "error": str(e)
            }
    
    def enhanced_diagnosis_with_rag(self, ml_results: Dict, user_symptoms: str = "") -> Dict[str, Any]:
        """Enhance ML diagnosis results with RAG knowledge"""
        try:
            # Extract key information from ML results
            condition = ml_results.get('prediction', 'unknown condition')
            confidence = ml_results.get('confidence', 0.0)
            
            # Build search query
            search_query = f"{condition} dermatology symptoms treatment"
            if user_symptoms:
                search_query += f" {user_symptoms}"
            
            # Search for relevant knowledge
            relevant_docs = self.search_knowledge(search_query, limit=3)
            
            # Build enhanced context
            context = ""
            sources = []
            
            for doc in relevant_docs:
                context += f"\n\n**{doc['title']}**\n{doc['content']}"
                sources.append({
                    "title": doc['title'],
                    "category": doc.get('category', 'general'),
                    "confidence": doc.get('confidence_level', 0.8)
                })
            
            # Create enhanced diagnosis prompt
            prompt = f"""As an expert dermatology AI, provide an enhanced analysis of this diagnosis:

**ML Model Results:**
- Predicted Condition: {condition}
- Model Confidence: {confidence:.2%}
- User Symptoms: {user_symptoms if user_symptoms else 'Not provided'}

**Relevant Medical Literature:**
{context}

Please provide:
1. Analysis of the ML model's prediction accuracy
2. Additional insights from medical literature  
3. Recommended next steps
4. Important disclaimers and when to seek professional care
5. Overall confidence in this enhanced diagnosis

Remember to emphasize that this is for educational purposes and professional medical consultation is essential."""

            # Generate enhanced response
            response_data = self.generate_response_groq(prompt, max_tokens=2000)
            
            # Calculate enhanced confidence
            enhanced_confidence = self._calculate_enhanced_confidence(confidence, relevant_docs)
            
            return {
                "enhanced_diagnosis": response_data["content"],
                "original_ml_confidence": confidence,
                "enhanced_confidence": enhanced_confidence,
                "sources": sources,
                "context_used": len(relevant_docs) > 0,
                "recommendations": self._extract_recommendations(response_data["content"])
            }
            
        except Exception as e:
            logger.error(f"Enhanced diagnosis failed: {e}")
            return {
                "enhanced_diagnosis": f"Original ML prediction: {condition} (confidence: {confidence:.2%}). Unable to provide enhanced analysis at this time. Please consult a healthcare professional.",
                "original_ml_confidence": confidence,
                "enhanced_confidence": confidence,
                "sources": [],
                "error": str(e)
            }
    
    def _calculate_response_confidence(self, sources: List[Dict], response_data: Dict) -> float:
        """Calculate confidence score for RAG responses"""
        base_confidence = 0.5
        
        # Boost confidence based on number of sources
        source_boost = min(len(sources) * 0.15, 0.3)
        
        # Boost based on source quality
        source_quality = sum(doc.get('confidence_level', 0.8) for doc in sources)
        quality_boost = (source_quality / len(sources)) * 0.2 if sources else 0
        
        # Check for error indicators
        if "error" in response_data or "apologize" in response_data.get("content", "").lower():
            return max(base_confidence - 0.3, 0.1)
        
        final_confidence = min(base_confidence + source_boost + quality_boost, 0.95)
        return round(final_confidence, 2)
    
    def _calculate_enhanced_confidence(self, ml_confidence: float, sources: List[Dict]) -> float:
        """Calculate enhanced confidence combining ML and RAG"""
        if not sources:
            return ml_confidence
        
        # Average source confidence
        avg_source_confidence = sum(doc.get('confidence_level', 0.8) for doc in sources) / len(sources)
        
        # Weighted combination (60% ML, 40% RAG knowledge)
        enhanced = (ml_confidence * 0.6) + (avg_source_confidence * 0.4)
        
        # Add small boost for having multiple sources
        source_boost = min(len(sources) * 0.05, 0.15)
        
        return min(round(enhanced + source_boost, 2), 0.95)
    
    def _extract_recommendations(self, response_text: str) -> List[str]:
        """Extract actionable recommendations from response"""
        recommendations = []
        
        # Simple extraction based on common patterns
        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['recommend', 'suggest', 'should', 'consider']):
                if len(line) > 20 and len(line) < 200:  # Reasonable recommendation length
                    recommendations.append(line)
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    def seed_knowledge_base(self) -> Dict[str, Any]:
        """Seed the knowledge base with essential dermatology information"""
        try:
            seed_data = [
                {
                    "title": "Acne Vulgaris Overview",
                    "content": "Acne vulgaris is a common skin condition affecting hair follicles and sebaceous glands. It typically presents with comedones (blackheads and whiteheads), papules, pustules, and in severe cases, nodules and cysts. Most commonly affects face, chest, and back. Treatment varies from topical retinoids and antibiotics to oral medications depending on severity.",
                    "category": "acne",
                    "confidence_level": 0.9
                },
                {
                    "title": "Hair Loss (Alopecia) Types",
                    "content": "Alopecia includes various types of hair loss. Androgenetic alopecia (male/female pattern baldness) is most common, caused by genetics and hormones. Alopecia areata involves patchy hair loss due to autoimmune factors. Telogen effluvium causes diffuse hair loss often triggered by stress, illness, or medications. Treatment options include minoxidil, finasteride, and in some cases, hair transplantation.",
                    "category": "hair_loss",
                    "confidence_level": 0.9
                },
                {
                    "title": "Melanoma Warning Signs",
                    "content": "Melanoma is the most dangerous form of skin cancer. Warning signs include the ABCDE criteria: Asymmetry, Border irregularity, Color variation, Diameter greater than 6mm, and Evolving appearance. Early detection is crucial for successful treatment. Any suspicious moles or skin changes should be evaluated by a dermatologist immediately.",
                    "category": "skin_cancer",
                    "confidence_level": 0.95
                },
                {
                    "title": "Eczema (Atopic Dermatitis) Management",
                    "content": "Eczema is a chronic inflammatory skin condition characterized by itchy, red, and scaly patches. Management includes moisturizing regularly, identifying and avoiding triggers, using topical corticosteroids or calcineurin inhibitors during flares, and maintaining good skin hygiene. Severe cases may require systemic treatments.",
                    "category": "eczema",
                    "confidence_level": 0.85
                },
                {
                    "title": "Psoriasis Treatment Approaches",
                    "content": "Psoriasis is an autoimmune condition causing thick, scaly patches on skin. Treatment is tiered: mild cases use topical treatments (corticosteroids, vitamin D analogs), moderate cases may need phototherapy, severe cases often require systemic medications like biologics. Treatment choice depends on severity, location, and patient factors.",
                    "category": "psoriasis",
                    "confidence_level": 0.88
                }
            ]
            
            successful_inserts = 0
            for data in seed_data:
                if self.store_knowledge(**data):
                    successful_inserts += 1
            
            return {
                "message": f"Successfully seeded {successful_inserts}/{len(seed_data)} knowledge entries",
                "total_attempted": len(seed_data),
                "successful": successful_inserts
            }
            
        except Exception as e:
            logger.error(f"Knowledge base seeding failed: {e}")
            return {
                "message": "Failed to seed knowledge base",
                "error": str(e)
            }
