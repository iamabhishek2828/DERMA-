import os
import secrets
from datetime import timedelta
from functools import wraps

import requests
from dotenv import load_dotenv
from flask import Blueprint, jsonify, redirect, request, url_for
from flask_dance.contrib.google import google, make_google_blueprint
from flask_jwt_extended import JWTManager, create_access_token

from extensions import bcrypt, db

base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, ".env"))

if os.getenv("FLASK_ENV", "").lower() == "development":
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

auth_bp = Blueprint("auth", __name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
PUBLIC_BACKEND_URL = (
    os.getenv("PUBLIC_BACKEND_URL")
    or os.getenv("REACT_APP_BACKEND_URL")
    or "https://chabhishek28-my-flask-backend.hf.space"
).rstrip("/")
FRONTEND_URL = (
    os.getenv("FRONTEND_URL")
    or os.getenv("PUBLIC_FRONTEND_URL")
    or "http://localhost:3000"
).rstrip("/")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)


def build_google_blueprint():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return None

    redirect_url = os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URL",
        f"{PUBLIC_BACKEND_URL}/login/google/authorized",
    )

    return make_google_blueprint(
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scope=[
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid",
        ],
        redirect_url=redirect_url,
    )


google_bp = build_google_blueprint()


def validate_supabase_token(token):
    """Validate a Supabase access token by asking Supabase for the current user."""
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return None

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_API_KEY,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        print(f"Token validation error: {exc}")
        return None


def supabase_required(f):
    """Decorator to require Supabase authentication."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("X-Supabase-Token")

        if not token:
            return jsonify({"error": "No authentication token provided"}), 401

        user_data = validate_supabase_token(token)
        if not user_data:
            return jsonify({"error": "Invalid authentication token"}), 401

        request.supabase_user = user_data
        return f(*args, **kwargs)

    return decorated_function


def init_auth(app):
    jwt_secret = app.config.get("JWT_SECRET_KEY") or os.getenv("JWT_SECRET_KEY")
    if not jwt_secret:
        jwt_secret = secrets.token_urlsafe(32)
        print("⚠ JWT_SECRET_KEY is not set; generated an ephemeral secret for this process")

    app.config["JWT_SECRET_KEY"] = jwt_secret
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)
    JWTManager(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=True)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "Username already exists"}), 409

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(username=username, password=hashed_pw)
    db.session.add(user)
    db.session.commit()
    return jsonify({"msg": "User created successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if user and user.password and bcrypt.check_password_hash(user.password, password):
        access_token = create_access_token(identity=username)
        return jsonify({"access_token": access_token}), 200

    return jsonify({"msg": "Invalid credentials"}), 401


@auth_bp.route("/login/google/authorized")
def google_login_authorized():
    if google_bp is None:
        return jsonify({"error": "Google OAuth is not configured"}), 503

    if not google.authorized:
        return redirect(url_for("google.login"))

    resp = google.get("/oauth2/v2/userinfo")
    user_info = resp.json()
    email = user_info["email"]

    user = User.query.filter_by(username=email).first()
    if not user:
        user = User(username=email, password=None)
        db.session.add(user)
        db.session.commit()

    access_token = create_access_token(identity=email)
    success_redirect = os.getenv(
        "GOOGLE_OAUTH_SUCCESS_URL",
        f"{FRONTEND_URL}/login",
    )
    separator = "&" if "?" in success_redirect else "?"
    return redirect(f"{success_redirect}{separator}token={access_token}")


@auth_bp.route("/register-supabase-user", methods=["POST"])
def register_supabase_user():
    """Acknowledge users authenticated through Supabase."""
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get("id")
        email = data.get("email")

        if not user_id or not email:
            return jsonify({"error": "Missing required fields (id, email)"}), 400

        return (
            jsonify(
                {
                    "message": "User registration acknowledged",
                    "user_id": user_id,
                    "email": email,
                }
            ),
            200,
        )
    except Exception as exc:
        print(f"Error in register_supabase_user: {exc}")
        return jsonify({"error": f"Server error: {exc}"}), 500
