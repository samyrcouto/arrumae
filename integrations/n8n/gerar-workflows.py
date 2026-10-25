"""Gera os workflows do n8n (JSON) a partir do código dos nós em *.js.
Uso: python3 gerar-workflows.py  (rode de dentro de integrations/n8n)."""
import json, uuid

def node(name, type_, version, pos, params, **extra):
    n = {"parameters": params, "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "arrumae/" + name)), "name": name,
         "type": type_, "typeVersion": version, "position": pos}
    n.update(extra)
    return n

def link(*targets):
    return {"main": [[{"node": t, "type": "main", "index": 0} for t in targets]]}

def if_true(name, expr, pos):
    return node(name, "n8n-nodes-base.if", 2, pos, {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
            "conditions": [{"id": str(uuid.uuid5(uuid.NAMESPACE_URL, "cond/" + name)), "leftValue": expr, "rightValue": "",
                            "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and"},
        "options": {}})

def telegram(pos):
    return node("Enviar para a equipe (Telegram)", "n8n-nodes-base.telegram", 1.2, pos, {
        "chatId": "COLE_AQUI_O_ID_DO_GRUPO_DA_EQUIPE",
        "text": "={{ $json.mensagem }}",
        "additionalFields": {"appendAttribution": False}})

settings = {"executionOrder": "v1", "timezone": "America/Sao_Paulo"}
alerta_js = open("formatar-alerta.js", encoding="utf-8").read()
relatorio_js = open("formatar-relatorio.js", encoding="utf-8").read()

# 01 — alertas da equipe ------------------------------------------------------
wf1 = {
    "name": "Arrumaê — 01 alertas da equipe",
    "nodes": [
        node("Webhook Arrumaê", "n8n-nodes-base.webhook", 2, [0, 300],
             {"httpMethod": "POST", "path": "arrumae-eventos", "responseMode": "responseNode", "options": {}},
             webhookId="7a3f6c52-2b4e-4f2b-9d8e-0a1c2b3d4e5f"),
        node("Calcular assinatura", "n8n-nodes-base.crypto", 1, [220, 300], {
            "action": "hmac", "type": "SHA256",
            "value": "={{ $json.headers['x-arrumae-timestamp'] + '.' + JSON.stringify($json.body) }}",
            "dataPropertyName": "assinaturaCalculada",
            "secret": "COLE_AQUI_O_INTEGRATION_WEBHOOK_SECRET",
            "encoding": "hex"}),
        node("Conferir assinatura e montar alerta", "n8n-nodes-base.code", 2, [440, 300],
             {"mode": "runOnceForEachItem", "jsCode": alerta_js}),
        if_true("Assinatura válida?", "={{ $json.valido }}", [660, 300]),
        node("Responder 200", "n8n-nodes-base.respondToWebhook", 1.1, [880, 200],
             {"respondWith": "text", "responseBody": "ok", "options": {"responseCode": 200}}),
        node("Responder 401", "n8n-nodes-base.respondToWebhook", 1.1, [880, 420],
             {"respondWith": "text", "responseBody": "assinatura inválida", "options": {"responseCode": 401}}),
        if_true("Avisar a equipe?", "={{ $json.notificar }}", [1100, 200]),
        telegram([1320, 180]),
    ],
    "connections": {
        "Webhook Arrumaê": link("Calcular assinatura"),
        "Calcular assinatura": link("Conferir assinatura e montar alerta"),
        "Conferir assinatura e montar alerta": link("Assinatura válida?"),
        "Assinatura válida?": {"main": [[{"node": "Responder 200", "type": "main", "index": 0}],
                                        [{"node": "Responder 401", "type": "main", "index": 0}]]},
        "Responder 200": link("Avisar a equipe?"),
        "Avisar a equipe?": {"main": [[{"node": "Enviar para a equipe (Telegram)", "type": "main", "index": 0}], []]},
    },
    "settings": settings, "active": False, "pinData": {},
}

# 02 — relatório diário -------------------------------------------------------
wf2 = {
    "name": "Arrumaê — 02 relatório diário",
    "nodes": [
        node("Todo dia às 8h", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 300],
             {"rule": {"interval": [{"field": "days", "triggerAtHour": 8}]}}),
        node("Buscar indicadores", "n8n-nodes-base.httpRequest", 4.2, [220, 300], {
            "url": "https://SEU-APP/api/integrations/v1/metrics?days=1",
            "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "options": {}}),
        node("Montar relatório", "n8n-nodes-base.code", 2, [440, 300], {"jsCode": relatorio_js}),
        telegram([660, 300]),
    ],
    "connections": {
        "Todo dia às 8h": link("Buscar indicadores"),
        "Buscar indicadores": link("Montar relatório"),
        "Montar relatório": link("Enviar para a equipe (Telegram)"),
    },
    "settings": settings, "active": False, "pinData": {},
}

# 03 — agendador da manutenção ------------------------------------------------
wf3 = {
    "name": "Arrumaê — 03 agendador da manutenção",
    "nodes": [
        node("A cada 5 minutos", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 300],
             {"rule": {"interval": [{"field": "minutes", "minutesInterval": 5}]}}),
        node("Rodar manutenção", "n8n-nodes-base.httpRequest", 4.2, [220, 300], {
            "method": "POST", "url": "https://SEU-APP/api/cron/maintenance",
            "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
            "options": {"timeout": 60000}}),
        if_true("Teve falha?", "={{ $json.failures > 0 || $json.integrations.failed > 0 }}", [440, 300]),
        node("Montar aviso de falha", "n8n-nodes-base.code", 2, [660, 280], {
            "jsCode": "const r = $input.first().json;\nreturn [{ json: { mensagem: `⚠️ Manutenção do Arrumaê com falhas: ${r.failures} rotina(s) de pedido e ${r.integrations.failed} evento(s) de integração. Ver /admin/integracoes.` } }];"}),
        telegram([880, 280]),
    ],
    "connections": {
        "A cada 5 minutos": link("Rodar manutenção"),
        "Rodar manutenção": link("Teve falha?"),
        "Teve falha?": {"main": [[{"node": "Montar aviso de falha", "type": "main", "index": 0}], []]},
        "Montar aviso de falha": link("Enviar para a equipe (Telegram)"),
    },
    "settings": settings, "active": False, "pinData": {},
}

for fname, wf in [("01-alertas-da-equipe.json", wf1), ("02-relatorio-diario.json", wf2), ("03-agendador-manutencao.json", wf3)]:
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("gerado", fname)
