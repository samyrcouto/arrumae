# Roteiro de testes manuais (para gravar o vídeo)

Passo a passo para mostrar, no navegador e no banco de dados, as proteções de segurança da conta: CPF cifrado, "esqueci minha senha", verificação em duas etapas, obrigação do admin, sessões e auditoria. Leva uns 25 minutos.

> O projeto é **JavaScript/TypeScript** (não Java). Os testes manuais são feitos no **navegador** e conferidos no **banco** pelo SQL Shell (psql). No fim há também os testes automáticos.

Todas as consultas SQL abaixo foram executadas antes num banco de teste, e os Testes 1 e 2 foram simulados no navegador, para garantir que funcionam.

## 0. Preparação (antes de gravar)

**Terminal 1 (PowerShell, na pasta do projeto):**

```powershell
git pull
npm.cmd install
npm.cmd run db:migrate
npm.cmd run dev
```

Deixe esse terminal visível: o link do "esqueci minha senha" aparece nele.

**Terminal 2: SQL Shell (psql)** pelo menu Iniciar. Nas perguntas:

| Pergunta | Resposta |
|---|---|
| Server | `localhost` (Enter) |
| Database | `arrumae_dev` |
| Port | `5432` (Enter) |
| Username | `arrumae` |
| Senha | `arrumae_dev` |

Depois de entrar, rode:

```sql
\x auto
\dt
```

`\x auto` deixa os resultados legíveis. Na lista do `\dt` devem aparecer as tabelas novas `mfa_challenges`, `mfa_recovery_codes` e `password_reset_tokens`.

> Se os acentos aparecerem estranhos no psql, rode `SET client_encoding = 'WIN1252';`.

**No celular:** instale o Google Authenticator ou o Microsoft Authenticator.

**Contas usadas no vídeo:** para não estragar as contas de demonstração, vamos criar 3 contas novas durante o teste, todas com a senha `senha-video-123`:

| Conta | E-mail |
|---|---|
| Profissional 1 | `video.pro1@video.arrumae.invalid` |
| Profissional 2 | `video.pro2@video.arrumae.invalid` |
| Cliente | `video.cliente@video.arrumae.invalid` |

E o admin de demonstração: `admin@demo.arrumae.invalid` / `demo-senha-123`.

> Dica: use uma **janela anônima nova** para cada conta (Ctrl+Shift+N no Chrome), assim uma não desconecta a outra.

---

## Teste 1: o CPF fica embaralhado no banco

1. Abra http://localhost:3000/cadastro?tipo=profissional e crie o **Profissional 1** (nome `Pro Vídeo Um`, e-mail e senha da tabela, celular `(11) 98888-0001`, aceite os termos).
2. Você cai em **Perfil**. No campo **CPF** digite `529.982.247-25` (CPF de exemplo, muito usado em testes) e clique em **Salvar perfil**.
3. Recarregue a página (F5): o CPF aparece para o profissional, só com os números (`52998224725`).
4. No psql:

```sql
select display_name, left(cpf, 40) as cpf_no_banco, left(cpf_hash, 16) as indice_cego
from pro_profiles where cpf is not null;
```

**Deve aparecer:** `cpf_no_banco` começando com `enc:v1:` e um monte de letras, **sem** os números do CPF. Quem copiar o banco não lê o documento.

- [ ] CPF aparece normal na tela
- [ ] No banco aparece só `enc:v1:...`

## Teste 2: o admin é avisado quando dois cadastros usam o mesmo CPF

1. Em outra janela anônima, crie o **Profissional 2** (`Pro Vídeo Dois`, celular `(11) 98888-0002`) e salve o **mesmo CPF** `529.982.247-25`.
2. No psql:

```sql
select display_name, left(cpf, 30) as cpf_no_banco, left(cpf_hash, 16) as indice_cego
from pro_profiles where cpf_hash is not null order by cpf_hash;
```

**Deve aparecer:** o `cpf_no_banco` **diferente** nas duas linhas (cada gravação é embaralhada de um jeito), mas o `indice_cego` **igual**. É assim que o sistema descobre CPF repetido sem decifrar nada.

3. Em outra janela, entre como admin → **Profissionais** → aba **Cadastro incompleto** → clique em **Pro Vídeo Dois**.

**Deve aparecer:** o CPF legível para o admin (`52998224725 (dígitos válidos)`) e o aviso amarelo "O mesmo CPF está em outro cadastro: Pro Vídeo Um. Confira se é a mesma pessoa antes de aprovar."

4. No psql, o acesso do admin ficou registrado:

```sql
select a.created_at, a.action, u.email as quem
from audit_logs a left join users u on u.id = a.actor_id
where a.action = 'pro.view_sensitive' order by a.created_at desc limit 3;
```

