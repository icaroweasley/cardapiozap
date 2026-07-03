const axios = require('axios');

const apiUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
const apiKey = 'evolution_api_key_12345';

async function clearInstances() {
  try {
    const res = await axios.get(`${apiUrl}/instance/fetchInstances`, {
      headers: { apikey: apiKey }
    });
    const instances = res.data;
    console.log(`Found ${instances.length} instances to delete.`);
    for (const inst of instances) {
      const name = inst.instance?.instanceName || inst.instanceName;
      if (name) {
        console.log(`Deleting ${name}...`);
        try {
          await axios.delete(`${apiUrl}/instance/logout/${name}`, { headers: { apikey: apiKey } });
        } catch(e) {}
        try {
          await axios.delete(`${apiUrl}/instance/delete/${name}`, { headers: { apikey: apiKey } });
        } catch(e) {
          console.error(`Failed to delete ${name}`, e?.response?.data || e.message);
        }
      }
    }
    console.log("All instances deleted.");
  } catch (error) {
    console.error("Error fetching instances", error?.response?.data || error.message);
  }
}
clearInstances();
