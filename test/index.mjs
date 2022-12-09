import fs from 'fs';
import { exec } from 'child_process';

const examplesFolder = './examples/';

const files = fs.readdirSync(examplesFolder);

files.map(function (file) {
  return new Promise((resolve, reject) => {
    exec(`node ${examplesFolder}${file}`, (error, stdout, stderr) => {
      console.log(`===== Running ${file} =====================`);
      if (error) {
        console.log(`error: ${error.message}`);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }
      resolve();
    });
  });
});
