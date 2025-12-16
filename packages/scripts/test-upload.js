const fs = require('fs');
const path = require('path');
const http = require('http');
const FormData = require('form-data');

// Create a minimal valid JPEG file if it doesn't exist
function createTestImage(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Test image already exists: ${filePath}`);
    return;
  }

  // Minimal valid 1x1 pixel JPEG (base64 encoded)
  // This is a valid JPEG file: FF D8 FF E0 00 10 4A 46 49 46 00 01 ... FF D9
  const minimalJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
    'base64'
  );

  fs.writeFileSync(filePath, minimalJpeg);
  console.log(`Created test image: ${filePath}`);
}

async function login() {
  const loginUrl = 'http://localhost:3000/api/auth/login';
  
  // Try to login with a test user
  // You may need to adjust these credentials or register a user first
  const testCredentials = {
    email: 'test@example.com',
    password: 'password123'
  };

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCredentials),
    });

    if (!response.ok) {
      // If login fails, try to register first
      console.log('Login failed, attempting to register...');
      const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testCredentials,
          role: 'USER',
          firstName: 'Test',
          lastName: 'User',
        }),
      });

      if (!registerResponse.ok) {
        const errorText = await registerResponse.text();
        throw new Error(`Registration failed: ${registerResponse.status} - ${errorText}`);
      }

      const registerData = await registerResponse.json();
      console.log('Registration successful');
      return { token: registerData.accessToken, userId: registerData.user.id };
    }

    const data = await response.json();
    console.log('Login successful');
    return { token: data.accessToken, userId: data.user.id };
  } catch (error) {
    console.error('Authentication error:', error.message);
    throw error;
  }
}

async function testUpload(token, userId) {
  const uploadUrl = 'http://localhost:3000/api/assets/upload';
  const testImagePath = path.join(__dirname, '../assets/test-avatar.jpg');

  // Create test image if it doesn't exist
  createTestImage(testImagePath);

  // Read the test image
  const imageBuffer = fs.readFileSync(testImagePath);
  console.log(`\nReading test image: ${testImagePath} (${imageBuffer.length} bytes)`);

  // Create FormData
  const formData = new FormData();
  
  const uploadDto = {
    type: 'IMAGE',
    ownerType: 'USER',
    ownerId: userId, // Use the actual user ID from authentication
    isPublic: true,
    metadata: { purpose: 'avatar-test' }
  };

  // Add file to form data
  formData.append('file', imageBuffer, {
    filename: 'test-avatar.jpg',
    contentType: 'image/jpeg',
  });

  // Add uploadDto as JSON string
  formData.append('uploadDto', JSON.stringify(uploadDto));

  try {
    console.log('\nSending upload request...');
    console.log('URL:', uploadUrl);
    console.log('Upload DTO:', JSON.stringify(uploadDto, null, 2));
    
    // Parse URL
    const url = new URL(uploadUrl);
    
    // Use http module with form-data stream
    return new Promise((resolve, reject) => {
      const request = http.request({
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders(),
        },
      }, (response) => {
        let responseText = '';
        
        response.on('data', (chunk) => {
          responseText += chunk.toString();
        });
        
        response.on('end', () => {
          const statusCode = response.statusCode;
          
          console.log('\n=== RESPONSE ===');
          console.log('Status Code:', statusCode);
          console.log('Status Text:', response.statusMessage);
          
          // Try to parse as JSON, otherwise show raw text
          let responseBody;
          try {
            responseBody = JSON.parse(responseText);
            console.log('Response Body:', JSON.stringify(responseBody, null, 2));
          } catch (e) {
            console.log('Response Body (raw):', responseText);
          }

          // Log validation errors if any
          if (statusCode === 400) {
            console.log('\n=== VALIDATION ERRORS ===');
            if (responseBody) {
              if (responseBody.message) {
                console.log('Error Message:', responseBody.message);
              }
              if (responseBody.errors) {
                console.log('Validation Errors:', JSON.stringify(responseBody.errors, null, 2));
              }
            }
          }

          // Log response headers for debugging
          console.log('\n=== RESPONSE HEADERS ===');
          Object.keys(response.headers).forEach((key) => {
            console.log(`${key}: ${response.headers[key]}`);
          });

          resolve({ statusCode, responseBody, responseText });
        });
      });

      request.on('error', (error) => {
        console.error('\n=== ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        reject(error);
      });

      // Pipe form-data to request
      formData.pipe(request);
    });
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

async function main() {
  console.log('=== Asset Upload Test Script ===\n');

  try {
    // Step 1: Login to get JWT token
    console.log('Step 1: Authenticating...');
    const { token, userId } = await login();
    console.log('Token obtained (first 20 chars):', token.substring(0, 20) + '...');
    console.log('User ID:', userId + '\n');

    // Step 2: Test upload
    console.log('Step 2: Testing upload...');
    const result = await testUpload(token, userId);

    // Step 3: Summary
    console.log('\n=== SUMMARY ===');
    if (result.statusCode === 200 || result.statusCode === 201) {
      console.log('✅ Upload successful!');
    } else {
      console.log('❌ Upload failed with status:', result.statusCode);
    }
  } catch (error) {
    console.error('\n=== FATAL ERROR ===');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
main();

