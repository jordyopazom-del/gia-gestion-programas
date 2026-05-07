import { initDatabase } from "../src/actions/dbInit";

async function run() {
    console.log("Iniciando actualización de esquema...");
    const res = await initDatabase();
    if (res.success) {
        console.log("✅ Esquema actualizado exitosamente.");
    } else {
        console.error("❌ Error:", res.error);
    }
}

run();
