// Generates packages/api/src/schema.d.ts from apps/server/openapi.yaml.
// Pass another output path to write the result there instead.
//
// openapi-typescript turns a schema with `x-extensible-enum` into `string`.
// This keeps the known values as a union, so the apps still catch typos.
// The contract check treats new values as safe, so the list can grow.
import { writeFileSync } from "node:fs";
import openapiTS, { astToString, COMMENT_HEADER, NULL, tsLiteral, tsUnion } from "openapi-typescript";

const source = new URL("../apps/server/openapi.yaml", import.meta.url);
const output = process.argv[2] ?? new URL("../packages/api/src/schema.d.ts", import.meta.url);

const ast = await openapiTS(source, {
  transform(schema) {
    const values = schema["x-extensible-enum"];
    if (!Array.isArray(values)) return undefined;
    const known = values.map((value) => tsLiteral(value));
    return tsUnion(schema.nullable ? [...known, NULL] : known);
  },
});

writeFileSync(output, `${COMMENT_HEADER}${astToString(ast)}`);
