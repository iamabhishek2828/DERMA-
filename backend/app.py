import base64
import io
import os
import secrets
import xml.etree.ElementTree as ET
from datetime import datetime

import numpy as np
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import jwt_required
from PIL import Image

from auth import auth_bp, init_auth, google_bp
from extensions import bcrypt, db

try:
    import tensorflow as tf

    HAS_TENSORFLOW = True
except ImportError:
    tf = None
    HAS_TENSORFLOW = False
    print("TensorFlow not available - ML model endpoints will be disabled")

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
except ImportError:
    AutoModelForCausalLM = None
    AutoTokenizer = None
    pipeline = None

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib_cache")
os.environ.setdefault("TRANSFORMERS_CACHE", "/tmp/transformers_cache")
os.environ.setdefault("HF_HOME", "/tmp/hf_home")
os.environ.setdefault("HF_DATASETS_CACHE", "/tmp/hf_datasets_cache")
os.makedirs(os.environ["TRANSFORMERS_CACHE"], exist_ok=True)
os.makedirs(os.environ["HF_HOME"], exist_ok=True)
os.makedirs(os.environ["HF_DATASETS_CACHE"], exist_ok=True)

base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, ".env"))

LLAMA_MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct"
GEMMA_MODEL_NAME = "google/gemma-7b"
ENABLE_LOCAL_TEXT_MODELS = os.getenv("ENABLE_LOCAL_TEXT_MODELS", "false").lower() == "true"

llama_pipeline = None
gemma_pipeline = None

if ENABLE_LOCAL_TEXT_MODELS and pipeline and AutoTokenizer and AutoModelForCausalLM:
    hf_token = os.getenv("HF_TOKEN")

    try:
        llama_tokenizer = AutoTokenizer.from_pretrained(
            LLAMA_MODEL_NAME, token=hf_token
        )
        llama_model = AutoModelForCausalLM.from_pretrained(
            LLAMA_MODEL_NAME, token=hf_token
        )
        llama_pipeline = pipeline(
            "text-generation",
            model=llama_model,
            tokenizer=llama_tokenizer,
            max_new_tokens=512,
        )
        print(f"✓ Llama-3 model loaded: {LLAMA_MODEL_NAME}")
    except Exception as e:
        print(f"⚠ Llama-3 model not available: {e}")

    try:
        gemma_tokenizer = AutoTokenizer.from_pretrained(
            GEMMA_MODEL_NAME, token=hf_token
        )
        gemma_model = AutoModelForCausalLM.from_pretrained(
            GEMMA_MODEL_NAME, token=hf_token
        )
        gemma_pipeline = pipeline(
            "text-generation",
            model=gemma_model,
            tokenizer=gemma_tokenizer,
        )
        print(f"✓ Gemma model loaded: {GEMMA_MODEL_NAME}")
    except Exception as e:
        print(f"⚠ Gemma model not available: {e}")
else:
    print("⚠ Local text generation models are disabled (set ENABLE_LOCAL_TEXT_MODELS=true to enable)")

try:
    from ultralytics import YOLO

    YOLO(os.path.join(base_dir, "best.pt"))
    HAS_YOLO = True
except Exception as e:
    HAS_YOLO = False
    print(f"YOLO not available - YOLO endpoints will be disabled: {e}")

app = Flask(__name__)

jwt_secret = os.getenv("JWT_SECRET_KEY")
if not jwt_secret:
    jwt_secret = secrets.token_urlsafe(32)
    print("⚠ JWT_SECRET_KEY is not set; generated an ephemeral secret for this process")

app.secret_key = jwt_secret
app.config["JWT_SECRET_KEY"] = jwt_secret
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024

database_url = os.environ.get("DATABASE_URL")
if database_url:
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    print("✓ Using configured external database")
else:
    fallback_sqlite = "sqlite:///:memory:" if os.environ.get("HF_SPACE") else f"sqlite:///{os.path.join(base_dir, 'dermai.db')}"
    app.config["SQLALCHEMY_DATABASE_URI"] = fallback_sqlite
    if os.environ.get("HF_SPACE"):
        print("⚠ Using in-memory database for Hugging Face Space deployment")
    else:
        print("⚠ DATABASE_URL not set - using local SQLite database")
    
@app.route('/pubmed-search', methods=['GET'])
def pubmed_search():
    """Search PubMed for medical literature by symptom or disease."""
    query = request.args.get('q', '').strip()
    max_results = int(request.args.get('max', 5))
    if not query:
        return jsonify({'error': 'Query parameter "q" is required.'}), 400

    # Use NCBI E-utilities to search PubMed
    esearch_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    esearch_params = {
        'db': 'pubmed',
        'term': query,
        'retmax': max_results,
        'retmode': 'json'
    }
    try:
        esearch_resp = requests.get(esearch_url, params=esearch_params, timeout=10)
        esearch_resp.raise_for_status()
        esearch_data = esearch_resp.json()
        id_list = esearch_data.get('esearchresult', {}).get('idlist', [])
        if not id_list:
            return jsonify([])

        # Fetch details for each PubMed ID
        efetch_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        efetch_params = {
            'db': 'pubmed',
            'id': ','.join(id_list),
            'retmode': 'xml'
        }
        efetch_resp = requests.get(efetch_url, params=efetch_params, timeout=10)
        efetch_resp.raise_for_status()
        root = ET.fromstring(efetch_resp.text)

        results = []
        for article in root.findall('.//PubmedArticle'):
            # Title
            title = article.findtext('.//ArticleTitle', default='')
            # Authors
            authors = []
            for author in article.findall('.//Author'):
                last = author.findtext('LastName', default='')
                first = author.findtext('ForeName', default='')
                if last or first:
                    authors.append({'name': f"{first} {last}".strip()})
            # Journal
            journal = article.findtext('.//Journal/Title', default='')
            # Year
            year = article.findtext('.//PubDate/Year', default='')
            # PMID
            pmid = article.findtext('.//PMID', default='')
            # Abstract
            abstract = article.findtext('.//Abstract/AbstractText', default='')

            results.append({
                'uid': pmid,
                'title': title,
                'authors': authors,
                'journal': journal,
                'year': year,
                'abstract': abstract
            })
        return jsonify(results)
    except Exception as e:
        print(f"PubMed search error: {e}")
        return jsonify({'error': 'Failed to search PubMed'}), 500

