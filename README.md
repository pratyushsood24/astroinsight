# AstroInsight MicroSaaS Application

AstroInsight is a personalized astrological analysis application that uses Claude AI to provide insights based on birth chart data. It's built with the Wasp framework, React, Node.js, PostgreSQL, and integrates various third-party services.

## Features

*   User registration (Google OAuth, Email/Password)
*   Birth information collection (date, time, place, gender)
*   Accurate astrological birth chart generation (Swiss Ephemeris)
*   Personalized astrological interpretations via Claude AI
*   Conversational Q&A about astrological insights
*   Subscription-based monetization with Stripe (Basic & Premium tiers, Free Trial)
*   Professional UI/UX with Chakra UI
*   Dark mode support
*   Responsive design

## Tech Stack

*   **Framework**: Wasp (generates React + Express + Prisma)
*   **Frontend**: React, Chakra UI, Recharts
*   **Backend**: Node.js (Express.js via Wasp), Prisma ORM
*   **Database**: PostgreSQL
*   **AI Integration**: Anthropic Claude API (Sonnet & Haiku)
*   **Payments**: Stripe
*   **Authentication**: Wasp Auth (Google OAuth, Email/Password)
*   **Astrological Calculations**: `sweph-js` (Swiss Ephemeris)
*   **Location Services**: Google Maps API (Geocoding, Places Autocomplete)
*   **Email**: SendGrid
*   **Hosting**: Railway (Backend), Netlify (Frontend) - *deployment configurations provided*

## Project Structure

```
astroinsight/
├── .env.server.example  # Environment variable template
├── main.wasp            # Core Wasp configuration file
├── README.md            # This file
├── package.json         # Project dependencies (managed by Wasp)
├── src/                 # Source code
│   ├── client/          # Frontend code (React)
│   └── server/          # Backend code (Node.js)
├── infra/               # Deployment configurations
│   ├── railway/
│   └── netlify/
└── docs/                # Documentation
    └── deployment.md
```

## Prerequisites

*   Node.js (LTS version, check Wasp docs for specific version compatibility)
*   Wasp CLI: `curl -sSL https://get.wasp-lang.dev/installer.sh | sh`
*   PostgreSQL database (local or cloud-hosted)
*   Access/API keys for:
    *   Google Cloud Platform (OAuth, Maps API)
    *   Anthropic Claude API
    *   Stripe API
    *   SendGrid API

## Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd astroinsight
    ```

2.  **Install Wasp (if not already installed):**
    Follow instructions at [https://wasp-lang.dev/docs/quick-start](https://wasp-lang.dev/docs/quick-start).

3.  **Set up Environment Variables:**
    *   Copy `.env.server.example` to `.env.server`:
        ```bash
        cp .env.server.example .env.server
        ```
    *   Fill in the required API keys and configuration values in `.env.server`.
    *   For Google OAuth, ensure your callback URL in Google Cloud Console is set to `http://localhost:3001/auth/google/callback` for local development.

4.  **Swiss Ephemeris Data Files:**
    The `sweph-js` library is used for astrological calculations. It typically requires ephemeris data files (`.se1`).
    *   `sweph-js` might bundle these or attempt to download them.
    *   If you encounter issues, you may need to download them manually from [here](https://www.astro.com/ftp/swisseph/ephe/) (e.g., `swe_file_version_2.10.03-0.zip` or similar) and extract them to a known location.
    *   You might need to set the `SWEPH_PATH` environment variable in `.env.server` to point to the directory containing these files (e.g., `/path/to/your/ephemeris/files/`). Consult the `sweph-js` documentation for specifics.

5.  **Database Setup:**
    *   Ensure your PostgreSQL server is running.
    *   Update the `DATABASE_URL` in `.env.server` if you are not using Wasp's default local setup or a Railway add-on.
    *   Wasp will handle database migrations based on the schema in `main.wasp`.

6.  **Install Dependencies:**
    Wasp handles npm dependencies automatically when you run a Wasp command. If you need to force an install or add new ones, you can edit `main.wasp` or use `npm install` (though Wasp might overwrite `package-lock.json`).

7.  **Start the Application:**
    ```bash
    wasp start
    ```
    This will:
    *   Compile the project.
    *   Run database migrations (`wasp db migrate-dev`).
    *   Start the development server (backend usually on `http://localhost:3001`).
    *   Start the development client (frontend usually on `http://localhost:3000`).

8.  **Access the Application:**
    Open your browser and navigate to `http://localhost:3000`.

## Stripe Setup for Development

1.  **Install Stripe CLI:** [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
2.  **Login to Stripe CLI:** `stripe login`
3.  **Listen for Webhooks:**
    Forward webhook events to your local server. The webhook endpoint is defined in `main.wasp` (e.g., `/webhooks/stripe`).
    ```bash
    stripe listen --forward-to localhost:3001/webhooks/stripe
    ```
    The CLI will provide a webhook signing secret. Update `STRIPE_WEBHOOK_SECRET` in your `.env.server` with this value for local testing.
4.  **Create Products and Prices in Stripe Dashboard:**
    *   Log in to your Stripe Test Mode Dashboard.
    *   Create two products: "AstroInsight Basic" and "AstroInsight Premium".
    *   For each product, create a recurring Price. Note down the Price IDs.
    *   Update `STRIPE_BASIC_PLAN_PRICE_ID` and `STRIPE_PREMIUM_PLAN_PRICE_ID` in `.env.server` and in the frontend `PricingPlans.jsx` or constants file.

## Deployment

See `docs/deployment.md` for instructions on deploying the backend to Railway and the frontend to Netlify.

## Running Tests

*   **Unit Tests:** (Instructions for setting up Jest/Vitest with Wasp would go here if test files were generated)
    ```bash
    # Example: npm test
    ```
*   **Integration Tests:** (Instructions for Cypress/Playwright with Wasp would go here)

## Contributing

(Optional: Add contribution guidelines if this were an open-source project)

## License

(Specify your license, e.g., MIT, Proprietary)
```
