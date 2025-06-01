import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export class Logger {
  private logFile: string;
  private stream: fs.WriteStream;

  constructor(prefix: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(LOG_DIR, `${prefix}-${timestamp}.log`);
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    if (data) {
      this.stream.write(`${logMessage}\n${JSON.stringify(data, null, 2)}\n\n`);
    } else {
      this.stream.write(`${logMessage}\n`);
    }
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(errorMessage);
    
    if (error) {
      this.stream.write(`${errorMessage}\n${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}\n\n`);
    } else {
      this.stream.write(`${errorMessage}\n`);
    }
  }

  close() {
    this.stream.end();
  }
} 