"""
app.py — Kerdus Defect Detection System
========================================
Backend Flask yang menggabungkan:
  • YOLOv8 AI detection (deffect / normal) — dari model kamu
  • MJPEG camera stream  
  • ESP32 serial communication (conveyor + robot arm)
  • SQLite history logging
  • REST API + real-time polling untuk frontend v5

Class mapping dari model:
  deffect  → DEFECT  → sinyal ke ESP32: "DEFFECT\n"
  normal   → NORMAL  → sinyal ke ESP32: "OK\n"
"""

from flask import Flask, render_template, jsonify, request, Response
from flask_cors import CORS
import sqlite3
import cv2
import threading
import time
import os
import random
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════════════════════════════
#  CONFIG — sesuaikan dengan setup kamu
# ═══════════════════════════════════════════════════════════════

DB_PATH          = "box.db"
MODEL_PATH       = os.path.join(os.path.dirname(__file__), "models", "best.pt")
CAMERA_INDEX     = 0          # 0 = webcam laptop, 1 = USB/external
CONFIDENCE       = 0.50       # threshold confidence YOLO
SERIAL_PORT      = "COM4"     # port ESP32 kamu
BAUD_RATE        = 115200
USE_SERIAL       = False       # set False kalau belum ada ESP32

# Class mapping model: deffect→DEFECT, normal→NORMAL
CLASS_MAP = {
    "deffect": "defect",
    "normal":  "good",
    # alias fallback
    "deffect_circle": "defect",
    "deffect_x":      "defect",
    "normal_circle":  "good",
    "normal_x":       "good",
}

# ═══════════════════════════════════════════════════════════════
#  SERIAL (ESP32)
# ═══════════════════════════════════════════════════════════════

_ser = None
_ser_lock = threading.Lock()

def _init_serial():
    global _ser
    if not USE_SERIAL:
        return
    try:
        import serial
        _ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)
        print(f"[*] Serial ESP32 connected on {SERIAL_PORT}")
    except Exception as e:
        print(f"[!] Serial not available ({e}) — software-only mode")
        _ser = None

def serial_send(cmd: str):
    """Send command to ESP32, e.g. 'DEFFECT' or 'OK' or 'START' etc."""
    with _ser_lock:
        if _ser and _ser.is_open:
            try:
                _ser.write(f"{cmd}\n".encode("utf-8"))
            except Exception as e:
                print(f"[!] Serial write error: {e}")

def serial_reader():
    """Background thread — reads status updates from ESP32."""
    global _esp32_status
    while True:
        if _ser and _ser.is_open and _ser.in_waiting > 0:
            try:
                line = _ser.readline().decode("utf-8", errors="replace").strip()
                if line.startswith("STATUS:"):
                    _esp32_status = line.split(":", 1)[1]
                    print(f"[ESP32] {line}")
            except Exception:
                pass
        time.sleep(0.05)

_esp32_status = "UNKNOWN"

# ═══════════════════════════════════════════════════════════════
#  YOLO MODEL
# ═══════════════════════════════════════════════════════════════

_model = None
_model_lock = threading.Lock()

def _load_model():
    global _model
    try:
        from ultralytics import YOLO
        _model = YOLO(MODEL_PATH, task='segment')
        print(f"[*] YOLO model loaded from {MODEL_PATH}")
        print(f"    Classes: {_model.names}")
    except Exception as e:
        print(f"[!] YOLO model not loaded ({e}) — mock detection mode")
        _model = None

# ═══════════════════════════════════════════════════════════════
#  CAMERA + AI DETECTION LOOP
# ═══════════════════════════════════════════════════════════════

_cam_state = {
    "active":       False,
    "cap":          None,
    "lock":         threading.Lock(),
    "latest_frame": None,   # raw frame for MJPEG stream
    "annotated":    None,   # frame with YOLO boxes drawn
}

_system_state = {
    "conveyor_running":   False,
    "conveyor_emergency": False,
    "ai_detecting":       False,
    "last_result":        "UNKNOWN",  # "good" | "defect" | "UNKNOWN"
    "last_sub_class":     "—",
    "last_confidence":    0.0,
    "last_timestamp":     None,
    "hardware_signal":    "—",        # "ACCEPT" | "REJECT" | "—"
}

