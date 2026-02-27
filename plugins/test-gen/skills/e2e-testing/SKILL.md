# E2E Testing

Write end-to-end tests that verify complete user workflows through the application. Covers Playwright, Cypress, and general E2E testing patterns.

## When to Activate

When the user asks to:
- Write end-to-end tests or E2E tests
- Test user workflows through the UI
- Set up Playwright or Cypress
- Test a complete user journey
- Create smoke tests or regression tests

## E2E Testing Principles

| Principle | Guideline |
|-----------|-----------|
| **Test user flows, not pages** | Login → Search → Purchase, not "test login page" |
| **Few but critical** | 10-20 E2E tests covering critical paths |
| **Independent** | Each test starts from a clean state |
| **Resilient selectors** | Use data-testid, roles, text — not CSS classes |
| **Fast feedback** | Parallel execution, smart waits (no sleep) |

## The Testing Pyramid

```
         ╱╲
        ╱ E2E ╲        ← Few, slow, high confidence
       ╱────────╲
      ╱Integration╲    ← Moderate count, API-level
     ╱──────────────╲
    ╱  Unit Tests    ╲  ← Many, fast, isolated
   ╱──────────────────╲
```

E2E tests should cover **critical user journeys** only — authentication flows, checkout processes, data creation workflows, and key business operations.

## Playwright Patterns

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    // Fill form
    await page.getByLabel('Email').fill('alice@test.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Assert redirect and welcome
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome, alice')).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill('existing@test.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Email already registered')).toBeVisible();
  });
});
```

### Selectors Best Practices

```typescript
// ✅ GOOD — Resilient selectors
page.getByRole('button', { name: 'Submit' })    // Role + accessible name
page.getByLabel('Email')                          // Form labels
page.getByText('Welcome')                         // Visible text
page.getByTestId('user-avatar')                   // data-testid attribute
page.getByPlaceholder('Search...')                // Placeholder text

// ❌ BAD — Fragile selectors
page.locator('.btn-primary')                     // CSS class (changes often)
page.locator('#submit-btn')                      // ID (implementation detail)
page.locator('div > div > button:nth-child(2)')  // DOM structure
page.locator('[class*="styled"]')                // Generated class names
```

### Page Object Pattern

```typescript
// pages/login-page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }

  async expectError(message: string) {
    await expect(this.page.getByRole('alert')).toContainText(message);
  }
}

// tests/auth.spec.ts
test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('alice@test.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

### Waiting and Assertions

```typescript
// ✅ Built-in auto-waiting (Playwright handles this)
await expect(page.getByText('Loaded')).toBeVisible();

// ✅ Wait for network idle after navigation
await page.goto('/dashboard', { waitUntil: 'networkidle' });

// ✅ Wait for specific API response
const response = await page.waitForResponse('**/api/users');
expect(response.status()).toBe(200);

// ❌ NEVER use fixed waits
await page.waitForTimeout(5000); // anti-pattern!
```

### API Mocking in E2E

```typescript
// Mock API response
await page.route('**/api/users', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Alice' }]),
  });
});

// Simulate error
await page.route('**/api/users', (route) => {
  route.fulfill({ status: 500, body: 'Internal Server Error' });
});
```

## Cypress Patterns

### Basic Structure

```typescript
describe('Shopping Cart', () => {
  beforeEach(() => {
    cy.visit('/shop');
  });

  it('should add item to cart', () => {
    cy.get('[data-testid="product-1"]').click();
    cy.get('[data-testid="add-to-cart"]').click();
    cy.get('[data-testid="cart-count"]').should('have.text', '1');
  });

  it('should complete checkout', () => {
    // Add item
    cy.get('[data-testid="product-1"]').click();
    cy.get('[data-testid="add-to-cart"]').click();

    // Go to checkout
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="checkout-button"]').click();

    // Fill payment
    cy.get('#card-number').type('4242424242424242');
    cy.get('#expiry').type('12/28');
    cy.get('#cvc').type('123');
    cy.get('[data-testid="pay-button"]').click();

    // Verify success
    cy.url().should('include', '/order-confirmation');
    cy.contains('Order placed successfully').should('be.visible');
  });
});
```

### Cypress API Intercept

```typescript
cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('getProducts');
cy.visit('/shop');
cy.wait('@getProducts');
cy.get('[data-testid="product-list"]').children().should('have.length', 5);
```

## Critical E2E Test Scenarios

### Authentication
1. Register → verify email → login → access protected page
2. Login → session persistence across page reloads
3. Login → logout → cannot access protected pages
4. Invalid credentials → error message → retry

### Data CRUD
1. Create item → see in list → edit → verify changes → delete → confirm gone
2. Create with validation errors → fix → submit successfully
3. Concurrent edits → conflict resolution (if applicable)

### Payments / Checkout
1. Browse → add to cart → checkout → payment → confirmation
2. Cart persistence across sessions
3. Apply coupon → verify discount
4. Payment failure → error handling → retry

## Configuration

### Playwright Config

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Notes

- E2E tests are slow — keep the count low (10-30 tests for most apps)
- Run E2E in CI, not as part of the regular dev loop
- Use visual regression testing (Playwright screenshots) for UI-heavy apps
- Reset database state before each test for isolation
- Prefer Playwright over Cypress for multi-tab, multi-browser, and API testing