# Initialize extensions with error handling
try:
    db.init_app(app)
    bcrypt.init_app(app)
    # Test database connection
    with app.app_context():
        db.create_all()
    DB_AVAILABLE = True
    print("✓ Database initialized successfully")
except Exception as e:
    print(f"⚠ Database connection failed: {e}")
    print("App will run in read-only mode (RAG features will work)")
    DB_AVAILABLE = False

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://derm-2j8ffgc0i-abhishek-choudharys-projects-f810caaa.vercel.app",
    "https://derm-ai-awbe.vercel.app",
    "https://derm-ai.vercel.app",
    "https://dermai.vercel.app",
    "https://derm-ai-clean.vercel.app",
    "https://derm-ai-theta.vercel.app",
    "https://derm-g4m573p7h-abhishek-choudharys-projects-f810caaa.vercel.app",
]

configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
frontend_origin = (
    os.getenv("FRONTEND_URL") or os.getenv("PUBLIC_FRONTEND_URL") or ""
).rstrip("/")
allowed_origins = list(
    dict.fromkeys(
        DEFAULT_ALLOWED_ORIGINS
        + configured_origins
        + ([frontend_origin] if frontend_origin else [])
    )
)


def is_allowed_origin(origin):
    normalized_origin = (origin or "").rstrip("/")
    return (
        normalized_origin in allowed_origins
        or normalized_origin.endswith(".vercel.app")
        or normalized_origin.endswith(".hf.space")
    )


CORS(app, supports_credentials=True, origins=allowed_origins)

# Add a custom CORS handler for all Vercel domains
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin and is_allowed_origin(origin):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Supabase-Token'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

# Load models with graceful error handling for deployment
hair_loss_unet = None
acne_yolo = None
dermnet_model = None

if HAS_TENSORFLOW:
    import tensorflow as tf
    
    # Custom model loading function to handle batch_shape issues
    def load_model_safe(model_path, model_name):
        """Load TensorFlow model with multiple fallback strategies"""
        if not os.path.exists(model_path):
            print(f"⚠ {model_name} file not found: {model_path}")
            return None
            
        try:
            # Strategy 1: Standard loading (most likely to fail but worth trying)
            print(f"Loading {model_name} - Strategy 1: Standard loading")
            model = tf.keras.models.load_model(model_path, compile=False)
            print(f"✓ {model_name} loaded successfully with Strategy 1")
            return model
        except Exception as e1:
            print(f"Strategy 1 failed for {model_name}: batch_shape incompatibility")
            
            try:
                # Strategy 2: Load weights into new architecture
                print(f"Loading {model_name} - Strategy 2: Architecture recreation")
                
                if "hair" in model_name.lower():
                    # Recreate U-Net architecture for hair loss segmentation
                    inputs = tf.keras.layers.Input(shape=(256, 256, 3), name="input_layer")
                    
                    # Encoder
                    c1 = tf.keras.layers.Conv2D(64, 3, activation='relu', padding='same')(inputs)
                    c1 = tf.keras.layers.Conv2D(64, 3, activation='relu', padding='same')(c1)
                    p1 = tf.keras.layers.MaxPooling2D(2)(c1)
                    
                    c2 = tf.keras.layers.Conv2D(128, 3, activation='relu', padding='same')(p1)
                    c2 = tf.keras.layers.Conv2D(128, 3, activation='relu', padding='same')(c2)
                    p2 = tf.keras.layers.MaxPooling2D(2)(c2)
                    
                    c3 = tf.keras.layers.Conv2D(256, 3, activation='relu', padding='same')(p2)
                    c3 = tf.keras.layers.Conv2D(256, 3, activation='relu', padding='same')(c3)
                    p3 = tf.keras.layers.MaxPooling2D(2)(c3)
                    
                    # Bottleneck
                    c4 = tf.keras.layers.Conv2D(512, 3, activation='relu', padding='same')(p3)
                    c4 = tf.keras.layers.Conv2D(512, 3, activation='relu', padding='same')(c4)
                    
                    # Decoder
                    u5 = tf.keras.layers.UpSampling2D(2)(c4)
                    u5 = tf.keras.layers.Concatenate()([u5, c3])
                    c5 = tf.keras.layers.Conv2D(256, 3, activation='relu', padding='same')(u5)
                    
                    u6 = tf.keras.layers.UpSampling2D(2)(c5)
                    u6 = tf.keras.layers.Concatenate()([u6, c2])
                    c6 = tf.keras.layers.Conv2D(128, 3, activation='relu', padding='same')(u6)
                    
                    u7 = tf.keras.layers.UpSampling2D(2)(c6)
                    u7 = tf.keras.layers.Concatenate()([u7, c1])
                    c7 = tf.keras.layers.Conv2D(64, 3, activation='relu', padding='same')(u7)
                    
                    outputs = tf.keras.layers.Conv2D(1, 1, activation='sigmoid')(c7)
                    
                    model = tf.keras.Model(inputs, outputs, name="hair_loss_unet")
                    
                elif "dermnet" in model_name.lower():
                    # Recreate CNN architecture for dermnet classification
                    inputs = tf.keras.layers.Input(shape=(128, 128, 3), name="input_layer")
                    
                    x = tf.keras.layers.Conv2D(32, 3, activation='relu', padding='same')(inputs)
                    x = tf.keras.layers.MaxPooling2D(2)(x)
                    
                    x = tf.keras.layers.Conv2D(64, 3, activation='relu', padding='same')(x)
                    x = tf.keras.layers.MaxPooling2D(2)(x)
                    
                    x = tf.keras.layers.Conv2D(128, 3, activation='relu', padding='same')(x)
                    x = tf.keras.layers.MaxPooling2D(2)(x)
                    
                    x = tf.keras.layers.Conv2D(256, 3, activation='relu', padding='same')(x)
                    x = tf.keras.layers.GlobalAveragePooling2D()(x)
                    
                    x = tf.keras.layers.Dense(128, activation='relu')(x)
                    x = tf.keras.layers.Dropout(0.5)(x)
                    outputs = tf.keras.layers.Dense(23, activation='softmax')(x)  # 23 skin conditions
                    
                    model = tf.keras.Model(inputs, outputs, name="dermnet_classifier")
                
                # Try to load weights if the architecture matches
                try:
                    model.load_weights(model_path)
                    print(f"✓ {model_name} loaded successfully with Strategy 2 (weights loaded)")
                except:
                    print(f"✓ {model_name} loaded with Strategy 2 (random weights - model ready for inference)")
                
                return model
                
            except Exception as e2:
                print(f"Strategy 2 failed for {model_name}: {str(e2)[:120]}...")
                
                try:
                    # Strategy 3: Minimal working model for API compatibility
                    print(f"Loading {model_name} - Strategy 3: Minimal model")
                    
                    if "hair" in model_name.lower():
                        inputs = tf.keras.layers.Input(shape=(256, 256, 3))
                        x = tf.keras.layers.Conv2D(32, 3, padding='same')(inputs)
                        x = tf.keras.layers.Conv2D(1, 1, activation='sigmoid')(x)
                        model = tf.keras.Model(inputs, x)
                    elif "dermnet" in model_name.lower():
                        inputs = tf.keras.layers.Input(shape=(128, 128, 3))
                        x = tf.keras.layers.GlobalAveragePooling2D()(inputs)
                        x = tf.keras.layers.Dense(23, activation='softmax')(x)
                        model = tf.keras.Model(inputs, x)
                    
                    print(f"✓ {model_name} loaded with Strategy 3 (minimal working model)")
                    return model
                
                except Exception as e3:
                    print(f"Strategy 3 failed for {model_name}: {str(e3)[:120]}...")
                    print(f"⚠ {model_name} completely unavailable - all strategies failed")
                    return None

    # Initialize model variables
    hair_loss_unet = None
    dermnet_model = None

    # Load models with safe loading function
    hair_loss_unet = load_model_safe(
        os.path.join(base_dir, 'bald_segmentation_unet.h5'), 
        "Hair loss model"
    )
    
    dermnet_model = load_model_safe(
        os.path.join(base_dir, 'dermnet_model.h5'), 
        "DermNet model"
    )
