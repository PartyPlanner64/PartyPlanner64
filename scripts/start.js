/**
 * @file Called to start the PartyPlanner64 development server.
 */

const getVersion = require("./version").getVersion;
const spawn = require("child_process").spawn;

getVersion((version) => {
  process.env.VITE_PP64_VERSION = version;

  const npmCmd = "npm";
  const reactAppStart = spawn(
    npmCmd,
    ["run", "vite-start"],
    { shell: process.platform === "win32" }
  );
  reactAppStart.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  reactAppStart.stderr.on("data", function (data) {
    console.log(data.toString());
  });

  reactAppStart.on("exit", function (code) {
    console.log("child process exited with code " + code.toString());
  });
});
