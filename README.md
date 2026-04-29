# Beauty Spot E-commerce

A complete e-commerce website for Beauty Spot, inspired by Sephora and Zwine.ma.

## Features

- Modern homepage with banner and featured products
- Product catalog with filters
- Detailed product pages
- Shopping cart and checkout
- User authentication
- Admin dashboard for product management
- Responsive design
- SEO optimized

## Technologies

- Frontend: React, Vite
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: JWT

## Setup

1. Install dependencies for frontend and backend:
   ```
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. Install root dependencies for the shared tooling and unified dev command:
   ```
   cd ..
   npm install
   ```

3. Start MongoDB locally.

4. Start frontend and backend together from the project root:
   ```
   npm run dev
   ```

5. Or start them separately if needed:
   ```
   cd backend && npm run dev
   cd ../frontend && npm run dev
   ```

6. Open http://localhost:5173 in your browser.

## API Integration

- The frontend talks to the backend through `/api`.
- In development, Vite proxies `/api` requests to `http://localhost:5000`.
- The backend health check is available at `http://localhost:5000/api/health`.

## Sample Data

Add sample products via the admin dashboard or directly in MongoDB.

## Notes

- Payment is simulated.
- For production, configure MongoDB connection and add security measures.
