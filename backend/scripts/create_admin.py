#!/usr/bin/env python3
"""
Script to create an admin user for the Mullen Analytics portal.
Run this after setting up the database.

Usage:
    python scripts/create_admin.py --email admin@example.com --password yourpassword --name "Admin User"
"""

import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.auth import create_user_with_profile, hash_password
from app.models.user import User, Profile


def create_admin(email: str, password: str, full_name: str = None):
    """Create an admin user."""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == email.lower()).first()
        if existing:
            print(f"Error: User with email {email} already exists.")
            return False
        
        # Create user with admin role
        user = create_user_with_profile(
            db,
            email=email,
            password=password,
            full_name=full_name,
            role="admin"
        )
        
        print(f"✅ Admin user created successfully!")
        print(f"   ID: {user.id}")
        print(f"   Email: {email}")
        print(f"   Role: admin")
        return True
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        return False
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--name", default="Admin", help="Full name (optional)")
    
    args = parser.parse_args()
    
    if len(args.password) < 8:
        print("Error: Password must be at least 8 characters")
        sys.exit(1)
    
    success = create_admin(args.email, args.password, args.name)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