_detection_lock = threading.Lock()


def _ai_detection_loop():
    """
    Background thread:
    - reads frames from camera
    - runs YOLO when ai_detecting=True
    - stores annotated frame
    - writes result to DB
    - sends serial command to ESP32
    """
    while True:
        with _cam_state["lock"]:
            cap    = _cam_state["cap"]
            active = _cam_state["active"]

        if not active or cap is None or not cap.isOpened():
            time.sleep(0.1)
            continue

        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        # Always store raw frame
        with _cam_state["lock"]:
            _cam_state["latest_frame"] = frame.copy()

        # Run YOLO only when system is running
        if _system_state["ai_detecting"] and _system_state["conveyor_running"]:
            annotated, result_status, sub_class, conf = _run_inference(frame)
        else:
            annotated    = frame
            result_status = _system_state.get("last_result", "UNKNOWN")
            sub_class     = _system_state.get("last_sub_class", "—")
            conf          = 0.0

        with _cam_state["lock"]:
            _cam_state["annotated"] = annotated.copy()

        time.sleep(0.033)   # ~30 FPS


def _run_inference(frame):
    """Run YOLO on frame; returns (annotated_frame, status, sub_class, confidence)."""
    with _model_lock:
        if _model is None:
            return _mock_inference(frame)

        results = _model.predict(frame, conf=CONFIDENCE, verbose=False)
        annotated = results[0].plot()

        boxes = results[0].boxes
        if len(boxes) == 0:
            # No detection — mark as unknown, don't update state
            return annotated, _system_state["last_result"], "—", 0.0

        # Take highest-confidence box
        best = sorted(boxes, key=lambda b: float(b.conf[0]), reverse=True)[0]
        cls_name  = _model.names[int(best.cls[0])].lower()
        conf      = round(float(best.conf[0]), 3)
        status    = CLASS_MAP.get(cls_name, "defect")   # default to defect if unknown

    _handle_detection(status, cls_name, conf)
    return annotated, status, cls_name, conf


def _mock_inference(frame):
    """Fake detection when model not loaded."""
    status = random.choice(["good", "good", "defect"])
    sub    = "normal" if status == "good" else "deffect"
    conf   = round(random.uniform(0.82, 0.99), 3)
    _handle_detection(status, sub, conf)
    return frame, status, sub, conf


def _handle_detection(status: str, sub_class: str, conf: float):
    """
    Called after each detection:
    - update system state
    - send serial signal to ESP32
    - write to SQLite
    - pause conveyor if defect
    """
    with _detection_lock:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        hw_signal = "ACCEPT" if status == "good" else "REJECT"

        _system_state["last_result"]     = status
        _system_state["last_sub_class"]  = sub_class
        _system_state["last_confidence"] = conf
        _system_state["last_timestamp"]  = ts
        _system_state["hardware_signal"] = hw_signal

        # Send to ESP32
        esp_cmd = "OK" if status == "good" else "DEFFECT"
        serial_send(esp_cmd)

        # Auto-stop conveyor on defect (robot arm picks up)
        if status == "defect":
            _system_state["conveyor_running"] = False
            serial_send("CONV_STOP")

        # Write to DB
        _db_insert_detection(ts, status, sub_class, conf)

        print(f"\r[AI] {status.upper()} — {sub_class} ({conf:.2f}) → {hw_signal}   ", end="")


# ═══════════════════════════════════════════════════════════════
#  DATABASE (SQLite)
# ═══════════════════════════════════════════════════════════════

def _db_connect():
    return sqlite3.connect(DB_PATH)

