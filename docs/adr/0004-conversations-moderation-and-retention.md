# ADR 0004: Conversas, moderação e retenção

- Estado: proposto
- Data: 2026-11-20
- Relação: implementa as decisões de conversa e moderação do `ROADMAP.md`
- Dependências: ADR 0001 (acesso), ADR 0002 (publicação) e ADR 0003 (contato)

## Contexto

Uma publicação pode originar duas conversas privadas e independentes. A pessoa
autora participa das duas, mas cada advogado participa apenas daquela que
originou seu contato. Um usuário não pode descobrir ou usar sua participação
em uma vaga para acessar a outra.

Uma conversa também precisa funcionar depois da retirada da publicação,
do cancelamento da assinatura ou do esgotamento do saldo. Ao mesmo tempo:

- somente a primeira abordagem passa por revisão preventiva;
- mensagens posteriores não podem ser varridas integralmente por terceiros;
- uma denúncia precisa congelar ou encerrar uma conversa sem apagar evidência
  necessária ao processo;
- um aviso de nova mensagem não pode revelar conteúdo no e-mail ou push;
- dados de conta, conversa e legal hold exigem prazos distintos;
- trabalhos de notificação não podem criar ou alterar mensagens.

O isolamento não pode depender somente de URLs, componentes ou filtros da
interface. Ele precisa ser uma propriedade do módulo `Conversation` e das
políticas de linha do PostgreSQL.

## Decisão

### Um contato, uma conversa

O estado `active` criado por `Contact.start` é ligado a exatamente uma
conversa. A primeira mensagem e seus participantes são criados na mesma
transação definida pelo ADR 0003.

As conversas terão identificadores opacos e os participantes serão derivados
da sessão. Uma página ou endpoint nunca aceitará lista de participantes,
papéis ou identificadores de acesso enviados pelo navegador como fonte de
confiança.

Uma publicação retirada deixa de aparecer no mural e deixa de aceitar novos
contatos, mas não encerra as conversas já criadas. Perder acesso ao mural,
cancelar a assinatura ou consumir todo o saldo também não impede a autora ou
o advogado de ler e responder às conversas existentes, enquanto a conversa
permanecer ativa.

### Interface do módulo `Conversation`

O domínio exporá operações pequenas:

```text
listOwn(actor) -> page
read(participant, conversationId, cursor) -> messagePage
send(participant, conversationId, text, idempotencyKey) -> sentMessage
report(participant, conversationId, reason) -> report
close(participant, conversationId) -> closedConversation
freeze(authorizedModerator, conversationId, reason, expiresAt) -> frozenConversation
```

`freeze` não é acessível a autores, advogados usuários ou pela rota comum de
conversa. Ela exige papel interno `moderation` ou `security`, conforme a ação,
e grava ator, motivo, escopo e prazo.

As operações de consulta aplicam autorização do participante antes de ler
mensagens. Nenhuma listagem retorna a conversa da outra vaga, mesmo quando as
duas conversas pertencem à mesma publicação e autora.

### Estados da conversa

Uma conversa terá o estado explicitamente persistido:

```text
active -> frozen -> active
active -> closed
frozen -> closed
```

- `active`: participantes podem ler, responder e encerrar;
- `frozen`: participantes podem ler conforme a política de incidente, mas
  não enviam novas mensagens;
- `closed`: participantes podem ler o histórico restante, mas ninguém pode
  enviar; o estado não libera a vaga nem cria outro contato.

Somente a autora pode encerrar sua própria conversa sem um procedimento
interno. O advogado pode abandonar a troca ou solicitar encerramento, mas não
impede unilateralmente que a autora preserve seu histórico durante o prazo
vigente. A suspensão administrativa é tratada como congelamento explícito,
nunca como troca silenciosa de estado.

Uma assinatura vencida não muda o estado da conversa. Verificação OAB
suspensa bloqueia mural e novos contatos; um congelamento de conversa
existente requer uma decisão ou política separada, registrada conforme o
ADR 0001.

### Mensagens

Cada mensagem armazena:

- conversa;
- remetente derivado da sessão;
- texto;
- ordem estável;
- data/hora;
- estado de entrega ao produto;
- chave de idempotência.

Mensagem é ordenada e paginada por sequência da conversa, não por ordenação
arbitrária de horário do cliente. O servidor rejeita:

- remetente, papel ou participantes fornecidos pelo navegador;
- mensagem vazia ou acima do limite;
- conteúdo com identificadores bloqueados pelo `Compliance`;
- envio em conversa congelada, encerrada ou sem participação;
- replay incompatível com a chave de idempotência.

Uma repetição com a mesma chave e a mesma intenção retorna a mensagem já
criada. A mesma chave com outro texto ou conversa é rejeitada como conflito,
sem criar uma segunda mensagem.

