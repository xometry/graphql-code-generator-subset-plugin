import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export async function execAndCheck(
  command: string,
  args: ReadonlyArray<string>,
  options?: SpawnOptionsWithoutStdio
): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";

    function rejectWithDetail(msg: string) {
      const fullCommand = `${command} ${args.join(" ")}`;
      reject(
        new Error(
          `command "${fullCommand}" failed: ${msg}\nstdout: ${output}\nstderr: ${errorOutput}`
        )
      );
    }

    const process = spawn(command, args, options);
    process.on("error", (err) => {
      rejectWithDetail(err.toString());
    });
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      }
      rejectWithDetail(`Process exited with code ${code}`);
    });
    process.stdout.on("data", (data) => {
      output += data;
    });
    process.stderr.on("data", (data) => {
      errorOutput += data;
    });
  });
}
