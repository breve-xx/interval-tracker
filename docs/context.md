# Application Context: Event Timing Analysis and Prediction

This application is designed to analyze patterns in the timing of recurring, generic events.

## Core Functionality
The primary objective is to allow users to submit an arbitrary number of datetime records. Each record represents the occurrence time of a specific, undefined event. The system must process this historical data to provide two main outputs:

1. **Detailed Statistics**: A comprehensive set of descriptive statistics regarding the timing of the submitted records. This should include, but not be limited to:
    *   Mean/Average time between events.
    *   Standard deviation and variance of event intervals.
    *   Minimum, Maximum, and Median intervals observed.
    *   Distribution visualization insights (e.g., histograms of time gaps).

2. **Prediction of Next Occurrence**: The most critical function is to generate a high-confidence prediction regarding when the next event is likely to happen. The model/algorithm used must extrapolate from the historical data set to estimate a future date and time.

## Data Handling and Input
*   **Input**: A list of datetime entries submitted as freeform text (e.g. pasted by the user). Each entry represents the occurrence time of the tracked event.
*   **Homogeneity**: All entries within a single submission must use the same datetime format. Mixed-format submissions are rejected (see `docs/decisions.md` DEC-0002).
*   **Supported formats**: The parser recognises multiple common datetime conventions, including:
    *   ISO 8601: `2024-03-15T14:30:00`, `2024-03-15 14:30:00`, `2024-03-15`
    *   European slash-separated with time: `15/03/2024 14:30`
    *   European dot-separated with time: `15.03.2024 14:30`
    *   Bulleted list with dot-time notation: `- 20/02/2026 - 15.10` (list marker prefix, date and time separated by ` - `, time written as HH.MM)
*   **Units**: Time differences are calculated and reported in consistent units appropriate to the scale of recurrence (days, hours, or minutes).

## Technical Requirements and Scope
*   The solution should focus heavily on time series analysis and predictive modeling (e.g., ARIMA, Exponential Smoothing, or simple statistical curve fitting, depending on the observed pattern).
*   The prediction mechanism must handle various possible patterns:
    *   **Regular/Periodic Occurrence**: Events happening at roughly fixed intervals (e.g., every 30 days).
    *   **Increasing/Decreasing Frequency**: Intervals getting longer or shorter over time.
    *   **Sporadic/Irregular Occurrence**: No clear pattern, requiring the statistical bounds (e.g., predicting a confidence interval rather than a single point in time).

This context serves as the foundational documentation for building the event pattern analyzer and prediction engine.