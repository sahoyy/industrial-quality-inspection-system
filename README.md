# 🏭 Industrial Quality Inspection System

An AI-powered industrial automation platform developed to simulate modern quality control processes in manufacturing environments.

The system combines computer vision, robotics, industrial automation, and real-time monitoring technologies to automatically inspect products, classify defects, and perform robotic sorting operations.

Using YOLOv8 object detection models, camera-based inspection workflows, ESP32 communication, and web-based dashboards, the platform demonstrates how Artificial Intelligence can be integrated into Industry 4.0 environments to improve quality assurance and operational efficiency.

---

## ✨ Key Features

### 🤖 AI-Powered Product Inspection

- Real-time defect detection using YOLOv8
- Automated product classification
- Detection confidence scoring
- Continuous inspection workflow

### 🏭 Industrial Automation

- Conveyor belt control integration
- ESP32 communication layer
- Robotic sorting commands
- Automated inspection decisions

### 📹 Live Monitoring

- Real-time camera streaming
- MJPEG live feed support
- Inspection visualization
- Production monitoring interface

### 📊 Dashboard & Analytics

- Production statistics
- Inspection history tracking
- Classification records
- Operational monitoring dashboard

### 💾 Data Management

- SQLite inspection logging
- Historical detection records
- Production activity tracking
- Event monitoring

### 🚨 Safety Controls

- Emergency stop functionality
- Conveyor control management
- Operational status monitoring
- System state tracking

## 🛠 Technology Stack

### Artificial Intelligence

- YOLOv8
- Computer Vision
- Object Detection
- Image Classification

### Backend

- Flask
- Python

### Database

- SQLite

### Hardware Integration

- ESP32
- Conveyor System
- Robotic Arm
- Camera Modules

### Communication

- Serial Communication
- REST API
- Real-Time Monitoring

### Development Tools

- Git
- GitHub
- OpenCV
## 🏗 System Architecture

Industrial Quality Inspection System consists of four main layers:

### 1. Vision Layer

Responsible for image acquisition and defect detection.

- Camera input
- Frame processing
- YOLOv8 inference
- Classification generation

### 2. Decision Layer

Processes AI outputs and generates inspection decisions.

- Confidence evaluation
- Product classification
- Sorting instructions

### 3. Automation Layer

Controls physical devices and industrial workflows.

- ESP32 communication
- Conveyor management
- Robotic arm commands
- Emergency control

### 4. Monitoring Layer

Provides visibility into production activities.

- Dashboard interface
- Detection history
- Statistics monitoring
- Operational reporting