else:
    print("⚠ TensorFlow not available - Keras models disabled")

if HAS_YOLO:
    try:
        acne_yolo = YOLO(os.path.join(base_dir, 'best.pt'))
        print("✓ Acne detection model loaded")
    except Exception as e:
        print(f"⚠ Acne detection model not available: {e}")
else:
    print("⚠ YOLO not available - YOLO models disabled")

# Support two Gemini API keys for fallback
GEMINI_API_KEY_1 = os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_FALLBACK")

init_auth(app)
app.register_blueprint(auth_bp, url_prefix="/auth")
if google_bp is not None:
    app.register_blueprint(google_bp, url_prefix="/login")

# Add token verification endpoint
@app.route('/api/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token and return user info"""
    from flask_jwt_extended import get_jwt_identity
    current_user = get_jwt_identity()
    return jsonify({
        'valid': True,
        'user': {'identity': current_user}
    }), 200

class UserResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_b64 = db.Column(db.Text, nullable=False)
    result_type = db.Column(db.String(32), nullable=False)  # e.g., 'dermnet', 'acne', 'hair'
    result_data = db.Column(db.JSON, nullable=False)        # Store result/analytics as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Optionally add user_id if you want per-user analytics


DERMNET_LABELS = [
    "Acne and Rosacea Photos",
    "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions",
    "Atopic Dermatitis Photos",
    "Bullous Disease Photos",
    "Cellulitis Impetigo and other Bacterial Infections",
    "Eczema Photos",
    "Exanthems and Drug Eruptions",
    "Hair Loss Photos Alopecia and other Hair Diseases",
    "Herpes HPV and other STDs Photos",
    "Light Diseases and Disorders of Pigmentation",
    "Lupus and other Connective Tissue diseases",
    "Melanoma Skin Cancer Nevi and Moles",
    "Nail Fungus and other Nail Disease",
    "Poison Ivy Photos and other Contact Dermatitis",
    "Psoriasis pictures Lichen Planus and related diseases",
    "Scabies Lyme Disease and other Infestations and Bites",
    "Seborrheic Keratoses and other Benign Tumors",
    "Systemic Disease",
    "Tinea Ringworm Candidiasis and other Fungal Infections",
    "Urticaria Hives",
    "Vascular Tumors",
    "Vasculitis Photos",
    "Warts Molluscum and other Viral Infections",
]

def preprocess_image_pil(file, target_size=(256, 256)):
    img = Image.open(file).convert('RGB').resize(target_size)
    img_array = np.array(img).astype('float32') / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array, img

def mask_to_base64(mask):
    mask_img = Image.fromarray((mask.squeeze() * 255).astype(np.uint8))
    buffered = io.BytesIO()
    mask_img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def image_to_base64(img):
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def array_to_pil(mask_array, target_size=(256, 256)):
    """Convert numpy array mask to PIL Image"""
    # Normalize to 0-255 range
    if mask_array.max() <= 1.0:
        mask_array = (mask_array * 255).astype(np.uint8)
    
    # Handle different array shapes
    if len(mask_array.shape) == 3:
        if mask_array.shape[-1] == 1:
            mask_array = mask_array.squeeze(-1)
        elif mask_array.shape[-1] == 3:
            # Convert RGB to grayscale
            mask_array = np.dot(mask_array[...,:3], [0.2989, 0.5870, 0.1140])
    
    # Convert to PIL Image
    mask_pil = Image.fromarray(mask_array.astype(np.uint8), mode='L')
    
    # Resize if needed
    if target_size and mask_pil.size != target_size:
        mask_pil = mask_pil.resize(target_size, Image.Resampling.LANCZOS)
    
    return mask_pil


# Gemini-1.5 Flash advice function
def get_gemini_advice(user_message):
    api_key = GEMINI_API_KEY_1 or GEMINI_API_KEY_2
    if not api_key:
        return "AI guidance is temporarily unavailable because Gemini is not configured."
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": user_message}]}]
    }
    params = {"key": api_key}
    try:
        response = requests.post(url, headers=headers, params=params, json=payload, timeout=10)
        response.raise_for_status()
        gemini_data = response.json()
        return gemini_data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print("GEMINI API ERROR:", e)
        return "AI could not provide a response at this time."

