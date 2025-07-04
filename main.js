import init, { decrypt_csv, encrypt_csv, generate_key_iv } from "./pkg/rust_crypto.js";

await init();

function readCSVFile() {
  return new Promise((resolve, reject) => {
    const file = document.getElementById("csvFile").files[0];
    if (!file) {
      return reject(new Error("No file selected."));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error); // Handle potential read errors
    reader.readAsText(file);
  });
}

async function process(action) {
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");
  const downloadLink = document.getElementById("download");

  // 1. Deshabilitar botones y mostrar estado de carga para mejor UX
  encryptBtn.disabled = true;
  decryptBtn.disabled = true;
  downloadLink.style.display = "none";
  const originalBtnText = action === "encrypt" ? encryptBtn.textContent : decryptBtn.textContent;
  if (action === "encrypt") encryptBtn.textContent = "Encriptando...";
  if (action === "decrypt") decryptBtn.textContent = "Desencriptando...";

  // 2. Envolver la lógica en un try...catch para manejar errores del WASM
  try {
    const csv = await readCSVFile();
    const key = document.getElementById("key").value.trim();
    const iv = document.getElementById("iv").value.trim();
    const fields = document.getElementById("fields").value.trim();

    console.log({csv, key, iv, fields});

    const result = action === "encrypt"
      ? encrypt_csv(csv, key, iv, fields)
      : decrypt_csv(csv, key, iv, fields);

    const blob = new Blob([result], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = action + "_output.csv";
    downloadLink.style.display = "block";
    downloadLink.textContent = `Descargar CSV ${action === 'encrypt' ? 'encriptado' : 'desencriptado'}`;
  } catch (error) {
    console.error("Error durante el proceso:", error);
    alert(`Ocurrió un error: ${error}.\n\nRevisa que la clave, el IV y los datos del CSV sean correctos.`);
  } finally {
    // 3. Restaurar los botones siempre, incluso si hay un error
    if (action === "encrypt") encryptBtn.textContent = originalBtnText;
    if (action === "decrypt") decryptBtn.textContent = originalBtnText;
    checkFields(); // Re-evalúa si los botones deben estar habilitados
  }
}
document.getElementById("encryptBtn").addEventListener("click", () => process("encrypt"));
document.getElementById("decryptBtn").addEventListener("click", () => process("decrypt"));

document.getElementById("generateKeyIvBtn").addEventListener("click", () => {
  const { key, iv } = generate_key_iv();
  document.getElementById("key").value = key;
  document.getElementById("iv").value = iv;
});

function checkFields() {
  const fileInput = document.getElementById("csvFile");
  const keyInput = document.getElementById("key");
  const ivInput = document.getElementById("iv");
  const fieldsInput = document.getElementById("fields");

  const file = fileInput.files.length > 0;
  const key = keyInput.value.trim().length > 0;
  const iv = ivInput.value.trim().length > 0;
  const fields = fieldsInput.value.trim().length > 0;

  // Mensajes de error
  document.getElementById("csvFileError").textContent = file ? "" : "Selecciona un archivo CSV.";
  document.getElementById("keyError").textContent = key ? "" : "Ingresa la clave en Base64.";
  document.getElementById("ivError").textContent = iv ? "" : "Ingresa el IV en Base64.";
  document.getElementById("fieldsError").textContent = fields ? "" : "Ingresa al menos un campo.";

  const enable = file && key && iv && fields;
  document.getElementById("encryptBtn").disabled = !enable;
  document.getElementById("decryptBtn").disabled = !enable;
}

// Escucha cambios en todos los campos relevantes
["csvFile", "key", "iv", "fields"].forEach(id => {
  document.getElementById(id).addEventListener("input", checkFields);
  document.getElementById(id).addEventListener("change", checkFields);
});

// Llama una vez al cargar para el estado inicial
checkFields();
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("csvFile");

// Efecto visual al arrastrar
["dragenter", "dragover"].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove("dragover");
  });
});

// Manejo del archivo soltado
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropArea.classList.remove("dragover");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event("change")); // Para actualizar validación
  }
});