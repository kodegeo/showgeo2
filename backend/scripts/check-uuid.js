const fs = require("fs");

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

if (schema.includes("@id") && !schema.includes("@db.Uuid")) {
  console.error("ERROR: All IDs must use @db.Uuid");
  process.exit(1);
}

console.log("UUID schema check passed");