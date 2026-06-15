# 🏭 Industrial Quality Inspection System

An AI-powered industrial automation platform developed as an academic team project to demonstrate the integration of Computer Vision, Industrial Automation, Robotics, and Real-Time Monitoring within a smart manufacturing environment.

The system automates quality inspection workflows by utilizing a YOLOv8-based computer vision model to classify products, communicate inspection results to industrial hardware through ESP32 controllers, and visualize production activities through a centralized monitoring dashboard.

The project simulates how modern Industry 4.0 environments can leverage Artificial Intelligence and automation technologies to improve quality assurance processes, reduce manual inspection efforts, and increase operational visibility.

---

## 🎯 Project Objectives

The primary objective of this project is to explore the practical implementation of Artificial Intelligence within industrial production workflows.

Key goals include:

- Automating quality inspection processes using Computer Vision.
- Reducing dependency on manual product inspection.
- Integrating AI decision-making with industrial hardware.
- Developing a centralized production monitoring system.
- Demonstrating Industry 4.0 concepts through an end-to-end workflow.

---

## ✨ Key Features

### 🤖 AI-Powered Product Inspection

- YOLOv8-based object detection and classification.
- Real-time product quality assessment.
- Confidence score evaluation.
- Automated defect identification.
- Continuous inspection pipeline.

### 📹 Real-Time Vision System

- Live camera integration.
- MJPEG streaming support.
- Frame-by-frame processing.
- Real-time visual feedback.
- Detection result visualization.

### ⚙ Industrial Automation Integration

- Conveyor system control.
- ESP32 communication layer.
- Hardware command transmission.
- Automated production flow management.
- Inspection-triggered hardware responses.

### 🦾 Robotic Sorting Workflow

- Automated classification handling.
- Accept / Reject decision generation.
- Hardware signal transmission.
- Sorting process integration.

### 📊 Production Monitoring Dashboard

- Real-time production visibility.
- Operational status monitoring.
- Detection activity tracking.
- Production statistics.
- Inspection history records.

### 💾 Detection History Management

- SQLite-based inspection logging.
- Historical detection records.
- Timestamp tracking.
- Confidence score storage.
- Classification reporting.

### 🚨 Safety & Control Features

- Emergency stop functionality.
- Conveyor control management.
- Operational state monitoring.
- Hardware status tracking.

---
## 🛠 Technology Stack

### Artificial Intelligence

- YOLOv8 Segmentation
- Computer Vision
- Object Detection
- Image Classification

### Backend

- Flask
- Python

### Database

- SQLite

### Hardware & Automation

- ESP32
- Conveyor System
- Robotic Sorting Mechanism
- Camera Module

### Communication

- Serial Communication
- REST API
- Real-Time Polling

### Monitoring

- Flask Dashboard
- MJPEG Video Streaming
- Production Analytics

### Development Tools

- Git
- GitHub
- OpenCV
## 🛠 Technology Stack

### Artificial Intelligence

- YOLOv8 Segmentation
- Computer Vision
- Object Detection
- Image Classification

### Backend

- Flask
- Python

### Database

- SQLite

### Hardware & Automation

- ESP32
- Conveyor System
- Robotic Sorting Mechanism
- Camera Module

### Communication

- Serial Communication
- REST API
- Real-Time Polling

### Monitoring

- Flask Dashboard
- MJPEG Video Streaming
- Production Analytics

### Development Tools

- Git
- GitHub
- OpenCV
## 🏗 System Architecture

Industrial Quality Inspection System consists of five major layers.

### 1. Vision Layer

Responsible for image acquisition and preprocessing.

Components:

- Camera Module
- Frame Capture Engine
- MJPEG Streaming

### 2. AI Processing Layer

Responsible for inspection and classification.

Components:

- YOLOv8 Model
- Detection Engine
- Confidence Evaluation

### 3. Decision Layer

Responsible for translating AI outputs into industrial actions.

Components:

- Classification Handler
- Decision Generator
- Workflow Controller

### 4. Automation Layer

Responsible for hardware interaction.

Components:

- ESP32 Controller
- Conveyor System
- Robotic Sorting System

### 5. Monitoring Layer

Responsible for visibility and operational reporting.

Components:

- Flask Dashboard
- Detection History
- Production Analytics
- Status Monitoring
## 👥 Team Contributions

This project was developed collaboratively as part of an undergraduate Artificial Intelligence and Robotics project.

Areas of contribution included:

- Computer Vision Development
- Hardware Integration
- Industrial Automation Design
- Dashboard Development
- System Testing & Validation
- AI Model Integration

My primary contribution focused on:

- Dashboard Development
- Monitoring Interface Implementation
- Production Visualization
- Detection Result Presentation
- Frontend Integration
## 📁 Project Structure

```bash
industrial-quality-inspection-system/
│
├── app.py                     # Main Flask application
├── HardwareCode.txt           # ESP32 and hardware communication code
├── box.db                     # SQLite database
├── yolov8n-seg.pt             # YOLOv8 segmentation model
│
├── templates/                 # HTML templates
│   ├── dashboard.html
│   ├── history.html
│   ├── settings.html
│   └── base.html
│
├── static/                    # Static assets
│   ├── css/
│   ├── js/
│   ├── images/
│   └── uploads/
│
├── models/                    # Database models
│   ├── detection.py
│   └── database.py
│
├── services/                  # Business logic
│   ├── detector.py
│   ├── camera_service.py
│   ├── esp32_service.py
│   └── logging_service.py
│
├── routes/                    # API routes
│   ├── dashboard.py
│   ├── api.py
│   └── history.py
│
├── screenshots/               # Project screenshots
│   ├── dashboard.png
│   ├── detection.png
│   └── history.png
│
├── requirements.txt
├── README.md
└── LICENSE
```
## 🌐 API Endpoints

### System Status

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/api/status` | Retrieve system status |
| GET | `/api/history` | Retrieve inspection history |
| GET | `/video_feed` | Live camera stream |

### Production Control

| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/start_detection` | Start inspection process |
| POST | `/stop_detection` | Stop inspection process |
| POST | `/emergency_stop` | Trigger emergency stop |

### Monitoring

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/dashboard` | Production dashboard |
| GET | `/history` | Detection history |
```

## 📈 Future Improvements

- Multi-camera inspection support
- Cloud-based monitoring dashboard
- Predictive maintenance analytics
- Defect trend visualization
- Edge AI deployment on industrial devices
- Real-time notification system
- Production performance analytics
- Role-based access control
```