Não haverá edição ou exclusão individual pelo advogado. Correções são novas
mensagens, preservando ordem e auditoria. Remoção técnica acontece somente
por expurgo, exclusão aprovada, incidente ou obrigação documentada.

### Primeira abordagem e revisão

O ADR 0003 define que a primeira abordagem sinalizada pode criar uma reserva
`review_pending` sem conversa entregue ou saldo debitado. Este ADR fecha o
caminho dessa revisão:

1. regras locais sinalizam a mensagem antes da transação de contato;
2. a reserva ocupa uma das duas vagas por um prazo de 24 horas úteis;
3. somente papel interno `moderation` acessa o texto pendente;
4. o moderador pode aprovar ou rejeitar o conteúdo pelo procedimento definido,
   sem editar a mensagem;
5. aprovação revalida publicação, verificação OAB, assinatura, saldo e expiração,
   cria contato, conversa e mensagem, debita um saldo e grava auditoria/outbox;
6. rejeição ou expiração libera a reserva, sem conversa, notificação de
   conteúdo ou débito;
7. acesso, decisão, versão da política e prazo ficam na trilha de auditoria.

O SLA de 24 horas úteis é o limite operacional da reserva. Se a decisão não
ocorrer nele, um trabalho idempotente expira a revisão; o moderador não pode
aprovar uma reserva expirada reabrindo-a silenciosamente. Um novo contato do
advogado depende de nova ação e de disponibilidade real.

A rejeição interna não avalia mérito, veracidade, qualidade técnica ou
resultado; ela informa apenas se o texto atende aos critérios objetivos de
minimização, publicidade e abuso aprovados.

### Mensagens posteriores, denúncia e moderação

Mensagens posteriores não passam por revisão preventiva integral. Regras
locais continuam bloqueando identificadores objetivos antes do envio, mas
nem a equipe interna nem terceiros recebem automaticamente cópias das
mensagens para moderação.

A participante ou o participante pode denunciar uma conversa informando:

- motivo de categoria fechada;
- mensagem ou intervalo relevante, quando aplicável;
- comentário curto próprio;
- data da percepção.

Denúncia, notificação de incidente de segurança ou sinal local inequívoco de
abuso pode criar uma fila interna. O `moderation` acessa somente o escopo
necessário; o `security` lida com incidente técnico ou acesso indevido. Uma
decisão pode:

- encerrar a triagem sem alterar a conversa;
- congelar novos envios por prazo e motivo;
- encerrar a conversa;
- transferir o caso ao fluxo de segurança;
- registrar que a conversa está sob legal hold.

Usuários advogados nunca moderam casos ou conversas de concorrentes. Nenhuma
decisão de moderação altera o acesso de outra conversa ligada à publicação.

### Isolamento no banco

Além da autorização de domínio, RLS deve garantir:

- uma pessoa lista somente conversas em que `client_id` é sua sessão;
- um advogado lista somente conversas em que `lawyer_id` é sua sessão;
- mensagens só podem ser lidas por um dos dois participantes ou por papel
  interno autorizado, em operação de escopo limitado;
- uma participante de outra vaga não aparece em listagem, contagem ou
  atualização;
- um advogado participante da vaga 1 não lê, lista, denuncia, encerra ou
  envia pela vaga 2;
- moderação por uma conversa não abre acesso a conversas adjacentes da mesma
  publicação;
- conexões comuns não usam chave privilegiada para contornar RLS.

Respostas negativas não revelam se a conversa existe para outra identidade.
O retorno é o mesmo estado de “não encontrada ou indisponível” para ausência
de objeto, perda de participação e falta de autorização.

### Auditoria e outbox

Eventos mínimos são:

- `conversation.created`;
- `message.sent`;
- `conversation.closed`;
- `conversation.reported`;
- `conversation.frozen`;
- `conversation.unfrozen`;
- `first_approach.reviewed`;
- `conversation.retention_started`;
- `conversation.expired`.

Audit eventos armazenam ator, ação, objeto opaco, versão de política, motivo
quando aplicável e horário. Eles não armazenam texto, trecho denunciado, CPF,
e-mail, token, nome ou payload de notificação.

Enviar uma mensagem cria, na mesma transação, um evento de outbox destinado ao
outro participante. A outbox guarda somente:

- tipo de notificação;
- participante destinatário interno;
- ID opaco da conversa;
- versão do template;
- tentativas e próximo agendamento.

O template é genérico, por exemplo: “Você tem uma atualização no JurisAdv.
Entre na sua conta para consultar.” Não haverá nome, área, título, resumo,
trecho da mensagem, OAB ou link mágico. Reexecução do worker mantém
idempotência e não duplica envio para o mesmo evento.

