const { createBuilder } = require('@angular-devkit/architect');
const { spawn } = require('child_process');
const path = require('path');

module.exports = createBuilder((options, context) => {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(context.workspaceRoot, options.script);
    context.logger.info(`Running deploy script: ${scriptPath}`);

    const child = spawn(process.execPath, [scriptPath], {
      cwd: context.workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({ success: code === 0 });
    });

    child.on('error', (error) => {
      context.logger.error(error.message);
      resolve({ success: false, error: error.message });
    });
  });
});
