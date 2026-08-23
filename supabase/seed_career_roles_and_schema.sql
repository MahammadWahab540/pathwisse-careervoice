-- ==============================================================================
-- Pathwisse CareerVoice: Complete Schema & Canonical Roles Seed
-- Project Ref: pfzjbazocmgflcogjjrg
-- ==============================================================================

create extension if not exists "pgcrypto";

-- 1. Career Streams Table
create table if not exists public.career_streams (
    id text primary key,
    code text unique,
    name text not null,
    description text,
    icon_name text default 'Code',
    sort_order integer default 1,
    status text default 'published',
    created_at timestamptz default now()
);

-- 2. Career Roles Table
create table if not exists public.career_roles (
    id text primary key,
    stream_id text references public.career_streams(id) on delete set null,
    slug text,
    title text not null,
    category text not null,
    description text,
    demand_level text default 'High',
    salary_min_lpa numeric default 6.0,
    salary_max_lpa numeric default 20.0,
    salary_range_display text default '₹6L – ₹20L CTC',
    match_type text default 'Strong match',
    fit_reason text,
    status text default 'published',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Role Skills Table
create table if not exists public.role_skills (
    id uuid primary key default gen_random_uuid(),
    role_id text references public.career_roles(id) on delete cascade,
    skill_name text not null,
    is_primary boolean default true,
    importance_weight numeric default 20.0,
    created_at timestamptz default now()
);

-- 4. Role Competencies Table
create table if not exists public.role_competencies (
    id uuid primary key default gen_random_uuid(),
    role_id text unique references public.career_roles(id) on delete cascade,
    minimum_readiness_benchmark numeric default 70.0,
    clarity_weight numeric default 0.10,
    technical_weight numeric default 0.30,
    project_weight numeric default 0.20,
    communication_weight numeric default 0.15,
    placement_weight numeric default 0.10,
    execution_weight numeric default 0.15,
    core_competencies jsonb default '[]'::jsonb,
    roadmap_template jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. Audit Sessions & Evidence Tables
create table if not exists public.audit_sessions (
    id text primary key,
    user_id text,
    target_role_id text references public.career_roles(id) on delete set null,
    status text default 'in_progress',
    readiness_score numeric,
    readiness_status text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.audit_messages (
    id uuid primary key default gen_random_uuid(),
    session_id text references public.audit_sessions(id) on delete cascade,
    sender text not null,
    content text not null,
    qalam_state text,
    turn_index integer,
    created_at timestamptz default now()
);

create table if not exists public.audit_evidence (
    id uuid primary key default gen_random_uuid(),
    session_id text references public.audit_sessions(id) on delete cascade,
    storage_path text,
    source_message_id uuid references public.audit_messages(id) on delete set null,
    raw_text text,
    evidence_strength text default 'Moderate',
    source text default 'voice_probe',
    claimed_level text,
    created_at timestamptz default now()
);

create table if not exists public.audit_skill_signals (
    id uuid primary key default gen_random_uuid(),
    session_id text references public.audit_sessions(id) on delete cascade,
    skill_name text not null,
    evidence_id uuid references public.audit_evidence(id) on delete set null,
    claimed_level text,
    extracted_level text,
    confidence_score numeric,
    evidence_strength text,
    raw_answer_snippet text,
    source text default 'voice_probe',
    contract_version text default 'v1',
    created_at timestamptz default now()
);

create table if not exists public.audit_skill_scores (
    id uuid primary key default gen_random_uuid(),
    session_id text references public.audit_sessions(id) on delete cascade,
    skill_id text,
    skill_name text not null,
    demonstrated_score numeric not null,
    signal_ids jsonb default '[]'::jsonb,
    evidence_ids jsonb default '[]'::jsonb,
    created_at timestamptz default now()
);

create table if not exists public.audit_skill_gaps (
    id uuid primary key default gen_random_uuid(),
    session_id text references public.audit_sessions(id) on delete cascade,
    skill_id text,
    skill_name text not null,
    expected_score numeric not null,
    demonstrated_score numeric not null,
    gap numeric not null,
    priority text not null,
    created_at timestamptz default now()
);

-- 6. Analytics Events Table
create table if not exists public.analytics_events (
    id uuid primary key default gen_random_uuid(),
    user_id text,
    audit_session_id text,
    event_name text not null,
    event_time timestamptz default now(),
    source text default 'pathwisse_qalam',
    properties jsonb default '{}'::jsonb
);

-- ==============================================================================
-- SEED DATA: Career Streams
-- ==============================================================================
insert into public.career_streams (id, code, name, description, icon_name, sort_order, status)
values
    ('cs_eng', 'cs_eng', 'Computer Science Engineering', 'Software development, AI, data science, cybersecurity & cloud systems.', 'Code', 1, 'published'),
    ('ece_eng', 'ece_eng', 'Electronics & Communication Engineering', 'Embedded systems, VLSI design, IoT, PCB & telecom systems.', 'Cpu', 2, 'published'),
    ('ee_eng', 'ee_eng', 'Electrical Engineering', 'Power systems, smart grids, control systems & automation.', 'Zap', 3, 'published'),
    ('mech_eng', 'mech_eng', 'Mechanical Engineering', 'CAD design, HVAC, manufacturing processes, FEA & robotics.', 'Cog', 4, 'published'),
    ('civil_eng', 'civil_eng', 'Civil Engineering', 'Structural engineering, BIM modelling, site management & urban planning.', 'Building', 5, 'published'),
    ('robotics_eng', 'robotics_eng', 'Robotics & Automation Engineering', 'Robotics software, ROS systems, mechatronics & motion control.', 'Bot', 6, 'published')
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    icon_name = excluded.icon_name,
    sort_order = excluded.sort_order,
    status = excluded.status;

-- ==============================================================================
-- SEED DATA: Career Roles (CSE & ECE Tracks)
-- ==============================================================================
insert into public.career_roles (id, stream_id, slug, title, category, description, demand_level, salary_min_lpa, salary_max_lpa, salary_range_display, match_type, fit_reason, status)
values
    -- CSE Roles
    ('software_engineer', 'cs_eng', 'software-engineer', 'Full Stack Developer (Junior)', 'Software Engineering', 'Develop responsive frontend interfaces and secure backend APIs for modern web applications.', 'High', 6.0, 22.0, '₹6L – ₹22L CTC', 'Strong match', 'Great fit for students interested in end-to-end product development.', 'published'),
    ('ml_engineer', 'cs_eng', 'ml-engineer', 'Junior ML Engineer', 'AI & Data Science', 'Build, train, evaluate, and deploy machine learning and LLM models for real-world applications.', 'Extremely High', 8.0, 28.0, '₹8L – ₹28L CTC', 'Strong match', 'Matches strong analytical thinking and interest in building intelligent systems.', 'published'),
    ('devops_engineer', 'cs_eng', 'devops-engineer', 'DevOps & Cloud Engineer', 'Cloud Infrastructure', 'Orchestrate CI/CD pipelines, containerize microservices, and manage automated cloud deployments.', 'Extremely High', 6.0, 18.0, '₹6L – ₹18L CTC', 'Strong match', 'Excellent for students fascinated by scalable infrastructure and developer productivity.', 'published'),
    ('data_analyst', 'cs_eng', 'data-analyst', 'Data Analyst', 'Analytics', 'Extract insights from complex databases using SQL, Python, and BI dashboards.', 'High', 4.5, 14.0, '₹4.5L – ₹14L CTC', 'Worth exploring', 'Ideal for students who enjoy uncovering patterns and telling stories with data.', 'published'),
    ('cybersecurity', 'cs_eng', 'cybersecurity', 'Cyber Security Analyst', 'Information Security', 'Protect enterprise applications, perform vulnerability audits, and monitor network security threats.', 'High', 5.0, 15.0, '₹5L – ₹15L CTC', 'Worth exploring', 'Suited for students keen on digital defense and ethical hacking.', 'published'),
    
    -- ECE Roles
    ('embedded_iot_engineer', 'ece_eng', 'embedded-iot-engineer', 'Embedded Systems & IoT Engineer', 'Hardware & Embedded', 'Program microcontrollers, interface sensors, and build connected embedded firmware devices.', 'High', 5.0, 16.0, '₹5L – ₹16L CTC', 'Strong match', 'Matches passion for writing low-level code that interfaces directly with physical hardware.', 'published'),
    ('vlsi_design_engineer', 'ece_eng', 'vlsi-design-engineer', 'VLSI Design & Verification Engineer', 'Semiconductor & VLSI', 'Design digital logic, write RTL architectures in Verilog/SystemVerilog, and verify ASIC/FPGA chip designs.', 'Extremely High', 8.0, 30.0, '₹8L – ₹30L CTC', 'Strong match', 'Core track for ECE students targeting top semiconductor and chip design firms.', 'published'),
    ('firmware_engineer', 'ece_eng', 'firmware-engineer', 'Firmware & Device Driver Engineer', 'Hardware & Embedded', 'Develop low-level board support packages (BSP), Linux kernel device drivers, and real-time firmware for ARM processors.', 'High', 6.0, 22.0, '₹6L – ₹22L CTC', 'Strong match', 'Ideal for engineers who enjoy low-level programming and board bring-up.', 'published'),
    ('hardware_pcb_engineer', 'ece_eng', 'hardware-pcb-engineer', 'Hardware & PCB Design Engineer', 'Hardware & Electronics', 'Create multi-layer schematics, route high-speed PCBs, analyze signal integrity, and build electronic prototypes.', 'Moderate', 4.5, 15.0, '₹4.5L – ₹15L CTC', 'Worth exploring', 'Great fit for hands-on electronics circuit design and hardware validation.', 'published'),
    ('robotics_automation_engineer', 'ece_eng', 'robotics-automation-engineer', 'Robotics & Control Systems Engineer', 'Robotics & Automation', 'Design autonomous robotic controllers, sensor fusion pipelines, and motion actuation algorithms.', 'High', 6.0, 20.0, '₹6L – ₹20L CTC', 'Worth exploring', 'Interdisciplinary track blending electronics, sensor interfacing, and autonomous software.', 'published')
on conflict (id) do update set
    stream_id = excluded.stream_id,
    title = excluded.title,
    category = excluded.category,
    description = excluded.description,
    demand_level = excluded.demand_level,
    salary_range_display = excluded.salary_range_display,
    status = excluded.status;

-- ==============================================================================
-- SEED DATA: Role Skills
-- ==============================================================================
delete from public.role_skills;

insert into public.role_skills (role_id, skill_name, is_primary, importance_weight)
values
    -- Full Stack
    ('software_engineer', 'React & TypeScript', true, 25),
    ('software_engineer', 'Node.js / Express', true, 25),
    ('software_engineer', 'PostgreSQL / SQL', true, 20),
    ('software_engineer', 'REST APIs', true, 15),
    ('software_engineer', 'System Architecture & Git', true, 15),

    -- ML Engineer
    ('ml_engineer', 'Python', true, 25),
    ('ml_engineer', 'PyTorch / TensorFlow', true, 25),
    ('ml_engineer', 'FastAPI & Model Serving', true, 20),
    ('ml_engineer', 'Docker', true, 15),
    ('ml_engineer', 'MLOps & Evaluation', true, 15),

    -- Embedded & IoT
    ('embedded_iot_engineer', 'Embedded C / C++', true, 25),
    ('embedded_iot_engineer', 'STM32 / ESP32 Microcontrollers', true, 25),
    ('embedded_iot_engineer', 'UART / SPI / I2C Protocols', true, 20),
    ('embedded_iot_engineer', 'FreeRTOS', true, 15),
    ('embedded_iot_engineer', 'PCB Debugging & Hardware Tools', true, 15),

    -- VLSI
    ('vlsi_design_engineer', 'Verilog / SystemVerilog', true, 30),
    ('vlsi_design_engineer', 'RTL Design & Synthesis', true, 25),
    ('vlsi_design_engineer', 'UVM Verification', true, 20),
    ('vlsi_design_engineer', 'FPGA Prototyping', true, 15),
    ('vlsi_design_engineer', 'Static Timing Analysis', true, 10),

    -- Firmware
    ('firmware_engineer', 'C / Modern C++', true, 30),
    ('firmware_engineer', 'ARM Cortex Architecture', true, 25),
    ('firmware_engineer', 'Linux Device Drivers', true, 20),
    ('firmware_engineer', 'FreeRTOS / RTOS', true, 15),
    ('firmware_engineer', 'CAN / SPI / I2C Buses', true, 10);