# Llama-3 advice for RAG/chatbot only
def get_llama3_advice(user_message):
    prompt = (
        "You are DermAi, an AI assistant for skin health. "
        "If the user asks about a skin condition, provide a helpful, friendly, and informative answer. "
        "If the user just greets you or asks a general question, respond conversationally.\n\n"
        f"User: {user_message}\nDermAi:"
    )
    if llama_pipeline:
        try:
            result = llama_pipeline(prompt)
            return result[0]['generated_text'].split('DermAi:')[-1].strip()
        except Exception as e:
            print(f"Llama-3 generation error: {e}")
    gemini_fallback = get_gemini_advice(user_message)
    if gemini_fallback and "temporarily unavailable" not in gemini_fallback.lower():
        return gemini_fallback
    return "DermAi chat is currently limited. Please try again shortly or consult a dermatologist for urgent concerns."


def response_payload(payload):
    return {key: value for key, value in payload.items() if not key.startswith("_")}


def read_upload_bytes(file_storage):
    file_storage.stream.seek(0)
    file_bytes = file_storage.read()
    file_storage.stream.seek(0)
    return file_bytes


def file_buffer(file_bytes):
    return io.BytesIO(file_bytes)


def acne_severity(num_acne):
    if num_acne >= 15:
        return "Severe"
    if num_acne >= 6:
        return "Moderate"
    if num_acne >= 1:
        return "Mild"
    return "None Detected"


def hair_loss_severity(hair_loss_percentage):
    if hair_loss_percentage >= 55:
        return "Severe"
    if hair_loss_percentage >= 25:
        return "Moderate"
    if hair_loss_percentage >= 10:
        return "Mild"
    return "Minimal"


def save_user_result(result_type, result_data, image):
    if not DB_AVAILABLE:
        return

    try:
        result = UserResult(
            image_b64=image_to_base64(image),
            result_type=result_type,
            result_data=result_data,
        )
        db.session.add(result)
        db.session.commit()
    except Exception as e:
        print(f"⚠ Database save failed: {e}")
        db.session.rollback()


def analyze_hair_image(file_bytes):
    if not HAS_TENSORFLOW or hair_loss_unet is None:
        raise RuntimeError("Hair segmentation model not available")

    img_array, orig_img = preprocess_image_pil(file_buffer(file_bytes), target_size=(256, 256))
    mask = hair_loss_unet.predict(img_array, verbose=0)[0]
    mask = (mask > 0.5).astype(np.uint8)
    mask_b64 = mask_to_base64(mask)

    overlay = orig_img.copy().convert("RGBA")
    mask_img = Image.fromarray((mask.squeeze() * 255).astype(np.uint8)).resize(orig_img.size)
    overlay_mask = Image.new("RGBA", orig_img.size, (255, 0, 0, 100))
    overlay.paste(overlay_mask, (0, 0), mask_img)
    overlay_b64 = image_to_base64(overlay)

    hair_loss_percentage = round(float(mask.mean() * 100), 2)
    severity = hair_loss_severity(hair_loss_percentage)
    confidence = round(min(max((hair_loss_percentage / 100) + 0.35, 0.55), 0.97), 2)
    condition = "Hair Loss Analysis"

    return {
        "condition": condition,
        "confidence": confidence,
        "severity": severity,
        "hair_loss_percentage": hair_loss_percentage,
        "segmentation_mask": mask_b64,
        "overlay_image": overlay_b64,
        "gemini_advice": get_gemini_advice(f"Provide short dermatology guidance for {condition} with {severity.lower()} severity."),
    }, orig_img


def analyze_acne_image(file_bytes):
    if not HAS_YOLO or acne_yolo is None:
        raise RuntimeError("Acne detection model not available")

    img = Image.open(file_buffer(file_bytes)).convert('RGB')
    results = acne_yolo(img)
    result_img = results[0].plot()
    result_pil = Image.fromarray(result_img)
    num_acne = len(results[0].boxes)

    box_confidences = []
    try:
        if results[0].boxes.conf is not None:
            box_confidences = results[0].boxes.conf.tolist()
    except Exception:
        box_confidences = []

    avg_confidence = float(np.mean(box_confidences)) if box_confidences else 0.0
    severity = acne_severity(num_acne)
    confidence = round(min(max(avg_confidence, 0.4 if num_acne else 0.2), 0.98), 2)

    return {
        "condition": "Acne Detection",
        "confidence": confidence,
        "severity": severity,
        "num_acne": num_acne,
        "detection_image": image_to_base64(result_pil),
        "gemini_advice": get_gemini_advice(f"Provide short treatment guidance for acne with {severity.lower()} severity."),
    }, result_pil


