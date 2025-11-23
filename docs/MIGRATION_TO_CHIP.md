# Moving away from matter.js: Options and a practical migration path

This document outlines solid alternatives to `@project-chip/matter.js` for building a Matter accessory that Google Home can commission, plus a pragmatic migration plan that lets you keep your current train-status logic while upgrading the Matter stack.

## TL;DR
- Best supported path today: use the official Project CHIP (Matter) C++ SDK on Linux/macOS. It tracks new specs fastest, supports more clusters (e.g., Mode Select; Air Quality in newer spec levels), and is used by major vendors.
- Keep your existing JS polling/business logic. Bridge to the C++ device via a tiny local IPC (gRPC/Unix socket/HTTP) so you don’t rewrite your RTT code.
- If you need a quick numeric sensor for better Google Home UX, expose a Temperature/Humidity/Pressure sensor and map train delay to a value. Add Air Quality later if the SDK and Google Home support align.

## Options overview

1) Official Project CHIP (C++) SDK (connectedhomeip)
- Role: Full-featured reference SDK for Matter devices and controllers.
- Pros: Broad cluster coverage, aligns with latest Matter releases, proven with Google Home/Alexa/HomeKit. Linux example apps run on macOS/Linux/Raspberry Pi.
- Cons: Heavier toolchain (GN/Ninja, CMake), C++ codebase, steeper learning curve.
- Fit here: Excellent for a headless Linux/macOS “virtual device” that exposes Mode Select now and Air Quality when available.

2) Python Matter Server (Home Assistant ecosystem)
- Role: Primarily a controller/bridge; excellent for onboarding and bridging existing ecosystems to Matter.
- Pros: Easy Python environment, active community.
- Cons: Not a general-purpose device SDK for standalone virtual devices; aims at controller/bridge use cases.
- Fit here: Useful for testing/commissioning; not ideal for a production standalone device that represents train status.

3) Rust/Go community SDKs
- Role: Emerging implementations.
- Pros: Attractive languages, potential ergonomics.
- Cons: Early-stage, incomplete cluster/device coverage, smaller ecosystems.
- Fit here: Riskier path if you need Mode Select/Air Quality and Google Home reliability soon.

4) Stay on matter.js but upgrade
- Role: Upgrade to the newest matter.js to pick up more clusters and fixes.
- Pros: Minimal rewrite; you keep Node.js end-to-end.
- Cons: Still lags the C++ SDK for newest clusters/specs; you may hit similar limitations later.
- Fit here: Reasonable if you only need a small bump and can live with JS.

## Recommended architecture (keep JS logic, move device to C++)

- Process A (Node.js): Your existing RTT poller and business logic.
  - Emits: status events and/or numeric metrics (e.g., delay minutes).
- Process B (C++): A tiny Matter device built from the CHIP SDK, running on the same box.
  - Exposes: Mode Select cluster for status; optionally a numeric sensor (Temp/Humidity/Pressure) or Air Quality when ready.
- IPC contract: A simple local channel where Process A tells Process B to update attributes.
  - Transport: Unix domain socket, gRPC, or HTTP on localhost.
  - Message examples:
    - setMode { currentMode: 0..N, label: "Running on time" }
    - setMetric { name: "delay_minutes", value: 8.5 }

Why this works
- You decouple the Matter stack from the RTT logic. You can upgrade/change the device implementation without touching Node.js polling.
- You can run both processes under systemd/Docker and roll forward safely.

## Migration plan

1) Prove-out the SDK locally
- Build and run the official Linux/macOS example (e.g., all-clusters-app or bridge-app) from Project CHIP.
- Commission it with Google Home to validate your environment.

2) Create a minimal device app
- Start from all-clusters-app or bridge-app and keep only the clusters you need:
  - Mode Select (for train status)
  - Optionally TemperatureMeasurement (map delay minutes) or Air Quality (when supported by SDK + Google Home)
- Add a simple IPC server (e.g., a small gRPC or REST endpoint) that updates the cluster attributes when messages arrive.

3) Wire your Node app
- Add a tiny client in your Node process to send updates on every status change/refresh.
- Keep the existing tests around your business logic; add a smoke test that hits the IPC and verifies a response from the C++ process during CI.

4) Cutover strategy
- Phase 1: Run the new C++ device in parallel with your current matter.js device (different discriminator/passcode). Validate behavior in Google Home.
- Phase 2: Switch automations to the new device.
- Phase 3: Remove matter.js, delete pairing state, and simplify scripts.

## Pros/cons vs matter.js

Pros (CHIP C++)
- Faster support for new spec (clusters like Mode Select are stable; Air Quality appears with newer spec levels).
- Broad ecosystem adoption; battle-tested with Google Home/Alexa/HomeKit.
- Fine-grained control over device behavior and performance.

Cons
- Tooling and build complexity.
- C++ ergonomics vs Node.js.

## What about Air Quality?
- Matter 1.3 introduced Air Quality. The official C++ SDK tends to implement new clusters relatively quickly compared to matter.js.
- Google Home: support varies by platform rollouts. Even if the SDK supports the cluster, controller support may trail—validate on your devices.
- Practical interim: map “delay minutes” to a TemperatureMeasurement sensor for a great Google Home app/voice experience today; switch to Air Quality later.

## Concrete next steps
- [ ] Build CHIP example app on your target (macOS/Raspberry Pi/Linux VM). Verify commissioning with Google Home.
- [ ] Decide IPC: Unix socket + JSON is dead simple; gRPC brings schema and tooling.
- [ ] Scaffold a minimal device from example code with Mode Select + one numeric sensor.
- [ ] Add a Node client that POSTs/streams updates into the C++ process.
- [ ] Run both devices in parallel for a week; then retire matter.js.

If you want, we can scaffold the IPC contract and a minimal C++ project layout next, and add a small Node client that drives it from your existing events.
