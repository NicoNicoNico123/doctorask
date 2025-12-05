import dotenv from 'dotenv';
import path from 'path';
import { getKeyInfo } from './ratelimit';

// Load .env from project root
// When running with tsx from project root, process.cwd() will be the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Ensure environment variable is set
if (!process.env.REACT_APP_OPENAI_API_KEY) {
  console.error('Error: REACT_APP_OPENAI_API_KEY environment variable is not set');
  console.log('Please create a .env file in the project root with:');
  console.log('REACT_APP_OPENAI_API_KEY=your_key_here');
  process.exit(1);
}

// Run the function
getKeyInfo()
  .then((result) => {
    console.log('Key info retrieved:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