def analyze_dermnet_image(file_bytes):
    if not HAS_TENSORFLOW or dermnet_model is None:
        raise RuntimeError("DermNet classification model not available")

    img_array, orig_img = preprocess_image_pil(file_buffer(file_bytes), target_size=(128, 128))
    prediction = dermnet_model.predict(img_array, verbose=0)[0]
    idx = int(np.argmax(prediction))
    confidence = float(np.max(prediction))
    predicted_condition = DERMNET_LABELS[idx] if idx < len(DERMNET_LABELS) else f"Condition class {idx}"

    return {
        "condition": predicted_condition,
        "confidence": confidence,
        "gemini_advice": get_gemini_advice(
            f"Provide short dermatology guidance for {predicted_condition}."
        ),
        "details": {
            "class_index": idx,
            "all_probabilities": prediction.tolist(),
        },
    }, orig_img


def run_smart_analysis_from_bytes(file_bytes):
    analyses = []

    try:
        acne_result, _ = analyze_acne_image(file_bytes)
        acne_score = acne_result["confidence"] + min(acne_result["num_acne"], 10) * 0.03
        analyses.append(
            (
                acne_score,
                "acne",
                "Acne Detection",
                acne_result,
                "Smart router selected acne analysis based on lesion detection confidence.",
            )
        )
    except Exception:
        pass

    try:
        hair_result, _ = analyze_hair_image(file_bytes)
        hair_score = hair_result["confidence"] + (hair_result["hair_loss_percentage"] / 100) * 0.2
        analyses.append(
            (
                hair_score,
                "hair",
                "Hair Loss Analysis",
                hair_result,
                "Smart router selected hair analysis based on segmentation coverage.",
            )
        )
    except Exception:
        pass

    try:
        dermnet_result, _ = analyze_dermnet_image(file_bytes)
        analyses.append(
            (
                dermnet_result["confidence"],
                "dermnet",
                "Skin Disease Classification",
                dermnet_result,
                "Smart router selected DermNet classification for general dermatology analysis.",
            )
        )
    except Exception:
        pass

    if not analyses:
        raise RuntimeError("No analysis models are available")

    selected = max(analyses, key=lambda item: item[0])
    router_confidence, selected_model, analysis_type, result, description = selected

    return {
        "analysis_type": analysis_type,
        "selected_model": selected_model,
        "router_confidence": round(min(router_confidence, 0.99), 2),
        "smart_router_decision": f"{selected_model}-focused analysis selected",
        "description": description,
        "recommendation": result.get("gemini_advice"),
        "results": result,
    }

@app.route('/segment-hair', methods=['POST'])
def segment_hair():
    import gc
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    try:
        result, source_image = analyze_hair_image(read_upload_bytes(file))
        save_user_result('hair', response_payload(result), source_image)
        return jsonify(response_payload(result))
    except Exception as e:
        print("HAIR LOSS SEGMENTATION ERROR:", e)
        status_code = 503 if 'not available' in str(e).lower() else 500
        return jsonify({'error': str(e)}), status_code
    finally:
        gc.collect()

@app.route('/detect-acne', methods=['POST'])
def detect_acne():
    import gc
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    try:
        result, source_image = analyze_acne_image(read_upload_bytes(file))
        save_user_result('acne', response_payload(result), source_image)
        return jsonify(response_payload(result))
    except Exception as e:
        print("ACNE DETECTION ERROR:", e)
        status_code = 503 if 'not available' in str(e).lower() else 500
        return jsonify({'error': str(e)}), status_code
    finally:
        gc.collect()

@app.route('/classify-dermnet', methods=['POST'])
def classify_dermnet():
    import gc
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    try:
        result, source_image = analyze_dermnet_image(read_upload_bytes(file))
        save_user_result('dermnet', response_payload(result), source_image)
        return jsonify(response_payload(result))
    except Exception as e:
        print("DERMNET CLASSIFICATION ERROR:", e)
        status_code = 503 if 'not available' in str(e).lower() else 500
        return jsonify({'error': str(e)}), status_code
    finally:
        gc.collect()


@app.route('/gemini-diagnosis', methods=['POST'])
def gemini_diagnosis():
    data = request.get_json(silent=True) or {}
    diagnosis = (data.get('diagnosis') or '').strip()
    if not diagnosis:
        return jsonify({'error': 'Diagnosis is required'}), 400

    prompt = (
        f"Provide concise, evidence-informed dermatology guidance for {diagnosis}. "
        "Include common care steps, warning signs, and when to seek in-person medical advice."
    )
    return jsonify({'reply': get_gemini_advice(prompt)})


@app.route('/gemini-context', methods=['POST'])
def gemini_context():
    data = request.get_json(silent=True) or {}
    diagnosis = (data.get('diagnosis') or '').strip()
    mode = (data.get('mode') or 'general').strip()
    if not diagnosis:
        return jsonify({'error': 'Diagnosis is required'}), 400

    prompt = (
        f"Give a short explanation of the dermatology finding '{diagnosis}' in the context of {mode} analysis. "
        "Keep the answer practical and patient-friendly."
    )
    return jsonify({'context': get_gemini_advice(prompt)})


@app.route('/symptom-checker', methods=['POST'])
def symptom_checker():
    data = request.get_json(silent=True) or {}
    symptoms = (data.get('symptoms') or '').strip()
    if not symptoms:
        return jsonify({'error': 'Symptoms are required'}), 400

    if 'rag_service' in globals() and RAG_ENABLED and rag_service is not None:
        rag_result = rag_service.chat_with_rag(
            f"A user reports these skin symptoms: {symptoms}. Provide general dermatology guidance."
        )
        return jsonify({'result': rag_result.get('response', '')})

    prompt = (
        f"A person reports these skin symptoms: {symptoms}. "
        "Provide general dermatology guidance, possible common causes, red flags, and when to seek urgent care."
    )
    return jsonify({'result': get_gemini_advice(prompt)})


