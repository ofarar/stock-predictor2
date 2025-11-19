
# 📈 StockPredictorAI

www.stockpredictorai.com

**[StockPredictorAI]((https://stockpredictorai.com/))** is a community-driven financial forecasting platform where users compete to predict stock market movements. It features real-time market data, a gamified reputation system, and a creator economy allowing top analysts to monetize their insights.

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
| **Brevo (Sendinblue)** | Transactional email service (SMTP) | [brevo.com](https://www.brevo.com/) |
| **Stripe** | Payments & Creator Payouts (Connect Express) | [stripe.com](https://stripe.com/) |
| **Sentry** | Production error tracking and monitoring | [sentry.io](https://sentry.io/) |
| **Yahoo Finance (v3)** | Market data provider (via `yahoo-finance2`) | [npm/yahoo-finance2](https://www.npmjs.com/package/yahoo-finance2) |
| **Google OAuth** | Secure user authentication (Passport.js) | [developers.google.com](https://developers.google.com/identity) |

-----

## 🏗️ Technical Architecture & Design

### 1\. Design Strategies

  * **Adapter Pattern:** The financial data layer uses an adapter pattern (`financeAPI.js`). This abstracts the third-party provider (`yahooProvider.js`), allowing the underlying data source to be swapped without modifying the core application logic.
  * **Atomic Database Operations:** Critical writes, such as incrementing view counts (`$inc`) or updating user ratings, utilize MongoDB atomic operators to ensure data integrity under high concurrency without race conditions.
  * **Optimistic UI:** The frontend (`FollowersPage.jsx`, `PredictionDetailPage.jsx`) updates the UI immediately upon user action (e.g., following, liking) before the server response is received, ensuring a snappy user experience.
  * **Event-Driven Updates:** Real-time features (like flashing price updates or new predictions) are handled via **Socket.io**, pushing data to clients instantly rather than relying solely on polling.

### 2\. Security Measures

  * **Secure Session Management:** Uses `express-session` with `connect-mongo` for persistent storage and cryptographically strong secrets.
  * **Traffic Security:** `Helmet` middleware sets secure HTTP headers. The backend trusts the Fly.io proxy (`trust proxy`) to correctly handle SSL termination and IP rate limiting.
  * **Rate Limiting:** Specific limiters (`predictLimiter`, `actionLimiter`) prevent API abuse on high-cost endpoints.

-----

## 🧠 Domain Logic & Gamification

### 1\. Prediction Scoring Algorithm (0-100)

The platform uses a **Proximity Scoring System** rather than a binary Win/Loss model.

  * **Direction Check:** If the prediction direction (Up vs. Down) is wrong, the score is immediately **0**.
  * **Accuracy Calculation:** If the direction is correct, the score is calculated based on the deviation from the actual price.
  * **Threshold:** There is a **20% error margin**.
      * 0% Error = **100 Points**
      * 10% Error = **50 Points**
      * > 20% Error = **0 Points**

### 2\. Time Penalty (Anti-Sniping)

To prevent users from predicting obvious outcomes right before a deadline, a dynamic **Time Penalty** reduces the *Maximum Possible Score*.

  * **Hourly:** Penalty increases linearly after the first 10 minutes.
  * **Daily:** Penalty is calculated based on minutes elapsed since the specific market's opening time (e.g., NYSE open vs. Tokyo open).
  * **Weekly/Monthly:** Penalty scales based on the percentage of the time period elapsed.

### 3\. Analyst Rating (Total Points)

Users accumulate **Analyst Rating** points which determine their leaderboard rank and Creator Pool share.

  * **Predictions:** Awarded based on accuracy tiers (\>90 score = +10 pts, \>80 score = +5 pts).
  * **Badges:** Earning a badge grants a large one-time bonus (+100 to +500 pts).
  * **Sharing:** Sharing content on social media awards small incremental points (+5 pts).
  * **Referrals:** Inviting active users awards significant points (+500 pts).

### 4\. Badge System

Badges are awarded automatically via the `badgeService` and are defined in the database `Settings`.

  * **Criteria:** Badges require a minimum number of predictions AND a minimum average rating.
  * **Tiers:** Bronze (70+ Avg), Silver (80+ Avg), Gold (90+ Avg).
  * **Categories:** There are specific badges for different timeframes (e.g., "Hourly Hotshot", "Weekly Strategist").

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