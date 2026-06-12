# Industrial Quality Inspection System

An academic team project developed to demonstrate the integration of Artificial Intelligence, Computer Vision, Robotics, and Industrial Automation within a smart manufacturing environment.

The project aims to automate quality inspection processes by combining AI-based defect detection, robotic sorting mechanisms, and real-time monitoring dashboards. The system simulates how modern manufacturing facilities can utilize intelligent technologies to improve product quality control, reduce manual inspection efforts, and enhance operational efficiency.

This project was developed as part of an undergraduate Artificial Intelligence and Robotics learning experience at President University.

---

## Project Overview

Quality inspection remains one of the most important processes in manufacturing industries. Traditional inspection methods often rely on manual observation, which can be time-consuming and prone to human error.

To address this challenge, the Industrial Quality Inspection System was developed to automatically identify defective products using computer vision technologies and perform automated sorting through robotic mechanisms.

The system combines image-based defect detection, conveyor automation, robotic arm control, and web-based monitoring into a single workflow.

---

## Objectives

* Demonstrate the application of Artificial Intelligence in industrial environments.
* Implement computer vision techniques for automated product inspection.
* Integrate AI outputs with robotic sorting mechanisms.
* Develop a monitoring dashboard for production visibility and inspection reporting.
* Simulate smart manufacturing and Industry 4.0 concepts.

---

## Key Features

### AI-Based Defect Detection

* Automated product inspection using computer vision.
* Real-time classification of products into predefined categories.
* Detection of acceptable and defective products.

### Robotic Sorting System

* Automated sorting process based on inspection results.
* Integration with robotic arm movement logic.
* Conveyor-based product transportation workflow.

### Real-Time Monitoring Dashboard

* Live inspection monitoring.
* Product classification visualization.
* Historical inspection records.
* Production activity tracking.
* Dashboard-based operational visibility.

### Industrial Automation Workflow

* AI-assisted inspection process.
* Automated decision-making workflow.
* Hardware and software integration.
* End-to-end inspection simulation.

---

## System Workflow

### 1. Product Input

Products are placed on the conveyor system and move through the inspection area.

### 2. Image Acquisition

A camera captures images of products during the inspection process.

### 3. AI Inspection

The computer vision model analyzes product images and determines inspection results based on trained classification criteria.

### 4. Decision Generation

The system generates inspection outcomes and sends corresponding instructions to the automation controller.

### 5. Product Sorting

The robotic arm automatically sorts products according to the inspection result.

### 6. Monitoring & Reporting

Inspection data and operational activities are displayed through the monitoring dashboard for analysis and reporting purposes.

---

## Technology Stack

### Artificial Intelligence & Computer Vision

* YOLOv8
* Object Detection
* Image Classification
* Computer Vision

### Backend Development

* Python
* Flask

### Hardware Integration

* ESP32
* Robotic Arm
* Conveyor System

### Monitoring System

* Flask Dashboard
* Real-Time Data Visualization

### Database

* SQLite

---

## Team Contributions

The project was developed collaboratively by a multidisciplinary student team.

Areas of contribution included:

* Artificial Intelligence & Computer Vision
* Robotics Integration
* Hardware Communication
* Dashboard Development
* Testing & Validation
* System Integration

My contribution focused on the development of the monitoring dashboard and web-based visualization interfaces used to display inspection results, production information, and operational monitoring data.

---

## Educational Outcomes

Through this project, team members gained practical experience in:

* Computer Vision Applications
* Industrial Automation Concepts
* AI System Integration
* Robotics Workflows
* Full-Stack System Development
* Team-Based Engineering Projects

---

## Potential Applications

The concepts demonstrated in this project can be applied to:

* Manufacturing Quality Control
* Smart Factory Systems
* Automated Inspection Processes
* Industrial Monitoring Systems
* Industry 4.0 Learning Environments

---

## Repository Structure

```bash
industrial-quality-inspection-system
│
├── backend.py
├── best.pt
├── best.onnx
├── HardwareCode.txt
│
├── dashboard/
│   ├── app.py
│   ├── models/
│   └── box.db
│
├── static/
├── templates/
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/sahoyy/industrial-quality-inspection-system.git
cd industrial-quality-inspection-system
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Dashboard

```bash
python app.py
```

### Run Detection Service

```bash
python backend.py
```

---

## Disclaimer

This repository was developed for academic and educational purposes as part of an undergraduate team project. The project serves as a demonstration of AI, robotics, and automation concepts within a simulated industrial environment.

---

## License

Educational Use Only
