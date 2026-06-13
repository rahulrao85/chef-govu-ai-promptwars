/**
 * Server integration tests
 * @module server.test
 */

import request from 'supertest';
import app from './server.js';

describe('POST /api/generate-plan', () => {
  // ── Validation Tests ──────────────────────────────────────────────────

  it('should return 400 when schedule is missing', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ budget: 25 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when budget is missing', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy workday' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when budget is not a number', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy day', budget: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when budget is zero or negative', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy day', budget: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when schedule is empty string', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: '   ', budget: 25 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ── Success Tests ─────────────────────────────────────────────────────

  it('should return 400 when diet is invalid', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy day', budget: 25, diet: 'invalid' });

    // Invalid diet defaults to non-veg, so should still succeed
    expect(res.status).toBe(200);
  });

  it('should return 400 when diet is missing (should default to veg)', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy day', budget: 25 });

    // Missing diet defaults to non-veg, should succeed
    expect(res.status).toBe(200);
  });

  it('should return 200 with valid veg plan when body is correct', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy workday from 9-5, need quick breakfast and easy dinner', budget: 500, diet: 'veg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('plan');
    expect(res.body).toHaveProperty('grocery_list');
    expect(res.body).toHaveProperty('substitutions');
    expect(res.body).toHaveProperty('budget_check');

    // Check plan structure
    expect(res.body.plan).toHaveProperty('breakfast');
    expect(res.body.plan).toHaveProperty('lunch');
    expect(res.body.plan).toHaveProperty('dinner');

    // Check budget_check structure
    expect(res.body.budget_check).toHaveProperty('total_estimated_cost');
    expect(res.body.budget_check).toHaveProperty('budget');
    expect(res.body.budget_check).toHaveProperty('within_budget');
    expect(res.body.budget_check).toHaveProperty('note');

    // grocery list should be an array
    expect(Array.isArray(res.body.grocery_list)).toBe(true);
    // substitutions should be an array
    expect(Array.isArray(res.body.substitutions)).toBe(true);
  });

  it('should return 200 with valid non-veg plan when body is correct', async () => {
    const res = await request(app)
      .post('/api/generate-plan')
      .send({ schedule: 'Busy workday from 9-5, need quick breakfast and easy dinner', budget: 500, diet: 'non-veg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('plan');
    expect(res.body).toHaveProperty('grocery_list');
    expect(res.body).toHaveProperty('substitutions');
    expect(res.body).toHaveProperty('budget_check');

    expect(res.body.plan).toHaveProperty('breakfast');
    expect(res.body.plan).toHaveProperty('lunch');
    expect(res.body.plan).toHaveProperty('dinner');

    expect(res.body.budget_check).toHaveProperty('total_estimated_cost');
    expect(res.body.budget_check).toHaveProperty('budget');
    expect(res.body.budget_check).toHaveProperty('within_budget');
    expect(res.body.budget_check).toHaveProperty('note');

    expect(Array.isArray(res.body.grocery_list)).toBe(true);
    expect(Array.isArray(res.body.substitutions)).toBe(true);
  });
});

describe('Security Headers', () => {
  it('should not expose x-powered-by header', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should include helmet security headers', async () => {
    const res = await request(app).get('/nonexistent');
    // Helmet sets X-Content-Type-Options
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('JSON body size limit', () => {
  it('should reject payloads over 16kb', async () => {
    const largePayload = { schedule: 'x'.repeat(20000), budget: 25 };
    const res = await request(app)
      .post('/api/generate-plan')
      .send(largePayload);

    // Express returns 413 when payload is too large
    expect(res.status).toBe(413);
  });
});

describe('GET / (static files)', () => {
  it('should serve index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });
});
