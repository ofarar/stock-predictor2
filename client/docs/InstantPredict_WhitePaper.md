# Instant Predict: A Hybrid Mean-Reversion and Momentum Model for Intraday Asset Price Forecasting

**Version 1.0 (Draft)**
**Date:** December 2025
**Classification:** Confidential / Administrative Draft

---

## 1. Abstract

The **Instant Predict** system (formerly designated "Gold Bot") is a quantitative model designed for high-frequency, short-horizon price forecasting across multiple asset classes, including equities, commodities, and cryptocurrencies. Unlike trend-following models that rely on long-term moving averages, this system employs a hybrid approach that synthesizes **Mean Reversion** logic (via Relative Strength Index) with **Volatility Breakout** mechanics (via Bollinger Bands). The model targets a specific intraday horizon of 4 to 8 hours, providing actionable directional probabilities for active market sessions.

## 2. Methodology

The core hypothesis of the Instant Predict model is that asset prices exhibit predictable behavior at the extremes of their volatility and momentum distributions. The algorithm processes real-time price action through a hierarchical decision tree:

1.  **Regime Detection**: Identifying if the asset is in a mean-reverting (ranging) or momentum (trending) state.
2.  **Signal Generation**: Triggering entries based on specific technical thresholds.
3.  **Target Projection**: Calculating dynamic price targets based on statistical deviation bands.

### 2.1 The Time Horizon
The model is optimized for **Intraday** analysis, specifically targeting the **Short Term (4H)** window. It utilizes 1-hour interval data (`1h`) to capture granular price movements that are often smoothed out in daily aggregations.

## 3. Mathematical Framework

The model utilizes three primary technical indicators to derive its signals.

### 3.1 Relative Strength Index (RSI)
RSI is used as the primary filter for **Mean Reversion**.

$$ RSI = 100 - \frac{100}{1 + RS} $$

Where $RS$ (Relative Strength) is the average of $N$ days' up closes divided by the average of $N$ days' down closes ($N=14$).

**Decision Logic:**
-   **Oversold Condition**: If $RSI < 30$, the model assumes the asset is statistically undervalued relative to recent performance and predicts a **Bullish Reversion**.
-   **Overbought Condition**: If $RSI > 70$, the model assumes the asset is overvalued and predicts a **Bearish Correction**.

### 3.2 Bollinger Bands (BB)
Bollinger Bands provide the dynamic support and resistance levels for **Target Pricing**.

$$ \text{Upper Band} = \mu + (k \cdot \sigma) $$
$$ \text{Lower Band} = \mu - (k \cdot \sigma) $$

Where:
-   $\mu$ is the 20-period Simple Moving Average (SMA).
-   $\sigma$ is the standard deviation of the price.
-   $k$ is the multiplier (set to 2).

### 3.3 Momentum Factor ($M$)
When the asset is not at an RSI extreme ($30 \le RSI \le 70$), the model switches to **Momentum Logic**. It calculates the rolling return over the last 5 periods ($t_{-5}$ to $t_{0}$):

$$ M_{5} = \frac{P_{t} - P_{t-5}}{P_{t-5}} $$

-   If $M_{5} > 0$, the trend is **Bullish** (Momentum Continuation).
-   If $M_{5} \le 0$, the trend is **Bearish**.

## 4. Execution Logic

The algorithm processes the inputs sequentially:

1.  **Fetch Data**: Retrieve the last 20 periods of `1h` OHLCV data.
2.  **Check Extremes**:
    *   **IF** $RSI < 30$: **BUY** signal. Target = 20 SMA (Mean). Rationale: "Intraday Oversold - Bounce to Mean".
    *   **IF** $RSI > 70$: **SELL** signal. Target = 20 SMA (Mean). Rationale: "Intraday Overbought - Pullback to Mean".
3.  **Check Momentum**:
    *   **ELSE IF** $M_{5} > 0$: **BUY** signal. Target = Upper Bollinger Band. Rationale: "Bullish Momentum Continuation".
    *   **ELSE**: **SELL** signal. Target = Lower Bollinger Band. Rationale: "Bearish Momentum Continuation".

## 5. Performance Expectations

The model is calibrated for identifying high-probability setups in volatile markets. By strictly adhering to "Short Term (4H)" horizons, it minimizes exposure to overnight risks (in traditional markets) and maximizes capital efficiency. The expected move ($E[\Delta P]$) is dynamically calculated as the percentage distance to the statistical band (Target Price).

---
*Confidential Draft - For Internal Review Only*
