const { createBuilder } = require('@angular-devkit/architect');
const { spawn } = require('child_process');
const path = require('path');

module.exports = createBuilder((options, context) => {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(context.workspaceRoot, options.script);
    const extraArgs = Array.isArray(options.args) ? options.args : [];
    context.logger.info(`Running script: ${scriptPath}${extraArgs.length ? ` ${extraArgs.join(' ')}` : ''}`);

    const child = spawn(process.execPath, [scriptPath, ...extraArgs], {
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
