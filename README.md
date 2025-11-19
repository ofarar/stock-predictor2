
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
| **Yahoo Finance (v3)** | Market data provider (via `yahoo-finance2`) | [npm/yahoo-finance2](https://www.npmjs.com/package/yahoo-finance2) |
| **Google OAuth** | Secure user authentication (Passport.js) | [developers.google.com](https://developers.google.com/identity) |

-----

## 🏗️ Technical Architecture & Design

### 1\. Design Strategies

  * **Adapter Pattern:** The financial data layer uses an adapter pattern (`financeAPI.js`). This abstracts the third-party provider (`yahooProvider.js`), allowing the underlying data source to be swapped without modifying the core application logic.
  * **Atomic Database Operations:** Critical writes, such as incrementing view counts (`$inc`) or updating analyst ratings, utilize MongoDB atomic operators to ensure data integrity under high concurrency without race conditions.
  * **Optimistic UI:** The frontend (`FollowersPage.jsx`, `PredictionDetailPage.jsx`) updates the UI immediately upon user action (e.g., following, endorsing) before the server response is received, ensuring a responsive user experience.
  * **Event-Driven Updates:** Real-time features (like price updates or new prediction alerts) are handled via **Socket.io**, pushing data to clients instantly rather than relying solely on polling.

### 2\. Security Measures

  * **Secure Session Management:** Uses `express-session` with `connect-mongo` for persistent storage and cryptographically strong secrets.
  * **Traffic Security:** `Helmet` middleware sets secure HTTP headers. The backend trusts the Fly.io proxy (`trust proxy`) to correctly handle SSL termination and IP rate limiting.
  * **Rate Limiting:** Specific limiters (`predictLimiter`, `actionLimiter`) prevent API abuse on high-cost endpoints.

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

-----

*© 2025 StockPredictorAI. All rights reserved.*