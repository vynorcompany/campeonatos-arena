import assert from "node:assert/strict";
import test from "node:test";
import { capitalizeClientName, matchesSearch } from "../src/lib/clients/name-search";
import { createClientSchema, updateClientSchema } from "../src/lib/validators/player";

test("name searches accept missing middle names, accents, whitespace and different case", () => {
  assert.ok(matchesSearch("Paulo Marcelo Kaufman", "Paulo Kaufman"));
  assert.ok(matchesSearch("Jéssica Maria Pfleger", "  JESSICA   Pfleger "));
  assert.ok(matchesSearch("Paulo Marcelo Kaufman", "Kaufman Paulo"));
  assert.equal(matchesSearch("Paulo Marcelo Kaufman", "Paulo Silva"), false);
  assert.ok(matchesSearch("Paulo", ""));
});
test("new client names capitalize words without destroying spelling or acronyms", () => {
  assert.equal(capitalizeClientName("  paulo   marcelo kaufman "), "Paulo Marcelo Kaufman");
  assert.equal(capitalizeClientName("ana-clara d’ávila"), "Ana-Clara D’Ávila");
  assert.equal(capitalizeClientName("VYNOR LTDA"), "VYNOR LTDA");
  const data = {name:"paulo marcelo kaufman",points:0,class:"",gender:"",phone:"",email:"",cpf:""};
  assert.equal(createClientSchema.parse(data).name,"Paulo Marcelo Kaufman");
  assert.equal(updateClientSchema.parse({...data,playerId:"client"}).name,"paulo marcelo kaufman");
});
