// project-deck-data.js
// Single source of truth for the project deck overlay.
// Add a new project by appending one object here — nothing else needs to change.

window.PROJECT_DECK_DATA = [
  {
    id: 'pcgo',
    image: 'admin_home_page.webp',
    imageWidth: 1919,
    imageHeight: 942,
    alt: 'Personal Cloud Gaming Orchestrator control plane UI',
    indexLabel: '01 / Featured',
    title: 'Personal Cloud Gaming Orchestrator',
    blurb: 'A self-hosted cloud gaming stack: a Python agent on the host talks to a FastAPI control plane, React on the front, JWT-secured WebSockets for live telemetry, and Sunshine + Tailscale for low-latency streaming.',
    learned: "Auth flows that don't lie, WebSocket lifecycle, why \"low latency\" is a system property, not a feature.",
    chips: ['React', 'FastAPI', 'Python', 'WebSockets', 'JWT', 'Sunshine', 'Tailscale'],
    githubUrl: 'https://github.com/Harsh-C-Hari/personal-cloud-gaming-orchestrator'
  },
  {
    id: 'prodash',
    image: 'image-prodash.webp',
    imageWidth: 1919,
    imageHeight: 936,
    alt: 'Productivity Dashboard',
    indexLabel: '02 / Featured',
    title: 'Productivity Dashboard',
    blurb: 'A full-stack project and study-management platform — 226 REST endpoints across 40 FastAPI routers, covering tasks, role-based permissions, bug tracking, and a knowledge base. Ships as an installable PWA with Web Push notifications (VAPID + service worker + a GitHub Actions cron job) so deadline alerts land even with the app closed.',
    learned: 'PWA install/offline quirks across browsers, OAuth token refresh without logging myself out mid-task, and how fast an "urgency score" turns into a design decision, not just a formula.',
    chips: ['React', 'TypeScript', 'FastAPI', 'SQLAlchemy', 'JWT', 'Tailwind', 'Web Push', 'Google OAuth'],
    githubUrl: 'https://github.com/Harsh-C-Hari/Productivity-Dashboard'
  },
  {
    id: 'cec',
    image: 'image-2.webp',
    imageWidth: 1919,
    imageHeight: 938,
    alt: 'Smart Campus Platform',
    indexLabel: '03 / Platform',
    title: 'Future of CEC',
    blurb: 'A Student Portal, admin dashboard, and Lift Access system built by a 4-person team and integrated into the CEC college website — Google auth restricted to institutional email, role-based access for students and lift operators, and an AI assistant (local Gemma via Ollama) for student queries.',
    learned: 'Designing role-based access that actually holds up under real users, and how much prompt design matters when you\'re serving a local model instead of a hosted API with guardrails already built in.',
    chips: ['PostgreSQL', 'Prisma', 'Express', 'FastAPI', 'JWT', 'Ollama', 'Gemma', 'Google OAuth'],
    githubUrl: 'https://github.com/Harsh-C-Hari/Minions--Future_of_CEC'
  },
  {
    id: 'farming',
    image: 'image-1.webp',
    imageWidth: 1280,
    imageHeight: 668,
    alt: 'Smart Farming Dashboard analytics view',
    indexLabel: '04 / Hackathon build',
    title: 'Smart Farming Dashboard',
    blurb: 'Built during a hackathon by a 3-person team: a dashboard visualizing simulated soil and weather sensor trends with Chart.js, backed by Firebase, with Google\'s Gemini API generating crop-care recommendations.',
    learned: 'How much a 24-hour clock changes your scoping instincts, and that a dashboard is only as trustworthy as its worst sensor reading.',
    chips: ['FastAPI', 'Chart.js', 'Python', 'Firebase', 'Gemini API'],
    githubUrl: 'https://github.com/Harsh-C-Hari/build-with-ai-chn-kokachiz'
  }
];