### Retenção e expurgo

O encerramento da conversa bloqueia novos envios imediatamente. Participantes
mantêm o histórico pela política vigente de 90 dias, alinhada ao encerramento
de conta e à defesa de reclamações e direitos. O mesmo marco temporal não pode
ser recomeçado por abertura normal da tela, exportação ou reenvio de
notificação.

Ao encerrar uma conta:

- conversas são marcadas para retenção pelo período aprovado de 90 dias;
- o prazo e a base legal são registrados sem copiar conteúdo;
- o trabalho de expurgo permanece idempotente;
- um backup segue o ciclo de rotação aprovado e não serve como restauração
  seletiva para contornar a exclusão.

Legal hold só pode preservar conteúdo relevante por até 180 dias, com decisão
documentada do DPO, motivo e escopo. Uma única prorrogação é permitida, com
limite total de 360 dias. Ao término sem obrigação renovada, o expurgo normal
recomeça. Legal hold não torna o conteúdo visível para usuários ou papéis não
autorizados.

Expurgar mensagem, conversa ou conta nunca libera uma vaga já ocupada e nunca
recalcula uma publicação como disponível.

## Consequências

### Positivas

- Isolamento entre as duas vagas é garantido pelo domínio e pelo banco.
- Mensagens existentes continuam disponíveis sem assinatura ou vaga nova.
- Notificações não expõem conteúdo nem dependem de falha recuperável do
  caminho transacional.
- Revisão, congelamento e acesso excepcional produzem trilha mínima e
  temporalmente limitada.
- A retenção separa encerramento, expurgo e legal hold sem manter tudo
  indefinidamente.

### Custos e restrições

- O módulo precisa de testes concorrentes com PostgreSQL e RLS reais.
- A fila de primeira abordagem exige calendário útil, relógio controlável e
  trabalho de expiração idempotente.
- A moderação humana requer segregação de papéis, procedimento operacional e
  treinamento de acesso mínimo.
- A outbox precisa de worker, backoff, deduplicação e observabilidade.
- O expurgo precisa reconciliar banco, backups e eventuais índices sem
  selecionar conteúdo removido como forma de restaurar o acesso.

## Critérios de aceite

1. Uma terceira conta não lista, lê, envia, denuncia ou encerra qualquer das
   duas conversas.
2. O advogado da vaga 1 não observa existência, mensagens ou participantes da
   vaga 2, nem mesmo por ID conhecido.
3. Retirar a publicação, cancelar assinatura ou zerar saldo não remove a
   leitura ou resposta de conversa ativa existente.
4. Uma mensagem repetida com a mesma chave cria um registro; chaves em textos
   diferentes são conflito.
5. Uma primeira abordagem sinalizada permanece invisível para a pessoa, não
   debita saldo e expira ao fim das 24 horas úteis se não for decidida.
6. Advogado usuário não consegue acessar a fila de moderação nem revisar
   outra conversa.
7. Denunciar ou congelar uma conversa não altera a outra vaga da mesma
   publicação.
8. Conversa congelada ou encerrada não aceita mensagem, inclusive por retry ou
   requisição antiga.
9. Notificação, log, auditoria e metadados de outbox não contêm texto, nome,
   e-mail, CPF, área, OAB, resumo ou token.
10. Falha ou retry do worker não duplica notificação, mensagem, conversa ou
    débito.
11. Depois de 90 dias sem legal hold, conteúdo encerrado é expurgado por job
    idempotente; a vaga permanece ocupada.
12. Legal hold expira automaticamente no limite aprovado e exige decisão
    documentada para os 180 dias e uma única prorrogação até 360 dias.
13. RLS nega acesso mesmo quando a consulta é executada diretamente no
    PostgreSQL com o contexto autenticado de teste.
14. Os testes passam pela interface de `Conversation`; rotas HTTP permanecem
    adapters finos.

## Alternativas rejeitadas

- **Uma conversa por publicação:** permitiria que advogados concorrentes lessem
  mensagens um do outro.
- **Somente ocultar a outra conversa na interface:** deixaria o banco exposto
  por URL conhecida, erro de rota ou cliente privilegiado.
- **Revisão preventiva integral:** ampliaria acesso humano a conteúdo sigiloso
  sem necessidade nem base aprovada.
- **Moderação por API de terceiro:** enviaria conteúdo jurídico possivelmente
  sigiloso para fora da operação.
- **Notificação contendo trecho ou remetente:** vazaria contexto fora do
  ambiente autenticado.
- **Expurgar conversa ao encerrá-la:** eliminaria histórico necessário para
  direitos e defesa durante o prazo aprovado.
- **Retenção indefinida:** violaria minimização e dificultaria resposta
  verificável ao direito de exclusão.
