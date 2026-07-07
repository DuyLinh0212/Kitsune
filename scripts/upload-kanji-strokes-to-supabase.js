const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_KANJI_STROKES_BUCKET || 'kanji-strokes';
const sourceDir = process.env.KANJI_SOURCE_DIR || 'F:\\NgDuyLinh\\Personal_Project\\kanji';
const pathPrefix = process.env.SUPABASE_KANJI_STROKES_PREFIX || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Source directory does not exist: ${sourceDir}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function collectSvgFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSvgFiles(fullPath));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.svg') {
      files.push(fullPath);
    }
  }

  return files;
}

function toBucketPath(fullPath) {
  const fileName = path.basename(fullPath);
  return pathPrefix ? `${pathPrefix.replace(/\/+$/, '')}/${fileName}` : fileName;
}

async function ensureBucketExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Unable to list buckets: ${error.message}`);
  }

  const existing = buckets.find((bucket) => bucket.name === bucketName);
  if (existing) {
    console.log(`Using existing bucket: ${bucketName}`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['image/svg+xml'],
  });

  if (createError) {
    throw new Error(`Unable to create bucket "${bucketName}": ${createError.message}`);
  }

  console.log(`Created public bucket: ${bucketName}`);
}

async function uploadSvgFiles() {
  await ensureBucketExists();

  const files = collectSvgFiles(sourceDir);
  console.log(`Found ${files.length} SVG files in ${sourceDir}`);

  let uploaded = 0;
  let failed = 0;

  for (let index = 0; index < files.length; index += 1) {
    const filePath = files[index];
    const bucketPath = toBucketPath(filePath);
    const fileData = fs.readFileSync(filePath);

    const { error } = await supabase.storage.from(bucketName).upload(bucketPath, fileData, {
      contentType: 'image/svg+xml',
      cacheControl: '31536000',
      upsert: true,
    });

    if (error) {
      failed += 1;
      console.error(`[${index + 1}/${files.length}] FAIL ${bucketPath}: ${error.message}`);
      continue;
    }

    uploaded += 1;
    if ((index + 1) % 100 === 0 || index === files.length - 1) {
      console.log(`[${index + 1}/${files.length}] Uploaded ${uploaded} files so far`);
    }
  }

  console.log(`Upload finished. Success: ${uploaded}, Failed: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

uploadSvgFiles().catch((error) => {
  console.error('Upload script failed:', error.message);
  process.exit(1);
});
