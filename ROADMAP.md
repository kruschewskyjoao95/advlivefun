# Roadmap do JurisAdv

O JurisAdv está validando um mural jurídico autenticado. Uma pessoa publica
um resumo minimizado de uma necessidade, autoriza explicitamente o público
elegível e pode receber até dois contatos de advogados verificados, em
conversas privadas e independentes. A mensalidade da plataforma, nos planos
propostos de 5, 10 e 25 contatos por ciclo, habilita a criação de novas
conversas; não vende prioridade, caso, resposta, resultado ou contratação.

Este roadmap é a fonte única para produto, arquitetura e backlog. Alterações
que contradigam estas decisões precisam de ADR antes da implementação.

## Estado atual

**Etapa 0 · Especificação — concluída.** O roadmap e os ADRs 0001 a 0004
formam uma fonte única para produto, identidade, privacidade, concorrência,
cobrança, conversas, moderação e retenção. O bloqueador conhecido de logging
do cadastro também possui correção e teste automatizado de regressão.

O repositório contém uma landing page, cadastro de interesse, esquema mínimo
PostgreSQL versionado com Drizzle e teste de não vazamento no cadastro. Ainda
não existem autenticação, mural, verificação OAB, checkout, endpoint Stripe,
persistência idempotente de eventos, saldo de contatos ou conversas.

### Ponto de retomada — 2026-11-20

O projeto está na **Etapa 1 · Validação**, aguardando aprendizado externo; não
há autorização para iniciar autenticação, mural, cobrança ou receber caso real
antes dos gates desta etapa.

Entregas registradas e incorporadas em `main`:

- Etapa 0 concluída pela stack nativa #4;
- PRs #2, #3, #5, #6, #7 e #8 incorporados em `main`;
- ADRs 0001 a 0004 publicados;
- correção de logging do cadastro e 10 testes de regressão validados;
- ausência de conta Stripe registrada como bloqueio externo.

Pendências para concluir a Etapa 1:

1. recrutar e entrevistar pelo menos 10 potenciais solicitantes e 5
   profissionais;
2. registrar parecer jurídico sobre mural, mensalidade, dois contatos e texto
   da primeira abordagem;
3. registrar revisão de privacidade, incluindo base legal, minimização,
   retenção e RIPD quando aplicável;
4. registrar revisão de segurança do desenho e dos testes existentes;
5. decidir a UF/área da turma assistida e transformar o aprendizado nos
   critérios de entrada da Etapa 2.

O próximo trabalho de código, quando os quatro itens anteriores permitirem,
é iniciar a **Etapa 2 · Identidade** a partir do ADR 0001. A criação de conta
Stripe continua adiada e não bloqueia a especificação nem os testes com
adapters locais; ela precisa acontecer antes da implementação e validação
reais da Etapa 4 · Assinatura.

A primeira entrega é documentação e aprendizado, não um piloto com casos
reais. Até a validação completa, a interface pode demonstrar apenas estados
abstratos, como “duas vagas”, “uma vaga” e “limite atingido”, sem narrativas
jurídicas inventadas ou dados pessoais fictícios.

## Decisão e gate que vêm antes do produto

