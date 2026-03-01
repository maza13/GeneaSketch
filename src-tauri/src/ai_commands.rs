use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const OPENAI_ENDPOINT: &str = "https://api.openai.com/v1/chat/completions";
const OPENAI_RESPONSES_ENDPOINT: &str = "https://api.openai.com/v1/responses";
const OPENAI_MODELS_ENDPOINT: &str = "https://api.openai.com/v1/models";
const GEMINI_ENDPOINT_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models";
const AI_HTTP_TIMEOUT_SECS: u64 = 45;
const AI_DIAGNOSTIC_LOG_FILE: &str = "ai_diagnostics.log";
const AI_DIAGNOSTIC_LOG_ROTATED_FILE: &str = "ai_diagnostics.log.1";
const AI_DIAGNOSTIC_LOG_MAX_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct StoredCredentials {
    openai_api_key: Option<String>,
    gemini_api_key: Option<String>,
    updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCredentialPayload {
    pub openai_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCredentialStatus {
    pub has_open_ai_key: bool,
    pub has_gemini_key: bool,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiValidateRequest {
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiValidateResponse {
    pub valid: bool,
    pub message: String,
    pub status_code: Option<u16>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiInvokeProviderRequest {
    pub provider: String,
    pub model: String,
    pub system_prompt: String,
    pub user_prompt: String,
    pub max_output_tokens: u32,
    pub temperature: Option<f32>,
    pub preferred_api: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiInvokeProviderResponse {
    pub text: String,
    pub provider: String,
    pub model: String,
    pub raw_body: Option<String>,
    pub api_used: Option<String>,
    pub finish_reason: Option<String>,
    pub provider_warnings: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiListModelsRequest {
    pub provider: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiModelCatalogEntry {
    pub id: String,
    pub label: String,
    pub recommended: bool,
    pub is_preview: bool,
    pub price: Option<String>,
    pub price_out: Option<String>,
    pub intelligence: Option<u8>,
    pub is_reasoning: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiListModelsResponse {
    pub provider: String,
    pub models: Vec<AiModelCatalogEntry>,
    pub fetched_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiDiagnosticEntry {
    pub timestamp: String,
    pub run_id: String,
    pub stage: String,
    pub provider: String,
    pub model: String,
    pub status_code: Option<u16>,
    pub reason_short: Option<String>,
    pub is_timeout: Option<bool>,
    pub elapsed_ms: Option<u64>,
    pub retry_count: u32,
    pub fallback_from: Option<String>,
    pub context_kind: String,
    pub text_length: u32,
    pub message_redacted: String,
    pub technical_detail_redacted: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiAppendDiagnosticLogRequest {
    pub entry: AiDiagnosticEntry,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiReadDiagnosticLogResponse {
    pub path: String,
    pub contents: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Option<Vec<OpenAiChoice>>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: Option<OpenAiMessage>,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAiMessage {
    content: Option<Value>,
    refusal: Option<String>,
}

fn extract_openai_message_text(message: &OpenAiMessage) -> Option<String> {
    if let Some(content) = &message.content {
        match content {
            Value::String(s) => {
                if !s.trim().is_empty() {
                    return Some(s.clone());
                }
            }
            Value::Array(items) => {
                let mut chunks: Vec<String> = Vec::new();
                for item in items {
                    if let Value::Object(obj) = item {
                        if let Some(Value::String(text)) = obj.get("text") {
                            if !text.trim().is_empty() {
                                chunks.push(text.clone());
                            }
                        }
                    }
                }
                if !chunks.is_empty() {
                    return Some(chunks.join("\n"));
                }
            }
            _ => {}
        }
    }

    if let Some(refusal) = &message.refusal {
        if !refusal.trim().is_empty() {
            return Some(format!("REFUSAL: {refusal}"));
        }
    }

    None
}

fn extract_responses_text(parsed: &Value) -> (String, Option<String>) {
    let finish_reason = parsed
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if let Some(output_text) = parsed.get("output_text") {
        if let Some(text) = output_text.as_str() {
            if !text.trim().is_empty() {
                return (text.to_string(), finish_reason);
            }
        }
    }

    if let Some(output) = parsed.get("output").and_then(|v| v.as_array()) {
        let mut chunks: Vec<String> = Vec::new();
        for node in output {
            if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
                for part in content {
                    if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                        if !text.trim().is_empty() {
                            chunks.push(text.to_string());
                        }
                    }
                    if let Some(refusal) = part.get("refusal").and_then(|v| v.as_str()) {
                        if !refusal.trim().is_empty() {
                            chunks.push(format!("REFUSAL: {refusal}"));
                        }
                    }
                }
            }
        }
        if !chunks.is_empty() {
            return (chunks.join("\n"), finish_reason);
        }
    }

    (String::new(), finish_reason)
}

fn parse_status_code(message: &str) -> Option<u16> {
    let marker = "HTTP_";
    let idx = message.find(marker)?;
    let rest = &message[idx + marker.len()..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse::<u16>().ok()
}

fn is_openai_responses_compat_error(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    matches!(parse_status_code(message), Some(400) | Some(404) | Some(422))
        || lower.contains("unsupported")
        || lower.contains("unknown")
        || lower.contains("not found")
}

#[derive(Debug, Deserialize)]
struct OpenAiModelsResponse {
    data: Option<Vec<OpenAiModelItem>>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModelItem {
    id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiContent>,
}

#[derive(Debug, Deserialize)]
struct GeminiContent {
    parts: Option<Vec<GeminiPart>>,
}

#[derive(Debug, Deserialize)]
struct GeminiPart {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GeminiModelsResponse {
    models: Option<Vec<GeminiModelItem>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiModelItem {
    name: Option<String>,
    display_name: Option<String>,
    supported_generation_methods: Option<Vec<String>>,
}

fn now_iso_like() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now}")
}

fn config_base_dir() -> Result<PathBuf, String> {
    let mut base = dirs::config_dir()
        .ok_or_else(|| "No se pudo resolver directorio de configuración.".to_string())?;
    base.push("GeneaSketch");
    if !base.exists() {
        fs::create_dir_all(&base)
            .map_err(|err| format!("No se pudo crear directorio de configuración: {err}"))?;
    }
    Ok(base)
}

fn credentials_path() -> Result<PathBuf, String> {
    let mut base = config_base_dir()?;
    base.push("ai_credentials.json");
    Ok(base)
}

fn diagnostic_log_path() -> Result<PathBuf, String> {
    let mut base = config_base_dir()?;
    base.push(AI_DIAGNOSTIC_LOG_FILE);
    Ok(base)
}

fn build_http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(AI_HTTP_TIMEOUT_SECS))
        .build()
        .map_err(|err| format!("HTTP_CLIENT_INIT: {err}"))
}

fn normalize_secret(value: Option<String>) -> Option<String> {
    match value {
        Some(raw) => {
            let trimmed = raw.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        }
        None => None,
    }
}

fn read_credentials() -> Result<StoredCredentials, String> {
    let path = credentials_path()?;
    if !path.exists() {
        return Ok(StoredCredentials::default());
    }
    let raw =
        fs::read_to_string(path).map_err(|err| format!("No se pudo leer credenciales: {err}"))?;
    serde_json::from_str(&raw).map_err(|err| format!("Credenciales inválidas: {err}"))
}

fn write_credentials(credentials: &StoredCredentials) -> Result<(), String> {
    let path = credentials_path()?;
    let payload = serde_json::to_string_pretty(credentials)
        .map_err(|err| format!("No se pudo serializar credenciales: {err}"))?;
    fs::write(path, payload).map_err(|err| format!("No se pudo guardar credenciales: {err}"))
}

fn build_status(credentials: &StoredCredentials) -> AiCredentialStatus {
    AiCredentialStatus {
        has_open_ai_key: credentials
            .openai_api_key
            .as_ref()
            .is_some_and(|value| !value.trim().is_empty()),
        has_gemini_key: credentials
            .gemini_api_key
            .as_ref()
            .is_some_and(|value| !value.trim().is_empty()),
        updated_at: credentials.updated_at.clone(),
    }
}

fn extract_status_code(message: &str) -> Option<u16> {
    let raw = message.strip_prefix("HTTP_")?;
    raw.split(':')
        .next()
        .and_then(|value| value.parse::<u16>().ok())
}

fn classify_reason_short(message: &str) -> Option<String> {
    let lower = message.to_ascii_lowercase();
    if lower.contains("insufficient_quota") {
        return Some("insufficient_quota".to_string());
    }
    if lower.contains("rate_limit_exceeded") || lower.contains("rate limited") {
        return Some("rate_limit_exceeded".to_string());
    }
    if lower.contains("resource_exhausted") {
        return Some("resource_exhausted".to_string());
    }
    if lower.contains("timed out") || lower.contains("timeout") {
        return Some("timeout".to_string());
    }
    compact_reason_from_body(message)
}

fn redact_sensitive_text(input: &str) -> String {
    let mut redacted = input.replace("\r", "");
    for prefix in ["Bearer ", "bearer ", "Authorization:", "authorization:"] {
        redacted = redacted.replace(prefix, "[REDACTED_AUTH] ");
    }
    for token_prefix in ["sk-", "AIza"] {
        let mut output = String::with_capacity(redacted.len());
        for word in redacted.split_whitespace() {
            if word.starts_with(token_prefix) {
                output.push_str("[REDACTED_TOKEN]");
            } else {
                output.push_str(word);
            }
            output.push(' ');
        }
        redacted = output.trim_end().to_string();
    }
    if redacted.len() > 8000 {
        redacted.truncate(8000);
        redacted.push_str("...<truncated>");
    }
    redacted
}

fn rotate_diagnostic_log_if_needed(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let metadata = fs::metadata(path).map_err(|err| format!("LOG_METADATA: {err}"))?;
    if metadata.len() < AI_DIAGNOSTIC_LOG_MAX_BYTES {
        return Ok(());
    }
    let mut rotated = path.clone();
    rotated.set_file_name(AI_DIAGNOSTIC_LOG_ROTATED_FILE);
    if rotated.exists() {
        fs::remove_file(&rotated).map_err(|err| format!("LOG_ROTATE_REMOVE: {err}"))?;
    }
    fs::rename(path, rotated).map_err(|err| format!("LOG_ROTATE_RENAME: {err}"))?;
    Ok(())
}

fn append_diagnostic_log(entry: &AiDiagnosticEntry) -> Result<PathBuf, String> {
    let path = diagnostic_log_path()?;
    rotate_diagnostic_log_if_needed(&path)?;
    let line = serde_json::to_string(entry).map_err(|err| format!("LOG_SERIALIZE: {err}"))?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|err| format!("LOG_OPEN: {err}"))?;
    file.write_all(line.as_bytes())
        .and_then(|_| file.write_all(b"\n"))
        .map_err(|err| format!("LOG_WRITE: {err}"))?;
    Ok(path)
}

fn compact_reason_from_body(body: &str) -> Option<String> {
    let parsed: Value = serde_json::from_str(body).ok()?;
    let error = parsed.get("error")?;
    let reason = error
        .get("code")
        .and_then(Value::as_str)
        .or_else(|| error.get("status").and_then(Value::as_str))
        .or_else(|| error.get("type").and_then(Value::as_str))
        .or_else(|| error.get("message").and_then(Value::as_str))?;
    let first_line = reason.lines().next().unwrap_or(reason).trim();
    if first_line.is_empty() {
        return None;
    }
    Some(first_line.chars().take(160).collect())
}

fn format_provider_http_error(provider: &str, status: u16, body: &str) -> String {
    let reason = compact_reason_from_body(body).unwrap_or_else(|| "unknown_error".to_string());
    format!(
        "HTTP_{status}: provider={provider}; reason={reason}; details={body}",
        status = status,
        provider = provider,
        reason = reason,
        body = body
    )
}

fn is_openai_text_model(model_id: &str) -> bool {
    let id = model_id.to_ascii_lowercase();
    if id.starts_with("text-embedding")
        || id.starts_with("whisper")
        || id.starts_with("tts")
        || id.starts_with("omni-moderation")
    {
        return false;
    }
    id.starts_with("gpt-") || id.starts_with("chatgpt-") || (id.starts_with('o') && !id.starts_with("omni-"))
}

fn is_preview_model(model_id: &str, label: &str) -> bool {
    let lower = format!(
        "{} {}",
        model_id.to_ascii_lowercase(),
        label.to_ascii_lowercase()
    );
    lower.contains("preview")
        || lower.contains("experimental")
        || lower.contains("exp-")
        || lower.contains("-exp")
        || lower.contains("beta")
}

fn enrich_model_metadata(entry: &mut AiModelCatalogEntry) {
    let id = entry.id.to_ascii_lowercase();
    match id.as_str() {
        "gpt-5-nano" => {
            entry.price = Some("$0.05".to_string());
            entry.price_out = Some("$0.40".to_string());
            entry.intelligence = Some(3);
            entry.is_reasoning = Some(true);
        }
        "gpt-5-mini" => {
            entry.price = Some("$0.25".to_string());
            entry.price_out = Some("$2.00".to_string());
            entry.intelligence = Some(4);
            entry.is_reasoning = Some(true);
        }
        "gpt-5" => {
            entry.price = Some("$1.25".to_string());
            entry.price_out = Some("$10.00".to_string());
            entry.intelligence = Some(5);
            entry.is_reasoning = Some(true);
        }
        "gpt-5.1" | "gpt-5.1-mini" => {
            entry.price = Some("$1.75".to_string());
            entry.price_out = Some("$14.00".to_string());
            entry.intelligence = Some(5);
            entry.is_reasoning = Some(true);
        }
        "o4-mini" => {
            entry.price = Some("$1.10".to_string());
            entry.price_out = Some("$4.40".to_string());
            entry.intelligence = Some(4);
            entry.is_reasoning = Some(true);
        }
        "o3-mini" => {
            entry.price = Some("Low".to_string());
            entry.price_out = Some("Low".to_string());
            entry.intelligence = Some(4);
            entry.is_reasoning = Some(true);
        }
        "gpt-4o" => {
            entry.price = Some("$5.00".to_string());
            entry.price_out = Some("$20.00".to_string());
            entry.intelligence = Some(4);
        }
        "gpt-4o-mini" => {
            entry.price = Some("$0.15".to_string());
            entry.price_out = Some("$0.60".to_string());
            entry.intelligence = Some(3);
        }
        // Gemini
        "gemini-2.5-flash" => {
            entry.price = Some("Free*".to_string());
            entry.price_out = Some("Free*".to_string());
            entry.intelligence = Some(4);
        }
        "gemini-2.0-flash" => {
            entry.price = Some("$0.10".to_string());
            entry.price_out = Some("$0.40".to_string());
            entry.intelligence = Some(4);
        }
        "gemini-1.5-pro" => {
            entry.price = Some("$1.25".to_string());
            entry.price_out = Some("$3.75".to_string());
            entry.intelligence = Some(5);
        }
        "gemini-1.5-flash" => {
            entry.price = Some("$0.075".to_string());
            entry.price_out = Some("$0.30".to_string());
            entry.intelligence = Some(3);
        }
        _ => {}
    }
}

fn mark_recommended(models: &mut [AiModelCatalogEntry], priority: &[&str]) {
    if models.is_empty() {
        return;
    }
    let mut recommended_idx: Option<usize> = None;
    for preferred in priority {
        if let Some(idx) = models
            .iter()
            .position(|entry| entry.id.eq_ignore_ascii_case(preferred))
        {
            recommended_idx = Some(idx);
            break;
        }
    }
    let index = recommended_idx.unwrap_or(0);
    for (i, item) in models.iter_mut().enumerate() {
        item.recommended = i == index;
    }
}

fn dedupe_models(models: Vec<AiModelCatalogEntry>) -> Vec<AiModelCatalogEntry> {
    let mut seen = HashSet::new();
    let mut unique = Vec::with_capacity(models.len());
    for entry in models {
        let key = entry.id.to_ascii_lowercase();
        if seen.insert(key) {
            let mut enriched = entry;
            enrich_model_metadata(&mut enriched);
            unique.push(enriched);
        }
    }
    unique
}

fn apply_sort_and_recommended(
    mut models: Vec<AiModelCatalogEntry>,
    priority: &[&str],
) -> Vec<AiModelCatalogEntry> {
    let priority_index = |id: &str| -> usize {
        priority
            .iter()
            .position(|candidate| candidate.eq_ignore_ascii_case(id))
            .unwrap_or(priority.len() + 1000)
    };
    models.sort_by(|a, b| {
        let pa = priority_index(&a.id);
        let pb = priority_index(&b.id);
        if pa != pb {
            return pa.cmp(&pb);
        }
        a.id.cmp(&b.id)
    });
    mark_recommended(&mut models, priority);
    models
}

async fn list_openai_models(client: &Client, api_key: &str) -> Result<Vec<AiModelCatalogEntry>, String> {
    let response = client
        .get(OPENAI_MODELS_ENDPOINT)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|err| format!("NETWORK: {err}"))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format_provider_http_error("chatgpt", status.as_u16(), &body));
    }

    let parsed: OpenAiModelsResponse =
        serde_json::from_str(&body).map_err(|err| format!("PARSE_OPENAI_MODELS: {err}. body={body}"))?;

    let models = parsed
        .data
        .unwrap_or_default()
        .into_iter()
        .filter_map(|item| item.id)
        .filter(|id| is_openai_text_model(id))
        .map(|id| {
            let is_preview = is_preview_model(&id, &id);
            AiModelCatalogEntry {
                id: id.clone(),
                label: id,
                recommended: false,
                is_preview,
                price: None,
                price_out: None,
                intelligence: None,
                is_reasoning: None,
            }
        })
        .collect::<Vec<_>>();

    let unique = dedupe_models(models);
    Ok(apply_sort_and_recommended(
        unique,
        &[
            "gpt-5-nano",
            "gpt-5-mini",
            "gpt-5",
            "gpt-5.1",
            "o4-mini",
            "o3-mini",
            "gpt-4o-mini",
            "gpt-4o",
        ],
    ))
}

async fn list_gemini_models(client: &Client, api_key: &str) -> Result<Vec<AiModelCatalogEntry>, String> {
    let endpoint = format!("{base}?key={key}", base = GEMINI_ENDPOINT_BASE, key = api_key);
    let response = client
        .get(endpoint)
        .send()
        .await
        .map_err(|err| format!("NETWORK: {err}"))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format_provider_http_error("gemini", status.as_u16(), &body));
    }

    let parsed: GeminiModelsResponse =
        serde_json::from_str(&body).map_err(|err| format!("PARSE_GEMINI_MODELS: {err}. body={body}"))?;

    let models = parsed
        .models
        .unwrap_or_default()
        .into_iter()
        .filter(|item| {
            item.supported_generation_methods
                .as_ref()
                .is_some_and(|methods| methods.iter().any(|method| method.eq_ignore_ascii_case("generateContent")))
        })
        .filter_map(|item| {
            let raw_name = item.name?;
            let id = raw_name.strip_prefix("models/").unwrap_or(&raw_name).to_string();
            if id.trim().is_empty() {
                return None;
            }
            let label = item
                .display_name
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| id.clone());
            let is_preview = is_preview_model(&id, &label);
            Some(AiModelCatalogEntry {
                id,
                label,
                recommended: false,
                is_preview,
                price: None,
                price_out: None,
                intelligence: None,
                is_reasoning: None,
            })
        })
        .collect::<Vec<_>>();

    let unique = dedupe_models(models);
    Ok(apply_sort_and_recommended(
        unique,
        &[
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-pro",
        ],
    ))
}

async fn invoke_openai_chat_completions(
    client: &Client,
    api_key: &str,
    req: &AiInvokeProviderRequest,
) -> Result<AiInvokeProviderResponse, String> {
    let mut payload = json!({
        "model": req.model,
        "messages": [
            {
                "role": "system",
                "content": req.system_prompt
            },
            {
                "role": "user",
                "content": req.user_prompt
            }
        ],
        "max_completion_tokens": req.max_output_tokens,
    });

    if let Some(t) = req.temperature {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("temperature".to_string(), json!(t));
        }
    }

    let response = client
        .post(OPENAI_ENDPOINT)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("NETWORK: {err}"))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format_provider_http_error("chatgpt", status.as_u16(), &body));
    }

    let parsed: OpenAiResponse =
        serde_json::from_str(&body).map_err(|err| format!("PARSE_OPENAI: {err}. body={body}"))?;

    if let Some(choices) = parsed.choices {
        if let Some(choice) = choices.get(0) {
            if let Some(message) = &choice.message {
                if let Some(content) = extract_openai_message_text(message) {
                    return Ok(AiInvokeProviderResponse {
                        text: content,
                        provider: "chatgpt".to_string(),
                        model: req.model.clone(),
                        raw_body: Some(body),
                        api_used: Some("chat_completions".to_string()),
                        finish_reason: choice.finish_reason.clone(),
                        provider_warnings: None,
                    });
                }
            }
            if let Some(reason) = &choice.finish_reason {
                return Err(format!(
                    "OPENAI_EMPTY_RESPONSE: finish_reason={reason}; body={body}"
                ));
            }
        }
    }

    Err(format!("OPENAI_EMPTY_RESPONSE: body={body}"))
}

