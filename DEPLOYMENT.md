# Deploy FinTrack Backend to Render

Follow these steps to deploy your backend to Render (free cloud hosting):

## Prerequisites
- GitHub account
- Render account (sign up at https://render.com - it's free!)

## Step 1: Push Backend to GitHub

1. **Initialize Git in backend folder** (if not already done):
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial backend setup"
   ```

2. **Create a new GitHub repository**:
   - Go to https://github.com/new
   - Name it: `fintrack-backend`
   - Keep it Public or Private (your choice)
   - Don't initialize with README
   - Click "Create repository"

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/fintrack-backend.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy on Render

1. **Go to Render Dashboard**:
   - Visit https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect GitHub Repository**:
   - Click "Connect account" to link GitHub
   - Find and select your `fintrack-backend` repository
   - Click "Connect"

3. **Configure Web Service**:
   - **Name**: `fintrack-backend` (or any name you prefer)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: leave blank (or put `/backend` if you pushed the whole FinTrackApp folder)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Select **Free**

4. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable" and add these:
   
   - **PORT**: `5000`
   - **MONGODB_URI**: `mongodb+srv://alyssarequillo427_db_user:D9O3ypMs8Zr1CiXo@cluster0.rlapia9.mongodb.net/fintrack?retryWrites=true&w=majority`
   - **JWT_SECRET**: `your_super_secret_jwt_key_here_change_this_in_production`
   - **JWT_EXPIRE**: `30d`
   - **NODE_ENV**: `production`

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment
   - You'll get a URL like: `https://fintrack-backend.onrender.com`

## Step 3: Update Your React Native App

Once deployed, update the API URL in your app:

**File: `config/api.js`**
```javascript
// Replace this:
export const API_BASE_URL = 'http://10.217.14.36:5000/api';

// With your Render URL:
export const API_BASE_URL = 'https://fintrack-backend.onrender.com/api';
```

## Step 4: Test Your Deployment

1. **Test in browser**:
   Visit: `https://fintrack-backend.onrender.com/api/test`
   
   Should return:
   ```json
   {"success": true, "message": "Backend is reachable!"}
   ```

2. **Test in your app**:
   - Restart your React Native app
   - Try logging in
   - Try registering a new user from a different device/network

## Important Notes

⚠️ **Free Tier Limitations**:
- Render free tier spins down after 15 minutes of inactivity
- First request after inactivity takes 30-60 seconds to wake up
- This is normal for free hosting

💡 **Tips**:
- Your app will now work on ANY internet connection worldwide
- Users can register from different WiFi networks, mobile data, etc.
- MongoDB Atlas is already cloud-hosted, so it works globally

🔒 **Security Note**:
Change your JWT_SECRET to something more secure before deploying!

## Troubleshooting

**If deployment fails**:
1. Check Render logs in the dashboard
2. Verify all environment variables are set correctly
3. Ensure MongoDB connection string is correct

**If app can't connect**:
1. Verify the API_BASE_URL in `config/api.js` matches your Render URL
2. Make sure to include `/api` at the end
3. Test the `/api/test` endpoint in your browser first