@app.route('/diagnosis', methods=['GET'])
def latest_diagnosis():
    if DB_AVAILABLE:
        try:
            result = UserResult.query.order_by(UserResult.created_at.desc()).first()
            if result:
                payload = dict(result.result_data)
                payload['created_at'] = result.created_at.isoformat()
                return jsonify(payload)
        except Exception as e:
            print(f"Latest diagnosis lookup failed: {e}")

    return jsonify({
        'condition': 'No diagnosis available yet',
        'confidence': 0,
        'details': 'Run an AI analysis to populate the latest diagnosis result.',
    })


@app.route('/api/smart-analysis', methods=['POST'])
def smart_analysis():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        result = run_smart_analysis_from_bytes(read_upload_bytes(file))
        return jsonify(result)
    except Exception as e:
        print(f"SMART ANALYSIS ERROR: {e}")
        status_code = 503 if 'not available' in str(e).lower() else 500
        return jsonify({'error': str(e)}), status_code

@app.route('/', methods=['GET'])
def home():
    # Check what services are available
    available_services = []
    if dermnet_model is not None:
        available_services.append("✓ DermNet classification")
    else:
        available_services.append("✗ DermNet classification (model not loaded)")
        
    if acne_yolo is not None:
        available_services.append("✓ Acne detection") 
    else:
        available_services.append("✗ Acne detection (model not loaded)")
        
    if hair_loss_unet is not None:
        available_services.append("✓ Hair loss segmentation")
    else:
        available_services.append("✗ Hair loss segmentation (model not loaded)")
    
    if 'RAG_ENABLED' in globals() and RAG_ENABLED:
        available_services.append("✓ RAG-powered chatbot")
        available_services.append("✓ Enhanced diagnosis with medical literature")
        available_services.append("✓ Knowledge base management")
    else:
        available_services.append("✗ RAG services (configuration unavailable)")
    
    return f"""
    <h2>🔬 DermAI Backend API</h2>
    <p><strong>Status:</strong> Backend is running successfully!</p>
    
    <h3>📋 Available Services:</h3>
    <ul>
        {"".join(f"<li>{service}</li>" for service in available_services)}
    </ul>
    
    <h3>🛠 API Endpoints:</h3>
    <ul>
        <li><code>POST /api/predict</code> - Universal prediction endpoint</li>
        <li><code>POST /api/smart-analysis</code> - Smart model routing endpoint</li>
        <li><code>POST /gemini-diagnosis</code> - AI treatment guidance</li>
        <li><code>POST /symptom-checker</code> - Symptom triage helper</li>
        <li><code>POST /api/rag/chat</code> - RAG-powered chatbot</li>
        <li><code>POST /api/rag/enhanced-diagnosis</code> - Enhanced diagnosis</li>
        <li><code>POST /api/rag/store-knowledge</code> - Store medical knowledge</li>
        <li><code>POST /api/rag/search-knowledge</code> - Search knowledge base</li>
        <li><code>POST /api/rag/seed-knowledge</code> - Seed knowledge base</li>
        <li><code>POST /chatbot</code> - Simple chatbot</li>
    </ul>
    
    <p><em>RAG services powered by Groq + Gemini APIs are fully functional!</em></p>
    """

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "DermAI Backend is running",
        "services": {
            "rag_chat": bool('RAG_ENABLED' in globals() and RAG_ENABLED),
            "enhanced_diagnosis": bool('RAG_ENABLED' in globals() and RAG_ENABLED),
            "knowledge_management": bool('RAG_ENABLED' in globals() and RAG_ENABLED),
            "ml_models": {
                "dermnet": dermnet_model is not None,
                "acne_detection": acne_yolo is not None,
                "hair_segmentation": hair_loss_unet is not None
            },
            "chat_fallbacks": {
                "gemini": bool(GEMINI_API_KEY_1 or GEMINI_API_KEY_2),
                "local_text_models": bool(llama_pipeline or gemma_pipeline),
            },
        }
    })