async fn invoke_openai_responses(
    client: &Client,
    api_key: &str,
    req: &AiInvokeProviderRequest,
) -> Result<AiInvokeProviderResponse, String> {
    let mut payload = json!({
        "model": req.model,
        "input": [
            { "role": "system", "content": req.system_prompt },
            { "role": "user", "content": req.user_prompt }
        ],
        "max_output_tokens": req.max_output_tokens
    });
    if let Some(t) = req.temperature {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("temperature".to_string(), json!(t));
        }
    }

    let response = client
        .post(OPENAI_RESPONSES_ENDPOINT)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("NETWORK: {err}"))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format_provider_http_error("chatgpt", status.as_u16(), &body));
    }

    let parsed: Value =
        serde_json::from_str(&body).map_err(|err| format!("PARSE_OPENAI_RESPONSES: {err}. body={body}"))?;
    let (text, finish_reason) = extract_responses_text(&parsed);
    Ok(AiInvokeProviderResponse {
        text,
        provider: "chatgpt".to_string(),
        model: req.model.clone(),
        raw_body: Some(body),
        api_used: Some("responses".to_string()),
        finish_reason,
        provider_warnings: None,
    })
}

async fn invoke_openai(
    client: &Client,
    api_key: &str,
    req: &AiInvokeProviderRequest,
) -> Result<AiInvokeProviderResponse, String> {
    let preferred = req
        .preferred_api
        .as_deref()
        .unwrap_or("auto")
        .to_ascii_lowercase();

    if preferred == "chat_completions" {
        return invoke_openai_chat_completions(client, api_key, req).await;
    }
    if preferred == "responses" {
        return invoke_openai_responses(client, api_key, req).await;
    }

    match invoke_openai_responses(client, api_key, req).await {
        Ok(response) => {
            if !response.text.trim().is_empty() {
                return Ok(response);
            }
            let mut fallback = invoke_openai_chat_completions(client, api_key, req).await?;
            fallback.provider_warnings = Some(vec!["responses_empty_output_fallback_to_chat_completions".to_string()]);
            Ok(fallback)
        }
        Err(err) => {
            if is_openai_responses_compat_error(&err) {
                let mut fallback = invoke_openai_chat_completions(client, api_key, req).await?;
                fallback.provider_warnings =
                    Some(vec![format!("responses_fallback_reason:{err}")]);
                Ok(fallback)
            } else {
                Err(err)
            }
        }
    }
}

