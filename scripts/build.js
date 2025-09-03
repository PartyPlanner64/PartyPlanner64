/**
 * @file Called to build an optimized production copy.
 */

const getVersion = require("./version").getVersion;
const spawn = require("child_process").spawn;

process.env.GENERATE_SOURCEMAP = "false";

getVersion((version) => {
  process.env.VITE_PP64_VERSION = version;

  const reactAppBuild = spawn("C:\\Program Files\\nodejs\\npm.cmd", ["run", "vite-build"]);
  reactAppBuild.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  reactAppBuild.stderr.on("data", function (data) {
    console.log(data.toString());
  });

  reactAppBuild.on("exit", function (code) {
    console.log("child process exited with code " + code.toString());
  });
});
