from __future__ import annotations

from dataclasses import dataclass, asdict
from math import sin
from random import Random
from statistics import median
from typing import Iterable


SIGNALS = [
    "speed_kph",
    "rpm",
    "throttle_pct",
    "brake_pct",
    "steering_deg",
    "yaw_rate_dps",
    "battery_v",
    "coolant_temp_c",
]


@dataclass
class CANFrame:
    timestamp_s: float
    speed_kph: float
    rpm: float
    throttle_pct: float
    brake_pct: float
    steering_deg: float
    yaw_rate_dps: float
    battery_v: float
    coolant_temp_c: float


def generate_trace(scenario: str = "normal", count: int = 180, seed: int = 42) -> list[dict]:
    rng = Random(seed)
    frames: list[CANFrame] = []

    for i in range(count):
        t = round(i * 0.2, 2)
        speed = 42 + 12 * sin(i / 26) + rng.uniform(-1.2, 1.2)
        throttle = 28 + 18 * sin(i / 35 + 0.8) + rng.uniform(-2.5, 2.5)
        brake = max(0, 8 * sin(i / 21 - 1.4) + rng.uniform(-1.0, 1.0))
        steering = 9 * sin(i / 18) + rng.uniform(-1.2, 1.2)
        yaw_rate = steering * 0.18 + rng.uniform(-0.8, 0.8)
        rpm = 850 + speed * 35 + throttle * 7 + rng.uniform(-50, 50)
        battery = 13.6 + rng.uniform(-0.08, 0.08)
        coolant = 82 + 2.5 * sin(i / 45) + rng.uniform(-0.3, 0.3)

        if scenario == "voltage_drop" and 70 <= i <= 112:
            battery -= 2.2 + 0.35 * sin(i / 7)
        if scenario == "pedal_conflict" and 82 <= i <= 124:
            throttle = 72 + rng.uniform(-4, 4)
            brake = 46 + rng.uniform(-3, 3)
        if scenario == "steering_mismatch" and 60 <= i <= 118:
            yaw_rate = -steering * 0.08 + rng.uniform(-0.5, 0.5)
        if scenario == "thermal_rise" and i >= 65:
            coolant += (i - 64) * 0.14
        if scenario == "sensor_spike" and i in {48, 49, 96, 97, 144}:
            rpm += 1400 + rng.uniform(-90, 90)
            speed += rng.uniform(12, 18)

        frames.append(
            CANFrame(
                timestamp_s=t,
                speed_kph=round(max(0, speed), 2),
                rpm=round(max(0, rpm), 1),
                throttle_pct=round(min(100, max(0, throttle)), 1),
                brake_pct=round(min(100, max(0, brake)), 1),
                steering_deg=round(steering, 2),
                yaw_rate_dps=round(yaw_rate, 2),
                battery_v=round(battery, 2),
                coolant_temp_c=round(coolant, 2),
            )
        )

    return [asdict(frame) for frame in frames]


def _mad(values: Iterable[float]) -> float:
    values = list(values)
    center = median(values)
    deviations = [abs(v - center) for v in values]
    return median(deviations) or 1.0


def _robust_score(value: float, center: float, scale: float) -> float:
    return abs(value - center) / (1.4826 * scale)


def detect_anomalies(frames: list[dict]) -> dict:
    if not frames:
        return {"summary": {"risk": "unknown", "score": 0, "events": 0}, "events": [], "signals": SIGNALS}

    centers = {signal: median(frame[signal] for frame in frames) for signal in SIGNALS}
    scales = {signal: _mad(frame[signal] for frame in frames) for signal in SIGNALS}
    events: list[dict] = []

    for frame in frames:
        rules: list[str] = []
        score = 0.0

        for signal in SIGNALS:
            z = _robust_score(float(frame[signal]), centers[signal], scales[signal])
            if z > 4.8:
                rules.append(f"{signal} robust z-score {z:.1f}")
                score += min(z, 12)

        if frame["battery_v"] < 12.0:
            rules.append("battery voltage below 12.0 V")
            score += 8
        if frame["throttle_pct"] > 55 and frame["brake_pct"] > 25:
            rules.append("throttle and brake conflict")
            score += 10
        if abs(frame["steering_deg"]) > 8 and abs(frame["yaw_rate_dps"]) < 1.0:
            rules.append("steering angle without matching yaw response")
            score += 7
        if frame["coolant_temp_c"] > 95:
            rules.append("coolant temperature above 95 C")
            score += 9
        if frame["rpm"] > 4200 and frame["speed_kph"] < 65:
            rules.append("rpm spike inconsistent with vehicle speed")
            score += 7

        if rules:
            severity = "high" if score >= 15 else "medium" if score >= 8 else "low"
            events.append(
                {
                    "timestamp_s": frame["timestamp_s"],
                    "severity": severity,
                    "score": round(score, 2),
                    "rules": rules,
                    "snapshot": {key: frame[key] for key in SIGNALS},
                }
            )

    high = sum(1 for event in events if event["severity"] == "high")
    medium = sum(1 for event in events if event["severity"] == "medium")
    risk = "high" if high else "medium" if medium else "normal" if not events else "low"
    top_score = max((event["score"] for event in events), default=0)

    return {
        "summary": {
            "risk": risk,
            "score": round(top_score, 2),
            "events": len(events),
            "high_events": high,
            "medium_events": medium,
        },
        "events": events,
        "signals": SIGNALS,
    }
