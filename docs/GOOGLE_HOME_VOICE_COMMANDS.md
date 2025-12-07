# Voice Commands

Two endpoints:

- Mode Select (Status)
- Temperature Sensor (Delay minutes)

## Recommended (Numeric Delay)

```text
Hey Google, what's the temperature of Train Delay?
Hey Google, what's the temperature in <room>?
```

Interpretation:

```
0°C  on time
5°C  5 min late
-3°C 3 min early
```

Rename devices for shorter phrases (env vars or in-app).

## Air Quality

```text
Hey Google, what's the air quality of <device name>?
Hey Google, is <device name> good or bad?
```

Responses like "Good", "Fair", "Moderate", or "Poor" are mapped from
real-time train status. This is most useful when the Air Quality Sensor is
exposed as the primary endpoint or via a bridge.

## Status (Mode)

```text
Hey Google, is Train Status on time?
Hey Google, what's Train Status?
```

Mode voice support is limited; app UI is more reliable.

## Automations (Examples)

- When Status becomes Delayed/Major → notify.
- Daily 07:00 → announce current status.
- Status On Time → light green; Delayed → light red.
- Delay temperature >10°C → notify ">10 min late".

## Tips

- Prefer numeric sensor for voice; negative = early.
- Short names reduce misrecognition.
- Use app for exact mode changes if assistant fails.

## Alternatives

Home Assistant / Apple Home provide richer Mode Select handling if Google limitations block workflows.

## Troubleshooting (Brief)

- Offline: ensure process running & same network.
- No updates: check RTT credentials / route validity.
- Voice fails: rename shorter; fall back to automations.

## Future

Expect improved Mode Select voice support as Matter evolves in Google ecosystem.
