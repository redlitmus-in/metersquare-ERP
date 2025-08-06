#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps users quickly configure their environment variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🚀 Supabase Environment Setup\n');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, 'env.example');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  console.log('Please provide your Supabase credentials:\n');
  
  // Get Supabase URL
  const supabaseUrl = await question('Enter your Supabase Project URL (e.g., https://abc123.supabase.co): ');
  if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
    console.log('❌ Invalid Supabase URL. Please check your project URL.');
    rl.close();
    return;
  }
  
  // Get Supabase Anon Key
  const supabaseAnonKey = await question('Enter your Supabase Anon Key (starts with eyJ...): ');
  if (!supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
    console.log('❌ Invalid Supabase Anon Key. Please check your API key.');
    rl.close();
    return;
  }
  
  // Get API Base URL
  const apiBaseUrl = await question('Enter your API Base URL (default: http://localhost:8000): ') || 'http://localhost:8000';
  
  // Create .env content
  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}

# API Configuration
VITE_API_BASE_URL=${apiBaseUrl}

# Environment
NODE_ENV=development
`;
  
  try {
    // Write .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Environment configuration created successfully!');
    console.log('📁 File created: .env');
    console.log('\nNext steps:');
    console.log('1. Restart your development server');
    console.log('2. Check the browser console for connection status');
    console.log('3. If you see "✅ Supabase connection validated", you\'re all set!');
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
  
  rl.close();
}

// Handle script execution
if (require.main === module) {
  setupEnvironment().catch(console.error);
}

module.exports = { setupEnvironment }; 