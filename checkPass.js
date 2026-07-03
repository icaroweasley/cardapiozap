const bcrypt = require('bcryptjs');
const hash = "$2b$10$Etd1YNGTOQPIur4zi8FwUepm1kv8S90JDbHbQHCOh2ANhnWQMBlPm";
const commonPasswords = ["123456", "12345678", "senha123", "rafaela", "rafaela123", "capote", "rafaelacapote"];
(async () => {
  for (let p of commonPasswords) {
    if (await bcrypt.compare(p, hash)) {
      console.log("FOUND PASSWORD:", p);
      return;
    }
  }
  console.log("NOT FOUND IN COMMON LIST");
})();
