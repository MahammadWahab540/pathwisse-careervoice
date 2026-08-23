export interface CareerStreamRecord {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  sort_order: number;
}

export interface CareerRoleRecord {
  id: string;
  stream_id: string;
  title: string;
  category: string;
  description: string;
  demand_level: 'High' | 'Extremely High' | 'Moderate';
  salary_min_lpa: number;
  salary_max_lpa: number;
  salary_range_display: string;
  key_skills: string[];
  match_type: 'Strong match' | 'Worth exploring' | 'Alternative path';
  fit_reason: string;
  status: 'published' | 'draft';
}

export interface RoleCompetencyRecord {
  role_id: string;
  minimum_readiness_benchmark: number;
  clarity_weight: number;
  technical_weight: number;
  project_weight: number;
  communication_weight: number;
  execution_weight: number;
  core_competencies: {
    skillName: string;
    category: 'Core Theory' | 'Applied Engineering' | 'Tools & Infrastructure' | 'Problem Solving';
    expectedLevel: 'Beginner' | 'Intermediate' | 'Advanced';
    description: string;
    weight: number;
  }[];
  roadmap_template: {
    weekNumber: number;
    title: string;
    focusArea: string;
    estimatedHours: number;
    topics: {
      name: string;
      description: string;
      learningOutcome: string;
      type: 'Concept' | 'Project' | 'Practice' | 'Interview';
    }[];
  }[];
}

export interface PricingPlanRecord {
  id: string;
  plan_name: string;
  price_inr: number;
  original_price_inr: number;
  badge: string;
  highlight: string;
  features: string[];
  cta_text: string;
  is_active: boolean;
}

export const SEED_CAREER_STREAMS: CareerStreamRecord[] = [
  {
    id: 'cs_eng',
    title: 'Computer Science Engineering',
    description: 'Software development, AI, data science, cybersecurity & cloud systems.',
    icon_name: 'Code',
    sort_order: 1,
  },
  {
    id: 'ece_eng',
    title: 'Electronics & Communication Engineering',
    description: 'Embedded systems, VLSI design, IoT, PCB & telecom systems.',
    icon_name: 'Cpu',
    sort_order: 2,
  },
  {
    id: 'ee_eng',
    title: 'Electrical Engineering',
    description: 'Power systems, smart grids, control systems & automation.',
    icon_name: 'Zap',
    sort_order: 3,
  },
  {
    id: 'mech_eng',
    title: 'Mechanical Engineering',
    description: 'CAD design, HVAC, manufacturing processes, FEA & robotics.',
    icon_name: 'Cog',
    sort_order: 4,
  },
  {
    id: 'civil_eng',
    title: 'Civil Engineering',
    description: 'Structural engineering, BIM modelling, site management & urban planning.',
    icon_name: 'Building',
    sort_order: 5,
  },
  {
    id: 'robotics_eng',
    title: 'Robotics & Automation Engineering',
    description: 'Robotics software, ROS systems, mechatronics & motion control.',
    icon_name: 'Bot',
    sort_order: 6,
  },
];

