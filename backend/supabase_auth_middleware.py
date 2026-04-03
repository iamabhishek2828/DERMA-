# supabase_auth_middleware.py
import jwt
import os
from functools import wraps
from flask import request, jsonify, current_app
from dotenv import load_dotenv

load_dotenv()

def verify_supabase_token(f):
    """Middleware to verify Supabase JWT tokens"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        try:
            # Decode the JWT token with Supabase JWT secret
            supabase_jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
            if not supabase_jwt_secret:
                return jsonify({'error': 'JWT secret not configured'}), 500
            
            payload = jwt.decode(
                token, 
                supabase_jwt_secret, 
                algorithms=['HS256'],
                audience='authenticated'
            )
            
            # Add user info to request context
            request.user = payload
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    
    return decorated_function