import { CareerRoleTarget, RoadmapWeek } from '../types';

export interface PathwisseSkill {
  id: string;
  name: string;
  category: string;
  stages: {
    stageName: string;
    description: string;
    outcome: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    topics: {
      topicName: string;
      description: string;
      outcome: string;
      type: 'Concept' | 'Project' | 'Practice' | 'Interview';
      estimatedMinutes: number;
      prerequisites?: string[];
      embeddedUrl?: string;
    }[];
  }[];
}

export const PATHWISSE_ROLES: CareerRoleTarget[] = [
  {
    id: 'ml_engineer',
    title: 'AI / ML Engineer',
    category: 'Artificial Intelligence',
    description: 'Design, train, fine-tune, and deploy production-grade machine learning models and LLM applications.',
    demandLevel: 'Extremely High',
    keySkills: ['Python', 'PyTorch / TensorFlow', 'Mathematics & Stats', 'FastAPI / Docker', 'Model Fine-tuning', 'MLOps']
  },
  {
    id: 'software_engineer',
    title: 'Full Stack Software Engineer',
    category: 'Software Development',
    description: 'Build scalable web platforms, APIs, microservices, and modern user interfaces.',
    demandLevel: 'High',
    keySkills: ['Data Structures & Algorithms', 'React & TypeScript', 'Node.js / Express', 'SQL & PostgreSQL', 'System Design']
  },
  {
    id: 'data_analyst',
    title: 'Data Analyst & BI Specialist',
    category: 'Analytics',
    description: 'Transform complex datasets into actionable business insights through SQL, Python, and BI dashboards.',
    demandLevel: 'High',
    keySkills: ['SQL & Query Optimization', 'Python & Pandas', 'Tableau / PowerBI', 'A/B Testing & Statistics', 'Data Storytelling']
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity Analyst',
    category: 'Security',
    description: 'Protect enterprise infrastructure, analyze security threats, execute penetration tests, and secure cloud apps.',
    demandLevel: 'High',
    keySkills: ['Network Protocols & Wireshark', 'Linux Administration', 'Penetration Testing', 'SIEM & SOC Operations', 'Cloud Security']
  },
  {
    id: 'devops_engineer',
    title: 'DevOps / Cloud Engineer',
    category: 'Infrastructure',
    description: 'Automate deployment pipelines, orchestrate containers, manage cloud infrastructure with Terraform.',
    demandLevel: 'Extremely High',
    keySkills: ['Docker & Kubernetes', 'CI/CD Pipelines', 'Linux & Shell Scripting', 'Terraform / IaC', 'AWS / GCP / Cloud Security']
  }
];