O mural, a mensalidade por contatos e a primeira abordagem precisam de revisão
jurídica em conjunto. A Ementa 086/2025/OEP identifica risco de captação e
mercantilização na intermediação massificada da escolha de advogados. A
mensalidade fixa, o consentimento e o limite de dois contatos não resolvem,
isoladamente, esse risco. [Ementa 086/2025/OEP](https://www.oab.org.br/jurisprudencia/detementa/22176)
· [Estatuto da Advocacia, art. 34](https://www.planalto.gov.br/ccivil_03/leis/l8906.htm)
· [Provimento 205/2021](https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021)

**Gate cumulativo de lançamento:** não receber o primeiro caso real nem
executar a primeira cobrança antes que:

1. a assessoria jurídica aprove por escrito o fluxo exato, os preços e o texto
   da primeira abordagem;
2. a revisão de privacidade aceite a finalidade, a base legal, a minimização,
   a retenção, os direitos dos titulares e o RIPD quando aplicável;
3. os testes de segurança comprovem isolamento, autorização, proteção de
   sessão, expurgo e resposta a incidente;
4. os gates técnicos de pagamento, concorrência e observabilidade estejam
   concluídos.

Se o desenho 5/10/25 for rejeitado, o mural não lança por conta própria. O
fallback deve voltar a revisão e, conforme aprovação, pode ser um plano de
software sem pacote de contatos ou um diretório informativo com pedido
privado. Nenhum caso real antecipa essa decisão.

## Escopo do produto

### Visão nacional e cobertura do piloto

A visão e o cadastro de interesse atendem todo o Brasil. A taxonomia pode
medir todas as áreas, inclusive criminal, como “cobertura em expansão”, mas o
piloto assistido deve liberar somente uma combinação de UF e área escolhida
por oferta e demanda observadas.

Criminal não entra no primeiro piloto. Antes de uma expansão futura, deve
aparecer com volume recorrente de demanda, existir oferta verificada
suficiente e ser definido um fluxo próprio de urgência, SLA e triagem.

O formulário usa categorias amplas e “Não sei”; especialidades detalhadas só
entram depois do primeiro aprendizado. A seleção da categoria é obrigatória,
mas não equivale a encaminhamento, diagnóstico ou triagem jurídica automática.

### O que a pessoa faz

1. **Criar conta verificada.** O acesso usa e-mail com link mágico endurecido.
   CPF não é credencial de login: é solicitado no onboarding, validado no
   nível de identidade aprovado para o MVP e armazenado por HMAC/hash para
   deduplicação. Apenas maiores de 18 anos publicam no MVP.
2. **Preparar a publicação.** A pessoa escolhe área e UF e escreve um resumo
   curto. CPF, telefone, número de processo, documento e outro identificador
   são bloqueados em posts, mensagens e campos livres, com a categoria
   indicada e o valor ocultado. Esses padrões continuam permitidos apenas no
   campo próprio de onboarding.
3. **Conferir o alcance.** A prévia reproduz o cartão do mural. A pessoa
   confirma especificamente que o resumo será acessível aos advogados
   autenticados, verificados e elegíveis para a UF e a categoria. O sistema
   registra versão do aviso, pessoa, finalidade e data.
4. **Acompanhar até duas conversas.** Cada advogado vê apenas a conversa que
   abriu com a pessoa. A pessoa pode responder, encerrar ou ignorar cada
   conversa sem obrigação de contratar. Abrir chat não formaliza mandato.
5. **Retirar a publicação.** A retirada remove o caso do mural e impede novos
   contatos. Não libera vagas já ocupadas nem apaga conversas existentes.
6. **Receber avisos genéricos.** E-mail ou push informa apenas que há uma
   atualização e exige login. Nome do advogado, área, título ou trecho da
   conversa não entram na notificação.

Uma conta pode criar até cinco publicações em janela de 30 dias. O controle é
por identidade autenticada, não por e-mail isolado, e pode acionar revisão por
abuso sem cancelar o direito à contestação.

### O que o advogado faz

O mural só é visível para advogados autenticados, com inscrição verificada,
situação regular e conta não suspensa. A pessoa autora também pode consultar
seus casos. O conteúdo fica fora de busca pública, sitemap e cache
compartilhado.

| Estado | Visualização | Ação |
| --- | --- | --- |
| Nenhum contato | Área, UF, resumo autorizado e “2 contatos disponíveis” | Assinante redige uma primeira abordagem. Visualizar ou rascunhar não ocupa vaga nem saldo. |
| Um contato | O mesmo cartão e “1 contato disponível” | Outro advogado pode iniciar uma conversa; o participante anterior usa sua caixa. |
| Dois contatos | Cartão permanece na ordem, com “Limite de contatos atingido” | Sem link, botão, foco ou abertura por URL; participantes continuam pelas conversas existentes. |
| Publicação retirada | Cartão sai do mural | URL salva deixa de abrir o caso; conversas existentes seguem sua retenção própria. |

Um advogado ocupa, no máximo, uma vaga por publicação durante toda a vida do
caso. Encerrar ou expurgar a conversa não devolve essa vaga.

## Planos, saldo e cobrança

As entrevistas iniciais testam três planos mensais, sem tratar os valores como
aprovados:

| Plano | Primeiros contatos por ciclo | Faixa a pesquisar |
| --- | ---: | ---: |
| Essencial | 5 | R$ 49 |
| Profissional | 10 | R$ 97 |
| Escritório | 25 | R$ 197 |

Os preços são âncoras de pesquisa, não promessas. Eles devem ser comparados
com o que cada concorrente entrega, entrevistas de valor, custo operacional e
revisão jurídica. Não copiar modelos de lead pago, comissão ou destaque se
esses requisitos não forem equivalentes.

### Regras de consumo

- Um contato é consumido somente quando a primeira mensagem confirmada cria
  uma conversa nova.
- Visualização, rascunho, erro, duplo clique, reenvio, mensagem posterior e
  conversa já existente não consomem contato.
- A assinatura precisa estar ativa e o ciclo pago confirmado pelo webhook
  persistido; retorno do navegador nunca libera acesso.
- O cancelamento agendado mantém leitura e resposta nas conversas abertas até
  o fim do ciclo. Novos contatos exigem assinatura ativa.
- Saldo acumulado segue
  `saldo = min(2 × franquia, saldo anterior + franquia)` a cada ciclo.
  Exemplo: plano 5, saldo 2, novo saldo no ciclo = 7; não pode ultrapassar 10.
- Upgrade adiciona franquia proporcional à vigência. Downgrade vale no ciclo
  seguinte e não reduz conversas existentes.
- Ao cancelamento, o saldo pode ser usado até o fim do ciclo pago e expira
  depois. Não há transferência, conversão em dinheiro ou promessa de reserva.
- A compra não garante que a publicação originalmente visualizada continue
  disponível. Após pagar, a vaga é revalidada.
- Falta de publicações não gera reembolso ou compensação de saldo; falha
  técnica, cobrança duplicada e disputa seguem política própria.

O texto comercial promete somente acesso à ferramenta e a capacidade de
iniciar a quantidade indicada, sem urgência artificial, campanha para “N
primeiros”, comparação de destaque ou garantia de cliente. Cada versão de
preço e copy passa por revisão de produto e jurídica antes de publicação.

## Identidade, autorização e privacidade

### Autenticação

Usar Better Auth sobre PostgreSQL no MVP:

- login por e-mail com link mágico;
- tokens de uso único, hash no banco e expiração curta;
- consumo por ação POST em página de confirmação, sem autenticação no GET;
- cookies `HttpOnly`, `Secure`, `SameSite` e, quando possível,
  `__Host-...`;
- rate limiting por e-mail, IP e intenção;
- passkey opcional na fase posterior, mantendo fallback;
- MFA/passkey para contas administrativas e advogados de alto risco antes do
  aumento de escala.

CPF nunca aparece na URL, login ou interface de autenticação. No onboarding,
é usado para verificação/deduplicação dentro da base legal definida. O nível
de garantia precisa ser descrito honestamente; validar formato e HMAC não
equivale a identidade fisicamente comprovada.

### Verificação e papéis

A inscrição OAB é conferida contra fonte oficial por operação manual inicial,
com número, UF, situação, responsável e data. Rechecagem periódica e suspensão
removem o acesso ao mural e bloqueiam novos envios. Automação só entra quando
existir método de consulta permitido, confiável e auditável.

Papéis internos são separados:

- `operations`: verificação cadastral e suporte por metadados;
- `moderation`: revisão autorizada de conteúdo sinalizado;
- `billing`: exceções e reconciliação;
- `security`: incidente e resposta técnica;
- `super-admin`: conceder papéis e ações de emergência.

Advogados usuários não revisam casos de outros usuários. A OAB é reguladora,
não integrante presumida da operação. A revisão humana é feita por equipe
interna ou operador contratado sob confidencialidade, minimização e trilha de
auditoria.

### Conteúdo e moderação

1. Regras locais bloqueiam identificadores objetivos nos campos de conteúdo.
2. A primeira abordagem pode ser sinalizada para revisão interna por
   linguagem promocional, promessa de resultado ou captação.
3. Enquanto a revisão estiver pendente, a abordagem não chega ao destinatário.
   SLA inicial: 24 horas úteis.
4. A pessoa pode denunciar mensagens subsequentes. A revisão posterior depende
   de denúncia ou sinal local de abuso; não há varredura integral por
   terceiros.
5. Nenhum caso, conversa, token ou texto sigiloso é enviado a APIs de
   terceiros. Se isso mudar, exige ADR, RIPD e base legal/consentimento
   específico.
6. O acesso excepcional ao conteúdo registra ator, motivo, prazo, escopo e
   operação. Moderação não lê mensagens para avaliar qualidade do advogado
   fora de um evento formal.

### Retenção

- **Encerramento de conta:** dados pessoais e históricos ficam disponíveis
  por 90 dias para defesa de reclamações e direitos, depois são excluídos ou
  anonimizados.
- **Publicação retirada:** resumo e metadados ficam na área da autora por 30
  dias para revisão e auditoria, depois são excluídos.
- **Conversa encerrada:** novos envios param imediatamente; os participantes
  mantêm histórico pelo prazo de 90 dias da política de conta/conversas
  vigente.
- **Legal hold:** preservação de no máximo 180 dias por decisão documentada do
  DPO, prorrogável uma vez, total máximo de 360 dias, somente por obrigação
  legal, exercício regular de direitos ou investigação ativa.
- **CPF/hash:** dados necessários à deduplicação seguem a política específica
  aprovada; depois da exclusão da conta, o hash pode permanecer por prazo
  limitado definido no RIPD e não pode reaparecer em telas, URLs ou logs.

A política de produção precisa indicar controlador, contato do encarregado,
bases legais, finalidade, compartilhamentos, prazo e procedimento de exclusão.
Backups seguem expurgo por ciclo e não são restaurados seletivamente como
forma de bypass.

## Arquitetura técnica

### Módulos profundos

```text
src/modules/access/         # identidade, papel, sessão, verificação e suspensão
src/modules/case-board/     # prévia, consentimento, publicação, retirada e lista
src/modules/contacts/       # criação atômica da conversa e ocupação da vaga
src/modules/conversations/  # participação, envio, leitura, encerramento e retenção
src/modules/subscriptions/  # checkout, webhook, saldo e direitos pagos
src/modules/compliance/     # regras locais, revisão e eventos de auditoria
src/infra/auth/             # adapter Better Auth
src/infra/stripe/           # adapter Stripe
src/infra/postgres/         # banco, transações e RLS
src/app/api/                # adapters HTTP finos
```

As rotas não devem conhecer concorrência, Stripe, sessão de terceiros ou regras
de conteúdo. Cada módulo expõe resultado testável por sua interface.

### Dados mínimos

- `case_publications`: autora, área, UF, resumo público, estado, versão do
  consentimento, publicação, retirada e retenção;
- `case_contacts`: publicação, advogado, vaga `1|2`, com unicidade em
  `(publication_id, slot)` e `(publication_id, lawyer_id)`;
- `conversations`: participantes, origem, estado e timestamps;
- `messages`: conversa, remetente derivado da sessão, texto e ordem estável;
- `platform_subscriptions`: plano, status, ciclo, saldo e período pago;
- `stripe_events`: ID único, tipo, estado e tentativas;
- `outbox_events`: notificação genérica a ser entregue após commit;
- `audit_events`: ator, ação, sujeito, política e horário, sem texto protegido.

### Limite de duas vagas

No primeiro envio:

1. validar sessão, verificação OAB, assinatura, saldo e texto;
2. abrir transação, bloquear a linha da publicação para atualização e
   revalidar estado, consentimento e saldo;
3. se o advogado já participou, devolver a conversa sem reenviar ou debitar;
4. escolher vaga livre, criar conversa, gravar primeira mensagem e debitar
   saldo na mesma transação;
5. registrar auditoria e evento genérico na outbox;
6. publicar a confirmação somente depois do commit.

Três envios simultâneos criam no máximo duas conversas. Falha ao gravar a
mensagem reverte conversa, vaga e saldo. A retirada compete pelo mesmo
bloqueio. Aba antiga não contorna o estado do servidor.

### Pagamento e falha

Stripe Checkout cria assinatura própria da plataforma. O webhook valida o
corpo original, persiste o ID do evento de forma idempotente e atualiza
assinatura/saldo dentro de transação. Eventos fora de ordem são reconciliados
com o estado vigente na Stripe. A autorização falha fechada; sem confirmação
persistida, nenhum novo contato.

Notificações e e-mail falham de forma recuperável por outbox transacional e
backoff. A fila não armazena link completo, token, texto de conversa, CPF ou
payload sensível de cartão. Logs registram códigos e IDs necessários, nunca
nome, e-mail, resumo, mensagem, token ou parâmetros de erro com dados pessoais.

## Sequência de entregas

| Etapa | Entrega | Critério objetivo |
| --- | --- | --- |
| 0 · Especificação | Este roadmap e ADRs de produto, identidade, privacidade, concorrência, cobrança e conversas. | **Concluída:** README, COMPLIANCE, ADRs e testes de regressão refletem as decisões propostas nos ADRs. |
| 1 · Validação | Cadastro nacional e entrevistas em uma turma assistida. Protótipo sem casos inventados. | **Em andamento:** 10 potenciais solicitantes e 5 profissionais; parecer jurídico, privacidade e segurança registrados. |
| 2 · Identidade | Better Auth, conta, CPF/HMAC, papéis, verificação OAB e suspensão. | Anônimo ou conta pendente não lê mural; suspensão bloqueia novos contatos. |
| 3 · Publicação | Área/UF, prévia, bloqueio de identificadores, consentimento, mural, retirada e RLS. | Autora vê seu caso; outro cliente não lê; advogado pendente ou suspenso não acessa; URL pública retorna não autorizado. |
| 4 · Assinatura | Stripe 5/10/25, rollover 2×, portal, webhook, idempotência e reconciliação. | Adesão, renovação, falha, cancelamento, upgrade, downgrade, evento repetido e fora de ordem mantêm saldo e direitos corretos. |
| 5 · Contato concorrente | Módulo `Contact`, duas vagas, débito e primeira mensagem atômicos. | Três abordagens simultâneas criam duas conversas. Duplo clique cria uma. Falha e retirada concorrente desfazem débito/vaga. |
| 6 · Conversas | Duas caixas privadas, envio, resposta, denúncia, congelamento e encerramento. | Terceira conta não lista, lê, envia nem recebe atualizações; nenhuma conversa cruza com a outra vaga. |
| 7 · Piloto assistido | Convite para uma UF/área escolhida por dados, acompanhamento operacional e renovação. | Gates cumulativos abaixo são atendidos antes de ampliar. |

## Gate de expansão

O próximo grupo só abre se todos os critérios forem verdadeiros:

1. **zero incidente de vazamento ou quebra de isolamento** no grupo atual;
2. **pelo menos 10 publicações**;
3. **pelo menos 7 com primeiro contato em dois dias corridos**;
4. **maioria de pertinência confirmada pelo participante**, em pergunta breve
   e sem leitura de conteúdo da conversa pela equipe de análise;
5. **pelo menos 3 profissionais na segunda renovação paga**.

Se algum critério falhar, não abrir novo grupo:

- vazamento: parar, preservar evidência e corrigir causa raiz;
- pouca resposta: recrutar oferta ou ajustar cobertura;
- baixa pertinência: revisar taxonomia, abordagem e moderação;
- pouca renovação: entrevistar assinantes antes de construir mais recursos.

Essas métricas armazenam contagens e horários, nunca conteúdo das conversas.

## Melhorias posteriores

Priorizar filtros extras, realtime e anexos somente quando pesquisa demonstrar
redução de um problema real. CRM de equipe, pagamento por destaque, plano
infinito, prioridade no mural, ranking, IA jurídica, repasse de honorários e
envio de dados a terceiros são novos desenhos e exigem ADR e revisão própria
antes de entrar no produto.
