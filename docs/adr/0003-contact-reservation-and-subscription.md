# ADR 0003: Reserva de contato e assinatura

- Estado: proposto
- Data: 2026-11-20
- Relação: implementa as decisões de contato e cobrança do `ROADMAP.md`
- Dependências: ADR 0001 (acesso), ADR 0002 (publicação e consentimento)

## Contexto

Uma pessoa pode receber no máximo dois contatos profissionais por publicação.
Cada contato exige que o advogado:

- esteja autenticado e com OAB verificada e vigente;
- tenha assinatura ativa no período pago;
- possua saldo disponível;
- respeite o limite de um contato próprio por publicação;
- confirme a primeira abordagem.

A operação atravessa quatro fatos que não podem divergir:

1. uma vaga foi ocupada;
2. um saldo foi debitado;
3. uma conversa foi criada;
4. a primeira mensagem foi gravada.

Separar esses efeitos em páginas, rotas ou jobs permite contato sem saldo,
saldo debitado sem conversa, terceira abordagem concorrente ou mensagem sem
destinatário consistente.

A conta Stripe ainda não existe. Portanto, este ADR define o contrato de
integração e os invariantes verificáveis localmente, mas não pressupõe
credenciais, produtos, preços, customer portal ou endpoints configurados.

## Decisão

### Módulo `Contact`

O primeiro contato apresenta uma interface pequena:

```text
start(verifiedLawyer, {
  publicationId,
  firstMessage,
  idempotencyKey
}) -> StartedContact | PendingReview | ExistingContact | RejectedContact
```

A sessão, a inscrição OAB, a assinatura, o saldo, o número da vaga e a
titularidade da publicação são derivados no servidor. Nenhum desses valores
vem confiável do navegador.

`start` ocupa a vaga, cria a conversa, grava a primeira mensagem e debita um
contato em uma única transação PostgreSQL. Ele também registra auditoria e
outbox na mesma transação. Quando a abordagem é sinalizada, a mesma
transação cria uma reserva provisória `PendingReview`, sem conversa entregue ou
débito definitivo. Nenhum efeito externo acontece antes do commit.

### Estados observáveis

O resultado do módulo é suficiente para qualquer adapter HTTP:

- `StartedContact`: vaga ocupada, conversa criada, saldo debitado;
- `PendingReview`: vaga reservada provisoriamente, sem conversa entregue ou
  saldo debitado;
- `ExistingContact`: este advogado já possui conversa para a publicação; o
  reenvio não debita nem cria mensagem;
- `RejectedContact.subscription_required`;
- `RejectedContact.insufficient_balance`;
- `RejectedContact.publication_unavailable`;
- `RejectedContact.publication_full`;
- `RejectedContact.lawyer_ineligible`.

A interface não expõe vaga concorrente escolhida por outro processo como erro
interno. O adapter traduz a rejeição em estado de interface e recarrega a
disponibilidade sem ecoar dados do advogado vencedor.

### Ordem transacional

`start` executa:

1. validar a sessão, verificação OAB, suspensão e categoria elegível;
2. validar forma e tamanho da primeira mensagem;
3. entrar na transação e bloquear a linha da publicação para atualização;
4. revalidar estado `published`, consentimento vigente e retirada;
5. procurar conversa existente deste advogado;
6. em caso existente, devolver o ID sem inserir mensagem ou consumir saldo;
7. bloquear e revalidar assinatura, período pago e saldo;
8. determinar a primeira vaga livre entre `1` e `2`;
9. aplicar revisão de abordagem conforme ADR de moderação;
10. se sinalizada, criar reserva provisória, registrar auditoria e confirmar
    `PendingReview` sem débito;
11. se aprovada automaticamente, criar contato, conversa e primeira mensagem;
12. debitar exatamente um saldo;
13. registrar auditoria e evento genérico na outbox;
14. confirmar `StartedContact`.

Se uma etapa falhar, todo o estado é revertido. Somente depois do commit a
interface informa sucesso e o worker entrega a notificação.

### Invariantes do banco

`case_contacts` terá:

- `publication_id`;
- `lawyer_id`;
- `conversation_id`;
- `slot` com valor `1` ou `2`;
- estado `review_pending`, `active`, `expired` ou `rejected`;
- texto da primeira abordagem enquanto a revisão estiver pendente;
- timestamps;