export const PATHWISSE_KNOWLEDGE_GRAPH: Record<string, PathwisseSkill[]> = {
  ml_engineer: [
    {
      id: 'math_stats',
      name: 'Mathematical Foundations for AI',
      category: 'Core Theory',
      stages: [
        {
          stageName: 'Stage 1: Linear Algebra & Calculus',
          description: 'Vector spaces, matrix decomposition, gradients, and optimization algorithms.',
          outcome: 'Master mathematical calculus behind gradient descent and loss optimization.',
          difficulty: 'Intermediate',
          topics: [
            {
              topicName: 'Vectors, Matrices & Eigenvalues',
              description: 'Understanding dimensionality reduction and matrix transformations.',
              outcome: 'Implement PCA from scratch in Python.',
              type: 'Concept',
              estimatedMinutes: 180
            },
            {
              topicName: 'Gradient Descent & Convex Optimization',
              description: 'How neural networks minimize loss functions.',
              outcome: 'Derive backpropagation mathematically.',
              type: 'Practice',
              estimatedMinutes: 240
            }
          ]
        }
      ]
    },
    {
      id: 'applied_ml',
      name: 'Applied Machine Learning & Models',
      category: 'ML Core',
      stages: [
        {
          stageName: 'Stage 2: Supervised & Unsupervised Learning',
          description: 'Regression, Decision Trees, Random Forests, XGBoost, and Clustering.',
          outcome: 'Build end-to-end ML prediction pipelines with cross-validation.',
          difficulty: 'Intermediate',
          topics: [
            {
              topicName: 'Scikit-Learn Pipeline Mastery',
              description: 'Feature engineering, scaling, categorical encoding, and hyperparameter tuning.',
              outcome: 'Train a churn prediction model with 92%+ F1 score.',
              type: 'Project',
              estimatedMinutes: 300
            }
          ]
        }
      ]
    },
    {
      id: 'mlops_deploy',
      name: 'Model Deployment & MLOps',
      category: 'Engineering',
      stages: [
        {
          stageName: 'Stage 3: Serving & Containerization',
          description: 'FastAPI microservices, Docker containers, ONNX runtime, and cloud deployment.',
          outcome: 'Serve an ML model via REST endpoint with <100ms latency.',
          difficulty: 'Advanced',
          topics: [
            {
              topicName: 'FastAPI + Docker ML Microservice',
              description: 'Package PyTorch inference code into a production container.',
              outcome: 'Deploy ML microservice to Cloud Run.',
              type: 'Project',
              estimatedMinutes: 360
            }
          ]
        }
      ]
    }
  ],

  software_engineer: [
    {
      id: 'dsa',
      name: 'Data Structures & Algorithms',
      category: 'Computer Science',
      stages: [
        {
          stageName: 'Stage 1: Core Problem Solving',
          description: 'Arrays, Trees, Graphs, Dynamic Programming, and Time Complexity.',
          outcome: 'Solve LeetCode Medium/Hard algorithmic challenges confidently.',
          difficulty: 'Intermediate',
          topics: [
            {
              topicName: 'Graph Traversal & BFS/DFS',
              description: 'Matrix representations, shortest path algorithms, and topological sorting.',
              outcome: 'Pass algorithmic technical screening questions.',
              type: 'Interview',
              estimatedMinutes: 240
            }
          ]
        }
      ]
    },
    {
      id: 'fullstack_web',
      name: 'Full Stack Systems & React',
      category: 'Web Engineering',
      stages: [
        {
          stageName: 'Stage 2: Modern Web Architecture',
          description: 'React, TypeScript, Express API development, and PostgreSQL query optimization.',
          outcome: 'Deliver complete, secure full-stack applications with state management.',
          difficulty: 'Intermediate',
          topics: [
            {
              topicName: 'RESTful API & Database Design',
              description: 'Relational schemas, ORM queries, JWT authentication, and middleware.',
              outcome: 'Architect a production API backend.',
              type: 'Project',
              estimatedMinutes: 320
            }
          ]
        }
      ]
    }
  ]
};

