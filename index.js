/// @ts-check

/*

To compose and validate the subgraphs:
1. Add <subgraph-name>.graphql files in /playground directory.
2. Run `npm start`.
It will generate a supergraph schema in /playground/_supergraph.graphql or print errors.


If you wish to see a query plan:
1. Add a query in /playground/_query.graphql 
2. Run `npm start -- --plan`.

*/

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse, print, Source } from "graphql";
import { composeServices } from "@apollo/composition";
import {
  operationFromDocument,
  Supergraph,
} from "@apollo/federation-internals";
import { prettyFormatQueryPlan, QueryPlanner } from "@apollo/query-planner";

/**
 *
 * @param {string} directoryName
 * @returns {Array<{ name: string, typeDefs: import('graphql').DocumentNode }>}
 */
function fromDirectory(directoryName) {
  const filepaths = readdirSync(directoryName);
  return filepaths
    .filter(
      (f) =>
        f.endsWith(".graphql") &&
        !f.endsWith("_supergraph.graphql") &&
        !f.endsWith("_query.graphql")
    )
    .map((f) => {
      const originalNameSourceFile = join(
        directoryName,
        f.replace(".graphql", ".log")
      );
      let name = basename(f).replace(".graphql", "").replace("_", "-");

      if (existsSync(originalNameSourceFile)) {
        name = readFileSync(originalNameSourceFile, "utf-8");
      }

      const typeDefs = parse(
        new Source(readFileSync(join(directoryName, f), "utf-8"), f)
      );

      writeFileSync(join(directoryName, f), print(typeDefs));

      return {
        name,
        typeDefs,
      };
    });
}

const services = fromDirectory("./playground");

const result = composeServices(services);
const hasErrors = "errors" in result && result.errors && result.errors.length;
console.log(hasErrors ? "❌ Failed" : "✅ Succeeded");

if (hasErrors) {
  console.log(
    result.errors
      .map((e) => (e.extensions.code ?? "") + " " + e.message)
      .join("\n\n")
  );
} else {
  writeFileSync("./playground/_supergraph.graphql", result.supergraphSdl);

  if (process.argv.includes("--plan")) {
    const supergraph = Supergraph.build(result.supergraphSdl);
    const planner = new QueryPlanner(supergraph);
    const query = parse(readFileSync("./playground/_query.graphql", "utf-8"));
    const operation = operationFromDocument(supergraph.schema, query);

    console.log(prettyFormatQueryPlan(planner.buildQueryPlan(operation)));
  }
}
