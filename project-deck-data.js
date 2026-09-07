// project-deck-data.js
// Single source of truth for the project deck overlay.
// Add a new project by appending one object here — nothing else needs to change.

window.PROJECT_DECK_DATA = [
  {
    id: 'pcgo',
    image: 'admin_home_page.png',
    imageWidth: 1919,
    imageHeight: 942,
    alt: 'Personal Cloud Gaming Orchestrator control plane UI',
    indexLabel: '01 / Featured',
    title: 'Personal Cloud Gaming Orchestrator',
    blurb: 'A self-hosted cloud gaming stack: a Python agent on the host talks to a FastAPI control plane, React on the front, JWT-secured WebSockets for live telemetry, and Sunshine + Tailscale for low-latency streaming.',
    chips: ['React', 'FastAPI', 'Python', 'WebSockets', 'JWT', 'Sunshine', 'Tailscale'],
    githubUrl: 'https://github.com/Harsh-C-Hari/personal-cloud-gaming-orchestrator'
  },
  {
    id: 'prodash',
    image: 'image-prodash.png',
    imageWidth: 1919,
    imageHeight: 936,
    alt: 'Productivity Dashboard',
    indexLabel: '02 / Featured',
    title: 'Productivity Dashboard',
    blurb: 'Progressive Web App for tracking college and software project work: tasks, deadlines, a weekly timetable, and automatic urgency scoring — built to be installed on your phone or desktop and used every day.',
    chips: ['React', 'FastAPI', 'Python', 'WebSockets', 'JWT', 'Vite', 'Google OAuth'],
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
    blurb: 'A campus platform for the College of Engineering Chengannur community — Google auth, role-based access for students and lift operators, and an integrated AI assistant (local Gemma via Ollama) for student queries.',
    chips: ['PostgreSQL', 'Prisma', 'Express', 'FastAPI', 'Ollama', 'Gemma', 'Google OAuth'],
    githubUrl: 'https://github.com/Harsh-C-Hari/Minions--Future_of_CEC'
  },
  {
    id: 'farming',
    image: 'image-1.png',
    imageWidth: 1280,
    imageHeight: 668,
    alt: 'Smart Farming Dashboard analytics view',
    indexLabel: '04 / Hackathon build',
    title: 'Smart Farming Dashboard',
    blurb: 'Built during a hackathon: a dashboard that ingests soil and weather sensor data, surfaces trends with Chart.js, and uses an AI agronomy layer to suggest next actions.',
    chips: ['FastAPI', 'Chart.js', 'Python', 'Sensors', 'AI Agronomy'],
    githubUrl: 'https://github.com/Harsh-C-Hari/build-with-ai-chn-kokachiz'
  }
];