export const SEED_CAREER_ROLES: CareerRoleRecord[] = [
  {
    id: 'ml_engineer',
    stream_id: 'cs_eng',
    title: 'Junior ML Engineer',
    category: 'AI & Data Science',
    description: 'Build, train, evaluate, and deploy machine learning and LLM models for real-world applications.',
    demand_level: 'Extremely High',
    salary_min_lpa: 8.0,
    salary_max_lpa: 28.0,
    salary_range_display: '₹8L – ₹28L CTC',
    key_skills: ['Python', 'PyTorch / TensorFlow', 'FastAPI', 'Docker', 'MLOps'],
    match_type: 'Strong match',
    fit_reason: 'Matches strong analytical thinking and interest in building intelligent systems.',
    status: 'published',
  },
  {
    id: 'software_engineer',
    stream_id: 'cs_eng',
    title: 'Full Stack Developer (Junior)',
    category: 'Software Engineering',
    description: 'Develop responsive frontend interfaces and secure backend APIs for modern web applications.',
    demand_level: 'High',
    salary_min_lpa: 6.0,
    salary_max_lpa: 22.0,
    salary_range_display: '₹6L – ₹22L CTC',
    key_skills: ['React & TypeScript', 'Node.js / Express', 'PostgreSQL / SQL', 'Tailwind CSS', 'System Design'],
    match_type: 'Strong match',
    fit_reason: 'Great fit for students interested in end-to-end product development.',
    status: 'published',
  },
  {
    id: 'data_analyst',
    stream_id: 'cs_eng',
    title: 'Data Analyst',
    category: 'Analytics',
    description: 'Extract insights from complex databases using SQL, Python, and BI dashboards.',
    demand_level: 'High',
    salary_min_lpa: 4.5,
    salary_max_lpa: 14.0,
    salary_range_display: '₹4.5L – ₹14L CTC',
    key_skills: ['SQL & Query Tuning', 'Python & Pandas', 'Power BI / Tableau', 'Statistics'],
    match_type: 'Worth exploring',
    fit_reason: 'Ideal for students who enjoy uncovering patterns and telling stories with data.',
    status: 'published',
  },
  {
    id: 'devops_engineer',
    stream_id: 'cs_eng',
    title: 'DevOps & Cloud Engineer',
    category: 'Cloud Infrastructure',
    description: 'Orchestrate CI/CD pipelines, containerize microservices, and manage automated cloud deployments.',
    demand_level: 'Extremely High',
    salary_min_lpa: 6.0,
    salary_max_lpa: 18.0,
    salary_range_display: '₹6L – ₹18L CTC',
    key_skills: ['Docker & Kubernetes', 'Linux & Bash', 'GitHub Actions CI/CD', 'AWS / Cloud Run', 'Terraform'],
    match_type: 'Strong match',
    fit_reason: 'Excellent for students fascinated by scalable infrastructure and developer productivity.',
    status: 'published',
  },
  {
    id: 'cybersecurity',
    stream_id: 'cs_eng',
    title: 'Cyber Security Analyst',
    category: 'Information Security',
    description: 'Protect enterprise applications, perform vulnerability audits, and monitor network security threats.',
    demand_level: 'High',
    salary_min_lpa: 5.0,
    salary_max_lpa: 15.0,
    salary_range_display: '₹5L – ₹15L CTC',
    key_skills: ['Network Protocols (TCP/IP)', 'Linux Security', 'Wireshark', 'OWASP Top 10', 'Penetration Testing'],
    match_type: 'Worth exploring',
    fit_reason: 'Suited for students keen on digital defense and ethical hacking.',
    status: 'published',
  },
  {
    id: 'embedded_iot_engineer',
    stream_id: 'ece_eng',
    title: 'Embedded Systems & IoT Engineer',
    category: 'Hardware & Embedded',
    description: 'Program microcontrollers, interface sensors, and build connected embedded firmware devices.',
    demand_level: 'High',
    salary_min_lpa: 5.0,
    salary_max_lpa: 16.0,
    salary_range_display: '₹5L – ₹16L CTC',
    key_skills: ['Embedded C / C++', 'STM32 / ESP32', 'UART / SPI / I2C Protocols', 'FreeRTOS', 'PCB Debugging'],
    match_type: 'Strong match',
    fit_reason: 'Matches passion for writing low-level code that interfaces directly with physical hardware.',
    status: 'published',
  },
  {
    id: 'vlsi_design_engineer',
    stream_id: 'ece_eng',
    title: 'VLSI Design & Verification Engineer',
    category: 'Semiconductor & VLSI',
    description: 'Design digital logic, write RTL architectures in Verilog/SystemVerilog, and verify ASIC/FPGA chip designs.',
    demand_level: 'Extremely High',
    salary_min_lpa: 8.0,
    salary_max_lpa: 30.0,
    salary_range_display: '₹8L – ₹30L CTC',
    key_skills: ['Verilog / SystemVerilog', 'RTL Design & Synthesis', 'UVM Verification', 'FPGA Prototyping', 'Static Timing Analysis'],
    match_type: 'Strong match',
    fit_reason: 'Core track for ECE students targeting top semiconductor and chip design firms.',
    status: 'published',
  },
  {
    id: 'firmware_engineer',
    stream_id: 'ece_eng',
    title: 'Firmware & Device Driver Engineer',
    category: 'Hardware & Embedded',
    description: 'Develop low-level board support packages (BSP), Linux kernel device drivers, and real-time firmware for ARM processors.',
    demand_level: 'High',
    salary_min_lpa: 6.0,
    salary_max_lpa: 22.0,
    salary_range_display: '₹6L – ₹22L CTC',
    key_skills: ['C / Modern C++', 'ARM Cortex Architecture', 'Linux Device Drivers', 'FreeRTOS / RTOS', 'CAN / SPI / I2C Buses'],
    match_type: 'Strong match',
    fit_reason: 'Ideal for engineers who enjoy low-level programming and board bring-up.',
    status: 'published',
  },
  {
    id: 'hardware_pcb_engineer',
    stream_id: 'ece_eng',
    title: 'Hardware & PCB Design Engineer',
    category: 'Hardware & Electronics',
    description: 'Create multi-layer schematics, route high-speed PCBs, analyze signal integrity, and build electronic prototypes.',
    demand_level: 'Moderate',
    salary_min_lpa: 4.5,
    salary_max_lpa: 15.0,
    salary_range_display: '₹4.5L – ₹15L CTC',
    key_skills: ['Altium Designer / KiCad', 'Schematic Capture & Layout', 'Power Electronics', 'Signal Integrity', 'Lab Testing & Oscilloscopes'],
    match_type: 'Worth exploring',
    fit_reason: 'Great fit for hands-on electronics circuit design and hardware validation.',
    status: 'published',
  },
  {
    id: 'robotics_automation_engineer',
    stream_id: 'ece_eng',
    title: 'Robotics & Control Systems Engineer',
    category: 'Robotics & Automation',
    description: 'Design autonomous robotic controllers, sensor fusion pipelines, and motion actuation algorithms.',
    demand_level: 'High',
    salary_min_lpa: 6.0,
    salary_max_lpa: 20.0,
    salary_range_display: '₹6L – ₹20L CTC',
    key_skills: ['ROS / ROS2', 'Python & C++', 'Motor Controllers & Actuators', 'Sensor Fusion (IMU/LiDAR)', 'Control Theory / PID'],
    match_type: 'Worth exploring',
    fit_reason: 'Interdisciplinary track blending electronics, sensor interfacing, and autonomous software.',
    status: 'published',
  },
];

