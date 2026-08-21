export interface CareerStream {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface CareerRole {
  id: string;
  streamId: string;
  title: string;
  category: string;
  description: string;
  demandLevel: 'High' | 'Extremely High' | 'Moderate';
  keySkills: string[];
  status: 'published' | 'draft';
  fitReason?: string;
  matchType?: 'Strong match' | 'Worth exploring' | 'Alternative path';
}

export const CONSUMER_CAREER_STREAMS: CareerStream[] = [
  {
    id: 'cs_eng',
    title: 'Computer Science Engineering',
    description: 'Software development, AI, data science, cybersecurity & cloud systems.',
    iconName: 'Code',
  },
  {
    id: 'ece_eng',
    title: 'Electronics & Communication Engineering',
    description: 'Embedded systems, VLSI design, IoT, PCB & telecom systems.',
    iconName: 'Cpu',
  },
  {
    id: 'ee_eng',
    title: 'Electrical Engineering',
    description: 'Power systems, smart grids, control systems & automation.',
    iconName: 'Zap',
  },
  {
    id: 'mech_eng',
    title: 'Mechanical Engineering',
    description: 'CAD design, HVAC, manufacturing processes, FEA & robotics.',
    iconName: 'Cog',
  },
  {
    id: 'civil_eng',
    title: 'Civil Engineering',
    description: 'Structural engineering, BIM modelling, site management & urban planning.',
    iconName: 'Building',
  },
  {
    id: 'chem_eng',
    title: 'Chemical Engineering',
    description: 'Process engineering, plant operations, quality assurance & petrochemicals.',
    iconName: 'FlaskConical',
  },
  {
    id: 'biomed_eng',
    title: 'Biomedical Engineering',
    description: 'Medical device design, clinical instrumentation & biomechanics.',
    iconName: 'Activity',
  },
  {
    id: 'aero_eng',
    title: 'Aerospace Engineering',
    description: 'Aerodynamics, avionics systems, propulsion & flight testing.',
    iconName: 'Plane',
  },
  {
    id: 'enviro_eng',
    title: 'Environmental Engineering',
    description: 'Environmental impact assessment, water management & sustainability.',
    iconName: 'Leaf',
  },
  {
    id: 'industrial_eng',
    title: 'Industrial & Manufacturing Engineering',
    description: 'Process improvement, lean operations, supply chain & quality control.',
    iconName: 'Factory',
  },
  {
    id: 'petro_eng',
    title: 'Petroleum Engineering',
    description: 'Reservoir engineering, drilling operations & production technology.',
    iconName: 'Fuel',
  },
  {
    id: 'robotics_eng',
    title: 'Robotics & Automation Engineering',
    description: 'Robotics software, ROS systems, mechatronics & motion control.',
    iconName: 'Bot',
  },
  {
    id: 'materials_eng',
    title: 'Materials Science Engineering',
    description: 'Metallurgy, composites, polymers & structural materials analysis.',
    iconName: 'Layers',
  },
];

export const CONSUMER_CAREER_ROLES: CareerRole[] = [
  // Computer Science Engineering
  {
    id: 'junior_ml_engineer',
    streamId: 'cs_eng',
    title: 'Junior ML Engineer',
    category: 'AI & Data Science',
    description: 'Build, train, evaluate, and deploy machine learning and LLM models for real-world applications.',
    demandLevel: 'Extremely High',
    keySkills: ['Python', 'PyTorch / TensorFlow', 'Scikit-Learn', 'FastAPI', 'Docker', 'Git'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Matches strong analytical thinking and interest in building intelligent systems.',
  },
  {
    id: 'full_stack_dev_junior',
    streamId: 'cs_eng',
    title: 'Full Stack Developer (Junior)',
    category: 'Software Engineering',
    description: 'Develop responsive frontend interfaces and secure backend APIs for modern web applications.',
    demandLevel: 'High',
    keySkills: ['React & TypeScript', 'Node.js / Express', 'PostgreSQL / SQL', 'Tailwind CSS', 'REST APIs'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Great fit for students interested in end-to-end product development.',
  },
  {
    id: 'data_analyst_junior',
    streamId: 'cs_eng',
    title: 'Data Analyst',
    category: 'Analytics',
    description: 'Extract insights from complex databases using SQL, Python, and BI dashboards.',
    demandLevel: 'High',
    keySkills: ['SQL & Query Tuning', 'Python & Pandas', 'Power BI / Tableau', 'Statistics', 'Excel'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'Ideal for students who enjoy uncovering patterns and telling stories with data.',
  },
  {
    id: 'junior_data_engineer',
    streamId: 'cs_eng',
    title: 'Junior Data Engineer',
    category: 'Data Infrastructure',
    description: 'Construct reliable ETL pipelines and data warehouses for analytics teams.',
    demandLevel: 'Extremely High',
    keySkills: ['SQL', 'Python / PySpark', 'Airflow', 'PostgreSQL', 'Cloud Storage'],
    status: 'published',
    matchType: 'Alternative path',
    fitReason: 'Perfect for students passionate about backend data pipelines and infrastructure.',
  },
  {
    id: 'frontend_engineer_junior',
    streamId: 'cs_eng',
    title: 'Frontend Engineer',
    category: 'Web Engineering',
    description: 'Craft beautiful, high-performance web user interfaces with modern React frameworks.',
    demandLevel: 'High',
    keySkills: ['HTML/CSS/JS', 'React', 'TypeScript', 'Tailwind', 'Performance Optimization'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'Fits students with a strong visual eye and user experience focus.',
  },
  {
    id: 'soc_analyst_l1',
    streamId: 'cs_eng',
    title: 'SOC Analyst L1',
    category: 'Cybersecurity',
    description: 'Monitor enterprise security events, identify threats, and respond to cyber incidents.',
    demandLevel: 'High',
    keySkills: ['Network Security', 'Linux', 'SIEM Tools', 'Wireshark', 'Incident Response'],
    status: 'published',
    matchType: 'Alternative path',
    fitReason: 'Suited for students fascinated by threat defense and ethical security.',
  },
  {
    id: 'prompt_engineer_llm',
    streamId: 'cs_eng',
    title: 'Prompt Engineer / LLM Support',
    category: 'AI Applications',
    description: 'Optimize prompts, evaluate LLM outputs, and build AI agents for enterprise workflows.',
    demandLevel: 'High',
    keySkills: ['Prompt Design', 'Python', 'LangChain / LlamaIndex', 'Eval Benchmarks', 'JSON API'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'Fast-emerging role leveraging creative language and system prompt design.',
  },
  {
    id: 'rpa_developer',
    streamId: 'cs_eng',
    title: 'RPA Developer',
    category: 'Automation',
    description: 'Automate business workflows using robotic process automation platforms.',
    demandLevel: 'Moderate',
    keySkills: ['UiPath / Automation Anywhere', 'Python Scripting', 'SQL', 'Process Mapping'],
    status: 'published',
    matchType: 'Alternative path',
    fitReason: 'Great entry point for streamlining enterprise processes with low-code & script automation.',
  },
  {
    id: 'game_developer_junior',
    streamId: 'cs_eng',
    title: 'Game Developer',
    category: 'Interactive Media',
    description: 'Code gameplay mechanics, physics, and graphics shaders for 2D/3D games.',
    demandLevel: 'Moderate',
    keySkills: ['Unity / C#', 'Unreal / C++', 'Mathematics & 3D Vector Math', 'Physics Engines'],
    status: 'published',
    matchType: 'Alternative path',
    fitReason: 'Creative technical role for students obsessed with game engines and interactive logic.',
  },

  // Electronics & Communication Engineering
  {
    id: 'junior_hardware_engineer',
    streamId: 'ece_eng',
    title: 'Junior Hardware Engineer',
    category: 'Electronics',
    description: 'Design digital logic circuits, assist in schematic capture, and validate PCB prototypes.',
    demandLevel: 'High',
    keySkills: ['Schematic Capture', 'Microcontrollers', 'C/C++', 'Oscilloscopes', 'Digital Electronics'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Core ECE foundation combining circuit design with practical measurement tools.',
  },
  {
    id: 'embedded_systems_trainee',
    streamId: 'ece_eng',
    title: 'Embedded Systems Engineer Trainee',
    category: 'Embedded Engineering',
    description: 'Write low-level firmware for ARM microcontrollers, microprocessors, and RTOS environments.',
    demandLevel: 'Extremely High',
    keySkills: ['Embedded C', 'STM32 / ESP32', 'FreeRTOS', 'I2C/SPI/UART Protocols', 'GDB Debugging'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'High-demand bridge between hardware circuits and firmware software.',
  },
  {
    id: 'vlsi_design_trainee',
    streamId: 'ece_eng',
    title: 'VLSI Design Trainee',
    category: 'Semiconductor',
    description: 'Develop and verify RTL code for silicon microchips and integrated circuits.',
    demandLevel: 'Extremely High',
    keySkills: ['Verilog / SystemVerilog', 'RTL Design', 'Digital Logic', 'FPGA Prototyping', 'Static Timing Analysis'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'Pinnacle technical field for semiconductor fabrication and chip design.',
  },
  {
    id: 'pcb_design_engineer_trainee',
    streamId: 'ece_eng',
    title: 'PCB Design Engineer Trainee',
    category: 'Electronics Packaging',
    description: 'Layout high-speed multi-layer printed circuit boards and prepare fabrication Gerbers.',
    demandLevel: 'High',
    keySkills: ['KiCAD / Altium Designer', 'Signal Integrity', 'Component Selection', 'EMC Compliance'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'Hands-on hardware creation converting circuit schematics into physical hardware.',
  },
  {
    id: 'rf_telecom_engineer_trainee',
    streamId: 'ece_eng',
    title: 'RF / Telecom Engineer Trainee',
    category: 'Telecommunications',
    description: 'Optimize wireless networks, 5G signal propagation, and radio frequency hardware.',
    demandLevel: 'High',
    keySkills: ['5G/LTE Protocols', 'RF Circuits', 'Spectrum Analyzers', 'Antenna Design'],
    status: 'published',
    matchType: 'Alternative path',
    fitReason: 'Essential role in mobile infrastructure and wireless satellite comms.',
  },

  // Mechanical Engineering
  {
    id: 'graduate_engineer_trainee_mech',
    streamId: 'mech_eng',
    title: 'Graduate Engineer Trainee',
    category: 'Manufacturing & Operations',
    description: 'Learn plant operations, production line management, and mechanical quality control.',
    demandLevel: 'High',
    keySkills: ['Engineering Drawing', 'Manufacturing Processes', 'GD&T', 'Quality Audits', 'Safety Protocols'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Standard foundational entrance for Mechanical graduates entering core industries.',
  },
  {
    id: 'cad_design_engineer_mech',
    streamId: 'mech_eng',
    title: 'CAD Design Engineer',
    category: 'Mechanical Design',
    description: 'Create 3D parametric models and assembly drawings for industrial machinery and components.',
    demandLevel: 'High',
    keySkills: ['SolidWorks / Creo', 'GD&T', 'Material Selection', 'Assembly Modeling', 'Drafting Standards'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Pure mechanical creative role designing physical machinery and consumer hardware.',
  },
  {
    id: 'hvac_design_engineer',
    streamId: 'mech_eng',
    title: 'HVAC Design Engineer',
    category: 'Building Services',
    description: 'Design heating, ventilation, air conditioning, and energy systems for commercial facilities.',
    demandLevel: 'High',
    keySkills: ['Thermodynamics', 'AutoCAD', 'Heat Load Calculations', 'Piping Layout', 'Duct Design'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'High commercial demand in construction, infrastructure, and cleanrooms.',
  },
  {
    id: 'fea_cfd_simulation_trainee',
    streamId: 'mech_eng',
    title: 'FEA / CFD Simulation Trainee',
    category: 'Simulation Engineering',
    description: 'Perform finite element analysis and computational fluid dynamics to stress-test components.',
    demandLevel: 'Extremely High',
    keySkills: ['Ansys / Abaqus', 'Fluid Mechanics', 'Stress Analysis', 'Meshing', 'Heat Transfer'],
    status: 'published',
    matchType: 'Worth exploring',
    fitReason: 'High-end analytical engineering replacing physical prototype testing with virtual physics.',
  },

  // Civil Engineering
  {
    id: 'junior_site_engineer_civil',
    streamId: 'civil_eng',
    title: 'Junior Site Engineer',
    category: 'Construction Management',
    description: 'Supervise daily construction site activities, quality checks, and contractor coordination.',
    demandLevel: 'High',
    keySkills: ['Site Supervision', 'Concrete Technology', 'Bar Bending Schedules', 'Surveying', 'Safety Standards'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Frontline execution role bringing structural drawings into physical reality.',
  },
  {
    id: 'bim_modelling_trainee',
    streamId: 'civil_eng',
    title: 'BIM Modelling Trainee',
    category: 'Digital Construction',
    description: 'Create 3D Building Information Models (BIM) to coordinate architectural & structural elements.',
    demandLevel: 'Extremely High',
    keySkills: ['Autodesk Revit', 'Navisworks', 'AutoCAD', 'Clash Detection', '3D Spatial Coordination'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Fastest-growing tech-driven civil discipline in global infrastructure.',
  },

  // Electrical Engineering
  {
    id: 'electrical_systems_design_trainee',
    streamId: 'ee_eng',
    title: 'Electrical Systems Design Trainee',
    category: 'Power Engineering',
    description: 'Design single-line diagrams, electrical distribution panels, and building wiring layouts.',
    demandLevel: 'High',
    keySkills: ['AutoCAD Electrical', 'Single Line Diagrams (SLD)', 'Load Calculations', 'Transformer Sizing'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Foundational core electrical engineering role for commercial & industrial plants.',
  },
  {
    id: 'plc_scada_automation_trainee',
    streamId: 'ee_eng',
    title: 'PLC / SCADA Automation Trainee',
    category: 'Industrial Automation',
    description: 'Program industrial PLCs and SCADA systems for automated manufacturing assembly lines.',
    demandLevel: 'Extremely High',
    keySkills: ['Ladder Logic', 'Siemens / Allen Bradley PLCs', 'SCADA HMI', 'Industrial Sensors'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Bridges electrical power systems with software automation in Industry 4.0.',
  },

  // Robotics & Automation Engineering
  {
    id: 'robotics_software_engineer_trainee',
    streamId: 'robotics_eng',
    title: 'Robotics Software Engineer Trainee',
    category: 'Robotics Software',
    description: 'Implement autonomous robot navigation, kinematics, and computer vision algorithms.',
    demandLevel: 'Extremely High',
    keySkills: ['ROS / ROS2', 'C++ / Python', 'SLAM & Path Planning', 'Gazebo Simulation', 'OpenCV'],
    status: 'published',
    matchType: 'Strong match',
    fitReason: 'Cutting-edge role uniting autonomous software with physical robotic actuators.',
  },
];

export function getRolesByStreamId(streamId: string): CareerRole[] {
  const filtered = CONSUMER_CAREER_ROLES.filter((r) => r.streamId === streamId && r.status === 'published');
  if (filtered.length > 0) return filtered;
  // Fallback to Computer Science published roles if none match
  return CONSUMER_CAREER_ROLES.filter((r) => r.streamId === 'cs_eng');
}