async fn invoke_gemini(
    client: &Client,
    api_key: &str,
    req: &AiInvokeProviderRequest,
) -> Result<AiInvokeProviderResponse, String> {
    let endpoint = format!(
        "{}/{model}:generateContent?key={key}",
        GEMINI_ENDPOINT_BASE,
        model = req.model,
        key = api_key
    );
    let mut config = json!({
        "maxOutputTokens": req.max_output_tokens
    });
    if let Some(t) = req.temperature {
        if let Some(obj) = config.as_object_mut() {
            obj.insert("temperature".to_string(), json!(t));
        }
    }
    let payload = json!({
        "system_instruction": { "parts": [{ "text": req.system_prompt }] },
        "contents": [{ "parts": [{ "text": req.user_prompt }] }],
        "generation_config": config
    });

    let response = client
        .post(endpoint)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("NETWORK: {err}"))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format_provider_http_error("gemini", status.as_u16(), &body));
    }

    let parsed: GeminiResponse =
        serde_json::from_str(&body).map_err(|err| format!("PARSE_GEMINI: {err}. body={body}"))?;

    if let Some(candidates) = parsed.candidates {
        for candidate in candidates {
            if let Some(content) = candidate.content {
                if let Some(parts) = content.parts {
                    for part in parts {
                        if let Some(text) = part.text {
                            if !text.trim().is_empty() {
                                return Ok(AiInvokeProviderResponse {
                                    text,
                                    provider: "gemini".to_string(),
                                    model: req.model.clone(),
                                    raw_body: Some(body),
                                    api_used: Some("gemini_generate_content".to_string()),
                                    finish_reason: None,
                                    provider_warnings: None,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Err(format!("GEMINI_EMPTY_RESPONSE: body={body}"))
}

#[tauri::command]
pub fn ai_append_diagnostic_log(request: AiAppendDiagnosticLogRequest) -> Result<(), String> {
    let mut entry = request.entry;
    entry.message_redacted = redact_sensitive_text(&entry.message_redacted);
    entry.technical_detail_redacted = redact_sensitive_text(&entry.technical_detail_redacted);
    if entry.reason_short.is_none() {
        entry.reason_short = classify_reason_short(&entry.technical_detail_redacted);
    }
    if entry.is_timeout.is_none() {
        let lower = entry.technical_detail_redacted.to_ascii_lowercase();
        entry.is_timeout = Some(lower.contains("timeout") || lower.contains("timed out"));
    }
    append_diagnostic_log(&entry)?;
    Ok(())
}

#[tauri::command]
pub fn ai_read_diagnostic_log() -> Result<AiReadDiagnosticLogResponse, String> {
    let path = diagnostic_log_path()?;
    let contents = if path.exists() {
        fs::read_to_string(&path).map_err(|err| format!("LOG_READ: {err}"))?
    } else {
        String::new()
    };
    Ok(AiReadDiagnosticLogResponse {
        path: path.display().to_string(),
        contents,
    })
}

#[tauri::command]
pub fn ai_get_credentials_status() -> Result<AiCredentialStatus, String> {
    let credentials = read_credentials()?;
    Ok(build_status(&credentials))
}

#[tauri::command]
pub fn ai_save_credentials(payload: AiCredentialPayload) -> Result<AiCredentialStatus, String> {
    let mut current = read_credentials()?;
    if payload.openai_api_key.is_some() {
        current.openai_api_key = normalize_secret(payload.openai_api_key);
    }
    if payload.gemini_api_key.is_some() {
        current.gemini_api_key = normalize_secret(payload.gemini_api_key);
    }
    current.updated_at = Some(now_iso_like());
    write_credentials(&current)?;
    Ok(build_status(&current))
}

#[tauri::command]
pub fn ai_clear_credentials() -> Result<AiCredentialStatus, String> {
    let path = credentials_path()?;
    if path.exists() {
        fs::remove_file(path).map_err(|err| format!("No se pudo limpiar credenciales: {err}"))?;
    }
    Ok(AiCredentialStatus {
        has_open_ai_key: false,
        has_gemini_key: false,
        updated_at: Some(now_iso_like()),
    })
}

#[tauri::command]
pub async fn ai_validate_credentials(
    request: AiValidateRequest,
) -> Result<AiValidateResponse, String> {
    let credentials = read_credentials()?;
    let provider = request.provider.to_lowercase();
    let model = request.model.trim().to_string();
    if model.is_empty() {
        return Ok(AiValidateResponse {
            valid: false,
            message: "Modelo vacío.".to_string(),
            status_code: None,
        });
    }

    let key = if provider == "chatgpt" {
        credentials.openai_api_key.unwrap_or_default()
    } else if provider == "gemini" {
        credentials.gemini_api_key.unwrap_or_default()
    } else {
        return Ok(AiValidateResponse {
            valid: false,
            message: "Proveedor no soportado.".to_string(),
            status_code: None,
        });
    };

    if key.trim().is_empty() {
        return Ok(AiValidateResponse {
            valid: false,
            message: "No hay API key configurada para ese proveedor.".to_string(),
            status_code: None,
        });
    }

    let mid = model.to_lowercase();
    let is_restricted = mid.starts_with('o') || mid.starts_with("gpt-5");

    let client = build_http_client()?;
    let ping_request = AiInvokeProviderRequest {
        provider: provider.clone(),
        model,
        system_prompt: "You are a health-check endpoint. Return exactly PONG.".to_string(),
        user_prompt: "ping".to_string(),
        max_output_tokens: 16,
        temperature: if is_restricted { None } else { Some(0.0) },
        preferred_api: Some("auto".to_string()),
    };

    let result: Result<AiInvokeProviderResponse, String> = if provider == "chatgpt" {
        invoke_openai(&client, &key, &ping_request).await
    } else {
        invoke_gemini(&client, &key, &ping_request).await
    };

    match result {
        Ok(_) => Ok(AiValidateResponse {
            valid: true,
            message: "Conexión OK.".to_string(),
            status_code: Some(200),
        }),
        Err(message) => {
            let status = extract_status_code(&message);
            Ok(AiValidateResponse {
                valid: false,
                message,
                status_code: status,
            })
        }
    }
}

#[tauri::command]
pub async fn ai_list_models(request: AiListModelsRequest) -> Result<AiListModelsResponse, String> {
    let credentials = read_credentials()?;
    let provider = request.provider.trim().to_lowercase();
    let client = build_http_client()?;

    let models = if provider == "chatgpt" {
        let key = credentials
            .openai_api_key
            .ok_or_else(|| "MISSING_CREDENTIALS: OpenAI key no configurada.".to_string())?;
        list_openai_models(&client, &key).await?
    } else if provider == "gemini" {
        let key = credentials
            .gemini_api_key
            .ok_or_else(|| "MISSING_CREDENTIALS: Gemini key no configurada.".to_string())?;
        list_gemini_models(&client, &key).await?
    } else {
        return Err("Proveedor no soportado.".to_string());
    };

    Ok(AiListModelsResponse {
        provider,
        models,
        fetched_at: now_iso_like(),
    })
}

#[tauri::command]
pub async fn ai_invoke_provider(
    request: AiInvokeProviderRequest,
) -> Result<AiInvokeProviderResponse, String> {
    let credentials = read_credentials()?;
    let provider = request.provider.to_lowercase();
    let client = build_http_client()?;

    let mut response = if provider == "chatgpt" {
        let key = credentials
            .openai_api_key
            .ok_or_else(|| "MISSING_CREDENTIALS: OpenAI key no configurada.".to_string())?;
        invoke_openai(&client, &key, &request).await?
    } else if provider == "gemini" {
        let key = credentials
            .gemini_api_key
            .ok_or_else(|| "MISSING_CREDENTIALS: Gemini key no configurada.".to_string())?;
        invoke_gemini(&client, &key, &request).await?
    } else {
        return Err("Proveedor no soportado.".to_string());
    };

    response.provider = provider.to_string();
    response.model = request.model;
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::{classify_reason_short, redact_sensitive_text};

    #[test]
    fn redacts_known_token_shapes() {
        let raw = "Authorization: Bearer sk-abc123 AIzaSyExampleToken";
        let redacted = redact_sensitive_text(raw);
        assert!(!redacted.contains("sk-abc123"));
        assert!(!redacted.contains("AIzaSyExampleToken"));
        assert!(redacted.contains("[REDACTED"));
    }

    #[test]
    fn classifies_common_rate_limit_reason() {
        let message = "HTTP_429: provider=gemini; reason=resource_exhausted; details={...}";
        let reason = classify_reason_short(message);
        assert_eq!(reason.as_deref(), Some("resource_exhausted"));
    }
}
