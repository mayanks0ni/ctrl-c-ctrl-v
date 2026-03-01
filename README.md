# Ctrl-C Ctrl-V

### Turning Doomscrolling into Deep Learning

Ctrl-C Ctrl-V is a micro-learning web application that transforms
endless scrolling into structured, engaging, and trackable learning
sessions. Instead of passive content consumption, users receive
AI-generated educational feeds, quizzes, engagement tracking, and
session summaries.

Built with **Next.js**, **TypeScript**, and modern AI integrations, the
platform blends social media interaction patterns with productive study
mechanics.

------------------------------------------------------------------------

## Core Idea

Take the addictive mechanics of short-form scrolling and repurpose them
for:

-   Micro-lessons\
-   Instant quizzes\
-   Focus tracking\
-   Engagement analytics\
-   Personalized learning feeds

It feels like scrolling.\
It behaves like studying.

------------------------------------------------------------------------

## Tech Stack

-   **Frontend:** Next.js (App Router), TypeScript\
-   **Styling:** Tailwind CSS\
-   **Authentication & Backend:** Firebase\
-   **AI Integration:** Gemini API\
-   **Vector Search:** Pinecone\
-   **Linting:** ESLint

------------------------------------------------------------------------

## Project Structure

    src/
     ├── app/                 → Next.js app router pages & API routes
     │   ├── api/             → Backend endpoints
     │   ├── feed/            → Micro-learning feed UI
     │   ├── quizzes/         → Quiz interface
     │   ├── upload/          → Document & timetable uploads
     │   ├── profile/         → User analytics & EduWrapped
     │   └── forum/           → Community interaction
     │
     ├── components/          → Reusable UI components
     │   ├── feed/
     │   ├── navigation/
     │   ├── profile/
     │   └── timetable/
     │
     ├── contexts/            → Auth context
     ├── hooks/               → Custom hooks (engagement, auth guards)
     └── lib/                 → AI clients, Firebase config, Pinecone setup

------------------------------------------------------------------------

## Features

### AI-Generated Learning Feed

-   Personalized micro-lessons
-   Infinite scroll experience
-   Smart content generation via Gemini
-   Vector-backed relevance using Pinecone

### Embedded Quizzes

-   Short quizzes after learning segments
-   Engagement-based tracking
-   Performance-aware progression

### Engagement Tracking

-   Scroll tracking
-   Interaction analytics
-   Session monitoring
-   Focus interruption detection

### Session Summary

-   AI-generated study recap
-   Learning highlights
-   Performance breakdown

### EduWrapped

-   A "Spotify Wrapped" for learning
-   Visual study insights
-   Engagement statistics
-   Focus trends

### Timetable Analysis

-   Upload timetable
-   AI-driven schedule analysis
-   Focus optimization recommendations

------------------------------------------------------------------------

## API Routes

Located under:

    src/app/api/

Includes:

-   `generate-feed` → Creates personalized feed content\
-   `process-document` → Handles uploaded study materials\
-   `quiz-engagement` → Tracks quiz interactions\
-   `track-engagement` → Logs user activity\
-   `summarize-session` → Generates AI study recap\
-   `analyze-timetable` → Timetable analysis endpoint

------------------------------------------------------------------------

## Getting Started

### 1. Clone the repository

``` bash
git clone <repo-url>
cd ctrl-c-ctrl-v
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file and configure:

    NEXT_PUBLIC_FIREBASE_API_KEY=
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=
    GEMINI_API_KEY=
    PINECONE_API_KEY=

### 4. Run the development server

``` bash
npm run dev
```

Visit:

    http://localhost:3000

------------------------------------------------------------------------

## How It Works (High-Level)

1.  User logs in (Firebase Auth)
2.  AI generates personalized micro-lessons
3.  Feed renders content in scrollable format
4.  Engagement is tracked continuously
5.  Quizzes reinforce learning
6.  Session summary and analytics are generated

------------------------------------------------------------------------

## Intended Impact

This platform is designed to:

-   Reduce passive scrolling
-   Increase retention through micro-learning
-   Provide measurable productivity metrics
-   Encourage consistent study habits

------------------------------------------------------------------------

## Future Improvements

-   Adaptive difficulty engine\
-   Collaborative study rooms\
-   Streak mechanics & gamification\
-   Offline micro-lessons\
-   Mobile-first performance optimization

------------------------------------------------------------------------

## Contributors

-   Mayank Soni\
-   Anmol Mishra\
-   Sanyam Rana\
-   Mehul Kale

------------------------------------------------------------------------

## License

This project is currently intended for academic / experimental use.\
Add a license file if planning public distribution.
