# 🍳 Chef Govu AI - PromptWars Warm-Up

A modern, Agentic AI micro-app that generates personalized Indian meal plans, grocery lists, and budget feasibility checks based on your daily schedule. Built for the PromptWars Hackathon.

## ✨ Features
- **AI Meal Planning:** Uses advanced AI to craft a personalized Breakfast, Lunch, and Dinner plan.
- **Smart Substitutions:** Suggests alternative ingredients dynamically.
- **Budget Tracking:** Ensures your daily meal plan stays within your specified budget.
- **Modern UI/UX:** Responsive Bento-box layout, glassmorphism aesthetics, and Light/Dark mode toggles.
- **Fully Accessible:** 100% Semantic HTML and ARIA labels.

## 🚀 Tech Stack
- **Backend:** Node.js, Express, Helmet, Compression, Express-Rate-Limit
- **Frontend:** Vanilla JS, CSS (CSS Variables for Theming), Semantic HTML
- **AI Integration:** `@google/generative-ai` 

## 🛠️ Installation & Setup
1. Clone the repository
2. Run `npm install`
3. Create a `.env` file and add your `GEMINI_API_KEY`
4. Run `npm start`
5. Open `http://localhost:3000`

## 🛡️ Security & Performance
- `helmet` implemented for HTTP Security Headers
- `compression` implemented for Gzip payload reduction
- `express-rate-limit` implemented to prevent API abuse
- JSON Payload limits enforced to 16kb

Built with ❤️ at PromptWars Mumbai.