- [ ] Hash igual, texto cifrado diferente
- [ ] Aviso de CPF repetido na tela do admin
- [ ] Acesso do admin na auditoria

## Teste 3: esqueci minha senha

1. Em outra janela anônima, crie o **Cliente** em http://localhost:3000/cadastro (nome `Cliente Vídeo`, celular `(11) 98888-0003`). Depois clique em **Sair**.
2. Em http://localhost:3000/entrar clique em **Esqueci minha senha**, digite `video.cliente@video.arrumae.invalid` e **Enviar link**.

**Deve aparecer:** "Confira seu e-mail". No **Terminal 1** aparece uma linha `[email:console] assunto="Redefinir sua senha no Arrumaê" link=http://localhost:3000/entrar/redefinir?token=...`. Isso é só em desenvolvimento, porque ainda não há provedor de e-mail.

3. No psql:

```sql
select u.email, left(t.id, 16) as hash_do_token, t.expires_at, t.used_at
from password_reset_tokens t join users u on u.id = t.user_id order by t.created_at desc;

select subject, body from outbound_messages
where subject like 'Redefinir%' order by created_at desc limit 1;
```

**Deve aparecer:**
- o banco guarda só o **hash** do token, que é diferente do que está no link;
- `expires_at` fica 30 minutos à frente e `used_at` está vazio;
- no corpo do e-mail guardado, o link aparece como `[link de uso único — não armazenado]`.

4. Copie o link do Terminal 1 e abra no navegador. Digite a nova senha `senha-nova-456` duas vezes e clique em **Salvar nova senha**.

**Deve aparecer:** a tela de entrar com "Senha redefinida".

5. Tente entrar com a senha antiga `senha-video-123`: recusa. Com `senha-nova-456`: entra.
6. Abra **o mesmo link** de novo. **Deve aparecer:** "Este link não vale mais".
7. No psql, rode de novo a primeira consulta do passo 3: agora `used_at` está preenchido.

- [ ] Banco guarda só o hash; e-mail guardado sem o link
- [ ] Senha antiga não funciona mais, a nova funciona
- [ ] Link não funciona duas vezes

## Teste 4: verificação em duas etapas

Continue logado como **Cliente Vídeo**.

