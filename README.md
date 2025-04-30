Design Inspiration API
A Node.js-based API for extracting design inspirations from websites, capturing screenshots, and storing details in MongoDB with AWS S3 integration.
Features

Register and login admins with JWT authentication.
Extract links from a given website.
Capture desktop and mobile screenshots of websites and store them in AWS S3.
Extract design details (title, description, color scheme, fonts) and save to MongoDB.
Retrieve paginated inspirations or specific inspirations by slug.
Rate limiting using Redis.
API documentation with Swagger UI.

Tech Stack

Node.js, Express.js
MongoDB with Prisma ORM
AWS S3 for screenshot storage
Redis for rate limiting
Puppeteer for web scraping
JWT for authentication
Winston for logging
Swagger for API documentation

Prerequisites

Node.js (v18 or higher)
MongoDB (local or Atlas)
Redis (local or hosted)
AWS account with S3 bucket
Postman for API testing

Installation

Clone the repository:git clone https://github.com/your-username/design-inspiration.git
cd design-inspiration


Install dependencies:npm install


Set up environment variables in .env:DATABASE_URL=mongodb://localhost:27017/design_inspiration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=design-inspiration-screenshots
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
PORT=3000


Initialize Prisma:npx prisma generate


Start the server:npm run dev



API Endpoints

POST /api/register: Register a new admin.
POST /api/login: Login and get JWT token.
POST /api/extract-links: Extract links from a URL (requires JWT).
POST /api/inspirations: Add inspirations from URLs (requires JWT).
GET /api/inspirations: Get paginated inspirations.
GET /api/inspirations/:slug: Get inspiration by slug.
API documentation: http://localhost:3000/api-docs

Testing

Import the Postman collection (DesignInspirationAPI.postman_collection.json) and environment (DesignInspirationEnv.postman_environment.json) into Postman.
Test all endpoints with the provided requests.

Demo Video
Watch the demo video
Logs

Logs are stored in logs/combined.log (all logs) and logs/error.log (errors only).

Contributing
Feel free to submit issues or pull requests to improve the project.
License
MIT
