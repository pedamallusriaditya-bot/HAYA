/**
 * Stockfish UCI Worker Manager
 * Manages communication with Stockfish in a background Web Worker
 */

class StockfishWorkerManager {
  private worker: Worker | null = null;
  private isReady = false;
  private isSupported = typeof window !== 'undefined' && typeof Worker !== 'undefined';
  private readyPromise: Promise<boolean> | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker(): Promise<boolean> {
    if (!this.isSupported) {
      return Promise.resolve(false);
    }
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise((resolve) => {
      try {
        this.worker = new Worker('/stockfish.js');

        const timeout = setTimeout(() => {
          if (!this.isReady) {
            console.warn('[Stockfish] Initialization timed out, falling back to local engine');
            this.terminate();
            resolve(false);
          }
        }, 5000);

        const onInitMessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data : '';
          if (line.includes('uciok') || line.includes('readyok') || line.includes('Stockfish')) {
            this.isReady = true;
            clearTimeout(timeout);
            this.worker?.removeEventListener('message', onInitMessage);
            resolve(true);
          }
        };

        this.worker.addEventListener('message', onInitMessage);
        this.worker.addEventListener('error', (err) => {
          console.warn('[Stockfish] Worker load error:', err);
          clearTimeout(timeout);
          this.terminate();
          resolve(false);
        });

        this.worker.postMessage('uci');
        this.worker.postMessage('isready');
      } catch (err) {
        console.warn('[Stockfish] Failed to initialize worker:', err);
        this.terminate();
        resolve(false);
      }
    });

    return this.readyPromise;
  }

  public async getBestMove(
    fen: string,
    skillLevel: number, // 0 to 20
    depth: number,
    movetimeMs: number
  ): Promise<string | null> {
    const ready = await this.initWorker();
    if (!ready || !this.worker) {
      return null;
    }

    return new Promise((resolve) => {
      const worker = this.worker!;

      const timeout = setTimeout(() => {
        cleanup();
        worker.postMessage('stop');
        resolve(null);
      }, movetimeMs + 3000);

      const onMessage = (e: MessageEvent) => {
        const text = typeof e.data === 'string' ? e.data : '';
        if (text.startsWith('bestmove')) {
          cleanup();
          const parts = text.split(' ');
          const move = parts[1]; // e.g. "e2e4" or "e7e8q"
          if (move && move !== '(none)') {
            resolve(move);
          } else {
            resolve(null);
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
      };

      worker.addEventListener('message', onMessage);

      // Set engine options and position
      worker.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, skillLevel))}`);
      worker.postMessage('isready');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth} movetime ${movetimeMs}`);
    });
  }

  public terminate() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
      this.isReady = false;
      this.readyPromise = null;
    }
  }
}

export const stockfishEngine = new StockfishWorkerManager();
