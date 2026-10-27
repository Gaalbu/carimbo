import { describePipeline, POLL_INTERVAL_MS } from './queues.js'

// Placeholder until F1 wires BullMQ; stdout keeps it dependency-free (no console.log, see AGENTS.md).
process.stdout.write(
  `carimbo-worker: filas planejadas ${describePipeline()}, a cada ${String(POLL_INTERVAL_MS)} ms (F1)\n`,
)
