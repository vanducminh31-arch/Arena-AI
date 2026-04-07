import dotenv from 'dotenv';
dotenv.config();

// Startup Env Validation (Prompt 01)
const REQUIRED_ENV = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'ALLOWED_ORIGINS', 'PORT'];
const missingKeys = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingKeys.length > 0) {
    console.error(`❌ MISSING CONFIGURATION: ${missingKeys.join(', ')}`);
    process.exit(1);
}

console.log("✅ Environment configurations loaded.");