1. Vá em **Minha conta** (http://localhost:3000/conta) → **Verificação em duas etapas** → **Ativar** → **Ativar verificação em duas etapas**.
2. Leia o QR code com o app do celular e digite o código de 6 números → **Ativar**.

**Deve aparecer:** 10 códigos de recuperação. **Anote 2 deles** para o Teste 5. Clique em **Já guardei os códigos**: a página mostra "Ativa desde…" e "10 de 10".

3. No psql:

```sql
select email, left(totp_secret, 40) as segredo_cifrado, totp_enabled_at, totp_last_step
from users where totp_secret is not null;

select left(r.code_hash, 16) as hash_do_codigo, r.used_at
from mfa_recovery_codes r join users u on u.id = r.user_id
where u.email = 'video.cliente@video.arrumae.invalid';
```

**Deve aparecer:** o segredo começando com `enc:v1:` (cifrado), 10 códigos só como hash (diferentes dos que você anotou) e todos com `used_at` vazio.

4. Clique em **Sair** e entre de novo com e-mail e `senha-nova-456`.

**Deve aparecer:** a tela "Verificação em duas etapas" pedindo o código. Sem ele, não entra.

5. Antes de digitar, no psql:

```sql
select u.email, c.attempts, c.expires_at
from mfa_challenges c join users u on u.id = c.user_id;
```

**Deve aparecer:** uma linha com `attempts` = 0 e validade de 10 minutos.

6. Digite `000000` → **Entrar**. **Deve aparecer:** "Código incorreto". Rode a consulta de novo: `attempts` = 1. (Depois de 5 erros, o login volta para a senha.)
7. Digite o código atual do app → **Entrar**. **Deve aparecer:** você entra na área do cliente, e a linha some de `mfa_challenges`.
8. *(Opcional, precisa ser rápido)* Saia e entre de novo usando **o mesmo código** antes de ele mudar no app: é recusado, porque cada código vale uma vez só.

- [ ] Segredo e códigos de recuperação cifrados/hash no banco
- [ ] Login pede o código; código errado conta tentativa
- [ ] Código certo entra

## Teste 5: código de recuperação (perdi o celular)

1. **Sair**, entrar com e-mail e senha. Na tela do código, digite **um dos códigos de recuperação** anotados (com ou sem o hífen).

**Deve aparecer:** você entra.

2. No psql, rode de novo a consulta de `mfa_recovery_codes` do Teste 4: **um** código agora tem `used_at` preenchido.
3. Em **Minha conta → Gerenciar**: "Códigos de recuperação disponíveis: 9 de 10".
4. Saia e tente entrar com **o mesmo código de recuperação**: é recusado.

- [ ] Código de recuperação funciona uma vez
- [ ] Contador cai para 9

## Teste 6: admin é obrigado a ativar (como vai ser em produção)

1. No **Terminal 1**, pare o site (**Ctrl+C**) e suba com a obrigação ligada:

```powershell
$env:ADMIN_REQUIRE_2FA="true"; npm.cmd run dev
```

2. Entre como admin (`admin@demo.arrumae.invalid` / `demo-senha-123`).

**Deve aparecer:** em vez do painel, a página **Segurança da conta** com o aviso amarelo "Ative a verificação em duas etapas para continuar".

3. Tente abrir http://localhost:3000/admin e http://localhost:3000/admin/usuarios: **volta para a mesma página**. Tente http://localhost:3000/api/conta/exportar: **erro 403**.
4. Ative a verificação com o celular (como no Teste 4). Agora o **/admin** abre normalmente.
5. No psql:

```sql
select a.created_at, a.action, u.email as quem, a.data
from audit_logs a left join users u on u.id = a.actor_id
where u.email = 'admin@demo.arrumae.invalid' order by a.created_at desc limit 5;
```

**Deve aparecer:** `account.2fa_enabled` e `auth.admin_login`; neste último, `data` mostra o fator usado.

6. **Voltar ao normal** (o admin de demonstração sem 2FA). Num terceiro PowerShell, na pasta do projeto:

```powershell
npm.cmd run db:reset-2fa -- admin@demo.arrumae.invalid
```

**Deve aparecer:** "2FA removido de admin@demo.arrumae.invalid". Na auditoria aparece `account.2fa_reset`. Depois, no Terminal 1: **Ctrl+C**, `Remove-Item Env:ADMIN_REQUIRE_2FA` e `npm.cmd run dev`.

- [ ] Admin sem 2FA não acessa nada do painel
- [ ] Com 2FA ativado, acessa
- [ ] Reset pelo servidor funciona e fica na auditoria

## Teste 7: sessão do admin dura menos

```sql
select u.email, u.role, s.expires_at - now() as expira_em
from sessions s join users u on u.id = s.user_id
order by s.created_at desc limit 5;
```

**Deve aparecer:** o admin com no máximo **12 horas**; cliente e profissional com cerca de **30 dias**.

- [ ] Admin ≤ 12 h, demais ~30 dias

## Teste 8: auditoria de tudo que foi feito

```sql
select a.created_at, a.action, u.email as quem
from audit_logs a left join users u on u.id = a.actor_id
order by a.created_at desc limit 20;
```

**Deve aparecer:** `account.password_reset_requested` (sem "quem", porque foi o sistema), `account.password_reset`, `account.2fa_enabled`, `account.2fa_recovery_code_used`, `auth.admin_login`, `pro.view_sensitive` e `account.2fa_reset`.

- [ ] Ações do vídeo registradas

## Teste 9 (opcional): proteção contra scripts injetados

1. Na página inicial, aperte **F12** → aba **Rede (Network)** → recarregue → clique na primeira linha (`localhost`) → **Cabeçalhos de resposta**.
2. Procure `content-security-policy`: tem `script-src 'self' 'nonce-...' 'strict-dynamic'`. Recarregue: o valor do `nonce` muda a cada carregamento.
3. Na aba **Console**, não deve haver erros vermelhos.

- [ ] Nonce aparece e muda a cada recarga

## Teste 10: testes automáticos

No PowerShell (o site pode continuar rodando):

```powershell
npm.cmd test
```

**Deve aparecer:** `Tests  79 passed (79)`.

Teste no navegador automático (demora alguns minutos; na 1ª vez rode antes `npx.cmd playwright install chromium`):

```powershell
npm.cmd run test:e2e
```

**Deve aparecer** a lista de etapas, incluindo "CSP com nonce em todas as páginas", "cliente redefine a senha pelo link do e-mail" e "profissional ativa a verificação em duas etapas e entra com código", terminando em `✅ E2E: fluxo completo aprovado`.

- [ ] 79 testes aprovados
- [ ] E2E aprovado

---

## Depois de gravar

- As 3 contas `@video.arrumae.invalid` podem ficar no banco de desenvolvimento ou ser excluídas em **Minha conta → Excluir conta**.
- Confira que o admin de demonstração está sem 2FA (Teste 6, passo 6) e que o Terminal 1 voltou ao `npm.cmd run dev` normal.
- Se algum passo mostrou algo diferente do "Deve aparecer", anote o número do teste e mande print da tela e do psql.
