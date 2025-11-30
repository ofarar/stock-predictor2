# 📈 StockPredictorAI

**[StockPredictorAI]((https://stockpredictorai.com/))** is a professional financial forecasting platform where market analysts and investors validate their insights against real-time market data. It features a transparent performance tracking system, a meritocratic reputation index, and a creator economy that allows top-performing analysts to monetize their expertise.

-----

## 🛠️ Technology Stack

### Core Stack (MERN)

| Technology | Purpose | Website |
| :--- | :--- | :--- |
| **Node.js** | Server-side runtime environment | [nodejs.org](https://nodejs.org/) |
| **Express.js** | Backend web framework for REST API | [expressjs.com](https://expressjs.com/) |
| **React** | Frontend UI library (Vite build tool) | [react.dev](https://react.dev/) |
| **MongoDB Atlas** | Cloud NoSQL database (Frankfurt Region) | [mongodb.com](https://www.mongodb.com/atlas) |
| **Mongoose** | ODM for MongoDB schema modeling | [mongoosejs.com](https://mongoosejs.com/) |

### Infrastructure & Deployment

| Technology | Purpose | Website |
| :--- | :--- | :--- |
| **Fly.io** | Dockerized backend hosting (Amsterdam Region) | [fly.io](https://fly.io/) |
| **Cloudflare Pages** | Frontend static asset hosting & CDN | [pages.cloudflare.com](https://pages.cloudflare.com/) |
| **Cloudflare** | DNS management & Domain registration | [cloudflare.com](https://www.cloudflare.com/) |
| **Docker** | Containerization for consistent deployment | [docker.com](https://www.docker.com/) |

### Services & Integrations

| Technology | Purpose | Website |
| :--- | :--- | :--- |
| **Stripe** | Payments & Creator Payouts (Connect Express) | [stripe.com](https://stripe.com/) |
| **Brevo (Sendinblue)** | Transactional email service (SMTP) | [brevo.com](https://www.brevo.com/) |
| **Sentry** | Production error tracking and monitoring | [sentry.io](https://sentry.io/) |
| **Logtail (BetterStack)** | Log management and production error tracking | [betterstack.com/logtail](https://betterstack.com/logtail) |
| **Yahoo Finance (v3)** | Market data provider (via `yahoo-finance2`) | [npm/yahoo-finance2](https://www.npmjs.com/package/yahoo-finance2) |
| **CoinGecko** | Dedicated Crypto Spot Price Provider (Used to bypass stale data from Yahoo for BTC/ETH) | [coingecko.com/api](https://www.coingecko.com/api) |
| **NASDAQ Earnings Calendar API** | Used for Earnings Banner (Next 7 days, High Cap stocks) | [nasdaq.com](https://www.nasdaq.com/market-activity/earnings) |
| **Google OAuth** | Secure user authentication (Passport.js) | [developers.google.com](https://developers.google.com/identity) |

-----

## 🏗️ Technical Architecture & Design

### 1\. Design Strategies

  * **Adapter Pattern:** The financial data layer uses an adapter pattern (`financeAPI.js`). This abstracts the third-party provider (`yahooProvider.js`), allowing the underlying data source to be swapped without modifying the core application logic.
  * **Atomic Database Operations:** Critical writes, such as incrementing view counts (`$inc`) or updating analyst ratings, utilize MongoDB atomic operators to ensure data integrity under high concurrency without race conditions.
  * **Optimistic UI:** The frontend (`FollowersPage.jsx`, `PredictionDetailPage.jsx`) updates the UI immediately upon user action (e.g., following, endorsing) before the server response is received, ensuring a responsive user experience.
  * **Event-Driven Updates:** Real-time features (like price updates or new prediction alerts) are handled via **Socket.io**, pushing data to clients instantly rather than relying solely on polling.
  * **Code Splitting:** Utilizes `React.lazy` and `Suspense` to load non-critical pages on demand, significantly reducing the initial bundle size for faster application startup.

### 2\. Security Measures

  * **Secure Session Management:** Uses `express-session` with `connect-mongo` for persistent storage and cryptographically strong secrets.
  * **Traffic Security:** `Helmet` middleware sets secure HTTP headers. The backend trusts the Fly.io proxy (`trust proxy`) to correctly handle SSL termination and IP rate limiting.
  * **Rate Limiting:** Specific limiters (`predictLimiter`, `actionLimiter`) prevent API abuse on high-cost endpoints.

-----

## 🛡️ Security and Attack Prevention

Security is a primary concern. This application implements several layers of defense, including industry-standard middleware, robust data validation, and dedicated security practices for authentication and payments.

---

### 1. Backend API Protection

We use **Helmet.js** to set secure HTTP headers and **Rate Limiting** to prevent brute-force and denial-of-service (DoS) attacks on critical endpoints.

| Defense Mechanism | Component/File | Configuration | Rationale |
| :--- | :--- | :--- | :--- |
| **HTTP Headers** | `server.js` | `helmet()` middleware | Protects against XSS, clickjacking, and other common attacks by setting security headers. |
| **API Rate Limiting** | `predictions.js`, `users.js` | Uses constants for limits: `PREDICT_LIMIT` (10/hr), `ACTION_LIMIT` (60/15m). | Prevents database strain and excessive external API calls (e.g., Yahoo Finance costs) from bots/rapid automation. |
| **Data Sanitization** | `predictions.js`, `posts.js`, `users.js` | `xss` library | Cleans all user-generated content (descriptions, posts, profile fields) before saving to the database, preventing stored Cross-Site Scripting (XSS). |
| **CORS** | `server.js` | `cors` middleware | Whitelists only approved domains (`localhost`, production domains) to prevent unauthorized origins from accessing the API. |

---

### 2. Authentication and Session Management

| Defense Mechanism | Component/File | Configuration | Rationale |
| :--- | :--- | :--- | :--- |
| **Secure Cookies** | `server.js` | `httpOnly: true`, `secure: true`, `sameSite: 'none'` (Production) | Protects session cookies from client-side script access and ensures cookies are only sent over HTTPS. |
| **CSRF Protection** | Session/Cookie based | N/A (Relies on SameSite=None and HttpOnly) | While a dedicated CSRF token middleware isn't explicit, using `HttpOnly` and appropriate `SameSite` settings mitigates many CSRF risks when combined with stateless APIs and secure cookie policies. |
| **Referral Protection** | `passport-setup.js`, `users.js` | Session variable (`req.session.referralCode`) | Ensures referral codes are validated and processed only once during the final user registration/creation step. |

---

### 3. Payment and Payout Security (Stripe)

| Defense Mechanism | Component/File | Configuration | Rationale |
| :--- | :--- | :--- | :--- |
| **Webhook Verification** | `routes/stripe.js` | `stripe.webhooks.constructEvent()` | Critically verifies that incoming webhook events are genuinely from Stripe using the unique signing secret, preventing replay attacks and spoofing. |
| **Atomic Updates** | `routes/stripe.js` | Webhook handler logic | Subscription status changes are only updated after the webhook is successfully verified, ensuring payment and subscription status integrity. |
| **Dedicated Body Parser** | `server.js`, `routes/stripe.js` | `express.raw({ type: 'application/json' })` | Ensures the raw request body is available to the webhook verification function *before* Express parses it, which is essential for signature verification. |

-----

## 📊 Domain Logic & Reputation System

### 1\. Prediction Scoring Algorithm (0-100)

The platform uses a **Proximity Scoring System** to evaluate the precision of financial forecasts.

  * **Directional Accuracy:** If the predicted direction (Up vs. Down) is incorrect, the rating is immediately **0**.
  * **Precision Calculation:** If the direction is correct, the rating is calculated based on the deviation from the actual market price.
  * **Tolerance Threshold:** A **20% error margin** is applied.
      * 0% Deviation = **100 Rating**
      * 10% Deviation = **50 Rating**
      * > 20% Deviation = **0 Rating**

### 2\. Time Sensitivity (Anti-Sniping)

To ensure the integrity of forecasts, a dynamic **Time Penalty** adjusts the *Maximum Possible Rating* based on when the prediction was made relative to market close.

  * **Hourly:** Max rating decreases linearly after the first 10 minutes of the hour.
  * **Daily:** Max rating is calculated based on minutes elapsed since the specific market's opening time (e.g., NYSE open vs. Tokyo open).
  * **Long-term:** Rating potential scales based on the percentage of the time period elapsed.

### 3\. Analyst Rating (Reputation Index)

Users build an aggregate **Analyst Rating** which serves as their reputation index and determines their rank on the leaderboard and share of the Creator Pool.

  * **Performance:** Awarded based on forecast accuracy tiers (\>90 rating = +10 impact, \>80 rating = +5 impact).
  * **Milestones:** Achieving specific performance consistency grants significant reputation boosts (+100 to +500).
  * **Community Impact:** Sharing analysis and insights awards incremental reputation (+5).
  * **Network Growth:** Onboarding active professionals awards significant reputation (+500).

### 4\. Performance Milestones (Badges)

Milestones are awarded automatically via the `badgeService` based on strict performance criteria defined in the database `Settings`.

  * **Criteria:** Milestones require a minimum volume of predictions AND a sustained average rating.
  * **Tiers:** Bronze (70+ Avg), Silver (80+ Avg), Gold (90+ Avg).
  * **Specializations:** There are specific milestones for different analytical timeframes (e.g., "Hourly Specialist", "Macro Strategist").

### 5\. Weighted Target Hit Bonus

To ensure fair play and incentivize deep analysis, the bonus for hitting a target price is weighted by the prediction duration.

| Prediction Type | Effort/Risk | Multiplier | Reward for Hitting Target | Misuse Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Hourly** | Very Low | **0.5x** | **2.5** points | Discourages spamming low-effort predictions. |
| **Daily** | Low | **1.0x** | **5.0** points | Standard reward. |
| **Weekly** | Medium | **2.0x** | **10.0** points | Increased reward for medium-term accuracy. |
| **Monthly** | High | **4.0x** | **20.0** points | Significant reward for sustained accuracy. |
| **Quarterly** | Very High | **6.0x** | **30.0** points | Major reward for quarterly forecasting. |
| **Yearly** | Very High | **10.0x** | **50.0** points | Heavily incentivizes deep, long-term analysis.

-----

### 💳 Monetization & Revenue Models

The platform operates on a dual-economy model, rewarding both individual content monetization and overall platform contribution.

#### 1. The Creator Pool (Profit Sharing)
To align platform success with analyst success, **50% of StockPredictorAI's quarterly net profit** is allocated to the **Creator Pool**.
* **Distribution:** This pool is distributed pro-rata to users based on their share of the total **Analyst Rating** points on the platform.
* **Eligibility:** Analysts must meet specific activity and reputation thresholds (e.g., Minimum Rating, Verified Status) to qualify for the quarterly payout.

#### 2. Golden Membership (Direct Subscriptions)
Top analysts can monetize their exclusive research and signals directly by becoming **Golden Members**.
* **Subscription Model:** Investors subscribe to a Golden Member for a monthly fee (e.g., $5 - $500).
* **Revenue Split:** The transaction is split automatically via **Stripe Connect**:
    * **70%** goes to the **Analyst** (Golden Member).
    * **30%** goes to the **Platform** (Service Fee).

#### 3. Verified Status (Platform Revenue)
* Analysts can purchase a **"Verified Predictor"** badge to establish authenticity and gain visibility in search filters.
* **Handling:** Managed via standard Stripe Checkout sessions.

***
-----

## 🧪 Testing Strategy

We maintain a robust End-to-End (E2E) testing suite to ensure critical user flows and application stability.

### 1. Testing Framework
*   **Cypress:** Our primary tool for E2E testing. It allows us to simulate real user interactions, intercept network requests, and verify UI states in a reliable, browser-based environment.

### 2. Test Approach
*   **Critical Flows:** We focus on testing high-value user journeys such as:
    *   **Authentication:** Login, Registration, and Session persistence.
    *   **Predictions:** Creating, viewing, and interacting with stock predictions.
    *   **Creator Pool:** Verifying modal interactions, leaderboard rendering, and chart visualizations.
    *   **Navigation:** Ensuring seamless transitions between pages (Dashboard, Profile, Market).
*   **API Mocking:** We utilize `cy.intercept()` to mock backend API responses. This ensures tests are deterministic, faster, and isolated from external dependencies (like live market data or third-party APIs).
*   **Visual Verification:** Assertions are used to verify styling (e.g., special borders for top creators), visibility of elements, and correct data rendering.

### 3. Backend Testing
*   **Jest:** Used for unit and integration testing of complex backend logic, specifically:
    *   **Calculation Logic:** Verifying the accuracy of prediction ratings, time penalties, and aggressiveness scores.
    *   **Utility Functions:** Testing isolated helper functions to ensure correctness before integration.
    *   **Jobs:** Validating background job logic (like assessment jobs) in a controlled environment.

## 🚀 Getting Started (Local Development)

1.  **Clone the repository.**
2.  **Install Dependencies:**
    ```bash
    npm install          # Root (Server)
    cd client && npm install  # Client
    ```
3.  **Environment Setup:**
      * Create `.env` in the root directory with Mongo URI, Google Auth keys, Stripe keys, and Brevo credentials.
      * Create `.env` in `client/` with `VITE_API_URL` and Stripe Publishable Key.
4.  **Run Application:**
      * **Server:** `npm run dev` (starts Node server on port 5001).
      * **Client:** `npm run dev` (starts Vite server on port 5173).
5.  **Run Tests:**
      * **Cypress (E2E):**
        ```bash
        cd client
        npx cypress open   # Opens the interactive Test Runner
        # OR
        npx cypress run    # Runs tests headlessly
        ```
      * **Jest (Backend):**
        ```bash
        cd server
        npm test           # Runs all backend tests
        ```
6.  **Generate Documentation:**
      * **PDFs (Walkthrough & Whitepaper):**
        ```bash
        cd client
        node scripts/generate-docs.js
        ```
        The generated PDFs will be located in `client/public/docs/`.

-----

*© 2025 StockPredictorAI. All rights reserved.*
```