# ADR 0001: Identidade, papéis e autorização

- Estado: aceito
- Data: 2026-11-20
- Relação: implementa as decisões de identidade do `ROADMAP.md`

## Contexto

O JurisAdv terá publicações, conversas privadas, verificação de inscrição OAB
e operações pagas. Uma autorização incorreta pode expor uma conversa a uma
terceira conta, liberar um contato sem assinatura ou permitir que um usuário
advogado revise casos de concorrentes.

A identidade precisa:

- autenticar a pessoa sem usar CPF como credencial;
- distinguir cliente, advogado verificado e papéis internos;
- vincular autorização à sessão validada no servidor;
- impedir múltiplas contas por uma identidade no escopo definido para o MVP;
- revogar acesso quando uma inscrição OAB é suspensa ou reprovada;
- preservar uma trilha mínima de verificação, suspensão e acesso excepcional;
- manter os dados de caso e conversa isolados no Next.js e no PostgreSQL.

Implementar senhas, recuperação de conta, tokens e sessões próprias
aumentaria superfície de segurança sem constituir diferencial do produto. O
Supabase Auth foi descartado nesta etapa por decisão de produto.

## Decisão

### Autenticação

O MVP usará Better Auth integrado diretamente ao PostgreSQL.

- O login inicial será por e-mail com link mágico.
- O token será de uso único, curta duração e armazenado em hash.
- O GET do link renderiza uma página de confirmação sem criar sessão.
- Um POST explícito consome o token e cria a sessão, evitando o consumo
  automático por scanners de e-mail.
- A sessão ficará em cookie `HttpOnly`, `Secure`, `SameSite` e, quando
  compatível com o fluxo, prefixado com `__Host-`.
- Login, reenvio e confirmação terão rate limiting por identidade, endereço
  IP e intenção.
- Passkey será incluído posteriormente como método recorrente e passkey/MFA
  será obrigatório para contas administrativas e contas de maior risco antes
  do aumento de escala.

O módulo de acesso apresentará um contrato próprio do domínio. Rotas, páginas
e módulos de negócio não importam o cliente Better Auth diretamente:

```text
requireSession()
requireClient()
requireVerifiedLawyer()
requireConversationParticipant(conversationId)
requireInternalRole(role)
```

Cada operação deriva ator e papéis da sessão no servidor. Identificadores,
papéis, titularidade e saldo enviados pelo navegador não substituem essa
derivação.

### CPF e deduplicação

CPF não é nome de usuário, credencial de login nem dado aceito em URLs. Ele é
coletado em fluxo próprio de onboarding após explicar finalidade, proteção e
retenção.

- O MVP valida o formato e executa a checagem cadastral aprovada.
- O banco operacional guarda HMAC determinístico com chave separada para
  deduplicação.
- CPF bruto, se indispensável à operação, fica em armazenamento restrito e
  com prazo próprio.
- A simples validação de formato ou HMAC não é descrita como identidade
  fisicamente comprovada.
- A política de retenção do identificador será aprovada no RIPD antes da
  coleta em produção.

### Papéis

Uma identidade pode assumir um papel externo principal:

- `client`;
- `lawyer`.

O papel `lawyer` só ganha acesso profissional ao mural quando o perfil tem
verificação OAB vigente. Ele não concede acesso a publicações retiradas,
conversas de outros profissionais ou funções internas.

Papéis internos são independentes e concedidos por autorização administrativa:

- `operations`: verificação cadastral e suporte por metadados;
- `moderation`: revisão de conteúdo sinalizado;
- `billing`: reconciliação e exceções financeiras;
- `security`: incidente e resposta técnica;
- `super-admin`: administração de papéis e ações de emergência.

Um advogado usuário nunca revisa conteúdo de outra pessoa ou de um concorrente.
A OAB é reguladora e não é presumida como integrante da operação.

### Verificação OAB

A inscrição será conferida manualmente na fonte oficial no piloto. O registro
de verificação contém:

- usuário;
- número e UF da inscrição;
- situação observada;
- responsável;
- data da conferência;
- versão do procedimento;
- data prevista para rechecagem.

Suspensão, reprovação ou rechecagem vencida bloqueia acesso profissional ao
mural e novos contatos. Conversas existentes seguem a regra de encerramento,
retenção e possível congelamento por incidente.