As restrições obrigatórias são:

- unicidade em `(publication_id, slot)`;
- unicidade em `(publication_id, lawyer_id)`;
- conversa única por contato;
- `slot` restrito a `1|2`;
- chaves estrangeiras e exclusão controlada.

As duas vagas continuam ocupadas depois de encerramento, expurgo de mensagem,
cancelamento de assinatura ou encerramento de conta, enquanto a publicação
mantiver relevância para o mural ou auditoria.

### Concorrência e idempotência

O bloqueio de linha da publicação serializa retirada e ocupação. Cada chamada
é idempotente por:

- `(lawyer_id, publication_id)`, que impede a mesma conversa;
- `idempotency_key`, único para a intenção do envio;
- transação única, que reverte todos os efeitos.

Cenários obrigatórios:

- três advogados simultâneos: exatamente duas conversas;
- duplo clique do mesmo advogado: uma conversa e uma mensagem;
- retirada concorrente: nenhuma nova conversa;
- terceiro contato: rejeição sem dados dos vencedores;
- erro ao gravar mensagem: vaga, contato, conversa e saldo revertidos;
- reexecução do worker: nenhuma notificação duplicada quando o outbox marcar a
  entrega.

### Aprovação da primeira abordagem

Quando regras locais sinalizam possível promessa de resultado, mercantilização,
captação ou abuso, a primeira abordagem fica pendente. O valor de saldo não é
consumido definitivamente, a conversa não aparece à pessoa e a vaga não é
oferecida a outro advogado até uma decisão ou prazo explícito.

Para evitar vaga invisível e bloqueio indefinido:

- a reserva de revisão tem estado próprio e expiração operacional;
- a equipe interna revisa em até 24 horas úteis;
- aprovação cria a conversa, grava a primeira mensagem e debita o contato em
  uma transação;
- rejeição invalida a reserva sem débito;
- expiração retorna a vaga e registra evento sem notificar dados sensíveis.

O desenho da expiração e da reserva será fechado no ADR/implementação de
moderação antes da versão produtiva.

O texto pendente é guardado somente para a finalidade de revisão, com acesso
por papel interno `moderation` e prazo curto. A aprovação falha fechada se a
assinatura, o saldo ou a publicação deixaram de ser válidos.

### Assinatura e saldo

`platform_subscriptions` guarda o direito derivado, não o navegador:

- advogado;
- plano;
- estado;
- período pago;
- franquia do ciclo;
- saldo disponível;
- saldo máximo permitido;
- identificadores Stripe;
- versão do evento aplicado.

Os planos propostos são 5, 10 e 25 primeiros contatos. O saldo é renovado por

```text
saldoNovo = min(2 * franquia, saldoAnterior + franquia)
```

No cancelamento, saldo expira ao término do ciclo pago. Conversas existentes
continuam legíveis e respondíveis; novos contatos são recusados.

Upgrade aplica franquia proporcional conforme política financeira aprovada.
Downgrade só vale no ciclo seguinte. Nenhuma mudança pode alterar saldo sem
evento auditável e transação idempotente.

### Interface de `Subscription`

O módulo de assinatura terá um contrato próprio:

```text
createCheckout(verifiedLawyer, plan) -> checkoutReference
openPortal(verifiedLawyer) -> portalReference
reconcileStripeEvent(payload, signature) -> Processed | AlreadyProcessed
refreshSubscription(verifiedLawyer) -> subscription
```

Rotas HTTP e páginas não importam o SDK Stripe. A implementação produtiva usa
um adapter Stripe; testes usam um adapter local determinístico. O módulo de
contato consulta apenas o direito persistido em banco.

### Stripe como adapter externo

A integração Stripe observará:

- Checkout em modo `subscription`;
- preço pertencente à plataforma e não ligado a honorários;
- sem promoções automáticas, código de prioridade ou reserva de publicação;
- `customer` ligado ao advogado autenticado;
- metadados com finalidade da assinatura e IDs internos, sem CPF, resumo,
  mensagem, OAB ou conteúdo de caso;
- webhook sobre o corpo original;
- evento persistido por ID antes do processamento;
- transação idempotente entre evento, assinatura e saldo;
- reconciliação de ordem vencida com estado vigente.