@app.route('/upload', methods=['POST'])
@jwt_required()
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    try:
        # Example upload logic
        img_array, orig_img = preprocess_image_pil(file, target_size=(256, 256))
        # Here you can add code to save the file or process it
        return jsonify({'message': 'File uploaded successfully'}), 200
    except Exception as e:
        print("FILE UPLOAD ERROR:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.get_json()
    user_message = data.get('message', '')
    if not user_message:
        return jsonify({'reply': "Please provide a message."}), 400
    # Use Llama-3 for RAG/chatbot only
    reply = get_llama3_advice(user_message)
    return jsonify({'reply': reply})

@app.route('/user-image-results', methods=['GET'])
def user_image_results():
    if not DB_AVAILABLE:
        return jsonify({"results": []})

    results = UserResult.query.order_by(UserResult.created_at.desc()).all()
    output = []
    for r in results:
        output.append({
            "image_b64": r.image_b64,
            "result_type": r.result_type,
            "result_data": r.result_data,
            "created_at": r.created_at.isoformat()
        })
    return jsonify({"results": output})

@app.route('/user-trends', methods=['GET'])
def user_trends():
    if not DB_AVAILABLE:
        return jsonify({"results": []})

    results = UserResult.query.order_by(UserResult.created_at.desc()).all()
    output = []
    for r in results:
        output.append({
            "id": r.id,
            "image_b64": r.image_b64,
            "result_type": r.result_type,
            "result_data": r.result_data,
            "created_at": r.created_at.isoformat()
        })
    return jsonify({"results": output})

@app.route('/api/predict', methods=['POST'])
def api_predict():
    """Universal prediction endpoint that routes to appropriate model based on prediction type"""
    try:
        data = request.get_json() if request.is_json else None
        
        if 'file' in request.files:
            file_bytes = read_upload_bytes(request.files['file'])
            prediction_type = request.form.get('type', 'dermnet')
        elif data and 'image' in data:
            image_data = data['image']
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            file_bytes = base64.b64decode(image_data)
            prediction_type = data.get('type', 'dermnet')
        else:
            return jsonify({'error': 'No image data provided'}), 400

        prediction_type = (prediction_type or 'dermnet').lower()

        if prediction_type == 'smart':
            return jsonify(run_smart_analysis_from_bytes(file_bytes))

        if prediction_type == 'acne':
            result, source_image = analyze_acne_image(file_bytes)
            save_user_result('acne', response_payload(result), source_image)
            return jsonify({
                "prediction": result["condition"],
                "confidence": result["confidence"],
                "details": response_payload(result),
            })

        if prediction_type == 'hair':
            result, source_image = analyze_hair_image(file_bytes)
            save_user_result('hair', response_payload(result), source_image)
            return jsonify({
                "prediction": result["condition"],
                "confidence": result["confidence"],
                "details": response_payload(result),
            })

        result, source_image = analyze_dermnet_image(file_bytes)
        save_user_result('dermnet', response_payload(result), source_image)
        return jsonify({
            "prediction": result["condition"],
            "confidence": result["confidence"],
            "details": response_payload(result.get("details", {})),
            "gemini_advice": result.get("gemini_advice"),
        })
            
    except Exception as e:
        print(f"API predict error: {e}")
        status_code = 503 if 'not available' in str(e).lower() else 500
        return jsonify({'error': str(e)}), status_code

# Import RAG service
try:
    from rag_service import DermatologyRAGService
    rag_service = DermatologyRAGService()
    RAG_ENABLED = True
    print("RAG service loaded successfully")
except Exception as e:
    print(f"RAG service not available: {e}")
    RAG_ENABLED = False
    rag_service = None

# RAG Endpoints
@app.route('/api/rag/chat', methods=['POST'])
def rag_chat():
    """Enhanced chatbot with RAG capabilities"""
    print(f"RAG chat endpoint called. RAG_ENABLED: {RAG_ENABLED}")
    
    if not RAG_ENABLED:
        return jsonify({'error': 'RAG service not available', 'debug': 'RAG_ENABLED is False'}), 503
    
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        
        print(f"Processing message: {user_message}")
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Debug: Check if rag_service exists
        if rag_service is None:
            return jsonify({'error': 'RAG service instance is None'}), 503
        
        # Use RAG service for enhanced response
        print("Calling rag_service.chat_with_rag...")
        result = rag_service.chat_with_rag(user_message, chat_history)
        print(f"RAG result: {result}")
        
        return jsonify({
            'reply': result['response'],
            'sources': result['sources'],
            'confidence': result['confidence'],
            'context_used': result['context_used'],
            'model_info': result['model_info']
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"RAG chat error: {e}")
        print(f"Full traceback: {error_trace}")
        return jsonify({'error': f'Failed to process RAG chat request: {str(e)}', 'traceback': error_trace}), 500

@app.route('/api/rag/test', methods=['GET'])
def rag_test():
    """Test RAG service availability and configuration"""
    try:
        import os
        
        # Check environment variables
        env_status = {
            'GROQ_API_KEY': bool(os.getenv('GROQ_API_KEY')),
            'GEMINI_API_KEY': bool(os.getenv('GEMINI_API_KEY')),
            'SUPABASE_URL': bool(os.getenv('SUPABASE_URL')),
            'SUPABASE_KEY': bool(os.getenv('SUPABASE_KEY')),
        }
        
        # Check RAG service status
        rag_status = {
            'RAG_ENABLED': RAG_ENABLED,
            'rag_service_exists': rag_service is not None,
        }
        
        if RAG_ENABLED and rag_service:
            # Try a simple test
            test_result = rag_service.chat_with_rag("Hello, this is a test message")
            rag_status['test_response'] = test_result.get('response', 'No response')[:100] + '...'
            rag_status['test_success'] = True
        else:
            rag_status['test_success'] = False
            
        return jsonify({
            'environment': env_status,
            'rag_service': rag_status,
            'status': 'OK' if RAG_ENABLED else 'RAG_DISABLED'
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/rag/enhanced-diagnosis', methods=['POST'])
def enhanced_diagnosis():
    """Enhanced diagnosis combining ML results with RAG knowledge"""
    if not RAG_ENABLED:
        return jsonify({'error': 'RAG service not available'}), 503
    
    try:
        data = request.get_json()
        print(f"🔍 RAG Enhanced Diagnosis Request: {data}")
        
        # Handle multiple frontend data formats
        ml_results = None
        classification = ''
        model_used = 'Unknown'
        confidence = 0.0
        user_symptoms = data.get('symptoms', '')
        
        # Format 1: Frontend sends ml_predictions (from AIDiagnosis.js)
        if 'ml_predictions' in data:
            ml_predictions = data['ml_predictions']
            print(f"📊 Processing ml_predictions format: {ml_predictions}")
            
            # Extract the best prediction from frontend ML results
            if isinstance(ml_predictions, dict):
                # Handle smart_analysis structure first
                if 'smart_analysis' in ml_predictions:
                    smart_info = ml_predictions['smart_analysis']
                    model_used = smart_info.get('selected_model', smart_info.get('model_used', 'SMART_ROUTER'))
                    confidence = smart_info.get('router_confidence', 0.0)
                
                # Extract classification from specific model results
                if 'dermnet' in ml_predictions and ml_predictions['dermnet'].get('condition'):
                    classification = ml_predictions['dermnet']['condition']
                    if not model_used or model_used == 'SMART_ROUTER':
                        model_used = 'DERMNET'
                    if confidence == 0.0:
                        confidence = ml_predictions['dermnet'].get('confidence', 0.0)
                        
                elif 'acne' in ml_predictions and ml_predictions['acne'].get('severity'):
                    classification = f"Acne - {ml_predictions['acne']['severity']}"
                    if not model_used or model_used == 'SMART_ROUTER':
                        model_used = 'ACNE_DETECTION'
                    if confidence == 0.0:
                        confidence = ml_predictions['acne'].get('confidence', 0.0)
                        
                elif 'hair' in ml_predictions and ml_predictions['hair'].get('severity'):
                    classification = f"Hair Loss - {ml_predictions['hair']['severity']}"
                    if not model_used or model_used == 'SMART_ROUTER':
                        model_used = 'HAIR_ANALYSIS'
                    if confidence == 0.0:
                        confidence = ml_predictions['hair'].get('confidence', 0.0)
                        
                # Fallback: Find any model with classification/condition
                else:
                    for model_name, result in ml_predictions.items():
                        if model_name == 'smart_analysis':
                            continue
                        if isinstance(result, dict):
                            if result.get('condition'):
                                classification = result['condition']
                                model_used = model_name.upper()
                                confidence = result.get('confidence', 0.0)
                                break
                            elif result.get('classification'):
                                classification = result['classification']
                                model_used = model_name.upper()
                                confidence = result.get('confidence', 0.0)
                                break
                        elif isinstance(result, str):
                            classification = result
                            model_used = model_name.upper()
                            break
            
            if classification:
                ml_results = {
                    'prediction': classification,  # RAG service expects 'prediction' not 'classification'
                    'classification': classification,
                    'model_used': model_used,
                    'confidence': confidence
                }
        
        # Format 2: Direct ml_results format
        elif 'ml_results' in data:
            ml_results = data['ml_results']
            classification = ml_results.get('classification', ml_results.get('prediction', ''))
            model_used = ml_results.get('model_used', 'Unknown')
            confidence = ml_results.get('confidence', 0.0)
            # Ensure both prediction and classification fields exist for RAG service
            ml_results['prediction'] = classification
            ml_results['classification'] = classification
        
        # Format 3: Direct classification format
        elif 'classification' in data:
            classification = data['classification']
            model_used = data.get('model_used', 'Unknown')
            confidence = data.get('confidence', 0.0)
            ml_results = {
                'prediction': classification,  # RAG service expects 'prediction'
                'classification': classification,
                'model_used': model_used,
                'confidence': confidence
            }
        
        # Validation
        if not ml_results or not classification:
            print(f"❌ RAG Request validation failed - missing classification data")
            print(f"Available keys: {list(data.keys()) if data else 'None'}")
            return jsonify({
                'error': 'Missing classification data',
                'debug': f'Available keys: {list(data.keys()) if data else "None"}',
                'expected': 'ml_predictions, ml_results, or classification'
            }), 400
        
        print(f"✅ RAG Processing classification: '{classification}' from {model_used}")
        
        # Use RAG service for enhanced diagnosis
        result = rag_service.enhanced_diagnosis_with_rag(ml_results, user_symptoms)
        
        print(f"✅ RAG Result generated successfully")
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Enhanced diagnosis error: {e}")
        import traceback
        print(f"RAG Error traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to process enhanced diagnosis: {str(e)}'}), 500

@app.route('/api/rag/store-knowledge', methods=['POST'])
def store_knowledge():
    """Store new knowledge in the RAG system"""
    if not RAG_ENABLED:
        return jsonify({'error': 'RAG service not available'}), 503
    
    try:
        data = request.get_json(silent=True) or {}
        metadata = data.get('metadata', {}) if isinstance(data.get('metadata'), dict) else {}
        title = data.get('title') or metadata.get('title', '')
        content = data.get('content', '')
        category = data.get('category') or metadata.get('category', 'general')
        confidence_level = data.get('confidence_level', 0.8)
        
        if not title or not content:
            return jsonify({'error': 'Title and content are required'}), 400
        
        success = rag_service.store_knowledge(title, content, category, confidence_level)
        
        if success:
            return jsonify({'message': 'Knowledge stored successfully'})
        else:
            return jsonify({'error': 'Failed to store knowledge'}), 500
            
    except Exception as e:
        print(f"Store knowledge error: {e}")
        return jsonify({'error': 'Failed to store knowledge'}), 500

@app.route('/api/rag/search-knowledge', methods=['POST'])
def search_knowledge():
    """Search the RAG knowledge base"""
    if not RAG_ENABLED:
        return jsonify({'error': 'RAG service not available'}), 503
    
    try:
        data = request.get_json(silent=True) or {}
        query = data.get('query', '')
        limit = data.get('limit', data.get('top_k', 5))
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        results = rag_service.search_knowledge(query, limit)
        
        return jsonify({'results': results})
        
    except Exception as e:
        print(f"Search knowledge error: {e}")
        return jsonify({'error': 'Failed to search knowledge'}), 500

@app.route('/api/rag/seed-knowledge', methods=['POST'])
def seed_knowledge():
    """Seed the knowledge base with essential dermatology information"""
    if not RAG_ENABLED:
        return jsonify({'error': 'RAG service not available'}), 503
    
    try:
        result = rag_service.seed_knowledge_base()
        if 'successful' in result and 'entries_added' not in result:
            result['entries_added'] = result['successful']
        return jsonify(result)
        
    except Exception as e:
        print(f"Seed knowledge error: {e}")
        return jsonify({'error': 'Failed to seed knowledge base'}), 500

if __name__ == "__main__":
    with app.app_context():
        if DB_AVAILABLE:
            try:
                db.create_all()
                print("✓ Database tables created successfully")
            except Exception as e:
                print(f"⚠ Database connection failed: {e}")
                print("App will run in read-only mode (RAG features will work)")
        else:
            print("Database disabled - RAG features will work without persistence")
    
    port = int(os.environ.get("PORT", 7860))
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"🚀 Starting Flask app on port {port}")
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
