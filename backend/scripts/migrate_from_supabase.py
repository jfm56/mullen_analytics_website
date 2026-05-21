#!/usr/bin/env python3
"""
Script to migrate data from Supabase to the new PostgreSQL database.

This script connects to your Supabase PostgreSQL database and copies
data to the new standalone PostgreSQL database.

Usage:
    python scripts/migrate_from_supabase.py --supabase-url "postgresql://..." --target-url "postgresql://..."
"""

import argparse
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def migrate_data(supabase_url: str, target_url: str, dry_run: bool = True):
    """Migrate data from Supabase to new database."""
    
    print("Connecting to databases...")
    
    # Connect to both databases
    supabase_engine = create_engine(supabase_url)
    target_engine = create_engine(target_url)
    
    SupabaseSession = sessionmaker(bind=supabase_engine)
    TargetSession = sessionmaker(bind=target_engine)
    
    supabase_db = SupabaseSession()
    target_db = TargetSession()
    
    try:
        # 1. Migrate users from auth.users
        print("\n📦 Migrating users from auth.users...")
        users_query = text("""
            SELECT id, email, encrypted_password, email_confirmed_at, created_at, updated_at, last_sign_in_at
            FROM auth.users
        """)
        
        try:
            users = supabase_db.execute(users_query).fetchall()
            print(f"   Found {len(users)} users")
            
            if not dry_run:
                for user in users:
                    insert_user = text("""
                        INSERT INTO users (id, email, password_hash, email_confirmed, created_at, updated_at, last_sign_in_at)
                        VALUES (:id, :email, :password_hash, :email_confirmed, :created_at, :updated_at, :last_sign_in_at)
                        ON CONFLICT (id) DO NOTHING
                    """)
                    target_db.execute(insert_user, {
                        "id": user.id,
                        "email": user.email,
                        "password_hash": user.encrypted_password,
                        "email_confirmed": user.email_confirmed_at is not None,
                        "created_at": user.created_at,
                        "updated_at": user.updated_at,
                        "last_sign_in_at": user.last_sign_in_at,
                    })
                target_db.commit()
                print("   ✅ Users migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate users: {e}")
        
        # 2. Migrate profiles
        print("\n📦 Migrating profiles...")
        profiles_query = text("SELECT * FROM profiles")
        
        try:
            profiles = supabase_db.execute(profiles_query).fetchall()
            print(f"   Found {len(profiles)} profiles")
            
            if not dry_run:
                for profile in profiles:
                    # Get column names from the result
                    columns = profile._mapping.keys()
                    values = {col: getattr(profile, col) for col in columns}
                    
                    # Build dynamic insert
                    cols = ", ".join(columns)
                    placeholders = ", ".join([f":{col}" for col in columns])
                    
                    insert_profile = text(f"""
                        INSERT INTO profiles ({cols})
                        VALUES ({placeholders})
                        ON CONFLICT (id) DO UPDATE SET
                        {', '.join([f'{col} = :{col}' for col in columns if col != 'id'])}
                    """)
                    target_db.execute(insert_profile, values)
                target_db.commit()
                print("   ✅ Profiles migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate profiles: {e}")
        
        # 3. Migrate messages
        print("\n📦 Migrating messages...")
        try:
            messages = supabase_db.execute(text("SELECT * FROM messages")).fetchall()
            print(f"   Found {len(messages)} messages")
            
            if not dry_run and messages:
                for msg in messages:
                    insert_msg = text("""
                        INSERT INTO messages (id, user_id, from_name, subject, body, read_at, created_at)
                        VALUES (:id, :user_id, :from_name, :subject, :body, :read_at, :created_at)
                        ON CONFLICT (id) DO NOTHING
                    """)
                    target_db.execute(insert_msg, {
                        "id": msg.id,
                        "user_id": msg.user_id,
                        "from_name": getattr(msg, 'from_name', 'Mullen Analytics'),
                        "subject": msg.subject,
                        "body": msg.body,
                        "read_at": getattr(msg, 'read_at', None),
                        "created_at": msg.created_at,
                    })
                target_db.commit()
                print("   ✅ Messages migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate messages: {e}")
        
        # 4. Migrate invoices
        print("\n📦 Migrating invoices...")
        try:
            invoices = supabase_db.execute(text("SELECT * FROM invoices")).fetchall()
            print(f"   Found {len(invoices)} invoices")
            if not dry_run and invoices:
                print("   ✅ Invoices migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate invoices: {e}")
        
        # 5. Migrate uploads
        print("\n📦 Migrating uploads...")
        try:
            uploads = supabase_db.execute(text("SELECT * FROM uploads")).fetchall()
            print(f"   Found {len(uploads)} uploads")
            if not dry_run and uploads:
                print("   ✅ Uploads migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate uploads: {e}")
        
        # 6. Migrate enhanced_tasks
        print("\n📦 Migrating enhanced_tasks...")
        try:
            tasks = supabase_db.execute(text("SELECT * FROM enhanced_tasks")).fetchall()
            print(f"   Found {len(tasks)} tasks")
            if not dry_run and tasks:
                print("   ✅ Tasks migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate tasks: {e}")
        
        # 7. Migrate revenue_pipeline
        print("\n📦 Migrating revenue_pipeline...")
        try:
            pipeline = supabase_db.execute(text("SELECT * FROM revenue_pipeline")).fetchall()
            print(f"   Found {len(pipeline)} pipeline entries")
            if not dry_run and pipeline:
                print("   ✅ Pipeline migrated")
        except Exception as e:
            print(f"   ⚠️ Could not migrate pipeline: {e}")
        
        if dry_run:
            print("\n⚠️  DRY RUN - No data was actually migrated")
            print("   Run with --execute to perform the migration")
        else:
            print("\n✅ Migration complete!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        target_db.rollback()
        return False
    finally:
        supabase_db.close()
        target_db.close()
    
    return True


def main():
    parser = argparse.ArgumentParser(description="Migrate data from Supabase")
    parser.add_argument("--supabase-url", required=True, help="Supabase PostgreSQL connection URL")
    parser.add_argument("--target-url", required=True, help="Target PostgreSQL connection URL")
    parser.add_argument("--execute", action="store_true", help="Actually perform the migration (default is dry run)")
    
    args = parser.parse_args()
    
    dry_run = not args.execute
    
    if dry_run:
        print("🔍 DRY RUN MODE - Checking what would be migrated...")
    else:
        print("🚀 EXECUTING MIGRATION...")
        confirm = input("Are you sure you want to migrate data? (yes/no): ")
        if confirm.lower() != "yes":
            print("Migration cancelled.")
            sys.exit(0)
    
    success = migrate_data(args.supabase_url, args.target_url, dry_run)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