export const SEED_ROLE_COMPETENCIES: RoleCompetencyRecord[] = [
  {
    role_id: 'ml_engineer',
    minimum_readiness_benchmark: 75,
    clarity_weight: 0.10,
    technical_weight: 0.35,
    project_weight: 0.25,
    communication_weight: 0.15,
    execution_weight: 0.15,
    core_competencies: [
      {
        skillName: 'Mathematical & Algorithmic Foundations',
        category: 'Core Theory',
        expectedLevel: 'Intermediate',
        description: 'Linear algebra, calculus for backprop, probability distributions, loss function formulation.',
        weight: 0.25,
      },
      {
        skillName: 'Applied Deep Learning & PyTorch',
        category: 'Applied Engineering',
        expectedLevel: 'Intermediate',
        description: 'Building, debugging, and fine-tuning neural networks, CNNs, Transformers, and embeddings.',
        weight: 0.30,
      },
      {
        skillName: 'Production API & Deployment (FastAPI/Docker)',
        category: 'Tools & Infrastructure',
        expectedLevel: 'Intermediate',
        description: 'Serving model inference via asynchronous APIs, containerization, and memory optimization.',
        weight: 0.25,
      },
      {
        skillName: 'Data Pipeline & Feature Engineering',
        category: 'Applied Engineering',
        expectedLevel: 'Intermediate',
        description: 'Cleaning messy real-world datasets, batching, vector search, and model evaluation metrics.',
        weight: 0.20,
      },
    ],
    roadmap_template: [
      {
        weekNumber: 1,
        title: 'Week 1: Core Mathematical Foundations & NumPy Rigor',
        focusArea: 'Matrix calculus, custom gradient descent, vectorized operations',
        estimatedHours: 12,
        topics: [
          {
            name: 'Vector & Matrix Operations from Scratch',
            description: 'Implement core linear algebra routines without high-level shortcuts.',
            learningOutcome: 'Deep intuition of tensor transformations and loss backprop math.',
            type: 'Practice',
          },
          {
            name: 'Custom Loss Functions & Optimization',
            description: 'Derive Cross-Entropy and MSE loss functions and optimize with SGD.',
            learningOutcome: 'Ability to explain exact backpropagation derivatives in technical interviews.',
            type: 'Concept',
          },
        ],
      },
      {
        weekNumber: 2,
        title: 'Week 2: Deep Learning Architecture & PyTorch Mastery',
        focusArea: 'PyTorch modules, custom Datasets/DataLoaders, training loops',
        estimatedHours: 14,
        topics: [
          {
            name: 'Custom PyTorch Neural Classifier',
            description: 'Build a multi-layer deep network with learning rate schedulers and early stopping.',
            learningOutcome: 'Production-clean training script with TensorBoard/W&B tracking.',
            type: 'Project',
          },
        ],
      },
      {
        weekNumber: 3,
        title: 'Week 3: LLMs, Fine-Tuning & Embeddings',
        focusArea: 'HuggingFace Transformers, RAG vector pipelines, quantized models',
        estimatedHours: 15,
        topics: [
          {
            name: 'Retrieval Augmented Generation (RAG) System',
            description: 'Build a production document search and QA agent using ChromaDB and Gemini API.',
            learningOutcome: 'Demonstrable live portfolio project solving domain document QA.',
            type: 'Project',
          },
        ],
      },
      {
        weekNumber: 4,
        title: 'Week 4: Containerization & Cloud Deployment',
        focusArea: 'FastAPI async inference endpoint, Dockerfile optimization, Cloud Run hosting',
        estimatedHours: 12,
        topics: [
          {
            name: 'Deploy Live Inference Microservice',
            description: 'Containerize the model into a multi-stage Docker build and deploy to a live URL.',
            learningOutcome: 'Publicly verifiable live URL and GitHub badge for your resume.',
            type: 'Project',
          },
        ],
      },
      {
        weekNumber: 5,
        title: 'Week 5: System Design & Technical Defense',
        focusArea: 'Latency profiling, batching, caching, cold-start mitigation',
        estimatedHours: 10,
        topics: [
          {
            name: 'ML System Design Mock Interview',
            description: 'Practice architecting large-scale recommendation or real-time classification systems.',
            learningOutcome: 'High confidence defending architectural trade-offs to senior interviewers.',
            type: 'Interview',
          },
        ],
      },
      {
        weekNumber: 6,
        title: 'Week 6: Resume & GitHub Proof-of-Work Finalization',
        focusArea: 'Production READMEs, benchmark charts, automated GitHub CI checks',
        estimatedHours: 10,
        topics: [
          {
            name: 'Portfolio Audit & Placement Outreach',
            description: 'Polish repository with clean architecture diagrams, API specs, and live demo links.',
            learningOutcome: 'Verified hireable GitHub footprint and placement-ready resume.',
            type: 'Interview',
          },
        ],
      },
    ],
  },
  {
    role_id: 'software_engineer',
    minimum_readiness_benchmark: 75,
    clarity_weight: 0.10,
    technical_weight: 0.35,
    project_weight: 0.25,
    communication_weight: 0.15,
    execution_weight: 0.15,
    core_competencies: [
      {
        skillName: 'Data Structures & Algorithmic Problem Solving',
        category: 'Core Theory',
        expectedLevel: 'Intermediate',
        description: 'Arrays, Hash Tables, Trees, Graphs, Dynamic Programming, and Big-O trade-offs.',
        weight: 0.30,
      },
      {
        skillName: 'Full-Stack Architecture & REST/GraphQL APIs',
        category: 'Applied Engineering',
        expectedLevel: 'Intermediate',
        description: 'TypeScript, Node.js/Express, relational schema design, auth (JWT/OAuth), middleware.',
        weight: 0.30,
      },
      {
        skillName: 'Database Design & SQL Optimization',
        category: 'Applied Engineering',
        expectedLevel: 'Intermediate',
        description: 'Relational normalization, indexing, transactions (ACID), connection pooling.',
        weight: 0.20,
      },
      {
        skillName: 'Testing, Git Rigor & CI/CD',
        category: 'Tools & Infrastructure',
        expectedLevel: 'Intermediate',
        description: 'Unit/integration testing, branch workflows, containerized Docker deployments.',
        weight: 0.20,
      },
    ],
    roadmap_template: [
      {
        weekNumber: 1,
        title: 'Week 1: Algorithmic Rigor & Data Structures Sprint',
        focusArea: 'Arrays, Two-pointer techniques, Hash maps, Big-O analysis',
        estimatedHours: 12,
        topics: [
          {
            name: 'High-Frequency Pattern Mastery',
            description: 'Solve top 25 medium interview patterns with time and space complexity proofs.',
            learningOutcome: 'Fast pattern recognition for coding round assessments.',
            type: 'Practice',
          },
        ],
      },
      {
        weekNumber: 2,
        title: 'Week 2: Backend Architecture & Relational Modeling',
        focusArea: 'Express/Fastify, PostgreSQL schemas, ACID transactions, JWT Auth',
        estimatedHours: 14,
        topics: [
          {
            name: 'Production Auth & RBAC Microservice',
            description: 'Build a secure multi-tenant authentication service with rate limiting and refresh tokens.',
            learningOutcome: 'Clean, security-hardened backend portfolio asset.',
            type: 'Project',
          },
        ],
      },
      {
        weekNumber: 3,
        title: 'Week 3: Scalable Frontend with React & State Engines',
        focusArea: 'React 18+, TypeScript strict mode, Tailwind CSS, optimistic UI updates',
        estimatedHours: 14,
        topics: [
          {
            name: 'Interactive Full-Stack Web Application',
            description: 'Develop responsive client with caching, error boundaries, and accessible components.',
            learningOutcome: 'Polished user interface connected to your backend API.',
            type: 'Project',
          },
        ],
      },
      {
        weekNumber: 4,
        title: 'Week 4: Database Indexing, Caching & Performance',
        focusArea: 'EXPLAIN ANALYZE query plans, Redis caching, pagination at scale',
        estimatedHours: 12,
        topics: [
          {
            name: 'High-Throughput API Benchmark',
            description: 'Optimize queries and implement Redis layer to achieve sub-50ms p99 latency.',
            learningOutcome: 'Quantitative performance metrics for your resume.',
            type: 'Project',
          },
        ],
      },
      {
        weekNumber: 5,
        title: 'Week 5: System Design & Microservice Integration',
        focusArea: 'Load balancers, message queues (Kafka/RabbitMQ), horizontal scaling',
        estimatedHours: 12,
        topics: [
          {
            name: 'System Design Interview Simulation',
            description: 'Design a distributed rate limiter and URL shortener under high concurrent load.',
            learningOutcome: 'Ability to lead architectural conversations with engineering leads.',
            type: 'Interview',
          },
        ],
      },
      {
        weekNumber: 6,
        title: 'Week 6: Deployment, CI/CD & Portfolio Showcase',
        focusArea: 'Docker multi-stage builds, GitHub Actions CI/CD, live deployment',
        estimatedHours: 10,
        topics: [
          {
            name: 'End-to-End Live Launch & Tech Defense',
            description: 'Deploy full platform with automated test suite and live health-check probes.',
            learningOutcome: 'Live working project link and verified proof of work.',
            type: 'Interview',
          },
        ],
      },
    ],
  },
];

export const SEED_PRICING_PLANS: PricingPlanRecord[] = [
  {
    id: 'pathwisse_pro',
    plan_name: 'Pathwisse Pro Accelerator',
    price_inr: 1499,
    original_price_inr: 4999,
    badge: 'Audit Scholar Grant',
    highlight: 'Turn your diagnostic scores into proven production code and verified resume credentials.',
    features: [
      '6-Week Guided Milestone Curriculum & Code Labs',
      '1-on-1 Qalam AI Career Audit Deep Dive & Code Review',
      'Live Resume & System Design Reviews with Senior Engineers',
      'Direct Referral Pipeline to Top Tech Companies',
      '24/7 Dedicated WhatsApp Mentor Support',
    ],
    cta_text: 'Unlock Pro',
    is_active: true,
  },
];