O navegador só apresenta o estado. O webhook persistido ou a reconciliação
servidor-servidor decide a autorização.

Os eventos mínimos esperados são:

- criação, atualização e exclusão de subscription;
- pagamento de invoice confirmado;
- falha ou atraso de pagamento;
- cancelamento;
- mudança de item/preço.

O conjunto definitivo será confirmado contra os preços e a API configurados
quando a conta for criada.

### Pré-requisitos externos ainda bloqueados

O usuário ainda não possui conta Stripe. Portanto, a etapa atual não executa
e não promete:

- criação de produtos ou preços;
- configuração de portal;
- segredo de API;
- segredo de webhook;
- endpoint registrado;
- checkout real;
- eventos reais;
- testes com Stripe CLI ou internet;
- reconciliação contra uma conta concreta.

Essas tarefas só começam após criação da conta e ficam explícitas no backlog.
Até lá, testes de domínio usam adapter local e payloads de fixture versionados,
sem credenciais.

### Falha e outbox

O contato e o débito falham fechados. Sem certeza sobre estado, saldo,
assinatura ou transação, a operação é rejeitada.

Depois do commit, a outbox grava somente:

- tipo de evento;
- destinatário interno;
- IDs opacos necessários;
- versão do template;
- tentativas e agendamento.

Ela não grava primeira mensagem, resumo, token, saldo detalhado ou link de
autenticação. O worker pode tentar novamente com backoff sem consumir outra
vaga ou saldo.

## Consequências

### Positivas

- A regra de duas vagas e o débito de saldo têm um único ponto de verdade.
- Concorrência e idempotência são garantidas por banco e teste de interface.
- Stripe não participa do caminho de autorização por navegador.
- A implementação pode evoluir sem conta Stripe usando adapter local.
- Dados de caso ficam fora da cobrança e dos metadados.

### Custos e restrições

- O módulo depende de transações PostgreSQL e bloqueios reais.
- O review de primeira abordagem exige estado e expiração próprios.
- A reconciliação Stripe precisa de observabilidade e trilha idempotente.
- O rollover depende de versão de evento e período do ciclo.
- A modelagem da assinatura ficará incompleta até os produtos e preços serem
  cadastrados na conta real.

## Critérios de aceite

1. Três `start` simultâneos para a mesma publicação criam exatamente duas
   conversas e dois débitos, em qualquer ordem.
2. Dois `start` do mesmo advogado com chaves iguais ou diferentes criam uma
   conversa, uma mensagem e um débito.
3. Um erro ao gravar a mensagem reverte vaga, contato, conversa e saldo.
4. Retirada concorrente e terceiro contato não criam conversa nem debitam.
5. Sem assinatura paga persistida, o módulo rejeita antes de ocupar vaga.
6. Uma renovação aplica `min(2 × franquia, saldoAnterior + franquia)` uma
   única vez para cada ciclo.
7. Cancelamento encerra novos contatos após o ciclo e não remove conversas
   existentes.
8. Um evento Stripe repetido não muda saldo, período ou estado.
9. Evento atrasado ou fora de ordem não concede direito incompatível com o
   estado reconciliado.
10. Nenhum objeto de checkout, evento, log ou metadado contém resumo, CPF,
    conversa, nome, e-mail ou OAB.
11. A interface de negócio passa nos testes com adapter local sem `STRIPE_*`.
12. A configuração Stripe real permanece explicitamente bloqueada até a conta
    existir.
13. Uma abordagem pendente reserva no máximo uma vaga, não cria conversa
    visível, não debita e expira/rejeita sem consumir saldo.

## Alternativas rejeitadas

- **Reservar vaga ao abrir o card:** consumiria capacidade por leitura e criaria
  vagas abandonadas.
- **Debitar antes da transação:** deixaria saldo perdido após concorrência ou
  falha.
- **Atualizar saldo em job separado:** permitiria conversa sem direito pago ou
  cobrança aplicada duas vezes.
- **Confiar no redirect do Checkout:** entregaria controle a uma resposta do
  navegador e não ao webhook persistido.
- **Criar tabela genérica de repositórios:** acrescentaria indirection sem uma
  segunda implementação real.
- **Receber honorários:** conflitaria com o limite do produto e violaria a
  separação contratual.