export function generateDefaultRoadmap(roleId: string, roleTitle: string): RoadmapWeek[] {
  if (roleId === 'ml_engineer') {
    return [
      {
        weekNumber: 1,
        title: 'Week 1: Mathematical Foundations & NumPy Math',
        focusArea: 'Linear Algebra & Statistics',
        estimatedHours: 8,
        topics: [
          {
            name: 'Vector Operations & Matrix Calculus',
            description: 'Master dot products, matrix multiplications, and partial derivatives.',
            learningOutcome: 'Implement vector operations from scratch in Python.',
            type: 'Concept'
          },
          {
            name: 'Exploratory Data Analysis with Pandas',
            description: 'Data cleaning, handling missing values, and statistical summary.',
            learningOutcome: 'Clean a noisy real-world dataset of 100k rows.',
            type: 'Practice'
          }
        ]
      },
      {
        weekNumber: 2,
        title: 'Week 2: Classical Machine Learning & Pipelines',
        focusArea: 'Scikit-Learn & Feature Engineering',
        estimatedHours: 10,
        topics: [
          {
            name: 'Supervised Learning Algorithms',
            description: 'Linear/Logistic Regression, Decision Trees, and Gradient Boosting.',
            learningOutcome: 'Train XGBoost classifier with cross-validation.',
            type: 'Concept'
          },
          {
            name: 'Feature Scaling & Model Evaluation',
            description: 'Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrix analysis.',
            learningOutcome: 'Build an automated evaluation pipeline.',
            type: 'Practice'
          }
        ]
      },
      {
        weekNumber: 3,
        title: 'Week 3: Deep Learning & PyTorch Essentials',
        focusArea: 'Neural Networks & PyTorch',
        estimatedHours: 12,
        topics: [
          {
            name: 'Multi-Layer Perceptrons & Backprop',
            description: 'Activation functions, loss functions, and optimization step.',
            learningOutcome: 'Train a custom PyTorch model on vision/text data.',
            type: 'Concept'
          },
          {
            name: 'Convolutional & Transformer Layers',
            description: 'Understanding attention mechanisms and feature extraction.',
            learningOutcome: 'Fine-tune a pretrained HuggingFace Transformer.',
            type: 'Project'
          }
        ]
      },
      {
        weekNumber: 4,
        title: 'Week 4: End-to-End Portfolio ML Project',
        focusArea: 'Applied ML Engineering',
        estimatedHours: 14,
        topics: [
          {
            name: 'Real-Time Prediction API with FastAPI',
            description: 'Expose ML model via asynchronous REST endpoints with input validation.',
            learningOutcome: 'Build lightweight REST API serving model predictions.',
            type: 'Project'
          },
          {
            name: 'Model Serialization & Optimization',
            description: 'Exporting PyTorch model to ONNX for fast inference.',
            learningOutcome: 'Achieve sub-50ms inference latency.',
            type: 'Practice'
          }
        ]
      },
      {
        weekNumber: 5,
        title: 'Week 5: MLOps, Containerization & Cloud Serving',
        focusArea: 'Docker & Cloud Deployment',
        estimatedHours: 10,
        topics: [
          {
            name: 'Dockerizing ML Microservices',
            description: 'Writing multi-stage Dockerfiles for Python ML environments.',
            learningOutcome: 'Create a reproducible 200MB Docker image.',
            type: 'Project'
          },
          {
            name: 'CI/CD Automated Testing for ML',
            description: 'GitHub Actions workflow to test model inference automatically.',
            learningOutcome: 'Deploy automated test workflow on push.',
            type: 'Practice'
          }
        ]
      },
      {
        weekNumber: 6,
        title: 'Week 6: ML Resume, System Design & Interview Prep',
        focusArea: 'Career Placement & Interviewing',
        estimatedHours: 8,
        topics: [
          {
            name: 'ML System Design Architecture',
            description: 'Designing scalable recommendation engines and search rankers.',
            learningOutcome: 'Draft system design diagrams for ML interview.',
            type: 'Interview'
          },
          {
            name: 'Technical Resume & GitHub Proof',
            description: 'Highlighting deployable project links and quantified results.',
            learningOutcome: 'Publish production GitHub repository with live API demo.',
            type: 'Interview'
          }
        ]
      }
    ];
  }

  // Fallback roadmap generator for other tech roles
  return [
    {
      weekNumber: 1,
      title: `Week 1: Core Fundamentals of ${roleTitle}`,
      focusArea: 'Foundational Knowledge',
      estimatedHours: 8,
      topics: [
        {
          name: 'Technical Concepts & Syntax',
          description: `Master key language constructs and architecture for ${roleTitle}.`,
          learningOutcome: 'Build strong theoretical and practical baseline.',
          type: 'Concept'
        }
      ]
    },
    {
      weekNumber: 2,
      title: 'Week 2: Advanced Concepts & Frameworks',
      focusArea: 'Frameworks & Tools',
      estimatedHours: 10,
      topics: [
        {
          name: 'Industry Standard Tools',
          description: 'Hands-on training with professional development toolchains.',
          learningOutcome: 'Build intermediate modules with clean code standards.',
          type: 'Practice'
        }
      ]
    },
    {
      weekNumber: 3,
      title: 'Week 3: Practical Implementation & APIs',
      focusArea: 'System Integration',
      estimatedHours: 12,
      topics: [
        {
          name: 'API Development & Data Management',
          description: 'Connecting backend databases and API protocols.',
          learningOutcome: 'Deliver data-driven functionality.',
          type: 'Project'
        }
      ]
    },
    {
      weekNumber: 4,
      title: 'Week 4: Portfolio Capstone Project',
      focusArea: 'Proof of Applied Work',
      estimatedHours: 14,
      topics: [
        {
          name: 'Production Capstone Build',
          description: 'Constructing a complete, deployed portfolio application.',
          learningOutcome: 'Publish live project with working link.',
          type: 'Project'
        }
      ]
    },
    {
      weekNumber: 5,
      title: 'Week 5: Code Quality & Optimization',
      focusArea: 'Testing & Performance',
      estimatedHours: 10,
      topics: [
        {
          name: 'Performance Profiling & Testing',
          description: 'Unit testing, security hardening, and performance tuning.',
          learningOutcome: 'Ensure production readiness.',
          type: 'Practice'
        }
      ]
    },
    {
      weekNumber: 6,
      title: 'Week 6: Placement, Resume & Mock Interview',
      focusArea: 'Career Launch',
      estimatedHours: 8,
      topics: [
        {
          name: 'Mock Interview & Resume Auditing',
          description: 'Polishing communication, technical storytelling, and resume keywords.',
          learningOutcome: 'Ready for placement drives and technical interviews.',
          type: 'Interview'
        }
      ]
    }
  ];
}
