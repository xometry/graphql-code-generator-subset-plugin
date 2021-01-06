/* eslint-disable @typescript-eslint/no-namespace */
import { spawn } from "child_process";
import fs from "fs";
import {
  GraphQLSchema,
  buildSchema,
  isObjectType,
  isInterfaceType,
} from "graphql";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

const testDirectory = `${__dirname}/../../test`;

async function spawnOrOutput(
  command: string,
  args: ReadonlyArray<string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd: testDirectory,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    let processError: undefined | string;
    let processFinished = false;
    let stdoutFinished = false;
    let stderrFinished = false;

    function maybeResolve() {
      if (processFinished && stdoutFinished && stderrFinished) {
        if (processError) {
          reject(
            new Error(
              `subprocess failed: ${command} ${args.join(
                " "
              )}\n${processError}\nstdout: ${stdoutChunks.join(
                ""
              )}\nstderr: ${stderrChunks.join("")}`
            )
          );
        } else {
          resolve();
        }
      }
    }

    process.stdout?.on("error", (err) => {
      if (!processError) {
        processError = err.toString();
      }
      stdoutFinished = true;
      maybeResolve();
    });
    process.stdout?.on("close", () => {
      stdoutFinished = true;
      maybeResolve();
    });
    process.stdout?.on("data", (data) => stdoutChunks.push(data));

    process.stderr?.on("error", (err) => {
      if (!processError) {
        processError = err.toString();
      }
      stderrFinished = true;
      maybeResolve();
    });
    process.stderr?.on("data", (data) => stderrChunks.push(data));
    process.stderr?.on("close", () => {
      stderrFinished = true;
      maybeResolve();
    });

    process.on("error", (err) => {
      processError = err.toString();
      processFinished = true;
      maybeResolve();
    });
    process.on("exit", (code, signal) => {
      processFinished = true;
      if (code !== 0) {
        processError = `Process exited with code ${code}/signal ${signal}.`;
      }
      maybeResolve();
    });
  });
}

function runGenerator(configFile: string): Promise<void> {
  return mkdir(`${testDirectory}/generated`, { recursive: true }).then(() =>
    spawnOrOutput("graphql-code-generator", ["-c", configFile])
  );
}

/**
 * Run the base code generation tests. This will:
 *
 * * run graphql-code-generator with ${testid}-codegen.yaml, ensuring that it completes successfully
 * * run graphql-code-generator with ${testid}-codegen-check.yaml, ensuring that it completes successfully
 *
 * @param index  The test files to run: e.g. schema1.graphql etc.
 * @returns The contents of the generated subset schema ${testid}-subset-schema.graphql as a string.
 */
async function runBaseTests(testid: string) {
  await runGenerator(`${testid}-codegen.yml`);
  await runGenerator(`${testid}-codegen-check.yml`);
  const schemaText = await readFile(
    `${testDirectory}/${testid}-subset-schema.graphql`,
    {
      encoding: "utf8",
    }
  );
  const schema = buildSchema(schemaText);
  return {
    schemaText,
    schema,
  };
}

declare global {
  namespace jest {
    interface Matchers<R extends GraphQLSchema> {
      toHaveType(typeName: string): R;
      toHaveField(typeName: string, fieldName: string): R;
    }
  }
}

expect.extend({
  toHaveType(schema: GraphQLSchema, typeName: string) {
    const message = `Expected schema to contain type ${typeName}.`;
    const type = schema.getTypeMap()[typeName];

    const pass = type !== undefined;
    return { pass, message: () => message };
  },

  toHaveField(schema: GraphQLSchema, typeName: string, fieldName: string) {
    const type = schema.getTypeMap()[typeName];
    if (isObjectType(type) || isInterfaceType(type)) {
      const field = type.getFields()[fieldName];
      if (field !== undefined) {
        return {
          pass: true,
          message: () =>
            `Expected schema to contain field ${typeName}:${fieldName}.`,
        };
      }
      return {
        pass: false,
        message: () =>
          `Expected schema to contain field ${typeName}:${fieldName}.`,
      };
    }
    return {
      pass: false,
      message: () =>
        `Expected schema to contain field ${typeName}:${fieldName}, but the type is missing or not an interface or object.`,
    };
  },
});

test("basic", async () => {
  const { schema } = await runBaseTests("basic");

  expect(schema).toHaveType("User");
  expect(schema).toHaveType("Query");
  expect(schema).not.toHaveType("Mutation");
  expect(schema).not.toHaveType("CreateUserInput");
  expect(schema).not.toHaveType("HasName");
  expect(schema).toHaveField("User", "id");
  expect(schema).toHaveField("User", "email");
  expect(schema).toHaveField("Query", "me");
  expect(schema).not.toHaveField("User", "firstName");
  expect(schema).not.toHaveField("Query", "userById");
});
