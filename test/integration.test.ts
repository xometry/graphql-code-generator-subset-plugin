/* eslint-disable @typescript-eslint/no-namespace */
import fs from "fs";
import {
  GraphQLSchema,
  buildSchema,
  isObjectType,
  isInterfaceType,
  isInputObjectType,
} from "graphql";
import { promisify } from "util";

import { execAndCheck } from "./testUtil";

const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

const testDirectory = `${__dirname}/../../test`;

function envWithVerbose() {
  const newEnv = Object.create(process.env);
  newEnv.VERBOSE = "1";
  return newEnv;
}

function runGenerator(configFile: string): Promise<void> {
  return mkdir(`${testDirectory}/generated`, { recursive: true }).then(() =>
    execAndCheck("graphql-code-generator", ["-c", configFile], {
      cwd: testDirectory,
      env: envWithVerbose(),
    })
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
    `${testDirectory}/generated/${testid}-subset-schema.graphql`,
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
    if (
      isObjectType(type) ||
      isInterfaceType(type) ||
      isInputObjectType(type)
    ) {
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

test("input", async () => {
  const { schema } = await runBaseTests("input");

  expect(schema).toHaveType("User");
  expect(schema).toHaveType("Mutation");
  expect(schema).toHaveType("CreateUserInput");
  expect(schema).toHaveField("User", "id");
  expect(schema).not.toHaveField("User", "lastName");
  expect(schema).toHaveField("CreateUserInput", "firstName");
  expect(schema).toHaveField("CreateUserInput", "email");
});

test("union", async () => {
  const { schema } = await runBaseTests("union");

  expect(schema).toHaveType("Droid");
  expect(schema).not.toHaveType("Starship");
  expect(schema).toHaveField("Droid", "type");
  expect(schema).not.toHaveField("Droid", "identifier");
});

test("union-unused", async () => {
  await expect(runBaseTests("union-unused")).rejects.toThrow(
    /documents reference union "Character"/
  );
});
