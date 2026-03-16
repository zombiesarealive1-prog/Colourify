# Outline Sketcher - Deployment to Vercel

This app is a React + Vite + Tailwind CSS application. It is ready to be deployed to Vercel.

## Deployment Steps

1. **Push to GitHub**: Upload this code to a GitHub repository.
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com).
   - Click **"Add New"** > **"Project"**.
   - Import your repository.
3. **Configure Settings**:
   - **Framework Preset**: Vercel should automatically detect **Vite**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - If you plan to use the Gemini API in the future, add `GEMINI_API_KEY` in the Vercel project settings.
5. **Deploy**: Click **"Deploy"**.

## Local Development

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```
