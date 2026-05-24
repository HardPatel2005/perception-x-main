#!/usr/bin/env python3
"""
Quick script to check if .env file is being loaded correctly
Run this from the perceptionX-python directory: python check_env.py
"""
import os
import pathlib
from dotenv import load_dotenv

print("=" * 60)
print("Environment Variables Checker")
print("=" * 60)

# Try to load .env
env_path = pathlib.Path(__file__).parent / ".env"
if env_path.exists():
    print(f"[OK] Found .env file at: {env_path}")
    load_dotenv(dotenv_path=env_path, override=True)
else:
    print(f"[ERROR] .env file NOT found at: {env_path}")
    print(f"   Current directory: {pathlib.Path.cwd()}")
    print(f"   Script directory: {pathlib.Path(__file__).parent}")
    print("\n   Please create .env file in the same directory as app.py")
    # Try default load anyway
    load_dotenv()

print("\n" + "=" * 60)
print("Checking Cloudinary Variables:")
print("=" * 60)

cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
api_key = os.environ.get("CLOUDINARY_API_KEY")
api_secret = os.environ.get("CLOUDINARY_API_SECRET")

print(f"CLOUDINARY_CLOUD_NAME: {'[OK] ' + cloud_name if cloud_name else '[MISSING] Not set'}")
print(f"CLOUDINARY_API_KEY: {'[OK] ' + (api_key[:10] + '...' if api_key else 'Not set') if api_key else '[MISSING] Not set'}")
print(f"CLOUDINARY_API_SECRET: {'[OK] ' + (api_secret[:10] + '...' if api_secret else 'Not set') if api_secret else '[MISSING] Not set'}")

if cloud_name and api_key and api_secret:
    print("\n[SUCCESS] All Cloudinary credentials are set!")
    print("   If app.py still shows credentials not found, check:")
    print("   1. Restart the Python service after creating .env")
    print("   2. Make sure .env file is in perceptionX-python/ directory")
    print("   3. Check for typos in variable names")
else:
    print("\n[ERROR] Some Cloudinary credentials are missing!")
    print("   Please add them to your .env file:")
    print("   CLOUDINARY_CLOUD_NAME=your_cloud_name")
    print("   CLOUDINARY_API_KEY=your_api_key")
    print("   CLOUDINARY_API_SECRET=your_api_secret")

print("\n" + "=" * 60)
print("Other Important Variables:")
print("=" * 60)
print(f"MONGO_URI: {'[OK] Set' if os.environ.get('MONGO_URI') else '[MISSING] Not set'}")
print(f"PORT: {os.environ.get('PORT', 'Not set (default: 7860)')}")
