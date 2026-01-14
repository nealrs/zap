import { spawn, exec } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Kill any process using the specified port
 */
export async function killPort(port) {
  try {
    // Try to find and kill process on port (macOS/Linux)
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`);
        console.log(`✓ Killed process ${pid} on port ${port}`);
      } catch (error) {
        // Process might already be gone, ignore
      }
    }
    
    // Wait a bit for port to be released
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    // No process found on port, that's fine
  }
}

/**
 * Start the Express server on test port
 */
export async function startTestServer(port = 3001) {
  // First, try to kill any existing process on the port
  await killPort(port);

  return new Promise((resolve, reject) => {
    const server = spawn('node', ['server.js'], {
      cwd: rootDir,
      env: { ...process.env, PORT: port.toString(), ENV: 'dev' },
      stdio: 'pipe'
    });

    let serverReady = false;
    let serverError = null;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!serverReady && server && !server.killed) {
        server.kill();
      }
    };

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running') || output.includes('listening')) {
        if (!serverReady) {
          serverReady = true;
          cleanup();
          console.log(`✓ Test server started on port ${port}`);
          resolve(server);
        }
      }
    });

    server.stderr.on('data', (data) => {
      const output = data.toString();
      // Check for port conflict
      if (output.includes('EADDRINUSE') || output.includes('address already in use')) {
        serverError = new Error(`Port ${port} is already in use`);
        cleanup();
        reject(serverError);
      } else {
        console.error(`Server error: ${output}`);
      }
    });

    server.on('error', (error) => {
      serverError = error;
      cleanup();
      reject(error);
    });

    server.on('exit', (code) => {
      if (!serverReady && code !== 0 && !serverError) {
        cleanup();
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (!serverReady) {
        cleanup();
        reject(new Error('Server failed to start within 10 seconds'));
      }
    }, 10000);
  });
}

/**
 * Stop the Express server
 */
export async function stopTestServer(server, port = 3001) {
  if (server && !server.killed) {
    try {
      server.kill('SIGTERM');
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force kill if still running
      if (!server.killed) {
        server.kill('SIGKILL');
      }
      
      // Also kill any remaining process on the port
      await killPort(port);
      console.log('✓ Test server stopped');
    } catch (error) {
      // Try to kill port anyway
      await killPort(port);
      console.log('✓ Test server stopped (force)');
    }
  } else {
    // Still try to kill port in case server object is invalid
    await killPort(port);
  }
}

/**
 * Validate levels.json syntax and structure
 */
export function validateLevelsJSON() {
  try {
    const levelsPath = join(rootDir, 'app', 'data', 'levels.json');
    const levelsData = JSON.parse(readFileSync(levelsPath, 'utf8'));
    
    if (!Array.isArray(levelsData)) {
      throw new Error('levels.json must be an array');
    }

    const errors = [];
    const warnings = [];
    
    levelsData.forEach((level, index) => {
      // Required fields
      const required = ['name', 'target', 'time', 'count', 'size', 'gravity', 'color'];
      required.forEach(field => {
        if (!(field in level)) {
          errors.push(`Level ${index + 1} (${level.name || 'unnamed'}): Missing required field '${field}'`);
        }
      });

      // Validate color format
      if (level.color && !/^0x[0-9a-fA-F]{6}$/.test(level.color)) {
        errors.push(`Level ${index + 1} (${level.name}): Invalid color format '${level.color}' (must be 0xRRGGBB)`);
      }

      // Validate value ranges - these are errors (invalid data)
      if (level.time !== undefined) {
        if (level.time <= 0) {
          errors.push(`Level ${index + 1} (${level.name}): Time limit is ${level.time} (must be > 0)`);
        } else if (level.time < 10) {
          warnings.push(`Level ${index + 1} (${level.name}): Time limit is very short (${level.time}s) - may be too difficult`);
        }
      }

      if (level.target !== undefined) {
        if (level.target <= 0) {
          errors.push(`Level ${index + 1} (${level.name}): Target is ${level.target} (must be > 0)`);
        }
      }

      if (level.count !== undefined) {
        if (level.count <= 0) {
          errors.push(`Level ${index + 1} (${level.name}): Bubble count is ${level.count} (must be > 0)`);
        }
      }

      if (level.size !== undefined) {
        if (level.size <= 0) {
          errors.push(`Level ${index + 1} (${level.name}): Bubble size is ${level.size} (must be > 0)`);
        } else if (level.size < 0.5) {
          warnings.push(`Level ${index + 1} (${level.name}): Bubble size is very small (${level.size}) - may be hard to click`);
        } else if (level.size > 3) {
          warnings.push(`Level ${index + 1} (${level.name}): Bubble size is very large (${level.size}) - may be too easy`);
        }
      }

      if (level.gravity !== undefined && level.gravity < 0) {
        warnings.push(`Level ${index + 1} (${level.name}): Gravity is negative (${level.gravity}) - bubbles will float away`);
      }

      // Level sanity checks - flag impossible or suspicious configurations (warnings, not errors)
      // IMPORTANT: Consider respawn mechanics - if respawnBubbles is enabled, initial count can be less than target
      const hasRespawn = level.respawnBubbles === true && level.respawnRate && level.respawnRate > 0;
      
      if (level.target !== undefined && level.count !== undefined) {
        if (level.target > level.count) {
          if (hasRespawn) {
            // With respawn, this might be OK - but check if respawn rate is sufficient
            const respawnRate = level.respawnRate || 0;
            const time = level.time || 60;
            const estimatedRespawns = Math.floor(time * respawnRate);
            const totalPossibleBubbles = level.count + estimatedRespawns;
            if (totalPossibleBubbles < level.target) {
              warnings.push(`Level ${index + 1} (${level.name}): Target (${level.target}) may be too high - initial count (${level.count}) + estimated respawns (${estimatedRespawns}) = ${totalPossibleBubbles} < target`);
            }
            // If respawn is enabled and target > count, it's potentially OK, so don't warn unless respawn rate is too low
          } else {
            // No respawn - this is definitely impossible
            warnings.push(`Level ${index + 1} (${level.name}): Target (${level.target}) > bubble count (${level.count}) - impossible to complete (no respawn enabled)`);
          }
        }
      }

      if (level.target !== undefined && level.time !== undefined) {
        // Estimate minimum time needed: assume player can pop 1 bubble per second (conservative)
        const minTimeNeeded = level.target;
        if (level.time < minTimeNeeded) {
          // If respawn is enabled, we might be able to pop more bubbles than initial count
          if (hasRespawn) {
            const respawnRate = level.respawnRate || 0;
            const estimatedRespawns = Math.floor(level.time * respawnRate);
            const totalPossibleBubbles = (level.count || 0) + estimatedRespawns;
            if (totalPossibleBubbles < level.target) {
              warnings.push(`Level ${index + 1} (${level.name}): Time (${level.time}s) may be too short for target (${level.target}) - even with respawn (${respawnRate}/s), estimated max bubbles = ${totalPossibleBubbles}`);
            }
          } else {
            warnings.push(`Level ${index + 1} (${level.name}): Time (${level.time}s) may be too short for target (${level.target}) - need at least ${minTimeNeeded}s`);
          }
        }
      }

      // Check for special bubbles enabled but no spawn configuration
      if (level.specialBubbles && level.specialBubbles.enabled) {
        if (!level.specialBubbles.types || level.specialBubbles.types.length === 0) {
          warnings.push(`Level ${index + 1} (${level.name}): Special bubbles enabled but no types specified`);
        }
        if (!level.specialBubbles.spawnIntervalSeconds || level.specialBubbles.spawnIntervalSeconds <= 0) {
          warnings.push(`Level ${index + 1} (${level.name}): Special bubbles enabled but spawn interval is invalid or missing`);
        }
      }

      // Validate hazards
      if (level.hazards && Array.isArray(level.hazards)) {
        // Check comet limit (max 1 per level per PR-8) - this is a warning per PR-8 requirements
        const cometCount = level.hazards.filter(h => h.type === 'comet').length;
        if (cometCount > 1) {
          warnings.push(`Level ${index + 1} (${level.name}): Has ${cometCount} comets (max 1 allowed per PR-8)`);
        }

        level.hazards.forEach((hazard, hIndex) => {
          if (!hazard.type) {
            errors.push(`Level ${index + 1} (${level.name}): Hazard ${hIndex} missing type`);
          }
          
          // Validate hazard-specific properties
          if (hazard.type === 'comet' && hazard.r !== undefined && hazard.r <= 0) {
            errors.push(`Level ${index + 1} (${level.name}): Comet radius (r) is ${hazard.r} (must be > 0)`);
          }
          if (hazard.type === 'wormhole' && hazard.r !== undefined && hazard.r <= 0) {
            errors.push(`Level ${index + 1} (${level.name}): Wormhole radius (r) is ${hazard.r} (must be > 0)`);
          }
          if (hazard.type === 'repulsor' && hazard.r !== undefined && hazard.r <= 0) {
            errors.push(`Level ${index + 1} (${level.name}): Repulsor radius (r) is ${hazard.r} (must be > 0)`);
          }
        });
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

/**
 * Load test configuration
 */
export function loadTestConfig() {
  try {
    const configPath = join(rootDir, 'test-config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    // Return defaults if config doesn't exist
    return {
      serverPort: 3001,
      baseUrl: 'http://localhost:3001',
      timeout: 30000,
      headless: true,
      screenshotOnFailure: true,
      screenshotDir: 'test-screenshots',
      reportDir: '.test-results',
      screenshotInterval: 10000,
      defaultViewports: ['iphone-portrait'],
      allViewports: ['iphone-portrait', 'tablet-portrait', 'desktop-narrow']
    };
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath) {
  const { mkdir } = await import('fs/promises');
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's ok
  }
}
