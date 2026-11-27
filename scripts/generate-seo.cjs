const fs = require('fs');
const path = require('path');

// Determine the target site URL at build time
const rawSiteUrl =
  process.env.VITE_SITE_URL ||
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://learnify-ten-olive.vercel.app';
const SITE_URL = rawSiteUrl.replace(/\/$/, '');

console.log(`[SEO Generator] Using SITE_URL: ${SITE_URL}`);

// Static public routes with their page contents and metadata
const staticRoutes = [
  {
    path: "",
    title: "Learnify | Free AI Quiz Maker & Interactive Chemistry Lab Online",
    description: "Discover Learnify, the ultimate free AI quiz maker and virtual science lab platform. Conduct realistic organic chemistry labs online, simulate physics practical experiments, study interactive flashcards, and enjoy peer-to-peer STEM mentoring.",
    h1: "Free AI Quiz Maker & Virtual Chemistry Lab",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 class="text-[40px] sm:text-[65px] md:text-[100px] leading-[0.9] font-[900] tracking-tighter mb-4 text-foreground">Unlock Your <br/><span class="text-[#f4b400]">Potential</span></h1>
        <h2 class="text-[35px] sm:text-[55px] md:text-[90px] leading-none text-foreground font-[800] tracking-tighter mb-10 opacity-90">with Learnify</h2>
        <p class="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
          Learnify is the ultimate ecosystem for interactive mastery. Engineered for deep-learning retention and high-frequency engagement.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <a href="/login" class="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm">Initialize Journey</a>
          <a href="/about-us" class="px-8 py-4 rounded-xl border-2 border-border text-foreground font-black uppercase tracking-widest text-sm">About Us</a>
        </div>
      </div>
    `,
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Learnify",
      "url": `${SITE_URL}/`,
      "description": "Smart Virtual Science Labs & Free AI Quiz Maker Platform featuring interactive chemistry labs online, virtual experiment simulations, exam generators, and study planners.",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "All",
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      },
      "creator": {
        "@type": "Organization",
        "name": "Learnify",
        "url": `${SITE_URL}/`
      },
      "featureList": [
        "Interactive Chemistry Lab Online and Physics Simulator",
        "Free AI Quiz Maker & Exam Question Generator",
        "AI-powered Science Practical Explainer",
        "Peer-to-Peer STEM Mentoring Network",
        "Durable Cloud Progress Sync"
      ]
    },
    priority: "1.0"
  },
  {
    path: "free-quiz-maker",
    title: "Free Quiz Maker - Build Interactive Quizzes | Learnify",
    description: "Create highly interactive and custom quizzes with Learnify's free quiz maker. Build automated multiple-choice tests, export results, and track progress.",
    h1: "Design Perfect Tests Instantly with our Free Quiz Maker",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Design Perfect Tests Instantly with our <span class="text-[#f4b400]">Free Quiz Maker</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          The Learnify free quiz maker enables educators, students, and lifelong learners to construct, run, and analyze multiple-choice evaluations seamlessly. Build knowledge retention and ace your classes.
        </p>
        <h2 class="text-2xl font-black uppercase tracking-tight text-foreground mt-10 mb-4">What is the Learnify Free Quiz Maker?</h2>
        <p class="text-muted-foreground leading-relaxed mb-4">
          The Learnify free quiz maker is a high-frequency, responsive testing suite engineered specifically to maximize educational recall. It allows anyone to input learning materials and output structural multiple-choice tests, complete with detailed scientific rationales.
        </p>
        <h3 class="text-xl font-bold uppercase mt-8 mb-3">Who is This Free Testing Solution For?</h3>
        <ul class="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Empowered Students:</strong> Use active recall flashcards and testing sheets to build spatial and logical intuition.</li>
          <li><strong>STEM Instructors & Mentors:</strong> Teachers save dozens of hours by instantly drafting structured homework sheets and weekly pop quizzes.</li>
          <li><strong>Lifelong Learners:</strong> Professionals verifying technical certifications or upskilling use this engine to benchmark their theoretical retention.</li>
        </ul>
      </div>
    `,
    schema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is this quiz maker completely free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Learnify provides a completely free quiz maker to help students test their knowledge and mentors generate robust multiple-choice assessments without any licensing fees."
          }
        },
        {
          "@type": "Question",
          "name": "Can I import my own lecture notes or PDF textbooks to generate quizzes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Absolutely. By logging in and using our advanced AI Quiz Maker, you can upload documents, text prompts, or select specific curricula topics to generate diagnostic exams instantly."
          }
        }
      ]
    },
    priority: "0.9"
  },
  {
    path: "ai-quiz-maker",
    title: "AI Quiz Maker - Generate Smart Assessments | Learnify",
    description: "Generate high-yield quizzes and multiple choice questions from any text using our advanced AI Quiz Maker. Perfect for teachers, students, and exam prep.",
    h1: "Generate Smart Exams with our AI Quiz Maker",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Generate Smart Exams with our <span class="text-[#f4b400]">AI Quiz Maker</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Learnify's advanced AI quiz maker utilizes cutting-edge artificial intelligence to transform your textbooks, lecture notes, and PDFs into customized, rigorous multiple-choice questions (MCQs) and detailed diagnostic explanations.
        </p>
        <h2 class="text-2xl font-black uppercase tracking-tight mt-10 mb-4">How does the AI Quiz Maker work?</h2>
        <p class="text-muted-foreground leading-relaxed mb-4">
          Simply paste your lecture notes or upload your curriculum files. Our model analyzes the core academic metrics, identifies key definition criteria, and constructs balanced assessments complete with highly challenging distractor options and detailed scientific step-by-step solutions.
        </p>
      </div>
    `,
    priority: "0.9"
  },
  {
    path: "ai-explainer",
    title: "AI Science Practical Explainer & Study Helper | Learnify",
    description: "Get step-by-step scientific explanations and practical lab walk-throughs with our AI Science Explainer.",
    h1: "AI Science Practical Explainer & Study Helper",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">AI Science Practical <span class="text-[#f4b400]">Explainer</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Need help understanding a complex science lab, chemical equation, or physics concept? Our AI Science Explainer breaks down complex theories, experimental procedures, and equations into clear, bite-sized visual steps.
        </p>
      </div>
    `,
    priority: "0.8"
  },
  {
    path: "test-generator",
    title: "Custom Paper Builder & Exam Test Generator | Learnify",
    description: "Design custom test papers, exams, and assessments with our flexible Test Generator. Export high-quality exam sheets with answer keys.",
    h1: "Custom Paper Builder & Exam Test Generator",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Custom Paper Builder & <span class="text-[#f4b400]">Exam Test Generator</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Build customized exam papers and practice tests using our advanced template generator. Select specific subject curricula, difficulty levels, and question styles to generate high-yield exam papers with corresponding answer keys.
        </p>
      </div>
    `,
    priority: "0.8"
  },
  {
    path: "flashcards",
    title: "Interactive Spaced Repetition Flashcards | Learnify",
    description: "Accelerate your active recall study sessions with our Leitner-system interactive flashcards. Boost memory retention for physics, chemistry, and biology.",
    h1: "Active Recall Flashcards & Spaced Repetition",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Active Recall Flashcards & <span class="text-[#f4b400]">Spaced Repetition</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Master complex definitions, organic reactions, and scientific formulas with our high-retentive flashcard deck system. Built on the Leitner spaced-repetition science, our deck manager schedules cards automatically to maximize your memory retrieval.
        </p>
      </div>
    `,
    priority: "0.8"
  },
  {
    path: "chemistry-lab",
    title: "Chemistry Lab Online - Virtual Interactive Simulator | Learnify",
    description: "Conduct realistic chemistry experiments in our virtual chemistry lab online. Simulate reactions, titration, and molecular bonds safely.",
    h1: "Interactive Chemistry Lab Online & Simulation Sandbox",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Interactive Chemistry Lab <span class="text-[#f4b400]">Online Simulator</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Discover the periodic table, simulate explosive chemical reactions, perform precise acid-base titrations, and observe valence shell covalent bonds in a completely safe, browser-based online chemistry lab simulator.
        </p>
      </div>
    `,
    priority: "0.9"
  },
  {
    path: "physics-lab",
    title: "Physics Lab Online - Kinematics & Mechanics Simulator | Learnify",
    description: "Explore gravity, friction, drag, and projectile motion in our 2D interactive virtual physics lab simulator.",
    h1: "Interactive Physics Lab Online & Vector Simulator",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Interactive Physics Lab <span class="text-[#f4b400]">Online Simulator</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Visualize forces, acceleration vectors, and parabolic trajectories. Adjust mass, gravity, launch velocity, and wind resistance to see kinematics formulas in action on our responsive canvas simulator.
        </p>
      </div>
    `,
    priority: "0.9"
  },
  {
    path: "anatomy-3d",
    title: "3D Living Anatomy Lab - 103 Interactive Biology Models | Learnify",
    description: "Explore 103 interactive 3D anatomy models of the human body, specialized organs, mammals, birds, reptiles, marine life, insects, plants, and cells inside Learnify's Biology Lab.",
    h1: "3D Living Anatomy Lab & Biology Dissection Simulator",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">3D Living <span class="text-[#f4b400]">Anatomy Lab</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Inspect 103 interactive 3D anatomical models of human organs, animals, plants, insects, marine organisms, and microorganisms with clickable parts, X-ray cutaway views, and exploded layers.
        </p>
      </div>
    `,
    priority: "0.9"
  },
  {
    path: "stem-mentoring",
    title: "STEM Peer Mentoring & Academic Network | Learnify",
    description: "Connect with verified mentors and peer study groups for chemistry, physics, biology, and computer science on Learnify.",
    h1: "STEM Mentoring & Peer-to-Peer Study Network",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">STEM Mentoring & Peer-to-Peer <span class="text-[#f4b400]">Study Network</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Join a thriving community of students and expert educators. Share study guides, ask tough homework questions, coordinate collaborative reviews, and level up your scientific and technical performance with direct expert mentoring.
        </p>
      </div>
    `,
    priority: "0.8"
  },
  {
    path: "about-us",
    title: "About Learnify - Smart Educational Science Platform",
    description: "Learn about the mission, pedagogy panel, and educational philosophy behind the Learnify AI quiz maker and virtual science labs.",
    h1: "About Learnify: Empowering STEM Education",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">About <span class="text-[#f4b400]">Learnify</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Learnify was founded to democratize elite STEM training and active-recall studying. We combine interactive science simulations, automated quiz generators, and community-driven mentoring to build an accessible, high-performance learning ecosystem.
        </p>
      </div>
    `,
    priority: "0.7"
  },
  {
    path: "contact-us",
    title: "Contact Learnify - STEM Support & Feedback",
    description: "Get in touch with the Learnify academic panel and support team. Send us your feedback, inquiries, or support tickets.",
    h1: "Contact Our STEM Academic Panel",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Contact Our <span class="text-[#f4b400]">STEM Academic Panel</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Have questions about our virtual labs, enterprise packages for schools, or technical support? Reach out to our dedicated support team and educational advisors. We are here to help you optimize your school curriculum.
        </p>
      </div>
    `,
    priority: "0.7"
  },
  {
    path: "privacy-policy",
    title: "Privacy Policy | Learnify",
    description: "Read the Learnify Privacy Policy to understand how we secure and protect your student progress data, profile details, and account security.",
    h1: "Learnify Privacy Policy",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Learnify <span class="text-[#f4b400]">Privacy Policy</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          At Learnify, student and user privacy is our highest priority. This policy outlines how we handle, process, and secure your cloud-synchronized progress, achievements, and account details in accordance with general data protection standards.
        </p>
      </div>
    `,
    priority: "0.5"
  },
  {
    path: "terms-of-service",
    title: "Terms of Service | Learnify",
    description: "Review the Learnify Terms of Service outlining the code of conduct, academic integrity guidelines, and usage terms for our virtual science labs.",
    h1: "Learnify Terms of Service",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Learnify <span class="text-[#f4b400]">Terms of Service</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          By using the Learnify platform, virtual laboratories, and AI-powered quiz generators, you agree to our terms of service, user code of conduct, and academic integrity policies designed to foster a safe, supportive, and effective learning environment.
        </p>
      </div>
    `,
    priority: "0.5"
  },
  {
    path: "blog",
    title: "Learnify Blog - Study Science, Active Recall & STEM Guides",
    description: "Read original STEM articles, chemistry guides, physics tutorials, and active recall studies on the official Learnify learning blog.",
    h1: "The Learnify Academic Blog",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">The Learnify <span class="text-[#f4b400]">Academic Blog</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Discover original educational research, spaced repetition studies, STEM tutorial guides, and lab walk-throughs written by our pedagogy panel.
        </p>
      </div>
    `,
    priority: "0.8"
  },
  {
    path: "login",
    title: "Login to Learnify - Access Virtual Labs & Quiz Dashboard",
    description: "Log in to your Learnify account to access your personalized dashboard, track study points, complete interactive courses, and contact mentors.",
    h1: "Login to Learnify",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Login to <span class="text-[#f4b400]">Learnify</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Access your personalized STEM learning dashboard. Sync your progress, manage reminders, view verified courses, and resume active recall training on Learnify.
        </p>
      </div>
    `,
    priority: "0.6"
  },
  {
    path: "registration",
    title: "Register for Learnify - Start Learning Science & Building Quizzes",
    description: "Create your free Learnify account today. Choose your role as Student or Mentor, choose your topics of interest, and start your STEM learning journey.",
    h1: "Join the Learnify Learning Platform",
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-6">Join the <span class="text-[#f4b400]">Learnify Learning Platform</span></h1>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">
          Create your free account on Learnify today to start tracking study progress, earning achievements, accessing organic chemistry or physics simulations, and generating AI-powered assessments.
        </p>
      </div>
    `,
    priority: "0.6"
  }
];

// Blog articles data
const blogArticles = [
  {
    slug: "how-to-study-for-a-chemistry-exam",
    title: "How to Study for a Chemistry Exam: The Definitive STEM Guide",
    description: "Master stoichiometry, balancing molecular equations, and thermodynamics with our evidence-backed chemistry study protocol."
  },
  {
    slug: "active-recall-vs-passive-rereading",
    title: "Active Recall vs. Passive Rereading: The Science of High-Retentive Study",
    description: "Discover why active recall and spaced retrieval outperform passive studying, and how to configure your study decks to maximize retention."
  },
  {
    slug: "how-ai-quiz-generators-work",
    title: "How AI Quiz Generators Work: Under the Hood of Generative Pedagogy",
    description: "An inside look at natural language processing, LLM prompting, and how algorithms extract high-integrity assessments from textbook PDFs."
  },
  {
    slug: "how-to-model-newtonian-motion-virtually",
    title: "How to Model Newtonian Motion Virtually: Transforming Physics Theory Into Vector Graphics",
    description: "Learn the mathematics behind 2D projectile simulators and how canvas-based physics engines calculate gravitational parabolas."
  },
  {
    slug: "overcoming-stem-learning-anxiety",
    title: "Overcoming STEM Learning Anxiety: A Pedagogical Playbook for Mentors",
    description: "Practical advice for tutors and students on dismantling academic anxiety, building spatial intuition, and pacing difficult courses."
  },
  {
    slug: "spaced-repetition-leitner-system-neuroscience",
    title: "The Neuroscience of Spaced Repetition: How Your Brain Retains Complex Data",
    description: "How synaptic plasticity and the Ebbinghaus forgetting curve dictate the optimal intervals for flashcard study sessions."
  },
  {
    slug: "acid-base-titrations-visual-manual",
    title: "Understanding Acid-Base Titrations: A Visual, Intuitive Guide for STEM Students",
    description: "Master equivalence points, phenolphthalein shifts, and stoichiometric calculations without stepping foot in a wet lab."
  },
  {
    slug: "why-homeschooling-cooperatives-are-adopting-virtual-labs",
    title: "Why Homeschooling Cooperatives are Adopting Virtual Labs",
    description: "How online simulation sandboxes provide high schoolers with elite laboratory training without the chemical risks and high costs."
  },
  {
    slug: "the-leitner-system-spaced-repetition-history",
    title: "The Leitner System: A Century of Spaced Repetition History",
    description: "How German science journalist Sebastian Leitner revolutionized study efficiency using simple index cards and cardboard boxes."
  },
  {
    slug: "how-to-optimize-physics-tests-pacing",
    title: "How to Optimize Your Physics Test Pacing: Lessons from STEM Advisors",
    description: "A breakdown of time management, dimensional analysis, and algebraic verification for acing mechanical exams."
  }
];

// Combine static routes and blog detail routes
const allRoutes = [...staticRoutes];
blogArticles.forEach(article => {
  allRoutes.push({
    path: `blog/${article.slug}`,
    title: `${article.title} | Learnify Academic Blog`,
    description: article.description,
    h1: article.title,
    body: `
      <div class="max-w-4xl mx-auto py-12 px-4">
        <h1 class="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground mb-4">${article.title}</h1>
        <p class="text-sm text-muted-foreground uppercase tracking-widest font-black mb-8">Learnify Academic Publications</p>
        <p class="text-lg text-muted-foreground leading-relaxed mb-6">${article.description}</p>
        <p class="text-muted-foreground leading-relaxed">
          Read the complete scientific research guide and active-recall analysis in the interactive Learnify dashboard. Login to practice and test your STEM proficiency under exam simulated pacing metrics.
        </p>
      </div>
    `,
    priority: "0.7"
  });
});

// Paths to verify
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.error('[SEO Generator] Error: "dist" folder does not exist! Run "vite build" first.');
  process.exit(1);
}

const templatePath = path.join(distDir, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('[SEO Generator] Error: "dist/index.html" template not found.');
  process.exit(1);
}

const rawTemplate = fs.readFileSync(templatePath, 'utf8');

// Function to clean / substitute elements in HTML
function generatePrerenderedHtml(route) {
  const fullUrl = `${SITE_URL}/${route.path}`;
  
  let html = rawTemplate;

  // 1. Strip any default hardcoded JSON-LD schema scripts
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

  // 2. Replace title tag
  html = html.replace(/<title>[\s\S]*?<\/title>/gi, `<title>${route.title}</title>`);

  // 3. Replace meta description
  html = html.replace(/<meta name="description" content="[\s\S]*?" \/>/gi, `<meta name="description" content="${route.description}" />`);

  // 4. Replace canonical URL link
  html = html.replace(/<link rel="canonical" href="[\s\S]*?" \/>/gi, `<link rel="canonical" href="${fullUrl}" />`);

  // 5. Replace OG metadata
  html = html.replace(/<meta property="og:title" content="[\s\S]*?" \/>/gi, `<meta property="og:title" content="${route.title}" />`);
  html = html.replace(/<meta property="og:description" content="[\s\S]*?" \/>/gi, `<meta property="og:description" content="${route.description}" />`);
  html = html.replace(/<meta property="og:url" content="[\s\S]*?" \/>/gi, `<meta property="og:url" content="${fullUrl}" />`);

  // 6. Replace Twitter metadata
  html = html.replace(/<meta name="twitter:title" content="[\s\S]*?" \/>/gi, `<meta name="twitter:title" content="${route.title}" />`);
  html = html.replace(/<meta name="twitter:description" content="[\s\S]*?" \/>/gi, `<meta name="twitter:description" content="${route.description}" />`);

  // 7. Inject Custom JSON-LD Schema
  let schemaScript = '';
  if (route.schema) {
    schemaScript = `\n    <script type="application/ld+json">\n      ${JSON.stringify(route.schema, null, 2).replace(/\n/g, '\n      ')}\n    </script>`;
  } else {
    // Default dynamic WebPage schema for other subpages
    const defaultSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": route.title,
      "description": route.description,
      "url": fullUrl,
      "publisher": {
        "@type": "Organization",
        "name": "Learnify",
        "logo": "https://lh3.googleusercontent.com/d/1mjlHJVtQeSVVmtFMkFwLLCs_ZRMfaOrf"
      }
    };
    schemaScript = `\n    <script type="application/ld+json">\n      ${JSON.stringify(defaultSchema, null, 2).replace(/\n/g, '\n      ')}\n    </script>`;
  }
  
  // Inject the new JSON-LD schema right before </head>
  html = html.replace('</head>', `${schemaScript}\n  </head>`);

  // 8. Pre-render body content inside <div id="root"></div> for crawlers
  const prerenderedBody = `
    <header class="border-b border-border bg-card py-4 px-6 flex justify-between items-center">
      <a href="/" class="text-xl font-black uppercase text-foreground tracking-widest flex items-center gap-2">
        <span class="text-primary">LEARNIFY</span>
      </a>
      <nav class="hidden md:flex gap-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <a href="/free-quiz-maker" class="hover:text-primary">Quiz Maker</a>
        <a href="/chemistry-lab" class="hover:text-primary">Chemistry Lab</a>
        <a href="/physics-lab" class="hover:text-primary">Physics Lab</a>
        <a href="/blog" class="hover:text-primary">Blog</a>
      </nav>
      <a href="/login" class="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest">Sign In</a>
    </header>

    <main class="flex-1 bg-muted/5 min-h-[60vh] py-12">
      ${route.body}
    </main>

    <footer class="border-t border-border bg-card py-10 px-6 text-center text-xs text-muted-foreground">
      <p class="mb-4 font-bold uppercase tracking-widest">&copy; 2026 LEARNIFY. ALL RIGHTS RESERVED.</p>
      <div class="flex justify-center gap-6 font-semibold uppercase tracking-wider mb-4">
        <a href="/privacy-policy" class="hover:text-primary">Privacy Policy</a>
        <a href="/terms-of-service" class="hover:text-primary">Terms of Service</a>
        <a href="/contact-us" class="hover:text-primary">Contact</a>
      </div>
    </footer>
  `;

  html = html.replace('<div id="root"></div>', `<div id="root">${prerenderedBody}</div>`);

  return html;
}

// Write pre-rendered pages to directories
allRoutes.forEach(route => {
  if (route.path === "") {
    // Root route gets written directly to dist/index.html
    const rootHtml = generatePrerenderedHtml(route);
    fs.writeFileSync(templatePath, rootHtml, 'utf8');
    console.log(`[SEO Generator] Pre-rendered root index.html successfully`);
  } else {
    // Sub-routes get written to dist/path/index.html
    const routeDir = path.join(distDir, route.path);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    const routeHtml = generatePrerenderedHtml(route);
    fs.writeFileSync(path.join(routeDir, 'index.html'), routeHtml, 'utf8');
    console.log(`[SEO Generator] Pre-rendered /${route.path}/index.html successfully`);
  }
});

// 9. Generate robots.txt inside dist directory
const robotsTxtContent = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxtContent, 'utf8');
console.log(`[SEO Generator] Generated robots.txt successfully`);

// 10. Generate sitemap.xml inside dist directory
const today = new Date().toISOString().split('T')[0];
let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/v0.9">
`;

allRoutes.forEach(route => {
  const urlPath = route.path ? `/${route.path}` : '/';
  sitemapContent += `  <url>
    <loc>${SITE_URL}${urlPath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.priority || '0.8'}</priority>
  </url>\n`;
});

sitemapContent += `</urlset>`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent, 'utf8');
console.log(`[SEO Generator] Generated sitemap.xml successfully`);