Automação da consulta só será incorporada quando existir método de acesso
autorizado, confiável e auditável.

### Autorização em camadas

Toda operação privada exige ambas as defesas:

1. o módulo de acesso valida sessão, papel, suspensão e relação com o objeto;
2. a política de acesso por linha do PostgreSQL confirma a identidade da sessão
   e o objeto autorizado.

A API web não usa chave de serviço ou conexão privilegiada para consultas
privadas comuns. Conexões administrativas ficam limitadas a migrações,
trabalhos operacionais e operações com papel interno explicitamente
autorizado.

Os invariantes mínimos são:

- uma pessoa vê somente suas próprias publicações e conversas;
- um advogado vê somente publicações elegíveis no mural e conversas das quais
  participa;
- ser advogado, assinante ou participante de outra vaga do mesmo caso não
  concede leitura;
- o autor de outra publicação não ganha acesso à conversa;
- retirada, lotação ou suspensão é revalidada pelo servidor no momento da
  ação;
- falha de sessão, banco, política ou assinatura fecha o acesso.

### Auditoria

Eventos sensíveis registram apenas:

- ator ou papel interno;
- ação;
- tipo e ID do objeto;
- versão do procedimento/política;
- motivo, quando aplicável;
- horário.

Logs e auditoria não duplicam CPF, e-mail, resumo, mensagem, token ou payload de
terceiros. Um acesso excepcional a conteúdo deve incluir motivo, escopo, prazo
e responsável.

## Consequências

### Positivas

- As regras de acesso ficam localizadas atrás de um contrato profundo, sem
  espalhar configuração do Better Auth pelas rotas.
- RLS limita dano de uma consulta Next.js incorreta.
- Papéis internos permitem separar suporte, moderação, cobrança e resposta a
  incidentes.
- CPF deixa de ser credencial ou identificador público.
- Suspensão OAB e acesso a assinatura podem ser revalidados no servidor em
  toda ação relevante.

### Custos e restrições

- Better Auth precisa ser instalado, configurado e integrado ao mesmo
  PostgreSQL que aplica RLS.
- Testes precisam usar uma sessão real ou adapter controlado pelo módulo de
  acesso e um banco PostgreSQL compatível.
- A verificação manual da OAB exige operação, fila, responsável e
  rechecagem.
- RLS aumenta o custo inicial das consultas e das migrações, mas reduz o risco
  de exposição de conteúdo jurídico.
- O uso de HMAC exige segregação, rotação e custódia da chave.
- Antes da produção, o fluxo de recuperação de link mágico e passkey precisa
  de testes de phishing, expiração, revogação e dispositivo perdido.

## Critérios de aceite

1. Uma chamada de rota não consegue fornecer um ator diferente da sessão.
2. Cliente comum recebe `403` ao tentar ler mural, publicação ou conversa sem
   a relação exigida.
3. Advogado pendente, reprovado, suspenso ou com verificação vencida não lê o
   mural nem inicia contato.
4. Dois profissionais participantes do mesmo caso não leem a conversa um do
   outro.
5. Padrões de teste para RLS negam acesso mesmo quando a consulta é executada
   diretamente pelo contexto autenticado.
6. O hash de CPF é único, não reversível sem a chave separada e nunca aparece
   em URL, log, resposta HTTP ou auditoria.
7. Papéis internos são concedidos, usados e revogados com auditoria.
8. Link mágico já usado, expirado ou proveniente de navegador/início
   incompatível com a política não cria sessão.
9. Falha de verificação de sessão, OAB ou política de banco nega a operação.
10. Os testes do módulo passam por sua interface pública; rotas HTTP são
    adapters finos.

## Alternativas rejeitadas

- **Autenticação própria com senha:** aumenta risco de implementação e
  recuperação sem diferencial do produto.
- **Supabase Auth:** descartado pela decisão explícita de não adotar Supabase.
- **CPF como login:** expõe um identificador previsível e confundiria
  identificação com autenticação.
- **Somente autorização no Next.js:** deixaria o banco como vetor de exposição
  para clientes, jobs ou erros futuros.
- **Um único papel `admin`:** concentraria poderes e impediria segregação de
  funções entre cadastro, moderação, cobrança e incidente.
- **Revisão por advogado usuário:** permitiria acesso concorrencial e conflita
  com o isolamento das conversas.