def _db_init():
    conn = _db_connect()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT,
            status      TEXT,
            sub_class   TEXT,
            confidence  REAL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS conveyor_log (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            action    TEXT
        )
    """)
    conn.commit()
    conn.close()

def _db_insert_detection(ts, status, sub_class, conf):
    try:
        conn = _db_connect()
        conn.execute(
            "INSERT INTO detections (timestamp, status, sub_class, confidence) VALUES (?,?,?,?)",
            (ts, status, sub_class, conf)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[!] DB write error: {e}")

def _db_log_action(action):
    try:
        conn = _db_connect()
        conn.execute(
            "INSERT INTO conveyor_log (timestamp, action) VALUES (?,?)",
            (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), action)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[!] DB log error: {e}")


# ═══════════════════════════════════════════════════════════════
#  FLASK ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


# ── Status ────────────────────────────────────────────────────

@app.route("/api/status")
def get_status():
    """Full snapshot — polled by frontend every 5 seconds."""
    conn = _db_connect()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM detections")
    total = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM detections WHERE status='good'")
    good = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM detections WHERE status='defect'")
    defect = c.fetchone()[0]
    c.execute("""
        SELECT sub_class, COUNT(*) cnt FROM detections
        WHERE status='defect' GROUP BY sub_class ORDER BY cnt DESC
    """)
    sub_classes = [{"label": r[0].replace("_"," ").title(), "raw": r[0], "count": r[1]}
                   for r in c.fetchall()]
    c.execute("SELECT timestamp, status FROM detections ORDER BY id DESC LIMIT 20")
    recent = [{"timestamp": r[0], "status": r[1]} for r in reversed(c.fetchall())]
    conn.close()

    return jsonify({
        "conveyor": {
            "status": ("stopped" if _system_state["conveyor_emergency"]
                       else "running" if _system_state["conveyor_running"]
                       else "stopped"),
            "speed": 2,
        },
        "arm": {
            "state":        "idle",
            "target_color": None,
            "total_ops":    defect,
            "success_rate": round(good / total * 100, 1) if total else 0,
            "last_pick":    _system_state["last_timestamp"],
        },
        "camera": {
            "active":     _cam_state["active"],
            "detecting":  _system_state["ai_detecting"],
            "detections": _build_detection_list(),
        },
        "bins": {
            "defect": {"color":"defect","current": defect % 10,"max":10,"total_sorted":defect,"is_full":defect%10==0 and defect>0,"pct": (defect%10)*10},
            "good":   {"color":"good",  "current": good   % 10,"max":10,"total_sorted":good,  "is_full":good%10==0   and good>0,  "pct": (good%10)*10},
        },
        "session": {
            "running":        _system_state["conveyor_running"],
            "paused":         False,
            "uptime_seconds": 0,
            "total_sorted":   total,
        },
        "alarms": [],
        # Extended fields for dashboard
        "last_detection": {
            "status":           _system_state["last_result"],
            "sub_class":        _system_state["last_sub_class"],
            "confidence":       _system_state["last_confidence"],
            "timestamp":        _system_state["last_timestamp"] or "",
            "hardware_signal":  _system_state["hardware_signal"].lower() if _system_state["hardware_signal"] != "—" else "—",
        },
        "stats": {
            "total": total, "good": good, "defect": defect,
            "sub_classes": sub_classes,
            "recent": recent,
        }
    })


def _build_detection_list():
    """Build detection list for camera overlay based on last result."""
    if _system_state["last_result"] not in ("good", "defect"):
        return []
    return [{
        "color":      "good" if _system_state["last_result"] == "good" else "red",
        "conf":       _system_state["last_confidence"],
        "bbox":       [50, 50, 200, 200],  # placeholder bbox
        "sub_class":  _system_state["last_sub_class"],
        "status":     _system_state["last_result"],
    }]


# ── Camera ────────────────────────────────────────────────────

@app.route("/api/camera/start", methods=["POST"])
def camera_start():
    with _cam_state["lock"]:
        if _cam_state["active"] and _cam_state["cap"] is not None:
            return jsonify({"success": True, "message": "Camera already active"})
        # Try CAP_DSHOW on Windows first (stable), fallback to default
        cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(CAMERA_INDEX)
        if not cap.isOpened():
            return jsonify({"success": False, "message": "Cannot open camera. Check connection."}), 400
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        _cam_state["cap"]    = cap
        _cam_state["active"] = True
        _system_state["ai_detecting"] = True
    return jsonify({"success": True, "message": "Camera started"})


@app.route("/api/camera/stop", methods=["POST"])
def camera_stop():
    with _cam_state["lock"]:
        if _cam_state["cap"] is not None:
            _cam_state["cap"].release()
            _cam_state["cap"] = None
        _cam_state["active"]       = False
        _cam_state["latest_frame"] = None
        _cam_state["annotated"]    = None
        _system_state["ai_detecting"] = False
    return jsonify({"success": True})


@app.route("/api/camera/status")
def camera_status():
    return jsonify({"active": _cam_state["active"]})


@app.route("/api/camera/stream")
def camera_stream():
    """
    MJPEG stream with YOLO annotations drawn on top.
    Frontend embeds as: <img src="/api/camera/stream">
    """
    def generate():
        import numpy as np
        while True:
            with _cam_state["lock"]:
                annotated = _cam_state.get("annotated")
                raw       = _cam_state.get("latest_frame")
                active    = _cam_state["active"]

            if not active:
                # Placeholder frame
                placeholder = np.zeros((480, 640, 3), dtype="uint8")
                cv2.putText(placeholder, "CAMERA OFFLINE", (160, 220),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (60, 60, 60), 2)
                cv2.putText(placeholder, "Click START CAMERA", (160, 265),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 50), 1)
                _, buf = cv2.imencode(".jpg", placeholder)
            else:
                frame = annotated if annotated is not None else raw
                if frame is None:
                    time.sleep(0.05)
                    continue

                # Draw detection status overlay
                f = frame.copy()
                result = _system_state["last_result"]
                if result in ("good", "defect"):
                    color  = (0, 230, 120) if result == "good" else (0, 60, 255)
                    label  = f"{'NORMAL' if result=='good' else 'DEFFECT'} {_system_state['last_confidence']:.2f}"
                    signal = _system_state["hardware_signal"]
                    cv2.rectangle(f, (8, 8), (320, 50), (0, 0, 0), -1)
                    cv2.putText(f, label,  (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.75, color, 2)
                    cv2.putText(f, signal, (220, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

                _, buf = cv2.imencode(".jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 80])

            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                   + buf.tobytes() + b"\r\n")
            time.sleep(0.033)

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


# ── Conveyor control ──────────────────────────────────────────

@app.route("/api/conveyor/control", methods=["POST"])
def conveyor_control():
    data   = request.get_json(silent=True) or {}
    action = data.get("action", "")

    if action == "start":
        _system_state["conveyor_running"]   = True
        _system_state["conveyor_emergency"] = False
        _system_state["ai_detecting"]       = True
        serial_send("CONV_START")
    elif action == "stop":
        _system_state["conveyor_running"]   = False
        _system_state["conveyor_emergency"] = False
        serial_send("CONV_STOP")
    elif action == "emergency":
        _system_state["conveyor_running"]   = False
        _system_state["conveyor_emergency"] = True
        _system_state["ai_detecting"]       = False
        serial_send("EMERGENCY")

    _db_log_action(action)

    return jsonify({
        "success": True,
        "state": {
            "running":   _system_state["conveyor_running"],
            "emergency": _system_state["conveyor_emergency"],
        }
    })


@app.route("/api/conveyor/status")
def conveyor_status():
    return jsonify({
        "running":   _system_state["conveyor_running"],
        "emergency": _system_state["conveyor_emergency"],
    })


@app.route("/api/conveyor/speed", methods=["POST"])
def conveyor_speed():
    data  = request.get_json(silent=True) or {}
    speed = int(data.get("speed", 2))
    serial_send(f"CONV_SPEED:{speed}")
    return jsonify({"ok": True, "speed": speed})


@app.route("/api/conveyor/emergency-stop", methods=["POST"])
def conveyor_emergency_stop():
    _system_state["conveyor_running"]   = False
    _system_state["conveyor_emergency"] = True
    _system_state["ai_detecting"]       = False
    serial_send("EMERGENCY")
    _db_log_action("emergency")
    return jsonify({"ok": True})


# ── Detection (manual trigger) ─────────────────────────────

@app.route("/api/detection/simulate", methods=["POST"])
def detection_simulate():
    """
    Manual trigger: runs inference on current frame (or mock).
    Also works as /api/detection/simulate for frontend compatibility.
    """
    with _cam_state["lock"]:
        frame = _cam_state.get("latest_frame")
        active = _cam_state["active"]

    if active and frame is not None:
        _, status, sub_class, conf = _run_inference(frame)
    else:
        # Mock when camera not active
        status    = random.choice(["good", "good", "defect"])
        sub_class = "normal" if status == "good" else "deffect"
        conf      = round(random.uniform(0.82, 0.99), 3)
        _handle_detection(status, sub_class, conf)

    return jsonify({
        "status":         status,
        "sub_class":      sub_class,
        "confidence":     conf,
        "timestamp":      _system_state["last_timestamp"] or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "hardware_signal": "accept" if status == "good" else "reject",
    })


@app.route("/api/detection/latest")
def detection_latest():
    conn = _db_connect()
    c = conn.cursor()
    c.execute("SELECT * FROM detections ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({})
    return jsonify({
        "id": row[0], "timestamp": row[1], "status": row[2],
        "sub_class": row[3], "confidence": row[4],
        "hardware_signal": "accept" if row[2] == "good" else "reject",
    })


# ── History & Stats ───────────────────────────────────────────

@app.route("/api/history")
def history():
    conn = _db_connect()
    c = conn.cursor()
    c.execute("SELECT timestamp, status, sub_class, confidence FROM detections ORDER BY id DESC LIMIT 100")
    rows = c.fetchall()
    conn.close()
    return jsonify([
        {"timestamp": r[0], "status": r[1], "sub_class": r[2], "confidence": r[3]}
        for r in rows
    ])


@app.route("/api/stats")
def stats():
    conn = _db_connect()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM detections");             total  = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM detections WHERE status='good'");   good   = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM detections WHERE status='defect'"); defect = c.fetchone()[0]
    c.execute("""
        SELECT sub_class, COUNT(*) cnt FROM detections
        WHERE status='defect' GROUP BY sub_class ORDER BY cnt DESC
    """)
    sub_classes = [{"label": r[0].replace("_"," ").title(), "raw": r[0], "count": r[1]}
                   for r in c.fetchall()]
    c.execute("SELECT timestamp, status FROM detections ORDER BY id DESC LIMIT 20")
    recent = [{"timestamp": r[0], "status": r[1]} for r in reversed(c.fetchall())]
    conn.close()
    return jsonify({
        "total": total, "good": good, "defect": defect,
        "sub_classes": sub_classes,
        "recent": recent,
    })


# ── System reset ──────────────────────────────────────────────

@app.route("/api/system/reset", methods=["POST"])
def system_reset():
    _system_state["conveyor_running"]   = False
    _system_state["conveyor_emergency"] = False
    _system_state["ai_detecting"]       = False
    _system_state["last_result"]        = "UNKNOWN"
    _system_state["last_sub_class"]     = "—"
    _system_state["last_confidence"]    = 0.0
    _system_state["last_timestamp"]     = None
    _system_state["hardware_signal"]    = "—"
    serial_send("CONV_STOP")
    return jsonify({"ok": True})


# ── ESP32 command (raw) ───────────────────────────────────────

@app.route("/api/command", methods=["POST"])
def send_command():
    """Direct ESP32 command, e.g. {"cmd": "ARM_HOME"}"""
    if not _ser:
        return jsonify({"error": "Serial not connected"}), 500
    cmd = (request.get_json(silent=True) or {}).get("cmd")
    if not cmd:
        return jsonify({"error": "No command"}), 400
    serial_send(cmd)
    return jsonify({"sent": cmd})


@app.route("/api/arm/home", methods=["POST"])
def arm_home():
    serial_send("ARM_HOME")
    return jsonify({"ok": True})


# ═══════════════════════════════════════════════════════════════
#  STARTUP
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 55)
    print("  Kerdus Defect Detection System")
    print("  Flask Backend + YOLOv8 + ESP32")
    print("  http://localhost:5000")
    print("=" * 55)

    # Init DB
    _db_init()
    print("[*] Database initialized")

    # Load YOLO model
    _load_model()

    # Init serial
    _init_serial()

    # Start serial reader thread
    if _ser:
        t_serial = threading.Thread(target=serial_reader, daemon=True, name="serial-reader")
        t_serial.start()

    # Start AI detection loop
    t_ai = threading.Thread(target=_ai_detection_loop, daemon=True, name="ai-loop")
    t_ai.start()
    print("[*] AI detection loop started")

    # Run Flask
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False,
        threaded=True,
    )
