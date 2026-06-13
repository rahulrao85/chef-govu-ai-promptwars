import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 8080;

// ── Security ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '16kb' }));

// ── Compression ───────────────────────────────────────────────────────
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Static Files ──────────────────────────────────────────────────────
app.use(express.static('public'));

// ── Gemini Client ─────────────────────────────────────────────────────
/** @type {GoogleGenerativeAI | null} */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Generate a structured meal plan from Gemini AI.
 * @param {string} schedule - User's daily schedule description.
 * @param {number} budget - User's budget in INR.
 * @param {string} diet - Dietary preference: 'veg' | 'non-veg'.
 * @returns {Promise<object>} Parsed JSON response with plan, groceries, substitutions, and budget check.
 */
async function generateMealPlan(schedule, budget, diet) {
  // FORCE INSTANT FALLBACK FOR FAST DEMO
  return getFallbackPlan(schedule, budget, diet);
  }

  const dietRules = diet === 'veg'
    ? 'All meals MUST be strictly vegetarian (no meat, fish, or eggs).'
    : 'Non-vegetarian meals are allowed including eggs, chicken, and fish.';

  const prompt = `You are a professional Indian meal-planning AI. Based on the user's schedule, budget, and dietary preference, create a structured meal plan featuring authentic Indian cuisine.

User's Schedule: "${schedule}"
User's Budget: ₹${budget}
Dietary Preference: ${diet === 'veg' ? 'Vegetarian' : 'Non-Vegetarian (eggs are considered non-veg)'}
${dietRules}

Rules:
- All dishes MUST be authentic Indian cuisine (e.g., dosa, idli, paratha, biryani, dal, paneer, curry, etc.)
- Egg is considered non-veg — do NOT include eggs in vegetarian meals
- Keep each meal practical and balanced for an Indian kitchen
- All costs in INR (₹)

Return ONLY valid JSON (no markdown fences, no code blocks) with this exact structure:
{
  "plan": {
    "breakfast": { "meal": "...", "description": "...", "estimated_cost": 0 },
    "lunch": { "meal": "...", "description": "...", "estimated_cost": 0 },
    "dinner": { "meal": "...", "description": "...", "estimated_cost": 0 }
  },
  "grocery_list": ["item 1", "item 2"],
  "substitutions": [
    { "ingredient": "...", "alternative": "..." }
  ],
  "budget_check": {
    "total_estimated_cost": 0,
    "budget": ${budget},
    "within_budget": true,
    "note": "..."
  }
}
Ensure the budget_check.within_budget is correctly calculated. Keep grocery_list concise (5-12 items). Provide 2-3 substitutions.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nex-agi/nex-n2-pro:free',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = await response.json();
  if (result.error || !result.choices) {
    console.error("OpenRouter API Error:", result);
    throw new Error(result.error?.message || "Failed to generate AI response.");
  }
  const text = result.choices[0].message.content;

  // Strip any <think> blocks (used by reasoning models like MiniMax-M3)
  const noThink = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip any markdown fences if present
  const cleaned = noThink.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Fallback plan when no API key is configured.
 * @param {string} schedule
 * @param {number} budget
 * @param {string} diet
 * @returns {object}
 */
function getFallbackPlan(schedule, budget, diet) {
  const isVeg = diet === 'veg';
  const totalCost = 350;

  const vegPlan = {
    plan: {
      breakfast: { meal: 'Masala Dosa with Sambar', description: 'Crispy rice crepe filled with spiced potato filling, served with lentil sambar and coconut chutney.', estimated_cost: 80 },
      lunch: { meal: 'Paneer Butter Masala with Naan', description: 'Rich and creamy paneer curry cooked in tomato-onion gravy, served with butter naan and salad.', estimated_cost: 150 },
      dinner: { meal: 'Dal Khichdi with Papad', description: 'Comforting one-pot rice and lentil porridge tempered with ghee and cumin, served with crispy papad and pickle.', estimated_cost: 120 },
    },
    grocery_list: ['Rice', 'Toor dal', 'Urad dal', 'Wheat flour', 'Paneer', 'Tomatoes', 'Onions', 'Coconut', 'Curry leaves', 'Mustard seeds', 'Dry red chillies', 'Ghee', 'Spices (turmeric, cumin, coriander)'],
    substitutions: [
      { ingredient: 'Paneer', alternative: 'Tofu for a vegan option, or extra paneer' },
      { ingredient: 'Naan', alternative: 'Whole wheat roti or phulka' },
      { ingredient: 'Coconut for chutney', alternative: 'Peanut or mint chutney' },
    ],
    budget_check: {
      total_estimated_cost: totalCost,
      budget: budget,
      within_budget: totalCost <= budget,
      note: totalCost <= budget
        ? 'Shabash! This vegetarian meal plan fits within your budget.'
        : `Yeh budget se ₹${(totalCost - budget).toFixed(2)} zyada hai. Try simpler dishes like roti-sabzi.`,
    },
  };

  const nonVegPlan = {
    plan: {
      breakfast: { meal: 'Egg Paratha with Chai', description: 'Flaky whole wheat paratha stuffed with spiced scrambled eggs, served with a hot cup of masala chai.', estimated_cost: 90 },
      lunch: { meal: 'Chicken Dum Biryani with Raita', description: 'Fragrant basmati rice layered with marinated chicken, caramelized onions, and saffron, served with cucumber raita.', estimated_cost: 180 },
      dinner: { meal: 'Fish Curry with Steamed Rice', description: 'Tangy coconut-based fish curry with mustard seeds and curry leaves, served with steaming hot rice.', estimated_cost: 150 },
    },
    grocery_list: ['Basmati rice', 'Chicken', 'Fish (pomfret/mackerel)', 'Eggs', 'Wheat flour', 'Onions', 'Tomatoes', 'Curd/yogurt', 'Coconut milk', 'Saffron', 'Ginger-garlic paste', 'Whole spices (bay leaf, cardamom, cloves)'],
    substitutions: [
      { ingredient: 'Chicken', alternative: 'Mutton or paneer (if available)' },
      { ingredient: 'Fish', alternative: 'Prawns or chicken thigh' },
      { ingredient: 'Saffron', alternative: 'Turmeric + a few drops of orange food colour' },
    ],
    budget_check: {
      total_estimated_cost: totalCost,
      budget: budget,
      within_budget: totalCost <= budget,
      note: totalCost <= budget
        ? 'Badhiya! This non-veg meal plan fits within your budget.'
        : `This plan exceeds your budget by ₹${(totalCost - budget).toFixed(2)}. Consider simpler options like egg curry.`,
    },
  };

  return isVeg ? vegPlan : nonVegPlan;
}

// ── API Routes ────────────────────────────────────────────────────────

/**
 * POST /api/generate-plan
 * Body: { schedule: string, budget: number, diet: 'veg' | 'non-veg' }
 * Returns: { plan, grocery_list, substitutions, budget_check }
 */
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { schedule, budget, diet } = req.body;

    if (!schedule || typeof schedule !== 'string' || schedule.trim().length === 0) {
      return res.status(400).json({ error: 'A valid schedule is required.' });
    }

    const numBudget = Number(budget);
    if (isNaN(numBudget) || numBudget <= 0) {
      return res.status(400).json({ error: 'A valid positive budget is required.' });
    }

    const dietPref = diet === 'veg' ? 'veg' : 'non-veg';

    const data = await generateMealPlan(schedule.trim(), numBudget, dietPref);
    res.json(data);
  } catch (err) {
    console.error('Plan generation error:', err);
    res.status(500).json({ error: 'Failed to generate meal plan. Please try again.' });
  }
});

// ── Start Server ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Chef Govu AI server running on http://localhost:${PORT}`);
});

export default app;
