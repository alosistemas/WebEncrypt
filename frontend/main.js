import init, { decrypt_csv, encrypt_csv, generate_key_iv } from "./pkg/rust_crypto.js";

await init();

function readCSVFile() {
  return new Promise((resolve) => {
    const file = document.getElementById("csvFile").files[0];
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  });
}

async function process(action) {
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
  const link = document.getElementById("download");
  link.href = url;
  link.download = action + "_output.csv";
  link.style.display = "block";
  link.textContent = `Descargar ${action}ed CSV`;
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