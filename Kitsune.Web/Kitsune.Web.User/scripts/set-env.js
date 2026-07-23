const fs = require('fs');
const path = require('path');

// Attempt to load .env file manually if it exists for local development
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.replace(/(^['"]|['"]$)/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Generate the environment files content
const envConfigFileProd = `export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL || ''}',
    publishableKey: '${process.env.SUPABASE_ANON_KEY || ''}'
  }
};
`;

const envConfigFileDev = `export const environment = {
  production: false,
  supabase: {
    url: '${process.env.SUPABASE_URL || ''}',
    publishableKey: '${process.env.SUPABASE_ANON_KEY || ''}'
  }
};
`;

const targetPathDev = path.resolve(__dirname, '../src/environments/environment.development.ts');
const targetPathProd = path.resolve(__dirname, '../src/environments/environment.ts');

// Write the files dynamically
fs.writeFileSync(targetPathProd, envConfigFileProd, { encoding: 'utf8' });
fs.writeFileSync(targetPathDev, envConfigFileDev, { encoding: 'utf8' });

console.log('\x1b[32m%s\x1b[0m', 'Successfully generated environment files from process.env');
