from supabase import create_client, Client
from app.core.config import settings
import asyncpg
from typing import Optional
import json

class SupabaseClient:
    def __init__(self):
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    
    def get_client(self) -> Client:
        return self.supabase

# Global Supabase instance
supabase_client = SupabaseClient()

def get_supabase() -> Client:
    return supabase_client.get_client()

class DatabaseManager:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def create_pool(self):
        if not self.pool:
            self.pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
        return self.pool
    
    async def close_pool(self):
        if self.pool:
            await self.pool.close()
    
    async def execute_query(self, query: str, *args):
        pool = await self.create_pool()
        async with pool.acquire() as connection:
            return await connection.fetch(query, *args)
    
    async def execute_one(self, query: str, *args):
        pool = await self.create_pool()
        async with pool.acquire() as connection:
            return await connection.fetchrow(query, *args)
    
    async def execute_command(self, query: str, *args):
        pool = await self.create_pool()
        async with pool.acquire() as connection:
            return await connection.execute(query, *args)

# Global database manager
db_manager = DatabaseManager()

async def get_db():
    return db_manager