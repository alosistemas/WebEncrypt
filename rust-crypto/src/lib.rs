// rust-crypto/src/lib.rs
use wasm_bindgen::prelude::*;
use aes::Aes256;
use block_modes::{BlockMode, Cbc};
use block_modes::block_padding::Pkcs7;
use base64::{engine::general_purpose, Engine as _};
use rand::rngs::OsRng;
use rand::RngCore;
use std::str;

// Alias del modo AES-256 CBC con relleno PKCS7
type Aes256Cbc = Cbc<Aes256, Pkcs7>;

#[wasm_bindgen]
pub fn generate_key_iv() -> JsValue {
    let mut key = [0u8; 32];
    let mut iv = [0u8; 16];
    OsRng.fill_bytes(&mut key);
    OsRng.fill_bytes(&mut iv);

    let key_b64 = general_purpose::STANDARD.encode(&key);
    let iv_b64 = general_purpose::STANDARD.encode(&iv);

    JsValue::from_serde(&serde_json::json!({
        "key": key_b64,
        "iv": iv_b64
    })).unwrap()
}

#[wasm_bindgen]
pub fn decrypt_csv(
    csv_data: &str,
    key_b64: &str,
    iv_b64: &str,
    sensitive_fields: &str,
) -> String {
    let key = match general_purpose::STANDARD.decode(key_b64) {
        Ok(k) => k,
        Err(_) => return "Error: clave base64 invalida".to_string(),
    };

    let iv = match general_purpose::STANDARD.decode(iv_b64) {
        Ok(i) => i,
        Err(_) => return "Error: IV base64 invalido".to_string(),
    };

    let cipher = match Aes256Cbc::new_from_slices(&key, &iv) {
        Ok(c) => c,
        Err(_) => return "Error: clave o IV incorrectos para AES-256-CBC".to_string(),
    };

    let mut lines = csv_data.lines();
    let header_line = match lines.next() {
        Some(h) => h,
        None => return "Error: CSV vacío".to_string(),
    };

    let headers: Vec<&str> = header_line.split(',').map(|s| s.trim_matches('"')).collect();
    let fields_to_decrypt: Vec<&str> = sensitive_fields.split(',').map(|s| s.trim()).collect();

    let mut output = vec![headers.join(",")];

    for line in lines {
        let values: Vec<&str> = line.split(',').map(|s| s.trim_matches('"')).collect();
        let mut row = vec![];

        for (i, value) in values.iter().enumerate() {
            let header = headers.get(i).unwrap_or(&"");
            if fields_to_decrypt.contains(header) {
                let decoded = match general_purpose::STANDARD.decode(value) {
                    Ok(d) => d,
                    Err(_) => {
                        row.push(value.to_string());
                        continue;
                    }
                };

                let decrypted_bytes = match cipher.clone().decrypt_vec(&decoded) {
                    Ok(b) => b,
                    Err(_) => {
                        row.push(value.to_string());
                        continue;
                    }
                };
                let decrypted_str = match String::from_utf8(decrypted_bytes) {
                    Ok(s) => s,
                    Err(_) => value.to_string(),
                };
                row.push(decrypted_str);
            } else {
                row.push(value.to_string());
            }
        }

        let quoted = row.iter().map(|v| format!("\"{}\"", v.replace('"', "\"\""))).collect::<Vec<_>>();
        output.push(quoted.join(","));
    }

    output.join("\n")
}

#[wasm_bindgen]
pub fn encrypt_csv(
    csv_data: &str,
    key_b64: &str,
    iv_b64: &str,
    sensitive_fields: &str,
) -> String {
    let key = match general_purpose::STANDARD.decode(key_b64) {
        Ok(k) => k,
        Err(_) => return "Error: clave base64 invalida".to_string(),
    };

    let iv = match general_purpose::STANDARD.decode(iv_b64) {
        Ok(i) => i,
        Err(_) => return "Error: IV base64 invalido".to_string(),
    };

    let cipher = match Aes256Cbc::new_from_slices(&key, &iv) {
        Ok(c) => c,
        Err(_) => return "Error: clave o IV incorrectos para AES-256-CBC".to_string(),
    };

    let mut lines = csv_data.lines();
    let header_line = match lines.next() {
        Some(h) => h,
        None => return "Error: CSV vacío".to_string(),
    };

    let headers: Vec<&str> = header_line.split(',').map(|s| s.trim_matches('"')).collect();
    let fields_to_encrypt: Vec<&str> = sensitive_fields.split(',').map(|s| s.trim()).collect();

    let mut output = vec![headers.join(",")];

    for line in lines {
        let values: Vec<&str> = line.split(',').map(|s| s.trim_matches('"')).collect();
        let mut row = vec![];

        for (i, value) in values.iter().enumerate() {
            let header = headers.get(i).unwrap_or(&"");
            if fields_to_encrypt.contains(header) {
                let encrypted_bytes = cipher.clone().encrypt_vec(value.as_bytes());
                let encoded = general_purpose::STANDARD.encode(&encrypted_bytes);
                row.push(encoded);
            } else {
                row.push(value.to_string());
            }
        }

        let quoted = row.iter().map(|v| format!("\"{}\"", v.replace('"', "\"\""))).collect::<Vec<_>>();
        output.push(quoted.join(","));
    }

    output.join("\n")
}
